-- KrasApp fase 1: profielen, rollen, goedkeuring en toegangsbeheer.
-- Uitvoeren in Supabase: SQL Editor > New query > plakken > Run.
-- Veilig om opnieuw te draaien.

-- 1. Profielen (één per account) ------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  first_name  text not null default '',
  last_name   text not null default '',
  city        text,
  dob         date,
  title       text,
  roles       text[] not null default '{speler}',
  status      text not null default 'in afwachting'
              check (status in ('in afwachting', 'actief', 'geblokkeerd')),
  created_at  timestamptz not null default now(),
  constraint roles_geldig check (
    roles <@ array['coordinator','trainer','begeleider','specialist','speler']::text[]
    and cardinality(roles) >= 1
  )
);

alter table public.profiles enable row level security;

-- 2. Hulpfuncties (security definer, zodat RLS niet in zichzelf loopt) ------
create or replace function public.is_active()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and status = 'actief');
$$;

create or replace function public.has_role(r text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and status = 'actief' and r = any(roles));
$$;

create or replace function public.is_coordinator()
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_role('coordinator');
$$;

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and status = 'actief'
      and roles && array['coordinator','trainer','begeleider','specialist']::text[]
  );
$$;

-- 3. Automatisch een profiel bij registratie -------------------------------
-- Rollen en status staan hier vast: iedereen begint als speler "in afwachting".
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, first_name, last_name, city, dob)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'first_name', ''),
    coalesce(new.raw_user_meta_data->>'last_name', ''),
    nullif(new.raw_user_meta_data->>'city', ''),
    nullif(new.raw_user_meta_data->>'dob', '')::date
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 4. Beveiliging tegen zelf rollen of status wijzigen -----------------------
-- Alleen een coördinator (of de SQL Editor zelf) mag rollen, status en e-mail wijzigen.
create or replace function public.protect_profile_columns()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_coordinator() then
    if new.roles is distinct from old.roles
       or new.status is distinct from old.status
       or new.email is distinct from old.email
       or new.id is distinct from old.id then
      raise exception 'Alleen een coördinator mag rollen en status wijzigen';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_columns on public.profiles;
create trigger protect_profile_columns
  before update on public.profiles
  for each row execute function public.protect_profile_columns();

-- 5. Rechten (RLS) ----------------------------------------------------------
drop policy if exists "profiel eigen of coordinator" on public.profiles;
drop policy if exists "profiel zien" on public.profiles;
create policy "profiel zien" on public.profiles for select to authenticated
using (
  id = auth.uid()                       -- je eigen profiel (ook als je nog niet actief bent)
  or public.is_coordinator()            -- coördinator ziet iedereen
  or (public.is_staff() and status = 'actief')   -- staf ziet alle actieve accounts
  or (public.is_active() and status = 'actief'
      and roles && array['coordinator','trainer','begeleider','specialist']::text[])  -- spelers zien alleen staf
);

drop policy if exists "profiel eigen wijzigen" on public.profiles;
create policy "profiel eigen wijzigen" on public.profiles for update to authenticated
using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "profiel coordinator wijzigen" on public.profiles;
create policy "profiel coordinator wijzigen" on public.profiles for update to authenticated
using (public.is_coordinator()) with check (public.is_coordinator());

-- Geen insert- of delete-policy: aanmaken gaat via de trigger, verwijderen via admin_delete_user.

-- 6. Gebruiker verwijderen (alleen coördinator, niet jezelf) ---------------
create or replace function public.admin_delete_user(target uuid)
returns void language plpgsql security definer set search_path = public, auth as $$
begin
  if not public.is_coordinator() then
    raise exception 'Alleen een coördinator mag gebruikers verwijderen';
  end if;
  if target = auth.uid() then
    raise exception 'Je kunt jezelf niet verwijderen';
  end if;
  delete from auth.users where id = target;   -- profiel verdwijnt mee (on delete cascade)
end;
$$;

revoke all on function public.admin_delete_user(uuid) from public, anon;
grant execute on function public.admin_delete_user(uuid) to authenticated;

-- Hulpfuncties niet voor anonieme bezoekers
revoke all on function public.is_active(), public.has_role(text), public.is_coordinator(), public.is_staff() from public, anon;
grant execute on function public.is_active(), public.has_role(text), public.is_coordinator(), public.is_staff() to authenticated;
