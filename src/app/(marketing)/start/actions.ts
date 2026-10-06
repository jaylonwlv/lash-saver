"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { sendMagicLink } from "@/app/(auth)/login/actions";
import { SLUG_PATTERN, slugFromName } from "@/app/(tech)/dashboard/profile/schema";
import { serverEnv } from "@/lib/env";
import { fieldErrors, formValues, type FormState } from "@/lib/forms";
import { trackSignUp } from "@/lib/meta";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";
import { createClient, getUser } from "@/lib/supabase/server";
import { tradeById } from "@/lib/trades";
import { startSchema } from "./schema";

/** `existing`: that email already has an account, so we sent a sign-in code instead. */
export type StartState = FormState & { existing?: string };

type StartData = Extract<ReturnType<typeof startSchema.safeParse>, { success: true }>["data"];

/**
 * Instant sign-up: creates the pro's account from what they set up on /start and
 * signs them in right here, with no code to fetch from their inbox. They confirm
 * the email with a code later, before their first pay link (profiles.email_confirmed).
 *
 * An email that already has an account is never signed in this way: that would
 * let anyone into someone else's account. It gets a sign-in code instead.
 */
export async function createAccount(_prev: StartState, formData: FormData): Promise<StartState> {
  const values = formValues(formData);
  if (await getUser()) redirect("/dashboard");

  const parsed = startSchema.safeParse(values);
  if (!parsed.success) {
    const errors = fieldErrors(parsed.error);
    if (errors.website) return { message: "Something went wrong. Try again.", values };
    return { errors, values };
  }
  const data = parsed.data;
  if (!(await passesBotCheck(values["cf-turnstile-response"] ?? ""))) {
    return { message: "We couldn't check you're a person. Try again.", values };
  }

  const admin = createAdminClient();
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: data.email,
    email_confirm: true,
  });
  if (createError || !created.user) {
    if (createError?.code === "email_exists" || createError?.status === 422) {
      return sendCode(data.email, values);
    }
    console.error("Instant sign-up: creating the user failed", createError);
    return { message: "We couldn't create your account. Try again in a minute.", values };
  }

  // A failure here leaves the dashboard checklist to finish setup; the account is still good.
  try {
    await setUpAccount(admin, created.user.id, data);
  } catch (err) {
    console.error(`Instant sign-up: setting up ${created.user.id} failed`, err);
  }

  // Sign in by verifying a one-time link token on the server: nothing is emailed.
  const { data: link, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: data.email,
  });
  const supabase = await createClient();
  const tokenHash = link?.properties?.hashed_token;
  const session = tokenHash
    ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "email" })
    : null;
  if (!session || session.error || !session.data.user) {
    console.error("Instant sign-up: signing in failed", linkError ?? session?.error);
    return sendCode(data.email, values);
  }
  await trackSignUp(session.data.user);

  revalidatePath("/dashboard", "layout");
  redirect("/dashboard");
}

/** Emails a sign-in code; the page then shows the code form. */
async function sendCode(email: string, values: Record<string, string>): Promise<StartState> {
  const form = new FormData();
  form.set("email", email);
  form.set("next", "/dashboard");
  const sent = await sendMagicLink({}, form);
  if (sent.error) return { message: sent.error, values };
  return { existing: email, values };
}

async function setUpAccount(
  admin: SupabaseClient<Database>,
  techId: string,
  data: StartData,
): Promise<void> {
  const trade = tradeById(data.trade);
  const profile = {
    business_name: data.business_name,
    trade: data.trade,
    timezone: data.timezone,
    deposit_method: data.method === "stripe" ? ("stripe" as const) : ("manual" as const),
    ...(data.handles ?? {}),
    ...(trade
      ? { cancellation_window_hours: trade.windowHours, policy_text: trade.policyText }
      : {}),
    email_confirmed: false,
  };

  // The menu page link comes from the business name; add a number if it's taken.
  const base = slugBase(data.business_name);
  const candidates = [base, ...[2, 3, 4, 5].map((n) => `${base}-${n}`)];
  candidates.push(`${base.slice(0, 33)}-${Math.random().toString(36).slice(2, 7)}`);
  let saved = false;
  for (const slug of candidates) {
    const { error } = await admin
      .from("profiles")
      .update({ ...profile, slug })
      .eq("id", techId);
    if (!error) {
      saved = true;
      break;
    }
    if (error.code !== "23505") throw new Error(`Saving profile failed: ${error.message}`);
  }
  if (!saved) {
    const { error } = await admin.from("profiles").update(profile).eq("id", techId);
    if (error) throw new Error(`Saving profile failed: ${error.message}`);
  }

  const services = trade
    ? trade.services.map((s) => ({
        tech_id: techId,
        name: s.name,
        duration_minutes: s.durationMinutes,
        price_cents: s.priceCents,
        deposit_cents: s.depositCents,
        is_starter: true,
      }))
    : data.service
      ? [
          {
            tech_id: techId,
            name: data.service.name,
            duration_minutes: data.service.duration_minutes,
            price_cents: data.service.price_cents,
            deposit_cents: data.service.deposit_cents,
          },
        ]
      : [];
  if (services.length) {
    const { error } = await admin.from("services").insert(services);
    if (error) throw new Error(`Adding services failed: ${error.message}`);
  }
}

/** A valid menu page link from the business name, e.g. "Fresh Cuts" → "fresh-cuts". */
function slugBase(name: string): string {
  let slug = slugFromName(name).slice(0, 34).replace(/-+$/, "");
  if (slug.length < 3) slug = `${slug || "my"}-studio`.replace(/^-/, "");
  return SLUG_PATTERN.test(slug) ? slug : "my-studio";
}

/** Cloudflare Turnstile, when configured. Fails open if Cloudflare can't be reached. */
async function passesBotCheck(token: string): Promise<boolean> {
  const secret = serverEnv().TURNSTILE_SECRET_KEY;
  if (!secret) return true;
  if (!token) return false;
  try {
    const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim();
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: new URLSearchParams({ secret, response: token, ...(ip ? { remoteip: ip } : {}) }),
      signal: AbortSignal.timeout(5000),
    });
    const result: unknown = await res.json();
    return typeof result === "object" && result !== null && "success" in result
      ? result.success === true
      : false;
  } catch (err) {
    console.error("Turnstile check failed; letting the sign-up through", err);
    return true;
  }
}
