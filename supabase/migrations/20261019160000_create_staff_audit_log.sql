create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (event_type in (
    'staff_signed_in',
    'staff_signed_out',
    'staff_invited',
    'staff_profile_updated',
    'staff_role_changed',
    'staff_activated',
    'staff_deactivated',
    'price_change',
    'menu_add',
    'menu_delete',
    'bill_void',
    'discount_applied'
  )),
  actor_user_id uuid references auth.users (id) on delete set null,
  actor_name text not null,
  subject_user_id uuid references auth.users (id) on delete set null,
  subject_name text,
  summary text not null,
  details jsonb not null default '{}'::jsonb,
  severity text not null check (severity in ('info', 'warn', 'critical')),
  created_at timestamptz not null default now()
);

create index if not exists audit_log_created_at_id_idx
  on public.audit_log (created_at desc, id desc);
create index if not exists audit_log_actor_user_id_idx
  on public.audit_log (actor_user_id);
create index if not exists audit_log_event_type_idx
  on public.audit_log (event_type);

alter table public.audit_log enable row level security;

revoke all on public.audit_log from public, anon, authenticated;
grant select on public.audit_log to authenticated;
grant insert on public.audit_log to service_role;

drop policy if exists "Audit log is readable by active admins" on public.audit_log;
create policy "Audit log is readable by active admins"
  on public.audit_log
  for select
  to authenticated
  using ((select public.is_active_admin()));

