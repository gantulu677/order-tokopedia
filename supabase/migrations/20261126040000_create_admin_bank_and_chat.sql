-- Admin Bank and Livechat
-- Source of truth: GitHub migration; applied to Supabase as part of the same release package.

create table if not exists public.admin_bank (
  id text primary key,
  bank_name text not null,
  account_name text not null,
  account_number text not null,
  is_active boolean not null default true,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_bank_default_must_be_active check (not is_default or is_active)
);

create unique index if not exists admin_bank_single_default_idx
  on public.admin_bank (is_default)
  where is_default = true;

alter table public.admin_bank enable row level security;
revoke all on table public.admin_bank from anon, authenticated;
grant all on table public.admin_bank to service_role;

insert into public.admin_bank (id, bank_name, account_name, account_number, is_active, is_default)
values
  ('BANK001', 'BCA', 'PT SAMPLE INDONESIA', '1234567890', true, true),
  ('BANK002', 'Mandiri', 'PT SAMPLE INDONESIA', '9876543210', true, false),
  ('BANK003', 'BNI', 'PT SAMPLE INDONESIA', '1122334455', false, false),
  ('BANK004', 'BRI', 'PT SAMPLE INDONESIA', '5566778899', true, false)
on conflict (id) do nothing;

create table if not exists public.admin_chat (
  id text primary key default gen_random_uuid()::text,
  conversation_id text not null,
  phone text not null,
  role text not null check (role in ('admin', 'users')),
  message text not null check (length(trim(message)) > 0),
  created_at timestamptz not null default now()
);

create index if not exists admin_chat_conversation_created_idx
  on public.admin_chat (conversation_id, created_at);

create index if not exists admin_chat_phone_created_idx
  on public.admin_chat (phone, created_at desc);

alter table public.admin_chat enable row level security;
revoke all on table public.admin_chat from anon, authenticated;
grant all on table public.admin_chat to service_role;

-- Sample admin messages. Phone values use the same +62 normalization as admin_tokopedia.
insert into public.admin_chat (id, conversation_id, phone, role, message)
values
  ('CHAT001', '6281234567899', '6281234567899', 'admin', 'Halo! Selamat datang di Customer Service. Ada yang bisa kami bantu?'),
  ('CHAT002', '6281234567898', '6281234567898', 'admin', 'Untuk bantuan pembayaran, silakan kirim bukti transfer Anda.'),
  ('CHAT003', '6281234567897', '6281234567897', 'admin', 'Terima kasih sudah menghubungi kami. Kami akan segera membantu Anda.'),
  ('CHAT004', '6281234567896', '6281234567896', 'admin', 'Silakan informasikan kendala yang Anda alami.')
on conflict (id) do nothing;
