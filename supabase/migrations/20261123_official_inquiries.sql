begin;
alter table public.store_requests alter column partner_id drop not null;
alter table public.store_requests add constraint store_request_recipient check(partner_id is not null or product_id is not null);
commit;
