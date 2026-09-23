@AGENTS.md

# Lash Saver

## Product

Lash Saver helps independent lash techs protect themselves from no-shows. Techs book clients through **Instagram DMs**, not a booking site, so the product fits that flow:

1. A tech signs up, connects Stripe (Express), and adds services with prices and deposit amounts.
2. In a DM, the tech sends the client a link: their booking page `/b/[slug]`, or a pay link for one appointment.
3. The client picks a time, enters their name and email/phone, and pays the deposit through Stripe Checkout. The slot is held for `DEPOSIT_HOLD_MINUTES` until the deposit is paid.
4. The client gets a confirmation and reminders (email now, SMS later).
5. After the appointment, the tech marks it **completed** (the deposit goes toward the price) or **no-show** (the tech keeps the deposit). A cancellation inside the tech's window forfeits the deposit. An earlier cancellation gets a refund.

**Words to use.** Say _tech_ (the business user, who signs in) and _client_ (the end customer, who never has an account). Say _deposit_, _no-show_ and _booking page_. Don't say "customer", "user" or "stylist" in UI text.

**Users are on phones.** Techs run their business from their phone, and clients open links inside Instagram's in-app browser. Design and test at 375px first.

## Stack

- **Next.js 16** (App Router, React 19, TypeScript strict) on **Vercel**. See the AGENTS.md note: read `node_modules/next/dist/docs/` before using a Next API you're not sure about. `middleware.ts` is now `proxy.ts`. `params`, `searchParams`, `cookies()` and `headers()` are async.
- **Tailwind CSS v4.** Design tokens live in `src/app/globals.css` (`bg-brand`, `text-muted`, `border-line`, …).
- **Supabase** for auth (email magic link, techs only) and Postgres with RLS. Uses `@supabase/ssr`.
- **Stripe Connect** with Express accounts. Deposits are **destination charges** made on the platform with `transfer_data.destination` set to the tech's account and an `application_fee_amount` (`STRIPE_PLATFORM_FEE_BPS`).
- **Resend** for email, behind the notifications interface.
- **zod** for validating env vars and every input from outside the app.
- **Vercel Cron** for reminders and expiring unpaid holds (`vercel.json`). It runs daily (14:00 UTC) because the Vercel Hobby plan allows only daily crons. On Pro, switch to hourly (`0 * * * *`) for tighter reminder timing.

## Folder structure

```
src/
  proxy.ts                        Refreshes the Supabase session; guards /dashboard
  app/
    (marketing)/page.tsx          Landing page
    (auth)/login/                 Magic-link sign-in (page, form, server action)
    auth/callback/route.ts        Swaps the magic-link code for a session
    (tech)/layout.tsx             Signed-in shell: server-side auth check + bottom tab bar (nav.tsx)
    (tech)/dashboard/             Tech home: setup checklist (profile → Stripe → services), booking link
    (tech)/dashboard/profile/     Business name, booking link (slug), time zone, policy; sign out
    (tech)/dashboard/services/    List / new / [id] edit; hide/show instead of delete
    (tech)/dashboard/stripe/      Onboarding + Express dashboard actions; refresh/ and return/ routes
    b/[slug]/page.tsx             Public booking page (linked from IG DMs)
    api/stripe/connect/webhook/   Connect events (account.updated)
    api/stripe/webhook/           Platform events (checkout, refunds): source of truth for deposits
    api/cron/reminders/           Vercel Cron job
  components/ui/                  Small shared building blocks (Button, Input, Textarea, Select)
  lib/
    config.ts                     App constants (name, hold time, reminder offsets)
    env.ts / env.public.ts        zod-checked env (server-only / browser-safe)
    money.ts                      Cents helpers, fee math, dollarsToCents for form input
    format.ts                     Display helpers (formatDuration)
    forms.ts                      FormState, formValues, fieldErrors for Server Action forms
    supabase/                     client.ts (browser), server.ts (RLS as user),
                                  admin.ts (secret key, bypasses RLS), proxy.ts,
                                  database.types.ts
    stripe/                       server.ts (secret key), client.ts (Stripe.js),
                                  connect.ts (Accounts v2: create, onboarding link, status sync)
    notifications/                notify() + Notifier interface, Resend email, SMS stub, templates
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

- Money is **integer cents** everywhere: DB, code, Stripe. Format only in the UI, using `formatCents`.
- Every Stripe call that creates something passes an `idempotencyKey` built from our own ids.
- **Webhooks are the source of truth** for payment state. Never mark a deposit paid because of a redirect or a client-side callback. Webhook handlers must be idempotent.
- Check each webhook's signature against the matching secret (platform or Connect).

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
- Stripe webhook destinations point at the production domain (`https://lash-saver.vercel.app/...`), never a per-deployment URL.

Apply migrations with the Supabase CLI (`npx supabase db push`) or paste them into the SQL editor.
