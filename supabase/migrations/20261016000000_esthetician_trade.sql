-- A new kind of pro: esthetician. Must match TRADES in src/lib/trades.ts.
alter table public.profiles drop constraint profiles_trade_check;
alter table public.profiles add constraint profiles_trade_check check (
  trade in ('barber', 'tattoo', 'nails', 'lashes', 'esthetician', 'hair', 'fitness', 'detailing', 'photography', 'catering', 'other')
);
