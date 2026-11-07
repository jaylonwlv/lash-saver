import Link from "next/link";
import { HeroPlayEvents } from "./hero-play-events";

/**
 * The hero's sample pay link: the excuses, then a link a visitor can actually try.
 * Built from real checkboxes and :has() in landing.css, so it works before any
 * JavaScript loads, and reads as a clear picture without a tap. Runs the card route,
 * the only one where "Booked" is instant, and says so. Nothing is charged or saved.
 */
export function HeroStage({
  business,
  deposit,
  flake,
}: {
  business: string;
  deposit: string;
  flake: [string, string];
}) {
  return (
    <div className="stage">
      <HeroPlayEvents />
      <div className="stage-dm">
        <p
          className="stage-bubble stage-bubble-big"
          style={{ "--d": "150ms" } as React.CSSProperties}
        >
          {flake[0]}
        </p>
        <p className="stage-bubble" style={{ "--d": "800ms" } as React.CSSProperties}>
          {flake[1]}
        </p>
        <label className="stage-link press" style={{ "--d": "1500ms" } as React.CSSProperties}>
          <input id="play-open" type="checkbox" className="sr-only" />
          <span className="stage-link-title">Pay {deposit} to hold your spot</span>
          <span className="stage-link-note">Tap to try it. Nothing is charged.</span>
        </label>
      </div>
      <div className="stage-ticket" data-theme="light">
        <p className="text-muted text-xs">{business} · sample pay link</p>
        <p className="stage-ticket-time">Sat 2:00 PM</p>
        <p className="text-sm">
          <strong>{deposit} deposit</strong> · Refund until Thu 2:00 PM
        </p>
        <div className="stage-try">
          <label className="stage-agree">
            <input id="play-agree" type="checkbox" className="size-5 accent-[var(--brand)]" />
            <span>I agree to the deposit policy</span>
          </label>
          <label className="stage-pay press">
            <input id="play-pay" type="checkbox" className="sr-only" />
            Pay {deposit} deposit
          </label>
        </div>
        <div className="stage-done">
          <p className="stage-stamp">Booked</p>
          <p className="text-muted text-xs">
            Nothing was charged. With Cash App, Zelle or Venmo, you tap Received first.
          </p>
          <Link href="/demo" className="text-brand inline-flex min-h-11 items-center font-semibold">
            See the full demo
          </Link>
        </div>
      </div>
    </div>
  );
}
