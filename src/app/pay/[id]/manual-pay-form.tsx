"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import type { FormState } from "@/lib/forms";
import { ContactFields, type ContactAsk } from "./contact-fields";
import { AgreeBox } from "./ui";
import type { ManualApp } from "@/lib/supabase/database.types";

export type PayOption = { app: ManualApp; label: string; handle: string; url: string | null };

/** A color per app so the options are easy to tell apart (initials, not logos). */
const APP_TILE: Record<ManualApp, string> = {
  cashapp: "bg-cashapp text-white",
  zelle: "bg-zelle text-white",
  venmo: "bg-venmo text-white",
};

/** Client pays with the pro's own Cash App / Zelle / Venmo, then tells us they sent it. */
export function ManualPayForm({
  action,
  amount,
  askContact = null,
  options,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  amount: string;
  /** The pro didn't add the client's email: ask for it here. */
  askContact?: ContactAsk;
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
      {askContact && <ContactFields ask={askContact} state={state} />}
      <AgreeBox defaultChecked={state.values?.agree === "on"} invalid={!!state.errors?.agree} />
      {state.errors?.agree && <p className="text-danger -mt-2 text-sm">{state.errors.agree}</p>}

      <fieldset className="flex flex-col gap-3">
        <legend className="font-display mb-3 text-lg font-extrabold tracking-tight">
          Send {amount} with {many ? "one of these" : options[0].label}
        </legend>
        {options.map((o, i) => (
          <div
            key={o.app}
            className="has-[:checked]:border-brand bg-surface border-line flex flex-col gap-3 rounded-[22px] border-2 p-4"
          >
            <label className="flex cursor-pointer items-center gap-3">
              {many && (
                <input
                  type="radio"
                  name="app"
                  value={o.app}
                  defaultChecked={i === 0}
                  className="accent-brand size-5 shrink-0"
                />
              )}
              {!many && <input type="hidden" name="app" value={o.app} />}
              <span
                aria-hidden
                className={`font-display flex size-11 shrink-0 items-center justify-center rounded-[14px] text-lg font-extrabold ${APP_TILE[o.app]}`}
              >
                {o.label.charAt(0)}
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="text-muted text-xs font-bold tracking-[0.1em] uppercase">
                  {o.label}
                </span>
                <span className="font-bold break-all select-all">{o.handle}</span>
                <span className="text-muted text-sm">Send exactly {amount}</span>
              </span>
            </label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                className="min-h-11 flex-1 sm:flex-none"
                onClick={() => copy(o.handle)}
              >
                {copied === o.handle ? "Copied ✓" : "Copy"}
              </Button>
              {o.url && (
                <a
                  href={o.url}
                  target="_blank"
                  rel="noreferrer"
                  className="press border-line bg-surface inline-flex min-h-11 flex-1 items-center justify-center rounded-2xl border px-3 font-bold whitespace-nowrap sm:flex-none sm:px-5"
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
      <Button type="submit" disabled={pending} className="min-h-14 text-lg">
        {pending ? "Letting them know…" : "I've sent my deposit"}
      </Button>
      <p className="text-muted text-center text-xs">
        Your spot is confirmed once your provider sees the payment. You&apos;ll get an email.
      </p>
    </form>
  );
}
