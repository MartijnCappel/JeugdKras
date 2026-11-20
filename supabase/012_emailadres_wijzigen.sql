-- KrasApp: e-mailadres direct wijzigen, zonder bevestigingsmail.
-- Mag: iedereen bij zichzelf; trainer en begeleider bij hun gekoppelde spelers; coordinator bij iedereen.
-- Draai in de Supabase SQL Editor (na 001 t/m 011).

create or replace function public.change_user_email(target uuid, new_email text)
returns void language plpgsql security definer set search_path = public, auth as $$
declare
  clean text := lower(btrim(coalesce(new_email, '')));
  allowed boolean := false;
  pid uuid;
begin
  if auth.uid() is null or not public.is_active() then
    raise exception 'Niet ingelogd';
  end if;
  if clean !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Dit is geen geldig e-mailadres';
  end if;

  if target = auth.uid() or public.has_role('coordinator') then
    allowed := true;
  elsif public.has_role('trainer') or public.has_role('begeleider') then
    select id into pid from public.players where user_id = target;
    allowed := pid is not null and public.can_access_player(pid);
  end if;
  if not allowed then
    raise exception 'Je mag dit e-mailadres niet wijzigen';
  end if;

  if exists (select 1 from auth.users where lower(email) = clean and id <> target) then
    raise exception 'Dit e-mailadres is al in gebruik';
  end if;

  update auth.users
     set email = clean, email_change = '', email_change_token_new = '', email_change_token_current = '',
         updated_at = now()
   where id = target;
  update auth.identities
     set identity_data = jsonb_set(identity_data, '{email}', to_jsonb(clean)), updated_at = now()
   where user_id = target and provider = 'email';
  update public.profiles set email = clean where id = target;
end;
$$;

revoke all on function public.change_user_email(uuid, text) from public, anon;
grant execute on function public.change_user_email(uuid, text) to authenticated;
