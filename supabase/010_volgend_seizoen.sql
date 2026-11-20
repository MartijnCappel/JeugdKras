-- KrasApp: blokje "Volgend seizoen" bij een speler (huidig team, doorstroom, uitstroom, instroom, opmerking).
-- Zichtbaar en te bewerken voor: de coordinator en de gekoppelde trainer of begeleider. Niemand anders.
-- Draai in de Supabase SQL Editor (na 001 t/m 009).

create table if not exists public.player_next_season (
  player_id    uuid primary key references public.players(id) on delete cascade,
  current_team text not null default '',
  flow_to      text not null default '',      -- doorstroom naar (teamnaam)
  outflow      boolean not null default false, -- uitstroom (verlaat de club)
  inflow       boolean not null default false, -- instroom (komt nieuw bij de club)
  note         text not null default '',
  updated_by   uuid references public.profiles(id) on delete set null,
  updated_at   timestamptz not null default now()
);

create or replace function public.can_see_next_season(pid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_active() and (
    public.has_role('coordinator')
    or ((public.has_role('trainer') or public.has_role('begeleider'))
        and exists (select 1 from public.player_coaches where player_id = pid and staff_id = auth.uid()))
  );
$$;
revoke all on function public.can_see_next_season(uuid) from public, anon;
grant execute on function public.can_see_next_season(uuid) to authenticated;

alter table public.player_next_season enable row level security;

drop policy if exists "volgend seizoen zien" on public.player_next_season;
create policy "volgend seizoen zien" on public.player_next_season for select to authenticated
using (public.can_see_next_season(player_id));
drop policy if exists "volgend seizoen toevoegen" on public.player_next_season;
create policy "volgend seizoen toevoegen" on public.player_next_season for insert to authenticated
with check (public.can_see_next_season(player_id) and updated_by = auth.uid());
drop policy if exists "volgend seizoen wijzigen" on public.player_next_season;
create policy "volgend seizoen wijzigen" on public.player_next_season for update to authenticated
using (public.can_see_next_season(player_id)) with check (public.can_see_next_season(player_id) and updated_by = auth.uid());
