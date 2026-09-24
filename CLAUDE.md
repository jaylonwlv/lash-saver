@AGENTS.md

# Dibs

## Product

**Dibs** helps independent service pros protect themselves from no-shows: the client "calls dibs" on a slot by paying a deposit. It's for anyone who books clients through **Instagram DMs** rather than a booking site (lash techs, nail techs, braiders, tattoo artists, and so on). The product copy stays general ("pros", "your provider"); marketing targets one niche at a time, starting with lash techs, so niche-specific wording belongs in ads, not in the app. The product fits the DM flow:

1. A tech signs up, sets up deposits (**Collect it yourself** with their own Cash App / Zelle / Venmo handles, or **Stripe** Express for cards), and adds services with prices and deposit amounts. No card needed.
   Before their **first pay link**, they add a card in Stripe Checkout to start a **30-day free trial** (`TRIAL_DAYS`), then $29/month (`SUBSCRIPTION_PRICE_CENTS`). Without an active subscription (`trialing`, `active`, or `past_due` as a grace period) they can't create new pay links; existing links, reminders and cancellations keep working.
2. The tech and client agree on a time in the DMs. The tech creates the appointment in the app (**New appointment**), which makes a **pay link** (`/pay/[appointmentId]`), and pastes it into the DM. The link works for `PAY_LINK_VALID_HOURS` or until the appointment starts. The booking page `/b/[slug]` is a menu for the tech's Instagram bio; clients message the tech to book.
3. The client opens the pay link, agrees to the deposit policy (a snapshot is saved with the time they agreed), and pays. **Stripe:** through Stripe Checkout; the webhook confirms the appointment and emails the client and the tech. **Manual:** the client sends the deposit in their own app and taps "I've sent my deposit"; the tech is emailed and taps **Received** (confirms and emails the client) or **Not received**. The tech can also mark a deposit received without the client tapping.
4. The daily cron sends reminders (`REMINDER_OFFSETS_HOURS`, 48h and 24h; email now, SMS later), each logged in `notification_log` as `appointment_reminder_<N>h` so it's sent once. Every email says when the client can still cancel for a refund.
5. The client can cancel from the same link (reschedules happen in the DMs). Before the refund deadline (start minus the cancellation window they agreed to) the deposit is refunded; after it, the deposit is kept. Stripe deposits are refunded automatically; manual ones become `refund_due` and the tech sends the money back themselves, then taps **I sent the refund**. The server decides at submit time and refuses if the page showed different terms. The tech is emailed either way.
6. After the appointment, the tech marks it **completed** (the deposit goes toward the price) or **no-show** (the tech keeps the deposit). A tech cancellation refunds the deposit in full.

The product's job is preventing no-shows: deposit up front, a policy the client agrees to, reminders, easy cancel instead of ghosting, and one tap to keep the deposit. Judge new features against that. Self-serve time slots are a convenience, not the core.

**Words to use.** In code, the business user is the _tech_ (`tech_id`, `(tech)` routes); in UI text call them a _pro_, or "your provider" when talking to their clients, and never name a trade (no "lash tech", "full set"). The end customer is the _client_ (never has an account). Say _deposit_, _no-show_ and _booking page_. Don't say "customer", "user" or "stylist" in UI text. The app name comes from `APP_NAME` in `config.ts`; never hard-code it.

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
    (marketing)/page.tsx          Landing page (static): hero, cost of no-shows, 4 steps with real app
                                  screenshots (images/), features, vs Cash App, pricing, FAQ. Pulls
                                  price, trial and fee from config.ts; keep claims true to the product.
    (marketing)/terms/, privacy/  Terms of Service and Privacy Policy (legal-page.tsx layout). Keep them true to
                                  the product: update them, and LEGAL_UPDATED in config.ts, when data, fees,
                                  providers or billing change. No ad trackers on pay links or booking pages
                                  (the Privacy Policy says so); a Meta Pixel belongs on marketing pages only.
    (auth)/login/                 Email sign-in: 6-digit code (any browser) or link (page, form, actions)
    auth/callback/route.ts        Sign-in link landing: verifies token_hash (any browser) or a PKCE code
    (tech)/layout.tsx             Signed-in shell: server-side auth check + bottom tab bar (nav.tsx)
    (tech)/dashboard/             Tech home: setup checklist (profile → Stripe → services), booking link
    (tech)/dashboard/profile/     Business name, booking link (slug), time zone, policy; sign out
    (tech)/dashboard/services/    List / new / [id] edit; hide/show instead of delete
    (tech)/dashboard/payments/    Deposit method: Cash App / Zelle / Venmo handles, or switch to Stripe
    (tech)/dashboard/stripe/      Onboarding + Express dashboard actions; refresh/ and return/ routes
    (tech)/dashboard/billing/     Subscription status, subscribe/trial card, Stripe billing portal; return/ route after Checkout
    (tech)/dashboard/appointments/ List (needs action / upcoming / waiting / past), new, [id] detail
    b/[slug]/page.tsx             Public booking page: services, how to book (DM), policy
    pay/[id]/                     Public pay page: details, policy + agree checkbox → Stripe Checkout
    api/stripe/connect/webhook/   Connect events (account.updated)
    api/stripe/webhook/           Platform events (checkout, refunds): source of truth for deposits
    api/cron/reminders/           Vercel Cron: expire unpaid pay links, send reminders (reminders.ts: due rule)
  components/ui/                  Small shared building blocks (Button, Input, Textarea, Select, BackLink)
  components/meta-pixel.tsx       Meta Pixel; rendered by (marketing)/layout.tsx and the login page only
  lib/
    config.ts                     App constants (name, pay link validity, checkout lifetime, reminders)
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
    subscription.ts               canSendPayLinks(status), normalizeEmail (no server deps)
    payments.ts                   Manual deposits: manualHandles, canTakeDeposits, paymentAppUrl (no server deps)
    meta.ts                       Meta Conversions API: trackSignUp, trackSubscription (StartTrial, Subscribe)
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
- Keep changes small and focused. Before committing, run `npm run check` and `npm run build`.

