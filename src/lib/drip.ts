/*
 * The nurture drip for pros who sent their first pay link but haven't added a card.
 * Four emails after the existing day-1 follow-up (first_link_followup): days 4, 9, 16
 * and 24 after the first pay link, then it stops. Spaced so no week gets more than two
 * emails from us (trial-nurture guides put whole sequences at 5–8 emails, and
 * unsubscribes rise above one or two a week). Stops for good once they add a card or
 * unsubscribe (the cron checks both). Pure: no server deps, so it's tested.
 *
 * The niche lines are qualitative on purpose: they describe what pros in each trade
 * commonly do, based on published booking policies (sources in the email journey
 * write-up), never a statistic we can't back up.
 */
import type { TradeId } from "@/lib/supabase/database.types";

export type DripStep = "tips" | "policy" | "cost" | "last";

export const DRIP_SCHEDULE: { step: DripStep; day: number }[] = [
  { step: "tips", day: 4 },
  { step: "policy", day: 9 },
  { step: "cost", day: 16 },
  { step: "last", day: 24 },
];

/** Never two drip emails closer than this, even if the cron missed days. */
export const DRIP_MIN_GAP_DAYS = 3;
/** Past this, a missed step is skipped rather than sent late. */
export const DRIP_GIVE_UP_DAYS = 35;

/**
 * The step due now, or null. `sent` maps steps already sent to when. Sends at most one
 * step per run, in order, never sooner than DRIP_MIN_GAP_DAYS after the last.
 */
export function dueDripStep(
  firstLinkAt: Date,
  now: Date,
  sent: Partial<Record<DripStep, Date>>,
): DripStep | null {
  const day = 86_400_000;
  const age = (now.getTime() - firstLinkAt.getTime()) / day;
  if (age > DRIP_GIVE_UP_DAYS) return null;
  const last = Math.max(0, ...Object.values(sent).map((d) => d.getTime()));
  if (last && now.getTime() - last < DRIP_MIN_GAP_DAYS * day) return null;
  for (const { step, day: due } of DRIP_SCHEDULE) {
    if (sent[step]) continue;
    return age >= due ? step : null;
  }
  return null;
}

type NicheCopy = {
  /** "lash techs" */
  who: string;
  /** Opening of the tips email: how pros in this trade frame the deposit. */
  framing: string;
  /** A practical tip for this trade. */
  tip: string;
  /** What's common for cancellation policies in this trade. */
  policyNorm: string;
  /** What a no-show costs beyond the price, in this trade. */
  costAngle: string;
};

const GENERIC: NicheCopy = {
  who: "pros",
  framing:
    "Pros who take deposits usually put it as holding the time for the client, not as a penalty, and regulars tend to get it once it's explained.",
  tip: "You can change the deposit for any client when you make the pay link, so a long-time regular can pay less than a first-timer.",
  policyNorm:
    "Most service businesses that take deposits use a 24- or 48-hour cancellation window.",
  costAngle: "a slot you held and couldn't fill on short notice",
};

const NICHES: Partial<Record<TradeId, NicheCopy>> = {
  lashes: {
    who: "lash techs",
    framing:
      "Lash techs who take deposits usually frame it as holding the time: a full set is a long block that's hard to fill at the last minute.",
    tip: "Each service has its own deposit, so a full set can ask for more than a fill. You can still change it for any client on the pay link.",
    policyNorm:
      "Many lash techs use a 48-hour window, and treat arriving more than 10 to 15 minutes late like a late cancellation.",
    costAngle: "a long appointment you can't rebook on short notice",
  },
  nails: {
    who: "nail techs",
    framing:
      "Plenty of nail techs start by taking deposits only for long sets or nail art, then use them for everything once regulars are used to it.",
    tip: "Give long sets a bigger deposit than fills: each service has its own, and you can change it for any client on the pay link.",
    policyNorm:
      "A 24-hour window is the most common for nail techs, usually with a 10 to 15 minute grace period for late arrivals.",
    costAngle: "a chair you kept open for them",
  },
  hair: {
    who: "stylists and braiders",
    framing:
      "Most braiders already take a non-refundable deposit at booking, often by Cash App, because a long install can't be filled at the last minute.",
    tip: "Keep using your Cash App, Zelle or Venmo: the pay link sends clients to your own handle, with no fee. If hair isn't included, say so in your policy so clients agree to it before paying.",
    policyNorm:
      "Many braiders let a deposit move once if the client reschedules with at least 24 hours' notice.",
    costAngle: "a whole day's install slot",
  },
  tattoo: {
    who: "tattoo artists",
    framing:
      "Tattoo clients already expect a deposit: it holds the session and pays for your design time.",
    tip: "Send the pay link before you start drawing, so the design time is covered whether or not they show.",
    policyNorm:
      "Most artists ask for 48 to 72 hours' notice to move a session, and allow one reschedule before the deposit is lost.",
    costAngle: "the session plus the hours you spent on the design",
  },
  detailing: {
    who: "mobile detailers",
    framing:
      "For a mobile detailer, a no-show costs more than the slot: it's the drive, the gas and the setup too. A deposit at booking covers that.",
    tip: "Plenty of detailers reschedule weather cancellations without a new deposit. If you do, say it in your policy so clients know before they pay.",
    policyNorm: "Many mobile detailers ask for 24 hours' notice, some 48.",
    costAngle: "the slot, plus the drive out and back",
  },
  barber: {
    who: "barbers",
    framing:
      "Barbers who add deposits often keep them small, like $10 to $20 toward the cut, so regulars barely notice and no-shows still cost something.",
    tip: "If you don't want to ask everyone at once, start with your busiest slots, like Saturdays, or with new clients.",
    policyNorm: "A 24-hour window is the common choice for barbers.",
    costAngle: "a prime slot you could have given to someone else",
  },
  photography: {
    who: "photographers",
    framing:
      "Most photographers already call it a retainer: it holds the date and goes toward the session.",
    tip: "Send the pay link as soon as the date is agreed, so nobody else can take it.",
    policyNorm:
      "Many photographers keep the retainer if the client cancels, but let them move the date once with notice.",
    costAngle: "a date you may have turned other clients down for",
  },
  esthetician: {
    who: "estheticians",
    framing:
      "Estheticians often start with deposits for facials and waxing, the bookings that are hardest to fill at the last minute.",
    tip: "Each service has its own deposit, so longer treatments can ask for more. You can still change it for any client on the pay link.",
    policyNorm:
      "A 24-hour window is the norm for estheticians, with some using 48 hours for longer treatments.",
    costAngle: "a treatment room held for nobody",
  },
  fitness: {
    who: "trainers",
    framing:
      "Most trainers already charge for late cancellations. A deposit just collects it up front, so you're not chasing anyone.",
    tip: "Make the deposit the session's late-cancel fee, so the rule clients agree to matches what you'd charge anyway.",
    policyNorm:
      "A 24-hour window is standard for trainers, and arriving more than 15 minutes late often counts as a no-show.",
    costAngle: "an hour you blocked out for them",
  },
  catering: {
    who: "caterers",
    framing:
      "Caterers usually take a share of the total up front to hold the date, with the balance due before the event.",
    tip: "Put your quote page in your bio too: hosts pick the date and guest count, see your price and pay the deposit without the back-and-forth.",
    policyNorm:
      "Catering policies usually set a final guest count deadline a few days to a week before the event.",
    costAngle: "a date you held and could have booked",
  },
};

