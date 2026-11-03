@AGENTS.md

# Dibs

## Product

**Dibs** helps independent service pros protect themselves from no-shows: the client "calls dibs" on a slot by paying a deposit. It's for anyone who books clients through **Instagram DMs** rather than a booking site (lash techs, nail techs, braiders, tattoo artists, and so on). The product copy stays general ("pros", "your provider"); marketing targets one niche at a time, starting with lash techs, so niche-specific wording belongs in ads, not in the app. The product fits the DM flow:

1. A tech signs up on **`/start`** (instant sign-up: what they do, business name and payment handle, a preview of their pay link, then their email; the account is created and signed in with no code), sets up deposits (**Collect it yourself** with their own Cash App / Zelle / Venmo handles, or **Stripe** Express for cards), and adds services with prices and deposit amounts. No card needed.
   Their **first pay link needs no card**. Before their **second**, they add a card in Stripe Checkout; the **30-day free trial** (`TRIAL_DAYS`) counts from **sign-up**, with at least `MIN_TRIAL_DAYS` (7) after adding the card (`trialEndFor` in `subscription.ts`, Checkout `trial_end`), then $29/month (`SUBSCRIPTION_PRICE_CENTS`). Copy names the real end date (`freeUntil` / `trialOffer` in `billing.ts`), never "adding a card starts your 30-day trial". Without an active subscription (`trialing`, `active`, or `past_due` as a grace period) they can't create pay links beyond that first one (`canCreatePayLink` in `subscription.ts`); existing links, reminders and cancellations keep working.
