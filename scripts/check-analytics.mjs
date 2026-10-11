import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import assert from 'node:assert/strict';
import { transformSync } from 'esbuild';

const source = transformSync(readFileSync(new URL('../src/scripts/analytics.ts', import.meta.url), 'utf8'), { loader: 'ts', format: 'cjs' }).code;
function fixture(saved, blocked = false) {
  const events = {}, buttons = {}, scripts = [], cookies = [];
  let stored = saved ? JSON.stringify(saved) : null, reloaded = false;
  class Element { focus() {} }
  const dialog = { open: false, showModal() { this.open = true; }, close() { this.open = false; }, addEventListener(k, fn) { events[k] = fn; }, querySelectorAll() { return ['granted', 'denied'].map(choice => ({ dataset: { analyticsChoice: choice }, addEventListener(k, fn) { buttons[choice] = fn; } })); } };
  const footer = { hidden: true, addEventListener(k, fn) { events.preferences = fn; } };
  const document = { getElementById(id) { return id === 'analytics-settings' ? { dataset: { measurementId: 'G-TEST123456' } } : dialog; }, querySelectorAll() { return [footer]; }, createElement() { return {}; }, head: { append(s) { scripts.push(s); } }, activeElement: new Element(), referrer: 'https://l.facebook.com/path?secret=private', get cookie() { return '_ga=123; _ga_TEST123456=456; necessary=yes'; }, set cookie(v) { cookies.push(v); } };
  const window = { addEventListener(k, fn) { events[k] = fn; } };
  const localStorage = { getItem() { if (blocked) throw Error('blocked'); return stored; }, setItem(k, v) { if (blocked) throw Error('blocked'); stored = v; } };
  const location = { href: 'https://www.traspogru.it/contatti/?email=private@example.com&utm_source=facebook&utm_medium=social#secret', hostname: 'www.traspogru.it', reload() { reloaded = true; } };
  const module = { exports: {} };
  runInNewContext(source, { module, exports: module.exports, document, window, localStorage, location, HTMLElement: Element, URL, Date });
  module.exports.installAnalytics();
  return { dialog, scripts, window, buttons, events, cookies, footer, stored: () => stored, reloaded: () => reloaded };
}
const record = choice => ({ version: 1, choice, at: Date.now() });
let f = fixture();
assert.equal(f.scripts.length, 0); assert.equal(f.dialog.open, true);
f.buttons.denied(); assert.equal(f.scripts.length, 0); assert.equal(f.dialog.open, false);
f.events.preferences(); f.buttons.granted(); assert.equal(f.scripts.length, 1);
const config = Array.from(f.window.dataLayer).map(x => Array.from(x)).find(x => x[0] === 'config')[2];
assert.equal(config.page_location, 'https://www.traspogru.it/contatti/?utm_source=facebook&utm_medium=social');
assert.equal(config.page_referrer, 'https://l.facebook.com/path');
assert.equal(config.allow_google_signals, false);
f.events.preferences(); f.buttons.granted(); assert.equal(f.scripts.length, 1);
f.events.preferences(); f.buttons.denied(); assert.equal(f.reloaded(), true);
assert.equal(f.window['ga-disable-G-TEST123456'], true);
assert.ok(f.cookies.some(x => x.includes('Domain=.traspogru.it')));
assert.ok(f.cookies.every(x => !x.startsWith('necessary=')));
f = fixture(record('denied')); assert.equal(f.scripts.length, 0); assert.equal(f.dialog.open, false);
f = fixture(record('granted')); assert.equal(f.scripts.length, 1); assert.equal(f.dialog.open, false);
f = fixture({ ...record('granted'), at: Date.now() - 181 * 86400000 }); assert.equal(f.scripts.length, 0); assert.equal(f.dialog.open, true);
f = fixture(null, true); assert.equal(f.scripts.length, 0); f.buttons.granted(); assert.equal(f.scripts.length, 1);
f = fixture(); f.events.cancel({ preventDefault() {} }); assert.equal(f.scripts.length, 0); assert.equal(JSON.parse(f.stored()).choice, 'denied');
console.log('Analytics: consenso, rifiuto, revoca, scadenza, storage bloccato e rimozione dati query verificati.');
