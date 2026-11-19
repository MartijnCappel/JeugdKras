-- KrasApp: trainers en begeleiders zien alleen de aan hen gekoppelde spelers.
-- Coordinator en specialist zien alle spelers. Een speler ziet alleen zichzelf.
-- Draai dit in de Supabase SQL Editor (na 001 t/m 008).

-- Mag ik deze speler zien?
create or replace function public.can_access_player(pid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_active() and (
    public.is_my_player(pid)
    or public.has_role('coordinator')
    or public.has_role('specialist')
    or exists (
      select 1 from public.player_coaches
      where player_id = pid and staff_id = auth.uid()
        and public.is_staff()
    )
  );
$$;
revoke all on function public.can_access_player(uuid) from public, anon;
grant execute on function public.can_access_player(uuid) to authenticated;

-- Spelers
drop policy if exists "spelers zien" on public.players;
create policy "spelers zien" on public.players for select to authenticated
using (public.can_access_player(id));
drop policy if exists "spelers wijzigen" on public.players;
create policy "spelers wijzigen" on public.players for update to authenticated
using (public.can_access_player(id)) with check (public.can_access_player(id));

-- Teams van spelers en koppelingen met staf
drop policy if exists "spelerteams zien" on public.player_teams;
create policy "spelerteams zien" on public.player_teams for select to authenticated
using (public.can_access_player(player_id));
drop policy if exists "koppelingen zien" on public.player_coaches;
create policy "koppelingen zien" on public.player_coaches for select to authenticated
using (public.can_access_player(player_id));

-- Logboek
create or replace function public.can_see_log(staff_only boolean, pid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_active() and (
    case when staff_only
      then (public.has_role('coordinator') or public.is_linked_coach(pid))
      else public.can_access_player(pid)
    end
  );
$$;
drop policy if exists "logboek schrijven" on public.logbook;
create policy "logboek schrijven" on public.logbook for insert to authenticated
with check (
  public.is_active() and author_id = auth.uid()
  and public.can_access_player(player_id)
  and (not staff_only or (
        (public.has_role('coordinator') or public.has_role('trainer') or public.has_role('specialist'))
        and public.can_see_log(true, player_id)))
);

-- Meldingen
drop policy if exists "meldingen zien" on public.progress_alerts;
create policy "meldingen zien" on public.progress_alerts for select to authenticated
using (public.can_access_player(player_id));
