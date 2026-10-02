// Dopo la build per GitHub Pages: il sito vive in una sottocartella (https://NOME.github.io/traspogru-sito/),
// ma i collegamenti sono scritti dalla radice ("/flotta", "/video/...", "/_astro/..."). Questo script aggiunge il prefisso
// a tutti i percorsi che partono da "/" in pagine, CSS, JS e manifest. Uso: node scripts/prefix-base.mjs /traspogru-sito [cartella]
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const base = (process.argv[2] ?? '').replace(/\/+$/, '');
const radice = process.argv[3] ?? 'dist';
if (!base.startsWith('/')) { console.error('Indicare la sottocartella, es. /traspogru-sito'); process.exit(1); }

// percorso assoluto interno: inizia con una sola "/" e non e' gia' prefissato
const interno = (p) => p.startsWith('/') && !p.startsWith('//') && p !== base && !p.startsWith(base + '/');
const prefissa = (p) => (interno(p) ? base + p : p);

function riscrivi(testo, estensione) {
  let t = testo;
  if (estensione === '.html') {
    // attributi con un solo URL
    t = t.replace(/\b(href|src|poster|action)=(["'])([^"']*)\2/g, (m, a, q, v) => `${a}=${q}${prefissa(v)}${q}`);
    // srcset: elenco di "url misura" separati da virgola
    t = t.replace(/\bsrcset=(["'])([^"']*)\1/g, (m, q, v) =>
      `srcset=${q}${v.split(',').map((c) => { const s = c.trim(); const i = s.search(/\s/); return i < 0 ? prefissa(s) : prefissa(s.slice(0, i)) + s.slice(i); }).join(', ')}${q}`);
  }
  // CSS (anche dentro <style> e attributi style): url(/x), url("/x"), url('/x')
  t = t.replace(/url\(\s*(["']?)(\/(?!\/)[^"')\s]*)\1\s*\)/g, (m, q, v) => `url(${q}${prefissa(v)}${q})`);
  if (estensione === '.js' || estensione === '.mjs') {
    // moduli e risorse citati come stringhe: "/_astro/...", "/video/..."
    t = t.replace(/(["'`])(\/(?:_astro|video)\/[^"'`\s]*)\1/g, (m, q, v) => `${q}${prefissa(v)}${q}`);
  }
  if (estensione === '.webmanifest' || estensione === '.json') {
    t = t.replace(/("(?:start_url|scope|src)"\s*:\s*)"(\/[^"]*)"/g, (m, k, v) => `${k}"${prefissa(v)}"`);
  }
  return t;
}

let file = 0, modificati = 0;
(function percorri(dir) {
  for (const nome of readdirSync(dir)) {
    const p = join(dir, nome);
    if (statSync(p).isDirectory()) { percorri(p); continue; }
    const est = extname(p);
    if (!['.html', '.css', '.js', '.mjs', '.webmanifest', '.json'].includes(est)) continue;
    const prima = readFileSync(p, 'utf8');
    const dopo = riscrivi(prima, est);
    file++;
    if (dopo !== prima) { writeFileSync(p, dopo); modificati++; }
  }
})(radice);
console.log(`prefisso ${base}: ${modificati} file riscritti su ${file} controllati`);