export function nicheCopy(trade: TradeId | null): NicheCopy {
  return (trade && NICHES[trade]) || GENERIC;
}

export type DripInput = {
  step: DripStep;
  trade: TradeId | null;
  businessName: string | null;
  windowHours: number;
  /** Their own announcement for regulars (config.depositAnnouncement). */
  announcement: string;
  /** "Dec 2" if a free trial is on offer, null if not (they pay from day one). */
  freeUntil: string | null;
  /** "$29" */
  monthly: string;
  /** Their priciest active service, for the cost email. */
  topService: { name: string; price: string; priceCents: number } | null;
  monthlyCents: number;
  /** Deposits clients have paid through their pay links so far. */
  depositsPaid: number;
  billingUrl: string;
  profileUrl: string;
  newAppointmentUrl: string;
};

/** Subject and body of one drip email. Plain text: it reads like a note, not a newsletter. */
export function dripEmail(d: DripInput): { subject: string; body: string } {
  const n = nicheCopy(d.trade);
  const cardLine = d.freeUntil
    ? `Your next pay link needs your card: $0 today, and you're free until ${d.freeUntil}. Cancel anytime.`
    : `Your next pay link needs a subscription: ${d.monthly}/month, cancel anytime.`;
  const window = `${d.windowHours} hour${d.windowHours === 1 ? "" : "s"}`;

  switch (d.step) {
    case "tips":
      return {
        subject: `How ${n.who} ask for deposits without losing regulars`,
        body: `${n.framing}

A message you can send your regulars, written with your own ${d.windowHours}-hour policy:

"${d.announcement}"

${n.tip}

${cardLine} ${d.billingUrl}`,
      };
    case "policy":
      return {
        subject: `Your cancellation policy, set the way ${n.who} usually do`,
        body: `${n.policyNorm} ${d.windowHours > 0 ? `Yours is ${window}.` : "Yours lets clients cancel for a refund right up until the appointment starts."} You can change it anytime: ${d.profileUrl}

Once it's set, Dibs enforces it for you: your client agrees to it before paying, gets reminders 48 and 24 hours before, and can cancel from the same link, refunded only before your deadline. If they don't show, one tap keeps the deposit. House rules like late arrivals or a free reschedule go in your policy text, so clients agree to those too.

${cardLine} ${d.billingUrl}`,
      };
    case "cost": {
      const top = d.topService;
      const covers =
        top && top.priceCents > 0
          ? top.priceCents >= d.monthlyCents
            ? `Your ${top.name} is ${top.price}. One no-show on it costs more than a month of Dibs (${d.monthly}).`
            : `Your ${top.name} is ${top.price}. ${Math.ceil(d.monthlyCents / top.priceCents)} no-shows on it cost more than a month of Dibs (${d.monthly}).`
          : `A month of Dibs is ${d.monthly}.`;
      const results =
        d.depositsPaid > 0
          ? `\n\nSo far, ${d.depositsPaid === 1 ? "1 client has" : `${d.depositsPaid} clients have`} paid a deposit through your pay link${d.depositsPaid === 1 ? "" : "s"}.`
          : "";
      return {
        subject: "What one no-show costs you",
        body: `${covers} And it isn't just the price: it's ${n.costAngle}.${results}

${cardLine} ${d.billingUrl}`,
      };
    }
    case "last":
      return {
        subject: d.freeUntil
          ? `Your free days run until ${d.freeUntil}`
          : "Keep your pay links coming",
        body: `${
          d.freeUntil
            ? `Your free days run until ${d.freeUntil}. Add your card and you won't pay anything until then (cancel anytime).`
            : `To send more pay links, it's ${d.monthly}/month, cancel anytime.`
        }

If you don't, nothing breaks: the pay link you sent and its reminders keep working. You just can't send new ones.

This is the last of these emails. When your next client books: ${d.newAppointmentUrl}

Add your card: ${d.billingUrl}`,
      };
  }
}
