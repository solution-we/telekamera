create extension if not exists pgcrypto;

create table if not exists public.admin_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email_normalized text not null unique,
  status text not null default 'active' check (status in ('active', 'suspended')),
  must_change_password boolean not null default true,
  password_changed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_login_at timestamptz
);

create table if not exists public.releases (
  id uuid primary key default gen_random_uuid(),
  platform text not null check (platform in ('android', 'windows')),
  version text not null,
  build_number text not null,
  channel text not null check (channel in ('stable', 'beta', 'prerelease')),
  status text not null default 'draft' check (status in ('draft', 'published', 'unpublished', 'archived')),
  release_notes text not null default '',
  release_date timestamptz not null default now(),
  minimum_os text,
  published_at timestamptz,
  archived_at timestamptz,
  created_by uuid references public.admin_accounts(user_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (platform, version, build_number, channel)
);

create index if not exists releases_public_lookup_idx
  on public.releases (platform, channel, status, published_at desc);
create index if not exists releases_archive_idx
  on public.releases (platform, release_date desc);

create table if not exists public.release_binaries (
  id uuid primary key default gen_random_uuid(),
  release_id uuid not null references public.releases(id) on delete cascade,
  installer_format text not null check (installer_format in ('apk', 'exe', 'msi')),
  original_filename text not null,
  storage_key text not null unique,
  content_type text not null,
  file_size bigint not null check (file_size >= 0),
  sha256 char(64) not null check (sha256 ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  unique (release_id, installer_format)
);

create table if not exists public.upload_sessions (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null references public.admin_accounts(user_id) on delete cascade,
  platform text not null check (platform in ('android', 'windows')),
  version text not null,
  build_number text not null,
  channel text not null check (channel in ('stable', 'beta', 'prerelease')),
  release_notes text not null default '',
  release_date timestamptz not null,
  minimum_os text,
  installer_format text not null check (installer_format in ('apk', 'exe', 'msi')),
  original_filename text not null,
  content_type text not null,
  declared_size bigint not null check (declared_size > 0),
  storage_key text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid references public.admin_accounts(user_id) on delete set null,
  action text not null,
  subject_type text,
  subject_id text,
  request_ip_hash char(64),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists audit_events_recent_idx on public.audit_events (created_at desc);

create table if not exists public.rate_limit_buckets (
  bucket_key char(64) primary key,
  attempts integer not null default 0,
  window_started_at timestamptz not null default now(),
  blocked_until timestamptz
);

create or replace function public.consume_login_attempt(
  p_bucket_key char(64), p_max_attempts integer, p_window_seconds integer, p_lockout_seconds integer
) returns boolean
language plpgsql security definer set search_path = public as $$
declare v_allowed boolean;
begin
  insert into public.rate_limit_buckets (bucket_key, attempts, window_started_at)
  values (p_bucket_key, 1, now())
  on conflict (bucket_key) do update set
    attempts = case
      when rate_limit_buckets.blocked_until > now() then rate_limit_buckets.attempts
      when rate_limit_buckets.blocked_until <= now() then 1
      when rate_limit_buckets.window_started_at < now() - make_interval(secs => p_window_seconds) then 1
      else rate_limit_buckets.attempts + 1
    end,
    window_started_at = case
      when rate_limit_buckets.blocked_until <= now() then now()
      when rate_limit_buckets.window_started_at < now() - make_interval(secs => p_window_seconds) then now()
      else rate_limit_buckets.window_started_at
    end,
    blocked_until = case
      when rate_limit_buckets.blocked_until > now() then rate_limit_buckets.blocked_until
      when rate_limit_buckets.blocked_until <= now() then null
      when rate_limit_buckets.window_started_at < now() - make_interval(secs => p_window_seconds) then null
      when rate_limit_buckets.attempts + 1 >= p_max_attempts then now() + make_interval(secs => p_lockout_seconds)
      else null
    end
  returning (blocked_until is null or blocked_until <= now()) and attempts <= p_max_attempts into v_allowed;
  return v_allowed;
end;
$$;

create or replace function public.reset_login_attempts(p_bucket_key char(64))
returns void language sql security definer set search_path = public as $$
  delete from public.rate_limit_buckets where bucket_key = p_bucket_key;
$$;

alter table public.admin_accounts enable row level security;
alter table public.releases enable row level security;
alter table public.release_binaries enable row level security;
alter table public.upload_sessions enable row level security;
alter table public.audit_events enable row level security;
alter table public.rate_limit_buckets enable row level security;

drop policy if exists "Public can read published releases" on public.releases;
create policy "Public can read published releases" on public.releases
  for select to anon, authenticated using (status = 'published');
drop policy if exists "Public can read binaries for published releases" on public.release_binaries;
create policy "Public can read binaries for published releases" on public.release_binaries
  for select to anon, authenticated using (
    exists (select 1 from public.releases r where r.id = release_id and r.status = 'published')
  );

revoke all on public.admin_accounts, public.upload_sessions, public.audit_events, public.rate_limit_buckets from anon, authenticated;
revoke insert, update, delete on public.releases, public.release_binaries from anon, authenticated;
revoke select on public.releases, public.release_binaries from anon, authenticated;
grant select (id, platform, version, build_number, channel, status, release_notes, release_date, minimum_os, published_at, updated_at) on public.releases to anon, authenticated;
grant select (id, release_id, installer_format, original_filename, content_type, file_size, sha256, created_at) on public.release_binaries to anon, authenticated;
grant all on public.admin_accounts, public.releases, public.release_binaries, public.upload_sessions, public.audit_events, public.rate_limit_buckets to service_role;
revoke all on function public.consume_login_attempt(char, integer, integer, integer) from public, anon, authenticated;
revoke all on function public.reset_login_attempts(char) from public, anon, authenticated;
grant execute on function public.consume_login_attempt(char, integer, integer, integer) to service_role;
grant execute on function public.reset_login_attempts(char) to service_role;
