-- KrasApp fase 2: spelers, teams en koppelingen met staf.
-- Uitvoeren na 001. Supabase: SQL Editor > New query > plakken > Run. Veilig om opnieuw te draaien.

-- 1. Tabellen ---------------------------------------------------------------
create table if not exists public.teams (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique check (length(trim(name)) > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.players (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null unique references public.profiles(id) on delete cascade,
  positions          text[] not null default '{}',
  mood               int not null default 3 check (mood between 1 and 5),
  fatigue            int not null default 3 check (fatigue between 1 and 5),
  physical_condition int not null default 3 check (physical_condition between 1 and 5),
  modules            text[] not null default '{}',
  week_program       jsonb not null default '[]',
  tvs                jsonb not null default '{}',
  created_at         timestamptz not null default now()
);

create table if not exists public.player_teams (
  player_id uuid not null references public.players(id) on delete cascade,
  team_id   uuid not null references public.teams(id) on delete cascade,
  primary key (player_id, team_id)
);

create table if not exists public.player_coaches (
  player_id uuid not null references public.players(id) on delete cascade,
  staff_id  uuid not null references public.profiles(id) on delete cascade,
  primary key (player_id, staff_id)
);

alter table public.teams          enable row level security;
alter table public.players        enable row level security;
alter table public.player_teams   enable row level security;
alter table public.player_coaches enable row level security;

-- 2. Hulpfunctie: is dit mijn eigen spelersrij? -----------------------------
create or replace function public.is_my_player(pid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.players where id = pid and user_id = auth.uid());
$$;
revoke all on function public.is_my_player(uuid) from public, anon;
grant execute on function public.is_my_player(uuid) to authenticated;

-- 3. Bij goedkeuring als speler automatisch een spelersrij ---------------------
create or replace function public.ensure_player()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'actief' and 'speler' = any(new.roles) then
    insert into public.players (user_id) values (new.id) on conflict (user_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists ensure_player on public.profiles;
create trigger ensure_player
  after insert or update of roles, status on public.profiles
  for each row execute function public.ensure_player();

-- Bestaande actieve spelers ook een rij geven
insert into public.players (user_id)
select id from public.profiles where status = 'actief' and 'speler' = any(roles)
on conflict (user_id) do nothing;

-- 4. Welke kolom mag wie wijzigen? ------------------------------------------
create or replace function public.protect_player_columns()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  me_self  boolean := (old.user_id = auth.uid());
  is_tb    boolean := public.has_role('trainer') or public.has_role('begeleider');
begin
  if auth.uid() is null then return new; end if;   -- SQL Editor / beheer

  if new.user_id is distinct from old.user_id or new.id is distinct from old.id then
    raise exception 'Koppeling met account kan niet gewijzigd worden';
  end if;
  if new.positions is distinct from old.positions and not is_tb then
    raise exception 'Alleen trainer of begeleider mag posities wijzigen';
  end if;
  if (new.mood is distinct from old.mood or new.fatigue is distinct from old.fatigue) and not me_self then
    raise exception 'Mood en vermoeidheid vult de speler zelf in';
  end if;
  if new.physical_condition is distinct from old.physical_condition
     and not (me_self or is_tb or public.has_role('specialist')) then
    raise exception 'Geen recht om de fysieke toestand te wijzigen';
  end if;
  if new.modules is distinct from old.modules and not (me_self or public.is_staff()) then
    raise exception 'Geen recht om modules te wijzigen';
  end if;
  if new.week_program is distinct from old.week_program and not me_self then
    raise exception 'Het weekprogramma vult de speler zelf in';
  end if;
  if new.tvs is distinct from old.tvs
     and not (public.has_role('trainer') or public.has_role('specialist') or public.has_role('coordinator')) then
    raise exception 'Alleen trainer, specialist of coördinator mag het Talent Volg Systeem wijzigen';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_player_columns on public.players;
create trigger protect_player_columns
  before update on public.players
  for each row execute function public.protect_player_columns();

-- 5. Rechten (RLS) ----------------------------------------------------------
-- teams
drop policy if exists "teams zien" on public.teams;
create policy "teams zien" on public.teams for select to authenticated using (public.is_active());
drop policy if exists "teams maken" on public.teams;
create policy "teams maken" on public.teams for insert to authenticated
with check (public.has_role('trainer') or public.has_role('begeleider') or public.has_role('coordinator'));

-- players: staf ziet alle spelers, een speler alleen zichzelf
drop policy if exists "spelers zien" on public.players;
create policy "spelers zien" on public.players for select to authenticated
using (public.is_staff() or (public.is_active() and user_id = auth.uid()));
drop policy if exists "spelers wijzigen" on public.players;
create policy "spelers wijzigen" on public.players for update to authenticated
using (public.is_staff() or (public.is_active() and user_id = auth.uid()))
with check (public.is_staff() or (public.is_active() and user_id = auth.uid()));

-- player_teams
drop policy if exists "spelerteams zien" on public.player_teams;
create policy "spelerteams zien" on public.player_teams for select to authenticated
using (public.is_staff() or (public.is_active() and public.is_my_player(player_id)));
drop policy if exists "spelerteams toevoegen" on public.player_teams;
create policy "spelerteams toevoegen" on public.player_teams for insert to authenticated
with check (public.has_role('trainer') or public.has_role('begeleider') or public.has_role('coordinator'));
drop policy if exists "spelerteams verwijderen" on public.player_teams;
create policy "spelerteams verwijderen" on public.player_teams for delete to authenticated
using (public.has_role('trainer') or public.has_role('begeleider') or public.has_role('coordinator'));

-- player_coaches (koppelingen speler en staf)
drop policy if exists "koppelingen zien" on public.player_coaches;
create policy "koppelingen zien" on public.player_coaches for select to authenticated
using (public.is_staff() or (public.is_active() and public.is_my_player(player_id)));
drop policy if exists "koppelingen toevoegen" on public.player_coaches;
create policy "koppelingen toevoegen" on public.player_coaches for insert to authenticated
with check (public.is_staff());
drop policy if exists "koppelingen verwijderen" on public.player_coaches;
create policy "koppelingen verwijderen" on public.player_coaches for delete to authenticated
using (public.is_staff());
