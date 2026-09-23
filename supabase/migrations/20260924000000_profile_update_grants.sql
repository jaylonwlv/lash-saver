-- Techs may edit only the self-service fields of their own profile.
--
-- The init migration tried `revoke update (stripe_...) on profiles`, but Supabase
-- grants table-level UPDATE to `authenticated` by default, and a column-level
-- revoke does not override a table-level grant. Replace the table-level grant
-- with an explicit column list so Stripe status and email stay server-only.
revoke insert, update, delete on public.profiles from anon, authenticated;

grant update (
  business_name,
  slug,
  instagram_handle,
  phone,
  timezone,
  cancellation_window_hours,
  policy_text
) on public.profiles to authenticated;
