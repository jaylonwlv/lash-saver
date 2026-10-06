"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { useActionState, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { CodeForm } from "@/app/(auth)/login/login-form";
import { trackPixel } from "@/components/meta-pixel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TRIAL_DAYS } from "@/lib/config";
import { publicEnv } from "@/lib/env.public";
import { dollarsToCents, formatCents } from "@/lib/money";
import type { TradeId } from "@/lib/supabase/database.types";
import { AD_TRADE_KEY } from "../remember-trade";
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

/*
 * What they've entered so far, kept on this phone so someone who leaves (a DM, a
 * call) picks up where they were when they come back. No email is stored.
 */
const DRAFT_KEY = "dibs:start-draft";
const DRAFT_DAYS = 7;
type Draft = {
  at: number;
  step: Step;
  tradeId: TradeId | null;
  businessName: string;
  method: PayMethod | null;
  handle: string;
  serviceName: string;
  servicePrice: string;
  serviceDeposit: string;
};

const noSubscribe = () => () => {};
const serverNull = () => null;
function draftSnapshot(): string | null {
  try {
    return localStorage.getItem(DRAFT_KEY);
  } catch {
    return null;
  }
}
function adTradeSnapshot(): string | null {
  try {
    return sessionStorage.getItem(AD_TRADE_KEY);
  } catch {
    return null;
  }
}
function writeDraft(draft: Draft | null) {
  try {
    if (draft) localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    else localStorage.removeItem(DRAFT_KEY);
  } catch {}
}
function parseDraft(raw: string | null, tradeIds: string[]): Draft | null {
  if (!raw) return null;
  try {
    const v: unknown = JSON.parse(raw);
    if (typeof v !== "object" || v === null) return null;
    const d = v as Partial<Record<keyof Draft, unknown>>;
    const text = (x: unknown) => (typeof x === "string" ? x.slice(0, 200) : "");
    if (typeof d.at !== "number" || Date.now() - d.at > DRAFT_DAYS * 86_400_000) return null;
    const tradeId =
      typeof d.tradeId === "string" && tradeIds.includes(d.tradeId) ? d.tradeId : null;
    const method = METHODS.find((m) => m.id === d.method)?.id ?? null;
    const step: Step = d.step === "save" || d.step === "business" ? d.step : "trade";
    return {
      at: d.at,
      step,
      tradeId: tradeId as TradeId | null,
      businessName: text(d.businessName),
      method,
      handle: text(d.handle),
      serviceName: text(d.serviceName),
      servicePrice: text(d.servicePrice),
      serviceDeposit: text(d.serviceDeposit),
    };
  } catch {
    return null;
  }
}

/**
 * /start: what do you do → your business → your pay link + save. Nothing is
 * saved until the last step, which creates the account and signs the pro in.
 */
