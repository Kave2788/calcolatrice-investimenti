-- Tabella dummy per il keep-alive del progetto Supabase (piano gratuito).
-- Il workflow .github/workflows/supabase-keepalive.yml aggiorna la riga id=1
-- ogni giorno: una scrittura reale conta come attività ed evita l'auto-pausa.
-- Eseguire una volta nel SQL Editor di Supabase.

create table if not exists public.keepalive (
  id        int primary key default 1,
  last_ping timestamptz not null default now(),
  constraint keepalive_singleton check (id = 1)   -- una sola riga possibile
);

-- Garantisce l'esistenza della riga da aggiornare
insert into public.keepalive (id) values (1)
  on conflict (id) do nothing;

-- RLS: il ruolo anon (chiave publishable) può leggere e aggiornare l'unica riga.
-- Nessun dato sensibile: la tabella contiene solo un timestamp.
alter table public.keepalive enable row level security;

drop policy if exists "anon can read keepalive"   on public.keepalive;
drop policy if exists "anon can update keepalive" on public.keepalive;

create policy "anon can read keepalive"
  on public.keepalive for select to anon using (true);

create policy "anon can update keepalive"
  on public.keepalive for update to anon using (true) with check (true);
