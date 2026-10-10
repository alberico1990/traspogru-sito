# Sito Traspogru

Sito web di **Traspogru S.r.l.** (Castellammare di Stabia): trasporto di lamiere fuori sagoma su semirimorchi a piano inclinato, in tutta Italia.

Sito statico in **Astro 7**, senza database né servizi esterni: i moduli di preventivo e candidatura preparano un messaggio e lo aprono in WhatsApp o nell'app di posta del visitatore. Animazioni con CSS nativo (scroll-driven, view transitions, popover): quasi nessun JavaScript.

## Comandi

```bash
npm install          # prima volta (serve Node 22 o superiore)
npm run dev          # anteprima locale su http://localhost:4321
npm run build        # genera il sito in dist/
```

## Dove si trovano le cose

| Cosa | Dove |
|---|---|
| Dati aziendali, telefono, email, P.IVA, REA, Albo | `src/config/sito.ts` |
| Dominio (sitemap e canonici) | `astro.config.mjs` e `src/config/sito.ts` |
| Pagine | `src/pages/*.astro` |
| Domande frequenti (pagina + dati strutturati) | `src/data/faq.ts` |
| Colori, caratteri, tagli inclinati | `src/styles/global.css` |
| Foto (Astro le converte in WebP alle varie misure) | `src/assets/foto/` |
| Video hero e carrelli, poster, icone, immagine social | `public/` |
| Moduli preventivo/candidatura | `src/components/Modulo.astro` |
| Intro della Home (accesa/spenta: `intro` in `sito.ts`) | `src/components/home/Intro.astro` |
| Mappa delle rotte | `src/components/home/MappaRotte.astro`, dati in `src/data/mappa.json` |
| Nastro segnaletico, logo Fincantieri | `src/components/Nastro.astro`, `LogoFincantieri.astro` |
| File storico per intestazioni Cloudflare (ignorato da GitHub Pages) | `public/_headers` |

## Pubblicazione

**GitHub Pages (dominio ufficiale).** A ogni push su `main` il workflow `.github/workflows/pages.yml` costruisce il sito per `https://www.traspogru.it/`. La build usa i percorsi alla radice, genera la sitemap e consente l'indicizzazione delle pagine; la pagina 404 resta `noindex`. Prima della pubblicazione verifica canonical, Open Graph, immagine social e navigazione.

Configurazione: *Settings → Pages → Build and deployment → Source: **GitHub Actions***, dominio personalizzato `www.traspogru.it` e **Enforce HTTPS**. Su Aruba, `www` deve essere un CNAME verso `alberico1990.github.io`; il dominio senza `www` deve puntare agli indirizzi A di GitHub Pages. GitHub reindirizza gli indirizzi alternativi al dominio ufficiale.

**Anteprima in sottocartella.** La configurazione conserva il supporto alla build con `GITHUB_PAGES=true`, `PUBLIC_NOINDEX=true`, `GITHUB_REPOSITORY_OWNER` e `GITHUB_REPOSITORY`. In quel caso eseguire dopo la build `node scripts/prefix-base.mjs /traspogru-sito` e verificare con `node scripts/check-metadata.mjs https://alberico1990.github.io/traspogru-sito/ --noindex`. In Git Bash usare `MSYS_NO_PATHCONV=1` per il comando di prefisso. Questa modalità non è usata dal workflow ufficiale.

## Note

- **Marchi di terzi:** il logo Fincantieri (`src/assets/logo/fincantieri.svg`, da Wikimedia Commons) è un marchio registrato di Fincantieri S.p.A., usato perché Traspogru è vettore qualificato (albo fornitori): conviene avere l'autorizzazione scritta di Fincantieri.
- **Dati cartografici:** contorno dell'Italia da Natural Earth (pubblico dominio).
- **Caratteri:** Big Shoulders Display, Schibsted Grotesk e IBM Plex Mono, ospitati localmente (pacchetti Fontsource, licenza OFL).
- Foto e video sono dell'azienda: tutti i diritti riservati a Traspogru S.r.l.
