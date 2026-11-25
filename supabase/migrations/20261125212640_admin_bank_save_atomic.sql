create or replace function public.admin_bank_save(
  p_id text,
  p_bank_name text,
  p_account_name text,
  p_account_number text,
  p_is_active boolean,
  p_is_default boolean
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  saved_bank public.admin_bank;
begin
  if coalesce(trim(p_id), '') = ''
    or coalesce(trim(p_bank_name), '') = ''
    or coalesce(trim(p_account_name), '') = ''
    or coalesce(trim(p_account_number), '') = '' then
    raise exception using errcode = '22023',
      message = 'Nama bank, pemilik, dan nomor rekening wajib diisi';
  end if;

  if p_is_default and not p_is_active then
    raise exception using errcode = '22023',
      message = 'Rekening utama harus aktif';
  end if;

  if p_is_default then
    lock table public.admin_bank in exclusive mode;
    update public.admin_bank
      set is_default = false,
          updated_at = now()
      where is_default = true and id <> p_id;
  end if;

  insert into public.admin_bank (
    id, bank_name, account_name, account_number,
    is_active, is_default, updated_at
  )
  values (
    p_id, trim(p_bank_name), trim(p_account_name), trim(p_account_number),
    p_is_active, p_is_default, now()
  )
  on conflict (id) do update set
    bank_name = excluded.bank_name,
    account_name = excluded.account_name,
    account_number = excluded.account_number,
    is_active = excluded.is_active,
    is_default = excluded.is_default,
    updated_at = excluded.updated_at
  returning * into saved_bank;

  return to_jsonb(saved_bank);
end;
$function$;

revoke all on function public.admin_bank_save(text, text, text, text, boolean, boolean)
  from public, anon, authenticated;
grant execute on function public.admin_bank_save(text, text, text, text, boolean, boolean)
  to service_role;
