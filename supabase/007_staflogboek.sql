-- KrasApp: staflogboek. Logregels met staff_only zijn alleen zichtbaar voor de coördinator
-- en voor gekoppelde trainers en specialisten. Uitvoeren na 005. Veilig om opnieuw te draaien.

alter table public.logbook add column if not exists staff_only boolean not null default false;

-- Is de ingelogde gebruiker als trainer of specialist gekoppeld aan deze speler?
create or replace function public.is_linked_coach(pid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select (public.has_role('trainer') or public.has_role('specialist'))
     and exists (select 1 from public.player_coaches where player_id = pid and staff_id = auth.uid());
$$;

-- Mag ik deze logregel zien?
create or replace function public.can_see_log(staff_only boolean, pid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_active() and (
    case when staff_only
      then (public.has_role('coordinator') or public.is_linked_coach(pid))
      else (public.is_staff() or public.is_my_player(pid))
    end
  );
$$;

revoke all on function public.is_linked_coach(uuid), public.can_see_log(boolean, uuid) from public, anon;
grant execute on function public.is_linked_coach(uuid), public.can_see_log(boolean, uuid) to authenticated;

drop policy if exists "logboek zien" on public.logbook;
create policy "logboek zien" on public.logbook for select to authenticated
using (public.can_see_log(staff_only, player_id));

drop policy if exists "logboek schrijven" on public.logbook;
create policy "logboek schrijven" on public.logbook for insert to authenticated
with check (
  public.is_active() and author_id = auth.uid()
  and (public.is_staff() or public.is_my_player(player_id))
  and (not staff_only or (
        (public.has_role('coordinator') or public.has_role('trainer') or public.has_role('specialist'))
        and public.can_see_log(true, player_id)))
);

drop policy if exists "logboek verwijderen" on public.logbook;
create policy "logboek verwijderen" on public.logbook for delete to authenticated
using (
  (public.has_role('trainer') or public.has_role('begeleider') or public.has_role('specialist'))
  and public.can_see_log(staff_only, player_id)
);
