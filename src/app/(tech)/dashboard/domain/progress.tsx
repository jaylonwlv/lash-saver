"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { DomainProgress } from "@/lib/stripe/domains";
import { refreshDomain } from "./actions";

const REFRESH_MS = 20_000;

/**
 * "Is it done yet?" answered on screen: each step ticks as it happens, refreshing
 * every 20 seconds (which also moves the purchase along). Once the domain really
 * opens, the page reloads into the live view.
 */
export function DomainProgressView({
  initial,
  pageUrl,
}: {
  initial: DomainProgress;
  pageUrl: string | null;
}) {
  const [p, setP] = useState(initial);
  const router = useRouter();

  useEffect(() => {
    // Live, or it failed (refunded) or ended: the page shows that state instead.
    if (p.live || p.status === "failed" || p.status === "cancelled") {
      router.refresh();
      return;
    }
    const timer = setTimeout(async () => {
      const next = await refreshDomain().catch(() => null);
      // Back from Checkout, the row stays "pending" until Stripe's webhook lands:
      // don't untick "Payment received" in the meantime.
      if (next) setP((prev) => ({ ...next, paid: next.paid || prev.paid }));
      else setP((prev) => ({ ...prev })); // keep polling after a hiccup
    }, REFRESH_MS);
    return () => clearTimeout(timer);
  }, [p, router]);

  const steps = [
    { label: "Payment received", done: p.paid },
    { label: `${p.domain} is registered to you`, done: p.registered },
    {
      label: "Connecting it to the internet",
      note: "Usually 10 to 60 minutes while the new address spreads",
      done: p.connected && p.live,
      active: p.registered,
    },
    { label: "Live", done: p.live },
  ];
  const current = steps.findIndex((s) => !s.done);

  return (
    <section className="card flex flex-col gap-4 p-5" aria-live="polite">
      <div>
        <p className="font-bold">Setting up {p.domain}</p>
        <p className="text-muted text-sm">
          You can leave this page. We&apos;ll email you the moment it opens.
        </p>
      </div>
      <ol className="flex flex-col gap-3">
        {steps.map((s, i) => (
          <li key={s.label} className="flex gap-3">
            <span
              aria-hidden
              className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                s.done
                  ? "bg-success text-white"
                  : i === current
                    ? "border-brand text-brand border-2 motion-safe:animate-pulse"
                    : "border-line text-muted border-2"
              }`}
            >
              {s.done ? "✓" : i + 1}
            </span>
            <span className="flex flex-col">
              <span className={s.done || i === current ? "font-semibold" : "text-muted"}>
                {s.label}
              </span>
              {s.note && i === current && <span className="text-muted text-xs">{s.note}</span>}
            </span>
          </li>
        ))}
      </ol>
      {pageUrl && (
        <p className="bg-brand-soft/60 rounded-2xl px-4 py-3 text-sm">
          Your <strong>{pageUrl}</strong> link keeps working the whole time.
        </p>
      )}
    </section>
  );
}
