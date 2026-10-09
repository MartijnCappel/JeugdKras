-- KrasApp fase 5: berichten tussen personen en meldingen bij voortgang.
-- Uitvoeren na 001, 003, 004 en 005. Supabase: SQL Editor > New query > plakken > Run. Veilig om opnieuw te draaien.

-- 1. Tabellen ---------------------------------------------------------------
create table if not exists public.conversations (
  id         uuid primary key default gen_random_uuid(),
  is_group   boolean not null default false,
  created_by uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.conversation_participants (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  read_count      int  not null default 0,
  primary key (conversation_id, user_id)
);

create table if not exists public.conversation_messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id       uuid not null references public.profiles(id) on delete cascade,
  text            text not null check (length(trim(text)) > 0),
  created_at      timestamptz not null default now()
);
create index if not exists conversation_messages_idx on public.conversation_messages (conversation_id, created_at);

-- Melding: een speler zet mood, vermoeidheid of fysieke toestand op rood (1 of 2)
create table if not exists public.progress_alerts (
  id         uuid primary key default gen_random_uuid(),
  player_id  uuid not null references public.players(id) on delete cascade,
  field      text not null check (field in ('mood', 'fatigue', 'physicalCondition')),
  created_at timestamptz not null default now()
);
create index if not exists progress_alerts_idx on public.progress_alerts (created_at desc);

create table if not exists public.alert_user_state (
  user_id  uuid not null references public.profiles(id) on delete cascade,
  alert_id uuid not null references public.progress_alerts(id) on delete cascade,
  primary key (user_id, alert_id)
);

alter table public.conversations             enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.conversation_messages     enable row level security;
alter table public.progress_alerts           enable row level security;
alter table public.alert_user_state          enable row level security;

-- 2. Hulpfuncties -----------------------------------------------------------
create or replace function public.is_participant(cid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_active() and exists (
    select 1 from public.conversation_participants where conversation_id = cid and user_id = auth.uid()
  );
$$;

create or replace function public.owns_conversation(cid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_active() and exists (select 1 from public.conversations where id = cid and created_by = auth.uid());
$$;

-- Wie mag wie berichten? Staf onderling altijd. Een speler alleen met staf die aan hem gekoppeld is.
create or replace function public.can_message(a uuid, b uuid)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare
  a_staff boolean; b_staff boolean;
begin
  select exists (select 1 from public.profiles where id = a and status = 'actief' and roles && array['coordinator','trainer','begeleider','specialist']::text[]) into a_staff;
  select exists (select 1 from public.profiles where id = b and status = 'actief' and roles && array['coordinator','trainer','begeleider','specialist']::text[]) into b_staff;
  if a_staff and b_staff then return true; end if;
  if a_staff and exists (
    select 1 from public.players p join public.player_coaches c on c.player_id = p.id
    where p.user_id = b and c.staff_id = a
  ) then return true; end if;
  if b_staff and exists (
    select 1 from public.players p join public.player_coaches c on c.player_id = p.id
    where p.user_id = a and c.staff_id = b
  ) then return true; end if;
  return false;
end;
$$;

revoke all on function public.is_participant(uuid), public.owns_conversation(uuid), public.can_message(uuid, uuid) from public, anon;
grant execute on function public.is_participant(uuid), public.owns_conversation(uuid), public.can_message(uuid, uuid) to authenticated;

-- 3. Rechten (RLS) ----------------------------------------------------------
drop policy if exists "gesprekken zien" on public.conversations;
create policy "gesprekken zien" on public.conversations for select to authenticated
using (public.is_participant(id) or (created_by = auth.uid() and public.is_active()));
drop policy if exists "gesprekken starten" on public.conversations;
create policy "gesprekken starten" on public.conversations for insert to authenticated
with check (created_by = auth.uid() and public.is_active());

drop policy if exists "deelnemers gesprek zien" on public.conversation_participants;
create policy "deelnemers gesprek zien" on public.conversation_participants for select to authenticated
using (public.is_participant(conversation_id) or public.owns_conversation(conversation_id));
drop policy if exists "deelnemers gesprek toevoegen" on public.conversation_participants;
create policy "deelnemers gesprek toevoegen" on public.conversation_participants for insert to authenticated
with check (
  public.owns_conversation(conversation_id)
  and (user_id = auth.uid() or public.can_message(auth.uid(), user_id))
);
drop policy if exists "gelezen bijwerken" on public.conversation_participants;
create policy "gelezen bijwerken" on public.conversation_participants for update to authenticated
using (user_id = auth.uid() and public.is_active()) with check (user_id = auth.uid());

drop policy if exists "berichten zien" on public.conversation_messages;
create policy "berichten zien" on public.conversation_messages for select to authenticated using (public.is_participant(conversation_id));
drop policy if exists "berichten sturen" on public.conversation_messages;
create policy "berichten sturen" on public.conversation_messages for insert to authenticated
with check (sender_id = auth.uid() and public.is_participant(conversation_id));

-- Meldingen: de speler maakt ze voor zichzelf, staf leest ze
drop policy if exists "meldingen zien" on public.progress_alerts;
create policy "meldingen zien" on public.progress_alerts for select to authenticated
using (public.is_staff() or (public.is_active() and public.is_my_player(player_id)));
drop policy if exists "meldingen maken" on public.progress_alerts;
create policy "meldingen maken" on public.progress_alerts for insert to authenticated
with check (public.is_active() and public.is_my_player(player_id));

drop policy if exists "melding gezien" on public.alert_user_state;
create policy "melding gezien" on public.alert_user_state for all to authenticated
using (user_id = auth.uid() and public.is_active()) with check (user_id = auth.uid() and public.is_active());

-- 4. Live updates -----------------------------------------------------------
do $$
begin
  begin alter publication supabase_realtime add table public.conversation_messages;     exception when others then null; end;
  begin alter publication supabase_realtime add table public.conversation_participants; exception when others then null; end;
  begin alter publication supabase_realtime add table public.progress_alerts;           exception when others then null; end;
end $$;
