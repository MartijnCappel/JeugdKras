# KrasApp

KrasApp is een mobiel-eerst app voor een handbalclub (HV KRAS / Volendam), volledig in het Nederlands.
De app brengt spelers, trainers, begeleiders, specialisten en de coördinator samen op één plek: wie traint
wanneer, hoe het met een speler gaat, welke schema's iemand moet volgen en wie je kunt berichten.

Dit is een **demo met nepgegevens**: alles draait in de browser en wordt niet opgeslagen. Na het herladen van de pagina is alles weer terug bij de beginstand.

## Wat kan de app

- **Trainingen** plannen (ook wekelijks herhalend), aanwezigheid bijhouden en een gesprek per training
- **Schema's** van specialisten (voeding, kracht, loop, herstel, sportpsychologie), die de speler zelf logt
- **Voortgang** van de speler: mood, vermoeidheid en fysieke toestand met smileys, plus een logboek
- **Modules en weekprogramma** van de speler, en het **Talent Volg Systeem** voor de staf
- **Berichten** tussen staf en de spelers die aan hen gekoppeld zijn
- **Rode puntjes** bij alles wat nieuw is: berichten, trainingen, schema's en spelers die naar rood gaan

## Wat kan je per rol

### Coördinator
- Nieuwe accounts goedkeuren of afwijzen en de rol van iedereen instellen (tabblad Beheer)
- Staf aan spelers koppelen (tabblad Staf) en alle spelers inzien, inclusief het Talent Volg Systeem
- Trainingen plannen en aanpassen

*Waarom handig:* de coördinator houdt overzicht over de hele club en bepaalt wie wat mag zien, zonder zelf
elke training of speler te hoeven volgen.

### Trainer
- Eigen trainingen plannen, wijzigen of annuleren, aanwezigheid noteren en met de groep chatten
- Per speler posities, fysieke toestand en modules aanpassen, het Talent Volg Systeem invullen en het logboek bijhouden
- Een rood puntje zien zodra een gekoppelde speler iets in zijn voortgang op rood zet

*Waarom handig:* de trainer ziet meteen wie er komt, hoe spelers erbij zitten en bij wie extra aandacht nodig is.

### Begeleider
- Trainingen plannen, aanwezigheid bijhouden en met de groep chatten
- Posities, fysieke toestand en modules van spelers aanpassen en het logboek bijhouden
- Een rood puntje zien als een gekoppelde speler naar rood gaat

*Waarom handig:* de begeleider ondersteunt de trainer en heeft dezelfde actuele informatie over de spelers, zodat
niets blijft liggen.

### Specialist
- Schema's maken, aanpassen en verwijderen voor één of meer spelers, met een einddatum
- Eigen functietitel instellen (bijvoorbeeld fysiotherapeut of diëtist), die in de hele app getoond wordt
- Spelers inzien, het Talent Volg Systeem invullen en het logboek bijhouden

*Waarom handig:* een externe deskundige kan een speler gericht begeleiden en ziet daarna terug hoe de speler het
schema in de praktijk volgt.

### Speler
- **Agenda:** eigen trainingen zien, aanwezigheid doorgeven, met de groep chatten en de training zelf beoordelen
- **Voortgang:** zelf aangeven hoe het gaat met mood, vermoeidheid en fysieke toestand, en het eigen logboek bekijken
- **Schema's:** onderdelen van een schema loggen met een score van 1 tot 5
- **Modules:** kiezen welke modules je volgt en het weekprogramma met school en trainingen invullen
- Berichten sturen aan de eigen trainer, begeleider en specialist. Van andere spelers is alleen de naam zichtbaar.

*Waarom handig:* de speler krijgt één plek voor alles wat hij moet weten en kan zelf laten zien hoe het gaat,
zodat de staf er op tijd bij is.

## Demo-accounts

Wachtwoord voor alle accounts: `demo123`. Rechtsboven zit ook een knop om direct van rol te wisselen.

## Zelf draaien

```bash
npm install
npm run dev
```

Productie-build maken: `npm run build` (de uitvoer komt in `dist/`).

## Online zetten met GitHub Pages

1. Zet dit project in een GitHub-repository (branch `main`).
2. Ga in de repository naar **Settings → Pages** en kies bij **Source** voor **GitHub Actions**.
3. Bij elke push naar `main` bouwt de workflow in `.github/workflows/deploy.yml` de app en zet hem online op
   `https://<jouw-gebruikersnaam>.github.io/<repository-naam>/`.

## Let op

Zet nooit echte spelersgegevens in een openbare repository. De namen in de demo zijn verzonnen.

## Echte app met database (Supabase)

De app gebruikt Supabase voor inloggen en gegevens. Zonder deze koppeling, of met `?demo` achter de link, draait de app met nepgegevens.

Instellen:
1. Maak een Supabase-project (regio EU) en zet de URL en publishable key in `.env`.
2. Draai `supabase/001_inloggen_en_rollen.sql` in Supabase (SQL Editor).
3. Registreer in de app met je eigen e-mailadres en draai daarna `supabase/002_eerste_coordinator.sql` (met je adres) om de eerste coördinator aan te maken.
4. Zet in Supabase onder Authentication > URL Configuration de Site URL op de link van de app.

Zet nooit de `service_role` key of het database-wachtwoord in de code.
