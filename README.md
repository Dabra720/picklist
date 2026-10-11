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
- Templates: herbruikbare lijsten. Sla een paklijst op als template (⋯ in de lijst), of maak
  er zelf een. Een template bewerk je zoals een lijst, maar zonder vinkjes. Bij **Nieuwe
  paklijst** kies je een lege lijst of een template; labels, kleuren, items, aantallen en
  volgorde worden overgenomen, zonder vinkjes. Een template is een kopie: wijzigingen in de
  template en in lijsten raken elkaar niet. Templates kun je in categorieën groeperen.
- Taken: eenmalig werk met een status (Te doen, Bezig, Afgerond), prioriteit, deadline (datum en
  eventueel tijd), subtaken, notities en een project. Lijstweergave gegroepeerd op deadline of
  prioriteit, of een bord met drie kolommen (op de telefoon één kolom tegelijk met tabbladen en
  **Verplaats naar**; op een groot scherm naast elkaar, met slepen). Anders dan een paklijst
  vink je een taak één keer af.
- Notities: vrije tekst met een titel, voor alles wat niet in een paklijst past. Wordt tijdens
  het typen automatisch bewaard, is doorzoekbaar en een verwijderde notitie kun je terughalen
  via **Ongedaan maken**. Een nieuwe notitie die je leeg laat, verdwijnt vanzelf.
- Menu (☰ linksboven) om te wisselen tussen **Paklijsten**, **Templates**, **Taken** en
  **Notities**, en voor de **Instellingen**.
- Back-ups als JSON (Menu → Instellingen):
  - **Exporteren**: alles, of alleen de onderdelen die je kiest (Paklijsten, Templates,
    Taken, Notities, Instellingen).
  - **Terugzetten**: kies per onderdeel en kies **Samenvoegen** (voegt toe wat nieuw is; bij
    iets wat al bestaat blijft de laatst gewijzigde versie staan; er wordt niets verwijderd) of
    **Vervangen** (de gekozen onderdelen worden gewist en vervangen).
  - Een back-up wordt eerst gecontroleerd. Kapotte of losse gegevens worden overgeslagen en
    genoemd, in plaats van dat het hele bestand wordt geweigerd.
  - Is je laatste volledige back-up ouder dan 30 dagen, dan krijg je (hooguit eens per week) een
    melding met een knop om er direct een te maken.
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

- Alle gegevens staan in IndexedDB (database `paklijsten`): lijsten, labels, items, vinkjes,
  volgordes, templates, taken, notities en instellingen zoals het thema. Elke wijziging wordt direct opgeslagen;
  notities kort na het typen en altijd bij het verlaten van de notitie of de app.
- Elk record heeft een `id` (UUID), `createdAt` en `updatedAt`. Daarmee kunnen back-ups later
  worden samengevoegd en kan de app later tussen apparaten synchroniseren.
- De service worker cachet alleen de bestanden van de app. Een update vervangt die bestanden en
  raakt de database niet aan.
- Wijzigt het datamodel, voeg dan een stap toe aan `MIGRATIONS` in
  [src/core/migrations.ts](src/core/migrations.ts). De databaseversie volgt daar automatisch uit.
  Een stap mag stores toevoegen en velden aanvullen, maar nooit stores of gegevens verwijderen.

  | Versie | Wijziging |
  | ------ | --------- |
  | 1 | Paklijsten: `lists`, `labels`, `items` |
  | 2 | Notities: `notes` |
  | 3 | Store `settings`; `createdAt`/`updatedAt` op elk record (labels en items krijgen de datum van hun lijst) |
  | 4 | Templates: `templates` (met labels en items erin), `templateCategories` |
  | 5 | Taken: `tasks` (met subtaken erin), `projects` |

- Back-upformaat (versie 3): per module een eigen deel met een eigen versienummer, zodat een
  module zijn gegevens kan wijzigen zonder de andere te raken en een back-up ook maar een deel
  kan bevatten. Een module beschrijft zijn deel in `src/modules/<module>/backup.ts`; de opbouw,
  controle en het samenvoegen staan in [src/app/backup.ts](src/app/backup.ts). Back-ups uit
  oudere versies (1 en 2) blijven werken. Instellingen die bij dit apparaat horen (zoals de datum
  van de laatste back-up) gaan niet mee.

## Projectstructuur

De app bestaat uit een kern en losse modules. Een module meldt zich aan in
`src/modules/index.ts` met zijn schermen (routes), menu-item en opstartstappen; de kern hoeft
daarvoor niet te veranderen.

```
src/
  main.tsx              Startpunt: thema, modules registreren, database laden, service worker
  App.tsx               Kiest het scherm bij de route via het moduleregister
  styles.css            Alle styling, met kleuren voor licht en donker
  core/                 Gedeeld door alle modules
    db.ts               Dunne laag rond IndexedDB
    migrations.ts       Databasemigraties, één stap per versie
    store.ts            Gegevens in het geheugen, schrijfwachtrij (commit), instellingen
    router.ts           Hash-routes (#/<onderdeel>/<id>)
    modules.ts          Wat een module aan de app vertelt (AppModule)
    types.ts            BaseRecord en AppData
    components/         Sheet, dialogen, ProgressBar, Icon, meldingen
    lib/                Thema, meldingen, viewport en hulpfuncties
  app/                  De schil rond de modules: menu, instellingen, back-up
  modules/
    index.ts            Alle modules, in menuvolgorde
    lists/              Paklijsten: types, store, schermen, sheets
    templates/          Templates en categorieën: types, store, schermen
    tasks/              Taken en projecten: types, store, lijst, bord, detail
    notes/              Notities: types, store, schermen
scripts/
  generate-icons.mjs    Maakt de PNG-iconen zonder externe pakketten
public/                 Iconen en favicon
```

Gebouwd met React, TypeScript, Vite en `vite-plugin-pwa`. Verder geen runtime-afhankelijkheden.
