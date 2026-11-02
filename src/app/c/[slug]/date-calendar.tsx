"use client";

import { useState } from "react";
import { addDays } from "@/lib/catering/dates";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

/** Month grid; dates outside [first, last] or in `unavailable` can't be picked. */
export function DateCalendar({
  first,
  last,
  unavailable,
  value,
  onChange,
}: {
  first: string;
  last: string;
  unavailable: ReadonlySet<string>;
  value: string;
  onChange: (date: string) => void;
}) {
  const [month, setMonth] = useState((value || first).slice(0, 7));
  const [y, m] = month.split("-").map(Number);
  const startWeekday = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const label = new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, 1)));
  const shift = (delta: number) => {
    const d = new Date(Date.UTC(y, m - 1 + delta, 1));
    setMonth(d.toISOString().slice(0, 7));
  };
  const canPrev = month > first.slice(0, 7);
  const canNext = month < last.slice(0, 7);

  const cells: (string | null)[] = [
    ...Array.from({ length: startWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => addDays(`${month}-01`, i)),
  ];

  return (
    <div className="border-line bg-surface rounded-2xl border p-3">
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => shift(-1)}
          disabled={!canPrev}
          className="min-h-11 min-w-11 rounded-xl text-lg disabled:opacity-30"
          aria-label="Previous month"
        >
          ‹
        </button>
        <p className="font-semibold" aria-live="polite">
          {label}
        </p>
        <button
          type="button"
          onClick={() => shift(1)}
          disabled={!canNext}
          className="min-h-11 min-w-11 rounded-xl text-lg disabled:opacity-30"
          aria-label="Next month"
        >
          ›
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs" role="grid">
        {WEEKDAYS.map((d, i) => (
          <span key={i} className="text-muted py-1 font-medium" aria-hidden>
            {d}
          </span>
        ))}
        {cells.map((date, i) => {
          if (!date) return <span key={`blank-${i}`} />;
          const disabled = date < first || date > last || unavailable.has(date);
          const selected = date === value;
          return (
            <button
              key={date}
              type="button"
              disabled={disabled}
              onClick={() => onChange(date)}
              aria-pressed={selected}
              aria-label={`${date}${unavailable.has(date) ? ", booked" : ""}`}
              className={`min-h-11 rounded-xl text-sm font-medium ${
                selected
                  ? "bg-brand text-white"
                  : disabled
                    ? `text-muted/50 ${unavailable.has(date) && date >= first && date <= last ? "line-through" : ""}`
                    : "active:bg-background hover:bg-background"
              }`}
            >
              {Number(date.slice(8))}
            </button>
          );
        })}
      </div>
    </div>
  );
}
