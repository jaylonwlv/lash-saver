"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import type { FormState } from "@/lib/forms";
import type { ManualApp } from "@/lib/supabase/database.types";

export type PayOption = { app: ManualApp; label: string; handle: string; url: string | null };

/** Client pays with the pro's own Cash App / Zelle / Venmo, then tells us they sent it. */
export function ManualPayForm({
  action,
  amount,
  options,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  amount: string;
  options: PayOption[];
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {});
  const [copied, setCopied] = useState<string | null>(null);
  const many = options.length > 1;

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(text);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // Clipboard blocked (some in-app browsers); the handle stays selectable.
    }
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex min-h-12 cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          name="agree"
          className="accent-brand mt-0.5 size-6 shrink-0"
          aria-invalid={state.errors?.agree ? true : undefined}
        />
        <span>I&apos;ve read and agree to the deposit policy above.</span>
      </label>
      {state.errors?.agree && <p className="text-danger -mt-2 text-sm">{state.errors.agree}</p>}

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 font-semibold">
          Send {amount} with {many ? "one of these" : options[0].label}
        </legend>
        {options.map((o, i) => (
          <div
            key={o.app}
            className="border-line bg-surface flex flex-col gap-3 rounded-2xl border p-4"
          >
            <label className="flex items-center gap-3">
              {many && (
                <input
                  type="radio"
                  name="app"
                  value={o.app}
                  defaultChecked={i === 0}
                  className="accent-brand size-5"
                />
              )}
              {!many && <input type="hidden" name="app" value={o.app} />}
              <span className="flex flex-col">
                <span className="text-muted text-xs font-medium tracking-wide uppercase">
                  {o.label}
                </span>
                <span className="font-medium break-all select-all">{o.handle}</span>
                <span className="text-muted text-sm">Send exactly {amount}</span>
              </span>
            </label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                className="flex-1 sm:flex-none"
                onClick={() => copy(o.handle)}
              >
                {copied === o.handle ? "Copied!" : "Copy"}
              </Button>
              {o.url && (
                <a
                  href={o.url}
                  target="_blank"
                  rel="noreferrer"
                  className="border-line bg-surface inline-flex min-h-12 flex-1 items-center justify-center rounded-xl border px-3 font-semibold whitespace-nowrap sm:flex-none sm:px-5"
                >
                  Open {o.label}
                </a>
              )}
            </div>
          </div>
        ))}
        {state.errors?.app && <p className="text-danger text-sm">{state.errors.app}</p>}
      </fieldset>

      {state.message && <p className="text-danger text-sm">{state.message}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Letting them know…" : "I've sent my deposit"}
      </Button>
      <p className="text-muted text-center text-xs">
        Your spot is confirmed once your provider sees the payment. You&apos;ll get an email.
      </p>
    </form>
  );
}
