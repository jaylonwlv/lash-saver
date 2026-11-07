"use client";

import { useEffect } from "react";
import { trackPixel } from "@/components/meta-pixel";

/** Counts finishing the hero's sample pay link. The page works without this. */
export function HeroPlayEvents() {
  useEffect(() => {
    const pay = document.getElementById("play-pay");
    const agree = document.getElementById("play-agree");
    if (!(pay instanceof HTMLInputElement) || !(agree instanceof HTMLInputElement)) return;
    const onChange = () => {
      if (!pay.checked || !agree.checked) return;
      trackPixel("HeroPayLinkTried", { custom: true });
      window.clarity?.("event", "hero_pay_link_tried");
    };
    pay.addEventListener("change", onChange);
    return () => pay.removeEventListener("change", onChange);
  }, []);
  return null;
}
