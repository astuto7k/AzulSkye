begin;
create table if not exists public.store_accounts (
 id uuid primary key default gen_random_uuid(), login text unique not null, name text not null,
 password_hash text not null, recovery_hash text not null, is_admin boolean not null default false,
 created_at timestamptz not null default now()
);
create table if not exists public.store_sessions (
 token_hash text primary key, account_id uuid not null references public.store_accounts on delete cascade,
 expires_at timestamptz not null
);
create table if not exists public.store_limits (key text primary key, attempts integer not null, expires_at timestamptz not null);
create table if not exists public.store_partners (
 id uuid primary key default gen_random_uuid(), account_id uuid not null references public.store_accounts,
 kind text not null check(kind in ('seller','workshop')), status text not null default 'pending' check(status in ('pending','approved','rejected')),
 name text not null, city text not null, phone text not null, description text not null, specialties text[] not null default '{}',
 person_type text not null, updated_at timestamptz not null default now(), unique(account_id,kind)
);
create table if not exists public.store_products (
 id text primary key, partner_id uuid references public.store_partners, product jsonb not null,
 status text not null check(status in ('approved','pending','hidden','rejected')),
 quantity integer check(quantity>=0), updated_at timestamptz not null default now()
);
create index if not exists store_product_partner on public.store_products(partner_id);
create table if not exists public.store_requests (
 id uuid primary key default gen_random_uuid(), account_id uuid not null references public.store_accounts,
 partner_id uuid not null references public.store_partners, product_id text references public.store_products,
 name text not null, phone text not null, equipment text not null, message text not null, reply text not null default '',
 status text not null default 'Recebida', created_at timestamptz not null default now()
);
create table if not exists public.store_settings (id text primary key, value jsonb not null);
create table if not exists public.store_push (
 endpoint text primary key, account_id uuid not null references public.store_accounts, subscription jsonb not null
);
create table if not exists public.store_favorites (
 account_id uuid not null references public.store_accounts, product_id text not null references public.store_products,
 primary key(account_id,product_id)
);
alter table public.checkout_orders add column if not exists buyer_id uuid references public.store_accounts;
alter table public.checkout_orders add column if not exists fulfillment text not null default 'A preparar' check(fulfillment in ('A preparar','Pronto para retirada','Retirado'));
create index if not exists store_checkout_buyer on public.checkout_orders(buyer_id,created_at);
do $$ declare t text; begin
 foreach t in array array['store_accounts','store_sessions','store_limits','store_partners','store_products','store_requests','store_settings','store_push','store_favorites'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from public,anon,authenticated',t);
 execute format('grant select,insert,update,delete on public.%I to service_role',t);
 end loop;
end $$;
create or replace function public.store_limit(bucket text, maximum integer, seconds integer)
returns boolean language plpgsql security invoker set search_path=public as $$
declare hits integer; begin
 delete from store_limits where expires_at < now();
 insert into store_limits(key,attempts,expires_at) values(bucket,1,now()+make_interval(secs=>seconds))
 on conflict(key) do update set attempts=store_limits.attempts+1 returning attempts into hits;
 return hits<=maximum;
end $$;
create or replace function public.store_reset_password(account uuid, proof text, password_value text, recovery_value text)
returns boolean language plpgsql security invoker set search_path=public as $$
begin
 update store_accounts set password_hash=password_value,recovery_hash=recovery_value where id=account and recovery_hash=proof;
 if not found then return false; end if;
 delete from store_sessions where account_id=account;
 return true;
end $$;
create or replace function public.create_checkout_order(order_data jsonb)
returns boolean language plpgsql security invoker set search_path=public as $$
declare line jsonb; row_product store_products; reserved bigint;
begin
 perform pg_advisory_xact_lock(hashtextextended(order_data->>'ip_hash',0));
 if (select count(*) from checkout_orders where ip_hash=order_data->>'ip_hash' and created_at>now()-interval '1 hour')>=5 then return false; end if;
 for line in select value from jsonb_array_elements(order_data->'items') order by value->>'id' loop
  select * into row_product from store_products where id=line->>'id' for update;
  if not found or row_product.partner_id is not null or row_product.status<>'approved' or (row_product.product->>'stock')::boolean is not true
    or round((row_product.product->>'price')::numeric*100) is distinct from (line->>'price')::numeric then raise exception 'catalog_changed'; end if;
  if row_product.quantity is not null then
   select coalesce(sum((item->>'quantity')::int),0) into reserved from checkout_orders o cross join lateral jsonb_array_elements(o.items) item
   where o.status in ('creating','pending','review') and o.expires_at>now() and item->>'id'=row_product.id;
   if row_product.quantity-reserved<(line->>'quantity')::int then raise exception 'stock_unavailable'; end if;
  end if;
 end loop;
 insert into checkout_orders(id,access_hash,ip_hash,customer,items,amount,shipping_amount,delivery,buyer_id,status,expires_at)
 values(order_data->>'id',order_data->>'access_hash',order_data->>'ip_hash',order_data->'customer',order_data->'items',(order_data->>'amount')::bigint,(order_data->>'shipping_amount')::bigint,order_data->>'delivery',(order_data->>'buyer_id')::uuid,'creating',(order_data->>'expires_at')::timestamptz);
 return true;
end $$;
create or replace function public.store_apply_stock() returns trigger language plpgsql set search_path=public as $$
declare line jsonb; begin
 for line in select value from jsonb_array_elements(new.items) order by value->>'id' loop
 update store_products set quantity=greatest(0,quantity-(line->>'quantity')::int),updated_at=clock_timestamp()
 where id=line->>'id' and quantity is not null;
 end loop;
 return new;
end $$;
create or replace trigger store_paid_stock after update of status on public.checkout_orders
 for each row when(old.status<>'paid' and new.status='paid') execute function public.store_apply_stock();
revoke all on function public.store_limit(text,integer,integer), public.store_reset_password(uuid,text,text,text), public.store_apply_stock() from public,anon,authenticated;
grant execute on function public.store_limit(text,integer,integer), public.store_reset_password(uuid,text,text,text), public.store_apply_stock() to service_role;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('store-images','store-images',true,1000000,array['image/webp']) on conflict(id) do nothing;
notify pgrst,'reload schema';
commit;