**Forms**

- Pattern: a zod schema in `schema.ts`, a Server Action returning `FormState` in `actions.ts`, and a small client form using `useActionState`. See `dashboard/services/`.
- On a validation error, return `{ errors, values }`. Forms use `values` as `defaultValue`, because React resets uncontrolled fields after an action. `Select` is keyed on its `defaultValue` for the same reason.
- On success, `revalidatePath` then `redirect`. Call `redirect` outside `try/catch`.
- Map Postgres errors to field messages where the user can fix them (e.g. `23505` unique violation on `slug`).

**Data and security**

- RLS is **on for every table**. Each new table needs policies in the same migration.
- Supabase grants table-level privileges to `anon`/`authenticated` by default, so a column-level `revoke` does nothing. To limit which columns techs can write, revoke the table privilege and grant specific columns (see `20260924000000_profile_update_grants.sql`).
- `createAdminClient()` bypasses RLS. Use it only where no tech is signed in (webhooks, cron, public booking writes after validation), and scope every query by id yourself.
- Clients never sign in. The public booking page reads through the anon role (`public_profiles` view, active `services`). Every client write goes through server code.
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

**Subscriptions**

- Stripe is the source of truth. `syncSubscription` copies status, trial end, period end and cancel flag onto `profiles` from `customer.subscription.*` webhooks and the Checkout return route. Techs can't write these columns (column grants).
- One trial per person. `trial_claims` stores card and payout-bank fingerprints, normalized email (Gmail dots and +tags removed), Instagram handle and Cash App / Zelle / Venmo handles when a trial starts. A match with another tech means no trial is offered; a reused card found after Checkout ends the trial immediately (`trial_end: "now"`).
- The daily cron emails techs `TRIAL_ENDING_NOTICE_DAYS` before the first charge, once per subscription (`notification_log` template `trial_ending:<sub id>`).
- Enforce the pay-link gate on the server (`createAppointment`), not only in the UI.

**Ads measurement (Meta)**

- Off unless `NEXT_PUBLIC_META_PIXEL_ID` and `META_CAPI_TOKEN` are set. The browser Pixel runs on marketing pages and sign-in only; never add it to pay links, booking pages or the dashboard.
- Conversions go server-side through `lib/meta.ts`, for pros only (never client data): `CompleteRegistration` on a new pro's first sign-in, `StartTrial` when a trial starts, `Subscribe` on the first paid period. Each has a stable `event_id` so Meta drops duplicates. Tracking failures are logged, never thrown.
- If this changes what's shared with Meta, update the Privacy Policy.

**Notifications**

- App code sends messages only through `notify({ to, template, data })` from `@/lib/notifications`. Never import Resend (or a future SMS SDK) anywhere else.
- Add a message type by adding it to `TemplateData` and `renderers` in `templates.ts`. Keep `text` short, because it doubles as the SMS body.
- Add a texting provider by implementing `Notifier` (`channel: "sms"`) in a new file, adding its name to `SMS_PROVIDER` in `env.ts`, and adding a case to `createSmsNotifier()`.
- Scheduled messages write a row to `notification_log` so retries don't send twice.

**UI (mobile-first)**

- Write base styles for phones. Add `sm:`/`md:` only to enhance larger screens.
- Tap targets are at least 44px (`min-h-12` on buttons and inputs). Inputs use `text-base` so iOS doesn't zoom in on focus.
- Use single-column layouts, primary actions at the bottom within thumb reach, and respect `env(safe-area-inset-*)`.
- Use the right `type`, `inputMode` and `autoComplete` on inputs (`email`, `tel`, `name`).
- Use the design tokens, not raw hex colors.
- Every inner tech page starts with `<BackLink>` to its parent (Services → Dashboard, Edit service → Services). Don't rely on the bottom tab bar alone.

## Commands

```bash
npm run dev          # local dev at http://localhost:3000
npm run check        # lint + typecheck + prettier check
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
