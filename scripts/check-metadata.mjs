// Verifica l'HTML finale: URL pubblici, immagine social presente e noindex.
// Uso: node scripts/check-metadata.mjs https://nome.github.io/repository/ --noindex
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';

const root = resolve('dist');
const site = new URL(process.argv[2]);
assert.ok(site.pathname.endsWith('/'), 'L’indirizzo del sito deve terminare con /');
const noindex = process.argv.includes('--noindex');
let pages = 0;
const canonicalsForSitemap = new Set();
const pageUrls = new Set();
const internalLinks = [];

function attributes(tag) {
  return Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*(["'])(.*?)\2/g)].map((m) => [m[1], m[3]]));
}

function check(file) {
  const name = relative(root, file).split(sep).join('/');
  const route = name === 'index.html' ? '' : name.replace(/\/index\.html$|\.html$/g, '');
  const expected = new URL(route === '404' ? '404.html' : route ? `${route}/` : '', site).href;
  const html = readFileSync(file, 'utf8');
  // File di prova della proprieta' fornito da Search Console, non una pagina del sito.
  if (/^google[0-9a-f]+\.html$/.test(name)) {
    assert.equal(html.trim(), `google-site-verification: ${name}`, `${name}: verifica Google alterata`);
    return;
  }
  const head = html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1];
  assert.ok(head, `${name}: head mancante`);
  const tags = [...head.matchAll(/<(?:meta|link)\b[^>]*>/gi)].map((m) => attributes(m[0]));
  const canonicals = tags.filter((a) => a.rel === 'canonical');
  assert.equal(canonicals.length, 1, `${name}: canonical unico`);
  assert.equal(canonicals[0].href, expected, `${name}: canonical errato`);
  assert.equal(tags.find((a) => a.property === 'og:url')?.content, expected, `${name}: og:url errato`);
  const image = new URL(tags.find((a) => a.property === 'og:image')?.content);
  assert.equal(image.origin, site.origin, `${name}: origine immagine errata`);
  assert.equal(tags.find((a) => a.name === 'twitter:image')?.content, image.href, `${name}: anteprima Twitter incoerente`);
  assert.ok(tags.find((a) => a.property === 'og:image:alt')?.content, `${name}: descrizione immagine social mancante`);
  assert.equal(tags.find((a) => a.name === 'twitter:image:alt')?.content, tags.find((a) => a.property === 'og:image:alt')?.content, `${name}: descrizioni social incoerenti`);
  assert.ok(image.pathname.startsWith(site.pathname), `${name}: immagine fuori dalla sottocartella`);
  const asset = resolve(root, decodeURIComponent(image.pathname.slice(site.pathname.length)));
  assert.ok(asset.startsWith(root + sep) && existsSync(asset) && statSync(asset).isFile(), `${name}: immagine social inesistente`);
  const robots = tags.find((a) => a.name === 'robots')?.content ?? '';
  assert.equal(/\bnoindex\b/i.test(robots), noindex || route === '404', `${name}: noindex errato`);
  pageUrls.add(expected);
  if (!/\bnoindex\b/i.test(robots)) canonicalsForSitemap.add(expected);
  const datiStrutturati = [...html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)]
    .map((match) => JSON.parse(match[1]));
  for (const dati of datiStrutturati) assert.ok(dati['@context'], `${name}: JSON-LD non valido`);
  const percorso = html.match(/<nav\b[^>]*aria-label="Percorso"[^>]*>([\s\S]*?)<\/nav>/)?.[1];
  const breadcrumbs = datiStrutturati.filter((dati) => dati['@type'] === 'BreadcrumbList');
  assert.equal(breadcrumbs.length, percorso ? 1 : 0, `${name}: percorso strutturato diverso da quello visibile`);
  if (percorso) {
    const voci = breadcrumbs[0].itemListElement;
    assert.equal(voci.length, 2, `${name}: gerarchia del percorso errata`);
    assert.deepEqual(voci.map((voce) => voce.position), [1, 2], `${name}: ordine del percorso errato`);
    assert.equal(voci[0].item, site.href, `${name}: home del percorso errata`);
    assert.equal(voci[1].item, expected, `${name}: pagina del percorso non canonica`);
    assert.equal(voci[1].name, percorso.match(/<span\b[^>]*aria-current="page"[^>]*>([^<]+)<\/span>/)?.[1], `${name}: etichetta del percorso incoerente`);
  }
  // Il cambio di base non deve alterare la voce corrente della navigazione.
  for (const match of html.matchAll(/<a\b[^>]*>/gi)) {
    const a = attributes(match[0]);
    if (a.href?.startsWith('/') && !a.href.startsWith('//')) {
      const target = new URL(a.href, site);
      target.hash = '';
      target.search = '';
      internalLinks.push([name, target.href]);
    }
    if (a['aria-current'] === 'page') {
      assert.equal(new URL(a.href, site).href, expected, `${name}: voce corrente errata`);
    }
  }
  pages++;
}

function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const file = join(dir, entry.name);
    if (entry.isDirectory()) walk(file);
    else if (entry.name.endsWith('.html')) check(file);
  }
}
walk(root);
assert.ok(pages > 0, 'Nessuna pagina verificata');
for (const [name, target] of internalLinks) {
  if (!new URL(target).pathname.split('/').at(-1).includes('.')) {
    assert.ok(pageUrls.has(target), `${name}: link interno non canonico o inesistente: ${target}`);
  }
}
if (!noindex) {
  const sitemapUrls = readdirSync(root).filter((name) => /^sitemap-\d+\.xml$/.test(name))
    .flatMap((name) => [...readFileSync(join(root, name), 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]));
  assert.deepEqual(new Set(sitemapUrls), canonicalsForSitemap, 'Sitemap e canonical delle pagine indicizzabili non coincidono');
}
console.log(`${pages} pagine: canonical, Open Graph, immagine social, noindex e navigazione verificati.`);
