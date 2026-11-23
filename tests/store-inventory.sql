-- Run in the SQL editor. The fixture exists only inside this transaction.
begin;
set local role service_role;
do $$
declare
 fixture text := 'check-' || gen_random_uuid();
 order_id text := 'AZ-' || gen_random_uuid();
 payload jsonb;
 available integer;
begin
 insert into public.store_products(id,product,status,quantity)
 values(fixture,'{"price":10,"stock":true}','approved',1);
 payload := jsonb_build_object('id',order_id,'access_hash',gen_random_uuid(),'ip_hash',gen_random_uuid(),
   'customer','{}'::jsonb,'items',jsonb_build_array(jsonb_build_object('id',fixture,'price',1000,'quantity',1,'description','Verificação')),
   'amount',1000,'shipping_amount',0,'delivery','pickup','expires_at',now()+interval '30 minutes');
 if not public.create_checkout_order(payload) then raise exception 'Reservation failed'; end if;
 begin
   perform public.create_checkout_order(payload || jsonb_build_object('id','AZ-'||gen_random_uuid(),'access_hash',gen_random_uuid()));
   raise exception 'Duplicate reservation accepted';
 exception when others then
   if sqlerrm <> 'stock_unavailable' then raise; end if;
 end;
 perform public.confirm_checkout_payment(order_id,'fixture-'||order_id,'fixture','pix',1000);
 perform public.confirm_checkout_payment(order_id,'fixture-'||order_id,'fixture','pix',1000);
 select quantity into available from public.store_products where id=fixture;
 if available<>0 then raise exception 'Stock mismatch'; end if;
 update public.checkout_orders set fulfillment='Pronto para retirada' where id=order_id and status='paid' and fulfillment='A preparar';
 if not found then raise exception 'Pickup preparation failed'; end if;
 update public.checkout_orders set fulfillment='Retirado' where id=order_id and status='paid' and fulfillment='Pronto para retirada';
 if not found then raise exception 'Pickup completion failed'; end if;
 if not public.store_claim_notice(order_id) or public.store_claim_notice(order_id) then raise exception 'Notification claim mismatch'; end if;
end $$;
rollback;
