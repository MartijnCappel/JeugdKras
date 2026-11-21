-- KrasApp: trainers en begeleiders krijgen een toewijzing aan 1 of meer teams (zichtbaar in het teamoverzicht),
-- en het teamoverzicht toont het geboortejaar. Draai in de Supabase SQL Editor (na 001 t/m 013).

-- 1. Toewijzing staf -> team
create table if not exists public.staff_teams (
  staff_id uuid not null references public.profiles(id) on delete cascade,
  team     text not null references public.teams(name) on update cascade on delete cascade,
  primary key (staff_id, team)
);
alter table public.staff_teams enable row level security;

drop policy if exists "staffteams zien" on public.staff_teams;
create policy "staffteams zien" on public.staff_teams for select to authenticated
using (public.is_active() and (staff_id = auth.uid() or public.has_role('coordinator')));
drop policy if exists "staffteams beheren" on public.staff_teams;
create policy "staffteams beheren" on public.staff_teams for all to authenticated
using (public.is_active() and public.has_role('coordinator'))
with check (public.is_active() and public.has_role('coordinator'));

-- 2. Overzicht: alle spelers van de toegewezen teams (+ doorstromers naar die teams), met geboortejaar
drop function if exists public.team_overview_rows();
create or replace function public.team_overview_rows()
returns table (o_player_id uuid, o_player_name text, o_birth_year int, o_current_team text,
               o_teams text[], o_status text, o_flow_to text)
language sql stable security definer set search_path = public as $$
  with my_teams as (
    select team as name from public.staff_teams where staff_id = auth.uid()
  ),
  base as (
    select pl.id as player_id,
           trim(coalesce(pr.first_name, '') || ' ' || coalesce(pr.last_name, '')) as player_name,
           extract(year from pr.dob)::int as birth_year,
           coalesce(ns.current_team, '') as current_team,
           coalesce((select array_agg(t.name order by t.name)
                       from public.player_teams pt join public.teams t on t.id = pt.team_id
                      where pt.player_id = pl.id), '{}') as teams,
           coalesce(ns.status, '') as status,
           coalesce(ns.flow_to, '') as flow_to
    from public.players pl
    join public.profiles pr on pr.id = pl.user_id
    left join public.player_next_season ns on ns.player_id = pl.id
  )
  select b.player_id, b.player_name, b.birth_year, b.current_team, b.teams, b.status, b.flow_to
  from base b
  where public.is_active() and (
    public.has_role('coordinator')
    or ((public.has_role('trainer') or public.has_role('begeleider')) and (
          public.can_see_next_season(b.player_id)
          or (case when b.current_team <> '' then b.current_team in (select name from my_teams)
                   else b.teams && array(select name from my_teams) end)
          or (b.status in ('doorstroom', 'instroom') and b.flow_to in (select name from my_teams))
       ))
  );
$$;
revoke all on function public.team_overview_rows() from public, anon;
grant execute on function public.team_overview_rows() to authenticated;

-- 3. Startwaarden: wijs trainers en begeleiders toe aan de teams uit jullie staftabellen
--    (alleen als ze nog geen toewijzing hebben; daarna beheer je dit in de app bij Staf)
insert into public.staff_teams (staff_id, team)
select p.id, m.team
from (values
  ('MA1','Laurens','Haans'),('MA1','Jolanda','Breugem'),
  ('MB1','Susanne','Schilder'),
  ('MC1','Martijn','Boomstra'),('MC1','Joan','Scherpenzeel'),
  ('MD','Chris','Veerman'),('ME','Chris','Veerman'),('MF','Chris','Veerman'),('Kabouter','Chris','Veerman'),
  ('HA','Mascha','Zwarthoed'),('HA','Craig','McLeland'),('HA2','Craig','McLeland'),
  ('HB','Jasper','Dusee'),('HB','Silver','Norg'),
  ('HC','Gerrie','Eijlers'),('HC','Natasja','Beemsterboer'),
  ('HD','Tom','Schilder'),('E','Chris','Veerman'),('F','Chris','Veerman')
) as m(team, first_name, last_name)
join public.profiles p
  on lower(p.first_name) = lower(m.first_name) and lower(p.last_name) = lower(m.last_name)
join public.teams t on t.name = m.team
where p.roles && array['trainer','begeleider']::text[]
  and not exists (select 1 from public.staff_teams s where s.staff_id = p.id)
on conflict do nothing;
