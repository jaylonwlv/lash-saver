"use server";

import { redirect } from "next/navigation";
import { domainLabel, DOMAIN_TLDS, affordable } from "@/lib/domains";
import { fieldErrors, formValues, type FormState } from "@/lib/forms";
import {
  advanceDomain,
  DomainCheckoutError,
  startDomainCheckout,
  type DomainProgress,
} from "@/lib/stripe/domains";
import { createClient, getUser } from "@/lib/supabase/server";
import { domainAuthCode, quoteDomain } from "@/lib/vercel/registrar";
import { domainCheckoutSchema } from "./schema";

export type DomainOption = { domain: string; available: boolean; offered: boolean };

/** .com and .pro for the name they typed: free or taken, and whether we sell it. */
export async function searchDomains(
  name: string,
): Promise<{ options: DomainOption[] } | { error: string }> {
  const user = await getUser();
  if (!user) redirect("/login");
  const label = domainLabel(name);
  if (!label) return { error: "Type your business name, like Studio Nova." };
  try {
    const options = await Promise.all(
      DOMAIN_TLDS.map(async (tld) => {
        const quote = await quoteDomain(`${label}.${tld}`);
        return {
          domain: quote.domain,
          available: quote.available,
          offered: quote.available && affordable(quote.purchaseCents, quote.renewalCents),
        };
      }),
    );
    return { options };
  } catch (err) {
    console.error("Domain search failed", err);
    return { error: "Couldn't check names right now. Try again in a minute." };
  }
}

const CHECKOUT_ERRORS: Record<DomainCheckoutError["reason"], string> = {
  not_eligible: "Your own website needs an active plan or free trial first.",
  has_domain: "You already have a website address.",
  unavailable: "That name was just taken. Pick another one.",
  too_pricey: "That name is a premium one we can't offer. Try a variation.",
  registrar: "Couldn't reach the domain registry. Try again in a minute.",
};

export async function startCheckout(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getUser();
  if (!user) redirect("/login");
  const values = formValues(formData);
  const parsed = domainCheckoutSchema.safeParse(values);
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };
  const d = parsed.data;

  let url: string;
  try {
    url = await startDomainCheckout(user.id, {
      domain: d.domain,
      plan: d.plan,
      registrant: {
        firstName: d.firstName,
        lastName: d.lastName,
        email: d.email,
        phone: d.phone,
        address1: d.address1,
        ...(d.address2 ? { address2: d.address2 } : {}),
        city: d.city,
        state: d.state,
        zip: d.zip,
        // US only for now (Cash App, Zelle and Venmo pros); the registrar wants ISO alpha-2.
        country: "US",
      },
    });
  } catch (err) {
    if (err instanceof DomainCheckoutError) return { message: CHECKOUT_ERRORS[err.reason], values };
    console.error("Domain checkout failed", err);
    return { message: "Couldn't open checkout. Try again.", values };
  }
  redirect(url);
}

/** The code another registrar asks for when they move the domain away. */
export async function revealTransferCode(): Promise<{ code: string } | { error: string }> {
  const user = await getUser();
  if (!user) redirect("/login");
  const supabase = await createClient();
  const { data: row } = await supabase
    .from("custom_domains")
    .select("domain, status, registered_at")
    .eq("tech_id", user.id)
    .maybeSingle();
  if (!row?.registered_at || (row.status !== "active" && row.status !== "cancelled")) {
    return { error: "There's no registered domain to move yet." };
  }
  try {
    return { code: await domainAuthCode(row.domain) };
  } catch (err) {
    console.error("Transfer code failed", err);
    // New registrations are locked for 60 days (a domain-industry rule).
    return { error: "Not available yet. New domains can move 60 days after they're registered." };
  }
}

/** The progress page's 20-second refresh: moves the purchase along and reports the steps. */
export async function refreshDomain(): Promise<DomainProgress | null> {
  const user = await getUser();
  if (!user) redirect("/login");
  return advanceDomain(user.id);
}