export function StartFlow({
  trades,
  other,
  turnstileSiteKey,
  initialTrade,
}: {
  trades: TradeOption[];
  other: TradeOption;
  turnstileSiteKey: string | undefined;
  /** From an ad aimed at one trade (?trade=): skip "What do you do?". */
  initialTrade?: TradeId;
}) {
  const [step, setStep] = useState<Step>(initialTrade ? "business" : "trade");
  const [tradeId, setTradeId] = useState<TradeId | null>(initialTrade ?? null);
  const [businessName, setBusinessName] = useState("");
  const [method, setMethod] = useState<PayMethod | null>(null);
  const [handle, setHandle] = useState("");
  const [serviceName, setServiceName] = useState("");
  const [servicePrice, setServicePrice] = useState("");
  const [serviceDeposit, setServiceDeposit] = useState("");
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});
  const [state, action, pending] = useActionState<StartState, FormData>(createAccount, {});
  const leadSent = useRef(false);
  const businessSent = useRef(false);
  const router = useRouter();

  // Pick up where they left off: only a draft from before this visit, applied once on
  // arrival. Any tap here ends that, so the page's own saving never overwrites typing.
  const savedDraft = useSyncExternalStore(noSubscribe, draftSnapshot, serverNull);
  // A trade remembered from an ad link to the landing page (see RememberTrade).
  const adTrade = useSyncExternalStore(noSubscribe, adTradeSnapshot, serverNull);
  const [draftChecked, setDraftChecked] = useState(false);
  const [resumed, setResumed] = useState(false);
  // Where a returning visitor was put back: their first visit already counted those
  // funnel steps, so they aren't sent again.
  const [restoredStep, setRestoredStep] = useState<Step | null>(null);
  if (!draftChecked && (savedDraft || adTrade)) {
    setDraftChecked(true);
    const tradeIds = [...trades, other].map((t) => t.id);
    const draft = parseDraft(savedDraft, tradeIds);
    const fromAd = adTrade && tradeIds.includes(adTrade as TradeId) ? (adTrade as TradeId) : null;
    // The ad they came from this time (?trade= on this page or the landing page).
    const wanted = initialTrade ?? fromAd;
    const typed = Boolean(draft && (draft.businessName || draft.handle || draft.serviceName));
    // What they typed wins; an empty draft never overrides the ad they just tapped.
    if (draft?.tradeId && (typed || !wanted)) {
      setTradeId(draft.tradeId);
      setBusinessName(draft.businessName);
      setMethod(draft.method);
      setHandle(draft.handle);
      setServiceName(draft.serviceName);
      setServicePrice(draft.servicePrice);
      setServiceDeposit(draft.serviceDeposit);
      // The save step needs the business details; otherwise resume on them.
      const resumeStep =
        draft.step === "save" && draft.businessName && draft.method ? "save" : "business";
      setStep(resumeStep);
      setRestoredStep(resumeStep);
      // Only say "we kept what you entered" when they actually entered something.
      setResumed(typed);
    } else if (wanted && !initialTrade) {
      setTradeId(wanted);
      setStep("business");
    }
  }
  const startOver = () => {
    setDraftChecked(true);
    writeDraft(null);
    // Starting over means choosing again, not the trade from the ad.
    try {
      sessionStorage.removeItem(AD_TRADE_KEY);
    } catch {}
    setTradeId(null);
    setBusinessName("");
    setMethod(null);
    setHandle("");
    setServiceName("");
    setServicePrice("");
    setServiceDeposit("");
    setLocalErrors({});
    setResumed(false);
    setRestoredStep(null);
    setStep("trade");
  };

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
    if (step === "business" && !businessSent.current && restoredStep === null) {
      businessSent.current = true;
      trackPixel("StartBusinessStep", { custom: true });
    }
    if (step === "save" && !leadSent.current && restoredStep !== "save") {
      leadSent.current = true;
      trackPixel("Lead");
    }
  }, [step, restoredStep]);
  // A server error on a business field: show it where it can be fixed (once per response).
  const [seenState, setSeenState] = useState(state);
  // Turnstile tokens work once: a fresh widget after every reply gives the next try a new one.
  const [attempt, setAttempt] = useState(0);
  if (state !== seenState) {
    setSeenState(state);
    setAttempt((n) => n + 1);
    setClearedServer([]);
    if (Object.keys(state.errors ?? {}).some((k) => BUSINESS_FIELDS.includes(k))) {
      setStep("business");
    }
  }

  // Keep the draft current (and again after a failed save, which cleared it).
  useEffect(() => {
    // Nothing chosen yet, or the email already had an account (they're signing in instead).
    if (!tradeId || state.existing) return;
    writeDraft({
      at: Date.now(),
      step,
      tradeId,
      businessName,
      method,
      handle,
      serviceName,
      servicePrice,
      serviceDeposit,
    });
  }, [
    step,
    tradeId,
    businessName,
    method,
    handle,
    serviceName,
    servicePrice,
    serviceDeposit,
    attempt,
    state.existing,
  ]);

  const go = (next: Step) => {
    setStep(next);
    window.scrollTo({ top: 0 });
  };

  if (state.existing) {
    return (
      <section className="flex flex-col gap-4 pt-6">
        <h1 className="text-2xl font-bold">
          {state.message ? "Check your email" : "Welcome back"}
        </h1>
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
                  setDraftChecked(true);
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
        {resumed && <ResumedNote onStartOver={startOver} />}
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
      {resumed && <ResumedNote onStartOver={startOver} />}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">Here&apos;s your pay link</h1>
        <p className="text-muted">
          Send it in your DMs. Your client taps it and lands on this page, with your name, prices
          and policy.
        </p>
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

      <form action={action} onSubmit={() => writeDraft(null)} className="flex flex-col gap-4">
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
        {turnstileSiteKey && <Turnstile key={attempt} siteKey={turnstileSiteKey} />}
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

function ResumedNote({ onStartOver }: { onStartOver: () => void }) {
  return (
    <p className="bg-surface border-line flex items-center justify-between gap-3 rounded-xl border px-4 py-2 text-sm">
      <span>Welcome back. We kept what you entered.</span>
      <button
        type="button"
        onClick={onStartOver}
        className="text-brand inline-flex min-h-11 shrink-0 items-center font-medium underline"
      >
        Start over
      </button>
    </p>
  );
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

/**
 * A look-alike of the client's pay page, with the pro's own details, shown on a
 * phone under the DM that delivers it, so it reads as "what my client sees"
 * rather than a form to fill in.
 */
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
  const host = new URL(publicEnv().NEXT_PUBLIC_APP_URL).host;
  return (
    <figure aria-label="Preview of the page your clients see" className="flex flex-col gap-3">
      <p className="bg-pink/15 text-pink inline-flex items-center gap-2 self-start rounded-full px-3 py-1.5 text-sm font-bold">
        <span aria-hidden>👀</span> What your clients see
      </p>

      {/* The DM it arrives in. */}
      <div className="flex flex-col items-end gap-1">
        <p className="bg-pink text-ink max-w-[85%] rounded-3xl rounded-br-md px-4 py-2.5 text-sm">
          Here&apos;s the link to lock in Saturday 👇
          <span className="mt-1 block font-semibold underline">{host}/pay/…</span>
        </p>
        <p className="text-muted pr-2 text-xs">You, in the DMs</p>
      </div>

      {/* Their phone. Not interactive: nothing here can be tapped. */}
      <div
        aria-hidden
        className="bg-surface mx-auto w-full max-w-[350px] rounded-[44px] p-2.5 shadow-2xl ring-1 ring-white/15 select-none"
      >
        <div data-theme="light" className="overflow-hidden rounded-[36px]">
          <div className="bg-background flex items-center justify-between px-6 pt-3 text-[11px] font-semibold">
            <span>9:41</span>
            <span className="bg-ink h-5 w-20 rounded-full" />
            <span>●●●</span>
          </div>
          <div className="bg-background px-3 pt-2 pb-1">
            <p className="bg-surface text-muted border-line rounded-xl border px-3 py-1.5 text-center text-xs">
              🔒 {host}
            </p>
          </div>
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
                    {deposit} · {formatCents(service.priceCents - service.depositCents)} due at the
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
              <span className="bg-brand text-brand-foreground flex size-5 items-center justify-center rounded text-xs">
                ✓
              </span>
              I&apos;ve read and agree to the deposit policy above.
            </p>
            <div className="bg-brand text-brand-foreground flex min-h-12 items-center justify-center rounded-xl px-4 text-center font-semibold">
              {method === "stripe"
                ? `Pay ${deposit} deposit`
                : `Send ${deposit} with ${methodLabel}${handle ? ` to ${handle}` : ""}`}
            </div>
          </div>
        </div>
      </div>
      <figcaption className="text-muted text-center text-xs">
        {example
          ? "Example client, time and price. You set your real prices after you save."
          : "Example client and time. You make a pay link for each booking."}
      </figcaption>
    </figure>
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
