-- KrasApp: knoppen Doorstroom en Blijft bij "Volgend seizoen". Draai na 010.
alter table public.player_next_season add column if not exists status text not null default '';
alter table public.player_next_season drop constraint if exists player_next_season_status_check;
alter table public.player_next_season add constraint player_next_season_status_check
  check (status in ('', 'doorstroom', 'blijft'));
