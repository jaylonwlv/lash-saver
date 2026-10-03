"use client";

import { useState } from "react";
import { formatCents } from "@/lib/money";

/** "What do no-shows cost you?" Two inputs, one big number, compared with the plan price. */
export function NoShowCalculator({ priceCents, appName }: { priceCents: number; appName: string }) {
  const [price, setPrice] = useState(100);
  const [perMonth, setPerMonth] = useState(2);
  const yearly = price * perMonth * 12;
  const planYearly = (priceCents / 100) * 12;
  const dollars = (n: number) => formatCents(n * 100).replace(".00", "");

  return (
    <div className="border-line bg-surface flex flex-col gap-6 rounded-3xl border p-6 shadow-sm">
      <label className="flex flex-col gap-3">
        <span className="flex items-baseline justify-between gap-4">
          <span className="font-medium">Your average appointment</span>
          <span className="text-brand text-xl font-bold">{dollars(price)}</span>
        </span>
        <input
          type="range"
          min={20}
          max={500}
          step={5}
          value={price}
          onChange={(e) => setPrice(Number(e.target.value))}
          className="accent-brand h-12 w-full"
          aria-label="Average appointment price in dollars"
        />
      </label>

      <div className="flex flex-col gap-3">
        <span className="font-medium">No-shows and last-minute cancels a month</span>
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setPerMonth((n) => Math.max(1, n - 1))}
            className="border-line bg-background size-12 rounded-xl border text-2xl font-semibold"
            aria-label="Fewer no-shows"
          >
            −
          </button>
          <span className="text-3xl font-bold tabular-nums" aria-live="polite">
            {perMonth}
          </span>
          <button
            type="button"
            onClick={() => setPerMonth((n) => Math.min(20, n + 1))}
            className="border-line bg-background size-12 rounded-xl border text-2xl font-semibold"
            aria-label="More no-shows"
          >
            +
          </button>
        </div>
      </div>

      <div className="bg-foreground text-background flex flex-col gap-1 rounded-2xl p-5 text-center">
        <span className="text-sm opacity-80">No-shows cost you about</span>
        <span className="text-4xl font-bold tabular-nums" aria-live="polite">
          {dollars(yearly)}
          <span className="text-lg font-medium opacity-80"> a year</span>
        </span>
        <span className="mt-1 text-sm opacity-80">
          {appName} is {dollars(planYearly)} a year.{" "}
          {yearly > planYearly
            ? `Your no-shows cost ${Math.round(yearly / planYearly)}x that.`
            : "Even one saved slot a month covers most of it."}
        </span>
      </div>
    </div>
  );
}
