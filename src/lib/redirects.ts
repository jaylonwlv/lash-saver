/**
 * A same-site path to send someone to after sign-in, or the fallback. Browsers
 * read "/\evil.com" (and tabs or newlines inside it) as "//evil.com", another
 * site, so anything but a plain path is refused.
 */
export function safeNextPath(value: unknown, fallback = "/dashboard"): string {
  if (typeof value !== "string" || !value.startsWith("/")) return fallback;
  if (/[\\\s]/.test(value) || value.startsWith("//")) return fallback;
  // Resolve against a dummy origin: it must stay on that origin.
  const url = new URL(value, "https://same.site");
  return url.origin === "https://same.site" ? value : fallback;
}
