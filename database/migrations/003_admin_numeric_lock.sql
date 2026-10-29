-- Retire the legacy email/password identity fields. Existing UUIDs stay in place
-- for release ownership and audit references, but no longer point to auth.users.
alter table public.admin_accounts drop constraint if exists admin_accounts_user_id_fkey;
alter table public.admin_accounts drop column if exists email_normalized;
alter table public.admin_accounts drop column if exists must_change_password;
alter table public.admin_accounts drop column if exists password_changed_at;

drop function if exists public.consume_login_attempt(char, integer, integer, integer);
drop function if exists public.reset_login_attempts(char);

create table if not exists public.admin_access_settings (
  singleton boolean primary key default true check (singleton),
  pin_hash text not null,
  updated_at timestamptz not null default now()
);

alter table public.admin_access_settings enable row level security;
revoke all on public.admin_access_settings from anon, authenticated;
grant all on public.admin_access_settings to service_role;

create or replace function public.verify_admin_pin(
  p_bucket_key char(64), p_candidate_pin text, p_initial_pin text
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_pin_hash text;
  v_attempts integer;
  v_window_started_at timestamptz;
  v_blocked_until timestamptz;
  v_matches boolean := false;
begin
  select pin_hash into v_pin_hash
    from public.admin_access_settings where singleton = true;

  if v_pin_hash is null and (p_initial_pin is null or p_initial_pin !~ '^[0-9]{1,12}$') then
    return jsonb_build_object('ok', false, 'unavailable', true);
  end if;

  insert into public.rate_limit_buckets (bucket_key, attempts, window_started_at)
    values (p_bucket_key, 0, now()) on conflict (bucket_key) do nothing;
  select attempts, window_started_at, blocked_until
    into v_attempts, v_window_started_at, v_blocked_until
    from public.rate_limit_buckets where bucket_key = p_bucket_key for update;

  if v_blocked_until is not null and v_blocked_until > now() then
    return jsonb_build_object('ok', false, 'locked', true, 'attempts_remaining', 0);
  end if;

  if v_window_started_at < now() - interval '30 minutes'
     or (v_blocked_until is not null and v_blocked_until <= now()) then
    v_attempts := 0;
    v_window_started_at := now();
    v_blocked_until := null;
    update public.rate_limit_buckets set attempts = 0, window_started_at = now(), blocked_until = null
      where bucket_key = p_bucket_key;
  end if;

  if v_pin_hash is null then
    v_matches := p_candidate_pin = p_initial_pin;
  elsif p_candidate_pin ~ '^[0-9]{1,12}$' then
    v_matches := crypt(p_candidate_pin, v_pin_hash) = v_pin_hash;
  end if;

  if v_matches then
    if v_pin_hash is null then
      insert into public.admin_access_settings (singleton, pin_hash)
        values (true, crypt(p_initial_pin, gen_salt('bf')))
        on conflict (singleton) do nothing;
    end if;
    delete from public.rate_limit_buckets where bucket_key = p_bucket_key;
    return jsonb_build_object('ok', true, 'locked', false, 'attempts_remaining', 3);
  end if;

  v_attempts := v_attempts + 1;
  if v_attempts >= 3 then
    v_blocked_until := now() + interval '30 minutes';
  else
    v_blocked_until := null;
  end if;
  update public.rate_limit_buckets
    set attempts = v_attempts, window_started_at = v_window_started_at, blocked_until = v_blocked_until
    where bucket_key = p_bucket_key;

  return jsonb_build_object(
    'ok', false,
    'locked', v_attempts >= 3,
    'attempts_remaining', greatest(0, 3 - v_attempts)
  );
end;
$$;

create or replace function public.set_admin_pin(p_new_pin text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_new_pin !~ '^[0-9]{1,12}$' then raise exception 'The code must contain 1 to 12 digits.'; end if;
  insert into public.admin_access_settings (singleton, pin_hash, updated_at)
    values (true, crypt(p_new_pin, gen_salt('bf')), now())
    on conflict (singleton) do update set pin_hash = excluded.pin_hash, updated_at = now();
end;
$$;

revoke all on function public.verify_admin_pin(char, text, text) from public, anon, authenticated;
revoke all on function public.set_admin_pin(text) from public, anon, authenticated;
grant execute on function public.verify_admin_pin(char, text, text) to service_role;
grant execute on function public.set_admin_pin(text) to service_role;
