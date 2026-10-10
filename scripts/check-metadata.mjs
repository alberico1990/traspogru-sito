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
  const head = html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1];
  assert.ok(head, `${name}: head mancante`);
  const tags = [...head.matchAll(/<(?:meta|link)\b[^>]*>/gi)].map((m) => attributes(m[0]));
  const canonicals = tags.filter((a) => a.rel === 'canonical');
  assert.equal(canonicals.length, 1, `${name}: canonical unico`);
  assert.equal(canonicals[0].href, expected, `${name}: canonical errato`);
  assert.equal(tags.find((a) => a.property === 'og:url')?.content, expected, `${name}: og:url errato`);
  const image = new URL(tags.find((a) => a.property === 'og:image')?.content);
  assert.equal(image.origin, site.origin, `${name}: origine immagine errata`);
  assert.ok(image.pathname.startsWith(site.pathname), `${name}: immagine fuori dalla sottocartella`);
  const asset = resolve(root, decodeURIComponent(image.pathname.slice(site.pathname.length)));
  assert.ok(asset.startsWith(root + sep) && existsSync(asset) && statSync(asset).isFile(), `${name}: immagine social inesistente`);
  const robots = tags.find((a) => a.name === 'robots')?.content ?? '';
  assert.equal(/\bnoindex\b/i.test(robots), noindex || route === '404', `${name}: noindex errato`);
  pageUrls.add(expected);
  if (!/\bnoindex\b/i.test(robots)) canonicalsForSitemap.add(expected);
  for (const match of html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)) {
    assert.ok(JSON.parse(match[1])['@context'], `${name}: JSON-LD non valido`);
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
