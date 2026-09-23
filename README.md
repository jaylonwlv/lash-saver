# Dibs

Deposits and no-show protection for independent pros who book clients through Instagram DMs. Clients call dibs on a slot by paying a deposit.

Built with Next.js 16, Supabase, Stripe Connect (Express), and Resend, deployed on Vercel. See [CLAUDE.md](./CLAUDE.md) for the product overview, architecture, and coding rules.

## Setup

1. `npm install`
2. `cp .env.example .env.local` and fill in the keys.
3. Apply `supabase/migrations/*.sql` to your Supabase project (`npx supabase db push`).
4. In Supabase Auth → URL Configuration, add `http://localhost:3000/auth/callback` (and your production URL) to the redirect URLs.
5. `npm run dev`
