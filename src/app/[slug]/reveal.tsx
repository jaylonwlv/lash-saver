"use client";

import { useEffect } from "react";

/**
 * Scroll reveal: anything marked data-reveal fades up the first time it scrolls
 * into view. Without JavaScript (or with reduced motion) everything just shows:
 * the hidden starting state only applies once this has armed the page.
 */
export function RevealOnScroll() {
  useEffect(() => {
    const root = document.documentElement;
    if (!("IntersectionObserver" in window)) return;
    const items = document.querySelectorAll<HTMLElement>("[data-reveal]");
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.setAttribute("data-shown", "");
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
    );
    // Already on screen when the page loads: show at once, no flicker.
    const fold = window.innerHeight;
    for (const item of items) {
      if (item.getBoundingClientRect().top < fold * 0.92) item.setAttribute("data-shown", "");
      else observer.observe(item);
    }
    root.setAttribute("data-reveal-ready", "");

    // The sticky "Message to book" bar waits until the hero (with its own button) is gone.
    const hero = document.querySelector("[data-hero]");
    const heroWatch = new IntersectionObserver(
      ([entry]) => root.toggleAttribute("data-past-hero", !entry.isIntersecting),
      { rootMargin: "-25% 0px 0px 0px" },
    );
    if (hero) heroWatch.observe(hero);
    else root.setAttribute("data-past-hero", "");

    return () => {
      observer.disconnect();
      heroWatch.disconnect();
      root.removeAttribute("data-past-hero");
      root.removeAttribute("data-reveal-ready");
    };
  }, []);
  return null;
}
