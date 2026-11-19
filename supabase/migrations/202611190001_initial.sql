-- Solo progetto nuovo. Importazioni e demo non sono mai pubbliche.
create table public.vaults (
  owner_id uuid primary key references auth.users(id) on delete cascade default auth.uid(),
  revision bigint not null default 1 check (revision > 0),
  document jsonb not null,
  updated_at timestamptz not null default now(),
  constraint valid_document check (
    jsonb_typeof(document) = 'object'
    and jsonb_typeof(document->'assets') = 'array'
    and jsonb_typeof(document->'movements') = 'array'
    and jsonb_typeof(document->'imports') = 'array'
    and document ? 'createdAt'
    and octet_length(document::text) <= 5000000
  )
);
-- Importi, quantità, prezzi e cambi sono stringhe decimali nel documento JSON:
-- nessuna conversione a float PostgreSQL, nessun segreto bancario nel documento.
alter table public.vaults enable row level security;
alter table public.vaults force row level security;
create policy own_read on public.vaults for select to authenticated using (owner_id = (select auth.uid()));
create policy own_insert on public.vaults for insert to authenticated with check (owner_id = (select auth.uid()));
create policy own_update on public.vaults for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy own_delete on public.vaults for delete to authenticated using (owner_id = (select auth.uid()));
revoke all on public.vaults from anon;
grant select, delete on public.vaults to authenticated;
-- Aggiornamenti solo tramite RPC atomica e SECURITY INVOKER, sottoposta a RLS.
grant insert, update on public.vaults to authenticated;
create function public.save_vault(p_document jsonb, p_expected_revision bigint)
returns bigint language plpgsql security invoker set search_path = '' as $$
declare result bigint;
begin
  if auth.uid() is null then raise exception 'Autenticazione richiesta'; end if;
  if p_expected_revision = 0 then
    insert into public.vaults(owner_id,document) values(auth.uid(),p_document)
      on conflict do nothing returning revision into result;
  else
    update public.vaults set document=p_document, revision=revision+1, updated_at=now()
      where owner_id=auth.uid() and revision=p_expected_revision returning revision into result;
  end if;
  if result is null then raise exception 'Copia cloud modificata su un altro dispositivo. Rileggi il cloud prima di salvare.'; end if;
  return result;
end $$;
revoke all on function public.save_vault(jsonb,bigint) from public, anon;
grant execute on function public.save_vault(jsonb,bigint) to authenticated;
-- Area riservata ai futuri connettori: mai leggibile dal browser, neanche autenticato.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
create table private.bank_connections (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  environment text not null check(environment in ('sandbox','production')),
  status text not null check(status in ('pending','active','expired','revoked','interrupted','partial')),
  encrypted_token bytea,
  encryption_key_version integer,
  consent_expires_at timestamptz,
  last_successful_sync timestamptz,
  created_at timestamptz not null default now()
);
alter table private.bank_connections enable row level security;
revoke all on private.bank_connections from public, anon, authenticated;
comment on table private.bank_connections is 'Nessun provider attivo. Token cifrati AEAD solo da funzione server; chiavi nei secrets server, mai nel frontend.';
