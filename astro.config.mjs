// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// dominio previsto (anche in src/config/sito.ts)
const DOMINIO = 'https://www.traspogru.it';
const ESCLUSE = ['/404'];
// Build per GitHub Pages (impostata dal workflow): indirizzo NOME.github.io, niente sitemap (la copia non va indicizzata)
const PAGES = process.env.GITHUB_PAGES === 'true';

export default defineConfig({
  site: PAGES ? `https://${process.env.GITHUB_REPOSITORY_OWNER}.github.io` : DOMINIO,
  trailingSlash: 'ignore',
  // ogni pagina in una cartella (contatti/index.html): i link /contatti funzionano su qualsiasi server
  build: { format: 'directory', inlineStylesheets: 'always' },
  devToolbar: { enabled: false },
  prefetch: { prefetchAll: true, defaultStrategy: 'hover' },
  integrations: PAGES ? [] : [
    sitemap({ filter: (pagina) => !ESCLUSE.some((p) => new URL(pagina).pathname.startsWith(p)) }),
  ],
});
