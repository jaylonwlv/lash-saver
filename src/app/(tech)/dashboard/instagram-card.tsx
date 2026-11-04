"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import type { FormState } from "@/lib/forms";
import { saveInstagram } from "./instagram-actions";

/**
 * For pros with no Instagram handle: without it their page has no "Message to book"
 * button and the pay page can't link back to them. Gone once saved.
 */
export function InstagramCard() {
  const [state, action, pending] = useActionState<FormState, FormData>(saveInstagram, {});
  const error = state.errors?.instagram_handle ?? state.message;
  return (
    <section id="instagram" className="card flex scroll-mt-20 flex-col gap-3 p-5">
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="bg-brand-soft flex size-11 shrink-0 items-center justify-center rounded-[14px] text-xl"
        >
          💬
        </span>
        <div className="flex flex-col">
          <h2 className="font-display text-xl leading-tight font-extrabold tracking-tight">
            Add your Instagram
          </h2>
          <p className="text-muted text-sm">So clients can message you from your page</p>
        </div>
      </div>
      <form action={action} className="flex flex-col gap-2">
        <label htmlFor="instagram_handle" className="sr-only">
          Your Instagram handle
        </label>
        <span className="border-line bg-surface focus-within:border-brand flex min-h-12 items-center rounded-xl border px-3">
          <span aria-hidden className="text-muted">
            @
          </span>
          <input
            id="instagram_handle"
            name="instagram_handle"
            defaultValue={state.values?.instagram_handle}
            placeholder="yourbusiness"
            autoCapitalize="none"
            autoCorrect="off"
            autoComplete="off"
            spellCheck={false}
            aria-invalid={error ? true : undefined}
            className="w-full bg-transparent px-1 text-base outline-none"
          />
        </span>
        {error && <p className="text-danger text-sm">{error}</p>}
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
      </form>
      <p className="text-muted text-xs">
        It turns on the &ldquo;Message to book&rdquo; button on your page and pay links.
      </p>
    </section>
  );
}