create or replace function public.record_staff_auth_event(p_event_type text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  current_display_name text;
  current_is_active boolean;
  event_id uuid;
  event_summary text;
begin
  if current_user_id is null
     or p_event_type not in ('staff_signed_in', 'staff_signed_out') then
    raise exception 'Invalid staff authentication audit event'
      using errcode = '42501';
  end if;

  select display_name, is_active
    into current_display_name, current_is_active
    from public.profiles
    where user_id = current_user_id;

  if not found or not current_is_active then
    raise exception 'An active staff profile is required'
      using errcode = '42501';
  end if;

  event_summary := case p_event_type
    when 'staff_signed_in' then 'Staff member signed in'
    else 'Staff member signed out'
  end;

  insert into public.audit_log (
    event_type, actor_user_id, actor_name, summary, severity
  )
  values (
    p_event_type, current_user_id, current_display_name, event_summary, 'info'
  )
  returning id into event_id;

  return event_id;
end;
$$;

revoke all on function public.record_staff_auth_event(text) from public, anon;
grant execute on function public.record_staff_auth_event(text) to authenticated;

create or replace function public.audit_staff_profile_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_actor_id uuid := (select auth.uid());
  current_actor_name text;
  changed_fields jsonb := '{}'::jsonb;
  event_name text;
  event_summary text;
  event_severity text := 'info';
begin
  if current_actor_id is null then
    return new;
  end if;

  if new.display_name is distinct from old.display_name then
    changed_fields := changed_fields || jsonb_build_object(
      'display_name', jsonb_build_object('old', old.display_name, 'new', new.display_name)
    );
  end if;
  if new.username is distinct from old.username then
    changed_fields := changed_fields || jsonb_build_object(
      'username', jsonb_build_object('old', old.username, 'new', new.username)
    );
  end if;
  if new.role is distinct from old.role then
    changed_fields := changed_fields || jsonb_build_object(
      'role', jsonb_build_object('old', old.role, 'new', new.role)
    );
  end if;
  if new.is_active is distinct from old.is_active then
    changed_fields := changed_fields || jsonb_build_object(
      'is_active', jsonb_build_object('old', old.is_active, 'new', new.is_active)
    );
  end if;

  if changed_fields = '{}'::jsonb then
    return new;
  end if;

  select display_name
    into current_actor_name
    from public.profiles
    where user_id = current_actor_id;

  if new.role is distinct from old.role then
    event_name := 'staff_role_changed';
    event_summary := 'Changed role for ' || new.display_name;
    event_severity := 'warn';
  elsif new.is_active is distinct from old.is_active then
    event_name := case when new.is_active then 'staff_activated' else 'staff_deactivated' end;
    event_summary := case
      when new.is_active then 'Activated ' || new.display_name
      else 'Deactivated ' || new.display_name
    end;
    event_severity := 'warn';
  else
    event_name := 'staff_profile_updated';
    event_summary := 'Updated profile for ' || new.display_name;
  end if;

  insert into public.audit_log (
    event_type,
    actor_user_id,
    actor_name,
    subject_user_id,
    subject_name,
    summary,
    details,
    severity
  )
  values (
    event_name,
    current_actor_id,
    coalesce(current_actor_name, 'Staff member'),
    new.user_id,
    new.display_name,
    event_summary,
    changed_fields,
    event_severity
  );

  return new;
end;
$$;

drop trigger if exists audit_staff_profile_update on public.profiles;
create trigger audit_staff_profile_update
  after update of display_name, username, role, is_active on public.profiles
  for each row
  when (
    old.display_name is distinct from new.display_name
    or old.username is distinct from new.username
    or old.role is distinct from new.role
    or old.is_active is distinct from new.is_active
  )
  execute function public.audit_staff_profile_update();

revoke all on function public.audit_staff_profile_update() from public, anon, authenticated;

create or replace function public.audit_menu_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_actor_id uuid := (select auth.uid());
  current_actor_name text;
  audit_event_type text;
  audit_summary text;
  audit_severity text;
  audit_details jsonb;
  menu_item_id integer;
  menu_item_name text;
begin
  if tg_op = 'INSERT' then
    audit_event_type := 'menu_add';
    audit_summary := 'Added menu item: ' || coalesce(new.menu_name, '(unnamed item)');
    audit_severity := 'info';
    menu_item_id := new.menu_id;
    menu_item_name := coalesce(new.menu_name, '(unnamed item)');
    audit_details := jsonb_build_object('menu_id', new.menu_id, 'menu_name', new.menu_name, 'price', new.price);
  elsif tg_op = 'DELETE' then
    audit_event_type := 'menu_delete';
    audit_summary := 'Deleted menu item: ' || coalesce(old.menu_name, '(unnamed item)');
    audit_severity := 'warn';
    menu_item_id := old.menu_id;
    menu_item_name := coalesce(old.menu_name, '(unnamed item)');
    audit_details := jsonb_build_object('menu_id', old.menu_id, 'menu_name', old.menu_name, 'price', old.price);
  elsif old.price is distinct from new.price then
    audit_event_type := 'price_change';
    audit_summary := 'Changed price for ' || coalesce(new.menu_name, '(unnamed item)') || ' from ' || old.price || ' to ' || new.price;
    audit_severity := 'warn';
    menu_item_id := new.menu_id;
    menu_item_name := coalesce(new.menu_name, '(unnamed item)');
    audit_details := jsonb_build_object(
      'menu_id', new.menu_id,
      'menu_name', new.menu_name,
      'old_price', old.price,
      'new_price', new.price
    );
  else
    return new;
  end if;

  select display_name
    into current_actor_name
    from public.profiles
    where user_id = current_actor_id;

  insert into public.audit_log (
    event_type, actor_user_id, actor_name, summary, details, severity
  )
  values (
    audit_event_type,
    current_actor_id,
    coalesce(current_actor_name, 'Unattributed database operation'),
    audit_summary,
    audit_details || jsonb_build_object(
      'menu_id', menu_item_id,
      'menu_name', menu_item_name,
      'actor_identified', current_actor_id is not null
    ),
    audit_severity
  );

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists audit_menu_change on public.menu;
create trigger audit_menu_change
  after insert or update or delete on public.menu
  for each row
  execute function public.audit_menu_change();

create or replace function public.audit_bill_void()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_actor_id uuid := (select auth.uid());
  current_actor_name text;
begin
  if new.bill_status is not distinct from old.bill_status
     or lower(coalesce(new.bill_status, '')) <> 'voided' then
    return new;
  end if;

  select display_name
    into current_actor_name
    from public.profiles
    where user_id = current_actor_id;

  insert into public.audit_log (
    event_type,
    actor_user_id,
    actor_name,
    summary,
    details,
    severity
  )
  values (
    'bill_void',
    current_actor_id,
    coalesce(current_actor_name, 'Unattributed database operation'),
    'Voided bill ' || new.bill_id,
    jsonb_build_object(
      'bill_id', new.bill_id,
      'order_id', new.order_id,
      'old_status', old.bill_status,
      'new_status', new.bill_status,
      'total_amount', new.total_amount,
      'actor_identified', current_actor_id is not null
    ),
    'critical'
  );

  return new;
end;
$$;

drop trigger if exists audit_bill_void on public.bill;
create trigger audit_bill_void
  after update of bill_status on public.bill
  for each row
  execute function public.audit_bill_void();

revoke all on function public.audit_menu_change() from public, anon, authenticated;
revoke all on function public.audit_bill_void() from public, anon, authenticated;
