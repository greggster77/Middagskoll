# Middagskollen – lokal drift

Kopiera hela detta projekt till Home Assistants lokala appmapp och installera det från app-/tilläggsbutiken.

## Kör samma app utan Home Assistant Supervisor

Krav: Node.js **24 eller senare** med den inbyggda modulen `node:sqlite`. Inga npm-paket behöver installeras. Stå i den här mappen och kör:

```sh
node server.mjs
```

Öppna `http://127.0.0.1:8099/` på samma dator. Standardval läses in första gången från `initial-state.json` och sparas därefter i `data/middagskollen.sqlite`. Detta startläge är bundet till datorns egen adress och har ingen separat inloggning. För mobilåtkomst utanför HA behövs en separat korrekt konfigurerad HTTPS-proxy med autentisering; ändra inte bara till en publik port.

## Docker lokalt, till exempel på en dator med Home Assistant Container

```sh
docker build -t middagskollen-local .
docker run --rm --name middagskollen \
  -p 127.0.0.1:8099:8099 \
  -e HA_INGRESS_ONLY=0 \
  -e HOST=0.0.0.0 \
  -v middagskollen-data:/data \
  middagskollen-local
```

Öppna åter `http://127.0.0.1:8099/` på den datorn. Volymen `middagskollen-data` bevarar valen efter omstart. Dockerbilden hämtas vid byggtillfället, inte vid varje sidöppning.

## Drift i Home Assistant

`config.yaml` aktiverar Ingress på intern port 8099. Ingen port mappas till värden. Endast Supervisor-adressen `172.30.32.2` accepteras i tilläggsläget. Användarens Home Assistant-inloggning hanteras före appen. Sidopanelen visas som standard för administratörer.

Alla lokala resurs- och API-adresser är relativa. Det gör att de fungerar under Home Assistants varierande `/api/hassio_ingress/.../`-sökväg. Skrivningar kräver JSON och en särskild begärandeheader, saknar CORS-stöd och avvisar `cross-site`. SQLite använder WAL och revisionskontroll. API:erna för EAN och erbjudanden körs på den lokala servern så att webbläsaren slipper butikernas CORS-begränsningar.

Filerna i `public/` är färdiga och kräver inget frontendbygge. `scanner-lib.js` är lokalt paketerad ZXing-kod; licenser finns i `licenses/`. Inga bilder från originalrecepten laddas ned i paketet; de hämtas vid behov från respektive källa, som tidigare.

## Filstruktur

| Sökväg | Innehåll |
| --- | --- |
| `public/index.html` | Startsidan som servern visar. |
| `public/ui/` | Den aktuella exportens gränssnitt, receptdata och stilar, utflyttade ur HTML-filen i ursprunglig laddningsordning. Gör designändringar här. |
| `public/*.js`, `public/style.css` | Tidigare separata klientmoduler som fortfarande används av befintliga modultester. Startsidan laddar i stället `public/ui/`; versionerna har inte slagits ihop eller tagits bort. |
| `worker/` | API-hanterare och butikskopplingar som importeras av `server.mjs`. |
| `tests/`, `scripts/` | Automatiska tester och kodkontroll. |
| `licenses/` | Licenstexter för ZXing och dess beroenden. |
| `src/schema.ts`, `drizzle/` | Befintlig databasdefinition och migrationshistorik. Den lokala servern skapar sin SQLite-tabell själv. |
| `archive/indexfil.html` | Separat tidrapporteringsapp, bevarad men inte publicerad av servern. |
| `.gitignore`, `.dockerignore` | Undantag för bland annat databaser, beroenden och Git-filer; tidigare felbenämnda `download`-filer. |

Endast `public/` är åtkomlig via webben. Servern, startdata, testfiler, databasdefinitioner och arkivet ska ligga utanför den mappen. Startsidan laddar externa skript från samma server för att följa dess befintliga Content Security Policy. `data-runtime="server"` aktiverar API-sparning i SQLite i stället för HTML-exportens webbläsarlagring. Befintliga webbläsarval importeras inte automatiskt; exportera en säkerhetskopia från den gamla versionen och återställ den i serverversionen vid behov.

## Tester

Menyn **Undvik** stöder även nötter och mandel (inklusive jord- och pinjenötter), ägg, mjölkprodukter, gluten, soja och lök (inklusive vitlök, purjo och gräslök). Valen filtrerar receptens ingrediensnamn och anteckningar och uppdaterar veckoplan, receptsökning och inköpsbehov. Valen sparas och följer med säkerhetskopior; äldre kopior har de nya bortvalen avstängda. En kombination utan passande middagar avvisas med ett meddelande och föregående val behålls.

Detta är matpreferenser, **inte allergifilter**. Sammansatta produkter och spår av allergener kan inte bedömas säkert från receptnamnen. Kontrollera alltid originalrecept och förpackningar. Recept med alternativa eller valfria ingredienser filtreras också när ett bortval matchar; appen skriver inte om originalrecept.

```sh
npm test
npm run check
```

Tester använder tillfälliga databaser och ändrar inte dina sparade val. Inget `npm install` behövs för att köra dem med Node 24.

## Uppdatering

Behåll samma slug `middagskollen` och höj `version` i `config.yaml` vid framtida koduppdateringar. Kopiera den nya koden över samma lokala appmapp, sök efter uppdateringar i appbutiken och uppdatera. Behåll tilläggets data; avinstallera inte för att uppdatera. `initial-state.json` importeras bara om den lokala databasen ännu saknar hushållets data.

Om inga val kan sparas: läs tilläggets logg och kontrollera att `/data` är skrivbar. Om appen inte syns: kontrollera att `config.yaml` ligger direkt i den lokala appmappen, uppdatera appbutiken och läs Supervisor-loggen.
