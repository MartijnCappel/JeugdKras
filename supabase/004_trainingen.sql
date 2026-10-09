-- KrasApp fase 3: trainingen, aanwezigheid, chat per training en gelezen-status.
-- Uitvoeren na 001 en 003. Supabase: SQL Editor > New query > plakken > Run. Veilig om opnieuw te draaien.

-- 1. Tabellen ---------------------------------------------------------------
create table if not exists public.trainings (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  type       text not null default 'Anders',
  location   text not null default '',
  date       date not null,
  time       text not null check (time ~ '^[0-2][0-9]:[0-5][0-9]$'),
  duration   int  not null default 60 check (duration > 0),
  notes      text not null default '',
  series_id  uuid,
  cancelled  boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists trainings_date_idx on public.trainings (date);
create index if not exists trainings_series_idx on public.trainings (series_id);

create table if not exists public.training_trainers (
  training_id uuid not null references public.trainings(id) on delete cascade,
  staff_id    uuid not null references public.profiles(id) on delete cascade,
  primary key (training_id, staff_id)
);

create table if not exists public.training_players (
  training_id uuid not null references public.trainings(id) on delete cascade,
  player_id   uuid not null references public.players(id) on delete cascade,
  primary key (training_id, player_id)
);

create table if not exists public.training_attendance (
  training_id uuid not null references public.trainings(id) on delete cascade,
  player_id   uuid not null references public.players(id) on delete cascade,
  status      text not null default 'onbekend' check (status in ('aanwezig', 'afwezig', 'onbekend')),
  primary key (training_id, player_id)
);

create table if not exists public.training_messages (
  id          uuid primary key default gen_random_uuid(),
  training_id uuid not null references public.trainings(id) on delete cascade,
  sender_id   uuid not null references public.profiles(id) on delete cascade,
  text        text not null check (length(trim(text)) > 0),
  created_at  timestamptz not null default now()
);
create index if not exists training_messages_idx on public.training_messages (training_id, created_at);

-- Per gebruiker: hoeveel chatberichten gelezen zijn en of de training al bekeken is (voor de rode puntjes)
create table if not exists public.training_user_state (
  user_id     uuid not null references public.profiles(id) on delete cascade,
  training_id uuid not null references public.trainings(id) on delete cascade,
  chat_read   int  not null default 0,
  seen        boolean not null default false,
  primary key (user_id, training_id)
);

alter table public.trainings           enable row level security;
alter table public.training_trainers   enable row level security;
alter table public.training_players    enable row level security;
alter table public.training_attendance enable row level security;
alter table public.training_messages   enable row level security;
alter table public.training_user_state enable row level security;

-- 2. Hulpfuncties -----------------------------------------------------------
-- Mag ik deze training zien? Staf alle trainingen, een speler alleen die waar hij bij is ingedeeld.
create or replace function public.can_see_training(tid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_active() and (
    public.is_staff()
    or exists (
      select 1 from public.training_players tp
      join public.players p on p.id = tp.player_id
      where tp.training_id = tid and p.user_id = auth.uid()
    )
  );
$$;

-- Namen (alleen voor- en achternaam) van mensen met wie ik een training deel, voor de chat.
create or replace function public.profile_names()
returns table (id uuid, first_name text, last_name text)
language sql stable security definer set search_path = public as $$
  select pr.id, pr.first_name, pr.last_name
  from public.profiles pr
  where public.is_active() and pr.status = 'actief' and (
    public.is_staff()
    or pr.id = auth.uid()
    or exists (
      select 1
      from public.players pa
      join public.training_players a on a.player_id = pa.id
      join public.training_players b on b.training_id = a.training_id
      join public.players pb on pb.id = b.player_id
      where pa.user_id = pr.id and pb.user_id = auth.uid()
    )
  );
$$;

revoke all on function public.can_see_training(uuid), public.profile_names() from public, anon;
grant execute on function public.can_see_training(uuid), public.profile_names() to authenticated;

-- 3. Rechten (RLS) ----------------------------------------------------------
drop policy if exists "trainingen zien" on public.trainings;
create policy "trainingen zien" on public.trainings for select to authenticated using (public.can_see_training(id));
drop policy if exists "trainingen maken" on public.trainings;
create policy "trainingen maken" on public.trainings for insert to authenticated with check (public.is_staff());
drop policy if exists "trainingen wijzigen" on public.trainings;
create policy "trainingen wijzigen" on public.trainings for update to authenticated using (public.is_staff()) with check (public.is_staff());
drop policy if exists "trainingen verwijderen" on public.trainings;
create policy "trainingen verwijderen" on public.trainings for delete to authenticated using (public.is_staff());

drop policy if exists "trainers zien" on public.training_trainers;
create policy "trainers zien" on public.training_trainers for select to authenticated using (public.can_see_training(training_id));
drop policy if exists "trainers beheren" on public.training_trainers;
create policy "trainers beheren" on public.training_trainers for all to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists "deelnemers zien" on public.training_players;
create policy "deelnemers zien" on public.training_players for select to authenticated using (public.can_see_training(training_id));
drop policy if exists "deelnemers beheren" on public.training_players;
create policy "deelnemers beheren" on public.training_players for all to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists "aanwezigheid zien" on public.training_attendance;
create policy "aanwezigheid zien" on public.training_attendance for select to authenticated using (public.can_see_training(training_id));
drop policy if exists "aanwezigheid invullen" on public.training_attendance;
create policy "aanwezigheid invullen" on public.training_attendance for insert to authenticated
with check (public.is_staff() or (public.is_my_player(player_id) and public.can_see_training(training_id)));
drop policy if exists "aanwezigheid wijzigen" on public.training_attendance;
create policy "aanwezigheid wijzigen" on public.training_attendance for update to authenticated
using (public.is_staff() or (public.is_my_player(player_id) and public.can_see_training(training_id)))
with check (public.is_staff() or (public.is_my_player(player_id) and public.can_see_training(training_id)));
drop policy if exists "aanwezigheid verwijderen" on public.training_attendance;
create policy "aanwezigheid verwijderen" on public.training_attendance for delete to authenticated using (public.is_staff());

drop policy if exists "chat zien" on public.training_messages;
create policy "chat zien" on public.training_messages for select to authenticated using (public.can_see_training(training_id));
drop policy if exists "chat sturen" on public.training_messages;
create policy "chat sturen" on public.training_messages for insert to authenticated
with check (sender_id = auth.uid() and public.can_see_training(training_id));

drop policy if exists "eigen status" on public.training_user_state;
create policy "eigen status" on public.training_user_state for all to authenticated
using (user_id = auth.uid() and public.is_active()) with check (user_id = auth.uid() and public.is_active());

-- 4. Live updates (chat en aanwezigheid verschijnen direct) ----------------
do $$
begin
  begin alter publication supabase_realtime add table public.training_messages;   exception when others then null; end;
  begin alter publication supabase_realtime add table public.training_attendance; exception when others then null; end;
  begin alter publication supabase_realtime add table public.trainings;           exception when others then null; end;
  begin alter publication supabase_realtime add table public.training_players;    exception when others then null; end;
end $$;
