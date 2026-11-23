begin;
alter table public.checkout_orders add column if not exists push_state text not null default 'pending';
alter table public.checkout_orders add column if not exists push_lease timestamptz;
create or replace function public.store_claim_notice(order_id text)
returns boolean language plpgsql security invoker set search_path=public as $$
begin
 update checkout_orders set push_state='sending',push_lease=now()+interval '45 seconds'
 where id=order_id and status='paid' and (push_state='pending' or (push_state='sending' and push_lease<now()));
 return found;
end $$;
revoke all on function public.store_claim_notice(text) from public,anon,authenticated;
grant execute on function public.store_claim_notice(text) to service_role;
commit;
