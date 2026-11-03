-- Short pay links: getdibs.pro/pay/k7m2x9qa4h instead of the 36-character appointment id.
-- The code is what grants access to the pay page (like the id did), so it's random:
-- 10 characters from a 31-letter alphabet (no 0/o, 1/l/i), about 49 bits. Old /pay/<uuid>
-- links keep working. Must match PAY_CODE_ALPHABET in src/lib/pay-codes.ts (tested).

create or replace function public.new_pay_code() returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  alphabet constant text := '23456789abcdefghjkmnpqrstuvwxyz';
  -- A v4 uuid is 122 random bits from the system's secure generator. Skip bytes 6 and 8,
  -- which carry the version and variant bits.
  b bytea := uuid_send(gen_random_uuid());
  picks constant int[] := array[0, 1, 2, 3, 4, 5, 7, 9, 10, 11];
  code text := '';
  i int;
begin
  foreach i in array picks loop
    code := code || substr(alphabet, (get_byte(b, i) % 31) + 1, 1);
  end loop;
  return code;
end;
$$;

-- Left callable: column defaults run as the inserting role (techs create pay links as
-- themselves), and a random string reveals nothing.

-- Existing appointments get a code too (a volatile default is evaluated per row).
alter table public.appointments
  add column pay_code text not null default public.new_pay_code();

alter table public.appointments
  add constraint appointments_pay_code_key unique (pay_code);
