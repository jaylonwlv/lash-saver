"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { useActionState, useEffect, useRef, useState } from "react";
import { CodeForm } from "@/app/(auth)/login/login-form";
import { trackPixel } from "@/components/meta-pixel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TRIAL_DAYS } from "@/lib/config";
import { dollarsToCents, formatCents } from "@/lib/money";
import type { TradeId } from "@/lib/supabase/database.types";
import { createAccount, type StartState } from "./actions";
import type { PayMethod } from "./schema";

export type TradeOption = {
  id: TradeId;
  label: string;
  emoji: string;
  /** Starter services it adds, e.g. "Haircut · Haircut + beard · Lineup". */
  preview: string;
  /** First starter service, shown on the pay link preview. */
  service: { name: string; priceCents: number; depositCents: number } | null;
  /** The deposit policy clients would see. */
  policy: string;
};

const METHODS: { id: PayMethod; label: string; field: string; placeholder: string }[] = [
  { id: "cashapp", label: "Cash App", field: "Your $Cashtag", placeholder: "$YourStudio" },
  { id: "zelle", label: "Zelle", field: "Your Zelle email or phone", placeholder: "you@email.com" },
  { id: "venmo", label: "Venmo", field: "Your Venmo username", placeholder: "@your-studio" },
  { id: "stripe", label: "Card", field: "", placeholder: "" },
];

// Fields that live on step 2; a server error on them sends the pro back there.
const BUSINESS_FIELDS = [
  "business_name",
  "handle",
  "service_name",
  "service_price",
  "service_deposit",
];

type Step = "trade" | "business" | "save";

/**
 * /start: what do you do → your business → your pay link + save. Nothing is
 * saved until the last step, which creates the account and signs the pro in.
 */
