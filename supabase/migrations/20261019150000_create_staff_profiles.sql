create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default 'Staff member',
  email text,
  username text,
  role text not null default 'cashier'
    check (role in ('admin', 'cashier', 'kitchen')),
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists profiles_username_lower_uidx
  on public.profiles (lower(username))
  where username is not null;

create unique index if not exists profiles_email_lower_uidx
  on public.profiles (lower(email))
  where email is not null;

alter table public.profiles enable row level security;

create or replace function public.is_active_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where user_id = (select auth.uid())
      and role = 'admin'
      and is_active
  );
$$;

revoke all on function public.is_active_admin() from public;
grant execute on function public.is_active_admin() to authenticated;

drop policy if exists "Profiles are readable by owner or active admins" on public.profiles;
create policy "Profiles are readable by owner or active admins"
  on public.profiles
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or (select public.is_active_admin())
  );

drop policy if exists "Profiles are editable by owner or active admins" on public.profiles;
create policy "Profiles are editable by owner or active admins"
  on public.profiles
  for update
  to authenticated
  using (
    user_id = (select auth.uid())
    or (select public.is_active_admin())
  )
  with check (
    user_id = (select auth.uid())
    or (select public.is_active_admin())
  );

revoke all on public.profiles from public, anon, authenticated;
grant select on public.profiles to authenticated;
grant update (display_name, username, role, is_active) on public.profiles to authenticated;

create or replace function public.protect_profile_updates()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.user_id <> old.user_id then
    raise exception 'A profile cannot be reassigned to another auth user'
      using errcode = '42501';
  end if;

  if (select auth.uid()) = old.user_id
     and (new.role is distinct from old.role
       or new.is_active is distinct from old.is_active) then
    raise exception 'Users cannot change their own role or active status'
      using errcode = '42501';
  end if;

  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists protect_profile_updates on public.profiles;
create trigger protect_profile_updates
  before update on public.profiles
  for each row
  execute function public.protect_profile_updates();

create or replace function public.create_staff_profile_for_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_name text;
begin
  requested_name := nullif(trim(new.raw_user_meta_data ->> 'display_name'), '');

  insert into public.profiles (user_id, display_name, email)
  values (
    new.id,
    coalesce(requested_name, nullif(split_part(coalesce(new.email, ''), '@', 1), ''), 'Staff member'),
    new.email
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;

create or replace function public.sync_staff_profile_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles
  set email = new.email
  where user_id = new.id;

  return new;
end;
$$;

drop trigger if exists create_staff_profile_after_auth_user_insert on auth.users;
create trigger create_staff_profile_after_auth_user_insert
  after insert on auth.users
  for each row
  execute function public.create_staff_profile_for_auth_user();

drop trigger if exists sync_staff_profile_email_after_auth_user_update on auth.users;
create trigger sync_staff_profile_email_after_auth_user_update
  after update of email on auth.users
  for each row
  when (old.email is distinct from new.email)
  execute function public.sync_staff_profile_email();

revoke all on function public.protect_profile_updates() from public, anon, authenticated;
revoke all on function public.create_staff_profile_for_auth_user() from public, anon, authenticated;
revoke all on function public.sync_staff_profile_email() from public, anon, authenticated;
