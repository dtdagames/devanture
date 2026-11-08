import { existsSync } from 'node:fs';
// Vérifie un site PHP servi par `php -S` : routes, 404, titres, formulaire de contact.
// Usage : node scripts/verify-php-site.mjs <dossier-site> <port> [chemin-php]
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

const [dir, portArg, phpArg] = process.argv.slice(2);
if (!dir || !portArg) { console.error('usage: verify-php-site.mjs <dossier> <port> [php.exe]'); process.exit(2); }
const port = Number(portArg);
const WINGET_PHP = 'C:/Users/sergi/AppData/Local/Microsoft/WinGet/Packages/PHP.PHP.8.3_Microsoft.Winget.Source_8wekyb3d8bbwe/php.exe';
const PHP = phpArg || process.env.PHP_BIN || (existsSync(WINGET_PHP) ? WINGET_PHP : 'php');
const root = path.resolve(dir);
// Un argument http(s)://… à la place du port vise un serveur déjà lancé (Apache en conteneur, hébergement réel) : rien n'est démarré ici.
const external = /^https?:[/][/]/.test(String(portArg));
const base = external ? String(portArg).replace(/[/]$/, "") : `http://127.0.0.1:${port}`;
const checks = [];
const ok = (name, pass, detail = '') => { checks.push({ name, pass: !!pass, detail }); };

const server = external ? null : spawn(PHP, ['-S', `127.0.0.1:${port}`, '-t', root, path.join(root, 'index.php')], { stdio: ['ignore', 'pipe', 'pipe'] });
let serverLog = '';
server?.stderr.on('data', d => { serverLog += d.toString(); });
server?.stdout.on('data', d => { serverLog += d.toString(); });

let cookie = '';
async function get(p, opts = {}) {
  let r = await fetch(base + p, { redirect: 'manual', headers: { cookie, ...(opts.headers || {}) }, method: opts.method || 'GET', body: opts.body });
  // Sous Apache, un dossier existant (lisible/) reçoit une barre finale par redirection 301 : suivie une fois pour les GET.
  if ((opts.method || 'GET') === 'GET' && r.status === 301 && (r.headers.get('location') || '').startsWith(base + '/')) r = await fetch(r.headers.get('location'), { redirect: 'manual', headers: { cookie, ...(opts.headers || {}) } });
  const sc = r.headers.get('set-cookie');
  if (sc) cookie = sc.split(';')[0];
  const text = await r.text();
  return { status: r.status, text, location: r.headers.get('location') };
}

const phpErr = t => /(Fatal error|Warning:|Notice:|Deprecated:|Parse error)/.test(t);

