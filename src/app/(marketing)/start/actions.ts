"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { sendMagicLink } from "@/app/(auth)/login/actions";
import { pageStyleForTrade } from "@/lib/page-styles";
import { menuPageUrl, pageSlugFor } from "@/lib/slugs";
import { SUBSCRIPTION_PRICE_CENTS } from "@/lib/config";
import { serverEnv } from "@/lib/env";
import { fieldErrors, formValues, type FormState } from "@/lib/forms";
import { trackSignUp } from "@/lib/meta";
import { alreadyLogged, notifyOnce } from "@/lib/notifications/log";
import { publicEnv } from "@/lib/env.public";
import { formatCents } from "@/lib/money";
import { freeUntil } from "@/lib/stripe/billing";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";
import { createClient, getUser } from "@/lib/supabase/server";
import { tradeById } from "@/lib/trades";
import { setUpCatering } from "@/lib/catering/starter";
import { startSchema } from "./schema";

/** `existing`: that email already has an account, so we sent a sign-in code instead. */
/**
 * `outcome` says why a submit didn't end in a new account (sent to Meta and Clarity as
 * StartSubmitFailed): fields (a field the server rejected), bot (Turnstile), existing
 * (that email already has an account: a sign-in code was sent), code (the account was
 * made but signing in failed, so a code was sent), error (creating it failed).
 */
export type StartOutcome = "fields" | "bot" | "existing" | "code" | "error";
export type StartState = FormState & { existing?: string; outcome?: StartOutcome };

type StartData = Extract<ReturnType<typeof startSchema.safeParse>, { success: true }>["data"];

/**
 * Instant sign-up: creates the pro's account from what they set up on /start and
 * signs them in right here, with no code to fetch from their inbox. Nothing waits
 * on confirming the email: profiles.email_confirmed stays false until their first
 * code sign-in, and the dashboard shows where alerts go so a typo can be fixed.
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
    if (errors.website)
      return { message: "Something went wrong. Try again.", values, outcome: "bot" };
    return { errors, values, outcome: "fields" };
  }
  const data = parsed.data;
  if (!(await passesBotCheck(values["cf-turnstile-response"] ?? ""))) {
    return { message: "We couldn't check you're a person. Try again.", values, outcome: "bot" };
  }

  const admin = createAdminClient();
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: data.email,
    email_confirm: true,
  });
  if (createError || !created.user) {
    if (
      createError?.code === "email_exists" ||
      /already been registered/i.test(createError?.message ?? "")
    ) {
      return { ...(await sendCode(data.email, values)), outcome: "existing" };
    }
    console.error("Instant sign-up: creating the user failed", createError);
    return {
      message: "We couldn't create your account. Try again in a minute.",
      values,
      outcome: "error",
    };
  }

  // Not proven yet: set before signing in, so a later code sign-in by the real owner
  // signs out anyone else (markEmailConfirmed).
  const { error: flagError } = await admin
    .from("profiles")
    .update({ email_confirmed: false })
    .eq("id", created.user.id);
  if (flagError) {
    console.error(`Instant sign-up: flagging ${created.user.id} unconfirmed failed`, flagError);
    return { ...(await sendCode(data.email, values, READY_MESSAGE)), outcome: "code" };
  }

  // A failure here leaves the dashboard checklist to finish setup; the account is still good.
  try {
    await setUpAccount(admin, created.user.id, data);
  } catch (err) {
    console.error(`Instant sign-up: setting up ${created.user.id} failed`, err);
  }
  // Which pro's "Powered by Dibs" link they came from. On its own, so it can never
  // affect the rest of sign-up.
  if (data.ref) {
    try {
      const { data: referrer } = await admin
        .from("profiles")
        .select("id")
        .eq("slug", data.ref)
        .neq("id", created.user.id)
        .maybeSingle();
      if (referrer) {
        const { error: refError } = await admin
          .from("profiles")
          .update({ referred_by: referrer.id })
          .eq("id", created.user.id);
        if (refError) console.error("Instant sign-up: saving referred_by failed", refError);
      }
    } catch (err) {
      console.error("Instant sign-up: looking up the referring pro failed", err);
    }
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
    return { ...(await sendCode(data.email, values, READY_MESSAGE)), outcome: "code" };
  }
  await trackSignUp(session.data.user, "/start");
  // A plain note from the founder, sent after the response so sign-up never waits on email.
  const appUrl = publicEnv().NEXT_PUBLIC_APP_URL;
  const techId = created.user.id;
  after(async () => {
    if (await alreadyLogged(`founder_welcome:${techId}`)) return;
    // Most pros sign up in Instagram's browser, which forgets them once they leave. A
    // sign-in link in the email opens their own browser signed in, with no code to type.
    // (Made after the sign-in above used its token; a new link replaces any older one.)
    let signInUrl: string | undefined;
    try {
      const { data: welcomeLink } = await admin.auth.admin.generateLink({
        type: "magiclink",
        email: data.email,
      });
      const hash = welcomeLink?.properties?.hashed_token;
      if (hash) {
        const url = new URL("/auth/callback", appUrl);
        url.search = new URLSearchParams({
          token_hash: hash,
          type: "email",
          next: "/dashboard",
        }).toString();
        signInUrl = url.toString();
      }
    } catch (err) {
      console.error("Welcome sign-in link failed; sending the email without it", err);
    }
    const { data: saved } = await admin
      .from("profiles")
      .select("slug")
      .eq("id", techId)
      .maybeSingle();
    await notifyOnce(`founder_welcome:${techId}`, {
      to: { email: data.email },
      template: "founder_welcome",
      data: {
        appUrl,
        // Live as soon as they have an address (it never takes money).
        pageUrl: saved?.slug ? menuPageUrl(appUrl, saved.slug) : undefined,
        needsHandle: data.method !== "stripe" && !data.handles,
        signInUrl,
        nextLink: await freeUntil(techId).then(
          (until) => ({
            freeUntil: until,
            price: formatCents(SUBSCRIPTION_PRICE_CENTS).replace(/\.00$/, ""),
          }),
          // Unknown: the landing page and /start already said it; don't guess here.
          () => undefined,
        ),
      },
    }).catch((err: unknown) => console.error("Founder welcome email failed", err));
  });

  revalidatePath("/dashboard", "layout");
  redirect("/dashboard");
}

const READY_MESSAGE = "Your account is ready. We emailed you a code to sign in.";

/** Emails a sign-in code; the page then shows the code form (with `message`, if given). */
async function sendCode(
  email: string,
  values: Record<string, string>,
  message?: string,
): Promise<StartState> {
  const form = new FormData();
  form.set("email", email);
  form.set("next", "/dashboard");
  const sent = await sendMagicLink({}, form);
  if (sent.error) return { message: sent.error, values };
  return { existing: email, values, ...(message ? { message } : {}) };
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
    page_style: pageStyleForTrade(data.trade),
    timezone: data.timezone,
    deposit_method: data.method === "stripe" ? ("stripe" as const) : ("manual" as const),
    ...(data.handles ?? {}),
    ...(trade
      ? { cancellation_window_hours: trade.windowHours, policy_text: trade.policyText }
      : {}),
  };

  // The menu page link comes from the business name; add a number if it's taken.
  const base = pageSlugFor(data.business_name);
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
  // Food trucks and caterers also get a catering quote page to edit. On its own, so
  // it can never stop sign-up; they can set it up from the dashboard later.
  if (data.trade === "catering") {
    await setUpCatering(admin, techId).catch((err) =>
      console.error("Instant sign-up: catering setup failed", err),
    );
  }
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
