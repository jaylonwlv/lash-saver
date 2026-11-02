"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Re-checks the page every few seconds (up to a minute) while a payment is confirming. */
export function AutoRefresh() {
  const router = useRouter();
  useEffect(() => {
    let tries = 0;
    const id = setInterval(() => {
      tries += 1;
      if (tries > 20) clearInterval(id);
      else router.refresh();
    }, 3000);
    return () => clearInterval(id);
  }, [router]);
  return null;
}
