"use client";

import { useActionState, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { EVENT_TYPES, hoursLabel } from "@/lib/catering/bookings";
import {
  balanceDueDate,
  formatEventDate,
  minutesBetween,
  payInFullNow,
} from "@/lib/catering/dates";
import {
  calculateQuote,
  guestCountProblem,
  maxEventMinutes,
  priceLabel,
  quoteErrorMessage,
  type QuoteAddOn,
  type QuotePackage,
  type QuoteRules,
} from "@/lib/catering/quote";
import type { FormState } from "@/lib/forms";
import { formatCents } from "@/lib/money";
import { requestBooking } from "./actions";
import { DateCalendar } from "./date-calendar";

export type QuotePackageView = QuotePackage & {
  description: string | null;
  items_text: string | null;
};

// Half-hour start times, 7 AM to 10:30 PM.
const TIMES = Array.from({ length: 32 }, (_, i) => {
  const minutes = 7 * 60 + i * 30;
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
});
const clock = (t: string) => {
  const h = Number(t.slice(0, 2));
  return `${h % 12 || 12}:${t.slice(3)} ${h < 12 ? "AM" : "PM"}`;
};
const plusMinutes = (t: string, add: number) => {
  const total = Math.min(Number(t.slice(0, 2)) * 60 + Number(t.slice(3)) + add, 23 * 60 + 59);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
};

export function QuoteForm({
  slug,
  businessName,
  packages,
  addOns,
  rules,
  first,
  last,
  today,
  unavailable,
  balanceDueDaysBefore,
  policyText,
  canBook,
  notice,
}: {
  slug: string;
  businessName: string;
  packages: QuotePackageView[];
  addOns: QuoteAddOn[];
  rules: QuoteRules;
  first: string;
  last: string;
  today: string;
  unavailable: string[];
  balanceDueDaysBefore: number;
  policyText: string | null;
  canBook: boolean;
  /** Why booking is off (preview, not taking bookings), shown at the button. */
  notice: string | null;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(requestBooking, {});
  const v = state.values ?? {};
  const e = state.errors ?? {};
  const unavailableSet = useMemo(() => new Set(unavailable), [unavailable]);

  const [date, setDate] = useState(v.event_date ?? "");
  const [guests, setGuests] = useState(
    Number(v.guest_count) || Math.max(packages[0]?.min_guests ?? 1, 50),
  );
  const [packageId, setPackageId] = useState(v.package_id ?? packages[0]?.id ?? "");
  const [addOnIds, setAddOnIds] = useState<string[]>(
    v.add_on_ids ? v.add_on_ids.split(",").filter(Boolean) : [],
  );
  const pkg = packages.find((p) => p.id === packageId) ?? null;
  const [start, setStart] = useState(v.start_time ?? "17:00");
  const [end, setEnd] = useState(v.end_time ?? plusMinutes("17:00", pkg?.included_minutes ?? 120));

  const choosePackage = (id: string) => {
    setPackageId(id);
    const next = packages.find((p) => p.id === id);
    if (next) setEnd(plusMinutes(start, next.included_minutes));
  };
  const chooseStart = (t: string) => {
    const length = Math.max(minutesBetween(start, end), pkg?.included_minutes ?? 120);
    setStart(t);
    setEnd(plusMinutes(t, length));
  };

  const endOptions = pkg
    ? Array.from({ length: Math.floor(maxEventMinutes(pkg, rules) / 30) }, (_, i) =>
        plusMinutes(start, (i + 1) * 30),
      ).filter((t, i, all) => t > start && all.indexOf(t) === i)
    : [];

  const payInFull = date ? payInFullNow(date, today, balanceDueDaysBefore) : false;
  const selectedAddOns = addOns.filter((a) => addOnIds.includes(a.id));
  const result = pkg
    ? calculateQuote({
        pkg,
        addOns: selectedAddOns,
        guestCount: guests,
        eventMinutes: minutesBetween(start, end),
        rules,
        payInFull,
      })
    : null;
  const quote = result?.ok ? result.quote : null;
  const dueDate = date && !payInFull ? balanceDueDate(date, balanceDueDaysBefore) : null;

  return (
    <form action={action} className="flex flex-col gap-8">
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="event_date" value={date} />
      <input type="hidden" name="guest_count" value={guests} />
      <input type="hidden" name="package_id" value={packageId} />
      <input type="hidden" name="add_on_ids" value={addOnIds.join(",")} />
      <input type="hidden" name="shown_total" value={quote?.totalCents ?? 0} />
      <input type="hidden" name="shown_deposit" value={quote?.depositCents ?? 0} />
      <div aria-hidden className="absolute -left-[9999px]">
        <input type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-bold">1. Pick your date</h2>
        <DateCalendar
          first={first}
          last={last}
          unavailable={unavailableSet}
          value={date}
          onChange={setDate}
        />
        <p className={`text-sm ${e.event_date ? "text-danger" : "text-muted"}`}>
          {e.event_date ?? (date ? formatEventDate(date) : "Crossed-out dates are booked.")}
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Select
            id="start_time"
            label="Start"
            value={start}
            onChange={(ev) => chooseStart(ev.target.value)}
            error={e.start_time}
          >
            {TIMES.map((t) => (
              <option key={t} value={t}>
                {clock(t)}
              </option>
            ))}
          </Select>
          <Select
            id="end_time"
            label="End"
            value={end}
            onChange={(ev) => setEnd(ev.target.value)}
            error={e.end_time}
          >
            {endOptions.map((t) => (
              <option key={t} value={t}>
                {clock(t)}
              </option>
            ))}
            {!endOptions.includes(end) && <option value={end}>{clock(end)}</option>}
          </Select>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-bold">2. How many guests?</h2>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setGuests((g) => Math.max(1, g - 10))}
            className="border-line bg-surface min-h-12 min-w-12 rounded-xl border text-xl font-semibold"
            aria-label="10 fewer guests"
          >
            −
          </button>
          <input
            id="guests"
            aria-label="Guests"
            inputMode="numeric"
            value={guests}
            onChange={(ev) =>
              setGuests(Math.min(5000, Number(ev.target.value.replace(/\D/g, "")) || 0))
            }
            className="border-line bg-surface focus:border-brand min-h-12 w-full rounded-xl border px-4 text-center text-xl font-bold outline-none"
          />
          <button
            type="button"
            onClick={() => setGuests((g) => Math.min(5000, g + 10))}
            className="border-line bg-surface min-h-12 min-w-12 rounded-xl border text-xl font-semibold"
            aria-label="10 more guests"
          >
            +
          </button>
        </div>
        {e.guest_count && <p className="text-danger text-sm">{e.guest_count}</p>}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-bold">3. Choose a package</h2>
        <div className="flex flex-col gap-3" role="radiogroup" aria-label="Package">
          {packages.map((p) => {
            const problem = guestCountProblem(p, guests);
            const selected = p.id === packageId;
            return (
              <button
                key={p.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => choosePackage(p.id)}
                className={`flex flex-col gap-1 rounded-2xl border-2 p-4 text-left ${selected ? "border-brand bg-brand/5" : "border-line bg-surface"} ${problem ? "opacity-60" : ""}`}
              >
                <span className="flex items-start justify-between gap-3">
                  <span className="font-semibold">{p.name}</span>
                  <span className="shrink-0 font-semibold">
                    {priceLabel(p.pricing_type, p.price_cents)}
                  </span>
                </span>
                <span className="text-muted text-sm">
                  {hoursLabel(p.included_minutes)} · {p.min_guests}
                  {p.max_guests ? `–${p.max_guests}` : "+"} guests
                </span>
                {p.items_text && (
                  <ul className="text-muted mt-1 list-disc pl-5 text-sm">
                    {p.items_text
                      .split("\n")
                      .filter(Boolean)
                      .map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                  </ul>
                )}
                {p.description && <span className="text-muted text-sm">{p.description}</span>}
                {problem && (
                  <span className="text-danger text-sm font-medium">
                    {quoteErrorMessage(problem)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {addOns.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-bold">4. Add-ons</h2>
          {addOns.map((a) => (
            <label
              key={a.id}
              className="border-line bg-surface flex min-h-12 items-center gap-3 rounded-2xl border p-4"
            >
              <input
                type="checkbox"
                className="accent-brand size-5"
                checked={addOnIds.includes(a.id)}
                onChange={(ev) =>
                  setAddOnIds((ids) =>
                    ev.target.checked ? [...ids, a.id] : ids.filter((id) => id !== a.id),
                  )
                }
              />
              <span className="flex-1 font-medium">{a.name}</span>
              <span className="text-muted text-sm">
                {priceLabel(a.pricing_type, a.price_cents)}
              </span>
            </label>
          ))}
        </section>
      )}

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-bold">{addOns.length > 0 ? "5" : "4"}. Your event</h2>
        <Select
          id="event_type"
          label="Kind of event"
          defaultValue={v.event_type ?? ""}
          error={e.event_type}
          required
        >
          <option value="" disabled>
            Pick one
          </option>
          {EVENT_TYPES.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </Select>
        <Input
          id="event_address"
          label="Event address"
          defaultValue={v.event_address}
          error={e.event_address}
          autoComplete="street-address"
          required
        />
        <Textarea
          id="event_notes"
          label="Anything we should know? (optional)"
          defaultValue={v.event_notes}
          error={e.event_notes}
          placeholder="Parking, power, dietary needs…"
        />
        <Input
          id="host_name"
          label="Your name"
          defaultValue={v.host_name}
          error={e.host_name}
          autoComplete="name"
          required
        />
        <Input
          id="host_email"
          type="email"
          label="Email"
          defaultValue={v.host_email}
          error={e.host_email}
          autoComplete="email"
          hint="Your confirmation and receipt go here."
          required
        />
        <Input
          id="host_phone"
          type="tel"
          label="Phone (optional)"
          defaultValue={v.host_phone}
          error={e.host_phone}
          autoComplete="tel"
        />
      </section>

      <section
        className="border-line bg-surface flex flex-col gap-3 rounded-2xl border p-4"
        aria-live="polite"
      >
        <h2 className="font-bold">Your quote</h2>
        {!pkg ? (
          <p className="text-muted text-sm">Pick a package to see your price.</p>
        ) : !quote ? (
          <p className="text-danger text-sm">
            {result && !result.ok ? quoteErrorMessage(result.error) : ""}
          </p>
        ) : (
          <>
            <ul className="flex flex-col gap-1 text-sm">
              {quote.lines.map((l, i) => (
                <li key={i} className="flex justify-between gap-3">
                  <span className="text-muted">{l.label}</span>
                  <span>{formatCents(l.cents)}</span>
                </li>
              ))}
            </ul>
            <p className="border-line flex justify-between border-t pt-2 font-bold">
              <span>Total</span>
              <span>{formatCents(quote.totalCents)}</span>
            </p>
            <p className="flex justify-between text-sm font-semibold">
              <span>Due today{quote.payInFull ? " (paid in full)" : ": deposit"}</span>
              <span>{formatCents(quote.depositCents)}</span>
            </p>
            {quote.balanceCents > 0 && (
              <p className="text-muted flex justify-between text-sm">
                <span>{dueDate ? `Due ${formatEventDate(dueDate)}` : "Balance"}</span>
                <span>{formatCents(quote.balanceCents)}</span>
              </p>
            )}
            {quote.payInFull && date && (
              <p className="text-muted text-sm">
                Your event is within {balanceDueDaysBefore} days, so the full amount is due now.
              </p>
            )}
          </>
        )}
      </section>

      {policyText && (
        <section className="flex flex-col gap-2">
          <h2 className="font-bold">{businessName}&apos;s policy</h2>
          <p className="text-muted text-sm whitespace-pre-line">{policyText}</p>
        </section>
      )}
      <label className="flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          name="terms"
          className="accent-brand mt-0.5 size-5 shrink-0"
          defaultChecked={v.terms === "on"}
          required
        />
        <span>
          I agree to {businessName}&apos;s policy{policyText ? " above" : ""}.
          {e.terms && <span className="text-danger block">{e.terms}</span>}
        </span>
      </label>

      <div className="bg-background/95 sticky bottom-0 -mx-5 flex flex-col gap-2 px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur">
        {state.message && <p className="text-danger text-sm">{state.message}</p>}
        {notice && <p className="text-muted text-sm">{notice}</p>}
        <Button type="submit" disabled={pending || !canBook || !quote || !date}>
          {pending
            ? "One sec…"
            : !date
              ? "Pick a date to continue"
              : quote
                ? `Pay ${formatCents(quote.depositCents)} to hold ${formatEventDate(date).replace(/, \d{4}$/, "")}`
                : "Check your choices"}
        </Button>
      </div>
    </form>
  );
}
