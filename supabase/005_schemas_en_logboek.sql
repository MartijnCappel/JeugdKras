-- KrasApp fase 4: schema's van specialisten en het logboek van spelers.
-- Uitvoeren na 001, 003 en 004. Supabase: SQL Editor > New query > plakken > Run. Veilig om opnieuw te draaien.

-- 1. Tabellen ---------------------------------------------------------------
create table if not exists public.schemas (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  type          text not null default '',
  description   text not null default '',
  end_date      date,
  specialist_id uuid not null references public.profiles(id) on delete cascade,
  created_at    timestamptz not null default now()
);

create table if not exists public.schema_players (
  schema_id uuid not null references public.schemas(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  primary key (schema_id, player_id)
);

create table if not exists public.schema_items (
  schema_id uuid not null references public.schemas(id) on delete cascade,
  id        text not null,
  position  int  not null default 0,
  label     text not null default '',
  unit      text not null default '',
  target    text not null default '',
  primary key (schema_id, id)
);

create table if not exists public.schema_user_state (
  user_id   uuid not null references public.profiles(id) on delete cascade,
  schema_id uuid not null references public.schemas(id) on delete cascade,
  seen      boolean not null default true,
  primary key (user_id, schema_id)
);

create table if not exists public.logbook (
  id          uuid primary key default gen_random_uuid(),
  player_id   uuid not null references public.players(id) on delete cascade,
  type        text not null default 'overig',
  title       text not null default '',
  note        text not null default '',
  score       int check (score between 1 and 5),
  log_date    date not null default current_date,
  author_id   uuid references public.profiles(id) on delete set null,
  author_name text not null default '',
  schema_id   uuid references public.schemas(id) on delete set null,
  training_id uuid references public.trainings(id) on delete set null,
  extra       jsonb not null default '{}',
  created_at  timestamptz not null default now()
);
create index if not exists logbook_player_idx on public.logbook (player_id, log_date desc);

alter table public.schemas           enable row level security;
alter table public.schema_players    enable row level security;
alter table public.schema_items      enable row level security;
alter table public.schema_user_state enable row level security;
alter table public.logbook           enable row level security;

-- 2. Hulpfunctie ------------------------------------------------------------
create or replace function public.can_see_schema(sid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_active() and (
    public.is_staff()
    or exists (
      select 1 from public.schema_players sp
      join public.players p on p.id = sp.player_id
      where sp.schema_id = sid and p.user_id = auth.uid()
    )
  );
$$;
create or replace function public.owns_schema(sid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_role('specialist') and exists (select 1 from public.schemas where id = sid and specialist_id = auth.uid());
$$;
revoke all on function public.can_see_schema(uuid), public.owns_schema(uuid) from public, anon;
grant execute on function public.can_see_schema(uuid), public.owns_schema(uuid) to authenticated;

-- 3. Rechten (RLS) ----------------------------------------------------------
drop policy if exists "schemas zien" on public.schemas;
create policy "schemas zien" on public.schemas for select to authenticated using (public.can_see_schema(id));
drop policy if exists "schemas maken" on public.schemas;
create policy "schemas maken" on public.schemas for insert to authenticated
with check (public.has_role('specialist') and specialist_id = auth.uid());
drop policy if exists "schemas wijzigen" on public.schemas;
create policy "schemas wijzigen" on public.schemas for update to authenticated
using (public.owns_schema(id)) with check (specialist_id = auth.uid());
drop policy if exists "schemas verwijderen" on public.schemas;
create policy "schemas verwijderen" on public.schemas for delete to authenticated using (public.owns_schema(id));

drop policy if exists "schemaspelers zien" on public.schema_players;
create policy "schemaspelers zien" on public.schema_players for select to authenticated using (public.can_see_schema(schema_id));
drop policy if exists "schemaspelers beheren" on public.schema_players;
create policy "schemaspelers beheren" on public.schema_players for all to authenticated
using (public.owns_schema(schema_id)) with check (public.owns_schema(schema_id));

drop policy if exists "schemaonderdelen zien" on public.schema_items;
create policy "schemaonderdelen zien" on public.schema_items for select to authenticated using (public.can_see_schema(schema_id));
drop policy if exists "schemaonderdelen beheren" on public.schema_items;
create policy "schemaonderdelen beheren" on public.schema_items for all to authenticated
using (public.owns_schema(schema_id)) with check (public.owns_schema(schema_id));

drop policy if exists "schema gezien" on public.schema_user_state;
create policy "schema gezien" on public.schema_user_state for all to authenticated
using (user_id = auth.uid() and public.is_active()) with check (user_id = auth.uid() and public.is_active());

-- Logboek: staf leest alles, een speler alleen het eigen logboek
drop policy if exists "logboek zien" on public.logbook;
create policy "logboek zien" on public.logbook for select to authenticated
using (public.is_staff() or (public.is_active() and public.is_my_player(player_id)));
drop policy if exists "logboek schrijven" on public.logbook;
create policy "logboek schrijven" on public.logbook for insert to authenticated
with check (
  public.is_active() and author_id = auth.uid()
  and (public.is_staff() or public.is_my_player(player_id))
);
drop policy if exists "logboek verwijderen" on public.logbook;
create policy "logboek verwijderen" on public.logbook for delete to authenticated
using (public.has_role('trainer') or public.has_role('begeleider') or public.has_role('specialist'));

-- 4. Live updates -----------------------------------------------------------
do $$
begin
  begin alter publication supabase_realtime add table public.schema_players; exception when others then null; end;
  begin alter publication supabase_realtime add table public.logbook;        exception when others then null; end;
end $$;
