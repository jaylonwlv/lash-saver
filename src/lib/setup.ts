import { canTakeDeposits, type DepositSetup } from "@/lib/payments";

/*
 * How far a pro is through setup before their first pay link. Used by the
 * dashboard checklist and the setup reminder emails (no server deps).
 */

export type SetupProfile = DepositSetup & {
  business_name: string | null;
  slug: string | null;
};

export type SetupState = {
  profileDone: boolean;
  depositsDone: boolean;
  servicesDone: boolean;
  /** Everything a pay link needs; only the card (trial) is left. */
  ready: boolean;
};

export function setupState(profile: SetupProfile, activeServices: number): SetupState {
  const profileDone = Boolean(profile.business_name && profile.slug);
  const depositsDone = canTakeDeposits(profile);
  const servicesDone = activeServices > 0;
  return {
    profileDone,
    depositsDone,
    servicesDone,
    ready: profileDone && depositsDone && servicesDone,
  };
}

/** One sentence on what's left before the first pay link, for emails. */
export function nextStepSentence(state: SetupState): string {
  const missing = [
    !state.profileDone && "add your business name",
    !state.depositsDone && "choose how clients pay you (Cash App, Zelle, Venmo or card)",
    !state.servicesDone && "add a service with its price and deposit",
  ].filter((step): step is string => Boolean(step));
  if (missing.length === 0)
    return "You're set up: tap New appointment to make your first pay link.";
  if (missing.length === 1) return `One step left: ${missing[0]}.`;
  const list = `${missing.slice(0, -1).join(", ")} and ${missing.at(-1)}`;
  return `${missing.length} quick steps left: ${list}.`;
}
