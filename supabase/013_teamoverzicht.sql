-- KrasApp: teamoverzicht (blijft / komt van / doorstroom / instroom / uitstroom per team).
-- Draai in de Supabase SQL Editor (na 001 t/m 012).
--
-- 1. Bij Instroom wordt ook het team opgeslagen waarin de speler instroomt (kolom flow_to).
-- 2. Een functie levert de gegevens voor het overzicht. Een trainer of begeleider ziet daarmee:
--    - alles van de eigen gekoppelde spelers, en
--    - van spelers uit andere teams alleen naam en herkomstteam, als zij naar een van zijn teams doorstromen.
--    De coordinator ziet alles. Opmerkingen en andere gegevens worden hier nooit meegegeven.

create or replace function public.team_overview_rows()
returns table (o_player_id uuid, o_player_name text, o_current_team text, o_status text, o_flow_to text)
language sql stable security definer set search_path = public as $$
  with my_teams as (
    select distinct t.name
    from public.player_coaches pc
    join public.player_teams pt on pt.player_id = pc.player_id
    join public.teams t on t.id = pt.team_id
    where pc.staff_id = auth.uid()
  ),
  base as (
    select ns.player_id,
           trim(coalesce(pr.first_name, '') || ' ' || coalesce(pr.last_name, '')) as player_name,
           coalesce(nullif(ns.current_team, ''),
                    (select t.name from public.player_teams pt join public.teams t on t.id = pt.team_id
                      where pt.player_id = ns.player_id order by t.name limit 1), '') as current_team,
           ns.status, ns.flow_to
    from public.player_next_season ns
    join public.players pl on pl.id = ns.player_id
    join public.profiles pr on pr.id = pl.user_id
  )
  select b.player_id, b.player_name, b.current_team, b.status, b.flow_to
  from base b
  where public.is_active() and (
    public.has_role('coordinator')
    or ((public.has_role('trainer') or public.has_role('begeleider')) and (
          public.can_see_next_season(b.player_id)
          or (b.status in ('doorstroom', 'instroom') and b.flow_to in (select name from my_teams))
       ))
  );
$$;
revoke all on function public.team_overview_rows() from public, anon;
grant execute on function public.team_overview_rows() to authenticated;
