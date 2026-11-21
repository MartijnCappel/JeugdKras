-- KrasApp: de coordinator voegt een nieuwe persoon toe (speler of staf) met een tijdelijk wachtwoord.
-- Draai in de Supabase SQL Editor (na 001 t/m 014). Alleen een coordinator mag deze functie gebruiken.

create or replace function public.admin_create_user(
  p_first text, p_last text, p_email text, p_roles text[],
  p_dob date default null, p_city text default null, p_team text default null, p_title text default null
) returns jsonb
language plpgsql security definer set search_path = public, auth, extensions as $$
declare
  alphabet constant text := 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  uid uuid := gen_random_uuid();
  clean_email text := lower(btrim(coalesce(p_email, '')));
  pw text := '';
  bytes bytea := extensions.gen_random_bytes(10);
  i int;
  tid uuid;
  pid uuid;
begin
  if auth.uid() is null or not public.is_coordinator() then
    raise exception 'Alleen een coördinator mag mensen toevoegen';
  end if;
  if btrim(coalesce(p_first, '')) = '' or btrim(coalesce(p_last, '')) = '' then
    raise exception 'Vul een voor- en achternaam in';
  end if;
  if p_roles is null or array_length(p_roles, 1) is null
     or not (p_roles <@ array['coordinator','trainer','begeleider','specialist','speler']::text[]) then
    raise exception 'Kies minstens één geldige rol';
  end if;
  if clean_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Dit is geen geldig e-mailadres';
  end if;
  if exists (select 1 from auth.users where lower(email) = clean_email) then
    raise exception 'Dit e-mailadres is al in gebruik';
  end if;

  for i in 0..9 loop
    pw := pw || substr(alphabet, 1 + (get_byte(bytes, i) % length(alphabet)), 1);
  end loop;

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) values (
    '00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated', clean_email,
    extensions.crypt(pw, extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('first_name', btrim(p_first), 'last_name', btrim(p_last)),
    now(), now(), '', '', '', ''
  );
  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), uid, uid::text,
          jsonb_build_object('sub', uid::text, 'email', clean_email, 'email_verified', true),
          'email', now(), now(), now());

  update public.profiles
     set roles = p_roles, status = 'actief', must_change_password = true,
         city = nullif(btrim(coalesce(p_city, '')), ''), dob = p_dob, title = nullif(btrim(coalesce(p_title, '')), '')
   where id = uid;
  insert into public.temp_passwords (user_id, password) values (uid, pw)
  on conflict (user_id) do update set password = excluded.password, created_at = now();

  if nullif(btrim(coalesce(p_team, '')), '') is not null then
    select id into tid from public.teams where name = btrim(p_team);
    if tid is null then
      insert into public.teams (name) values (btrim(p_team)) returning id into tid;
    end if;
    if 'speler' = any(p_roles) then
      select id into pid from public.players where user_id = uid;
      if pid is not null then
        insert into public.player_teams (player_id, team_id) values (pid, tid) on conflict do nothing;
      end if;
    end if;
    if ('trainer' = any(p_roles) or 'begeleider' = any(p_roles)) and to_regclass('public.staff_teams') is not null then
      execute 'insert into public.staff_teams (staff_id, team) values ($1, $2) on conflict do nothing' using uid, btrim(p_team);
    end if;
  end if;

  return jsonb_build_object('id', uid, 'email', clean_email, 'password', pw);
end;
$$;
revoke all on function public.admin_create_user(text, text, text, text[], date, text, text, text) from public, anon;
grant execute on function public.admin_create_user(text, text, text, text[], date, text, text, text) to authenticated;
