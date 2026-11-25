-- Tokopedia admin account roles and product table access model.
alter table public.admin_tokopedia
  add column if not exists role text not null default 'users';

alter table public.admin_tokopedia
  alter column pin drop not null;

alter table public.admin_tokopedia
  drop constraint if exists admin_tokopedia_role_check;

alter table public.admin_tokopedia
  add constraint admin_tokopedia_role_check
  check (role in ('admin', 'users'));

alter table public.admin_tokopedia enable row level security;
revoke all privileges on table public.admin_tokopedia from anon, authenticated;
grant all privileges on table public.admin_tokopedia to service_role;

-- Product catalog stays publicly readable; all writes go through tokopedia-admin.
alter table public.produks enable row level security;
revoke all privileges on table public.produks from anon, authenticated;
grant select on table public.produks to anon, authenticated;
