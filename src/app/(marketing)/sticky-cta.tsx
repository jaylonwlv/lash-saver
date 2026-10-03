"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

/**
 * Phone-only "Start free" bar pinned to the bottom of the screen. It appears
 * once the hero's buttons scroll away and hides again while another
 * "Start free" button is on screen, so there's never two at once.
 */
export function StickyCta({ href, label, note }: { href: string; label: string; note: string }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const targets = [...document.querySelectorAll("[data-cta]")];
    if (!targets.length) return;
    const visible = new Set<Element>();
    const observer = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) visible.add(e.target);
        else visible.delete(e.target);
      }
      const heroGone = document.querySelector("[data-cta='hero']")?.getBoundingClientRect();
      setShow(visible.size === 0 && !!heroGone && heroGone.bottom < 0);
    });
    targets.forEach((t) => observer.observe(t));
    return () => observer.disconnect();
  }, []);

  return (
    <div
      aria-hidden={!show}
      className={`border-line bg-surface/95 fixed inset-x-0 bottom-0 z-20 border-t px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur transition-transform duration-300 md:hidden ${
        show ? "translate-y-0" : "pointer-events-none translate-y-full"
      }`}
    >
      <Link
        href={href}
        tabIndex={show ? 0 : -1}
        className="bg-brand text-brand-foreground flex min-h-12 items-center justify-center rounded-xl px-5 font-semibold"
      >
        {label}
      </Link>
      <p className="text-muted mt-1.5 text-center text-xs">{note}</p>
    </div>
  );
}
