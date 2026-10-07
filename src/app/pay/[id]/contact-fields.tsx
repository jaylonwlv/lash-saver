import { Input } from "@/components/ui/input";
import type { FormState } from "@/lib/forms";

/**
 * Asked on the pay page when the pro sent the link with just the client's name:
 * the client adds their own email (or phone) so confirmations and reminders reach them.
 */
export function ContactFields({ state }: { state: FormState }) {
  const e = state.errors ?? {};
  const v = state.values ?? {};
  return (
    <fieldset className="flex flex-col gap-4">
      <legend className="mb-1 font-semibold">Where should we send your confirmation?</legend>
      <Input
        id="client_email"
        label="Email"
        type="email"
        inputMode="email"
        autoComplete="email"
        defaultValue={v.client_email}
        error={e.client_email}
      />
      <Input
        id="client_phone"
        label="Or phone"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        defaultValue={v.client_phone}
        error={e.client_phone}
        hint="We send your confirmation and reminders here."
      />
    </fieldset>
  );
}
