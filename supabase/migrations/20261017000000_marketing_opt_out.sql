-- Pros can unsubscribe from tips and offers (the nurture drip, setup reminders,
-- check-ins): set by the /unsubscribe page or a one-click unsubscribe from the
-- email client. Account and booking emails still go out. Server-written only
-- (techs' column grants don't include it).
alter table public.profiles add column marketing_opt_out_at timestamptz;
