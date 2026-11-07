/* Small wording helpers for a pro's public page. No server deps (tested). */

/** "Nail tech · Las Vegas", either part, or null when the pro left both empty. */
export function proTagline(specialty: string | null, location: string | null): string | null {
  return [specialty, location].filter((part) => part?.trim()).join(" · ") || null;
}

/**
 * What tapping a service copies. Instagram's ig.me links don't reliably prefill a
 * message, so the client pastes this into the DM that opens.
 */
export function serviceMessage(service: string): string {
  return `Hi! I'd like to book ${service}.`;
}
