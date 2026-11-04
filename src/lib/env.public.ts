/**
 * Public env, safe for the browser. Each key must be referenced literally
 * (process.env.NEXT_PUBLIC_X) so Next.js can inline it at build time.
 *
 * Checked by hand rather than with zod: this file ships in client bundles
 * (/start, the Supabase browser client), and zod alone added ~90KB of script there.
 */

const AUTH_PROVIDERS = ["google", "apple"] as const;
export type AuthProvider = (typeof AUTH_PROVIDERS)[number];

export type PublicEnv = {
  NEXT_PUBLIC_APP_URL: string;
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: string;
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: string;
  /** Cloudflare Turnstile bot check on instant sign-up. Optional: unset turns it off. */
  NEXT_PUBLIC_TURNSTILE_SITE_KEY?: string;
  /**
   * One-tap sign-in providers shown on /login, comma-separated ("google,apple"). Each
   * must be enabled in Supabase (Authentication → Providers) first. Unset hides them.
   */
  NEXT_PUBLIC_AUTH_PROVIDERS: AuthProvider[];
  /** Microsoft Clarity (heatmaps, recordings) on marketing pages. Empty or unset: off. */
  NEXT_PUBLIC_CLARITY_ID?: string;
  /** Meta Pixel for ad measurement. Optional: empty or unset turns it off. */
  NEXT_PUBLIC_META_PIXEL_ID?: string;
};

type Raw = Record<keyof PublicEnv, string | undefined>;

function isUrl(v: string | undefined): v is string {
  if (!v) return false;
  try {
    new URL(v);
    return true;
  } catch {
    return false;
  }
}

/** Empty string counts as unset; otherwise it must match. */
function optional(v: string | undefined, pattern?: RegExp): string | undefined | false {
  if (v === undefined || v === "") return undefined;
  return !pattern || pattern.test(v) ? v : false;
}

function providers(v: string | undefined): AuthProvider[] | false {
  if (!v?.trim()) return [];
  const list = v
    .split(",")
    .map((p) => p.trim().toLowerCase())
    .filter(Boolean);
  return list.every((p): p is AuthProvider => (AUTH_PROVIDERS as readonly string[]).includes(p))
    ? list
    : false;
}

/** Validates the raw values. Exported for tests. */
export function parsePublicEnv(raw: Raw): PublicEnv {
  const bad: (keyof PublicEnv)[] = [];
  const req = (key: keyof PublicEnv, ok: boolean) => {
    if (!ok) bad.push(key);
  };

  req("NEXT_PUBLIC_APP_URL", isUrl(raw.NEXT_PUBLIC_APP_URL));
  req("NEXT_PUBLIC_SUPABASE_URL", isUrl(raw.NEXT_PUBLIC_SUPABASE_URL));
  req("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", !!raw.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
  req(
    "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
    typeof raw.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY === "string" &&
      raw.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.startsWith("pk_"),
  );
  const turnstile = optional(raw.NEXT_PUBLIC_TURNSTILE_SITE_KEY);
  const auth = providers(raw.NEXT_PUBLIC_AUTH_PROVIDERS);
  req("NEXT_PUBLIC_AUTH_PROVIDERS", auth !== false);
  const clarity = optional(raw.NEXT_PUBLIC_CLARITY_ID, /^[a-z0-9]{6,20}$/i);
  req("NEXT_PUBLIC_CLARITY_ID", clarity !== false);
  const pixel = optional(raw.NEXT_PUBLIC_META_PIXEL_ID, /^\d{5,20}$/);
  req("NEXT_PUBLIC_META_PIXEL_ID", pixel !== false);

  if (bad.length) {
    const keys = bad.map((key) => `${key} (${raw[key] ? "invalid" : "missing"})`).join(", ");
    throw new Error(`Invalid or missing public env vars: ${keys}. See .env.example.`);
  }
  return {
    // "https://getdibs.pro/" in the env would make every link "getdibs.pro//pay/…",
    // which crashes the pay page in browsers: links are always built as URL + "/path".
    NEXT_PUBLIC_APP_URL: raw.NEXT_PUBLIC_APP_URL!.replace(/\/+$/, ""),
    NEXT_PUBLIC_SUPABASE_URL: raw.NEXT_PUBLIC_SUPABASE_URL!,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: raw.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: raw.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!,
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: turnstile || undefined,
    NEXT_PUBLIC_AUTH_PROVIDERS: auth || [],
    NEXT_PUBLIC_CLARITY_ID: clarity || undefined,
    NEXT_PUBLIC_META_PIXEL_ID: pixel || undefined,
  };
}

let cached: PublicEnv | undefined;

export function publicEnv(): PublicEnv {
  if (cached) return cached;
  cached = parsePublicEnv({
    NEXT_PUBLIC_AUTH_PROVIDERS: process.env.NEXT_PUBLIC_AUTH_PROVIDERS,
    NEXT_PUBLIC_CLARITY_ID: process.env.NEXT_PUBLIC_CLARITY_ID,
    NEXT_PUBLIC_META_PIXEL_ID: process.env.NEXT_PUBLIC_META_PIXEL_ID,
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  });
  return cached;
}
