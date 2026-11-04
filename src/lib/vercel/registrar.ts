import "server-only";
import { serverEnv } from "@/lib/env";
import { readOrderStatus, registrarPriceCents, type OrderStatus } from "@/lib/domains";

/*
 * Vercel's Domains Registrar API (domains bought at cost through name.com) and the
 * project-domains API (so the app answers on the pro's domain). Request and response
 * fields follow @vercel/sdk 1.28's models. Prices come back in dollars.
 */

const API = "https://api.vercel.com";

export class RegistrarError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
  }
}

/** Configured only when all the keys are set; the add-on hides itself otherwise. */
export function registrarConfigured(): boolean {
  const env = serverEnv();
  return Boolean(env.VERCEL_API_TOKEN && env.VERCEL_PROJECT_ID);
}

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const env = serverEnv();
  if (!env.VERCEL_API_TOKEN) throw new RegistrarError("Vercel isn't configured", 500);
  const url = new URL(path, API);
  if (env.VERCEL_TEAM_ID) url.searchParams.set("teamId", env.VERCEL_TEAM_ID);
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${env.VERCEL_API_TOKEN}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const text = await res.text();
  let json: unknown = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = {};
  }
  if (!res.ok) {
    const error =
      json && typeof json === "object" && "error" in json && typeof json.error === "object"
        ? (json.error as { code?: string; message?: string })
        : {};
    // Keep Vercel's own words (they say why: billing, permissions, terms…), not just the status.
    const detail = error.message ?? (text.slice(0, 300) || "no details");
    throw new RegistrarError(
      `Vercel ${method} ${path} failed (${res.status}${error.code ? ` ${error.code}` : ""}): ${detail}`,
      res.status,
      error.code,
    );
  }
  return json as T;
}

const enc = encodeURIComponent;

export type DomainQuote = {
  domain: string;
  available: boolean;
  /** First year and renewal, in cents; null if the registrar didn't say. */
  purchaseCents: number | null;
  renewalCents: number | null;
};

/** Is it free, and what would it cost us (first year, then each renewal)? */
export async function quoteDomain(domain: string): Promise<DomainQuote> {
  const { available } = await call<{ available: boolean }>(
    "GET",
    `/v1/registrar/domains/${enc(domain)}/availability`,
  );
  if (!available) return { domain, available, purchaseCents: null, renewalCents: null };
  const price = await call<{ purchasePrice: number | string; renewalPrice: number | string }>(
    "GET",
    `/v1/registrar/domains/${enc(domain)}/price?years=1`,
  );
  return {
    domain,
    available,
    purchaseCents: registrarPriceCents(price.purchasePrice),
    renewalCents: registrarPriceCents(price.renewalPrice),
  };
}

/** The renewal price of a name, owned or not, in cents (null if the registrar didn't say). */
export async function renewalPriceCents(domain: string): Promise<number | null> {
  const price = await call<{ renewalPrice: number | string }>(
    "GET",
    `/v1/registrar/domains/${enc(domain)}/price?years=1`,
  );
  return registrarPriceCents(price.renewalPrice);
}

/** Registrant details, in the registrar's shape (phone E.164, country ISO alpha-2). */
export type Registrant = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
};

/**
 * Buys one year. Auto-renew stays off: Dibs renews it only while the add-on is paid
 * (cron). `expectedCents` must match the registrar's price or it refuses, so a price
 * change never charges more than we quoted. Returns the order to poll.
 */
export async function buyDomain(
  domain: string,
  expectedCents: number,
  registrant: Registrant,
): Promise<string> {
  const { orderId } = await call<{ orderId: string }>(
    "POST",
    `/v1/registrar/domains/${enc(domain)}/buy`,
    {
      autoRenew: false,
      years: 1,
      expectedPrice: expectedCents / 100,
      contactInformation: registrant,
    },
  );
  return orderId;
}

export async function orderStatus(
  orderId: string,
): Promise<{ status: OrderStatus; raw: string; error?: string }> {
  const order = await call<{
    status?: string;
    domains?: { status?: string; error?: { code?: string } }[];
    error?: { code?: string };
  }>("GET", `/v1/registrar/orders/${enc(orderId)}`);
  return {
    status: readOrderStatus(order),
    raw: `${order.status ?? "?"}/${order.domains?.[0]?.status ?? "?"}`,
    error: order.error?.code ?? order.domains?.[0]?.error?.code,
  };
}

/** One more year, at the price we expect. */
export async function renewDomain(domain: string, expectedCents: number): Promise<string> {
  const { orderId } = await call<{ orderId: string }>(
    "POST",
    `/v1/registrar/domains/${enc(domain)}/renew`,
    { years: 1, expectedPrice: expectedCents / 100 },
  );
  return orderId;
}

/** For a pro moving their domain to another registrar. */
export async function domainAuthCode(domain: string): Promise<string> {
  const { authCode } = await call<{ authCode: string }>(
    "GET",
    `/v1/registrar/domains/${enc(domain)}/auth-code`,
  );
  return authCode;
}

/** Point the domain (and www.) at this app. Already added counts as success. */
export async function attachToProject(domain: string): Promise<void> {
  const project = serverEnv().VERCEL_PROJECT_ID;
  if (!project) throw new RegistrarError("VERCEL_PROJECT_ID isn't set", 500);
  for (const name of [domain, `www.${domain}`]) {
    try {
      await call("POST", `/v10/projects/${enc(project)}/domains`, {
        name,
        ...(name.startsWith("www.") ? { redirect: domain, redirectStatusCode: 308 } : {}),
      });
    } catch (err) {
      if (err instanceof RegistrarError && err.status === 409) continue;
      throw err;
    }
  }
}

/** Stop answering on it (the add-on ended). Already gone counts as success. */
export async function detachFromProject(domain: string): Promise<void> {
  const project = serverEnv().VERCEL_PROJECT_ID;
  if (!project) return;
  for (const name of [`www.${domain}`, domain]) {
    try {
      await call("DELETE", `/v9/projects/${enc(project)}/domains/${enc(name)}`);
    } catch (err) {
      if (err instanceof RegistrarError && err.status === 404) continue;
      throw err;
    }
  }
}