export function StartFlow({
  trades,
  other,
  turnstileSiteKey,
}: {
  trades: TradeOption[];
  other: TradeOption;
  turnstileSiteKey: string | undefined;
}) {
  const [step, setStep] = useState<Step>("trade");
  const [tradeId, setTradeId] = useState<TradeId | null>(null);
  const [businessName, setBusinessName] = useState("");
  const [method, setMethod] = useState<PayMethod | null>(null);
  const [handle, setHandle] = useState("");
  const [serviceName, setServiceName] = useState("");
  const [servicePrice, setServicePrice] = useState("");
  const [serviceDeposit, setServiceDeposit] = useState("");
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});
  const [state, action, pending] = useActionState<StartState, FormData>(createAccount, {});
  const leadSent = useRef(false);
  const router = useRouter();

  const trade = [...trades, other].find((t) => t.id === tradeId) ?? null;
  // Fixing a field clears its message (and any server message for it).
  const [clearedServer, setClearedServer] = useState<string[]>([]);
  const clear = (key: string) => {
    setLocalErrors((errs) => {
      const next = { ...errs };
      delete next[key];
      return next;
    });
    setClearedServer((keys) => (keys.includes(key) ? keys : [...keys, key]));
  };
  const serverErrors = Object.fromEntries(
    Object.entries(state.errors ?? {}).filter(([key]) => !clearedServer.includes(key)),
  );
  const errors = { ...serverErrors, ...localErrors };

  // Ad funnel: arrived (StartSignup), then reached the save step (Lead).
  useEffect(() => {
    trackPixel("StartSignup", { custom: true });
  }, []);
  useEffect(() => {
    if (step === "save" && !leadSent.current) {
      leadSent.current = true;
      trackPixel("Lead");
    }
  }, [step]);
  // A server error on a business field: show it where it can be fixed (once per response).
  const [seenState, setSeenState] = useState(state);
  if (state !== seenState) {
    setSeenState(state);
    setClearedServer([]);
    if (Object.keys(state.errors ?? {}).some((k) => BUSINESS_FIELDS.includes(k))) {
      setStep("business");
    }
  }

  const go = (next: Step) => {
    setStep(next);
    window.scrollTo({ top: 0 });
  };

  if (state.existing) {
    return (
      <section className="flex flex-col gap-4 pt-6">
        <h1 className="text-2xl font-bold">Welcome back</h1>
        <p className="text-muted">
          {state.message ?? "That email already has an account, so we sent you a sign-in code."}
        </p>
        <CodeForm email={state.existing} next="/dashboard" onChange={() => router.push("/login")} />
      </section>
    );
  }

  if (step === "trade") {
    return (
      <section className="flex flex-col gap-4">
        <Progress step={1} />
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold">What do you do?</h1>
          <p className="text-muted">
            We&apos;ll set you up with typical prices and a deposit policy. You can change them
            anytime.
          </p>
        </div>
        <ul className="flex flex-col gap-2">
          {[...trades, other].map((t) => (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => {
                  setTradeId(t.id);
                  go("business");
                }}
                className="border-line bg-surface active:border-brand flex min-h-16 w-full items-center gap-3 rounded-xl border p-3 text-left"
              >
                <span
                  aria-hidden
                  className="bg-background border-line flex size-11 shrink-0 items-center justify-center rounded-xl border text-2xl"
                >
                  {t.emoji}
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="font-semibold">{t.label}</span>
                  {t.preview && <span className="text-muted truncate text-sm">{t.preview}</span>}
                </span>
                <span aria-hidden className="text-muted text-xl">
                  ›
                </span>
              </button>
            </li>
          ))}
        </ul>
        <p className="text-muted text-center text-sm">
          Free for {TRIAL_DAYS} days. No card to sign up.
        </p>
      </section>
    );
  }

  if (step === "business" || !trade || !method) {
    const current = METHODS.find((m) => m.id === method);
    const next = () => {
      const problems: Record<string, string> = {};
      if (!businessName.trim()) problems.business_name = "Enter your business name.";
      if (!method) problems.method = "Choose how clients pay you.";
      else if (method !== "stripe" && !handle.trim())
        problems.handle = `Enter ${current?.field.toLowerCase() ?? "your handle"}.`;
      if (tradeId === "other") {
        if (!serviceName.trim()) problems.service_name = "Enter a service.";
        if (dollarsToCents(servicePrice) === null)
          problems.service_price = "Enter the price, like 60.";
        if (dollarsToCents(serviceDeposit) === null)
          problems.service_deposit = "Enter the deposit, like 20.";
      }
      setLocalErrors(problems);
      if (!Object.keys(problems).length) go("save");
    };
    return (
      <section className="flex flex-col gap-5">
        <Back onClick={() => go("trade")} />
        <Progress step={2} />
        <h1 className="text-2xl font-bold">Your business</h1>
        <Input
          id="business_name"
          label="Business name"
          autoComplete="organization"
          value={businessName}
          onChange={(e) => {
            setBusinessName(e.target.value);
            clear("business_name");
          }}
          error={errors.business_name}
          placeholder="Studio Nova"
        />
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1.5 text-sm font-medium">How do clients pay you?</legend>
          <div className="grid grid-cols-4 gap-2">
            {METHODS.map((m) => (
              <button
                key={m.id}
                type="button"
                aria-pressed={method === m.id}
                onClick={() => {
                  setMethod(m.id);
                  setHandle("");
                  clear("method");
                  clear("handle");
                }}
                className={`min-h-12 rounded-xl border px-1 text-sm font-semibold ${
                  method === m.id
                    ? "border-brand bg-brand text-brand-foreground"
                    : "border-line bg-surface"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
          {errors.method && <p className="text-danger text-sm">{errors.method}</p>}
        </fieldset>
        {current && current.id !== "stripe" && (
          <Input
            id="handle"
            label={current.field}
            value={handle}
            onChange={(e) => {
              setHandle(e.target.value);
              clear("handle");
            }}
            error={errors.handle}
            placeholder={current.placeholder}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            inputMode={current.id === "zelle" ? "email" : "text"}
            hint="Clients send the deposit here. No fees."
          />
        )}
        {current?.id === "stripe" && (
          <p className="bg-surface border-line rounded-xl border p-3 text-sm">
            Clients pay by card, Apple Pay or Google Pay through Stripe. You&apos;ll connect your
            bank right after this (about 5 minutes).
          </p>
        )}
        {tradeId === "other" && (
          <div className="flex flex-col gap-4">
            <p className="text-sm font-medium">Your most popular service</p>
            <Input
              id="service_name"
              label="Service"
              value={serviceName}
              onChange={(e) => {
                setServiceName(e.target.value);
                clear("service_name");
              }}
              error={errors.service_name}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                id="service_price"
                label="Price ($)"
                inputMode="decimal"
                value={servicePrice}
                onChange={(e) => {
                  setServicePrice(e.target.value);
                  clear("service_price");
                }}
                error={errors.service_price}
                placeholder="60"
              />
              <Input
                id="service_deposit"
                label="Deposit ($)"
                inputMode="decimal"
                value={serviceDeposit}
                onChange={(e) => {
                  setServiceDeposit(e.target.value);
                  clear("service_deposit");
                }}
                error={errors.service_deposit}
                placeholder="20"
              />
            </div>
          </div>
        )}
        <Button type="button" onClick={next}>
          See my pay link
        </Button>
      </section>
    );
  }

  // Step 3: their pay link, then save.
  const service =
    tradeId === "other"
      ? {
          name: serviceName.trim(),
          priceCents: dollarsToCents(servicePrice) ?? 0,
          depositCents: dollarsToCents(serviceDeposit) ?? 0,
        }
      : trade.service;
  const methodLabel = METHODS.find((m) => m.id === method)?.label ?? "";
  return (
    <section className="flex flex-col gap-5">
      <Back onClick={() => go("business")} />
      <Progress step={3} />
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">Here&apos;s your pay link</h1>
        <p className="text-muted">This is what clients see when you send it in your DMs.</p>
      </div>

      <PayLinkPreview
        businessName={businessName.trim()}
        service={service}
        policy={trade.policy}
        method={method}
        methodLabel={methodLabel}
        handle={displayHandle(method, handle)}
        example={tradeId !== "other"}
      />

      <form action={action} className="flex flex-col gap-4">
        <input type="hidden" name="trade" value={trade.id} />
        <input type="hidden" name="business_name" value={businessName} />
        <input type="hidden" name="method" value={method} />
        <input type="hidden" name="handle" value={handle} />
        <input type="hidden" name="service_name" value={serviceName} />
        <input type="hidden" name="service_price" value={servicePrice} />
        <input type="hidden" name="service_deposit" value={serviceDeposit} />
        <input
          type="hidden"
          name="timezone"
          value={Intl.DateTimeFormat().resolvedOptions().timeZone}
        />
        {/* Hidden from people; bots fill it in. */}
        <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
          <label htmlFor="website">Website</label>
          <input id="website" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
        </div>
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-bold">Save it and start sending</h2>
          <p className="text-muted text-sm">
            Where should we send booking alerts? You&apos;re in straight away.
          </p>
        </div>
        <Input
          id="email"
          type="email"
          label="Email"
          autoComplete="email"
          inputMode="email"
          defaultValue={state.values?.email}
          error={errors.email}
          required
        />
        {turnstileSiteKey && <Turnstile siteKey={turnstileSiteKey} />}
        {state.message && <p className="text-danger text-sm">{state.message}</p>}
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save and continue"}
        </Button>
        <p className="text-muted text-center text-xs">
          Free for {TRIAL_DAYS} days. No card to sign up: you add one before your first pay link. By
          continuing you agree to the{" "}
          <Link href="/terms" className="underline">
            Terms
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="underline">
            Privacy Policy
          </Link>
          .
        </p>
      </form>
    </section>
  );
}

/** The handle as clients will see it: "$GlowStudio", "@glow-studio", or the Zelle email/phone. */
function displayHandle(method: PayMethod, handle: string): string {
  const h = handle.trim();
  if (!h) return "";
  if (method === "cashapp") return `$${h.replace(/^\$/, "")}`;
  if (method === "venmo") return `@${h.replace(/^@/, "")}`;
  return h;
}

function Progress({ step }: { step: 1 | 2 | 3 }) {
  return (
    <div className="flex items-center gap-2" aria-label={`Step ${step} of 3`}>
      {[1, 2, 3].map((n) => (
        <span
          key={n}
          aria-hidden
          className={`h-1.5 flex-1 rounded-full ${n <= step ? "bg-brand" : "bg-line"}`}
        />
      ))}
    </div>
  );
}

function Back({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-brand -mb-2 inline-flex min-h-11 items-center self-start font-medium"
    >
      ← Back
    </button>
  );
}

/** A look-alike of the client's pay page, with the pro's own details. */
function PayLinkPreview({
  businessName,
  service,
  policy,
  method,
  methodLabel,
  handle,
  example,
}: {
  businessName: string;
  service: { name: string; priceCents: number; depositCents: number } | null;
  policy: string;
  method: PayMethod;
  methodLabel: string;
  handle: string;
  example: boolean;
}) {
  const deposit = service ? formatCents(service.depositCents) : "";
  return (
    <div data-theme="light" className="overflow-hidden rounded-3xl shadow-2xl">
      <div className="bg-background text-foreground flex flex-col gap-4 p-5">
        <div className="flex flex-col gap-0.5">
          <p className="text-brand text-sm font-semibold">{businessName}</p>
          <p className="text-xl font-bold">Hi Jordan, secure your spot</p>
        </div>
        {service && (
          <dl className="border-line bg-surface flex flex-col gap-3 rounded-2xl border p-4 text-sm">
            <div>
              <dt className="text-muted text-xs uppercase">Appointment</dt>
              <dd className="font-medium">{service.name}</dd>
            </div>
            <div>
              <dt className="text-muted text-xs uppercase">When</dt>
              <dd className="font-medium">Saturday at 2:00 PM</dd>
            </div>
            <div>
              <dt className="text-muted text-xs uppercase">Deposit</dt>
              <dd className="font-medium">
                {deposit} · {formatCents(service.priceCents - service.depositCents)} due at your
                appointment
              </dd>
            </div>
          </dl>
        )}
        <div className="flex flex-col gap-1 text-sm">
          <p className="font-semibold">Deposit policy</p>
          <p className="text-muted whitespace-pre-line">{policy}</p>
        </div>
        <p className="flex items-center gap-2 text-sm">
          <span
            aria-hidden
            className="bg-brand text-brand-foreground flex size-5 items-center justify-center rounded text-xs"
          >
            ✓
          </span>
          I&apos;ve read and agree to the deposit policy above.
        </p>
        <div className="bg-brand text-brand-foreground flex min-h-12 items-center justify-center rounded-xl px-4 text-center font-semibold">
          {method === "stripe"
            ? `Pay ${deposit} deposit`
            : `Send ${deposit} with ${methodLabel}${handle ? ` to ${handle}` : ""}`}
        </div>
        {example && (
          <p className="text-muted text-center text-xs">
            Example price. You can change your prices after you save.
          </p>
        )}
      </div>
    </div>
  );
}

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, options: { sitekey: string; appearance?: string }) => string;
    };
  }
}

/** Cloudflare's bot check; it adds a hidden cf-turnstile-response field to the form. */
function Turnstile({ siteKey }: { siteKey: string }) {
  const box = useRef<HTMLDivElement>(null);
  const rendered = useRef(false);
  const render = () => {
    if (rendered.current || !box.current || !window.turnstile) return;
    rendered.current = true;
    window.turnstile.render(box.current, { sitekey: siteKey, appearance: "interaction-only" });
  };
  useEffect(render);
  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onReady={render}
      />
      <div ref={box} />
    </>
  );
}
