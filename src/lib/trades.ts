import type { TradeId } from "@/lib/supabase/database.types";

/*
 * Kinds of pro, picked once in setup. Each comes with a starter menu at typical
 * US prices so a new pro can send a pay link in a minute; they are examples to
 * edit, and the app labels them that way until the pro saves each one. Trade
 * names appear only in the pro's own setup, never on client pages.
 */

export type StarterService = {
  name: string;
  durationMinutes: number;
  priceCents: number;
  depositCents: number;
};

export type Trade = {
  id: TradeId;
  label: string;
  emoji: string;
  /** Hours before the start a client must cancel by to get the deposit back. */
  windowHours: number;
  /** Added after the standard refund rule on the pay page. */
  policyText: string | null;
  services: StarterService[];
};

const s = (name: string, durationMinutes: number, price: number, deposit: number) => ({
  name,
  durationMinutes,
  priceCents: price * 100,
  depositCents: deposit * 100,
});

export const TRADES: Trade[] = [
  {
    id: "barber",
    label: "Barber",
    emoji: "💈",
    windowHours: 24,
    policyText: "More than 10 minutes late may mean a shorter cut or rescheduling.",
    services: [s("Haircut", 45, 40, 10), s("Haircut + beard", 60, 55, 15), s("Lineup", 20, 20, 10)],
  },
  {
    id: "tattoo",
    label: "Tattoo artist",
    emoji: "🖋️",
    windowHours: 72,
    policyText:
      "Your deposit covers design time and goes toward your session. Reschedule at least 72 hours before to keep it.",
    services: [
      s("Small tattoo", 120, 200, 50),
      s("Half-day session", 240, 500, 100),
      s("Full-day session", 360, 900, 200),
    ],
  },
  {
    id: "nails",
    label: "Nail tech",
    emoji: "💅",
    windowHours: 24,
    policyText: "Running late? Message me. More than 15 minutes late may need to be rescheduled.",
    services: [s("Gel manicure", 60, 45, 15), s("Full set", 120, 70, 20), s("Fill", 75, 50, 15)],
  },
  {
    id: "lashes",
    label: "Lash & brow tech",
    emoji: "👁️",
    windowHours: 48,
    policyText: "Please arrive with clean lashes and no eye makeup.",
    services: [
      s("Classic full set", 120, 150, 40),
      s("Lash fill", 75, 75, 25),
      s("Brow lamination", 60, 80, 25),
    ],
  },
  {
    id: "hair",
    label: "Hair & braids",
    emoji: "💇",
    windowHours: 48,
    policyText: "Please come with hair washed and detangled unless your service includes it.",
    services: [
      s("Knotless braids", 300, 250, 75),
      s("Silk press", 120, 120, 35),
      s("Loc retwist", 120, 100, 30),
    ],
  },
  {
    id: "fitness",
    label: "Personal trainer",
    emoji: "🏋️",
    windowHours: 24,
    policyText: null,
    services: [
      s("1-on-1 session", 60, 70, 20),
      s("Intro session", 60, 50, 15),
      s("Partner session", 60, 100, 30),
    ],
  },
  {
    id: "detailing",
    label: "Mobile detailer",
    emoji: "🚗",
    windowHours: 24,
    policyText: "Please make sure I can get to your vehicle at the appointment time.",
    services: [
      s("Interior detail", 180, 150, 40),
      s("Full detail", 300, 250, 60),
      s("Wash & wax", 120, 100, 25),
    ],
  },
  {
    id: "photography",
    label: "Photographer",
    emoji: "📸",
    windowHours: 72,
    policyText: "Your deposit holds your date and goes toward your session.",
    services: [
      s("Portrait session", 60, 200, 75),
      s("Mini session", 30, 100, 40),
      s("Event coverage (2 hrs)", 120, 500, 150),
    ],
  },
];

export const OTHER_TRADE: Pick<Trade, "id" | "label" | "emoji"> = {
  id: "other",
  label: "Something else",
  emoji: "✨",
};

export const TRADE_IDS: [TradeId, ...TradeId[]] = [OTHER_TRADE.id, ...TRADES.map((t) => t.id)];

export function tradeById(id: string | null | undefined): Trade | null {
  return TRADES.find((t) => t.id === id) ?? null;
}
