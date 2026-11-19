-- Eseguire su un progetto locale Supabase dopo supabase db reset.
-- Test transazionale di RLS con identità JWT simulate solo nel database di test.
begin;
insert into auth.users(id) values ('00000000-0000-0000-0000-000000000001'),('00000000-0000-0000-0000-000000000002');
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
select public.save_vault('{"assets":[],"movements":[],"imports":[],"createdAt":"2026-11-19"}',0);
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',true);
do $$ begin
 if (select count(*) from public.vaults) <> 0 then raise exception 'RLS: lettura di un altro utente'; end if;
 update public.vaults set document='{}' where owner_id='00000000-0000-0000-0000-000000000001';
 if found then raise exception 'RLS: aggiornamento di un altro utente'; end if;
 delete from public.vaults where owner_id='00000000-0000-0000-0000-000000000001';
 if found then raise exception 'RLS: eliminazione di un altro utente'; end if;
 begin
   insert into public.vaults(owner_id,document) values('00000000-0000-0000-0000-000000000001','{"assets":[],"movements":[],"imports":[],"createdAt":"2026-11-19"}');
   raise exception 'RLS: inserimento per un altro utente consentito';
 exception when insufficient_privilege then null;
 end;
end $$;
select public.save_vault('{"assets":[],"movements":[],"imports":[],"createdAt":"2026-11-19"}',0);
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
do $$ begin
 if (select count(*) from public.vaults) <> 1 then raise exception 'RLS: patrimonio personale non leggibile'; end if;
 if (select revision from public.vaults) <> 1 then raise exception 'RLS: patrimonio alterato'; end if;
end $$;
rollback;
