-- Coördinator mag ook de posities van een speler aanpassen.
-- Draai in de Supabase SQL Editor (veilig om opnieuw te draaien).

create or replace function public.protect_player_columns()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  me_self  boolean := (old.user_id = auth.uid());
  is_tb    boolean := public.has_role('trainer') or public.has_role('begeleider');
  can_pos  boolean := public.has_role('trainer') or public.has_role('begeleider') or public.has_role('coordinator');
begin
  if auth.uid() is null then return new; end if;   -- SQL Editor / beheer

  if new.user_id is distinct from old.user_id or new.id is distinct from old.id then
    raise exception 'Koppeling met account kan niet gewijzigd worden';
  end if;
  if new.positions is distinct from old.positions and not can_pos then
    raise exception 'Alleen trainer, begeleider of coördinator mag posities wijzigen';
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
