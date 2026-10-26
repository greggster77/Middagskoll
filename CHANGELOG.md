# 1.0.0 – 2026-10-25

- Export av publicerad Middagskollen version 11, inklusive den senaste sökningen, budgeten och varupriserna.
- Lokal Node/SQLite-server ersätter Cloudflare D1 och Worker-körmiljön.
- Standardval läses in första gången; inga tidigare användares personliga val följer med.
- Relativa fil- och API-adresser fungerar under Home Assistant Ingress.
- Ingen global avregistrering av Home Assistants service worker eller cache.
- Säkerhetskopiering och återställning av lokala val som JSON.
- Fylld pasta med ricotta matchas mot fylld pasta i prisunderlaget, inte färskost.
- Färska ingredienser hamnar inte i köttkategorin genom delsträngen ”färs”. Fylld färsk pasta grupperas med kylvaror.

# Delningskopia – 2026-10-26

- Personliga veckoplaner, egna priser, inköpsval och hemmalager har ersatts med rena standardval.
- Ursprunglig användares e-postadress har tagits bort från anropens User-Agent.
- Alla appfunktioner och medföljande riktpriser finns kvar.
