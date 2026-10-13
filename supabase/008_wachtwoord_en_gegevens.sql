-- KrasApp: wachtwoord resetten, eigen gegevens wijzigen en spelergegevens bewerken.
-- Uitvoeren na 001, 003 en 004. Veilig om opnieuw te draaien.

-- 1. Kolom en tabel -----------------------------------------------------------
alter table public.profiles add column if not exists must_change_password boolean not null default false;

-- Tijdelijk (door staf gereset) wachtwoord, zichtbaar voor de coördinator en gekoppelde trainers/begeleiders
-- tot de gebruiker het zelf heeft gewijzigd. Daarna wordt de rij verwijderd.
create table if not exists public.temp_passwords (
  user_id    uuid primary key references public.profiles(id) on delete cascade,
  password   text not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.temp_passwords enable row level security;

-- 2. Wie mag wat? ---------------------------------------------------------------
-- Coördinator: iedereen. Trainer/begeleider: alleen spelers die aan hen gekoppeld zijn.
create or replace function public.can_reset_password(target uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_active() and (
    public.has_role('coordinator')
    or (
      (public.has_role('trainer') or public.has_role('begeleider'))
      and exists (
        select 1 from public.players p join public.player_coaches c on c.player_id = p.id
        where p.user_id = target and c.staff_id = auth.uid()
      )
    )
  );
$$;

-- Trainer, begeleider en coördinator mogen de gegevens van een speler bewerken.
create or replace function public.can_edit_player_profile(target uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_active()
    and (public.has_role('trainer') or public.has_role('begeleider') or public.has_role('coordinator'))
    and exists (select 1 from public.players where user_id = target);
$$;

revoke all on function public.can_reset_password(uuid), public.can_edit_player_profile(uuid) from public, anon;
grant execute on function public.can_reset_password(uuid), public.can_edit_player_profile(uuid) to authenticated;

drop policy if exists "tijdelijk wachtwoord zien" on public.temp_passwords;
create policy "tijdelijk wachtwoord zien" on public.temp_passwords for select to authenticated
using (public.can_reset_password(user_id));
-- Geen insert/update/delete-policy: alleen via de functies hieronder.

drop policy if exists "spelergegevens bewerken" on public.profiles;
create policy "spelergegevens bewerken" on public.profiles for update to authenticated
using (public.can_edit_player_profile(id)) with check (public.can_edit_player_profile(id));

-- 3. Wachtwoord resetten ----------------------------------------------------------
create or replace function public.admin_reset_password(target uuid)
returns text language plpgsql security definer set search_path = public, extensions, auth as $$
declare
  alphabet text := 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  bytes bytea;
  pw text := '';
  i int;
begin
  if not public.can_reset_password(target) then
    raise exception 'Je mag het wachtwoord van deze gebruiker niet resetten';
  end if;

  bytes := gen_random_bytes(10);
  for i in 0..9 loop
    pw := pw || substr(alphabet, 1 + (get_byte(bytes, i) % length(alphabet)), 1);
  end loop;

  update auth.users set encrypted_password = crypt(pw, gen_salt('bf')), updated_at = now() where id = target;
  if not found then
    raise exception 'Gebruiker niet gevonden';
  end if;

  -- Bestaande sessies van de gebruiker beëindigen
  delete from auth.sessions where user_id = target;

  update public.profiles set must_change_password = true where id = target;
  insert into public.temp_passwords (user_id, password, created_by)
  values (target, pw, auth.uid())
  on conflict (user_id) do update set password = excluded.password, created_by = excluded.created_by, created_at = now();

  return pw;
end;
$$;

-- Aanroepen nadat de gebruiker zelf een nieuw wachtwoord heeft gekozen
create or replace function public.password_changed()
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.profiles set must_change_password = false where id = auth.uid();
  delete from public.temp_passwords where user_id = auth.uid();
end;
$$;

revoke all on function public.admin_reset_password(uuid), public.password_changed() from public, anon;
grant execute on function public.admin_reset_password(uuid), public.password_changed() to authenticated;

-- 4. E-mailadres in het profiel gelijk houden met het account ------------------------
create or replace function public.sync_profile_email()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.email is distinct from old.email then
    update public.profiles set email = new.email where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_changed on auth.users;
create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row execute function public.sync_profile_email();