try {
  // attendre le serveur
  for (let i = 0; i < 40; i++) { try { await fetch(base + '/'); break; } catch { await new Promise(r => setTimeout(r, 150)); } }

  const home = await get('/');
  ok('GET / → 200', home.status === 200, String(home.status));
  ok('GET / sans erreur PHP', !phpErr(home.text));

  // découverte des routes internes (nav + footer + corps)
  const links = new Set(['/']);
  for (const m of home.text.matchAll(/href="(\/[a-z0-9\-\/]*)"/g)) links.add(m[1].replace(/\/+$/, '') || '/');
  const routes = [...links].filter(l => !/\.(css|js|svg|png|jpg|ico)$/.test(l));
  ok('≥ 6 routes découvertes', routes.length >= 6, routes.join(' '));
  const navHtml = /<nav[\s\S]*?<\/nav>/i.exec(home.text)?.[0] || '';
  const navRoutes = new Set([...navHtml.matchAll(/href="(\/[a-z0-9\-\/]*)"/g)].map(m => m[1].replace(/\/+$/, '') || '/'));

  let contactPath = null;
  const pagesHtml = [];
  for (const r of routes) {
    const res = await get(r);
    pagesHtml.push(res.text);
    const title = /<title>([^<]+)<\/title>/.exec(res.text)?.[1]?.trim();
    const desc = /<meta\s+name="description"\s+content="([^"]*)"/i.exec(res.text) || /<meta\s+content="([^"]*)"\s+name="description"/i.exec(res.text);
    ok(`GET ${r} → 200`, res.status === 200, String(res.status));
    ok(`GET ${r} sans erreur PHP`, !phpErr(res.text), phpErr(res.text) ? res.text.match(/(Fatal error|Warning:|Notice:|Deprecated:|Parse error)[^\n]{0,160}/)?.[0] : '');
    ok(`GET ${r} a un <title>`, !!title, title || '');
    ok(`GET ${r} a une meta description`, !!desc && desc[1].length > 10, desc ? desc[1].slice(0, 60) : 'absente');
    if (r !== '/' && navRoutes.has(r)) ok(`GET ${r} marque la nav (aria-current)`, /aria-current="page"/.test(res.text));
    const isContact = /<form[^>]+method="post"/i.test(res.text) && /_csrf|csrf|token/i.test(res.text) && !/name="action" value="add"|name="_form" value="checkout"/.test(res.text);
    if (isContact) contactPath = contactPath || r;
  }

  // Images : si le site compilé a des variantes WebP, les <img> des pages doivent porter dimensions, srcset et chargement différé.
  let imagesPhp = ''; try { imagesPhp = await fs.readFile(path.join(root, 'lib', 'images.php'), 'utf8'); } catch { /* pas de manifeste */ }
  if (/\.webp'/.test(imagesPhp)) {
    const imgs = pagesHtml.flatMap(h => [...h.matchAll(/<img ([^>]*srcset="[^"]+"[^>]*)>/g)].map(m => m[1]));
    ok('Images : au moins une <img> avec srcset', imgs.length > 0);
    ok('Images : width et height sur chaque <img srcset>', imgs.length > 0 && imgs.every(a => /width="\d+"/.test(a) && /height="\d+"/.test(a)));
    ok('Images : loading="lazy" ou fetchpriority sur chaque <img srcset>', imgs.length > 0 && imgs.every(a => /loading="lazy"|fetchpriority="high"/.test(a)));
    ok('Images : attribut sizes présent', imgs.length > 0 && imgs.every(a => /sizes="[^"]+"/.test(a)));
    const variant = imgs[0]?.match(/srcset="([^\s,"]+)/)?.[1];
    ok('Images : variante WebP servie (200)', variant ? (await get(variant)).status === 200 : false, variant || 'aucune');
  }

  const nf = await get('/page-qui-nexiste-pas-xyz');
  ok('Route inconnue → 404', nf.status === 404, String(nf.status));
  ok('404 rendue dans la mise en page (nav présente)', /<nav/i.test(nf.text));

  // feuille de style et script chargés
  const css = /<link[^>]+href="([^"]+\.css[^"]*)"/i.exec(home.text)?.[1];
  const js = /<script[^>]+src="([^"]+\.js[^"]*)"/i.exec(home.text)?.[1];
  ok('CSS référencée et servie', css ? (await get(css)).status === 200 : false, css || 'aucune');
  ok('JS référencé et servi', js ? (await get(js)).status === 200 : false, js || 'aucun');
  ok('Bouton menu mobile présent', /nav-toggle|aria-expanded|menu-toggle|burger/i.test(home.text));
  ok('Variables CSS dans :root', css ? /:root\s*\{[^}]*--/.test((await get(css)).text) : false);

  // formulaire de contact
  ok('Formulaire de contact trouvé', !!contactPath, contactPath || '');
  if (contactPath) {
    const page = await get(contactPath);
    const formHtml = /<form[^>]*method="post"[\s\S]*?<\/form>/i.exec(page.text)?.[0] || /<form[\s\S]*?<\/form>/i.exec(page.text)?.[0] || '';
    const fields = [];
    for (const m of formHtml.matchAll(/<input[^>]*>/gi)) {
      const tag = m[0];
      const name = /name="([^"]+)"/.exec(tag)?.[1]; if (!name) continue;
      const type = (/type="([^"]+)"/.exec(tag)?.[1] || 'text').toLowerCase();
      const value = /value="([^"]*)"/.exec(tag)?.[1] ?? '';
      fields.push({ name, type, value, tag: 'input' });
    }
    for (const m of formHtml.matchAll(/<textarea[^>]*name="([^"]+)"/gi)) fields.push({ name: m[1], type: 'textarea', value: '', tag: 'textarea' });
    for (const m of formHtml.matchAll(/<select[^>]*name="([^"]+)"[^>]*>([\s\S]*?)<\/select>/gi)) {
      const first = [...m[2].matchAll(/<option[^>]*value="([^"]+)"/gi)].map(o => o[1]).find(v => v !== '');
      fields.push({ name: m[1], type: 'select', value: first || '', tag: 'select' });
    }
    const hidden = fields.filter(f => f.type === 'hidden');
    ok('Jeton CSRF (champ caché) présent', hidden.some(f => /csrf|token/i.test(f.name) && f.value.length >= 16), hidden.map(h => h.name).join(','));
    const honeypot = fields.find(f => /website|site_?web|url|honey|^hp|company|fax|trap|nickname/i.test(f.name) && f.type !== 'hidden');
    ok('Champ pot de miel présent', !!honeypot, honeypot?.name || 'non détecté');

    const enc = o => new URLSearchParams(o).toString();
    const baseBody = Object.fromEntries(hidden.map(h => [h.name, h.value]));
    const empty = await get(contactPath, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: enc(baseBody) });
    ok('POST vide → 200 et formulaire réaffiché', empty.status === 200 && /<form/i.test(empty.text), String(empty.status));
    ok('POST vide → message d\'erreur affiché', /obligatoire|requis|erreur|invalide|corriger/i.test(empty.text));
    ok('POST vide sans erreur PHP', !phpErr(empty.text));

    const filled = { ...baseBody };
    for (const f of fields) {
      if (f.type === 'hidden' || f === honeypot) continue;
      if (f.type === 'select') { filled[f.name] = f.value.replace(/&#039;|&quot;|&amp;/g, m => ({ '&#039;': '\'', '&quot;': '"', '&amp;': '&' }[m])); continue; }
      if (f.type === 'date') { filled[f.name] = '2026-11-20'; continue; }
      if (f.type === 'number') { filled[f.name] = '12'; continue; }
      if (f.type === 'email' || /mail/i.test(f.name)) filled[f.name] = 'test@example.test';
      else if (f.type === 'tel' || /phone|tel/i.test(f.name)) filled[f.name] = '0600000000';
      else if (f.type === 'textarea' || /message/i.test(f.name)) filled[f.name] = 'Message Test Baseline, avec virgule et accents : éàç.';
      else filled[f.name] = 'Test Baseline';
    }
    const sent = await get(contactPath, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: enc(filled) });
    const succ = sent.status === 200 && /envoy|merci|succ/i.test(sent.text) && !/obligatoire\.|est requis/i.test(sent.text);
    ok('POST rempli → confirmation de succès', succ, String(sent.status));
    ok('POST rempli sans erreur PHP', !phpErr(sent.text), phpErr(sent.text) ? sent.text.match(/(Fatal error|Warning:|Notice:)[^\n]{0,160}/)?.[0] : '');
    let stored = false;
    try {
      const files = (await fs.readdir(path.join(root, 'data'))).filter(f => f.endsWith('.jsonl'));
      for (const f of files) if ((await fs.readFile(path.join(root, 'data', f), 'utf8')).includes('Test Baseline')) stored = true;
      if (!stored) { try { await fs.access(path.join(root, 'data', 'site.sqlite')); stored = true; } catch { /* */ } } // stockage SQLite
    } catch { /* pas de data/ */ }
    ok('Message stocké (data/*.jsonl ou data/site.sqlite)', stored);
  }
} catch (e) {
  ok('exécution du script', false, e.message);
} finally {
  server?.kill();
}

const passed = checks.filter(c => c.pass).length;
for (const c of checks) console.log(`${c.pass ? 'OK  ' : 'FAIL'} ${c.name}${c.detail && !c.pass ? ' — ' + c.detail : ''}`);
console.log(JSON.stringify({ site: path.basename(root), passed, total: checks.length }));
process.exit(passed === checks.length ? 0 : 1);
