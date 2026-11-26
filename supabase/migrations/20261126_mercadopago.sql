begin;
alter table public.checkout_orders add column if not exists mp_updated_at timestamptz;
alter table public.checkout_orders drop constraint if exists checkout_orders_status_check;
alter table public.checkout_orders add constraint checkout_orders_status_check
 check (status in ('creating','pending','review','paid','declined','cancelled','refunded','disputed','partial_refund'));

-- Serialize notifications and synchronous results on the same order. Only
-- the first approval consumes inventory, even if a dispute is later reversed.
create or replace function public.store_apply_mp_payment(
 order_key text, payment_key text, payment_state text, changed_at timestamptz,
 method_key text, amount_cents bigint, refunded_cents bigint)
returns text language plpgsql security invoker set search_path=public as $$
declare o checkout_orders; next_state text;
begin
 select * into strict o from checkout_orders where id=order_key for update;
 if left(o.id,3)<>'MP-' or payment_key !~ '^mp:[0-9]+$' or
    (o.transaction_nsu is not null and o.transaction_nsu<>payment_key) or
    amount_cents<>o.amount or method_key not in ('pix','credit_card') then
   raise exception 'payment_mismatch';
 end if;
 if o.mp_updated_at > changed_at then return o.status; end if;
 next_state := case payment_state
   when 'approved' then case when refunded_cents>=amount_cents then 'refunded' when refunded_cents>0 then 'partial_refund' else 'paid' end
   when 'refunded' then 'refunded' when 'charged_back' then 'disputed'
   when 'in_mediation' then 'disputed' when 'rejected' then 'declined'
   when 'cancelled' then 'cancelled' when 'pending' then 'pending'
   when 'in_process' then 'pending' when 'authorized' then 'pending' else 'review' end;
 if o.paid_at is not null and next_state in ('pending','declined','cancelled','review') then return o.status; end if;
 update checkout_orders set status=next_state, transaction_nsu=payment_key,
 mp_updated_at=changed_at, capture_method=method_key,
 paid_amount=case when next_state in ('paid','partial_refund','refunded') then amount_cents-refunded_cents else paid_amount end,
 paid_at=case when next_state='paid' then coalesce(paid_at,now()) else paid_at end
 where id=o.id;
 return next_state;
end $$;
drop trigger if exists store_paid_stock on public.checkout_orders;
create trigger store_paid_stock after update of status on public.checkout_orders
 for each row when(old.paid_at is null and new.status='paid' and old.status<>'paid') execute function public.store_apply_stock();
revoke all on function public.store_apply_mp_payment(text,text,text,timestamptz,text,bigint,bigint) from public,anon,authenticated;
grant execute on function public.store_apply_mp_payment(text,text,text,timestamptz,text,bigint,bigint) to service_role;
notify pgrst,'reload schema';
commit;
