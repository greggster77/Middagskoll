# Middagskollen

Mobilanpassad middagsplanerare som alla kan använda utan konto.

**[Öppna Middagskollen](https://greggster77.github.io/Middagskoll/)**

I webbversionen sparas dina val bara i din egen webbläsare. Andra besökare har egna veckoplaner och inköpslistor. Ingen automatisk synkning sker mellan enheter; använd säkerhetskopiering för att flytta dina val. Rensad webbläsardata kan ta bort dem.

Webbversionen har recept, veckoplan, inköpslista, matpreferenser och hemmalager. Budget, priser och erbjudandevyn är tills vidare pausade eftersom prisunderlaget behöver förbättras. Tidigare sparade budget- och prisinställningar bevaras.

## Lokal server och Home Assistant

Starta med Node.js 24 eller senare:

```sh
npm start
```

Öppna `http://127.0.0.1:8099/`. Installation i Home Assistant, Docker, filstruktur och felsökning beskrivs i **DOCS.md**.

500 recept, sökning på namn och ingredienser, veckoplan, portionsanpassning, inköpslista, matpreferenser, hemmalager, EAN-kamera och pasta ingår.
