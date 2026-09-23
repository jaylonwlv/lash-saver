import "server-only";
import { createHash } from "node:crypto";
import { cookies, headers } from "next/headers";
import { META_GRAPH_API_VERSION, SUBSCRIPTION_PRICE_CENTS } from "@/lib/config";
import { serverEnv } from "@/lib/env";
import { publicEnv } from "@/lib/env.public";
import { createAdminClient } from "@/lib/supabase/admin";

/*
 * Meta Conversions API: tells Meta which ad clicks became pros, so ads optimize
 * for sign-ups and trials. Server-side only, pros only: client data is never
 * sent. Off unless NEXT_PUBLIC_META_PIXEL_ID and META_CAPI_TOKEN are set, and a
 * failure here never breaks sign-in or billing.
 *
 * Each event has a stable event_id, so Meta drops duplicates (the Checkout
 * return route and the webhook can both report the same trial).
 */

type MetaEvent = "CompleteRegistration" | "StartTrial" | "Subscribe";

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

/** Browser details that help Meta match the event to an ad click. Only inside a request. */
async function browserData(): Promise<Record<string, string>> {
  try {
    const [h, c] = await Promise.all([headers(), cookies()]);
    const data: Record<string, string> = {};
    const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim();
    const ua = h.get("user-agent");
    const fbp = c.get("_fbp")?.value;
    const fbc = c.get("_fbc")?.value;
    if (ip) data.client_ip_address = ip;
    if (ua) data.client_user_agent = ua;
    if (fbp) data.fbp = fbp;
    if (fbc) data.fbc = fbc;
    return data;
  } catch {
    return {}; // Not in a browser request (webhook).
  }
}

async function send(
  event: MetaEvent,
  eventId: string,
  techId: string,
  email: string | null,
  opts: { browser: boolean; sourcePath: string; value?: number },
): Promise<void> {
  const pixelId = publicEnv().NEXT_PUBLIC_META_PIXEL_ID;
  const { META_CAPI_TOKEN: token, META_TEST_EVENT_CODE: testCode } = serverEnv();
  if (!pixelId || !token) return;

  try {
    const userData: Record<string, unknown> = {
      external_id: [sha256(techId)],
      ...(email ? { em: [sha256(email.trim().toLowerCase())] } : {}),
      ...(opts.browser ? await browserData() : {}),
    };
    const body = {
      data: [
        {
          event_name: event,
          event_time: Math.floor(Date.now() / 1000),
          event_id: eventId,
          action_source: "website",
          event_source_url: `${publicEnv().NEXT_PUBLIC_APP_URL}${opts.sourcePath}`,
          user_data: userData,
          ...(opts.value !== undefined
            ? {
                custom_data: {
                  currency: "USD",
                  value: opts.value,
                  ...(event === "StartTrial" ? { predicted_ltv: opts.value * 6 } : {}),
                },
              }
            : {}),
        },
      ],
      ...(testCode ? { test_event_code: testCode } : {}),
    };
    const res = await fetch(
      `https://graph.facebook.com/${META_GRAPH_API_VERSION}/${pixelId}/events?access_token=${encodeURIComponent(token)}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(5000),
      },
    );
    if (!res.ok) console.error(`Meta ${event} failed: ${res.status} ${await res.text()}`);
  } catch (err) {
    console.error(`Meta ${event} failed`, err);
  }
}

/** A pro signed in for the first time (their account is under an hour old). */
export async function trackSignUp(user: {
  id: string;
  email?: string | null;
  created_at: string;
}): Promise<void> {
  if (Date.now() - new Date(user.created_at).getTime() > 60 * 60 * 1000) return;
  await send("CompleteRegistration", `signup-${user.id}`, user.id, user.email ?? null, {
    browser: true,
    sourcePath: "/login",
  });
}

/** A pro started the free trial, or (after it) paid for the first time. */
export async function trackSubscription(
  event: "StartTrial" | "Subscribe",
  techId: string,
  subscriptionId: string,
  { browser }: { browser: boolean },
): Promise<void> {
  const { data } = await createAdminClient()
    .from("profiles")
    .select("email")
    .eq("id", techId)
    .maybeSingle();
  await send(event, `${event}-${subscriptionId}`, techId, data?.email ?? null, {
    browser,
    sourcePath: "/dashboard/billing",
    value: SUBSCRIPTION_PRICE_CENTS / 100,
  });
}
