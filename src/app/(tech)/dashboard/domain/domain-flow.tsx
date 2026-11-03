"use client";

import { useActionState, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { FormState } from "@/lib/forms";
import { revealTransferCode, searchDomains, startCheckout, type DomainOption } from "./actions";

type Prices = { yearly: string; monthly: string; setup: string; savings: string };

/** Search a name, pick .com or .pro, choose a plan, fill in the owner's details, pay. */
export function DomainFlow({
  suggestion,
  email,
  prices,
}: {
  suggestion: string;
  email: string;
  prices: Prices;
}) {
  const [name, setName] = useState(suggestion);
  const [options, setOptions] = useState<DomainOption[] | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searching, startSearch] = useTransition();
  const [picked, setPicked] = useState<string | null>(null);
  const [plan, setPlan] = useState<"yearly" | "monthly">("yearly");
  const [state, action, pending] = useActionState<FormState, FormData>(startCheckout, {});
  const v = state.values ?? {};
  const e = state.errors ?? {};

  function search() {
    setPicked(null);
    startSearch(async () => {
      const result = await searchDomains(name);
      if ("error" in result) {
        setSearchError(result.error);
        setOptions(null);
      } else {
        setSearchError(null);
        setOptions(result.options);
        setPicked(result.options.find((o) => o.offered)?.domain ?? null);
      }
    });
  }

  const firstCharge =
    plan === "yearly"
      ? `${prices.yearly} today`
      : `${prices.monthly} + ${prices.setup} setup today`;

  return (
    <div className="flex flex-col gap-4">
      <section className="card flex flex-col gap-3 p-5">
        <label htmlFor="domain-name" className="font-bold">
          Find your name
        </label>
        <div className="flex gap-2">
          <input
            id="domain-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                search();
              }
            }}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            placeholder="studionova"
            className="border-line bg-surface min-h-12 w-full min-w-0 rounded-xl border px-3 text-base"
          />
          <Button type="button" onClick={search} disabled={searching} className="shrink-0 px-5">
            {searching ? "…" : "Search"}
          </Button>
        </div>
        {searchError && <p className="text-danger text-sm">{searchError}</p>}
        {options && (
          <ul className="flex flex-col gap-2">
            {options.map((o) => (
              <li key={o.domain}>
                <button
                  type="button"
                  disabled={!o.offered}
                  onClick={() => setPicked(o.domain)}
                  aria-pressed={picked === o.domain}
                  className={`press flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl border-2 px-4 text-left ${
                    picked === o.domain ? "border-brand bg-brand-soft/50" : "border-line"
                  } disabled:opacity-50`}
                >
                  <span className="font-bold break-all">{o.domain}</span>
                  <span className="text-muted shrink-0 text-sm">
                    {o.offered
                      ? picked === o.domain
                        ? "✓ Yours"
                        : "Available"
                      : o.available
                        ? "Premium"
                        : "Taken"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {options && !options.some((o) => o.offered) && (
          <p className="text-muted text-sm">
            Try a variation: add your city or what you do, like studionovalv or studionovanails.
          </p>
        )}
      </section>

      {picked && (
        <form action={action} className="flex flex-col gap-4">
          <input type="hidden" name="domain" value={picked} />
          <input type="hidden" name="plan" value={plan} />
          <section className="card flex flex-col gap-2 p-5">
            <p className="font-bold">Choose your plan</p>
            {(
              [
                ["yearly", `${prices.yearly}/year`, `Best value: save ${prices.savings} a year`],
                ["monthly", `${prices.monthly}/month`, `Plus ${prices.setup} setup`],
              ] as const
            ).map(([id, label, note]) => (
              <button
                key={id}
                type="button"
                onClick={() => setPlan(id)}
                aria-pressed={plan === id}
                className={`press flex min-h-14 flex-col items-start justify-center rounded-2xl border-2 px-4 py-2 text-left ${
                  plan === id ? "border-brand bg-brand-soft/50" : "border-line"
                }`}
              >
                <span className="font-bold">{label}</span>
                <span className="text-muted text-sm">{note}</span>
              </button>
            ))}
          </section>

          <section className="card flex flex-col gap-3 p-5">
            <div>
              <p className="font-bold">The owner&apos;s details</p>
              <p className="text-muted text-sm">
                Domains are registered to a real person, so {picked} is legally yours. The registry
                needs a real name, address and phone for its owner.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="First name"
                id="firstName"
                name="firstName"
                autoComplete="given-name"
                defaultValue={v.firstName}
                error={e.firstName}
              />
              <Input
                label="Last name"
                id="lastName"
                name="lastName"
                autoComplete="family-name"
                defaultValue={v.lastName}
                error={e.lastName}
              />
            </div>
            <Input
              label="Email"
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              defaultValue={v.email ?? email}
              error={e.email}
            />
            <Input
              label="Phone"
              id="phone"
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              defaultValue={v.phone}
              error={e.phone}
            />
            <Input
              label="Street address"
              id="address1"
              name="address1"
              autoComplete="address-line1"
              defaultValue={v.address1}
              error={e.address1}
            />
            <Input
              label="Apt, suite (optional)"
              id="address2"
              name="address2"
              autoComplete="address-line2"
              defaultValue={v.address2}
              error={e.address2}
            />
            <Input
              label="City"
              id="city"
              name="city"
              autoComplete="address-level2"
              defaultValue={v.city}
              error={e.city}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="State"
                id="state"
                name="state"
                autoComplete="address-level1"
                maxLength={2}
                placeholder="NV"
                defaultValue={v.state}
                error={e.state}
              />
              <Input
                label="ZIP"
                id="zip"
                name="zip"
                inputMode="numeric"
                autoComplete="postal-code"
                defaultValue={v.zip}
                error={e.zip}
              />
            </div>
          </section>

          <label className="card flex gap-3 p-5 text-sm">
            <input
              type="checkbox"
              name="terms"
              className="accent-brand mt-0.5 size-5 shrink-0"
              defaultChecked={v.terms === "on"}
            />
            <span>
              I&apos;m buying <strong>{picked}</strong> for {firstCharge}. It&apos;s registered in
              my name. <strong>No refund once it&apos;s registered.</strong> Cancelling stops the
              next charge; my page stays on it until the time I paid for ends. Email isn&apos;t
              included.
              {e.terms && <span className="text-danger mt-1 block">{e.terms}</span>}
            </span>
          </label>

          {state.message && <p className="text-danger text-sm">{state.message}</p>}
          <Button type="submit" disabled={pending}>
            {pending ? "Opening checkout…" : `Continue to payment`}
          </Button>
        </form>
      )}
    </div>
  );
}

/** Shows the code another registrar asks for, on request. */
export function TransferCode() {
  const [result, setResult] = useState<{ code: string } | { error: string } | null>(null);
  const [pending, start] = useTransition();
  if (result && "code" in result) {
    return (
      <p className="bg-background rounded-xl px-4 py-3 text-sm break-all select-all">
        Transfer code: <strong>{result.code}</strong>
      </p>
    );
  }
  return (
    <>
      <button
        type="button"
        disabled={pending}
        onClick={() => start(async () => setResult(await revealTransferCode()))}
        className="text-brand min-h-12 text-sm font-semibold underline"
      >
        Moving it to another provider? Get your transfer code
      </button>
      {result && "error" in result && <p className="text-muted text-sm">{result.error}</p>}
    </>
  );
}
