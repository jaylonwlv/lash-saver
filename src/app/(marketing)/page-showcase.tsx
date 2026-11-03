"use client";

import { LookPicker } from "@/app/(tech)/dashboard/look-picker";
import { PAGE_STYLES, type PageStyleId } from "@/lib/page-styles";

/** Every look, the general three first, so visitors see the range. */
const ALL_STYLES = [
  "editorial",
  "bold",
  "clean",
  ...(Object.keys(PAGE_STYLES) as PageStyleId[]).filter(
    (id) => !["editorial", "bold", "clean"].includes(id),
  ),
] as PageStyleId[];

/**
 * The homepage's hook: a sample pro page live in a phone. It glides down on its own
 * (so the reveals play), visitors can scroll it, and every style and color is one tap.
 */
export function PageShowcase({ address }: { address: string }) {
  return (
    <LookPicker
      initialStyle="editorial"
      initialAccent="pink"
      address={address}
      examplePrices={false}
      mode="demo"
      trade={null}
      previewPath="/demo/sample"
      styleIds={ALL_STYLES}
      swipe
    />
  );
}
