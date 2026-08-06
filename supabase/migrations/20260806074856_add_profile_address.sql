alter table public.users
  add column address text,
  add column province text,
  add column postal_code text;

alter table public.users
  add constraint users_address_length_check
    check (address is null or char_length(address) <= 500),
  add constraint users_province_length_check
    check (province is null or char_length(province) <= 100),
  add constraint users_postal_code_format_check
    check (postal_code is null or postal_code ~ '^[0-9]{5}$');

grant update (name, phone, line_user_id, avatar_url, address, province, postal_code)
  on public.users to authenticated;