2. The tech and client agree on a time in the DMs. The tech creates the appointment in the app (**New appointment**), which makes a **pay link** (`/pay/[appointmentId]`), and pastes it into the DM. The link works for `PAY_LINK_VALID_HOURS` or until the appointment starts. The menu page `/<slug>` (getdibs.pro/fresh-cuts, the pro's own page; old `/b/<slug>` links redirect) lists the tech's services, prices and policy for their Instagram bio; it doesn't book or take deposits (clients message the tech to book), so the UI always calls it the menu page and says it isn't a pay link.
3. The client opens the pay link, agrees to the deposit policy (a snapshot is saved with the time they agreed), and pays. **Stripe:** through Stripe Checkout; the webhook confirms the appointment and emails the client and the tech. **Manual:** the client sends the deposit in their own app and taps "I've sent my deposit"; the tech is emailed and taps **Received** (confirms and emails the client) or **Not received**. The tech can also mark a deposit received without the client tapping.
4. The daily cron sends reminders (`REMINDER_OFFSETS_HOURS`, 48h and 24h; email now, SMS later), each logged in `notification_log` as `appointment_reminder_<N>h` so it's sent once. Every email says when the client can still cancel for a refund.
5. The client can cancel from the same link (reschedules happen in the DMs). Before the refund deadline (start minus the cancellation window they agreed to) the deposit is refunded; after it, the deposit is kept. Stripe deposits are refunded automatically; manual ones become `refund_due` and the tech sends the money back themselves, then taps **I sent the refund**. The server decides at submit time and refuses if the page showed different terms. The tech is emailed either way.
6. After the appointment, the tech marks it **completed** (the deposit goes toward the price) or **no-show** (the tech keeps the deposit). A tech cancellation refunds the deposit in full.

The product's job is preventing no-shows: deposit up front, a policy the client agrees to, reminders, easy cancel instead of ghosting, and one tap to keep the deposit. Judge new features against that. Self-serve time slots are a convenience, not the core.

**Words to use.** In code, the business user is the _tech_ (`tech_id`, `(tech)` routes); in UI text call them a _pro_, or "your provider" when talking to their clients, and never name a trade (no "lash tech", "full set"). The one exception is the pro's own setup: the "What do you do?" picker, the profile's trade field and the starter services (`lib/trades.ts`). Client-facing pages (pay links, menu pages) and marketing pages stay trade-neutral. The end customer is the _client_ (never has an account). Say _deposit_, _no-show_, _pay link_ and _menu page_ (never "booking page": it doesn't book anyone). Don't say "customer", "user" or "stylist" in UI text. The app name comes from `APP_NAME` in `config.ts`; never hard-code it.

**Users are on phones.** Techs run their business from their phone, and clients open links inside Instagram's in-app browser. Design and test at 375px first.

## Stack

- **Next.js 16** (App Router, React 19, TypeScript strict) on **Vercel**. See the AGENTS.md note: read `node_modules/next/dist/docs/` before using a Next API you're not sure about. `middleware.ts` is now `proxy.ts`. `params`, `searchParams`, `cookies()` and `headers()` are async.
- **Tailwind CSS v4.** Design tokens live in `src/app/globals.css` (`bg-brand`, `text-muted`, `border-line`, …).
- **Supabase** for auth (email code or link, techs only) and Postgres with RLS. Uses `@supabase/ssr`. The Magic Link and Confirm signup email templates must include `{{ .Token }}` and link to `{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=email`: phones often open mail links in a different browser, where the default PKCE link fails.
- **Stripe Connect** with Express accounts. Deposits are **destination charges** made on the platform with `transfer_data.destination` set to the tech's account and an `application_fee_amount`: the **processing fee**, 3.5% + 30¢ (`PROCESSING_FEE_*` in `config.ts`, `processingFeeCents` in `money.ts`). It covers Stripe's card fee, which the platform pays on destination charges. Show techs what they receive (`techPayoutCents`) wherever deposit amounts appear.
- **Resend** for email, behind the notifications interface.
- **zod** for validating env vars and every input from outside the app.
- **Vercel Cron** for reminders and expiring unpaid holds (`vercel.json`). It runs daily (14:00 UTC) because the Vercel Hobby plan allows only daily crons. On Pro, switch to hourly (`0 * * * *`) for tighter reminder timing.

## Folder structure

```
src/
  proxy.ts                        Refreshes the Supabase session; guards /dashboard
  app/
    (marketing)/page.tsx          Landing page (static): hero with DM + pay page, no-show cost calculator,
                                  4 steps with close-up crops of real app screens (images/zoom-*.png, neutral
                                  "Studio Nova" example, no trade names), vs Cash App / booking apps, founder note, pricing, FAQ,
                                  sticky phone CTA. The price shows under the hero button and in the sticky bar.
                                  Every "Start free" links to /start. Pulls price, trial and fee from
                                  config.ts; keep claims true to the product.
    (marketing)/demo/             Demo pay link anyone can try (no sign-up): reuses the pay page's forms
                                  with local actions, so nothing is charged or saved. Card or manual toggle.
    (marketing)/catering/         Food truck / caterer landing page for ads (the one marketing page that names a trade, on
                                  purpose) and demo/ (a sample quote page; nothing is booked). Start free →
                                  /start?trade=catering.
    (marketing)/terms/, privacy/  Terms of Service and Privacy Policy (legal-page.tsx layout). Keep them true to
                                  the product: update them, and LEGAL_UPDATED in config.ts, when data, fees,
                                  providers or billing change. No ad trackers on pay links or menu pages
                                  (the Privacy Policy says so); a Meta Pixel belongs on marketing pages only.
    (marketing)/start/            Instant sign-up, value first. Both screens open with the ads' promise ("No more getting ghosted
                                  by clients.", matching the landing page); the pay link screen adds the mechanism line and
                                  chips (free, no card, deposits go straight to you). Funnel events also go to Clarity, and the
                                  session is tagged start_step / start_trade so heatmaps and recordings filter by step.
                                  Flow: trade → their pay link right away (placeholder name, Cash App
                                  pre-selected) with "Make it yours" below it: business name, payment method (handle optional;
                                  the dashboard's deposits step asks for a missing one), email. "Something else" adds one step
                                  for its service first. createAccount (actions.ts) creates the user with the admin API
                                  and signs them in on the server (generateLink + verifyOtp, nothing emailed), sets up
                                  profile, starter services and time zone, sends CompleteRegistration. An email
                                  that already has an account is never signed in this way: it gets a sign-in code.
                                  Optional Cloudflare Turnstile + honeypot. What they've typed (never the email) is kept on the phone for 7 days so they resume where they left off. Pixel (each with in_app yes/no): StartSignup on arrival, StartBusinessStep (custom) once a trade is chosen, Lead when the pay link shows, StartBusinessBlocked (custom, `fields`) when a required field stops them, StartSubmit (custom) when the form is sent. `?trade=barber` (on /start, or on the landing page via `remember-trade.tsx`) skips step 1 for ads aimed at one trade; marketing pages stay trade-neutral. profiles.email_confirmed is false until their first code or link sign-in
                                  (markEmailConfirmed, which then signs out every other session). Nothing waits on
                                  it: no inbox trip before the first pay link or trial. While false, the dashboard
                                  shows "Booking alerts go to … · Wrong? Fix it" (dashboard/confirm-email/).
                                  /login?start=1 redirects here.
    (auth)/login/                 "Continue with Apple / Google" (oauth-buttons.tsx; only in a real browser, only the providers
                                  in NEXT_PUBLIC_AUTH_PROVIDERS, each enabled in Supabase first; lands on auth/callback's
                                  PKCE path), then email sign-in: 6-digit code (any browser) or link (page, form, actions). The code
                                  screen survives a reload for an hour (localStorage) and shows an "Open Gmail /
                                  Mail / Outlook" button picked from the email domain and phone (inbox.ts)
    auth/callback/route.ts        Sign-in link landing: verifies token_hash (any browser) or a PKCE code. Failures go to
                                  /login?error=link&reason=<code> (lib/sign-in-errors.ts: a fixed message per code; the
                                  raw provider text is only logged, never put in the URL). proxy.ts leaves auth/callback
                                  and auth/handoff alone (it redirects stray ?code / ?token_hash elsewhere to the callback).
    (tech)/layout.tsx             Signed-in shell: server-side auth check + bottom tab bar (nav.tsx)
    (tech)/install-banner.tsx     Pros sign up inside Instagram's browser, whose sign-in doesn't carry over: once they've made
                                  a pay link (not before, so they reach value first), banner offers "Open in Safari / Chrome"
                                  already signed in (open-in-browser.tsx: createHandoffLink mints a one-time link at the tap,
                                  opened via x-safari-https / an Android intent, with copy-and-paste if Instagram blocks it;
                                  it lands on auth/handoff, which signs in without marking the email confirmed), then
                                  "Add to Home Screen" (dismissible); hidden once running from the Home Screen.
                                  manifest.ts + public/icon-*.png
    (tech)/dashboard/saved-reply-card.tsx  "Add Dibs to your DMs": a ready-made Instagram saved reply (shortcut "dibs")
                                  so the booking DM itself prompts a pay link; dismissed per phone.
    (tech)/dashboard/announcement-card.tsx  "No booking yet? Tell your regulars": the depositAnnouncement with
                                  Share / Copy, shown until their first pay link goes out.
    (tech)/dashboard/             Tech home: "N of 4 done" progress, setup checklist (profile → deposits → services →
                                  first pay link), menu page link
    (tech)/dashboard/onboarding/  First-visit "What do you do?" picker: one tap saves profiles.trade and, for a pro
                                  with no services, adds that trade's starter menu (services.is_starter, shown as
                                  "Example price" until saved, and kept off the public menu page until then)
                                  and policy. Skip records "other". Pros who already have services only save
                                  their trade.
    (tech)/dashboard/profile/     Business name, menu page link (slug), page look, trade, time zone, policy; sign out
    (tech)/dashboard/look-picker.tsx  The pro's real page live in a phone frame (iframe of dashboard/preview), with
                                  style and color choices: it scrolls itself until touched, each change replays the
                                  entrance. In the tour's "Your own page" card it saves on tap (savePageLook,
                                  look-actions.ts); on Profile it posts with the form.
    (tech)/dashboard/gallery/     "Your work": optional photos of the pro's work (lib/gallery.ts, 20261023000000). GalleryManager
                                  shrinks each photo on the phone (longest side 1600px, JPEG, no EXIF/location), uploads it
                                  straight to the public "gallery" bucket under <tech id>/ (storage policies: own folder
                                  only), then addGalleryPhoto lists it in gallery_photos (12 max, also a DB trigger).
                                  On ProPage they glide in two rows under the hero ("The work"), hidden with none. A
                                  tour card ("Show off your work", after the page card) uploads and shows them gliding;
                                  linked from the dashboard menu card and Profile. Terms: own work, no nudity etc.
    dashboard/preview/            The signed-in pro's page for that iframe, outside the (tech) layout (no app chrome);
                                  ?style= / ?accent= try a look unsaved; shows example (starter) prices.
    (tech)/dashboard/services/    List / new / [id] edit; hide/show instead of delete
    (tech)/dashboard/payments/    Deposit method: Cash App / Zelle / Venmo handles, or switch to Stripe
    (tech)/dashboard/stripe/      Onboarding + Express dashboard actions; refresh/ and return/ routes
    (tech)/dashboard/billing/     Subscription status, subscribe/trial card, Stripe billing portal; return/ route after Checkout
    (tech)/dashboard/appointments/ List (needs action / upcoming / waiting / past), new, [id] detail. New
                                  appointment needs only the client's name: email / phone / Instagram are folded
                                  away ("+ Add their email or phone"). Without an email, the pay page makes the
                                  client add theirs (phone optional, asked only if missing too; never overwrites
                                  the pro's) before paying (pay/[id]/contact-fields.tsx, saveClientContact), so
                                  confirmations and reminders always reach them (`20261010000000` dropped the contact check). Contactless appointments
                                  stay out of the client list until then. A returning-client picker (and "Book
                                  … again" on a client's page) fills their details, last service and deposit, and
                                  warns about past no-shows / late cancels; new clients default to the last
                                  service booked
                                  The detail page sends the pay link with a ready-made DM (share-pay-link.tsx): Share opens
                                  the phone's share sheet (Instagram, iMessage…); Copy message / Copy the link only as fallbacks
    (tech)/dashboard/clients/     Client list and [key] detail (record + appointments), built from appointments
    (tech)/dashboard/catering/    Dibs Catering, for food trucks / caterers (trade "catering"; anyone can turn it on):
                                  overview (publish, link, this month's bookings and money, coming up), packages/ and
                                  addons/ (per person or flat), settings/ (pricing rules, deposit, balance due, policy,
                                  availability), dates/ (blocked dates), bookings/ (list, [id] detail: notes, resend,
                                  mark done, cancel, refund a payment). Publishing needs a name + slug, a package and Stripe.
    [slug]/                       Public menu page at the site root (getdibs.pro/<slug>), editorial and photo-free: full-
                                  screen hero (name in Instrument Serif rising out of a mask, the pro's color drifting
                                  behind), service-name marquee, numbered price list, stats, how booking works, policy,
                                  closing CTA. Sections fade up on scroll (reveal.tsx arms [data-reveal]; everything
                                  shows without JS or with reduced motion); the sticky "Message to book" bar slides in
                                  once the hero is gone. opengraph-image.tsx is the link preview. The page itself is
                                  components/pro-page (ProPage, shared with the preview). Three page styles
                                  (profiles.page_style, 20261021000000; lib/page-styles.ts, tested): Editorial (serif),
                                  Bold (Anton, caps), Clean (sans), plus fonts from a trade's own world, shown first in
                                  its picker (stylesForTrade): tattoo gets Metal / 90s anime / Old-school, detailing gets
                                  Ultra luxury / Performance / Professional (20261022000000). New pros get a style from
                                  their trade (pageStyleForTrade at /start and the trade picker). Fonts aren't preloaded:
                                  a page fetches only the one it uses. Slugs can't
                                  be a reserved word (lib/slugs.ts RESERVED_SLUGS, kept in sync with the
                                  profiles_slug_not_reserved check in 20261019000000 and every top-level route by a
                                  test). b/[slug] permanently redirects here, and a capitalized address (/Studio-Nova) redirects to lowercase. Sold as "your own page" on /start (live
                                  address preview), the landing page, the dashboard and the founder welcome email; the
                                  profile form warns that changing the link breaks the old one.
                                  The pro's color (profiles.accent_color, 20261020000000) recolors it, the pay link
                                  and the link preview: fixed presets in lib/accents.ts (contrast-tested; must match the
                                  check), applied by accentStyle() overriding --brand / --brand-soft / --pink on the
                                  page wrapper. Picked on Profile (accent-picker.tsx, with a preview).
                                  Ends with a small "Try Dibs free" invite (components/ui/pro-invite.tsx).
    pay/[id]/calendar/route.ts    The booked appointment as an .ics (Add to my calendar on the pay page; also attached
                                  to the booking_confirmed email, so Apple Mail offers to add it). 2-hour phone alert.
    api/calendar/[token]/         A pro's private calendar feed (/api/calendar/<profiles.calendar_token>.ics) for Apple
                                  Calendar (webcal://) or Google Calendar: confirmed, waiting and past 60 days. The card is at
                                  the bottom of Appointments; Reset link calls reset_calendar_token() (techs can't set it)
    pay/[id]/                     Public pay page: details, policy + agree checkbox → Stripe Checkout
    c/[slug]/                     Catering quote page (the main catering product): calendar with booked/blocked dates
                                  crossed out, times, guests, package, add-ons, event details, live quote, policy →
                                  requestBooking recalculates, holds the date and opens Stripe Checkout. The owner
                                  previews it unpublished. No ad trackers (client-facing).
    e/[token]/                    The host's booking page (unguessable token): status, breakdown, pay the balance,
                                  finish an unpaid hold, contact, .ics (calendar/). Refreshes itself while a payment confirms.
    api/stripe/connect/webhook/   Connect events (account.updated)
    api/stripe/webhook/           Platform events (checkout, refunds): source of truth for deposits
    api/cron/reminders/           Vercel Cron: expire unpaid pay links, send reminders (reminders.ts: due rule)
  components/ui/                  Small shared building blocks (Button, Input, Textarea, Select, BackLink)
  components/meta-pixel.tsx       Meta Pixel; rendered by (marketing)/layout.tsx and the login page only
  components/clarity.tsx          Microsoft Clarity (heatmaps, recordings) via NEXT_PUBLIC_CLARITY_ID; (marketing)/layout.tsx
                                  only. clarity-scope.tsx stops it when the visitor leaves those pages without a reload
                                  (/start → dashboard). Runs only on the NEXT_PUBLIC_APP_URL host and not for navigator.webdriver (keeps Vercel
                                  preview deployments and their screenshot bot out). Europe time zones get the no-consent signal (cookieless).
                                  Typed text masked; the /start email has data-clarity-mask. In the Privacy Policy.
  lib/
    config.ts                     App constants (name, pay link validity, checkout lifetime, reminders)
    calendar.ts                   .ics building (escaping, 75-byte folding, alarms); no server deps
    in-app-browser.ts             isInAppBrowser(userAgent): Instagram / Facebook browsers
    time.ts                       Time zones: zonedTimeToUtc, wallClockParts, formatWhen (Intl only)
    appointments.ts               Status labels, payability, policySummary, cancellationTerms,
                                  cancelNote, loadAppointmentContext, loadSettledDeposit
    env.ts / env.public.ts        zod-checked env (server-only / browser-safe)
    money.ts                      Cents helpers, fee math, dollarsToCents for form input
    format.ts                     Display helpers (formatDuration)
    forms.ts                      FormState, formValues, fieldErrors for Server Action forms
    supabase/                     client.ts (browser), server.ts (RLS as user),
                                  admin.ts (secret key, bypasses RLS), proxy.ts,
                                  database.types.ts
    stripe/                       server.ts (secret key), client.ts (Stripe.js),
                                  connect.ts (Accounts v2: create, onboarding link, status sync),
                                  deposits.ts (Checkout, webhook handlers, refunds, settle),
                                  disputes.ts (chargebacks: evidence, transfer reversal, return if won),
                                  billing.ts (tech subscription: trial eligibility, Checkout, sync, portal)
    subscription.ts               canSendPayLinks(status), canCreatePayLink(status, payLinksSoFar), normalizeEmail (no server deps)
    setup.ts                      setupState + nextStepSentence: what's left before the first pay link (no server deps)
    payments.ts                   Manual deposits: manualHandles, canTakeDeposits, paymentAppUrl (no server deps)
    clients.ts                    Client list from appointments (matched by email; a phone-only appointment
                                  joins the one email seen with that phone, never two; "+1" ignored): visits,
                                  no-shows, late cancels; clientMatcher, findClient (old "p:" links), isFlaky,
                                  clientRecord. No clients table.
    savings.ts                    loadSavings + savingsSummary: deposits kept from no-shows/late cancels (minus
                                  disputes lost), early cancels, show rate. Dashboard "Your results" card and the
                                  trial-ending email.
    trades.ts                     Kinds of pro and their starter menus (typical prices, policy); must match the
                                  profiles.trade check constraint
    meta.ts                       Meta Conversions API: trackSignUp, trackSubscription (StartTrial, Subscribe)
    catering/                     quote.ts (the pure quote: per person/flat, add-ons, extra hours, minimum spend,
                                  travel, service fee, tax on subtotal + service fee, deposit; integer cents, half-up
                                  rounding; tested), dates.ts (owner's wall-clock dates, availability; tested),
                                  bookings.ts (states, labels), setup.ts (publishProblems), starter.ts (setUpCatering:
                                  default settings + example packages), server.ts (startDepositCheckout, balance and
                                  resume checkouts, webhook handlers, emails, .ics)
    referral.ts                   "Powered by Dibs": inviteUrl (/?ref=<slug>, on the pay page after payment, the menu
                                  page and the client's booking_confirmed email) and readRef. remember-trade.tsx keeps ?ref
                                  on the phone for 7 days; /start saves the referring pro in profiles.referred_by. No rewards.
    notifications/                notify() + Notifier interface, Resend email, SMS stub, templates,
                                  log.ts (notifyForAppointment: send + write notification_log)
supabase/migrations/              SQL migrations (timestamped, append-only)
```

Put new feature code next to the route that uses it (`app/(tech)/dashboard/services/actions.ts`). Move it to `lib/` only once two places need it.

## Coding rules

**General**

- Use TypeScript strict. No `any`. Use `unknown` and narrow it. Prefer types that come from zod schemas and `database.types.ts`.
- Use Server Components by default. Add `"use client"` only for interactivity, and keep client components small.
- Changes to data go through **Server Actions** (forms) or **route handlers** (webhooks, cron, external callers). Validate every input with zod on the server.
- Any module that uses secrets starts with `import "server-only"`.
- Read env only through `serverEnv()` / `publicEnv()`. Add every new key to the schema **and** to `.env.example`.
- Keep changes small and focused. Before committing, run `npm run check`, `npm test` and `npm run build`.

**Forms**

- Pattern: a zod schema in `schema.ts`, a Server Action returning `FormState` in `actions.ts`, and a small client form using `useActionState`. See `dashboard/services/`.
- On a validation error, return `{ errors, values }`. Forms use `values` as `defaultValue`, because React resets uncontrolled fields after an action. `Select` is keyed on its `defaultValue` for the same reason.
- On success, `revalidatePath` then `redirect`. Call `redirect` outside `try/catch`.
- Map Postgres errors to field messages where the user can fix them (e.g. `23505` unique violation on `slug`).

**Data and security**

- RLS is **on for every table**. Each new table needs policies in the same migration.
- Supabase grants table-level privileges to `anon`/`authenticated` by default, so a column-level `revoke` does nothing. To limit which columns techs can write, revoke the table privilege and grant specific columns (see `20260924000000_profile_update_grants.sql`).
- Techs write `appointments` as themselves, but only within limits (`20261007000000_appointment_write_guards.sql`): insert only a `pending_deposit` pay link for their own service when their subscription is live or it's their first pay link ever (`20261009000000` dropped the confirmed-email condition; `20261011000000` added the first-link case through the `has_no_pay_links()` security-definer function, because a policy on appointments can't query appointments itself); update only `status`, `hold_expires_at` (to null) and `client_marked_sent_at` (to null); no deletes; never reopen a closed link. Snapshots and amounts are server-only. Keep app writes inside these limits or add a migration.
- No other site may frame Dibs pages: `next.config.ts` sends `frame-ancestors 'self'` and `X-Frame-Options: SAMEORIGIN` everywhere (the dashboard's own live page preview is same-origin).
- Post-sign-in redirects go through `safeNextPath` (`lib/redirects.ts`): browsers read `/\evil.com` as another site.
- `createAdminClient()` bypasses RLS. Use it only where no tech is signed in (webhooks, cron, public booking writes after validation), and scope every query by id yourself.
- Clients never sign in. The public menu page reads through the anon role (`public_profiles` view, active `services`). Every client write goes through server code.
- Migrations are append-only. Never edit a migration that has been applied; add a new one. After schema changes, run `npm run db:types`.
- Store times as `timestamptz` (UTC). Show them in the **tech's** `profiles.timezone`.

**Money and Stripe**

- Connected accounts use **Accounts v2** (`stripe.v2.core.accounts`, `stripe.v2.core.accountLinks`). Stripe blocks v1 account creation for new platforms. Each tech's account has the `recipient` configuration with `stripe_balance.stripe_transfers` (what destination charges need), Express dashboard, and `fees_collector`/`losses_collector: "application"`.
- Account status is written only by `syncAccountStatus(accountId)`, which re-reads the v2 account. It runs from the Connect webhook, the onboarding return route, and the dashboard while onboarding is unfinished. `stripe_charges_enabled` means "transfers capability active" (the tech can receive deposits).

- Deposit lifecycle (`deposits.status`): `pending` (checkout open) → `paid` (webhook) → `applied` (completed) / `forfeited` (no-show) / `refunded`. `failed` = that checkout expired. At most one deposit per appointment can hold money (partial unique index); a second payment is refunded automatically, as is a payment for an appointment cancelled meanwhile.
- **Manual deposits** (`profiles.deposit_method = 'manual'`): no Stripe and no fee. `appointments.payment_method` snapshots the method at creation. `deposits.method = 'manual'` with `manual_app`; `pending` = the client says they sent it (`appointments.client_marked_sent_at`), `paid` = the tech tapped Received. Refunds go `paid` → `refund_due` → `refunded` when the tech confirms they sent it. The cron doesn't expire links the client marked as sent. Use `canTakeDeposits(profile)` to decide if a tech can take deposits, never `stripe_charges_enabled` alone.
- Refunds use `reverse_transfer: true`. Tech or client cancellations keep the processing fee (`refund_application_fee: false`), because Stripe keeps its fee too; the client still gets the full deposit back and the tech absorbs the fee. System refunds (duplicate or late payments) return the fee.
- Appointments store `price_cents`/`deposit_cents` at creation, so editing a service doesn't change existing bookings. The deposit is pre-filled from the service on **New appointment** and the tech can change it for that client (at least $1, at most the price, checked in `createAppointment`); everything downstream uses the appointment's `deposit_cents`.
- Money is **integer cents** everywhere: DB, code, Stripe. Format only in the UI, using `formatCents`.
- Every Stripe call that creates something passes an `idempotencyKey` built from our own ids.
- **Webhooks are the source of truth** for payment state. Never mark a deposit paid because of a redirect or a client-side callback. Webhook handlers must be idempotent.
- Check each webhook's signature against the matching secret (platform or Connect).
- **Chargebacks** (`charge.dispute.*`, `lib/stripe/disputes.ts`): the platform is liable, so on `funds_withdrawn` Dibs reverses the pro's transfer (up to what's left of it) and on `funds_reinstated` sends it back. `created` auto-submits the agreed policy as evidence and emails the pro and `OWNER_ALERT_EMAIL`; `closed` records `deposits.dispute_status` and tells the pro. Each step is idempotent across retries (reversal metadata, transfer_group, conditional updates). Stripe's dispute fee stays with the platform.

**Catering** (`20261013000000_catering.sql`, `lib/catering/`)

- The owner is a normal pro (`profiles`), trade `catering`; the end customer is the _host_ (no account, like a client). Tables: `catering_settings` (one per owner; percentages in basis points), `catering_packages`, `catering_addons`, `catering_blocked_dates`, `catering_bookings` (quote snapshot, amounts, `public_token`), `catering_payments` (deposit / balance). Owners write settings, packages, add-ons and blocked dates as themselves; bookings and payments are server-written, and owners may update only status, notes and cancel fields (column grants).
- A date is held by `hold_catering_date()` (security definer, service role only): an advisory lock on (owner, date), blocked-date and capacity check (`catering_held_count`), then the insert. Held = `confirmed`/`balance_due`/`paid_in_full`, or `awaiting_deposit`/`requested` until `hold_expires_at` (the Checkout lifetime). A payment that lands after the date filled is refunded with the fee returned and both sides are emailed.
- The server recalculates the quote at checkout and refuses if it differs from what the page showed (`shown_total`/`shown_deposit`). Inside the balance window the whole total is charged up front; that rule uses the day the page priced it (`quote_day`, honored through the next day: `honoredQuoteDay`). A balance under $1 is folded into the deposit (Stripe's minimum).
- Payments are destination charges with the normal processing fee (no other commission), webhook-confirmed (`metadata.kind = "catering"` routes them). Express owners can't refund destination charges themselves, so refunds happen in Dibs: automatically on cancellation, or a per-payment button on a finished (cancelled/completed) booking (`refundPayment`); an active event is refunded only by cancelling it, which frees the date. Cancellation refunds keep the fee (like pro/client cancellations).
- **E-signature** (`20261014000000`, `lib/catering/agreement.ts`): before paying, the host types their name (must match `host_name`) and ticks "sign electronically". The server builds the agreement (event, price lines, payment schedule, refund terms, policy, the owner's `contract_terms`) and stores it as `contract_text` with `signature_name`, `signed_at`, `signer_ip`, `signer_user_agent`; owners can't edit these. Printable at `/e/[token]/agreement`, attached as agreement.txt to both confirmation emails.
- **Automatic refunds** (`lib/catering/refunds.ts`, tested): terms are snapshotted on the booking (`host_can_cancel`, `full_refund_days`). Owner cancels → every paid payment refunded (`ownerCancelRefund`, before the status changes so a Stripe failure leaves it active). Host cancels from `/e/[token]` (if allowed) → full refund at least `full_refund_days` before the event, otherwise the deposit is kept and any balance refunded; the server recomputes and refuses if the page showed a different refund (`hostCancelBooking`). Sales tax stays one flat rate per owner (no per-jurisdiction tax).
- Gate: an owner's first paid catering booking is free; after that the page needs a live subscription (`canCreatePayLink`), else it shows "not taking online bookings" and the dashboard says so.
- Daily cron (`runCateringJobs`, rules in `cron/reminders/catering-due.ts`, tested): expire holds, `confirmed` → `balance_due`, balance reminders 7 and 2 days before due, overdue notice to the owner, day-before summary, past events → `completed`. Each message once via `notifyOnce` (`<template>:<booking id>`). Emails to hosts come from the business name and reply to the owner.
- **Chargebacks** (`lib/catering/disputes.ts`, `20261015000000`): `lib/stripe/disputes.ts` falls back to catering payments. `created` records `catering_payments.dispute_status`, submits the signed agreement (signature, time, IP) as evidence and emails the owner and `OWNER_ALERT_EMAIL`; `funds_withdrawn`/`funds_reinstated` reverse and return the owner's transfer exactly like deposits; `closed` records the outcome and tells the owner.
- Abuse limits: 5 holds per host email and 10 per device (signer IP) per hour; a host's earlier unpaid hold for the same date is released only from the same device.
- Not built yet: request mode (approve first), the weekly schedule page (`/t/[slug]`), the onboarding wizard.

**Subscriptions**

- Stripe is the source of truth. `syncSubscription` copies status, trial end, period end and cancel flag onto `profiles` from `customer.subscription.*` webhooks and the Checkout return route. Techs can't write these columns (column grants).
- One trial per person. `trial_claims` stores card and payout-bank fingerprints, normalized email (Gmail dots and +tags removed), Instagram handle and Cash App / Zelle / Venmo handles when a trial starts. A match with another tech means no trial is offered; a reused card found after Checkout ends the trial immediately (`trial_end: "now"`).
- New pros get a plain-text **founder welcome** from `/start` (`founder_welcome`, from "FOUNDER_NAME at APP_NAME", replies to `FOUNDER_EMAIL`, no app footer, with a one-tap sign-in link made in `after()` so leaving Instagram's browser doesn't strand them; it lasts as long as Supabase's email OTP expiry), and the cron sends one **founder check-in** 7–10 days after sign-up if they haven't sent a pay link (`founder_checkin`: answers to the usual blockers with links, and the `depositAnnouncement` for their regulars). Neither asks for a reply; replies still reach the founder. Pros who don't come through `/start` (their first sign-in with a code, link, Apple or Google creates the account) get the founder welcome on that sign-in (`welcomeNewPro`, `lib/welcome.ts`, accounts under 3 hours old only). Both go through `notifyOnce` (`notifications/log.ts`), logged as `<template>:<tech id>`.
- The daily cron also sends two setup reminders to pros with no card and no pay link yet (`setup_nudge_first` about a day after sign-up, `setup_nudge_next_booking` about three days after; `SETUP_NUDGE_*` in `config.ts`), each once (`notification_log` template `<template>:<tech id>`). They name what's left (`lib/setup.ts`) and mention the trial only if `trialEligible`. After the first pay link, until they add a card: one `first_link_followup` email 20 hours to 7 days later (`FIRST_LINK_FOLLOWUP_*`, logged as `first_link_followup:<tech id>`, skipped while trial eligibility can't be checked), and a card line (`nextLinkCardLine` in `billing.ts`) in the "client paid" and "client says they sent it" emails. The dashboard checklist ends with step 4, "Send your first pay link" (no card needed); the trial card appears on New appointment from the second.
- **Nurture drip** (`lib/drip.ts`, tested; cron `sendNurtureDrip`): after the first pay link and the day-1 `first_link_followup`, pros with no subscription get four niche-specific emails (template `nurture`) at days 4, 9, 16 and 24, one step per run, at least 3 days apart, skipped past day 35, logged `nurture_<step>:<tech id>`. Niche lines are qualitative, from published booking policies, never unsourced stats. Doesn't send until `MAIL_POSTAL_ADDRESS` is set.
- **Marketing email** (drip, setup reminders, founder check-in, first-link follow-up) goes through `notifyMarketingOnce` (`notifications/log.ts`): skipped if `profiles.marketing_opt_out_at` is set (`20261017000000`), and sent with a footer unsubscribe link (`/unsubscribe`, asks first), the postal address (CAN-SPAM) and RFC 8058 one-click headers (`/api/unsubscribe`, POST). Links are signed (`lib/unsubscribe.ts`, HMAC of the tech id). Account, billing and booking emails stay transactional and always send.
- The Stripe billing portal (`portalConfigurationId`, `PORTAL_VERSION`) asks why on cancel (reasons in the Stripe dashboard); no discount offers. Bump `PORTAL_VERSION` to push changed settings to the existing configuration.
- The daily cron emails techs `TRIAL_ENDING_NOTICE_DAYS` before the first charge, once per subscription (`notification_log` template `trial_ending:<sub id>`). The email opens with what Dibs did for them in the trial (`lib/savings.ts`); if that lookup fails, the email still goes out.
- Enforce the pay-link gate on the server (`createAppointment`, via `canCreatePayLink`) and in the database policy, not only in the UI.

**Ads measurement (Meta)**

- Off unless `NEXT_PUBLIC_META_PIXEL_ID` and `META_CAPI_TOKEN` are set. The browser Pixel runs on marketing pages and sign-in only; never add it to pay links, menu pages or the dashboard. The snippet is inline HTML at the top of the page (`components/meta-pixel.tsx`), not a script that waits for hydration: waiting took 2–3 s on phones and lost most landing page views from ad clicks. `PixelPageViews` tracks client-side navigations only.
- Landing "Start free" buttons go to `/start`. That page fires two browser Pixel funnel events via `trackPixel` (no email): `StartSignup` (custom) on arrival and `Lead` when the pro reaches the save step.
- Conversions go server-side through `lib/meta.ts`, for pros only (never client data): `CompleteRegistration` when `/start` creates the account (or on a new pro's first code sign-in), `StartTrial` when a trial starts, `Purchase` whenever a pro adds their card in Checkout (trial or not, value $29), `Subscribe` on the first paid period. Each has a stable `event_id` so Meta drops duplicates. Tracking failures are logged, never thrown.
- If this changes what's shared with Meta, update the Privacy Policy.

**Notifications**

- App code sends messages only through `notify({ to, template, data })` from `@/lib/notifications`. Messages to a client pass `replyTo: <the pro's email>` (booking confirmed, reminders, cancellation, refund, no-show, deposit not received), so a client's reply ("running late") reaches their pro; everything else replies to the template's address or `EMAIL_REPLY_TO`. Never import Resend (or a future SMS SDK) anywhere else.
- Add a message type by adding it to `TemplateData` and `renderers` in `templates.ts`. Keep `text` short, because it doubles as the SMS body.
- Add a texting provider by implementing `Notifier` (`channel: "sms"`) in a new file, adding its name to `SMS_PROVIDER` in `env.ts`, and adding a case to `createSmsNotifier()`.
- Scheduled messages write a row to `notification_log` so retries don't send twice.

**UI (mobile-first)**

- Write base styles for phones. Add `sm:`/`md:` only to enhance larger screens.
- Tap targets are at least 44px (`min-h-12` on buttons and inputs). Inputs use `text-base` so iOS doesn't zoom in on focus.
- Use single-column layouts, primary actions at the bottom within thumb reach, and respect `env(safe-area-inset-*)`.
- Use the right `type`, `inputMode` and `autoComplete` on inputs (`email`, `tel`, `name`).
- Use the design tokens, not raw hex colors. Brand colors are black (`ink`) and hot pink (`pink`). Marketing pages and sign-in set `data-theme="dark"` (black, hot-pink buttons with black text); a nested `data-theme="light"` gives a light band. Pay links stay light (deeper rose `brand`, which holds white text) with a black header.
- The pro's app ("Pink Pop"): pink header with the lowercase wordmark (`APP_NAME.toLowerCase()` + a white dot) in the display face (`font-display`, Bricolage Grotesque; page `h1`s use it too), black tab bar, and primary buttons in hot pink with black text: `(tech)/layout.tsx` sets `--action`/`--action-foreground`, which `bg-action` in `Button` reads (elsewhere it falls back to `brand`). Links stay `text-brand`: hot-pink text on cream is too faint. The dashboard's greeting continues the header as one pink band, so it renders its own `<InstallBanner placement="page" />` below it. Emoji stay neutral for every kind of pro (📅, 👥, 👋).
- **Dark mode** (pro's app only): a Dark/Light button in the header (`theme-toggle.tsx`) sets the `dibs-theme` cookie; `(tech)/layout.tsx` reads it to set `data-theme` on the app wrapper (marked `data-app`) and the status-bar color (`generateViewport`, `lib/theme.ts`), so there's no flash. Tokens do most of the work; the `dark:` variant follows `data-theme`, not the phone setting, and is for the few places on the pink band or ink panels. Pay links, menu pages and quote pages stay light.
- Shared look (`globals.css`): `card` (white, hairline ring, soft warm shadow, 24px radius), `rise` (cards fade up on load, staggered with `--i`), `press` (small squeeze on tap), `pop` (a check or stamp popping in); all motion stops under `prefers-reduced-motion`. Payment-app colors are tokens (`bg-cashapp`, `bg-zelle`, `bg-venmo`), shown as initials, never logos.
- Dashboard home (`dashboard/home.tsx`, data in `pulse.ts`): pink greeting band with two tappable stats (booked & paid, waiting on a deposit) or the setup ring; then New appointment, Needs you (deposits to check, refunds to send, did they show), Up next as a ticket, results, tiles, menu page; setup steps fold into slim rows once done. The tab bar has icons and a raised pink "+" for New appointment in the middle. First-run tour (`dashboard/tour.tsx`): full screen on phones (a centered card on larger screens), with short cards (how Dibs works, the +, the client paying, what runs on its own, their own page (the live look picker, compact: heading first, one swipeable row each of styles and colors), the home screen, then why it's worth it: a no-show in the pro's own price and deposit, and a Cash App deposit vs Dibs), ending with the setup steps left and a button to the next one; shown once per account (`profiles.tour_seen_at`, `20261018000000`, set by the pro on close; the browser also remembers it, keyed by account so a shared phone still shows it to a new pro; the trade picker sends a new pro back to the dashboard so it opens) to pros with no pay link yet, after the "What do you do?" picker, and again from "Take the 30-second tour" (`TourLauncher`, or `/dashboard?tour=1`).
- Pay page (`pay/[id]/ui.tsx`, shared with `/demo`): black header with the pro's name, the booking as a ticket (stamp when booked), the refund rule as a dated two-step timeline above the full policy (or a line saying it can no longer be refunded when booked inside the window), a big "I agree" card.
- Every inner tech page starts with `<BackLink>` to its parent (Services → Dashboard, Edit service → Services). Don't rely on the bottom tab bar alone.

## Commands

```bash
npm run dev          # local dev at http://localhost:3000
npm run check        # lint + typecheck + prettier check
npm test             # unit tests (node:test via tsx, src/**/*.test.ts)
npm run build        # production build
npm run format       # prettier --write
npm run db:types     # regenerate Supabase types (needs SUPABASE_PROJECT_ID + `npx supabase login`)

# Stripe webhooks locally (two terminals)
stripe listen --forward-to localhost:3000/api/stripe/webhook
stripe listen --forward-connect-to localhost:3000/api/stripe/connect/webhook
```

## Deploying (Vercel)

- Env vars live in Vercel → Settings → Environment Variables. After changing any, redeploy.
- `NEXT_PUBLIC_*` vars must be type **Config**, not Secret. They are inlined at build time, and Secret values arrive empty in the build (symptom: `Invalid or missing public env vars: ... (missing)`). Redeploy without the build cache after changing them.
- Server keys (`SUPABASE_SECRET_KEY`, `STRIPE_SECRET_KEY`, webhook secrets, `RESEND_API_KEY`, `CRON_SECRET`) stay **Secret**.
- Env errors name each key as `(missing)` or `(invalid)`; check Vercel → Logs.
- Stripe webhook destinations point at the production domain (`https://getdibs.pro/...`; the repo and Vercel project keep the old `lash-saver` name, and `lash-saver.vercel.app` still serves the app so old pay links work), never a per-deployment URL.

Apply migrations with the Supabase CLI (`npx supabase db push`) or paste them into the SQL editor.
