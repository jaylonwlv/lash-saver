"use client";

import { type ReactNode, useEffect, useRef, useState, useTransition } from "react";
import { LOOKS } from "@/components/pro-page/looks";
import { ACCENTS, ACCENT_IDS } from "@/lib/accents";
import { PAGE_STYLES, stylesForTrade, type PageStyleId } from "@/lib/page-styles";
import { savePageLook } from "./look-actions";

/** The width the preview lays the page out at: a typical phone. */
const PHONE_WIDTH = 390;

/**
 * The pro's real page, live in a phone, with its style and color one tap away.
 * It scrolls itself (so the reveals play) until they touch it, then it's theirs
 * to scroll. Each change reloads it, so the entrance plays again. In the tour
 * it saves as they tap; on Profile it posts with the form.
 */
export function LookPicker({
  initialStyle,
  initialAccent,
  address,
  examplePrices,
  mode,
  trade,
  compact = false,
}: {
  initialStyle: string;
  initialAccent: string;
  /** "getdibs.pro/studio-nova", shown in the phone's address bar. */
  address: string | null;
  examplePrices: boolean;
  mode: "instant" | "form";
  /** The pro's trade: some get fonts from their own world, shown first. */
  trade: string | null;
  /** The tour: a shorter phone and one swipeable row each for styles and colors. */
  compact?: boolean;
}) {
  const styles = stylesForTrade(trade);
  const [style, setStyle] = useState(initialStyle);
  const [accent, setAccent] = useState(initialAccent);
  const [replay, setReplay] = useState(0);
  const [touched, setTouched] = useState(false);
  const [saved, setSaved] = useState<"idle" | "saved" | "failed">("idle");
  const [, startSaving] = useTransition();
  const frame = useRef<HTMLIFrameElement>(null);
  const screen = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  const [screenHeight, setScreenHeight] = useState(0);

  // Track the screen's size so the page inside always renders at phone width, scaled.
  useEffect(() => {
    const el = screen.current;
    if (!el) return;
    const measure = () => {
      const { width, height } = el.getBoundingClientRect();
      setScale(width / PHONE_WIDTH);
      setScreenHeight(height);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const raf = useRef(0);

  // Tour: save once they stop tapping, so quick taps can't land out of order. A look
  // still waiting when the card closes (Next, Skip) is saved right away.
  const pendingLook = useRef<{ page_style: string; accent_color: string } | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  function flushSave() {
    clearTimeout(saveTimer.current);
    const look = pendingLook.current;
    pendingLook.current = null;
    if (!look) return;
    startSaving(async () => {
      const { ok } = await savePageLook(look);
      setSaved(ok ? "saved" : "failed");
    });
  }

  useEffect(
    () => () => {
      cancelAnimationFrame(raf.current);
      clearTimeout(saveTimer.current);
      // Unmounting: send what's waiting without touching state.
      if (pendingLook.current) void savePageLook(pendingLook.current);
    },
    [],
  );

  // The iframe can finish loading before React attaches onLoad (first paint): catch up.
  useEffect(() => {
    const doc = frame.current?.contentDocument;
    if (doc && doc.readyState === "complete" && doc.location.href !== "about:blank") onLoad();
  }, []);

  function choose(next: { style?: string; accent?: string }) {
    const look = { page_style: next.style ?? style, accent_color: next.accent ?? accent };
    if (next.style) setStyle(next.style);
    if (next.accent) setAccent(next.accent);
    setTouched(false);
    if (mode === "instant") {
      pendingLook.current = look;
      clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(flushSave, 600);
    }
  }

  // Once the page loads: let the hero play, then glide down until they take over.
  function onLoad() {
    cancelAnimationFrame(raf.current);
    const win = frame.current?.contentWindow;
    const doc = frame.current?.contentDocument;
    if (!win || !doc || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let stopped = false;
    const stop = () => {
      stopped = true;
      cancelAnimationFrame(raf.current);
      setTouched(true);
    };
    for (const type of ["wheel", "touchstart", "pointerdown", "keydown"]) {
      doc.addEventListener(type, stop, { passive: true, once: true });
    }
    const begin = performance.now() + 1600;
    let y = 0;
    let last = 0;
    const step = (now: number) => {
      if (stopped) return;
      if (now >= begin) {
        y += ((last ? now - last : 16) * 150) / 1000; // 150px a second
        last = now;
        const end = doc.documentElement.scrollHeight - win.innerHeight;
        win.scrollTo(0, Math.min(y, end));
        if (y >= end) return;
      }
      raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
  }

  const src = `/dashboard/preview?style=${style}&accent=${accent}`;

  return (
    <div className={compact ? "flex h-full min-h-0 flex-col gap-2" : "flex flex-col gap-4"}>
      {mode === "form" && (
        <>
          <input type="hidden" name="page_style" value={style} />
          <input type="hidden" name="accent_color" value={accent} />
        </>
      )}

      {/* The phone */}
      {/* In the tour it takes all the height the card has left, at a phone's proportions. */}
      <div
        className={
          compact
            ? "relative flex min-h-0 w-full flex-1 justify-center"
            : "relative mx-auto w-full max-w-[290px]"
        }
      >
        <div
          className={`bg-ink rounded-[40px] p-2 shadow-[0_24px_60px_-20px_rgb(0_0_0/0.55)] ring-1 ring-black/10 ${
            compact ? "aspect-[9/18] h-full max-w-full" : ""
          }`}
        >
          <div
            className={`relative overflow-hidden rounded-[32px] bg-[#0d0b0c] ${compact ? "flex h-full flex-col" : ""}`}
          >
            <div className="flex shrink-0 justify-center bg-[#0d0b0c] px-3 pt-2.5 pb-2">
              <span className="max-w-full truncate rounded-full bg-white/10 px-3 py-1 text-[10px] font-medium text-white/85">
                🔒 {address ?? "getdibs.pro"}
              </span>
            </div>
            {/* The page is laid out at a real phone's width, then scaled down to fit. */}
            <div
              ref={screen}
              className={`relative w-full overflow-hidden ${compact ? "min-h-0 flex-1" : "h-[min(500px,56svh)]"}`}
            >
              <iframe
                key={`${src}#${replay}`}
                ref={frame}
                src={src}
                onLoad={onLoad}
                title="Your page, live"
                className="absolute top-0 left-0 block origin-top-left border-0"
                style={{
                  width: PHONE_WIDTH,
                  height: scale ? screenHeight / scale : "100%",
                  transform: `scale(${scale || 1})`,
                  visibility: scale ? "visible" : "hidden",
                }}
              />
            </div>
            {compact && (
              <button
                type="button"
                onClick={() => {
                  setTouched(false);
                  setReplay((n) => n + 1);
                }}
                aria-label="Replay"
                className="absolute top-12 right-2 z-10 flex size-9 items-center justify-center rounded-full bg-black/60 text-base text-white backdrop-blur"
              >
                ↻
              </button>
            )}
            {!touched && (
              <span className="nudge pointer-events-none absolute inset-x-0 bottom-4 z-10 mx-auto w-max rounded-full bg-black/70 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur">
                👆 Scroll it yourself
              </span>
            )}
          </div>
        </div>
      </div>
      {!compact && (
        <div className="flex items-center justify-center gap-3">
          {examplePrices && (
            <p className="text-muted text-xs">Example prices until you set your own.</p>
          )}
          <button
            type="button"
            onClick={() => {
              setTouched(false);
              setReplay((n) => n + 1);
            }}
            className="text-brand min-h-11 shrink-0 px-2 text-sm font-semibold"
          >
            ↻ Replay
          </button>
        </div>
      )}

      {/* Style: their trade's own fonts first, when it has some, then the general three. */}
      {compact ? (
        <SwipeRow label="Page style">
          {[...styles.trade, ...styles.general].map((id) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={style === id}
              onClick={() => choose({ style: id })}
              className={`press flex min-h-11 shrink-0 snap-start items-center gap-1.5 rounded-full border-2 px-3 ${
                style === id ? "border-foreground bg-surface" : "bg-surface/70 border-transparent"
              }`}
            >
              <span className={`${LOOKS[id].display} text-base leading-none`}>
                {id === "editorial" ? <span className="italic">Aa</span> : "Aa"}
              </span>
              <span className="text-[13px] font-bold whitespace-nowrap">
                {PAGE_STYLES[id].label}
              </span>
            </button>
          ))}
        </SwipeRow>
      ) : (
        <>
          {styles.trade.length > 0 && (
            <StyleRow
              label="Made for your trade"
              ids={styles.trade}
              value={style}
              onPick={(id) => choose({ style: id })}
            />
          )}
          <StyleRow
            label={styles.trade.length > 0 ? "Classic" : undefined}
            ids={styles.general}
            value={style}
            onPick={(id) => choose({ style: id })}
          />
        </>
      )}

      {/* Color */}
      <div
        role="radiogroup"
        aria-label="Color"
        className={
          compact
            ? "-mx-6 flex snap-x scroll-px-6 overflow-x-auto px-5 py-1"
            : "flex flex-wrap justify-center gap-2"
        }
      >
        {ACCENT_IDS.map((id) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={accent === id}
            aria-label={ACCENTS[id].label}
            title={ACCENTS[id].label}
            onClick={() => choose({ accent: id })}
            className={`press flex size-11 shrink-0 snap-start items-center justify-center rounded-full ${
              accent === id
                ? "ring-foreground ring-2 ring-offset-2 ring-offset-[var(--background)]"
                : ""
            }`}
          >
            <span
              className={`flex overflow-hidden rounded-full ring-1 ring-black/10 ${compact ? "size-7" : "size-9"}`}
            >
              <span className="w-1/2" style={{ background: ACCENTS[id].brand }} />
              <span className="w-1/2" style={{ background: ACCENTS[id].bright }} />
            </span>
          </button>
        ))}
      </div>
      {mode === "instant" && saved !== "idle" && (
        <p
          aria-live="polite"
          className={`text-center text-xs ${saved === "failed" ? "text-danger" : "text-muted"}`}
        >
          {saved === "saved"
            ? "Saved. Change it anytime in Profile."
            : "Couldn't save that. Try again in Profile."}
        </p>
      )}
    </div>
  );
}

function StyleRow({
  label,
  ids,
  value,
  onPick,
}: {
  label?: string;
  ids: PageStyleId[];
  value: string;
  onPick: (id: PageStyleId) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      {label && <p className="text-muted text-xs font-bold tracking-[0.12em] uppercase">{label}</p>}
      <div role="radiogroup" aria-label={label ?? "Page style"} className="grid grid-cols-3 gap-2">
        {ids.map((id) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={value === id}
            onClick={() => onPick(id)}
            className={`press flex min-h-20 flex-col items-center justify-center gap-0.5 rounded-2xl border-2 p-2 ${
              value === id ? "border-foreground bg-surface" : "bg-surface/60 border-transparent"
            }`}
          >
            <span className={`${LOOKS[id].display} text-[26px] leading-none`}>
              {id === "editorial" ? <span className="italic">Aa</span> : "Aa"}
            </span>
            <span className="text-center text-xs font-bold">{PAGE_STYLES[id].label}</span>
            <span className="text-muted text-center text-[10px] leading-tight">
              {PAGE_STYLES[id].note}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

/** One horizontally swipeable row of choices (the tour's compact picker). */
function SwipeRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="-mx-6 flex snap-x scroll-px-6 gap-2 overflow-x-auto px-6 pb-1"
    >
      {children}
    </div>
  );
}
