-- KrasApp: schema's voor alle staf.
--  - Coordinator, trainer, begeleider en specialist kunnen schema's maken.
--  - Je ziet, bewerkt en analyseert je eigen schema's altijd. De coordinator ziet en bewerkt alle schema's.
--  - Een trainer of begeleider kan alleen spelers aan een schema koppelen die hij zelf mag zien.
--  - Voor de analyse zie je de logs van de spelers in je eigen schema's.
-- Draai in de Supabase SQL Editor (na 001 t/m 015).

-- Wie mag dit schema zien?
create or replace function public.can_see_schema(sid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_active() and (
    public.has_role('coordinator')
    or exists (select 1 from public.schemas s where s.id = sid and s.specialist_id = auth.uid() and public.is_staff())
    or exists (
      select 1 from public.schema_players sp
      join public.players p on p.id = sp.player_id
      where sp.schema_id = sid and p.user_id = auth.uid()
    )
  );
$$;

-- Wie mag dit schema bewerken of verwijderen? (maker of coordinator)
create or replace function public.owns_schema(sid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_active() and (
    public.has_role('coordinator')
    or (public.is_staff() and exists (select 1 from public.schemas where id = sid and specialist_id = auth.uid()))
  );
$$;

drop policy if exists "schemas maken" on public.schemas;
create policy "schemas maken" on public.schemas for insert to authenticated
with check (public.is_active() and public.is_staff() and specialist_id = auth.uid());

drop policy if exists "schemas wijzigen" on public.schemas;
create policy "schemas wijzigen" on public.schemas for update to authenticated
using (public.owns_schema(id))
with check (public.has_role('coordinator') or specialist_id = auth.uid());

-- Spelers koppelen: alleen spelers die je zelf mag zien
drop policy if exists "schemaspelers beheren" on public.schema_players;
create policy "schemaspelers beheren" on public.schema_players for all to authenticated
using (public.owns_schema(schema_id))
with check (public.owns_schema(schema_id) and public.can_access_player(player_id));

-- Logboek: de maker van een schema ziet de logs van dat schema (voor de analyse)
drop policy if exists "logboek zien" on public.logbook;
create policy "logboek zien" on public.logbook for select to authenticated
using (
  public.can_see_log(staff_only, player_id)
  or (not staff_only and schema_id is not null and public.owns_schema(schema_id))
);
