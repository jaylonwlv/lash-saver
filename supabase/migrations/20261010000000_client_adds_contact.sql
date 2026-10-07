-- Quick pay links: the pro can send a pay link with just the client's name, and
-- the client adds their own email or phone on the pay page before paying. So an
-- appointment can exist without contact details until then. Server code asks the
-- client for one before taking a deposit.
alter table public.appointments drop constraint client_contactable;
