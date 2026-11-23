-- Execute once in the Supabase SQL editor. All access goes through server functions.
create table if not exists public.checkout_orders (
 id text primary key,
 created_at timestamptz not null default now(),
 access_hash text unique not null,
 ip_hash text not null,
 customer jsonb not null,
 items jsonb not null,
 amount bigint not null check (amount >= 100),
 shipping_amount bigint not null default 0,
 delivery text not null check (delivery in ('pickup', 'flat')),
 status text not null check (status in ('creating', 'pending', 'review', 'paid')),
 checkout_url text,
 expires_at timestamptz not null,
 transaction_nsu text unique,
 invoice_slug text,
 capture_method text,
 paid_amount bigint,
 paid_at timestamptz
);
alter table public.checkout_orders enable row level security;
revoke all on public.checkout_orders from anon, authenticated;
grant select, insert, update on public.checkout_orders to service_role;
create index if not exists checkout_orders_rate on public.checkout_orders (ip_hash, created_at);
create or replace function public.create_checkout_order(order_data jsonb)
returns boolean language plpgsql security invoker set search_path = public as $$
begin
 perform pg_advisory_xact_lock(hashtextextended(order_data->>'ip_hash',0));
 if (select count(*) from checkout_orders where ip_hash = order_data->>'ip_hash' and created_at > now() - interval '1 hour') >= 5 then return false; end if;
 insert into checkout_orders(id, access_hash, ip_hash, customer, items, amount, shipping_amount, delivery, status, expires_at)
 values (order_data->>'id', order_data->>'access_hash', order_data->>'ip_hash', order_data->'customer', order_data->'items', (order_data->>'amount')::bigint, (order_data->>'shipping_amount')::bigint, order_data->>'delivery', 'creating', (order_data->>'expires_at')::timestamptz);
 return true;
end $$;
create or replace function public.confirm_checkout_payment(order_id text, transaction_id text, invoice text, method text, paid bigint)
returns void language plpgsql security invoker set search_path = public as $$
begin
 update checkout_orders set status='paid', transaction_nsu=transaction_id, invoice_slug=invoice,
 capture_method=method, paid_amount=paid, paid_at=now()
 where id=order_id and status <> 'paid';
end $$;
revoke all on function public.create_checkout_order(jsonb) from public, anon, authenticated;
revoke all on function public.confirm_checkout_payment(text,text,text,text,bigint) from public, anon, authenticated;
grant execute on function public.create_checkout_order(jsonb) to service_role;
grant execute on function public.confirm_checkout_payment(text,text,text,text,bigint) to service_role;
