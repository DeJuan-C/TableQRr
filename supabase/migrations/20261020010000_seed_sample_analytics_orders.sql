alter table public.orders
  add column if not exists is_sample boolean not null default false,
  add column if not exists sample_key text;

create unique index if not exists orders_sample_key_uidx
  on public.orders (sample_key)
  where sample_key is not null;

drop policy if exists "Analytics admins can read sample orders" on public.orders;
create policy "Analytics admins can read sample orders"
  on public.orders
  for select
  to authenticated
  using (is_sample and (select public.is_active_admin()));

grant select on public.orders to authenticated;
grant select on public.order_item, public.bill, public.payment to authenticated;

drop policy if exists "Analytics admins can read sample order items" on public.order_item;
create policy "Analytics admins can read sample order items"
  on public.order_item
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.orders o
      where o.order_id = order_item.order_id
        and o.is_sample
        and (select public.is_active_admin())
    )
  );

drop policy if exists "Analytics admins can read sample bills" on public.bill;
create policy "Analytics admins can read sample bills"
  on public.bill
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.orders o
      where o.order_id = bill.order_id
        and o.is_sample
        and (select public.is_active_admin())
    )
  );

drop policy if exists "Analytics admins can read sample payments" on public.payment;
create policy "Analytics admins can read sample payments"
  on public.payment
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.bill b
      join public.orders o on o.order_id = b.order_id
      where b.bill_id = payment.bill_id
        and o.is_sample
        and (select public.is_active_admin())
    )
  );

with base_day as (
  select (now() at time zone 'Asia/Manila')::date as report_day
),
order_specs (day_offset, order_hour, order_minute, payment_method) as (
  values
    (0, 12, 10, 'cash'),
    (1, 10, 15, 'gcash'),
    (2, 12, 40, 'maya'),
    (3, 15, 5, 'cash'),
    (4, 18, 25, 'gcash'),
    (5, 20, 10, 'cash'),
    (6, 11, 30, 'maya'),
    (7, 14, 50, 'gcash'),
    (8, 17, 20, 'cash'),
    (9, 19, 45, 'maya'),
    (10, 10, 55, 'gcash'),
    (11, 13, 35, 'cash'),
    (12, 16, 10, 'maya'),
    (13, 20, 35, 'gcash')
),
line_specs (day_offset, menu_id, quantity) as (
  values
    (0, 1, 1), (0, 5, 2), (0, 7, 2),
    (1, 4, 1), (1, 5, 2), (1, 7, 2),
    (2, 8, 2), (2, 6, 2), (2, 7, 3),
    (3, 3, 1), (3, 5, 2), (3, 7, 2),
    (4, 2, 2), (4, 5, 2), (4, 6, 1),
    (5, 4, 1), (5, 8, 1), (5, 7, 3),
    (6, 1, 2), (6, 5, 2), (6, 6, 2),
    (7, 3, 1), (7, 4, 1), (7, 7, 2),
    (8, 2, 2), (8, 8, 1), (8, 5, 2),
    (9, 1, 1), (9, 6, 3), (9, 7, 2),
    (10, 4, 1), (10, 5, 2), (10, 8, 1),
    (11, 3, 1), (11, 7, 3), (11, 6, 2),
    (12, 2, 2), (12, 5, 2), (12, 8, 1),
    (13, 1, 1), (13, 4, 1), (13, 7, 2)
),
sample_payload as (
  select
    s.day_offset,
    s.payment_method,
    'ANALYTICS_SAMPLE:' || to_char(b.report_day - s.day_offset, 'YYYYMMDD') as sample_key,
    case
      when s.day_offset = 0 then now() - interval '1 hour'
      else ((b.report_day - s.day_offset)::timestamp
        + make_interval(hours => s.order_hour, mins => s.order_minute))
        at time zone 'Asia/Manila'
    end as created_at,
    sum(m.price * l.quantity) as subtotal
  from order_specs s
  cross join base_day b
  join line_specs l on l.day_offset = s.day_offset
  join public.menu m on m.menu_id = l.menu_id
  group by s.day_offset, s.payment_method, s.order_hour, s.order_minute, b.report_day
),
seeded_orders as (
  insert into public.orders (
    table_id, order_type, order_status, subtotal, created_at, is_sample, sample_key
  )
  select
    1, 'dine-in', 'served', p.subtotal, p.created_at, true, p.sample_key
  from sample_payload p
  on conflict (sample_key) where sample_key is not null do nothing
  returning order_id, sample_key, subtotal
),
seeded_items as (
  insert into public.order_item (order_id, menu_id, quantity, item_subtotal)
  select
    o.order_id,
    l.menu_id,
    l.quantity,
    m.price * l.quantity
  from seeded_orders o
  join sample_payload p on p.sample_key = o.sample_key
  join line_specs l on l.day_offset = p.day_offset
  join public.menu m on m.menu_id = l.menu_id
  returning order_id
),
seeded_bills as (
  insert into public.bill (order_id, total_amount, bill_requested, bill_status)
  select o.order_id, o.subtotal, true, 'paid'
  from seeded_orders o
  where exists (select 1 from seeded_items i where i.order_id = o.order_id)
  returning bill_id, order_id
),
seeded_payments as (
  insert into public.payment (bill_id, payment_method, payment_reference, payment_status)
  select
    b.bill_id,
    p.payment_method,
    o.sample_key,
    'paid'
  from seeded_bills b
  join seeded_orders o on o.order_id = b.order_id
  join sample_payload p on p.sample_key = o.sample_key
  returning payment_id
)
select count(*) as seeded_sample_payments from seeded_payments;
