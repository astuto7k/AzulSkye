begin;
create or replace function public.store_open_session(account uuid, credential text, token_digest text)
returns boolean language plpgsql security invoker set search_path=public as $$
begin
 perform 1 from store_accounts where id=account and password_hash=credential for update;
 if not found then return false; end if;
 delete from store_sessions where expires_at <= now();
 insert into store_sessions(token_hash,account_id,expires_at) values(token_digest,account,now()+interval '14 days');
 return true;
end $$;
revoke all on function public.store_open_session(uuid,text,text) from public,anon,authenticated;
grant execute on function public.store_open_session(uuid,text,text) to service_role;
commit;
