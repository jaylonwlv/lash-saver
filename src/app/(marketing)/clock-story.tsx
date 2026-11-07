import type { CSSProperties } from "react";

const range = (a: number, b: number) => ({ "--a": `${a}%`, "--b": `${b}%` }) as CSSProperties;

/**
 * The 2:00 clock: a no-show that plays as you scroll. The list is the real content
 * and the whole story on its own. Where the browser has scroll-driven animations
 * and motion is welcome, landing.css swaps in the pinned stage, which is decoration
 * and hidden from screen readers. Percentages are the scroll through the section.
 */
export function ClockStory({
  lead,
  excuses,
  deposit,
  business,
}: {
  lead: string;
  excuses: [string, string, string];
  deposit: string;
  business: string;
}) {
  const [first, second, third] = excuses;
  return (
    <section className="clock-run">
      <div className="clock-static">
        <h2 className="text-3xl tracking-tight">{lead}</h2>
        <ol className="mt-5 flex flex-col gap-4">
          {(
            [
              ["1:55 PM", first],
              ["2:20 PM", second],
              ["2:45 PM", third],
            ] as const
          ).map(([time, excuse]) => (
            <li key={time}>
              <p className="text-muted text-sm">{time}</p>
              <p className="clock-bubble">{excuse}</p>
            </li>
          ))}
        </ol>
        <p className="clock-verdict">Empty slot. $0 today.</p>
        <div className="clock-card" data-theme="light">
          <p className="text-muted text-xs">Same client, deposit first · {business}</p>
          <p className="clock-card-title">{deposit} paid. They&apos;re here.</p>
          <p className="stage-stamp clock-card-stamp">Booked</p>
        </div>
      </div>

      <div className="clock-stage" aria-hidden>
        <div className="clock-top">
          <div className="clock-stack clock-head">
            <p className="clock-phase clock-first" style={range(0, 36)}>
              {lead}
            </p>
            <p className="clock-phase" style={range(36, 56)}>
              Still your 2:00.
            </p>
            <p className="clock-phase" style={range(56, 76)}>
              That was your 2:00.
            </p>
            <p className="clock-phase clock-last" style={range(76, 100)}>
              Same client. Deposit first.
            </p>
          </div>
          <div className="clock-dial">
            <svg viewBox="0 0 96 96" width="96" height="96">
              <circle cx="48" cy="48" r="45" fill="#fdf8f6" />
              <line className="clock-hour" x1="48" y1="48" x2="48" y2="26" />
              <line className="clock-minute" x1="48" y1="48" x2="48" y2="14" />
            </svg>
            <div className="clock-stack clock-time">
              <span className="clock-phase clock-first" style={range(0, 18)}>
                1:55
              </span>
              <span className="clock-phase" style={range(18, 36)}>
                2:00
              </span>
              <span className="clock-phase" style={range(36, 56)}>
                2:20
              </span>
              <span className="clock-phase" style={range(56, 76)}>
                2:45
              </span>
              <span className="clock-phase clock-last" style={range(76, 100)}>
                2:00
              </span>
            </div>
          </div>
        </div>

        <div className="clock-stack clock-middle">
          <div className="clock-phase clock-first" style={range(0, 76)}>
            <p className="clock-bubble clock-in" style={range(0, 4)}>
              {first}
            </p>
            <p className="clock-bubble clock-in" style={range(38, 46)}>
              {second}
            </p>
            <p className="clock-bubble clock-in" style={range(58, 66)}>
              {third}
            </p>
          </div>
          <div className="clock-phase clock-last" style={range(76, 100)}>
            <p className="clock-paid">{deposit} deposit paid</p>
            <p className="clock-bubble">here</p>
          </div>
        </div>

        <div className="clock-slot" data-theme="light">
          <p className="text-muted text-xs">Your calendar · Sat 2:00 PM</p>
          <div className="clock-stack clock-slot-title">
            <p className="clock-phase clock-first" style={range(0, 18)}>
              Slot held for them
            </p>
            <p className="clock-phase" style={range(18, 36)}>
              Ready. Nobody here.
            </p>
            <p className="clock-phase" style={range(36, 56)}>
              Still waiting
            </p>
            <p className="clock-phase" style={range(56, 76)}>
              Empty slot. $0 today.
            </p>
            <p className="clock-phase clock-last" style={range(76, 100)}>
              They&apos;re here.
            </p>
          </div>
          <p className="stage-stamp clock-card-stamp clock-stamp" style={range(84, 92)}>
            Booked
          </p>
        </div>
      </div>
    </section>
  );
}
