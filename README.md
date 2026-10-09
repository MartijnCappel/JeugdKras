# KrasApp

Mobiel-eerst beheerapp voor een handbalclub (HV KRAS / Volendam), volledig in het Nederlands.
Rollen: Coördinator, Trainer, Begeleider, Specialist en Speler.

Dit is een **demo met nepgegevens**: alles draait in de browser en wordt niet opgeslagen. Na het herladen van de pagina is alles weer terug bij de beginstand.

## Wat kan de app

- Trainingen plannen (ook wekelijks herhalend), aanwezigheid bijhouden en een gesprek per training
- Schema's van specialisten voor spelers, met loggen door de speler
- Voortgang van de speler (mood, vermoeidheid, fysieke toestand) en een logboek
- Modules en weekprogramma van de speler, Talent Volg Systeem voor de staf
- Berichten tussen staf en gekoppelde spelers
- Rode puntjes voor nieuwe berichten, trainingen, schema's en wijzigingen in de voortgang

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
