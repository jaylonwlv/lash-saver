/**
 * Requests to a pro's own domain (studionova.com): which page it shows, and what
 * else may be served there. Used by proxy.ts. Reads the public_custom_domains view
 * with the publishable key; answers are cached per server instance for a few minutes.
 */

const TTL_MS = 5 * 60_000;
const MISS_TTL_MS = 60_000;
const cache = new Map<string, { slug: string | null; until: number }>();

/** "www.StudioNova.com:443" → "studionova.com". */
export function bareHost(host: string | null): string | null {
  if (!host) return null;
  return (
    host
      .toLowerCase()
      .replace(/:\d+$/, "")
      .replace(/^www\./, "") || null
  );
}

/** Hosts that are always the app itself, never a pro's domain. */
export function isAppHost(host: string, appHost: string): boolean {
  return (
    host === appHost ||
    host === "localhost" ||
    host === "127.0.0.1" ||
    host.endsWith(".vercel.app") ||
    host.endsWith(".localhost")
  );
}

/**
 * Paths a pro's domain serves as-is: their pay links, the page's own assets and
 * its visit beacon. Everything else goes to the app's own address.
 */
export function servedOnCustomHost(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname.startsWith("/pay/") ||
    pathname.startsWith("/_next/") ||
    pathname === "/api/page-visit" ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    /^\/icon-[\w-]+\.png$/.test(pathname)
  );
}

/** The slug behind a live custom domain, or null. Never throws: a lookup failure is a miss. */
export async function slugForHost(host: string): Promise<string | null> {
  const hit = cache.get(host);
  if (hit && hit.until > Date.now()) return hit.slug;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  try {
    const res = await fetch(
      `${url}/rest/v1/public_custom_domains?select=slug&domain=eq.${encodeURIComponent(host)}&limit=1`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: "no-store" },
    );
    if (!res.ok) throw new Error(`status ${res.status}`);
    const rows = (await res.json()) as { slug: string }[];
    const slug = rows[0]?.slug ?? null;
    cache.set(host, { slug, until: Date.now() + (slug ? TTL_MS : MISS_TTL_MS) });
    return slug;
  } catch (err) {
    console.error(`Custom domain lookup for ${host} failed`, err);
    return null;
  }
}
