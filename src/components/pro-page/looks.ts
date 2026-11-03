import type { PageStyleId } from "@/lib/page-styles";
import { anton, cinzel, delaGothic, metalMania, michroma, pirata, saira, serif } from "./fonts";

/** How each page style sets type. `em` is the emphasized word ("waiting."). */
export type Look = {
  display: string;
  hero: string;
  heroLastLine: string;
  h2: string;
  em: string;
  emDark: string;
  item: string;
  price: string;
  stat: string;
  step: string;
  marquee: string;
  closing: string;
};

export const LOOKS: Record<PageStyleId, Look> = {
  editorial: {
    display: serif.className,
    hero: "text-[clamp(3.6rem,17vw,7rem)] leading-[0.92] tracking-[-0.02em]",
    heroLastLine: "italic",
    h2: "text-5xl leading-[1.02]",
    em: "italic text-brand",
    emDark: "italic text-pink",
    item: "text-[1.9rem] leading-[1.05]",
    price: "text-[1.9rem] leading-none",
    stat: "text-5xl leading-none",
    step: "text-6xl leading-[0.8] italic",
    marquee: "text-3xl italic",
    closing: "text-[clamp(3rem,14vw,5.5rem)] leading-[0.95]",
  },
  bold: {
    display: `${anton.className} uppercase`,
    hero: "text-[clamp(4rem,21vw,8.5rem)] leading-[0.86] tracking-[0.005em]",
    heroLastLine: "text-pink",
    h2: "text-[2.9rem] leading-[0.95]",
    em: "text-brand",
    emDark: "text-pink",
    item: "text-[1.7rem] leading-[1] tracking-[0.01em]",
    price: "text-[1.9rem] leading-none",
    stat: "text-[3.2rem] leading-none",
    step: "text-6xl leading-[0.8]",
    marquee: "text-3xl tracking-[0.02em]",
    closing: "text-[clamp(3.2rem,16vw,6rem)] leading-[0.9]",
  },
  clean: {
    display: "font-sans font-semibold tracking-[-0.045em]",
    hero: "text-[clamp(3.2rem,15vw,6.5rem)] leading-[0.95]",
    heroLastLine: "font-light text-white/80",
    h2: "text-[2.6rem] leading-[1.02]",
    em: "font-light text-brand",
    emDark: "font-light text-pink",
    item: "text-2xl leading-[1.1]",
    price: "text-2xl leading-none",
    stat: "text-[2.75rem] leading-none",
    step: "text-5xl leading-[0.8] font-light",
    marquee: "text-2xl",
    closing: "text-[clamp(2.8rem,13vw,5rem)] leading-[0.98]",
  },
  metal: {
    display: metalMania.className,
    hero: "text-[clamp(3.8rem,18vw,7.5rem)] leading-[0.9] tracking-[0.01em]",
    heroLastLine: "text-pink",
    h2: "text-5xl leading-[1]",
    em: "text-brand",
    emDark: "text-pink",
    item: "text-[1.9rem] leading-[1.05]",
    price: "text-[1.9rem] leading-none",
    stat: "text-5xl leading-none",
    step: "text-6xl leading-[0.8]",
    marquee: "text-3xl",
    closing: "text-[clamp(3.2rem,15vw,5.8rem)] leading-[0.95]",
  },
  anime: {
    display: delaGothic.className,
    hero: "text-[clamp(3rem,14vw,6rem)] leading-[1] tracking-[-0.02em]",
    heroLastLine: "text-pink",
    h2: "text-[2.4rem] leading-[1.05]",
    em: "text-brand",
    emDark: "text-pink",
    item: "text-[1.45rem] leading-[1.15]",
    price: "text-[1.6rem] leading-none",
    stat: "text-[2.6rem] leading-none",
    step: "text-5xl leading-[0.85]",
    marquee: "text-2xl",
    closing: "text-[clamp(2.6rem,12vw,5rem)] leading-[1]",
  },
  flash: {
    display: pirata.className,
    hero: "text-[clamp(3.8rem,18vw,7.5rem)] leading-[0.9]",
    heroLastLine: "text-pink",
    h2: "text-[3.2rem] leading-[1]",
    em: "text-brand",
    emDark: "text-pink",
    item: "text-[2rem] leading-[1.05]",
    price: "text-[2rem] leading-none",
    stat: "text-[3.2rem] leading-none",
    step: "text-6xl leading-[0.8]",
    marquee: "text-3xl",
    closing: "text-[clamp(3.2rem,15vw,5.8rem)] leading-[0.95]",
  },
  luxury: {
    display: `${cinzel.className} uppercase tracking-[0.06em]`,
    hero: "text-[clamp(2.5rem,11.5vw,5.2rem)] leading-[1.02]",
    heroLastLine: "text-pink",
    h2: "text-[2.1rem] leading-[1.1]",
    em: "text-brand",
    emDark: "text-pink",
    item: "text-[1.3rem] leading-[1.2]",
    price: "text-[1.4rem] leading-none",
    stat: "text-[2.3rem] leading-none",
    step: "text-5xl leading-[0.85]",
    marquee: "text-xl",
    closing: "text-[clamp(2.3rem,10.5vw,4.6rem)] leading-[1.05]",
  },
  performance: {
    display: `${michroma.className} uppercase`,
    hero: "text-[clamp(2.1rem,9.5vw,4.4rem)] leading-[1.08] tracking-[0.01em]",
    heroLastLine: "text-pink",
    h2: "text-[1.8rem] leading-[1.15]",
    em: "text-brand",
    emDark: "text-pink",
    item: "text-[1.05rem] leading-[1.3] tracking-[0.02em]",
    price: "text-[1.2rem] leading-none",
    stat: "text-[2rem] leading-none",
    step: "text-4xl leading-[0.9]",
    marquee: "text-lg tracking-[0.04em]",
    closing: "text-[clamp(1.9rem,8.5vw,3.8rem)] leading-[1.1]",
  },
  professional: {
    display: `${saira.className} uppercase tracking-[-0.01em]`,
    hero: "text-[clamp(3.2rem,15vw,6.4rem)] leading-[0.9]",
    heroLastLine: "text-pink",
    h2: "text-[2.6rem] leading-[1]",
    em: "text-brand",
    emDark: "text-pink",
    item: "text-[1.6rem] leading-[1.05]",
    price: "text-[1.7rem] leading-none",
    stat: "text-[2.9rem] leading-none",
    step: "text-5xl leading-[0.85]",
    marquee: "text-2xl",
    closing: "text-[clamp(2.9rem,13vw,5.4rem)] leading-[0.95]",
  },
};
