import { Input } from "@/components/ui/input";
import type { FormState } from "@/lib/forms";

/** What the pay page asks for: always an email when the pro left it out; a phone only if that's missing too. */
export type ContactAsk = "email" | "email_and_phone" | null;

/**
 * Asked on the pay page when the pro sent the link without the client's email:
 * the client adds it so their confirmation and reminders reach them.
 */
export function ContactFields({
  ask,
  state,
}: {
  ask: "email" | "email_and_phone";
  state: FormState;
}) {
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
        hint="Your confirmation and reminders go here."
        required
      />
      {ask === "email_and_phone" && (
        <Input
          id="client_phone"
          label="Phone (optional)"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          defaultValue={v.client_phone}
          error={e.client_phone}
        />
      )}
    </fieldset>
  );
}
