# Paklijsten

Een Progressive Web App om paklijsten te beheren en bij vertrek af te vinken. Gemaakt voor
iPhone, werkt ook op Android en desktop. Alles wordt lokaal op het apparaat bewaard: geen
account, geen server, en na de eerste keer laden volledig offline te gebruiken.

## Wat kan de app

- Meerdere paklijsten: aanmaken, hernoemen, dupliceren en (na bevestiging) verwijderen.
- Labels per lijst (bijv. Kleding, Elektronica) met een eigen kleur en voortgang. Een label
  verwijderen laat de items staan.
- Items toevoegen, bewerken, verwijderen, naar een ander label verplaatsen, zoeken, sorteren en
  met de greep rechts handmatig verslepen (of met pijl omhoog/omlaag op het toetsenbord).
- Een aantal per item: typ "7x sokken" bij het toevoegen, of pas het aantal aan via het
  potloodje. Het item blijft één regel die je in één keer afvinkt.
- Alles in één keer afvinken of resetten. Een reset verandert alleen de vinkjes, zodat je een
  lijst steeds opnieuw kunt gebruiken. Per ongeluk gedaan? Kies **Ongedaan maken** in de melding.
- Dashboard met voortgangsbalk per lijst en een duidelijke markering als een lijst compleet is.
- Notities: vrije tekst met een titel, voor alles wat niet in een paklijst past. Wordt tijdens
  het typen automatisch bewaard, is doorzoekbaar en een verwijderde notitie kun je terughalen
  via **Ongedaan maken**. Een nieuwe notitie die je leeg laat, verdwijnt vanzelf.
- Menu (☰ linksboven) om te wisselen tussen **Paklijsten** en **Notities**, en voor de
  **Instellingen**.
- Back-up exporteren en terugzetten als JSON (Menu → Instellingen). Een back-up bevat lijsten
  én notities. Zet je een oudere back-up zonder notities terug, dan blijven je notities staan.
- Lichte en donkere weergave (volgt het systeem, of kies zelf).

## Aan de slag

Vereist: [Node.js](https://nodejs.org) 20 of nieuwer.

```bash
npm install
npm run dev
```

Open daarna de getoonde URL (standaard http://localhost:5173).

Op je telefoon testen tijdens het ontwikkelen kan met `npm run dev:phone`; open dan het
netwerkadres dat Vite toont. Let op: installeren als app en offline gebruik werken alleen via
HTTPS (of `localhost`), dus niet via zo'n netwerkadres. De service worker is bovendien alleen
actief in de productiebuild.

## Scripts

| Script            | Doel                                                        |
| ----------------- | ----------------------------------------------------------- |
| `npm run dev`     | Start de ontwikkelserver                                    |
| `npm run build`   | Controleert de types en maakt een productiebuild in `dist/` |
| `npm run preview` | Serveert de productiebuild lokaal (inclusief service worker) |
| `npm run lint`    | Controleert de types zonder te bouwen                       |
| `npm run icons`   | Genereert de app-iconen in `public/` opnieuw                |

## Productiebuild

```bash
npm run build
npm run preview
```

De map `dist/` bevat een volledig statische site (HTML, CSS, JS, manifest, service worker en
iconen) en kan op elke statische host met HTTPS worden geplaatst. Alle paden zijn relatief, dus
de app werkt ook in een submap zoals `https://<gebruiker>.github.io/<repo>/`.

## Gratis publiceren via GitHub Pages

De workflow [.github/workflows/deploy.yml](.github/workflows/deploy.yml) bouwt en publiceert de
app bij elke push naar `main`.

1. Zet de code in een GitHub-repository en push naar `main`.
2. Ga op GitHub naar **Settings → Pages** en kies bij **Build and deployment → Source** voor
   **GitHub Actions**.
3. Push opnieuw, of start de workflow *Deploy to GitHub Pages* handmatig onder **Actions**.
4. Na een minuut staat de app op `https://<gebruiker>.github.io/<repo>/`. De precieze URL staat
   bij de afgeronde workflow en onder **Settings → Pages**.

Goed om te weten: met een gratis GitHub-account werkt Pages alleen voor **openbare**
repository's. Voor een privé-repository is een betaald abonnement nodig. De gepubliceerde site
is in beide gevallen voor iedereen met de link bereikbaar; je paklijsten zelf staan alleen op je
eigen apparaat en worden nooit geüpload.

## Installeren op een iPhone

1. Open de gepubliceerde URL in **Safari**.
2. Tik op de **Deel**-knop (vierkant met pijl omhoog).
3. Kies **Zet op beginscherm** en tik op **Voeg toe**.
4. Open de app voortaan via het icoon op je beginscherm. Hij start dan schermvullend, zonder
   browserbalk, en werkt ook zonder internet.

Op Android (Chrome): menu **⋮ → App installeren**. Op desktop (Chrome of Edge): het
installatie-icoon in de adresbalk.

### Aandachtspunten op iOS

- De app op het beginscherm heeft een **eigen opslag**, los van Safari. Lijsten die je in Safari
  hebt gemaakt, staan dus niet automatisch in de geïnstalleerde app. Gebruik een back-up om ze
  over te zetten.
- Verwijder je de app van het beginscherm of wis je de websitegegevens, dan zijn de lijsten weg.
  iOS kan gegevens van websites die lang niet zijn gebruikt ook zelf opruimen; voor apps op het
  beginscherm geldt die limiet niet. Maak hoe dan ook af en toe een back-up via **Menu → Instellingen →
  Back-up exporteren** en bewaar het bestand in Bestanden of iCloud Drive.
- Een nieuwe versie van de app wordt automatisch opgehaald en geladen zodra je de app opent
  terwijl je online bent.

## Gegevens en updates

- Lijsten, labels, items, vinkjes, volgordes en notities staan in IndexedDB (database
  `paklijsten`). Elke wijziging wordt direct opgeslagen; notities kort na het typen en altijd
  bij het verlaten van de notitie of de app.
- Versie 2 van de database voegt de store `notes` toe. Bestaande stores en gegevens blijven bij
  die upgrade onaangeroerd.
- De service worker cachet alleen de bestanden van de app. Een update vervangt die bestanden en
  raakt de database niet aan.
- Wijzigt het datamodel later, verhoog dan `DB_VERSION` in [src/db/idb.ts](src/db/idb.ts) en
  voeg een migratiestap toe in `upgrade`. Verwijder daar nooit bestaande stores.
- Een geïmporteerde back-up wordt eerst gecontroleerd (structuur, verplichte velden, verwijzingen
  tussen lijsten, labels en items). Pas na bevestiging worden de bestaande gegevens vervangen.

## Projectstructuur

```
src/
  main.tsx            Startpunt: thema, database laden, service worker registreren
  App.tsx             Kiest het scherm op basis van de route
  types.ts            Datamodellen (PackList, Label, Item, Note)
  styles.css          Alle styling, met kleuren voor licht en donker
  db/idb.ts           Dunne laag rond IndexedDB
  store/store.ts      Gegevens in het geheugen plus alle bewerkingen
  store/backup.ts     Export, import en validatie van back-ups
  lib/                Route, thema, meldingen en hulpfuncties
  components/         Herbruikbare bouwstenen (Sheet, dialogen, menu, ProgressBar, Icon)
  screens/            Hoofdscherm, lijstscherm, notities en de bijbehorende sheets
scripts/
  generate-icons.mjs  Maakt de PNG-iconen zonder externe pakketten
public/               Iconen en favicon
```

Gebouwd met React, TypeScript, Vite en `vite-plugin-pwa`. Verder geen runtime-afhankelijkheden.
