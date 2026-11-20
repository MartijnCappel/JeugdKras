-- KrasApp: bij "Volgend seizoen" kan precies één keuze gemaakt worden:
-- Doorstroom, Blijft, Uitstroom of Instroom. Draai na 010. Veilig om opnieuw te draaien.
alter table public.player_next_season add column if not exists status text not null default '';
alter table public.player_next_season drop constraint if exists player_next_season_status_check;

-- Bestaande rijen met Uitstroom/Instroom omzetten naar de nieuwe keuze (Uitstroom gaat voor)
update public.player_next_season set status = 'uitstroom' where status = '' and outflow;
update public.player_next_season set status = 'instroom'  where status = '' and inflow;

alter table public.player_next_season add constraint player_next_season_status_check
  check (status in ('', 'doorstroom', 'blijft', 'uitstroom', 'instroom'));
