# Middagskollen – lokal drift

Läs först `LAS-MIG-FORST.md` i ZIP-filens rot. Kopiera hela denna mapp till Home Assistants lokala appmapp och installera den från app-/tilläggsbutiken.

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

## Tester

```sh
npm test
npm run check
```

Tester använder tillfälliga databaser och ändrar inte dina sparade val. Inget `npm install` behövs för att köra dem med Node 24.

## Uppdatering

Behåll samma slug `middagskollen` och höj `version` i `config.yaml` vid framtida koduppdateringar. Kopiera den nya koden över samma lokala appmapp, sök efter uppdateringar i appbutiken och uppdatera. Behåll tilläggets data; avinstallera inte för att uppdatera. `initial-state.json` importeras bara om den lokala databasen ännu saknar hushållets data.

Om inga val kan sparas: läs tilläggets logg och kontrollera att `/data` är skrivbar. Om appen inte syns: kontrollera att `config.yaml` ligger direkt i den lokala appmappen, uppdatera appbutiken och läs Supervisor-loggen.
