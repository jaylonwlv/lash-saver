import "server-only";
import { serverEnv } from "@/lib/env";

/** The help chat shows only once ANTHROPIC_API_KEY is set. */
export function assistantEnabled(): boolean {
  return Boolean(serverEnv().ANTHROPIC_API_KEY);
}
