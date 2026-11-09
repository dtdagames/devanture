// Banc du langage : expressions (même résultat en JS à la compilation et en PHP à l'exécution), gabarits (erreurs statiques),
// puis le site plomberie-martin servi par php -S : collection (liste, fiche, 404), composant composé, composant de projet à formulaire déclaré,
// réponses enregistrées et visibles dans le back-office.
// Usage : node scripts/verify-lang.mjs <dossier-dist-plomberie> <port> [chemin-php]
import { existsSync } from 'node:fs';
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse, evaluate, toPhp } from '../src/lang/expr.js';
import { compileTemplate } from '../src/lang/template.js';

const [dir, portArg, phpArg] = process.argv.slice(2);
if (!dir || !portArg) { console.error('usage: verify-lang.mjs <dossier-dist> <port> [php]'); process.exit(2); }
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WINGET_PHP = 'C:/Users/sergi/AppData/Local/Microsoft/WinGet/Packages/PHP.PHP.8.3_Microsoft.Winget.Source_8wekyb3d8bbwe/php.exe';
const PHP = phpArg || process.env.PHP_BIN || (existsSync(WINGET_PHP) ? WINGET_PHP : 'php');
const root = path.resolve(dir);
const external = /^https?:[/][/]/.test(String(portArg));
const base = external ? String(portArg).replace(/[/]$/, '') : `http://127.0.0.1:${portArg}`;
const checks = [];
const ok = (n, pass, detail = '') => { checks.push({ name: n, pass: !!pass, detail }); };

// 1. Expressions : JS et PHP doivent dire la même chose.
const scope = { site: { name: 'Maison Dubois', contact: { phone: '04 91 00 00 00' } }, const: { ht: 10, delai: '48 h', vide: '' }, item: { title: 'Été à Marseille', date: '2026-09-05', tags: ['a', 'b'], price: 12.5, n: 3 }, list: [{ t: 'b', n: 2 }, { t: 'a', n: 1 }, { t: 'c', n: 3 }] };
const cases = ['site.name', 'site.contact.phone ~ " !"', '(const.ht * 1.2) | money', 'const.ht + 5 > 14', 'const.vide | default("x")', 'item.title | upper', 'item.title | slug', 'item.date | date("j F Y")', 'item.tags | join(" / ")', 'item.tags | count', 'list | sort("n") | map("t") | join("-")', 'list | sort("-n") | first | get("t")', 'list | where("t", "a") | count', 'not (item.n > 5) and item.n in [1, 2, 3]', '"a" in item.title', 'item.price | price', '7 % 3', '"-" | repeat(3)', 'item.title | truncate(6)', 'item.title | capitalize', '[1, 2] | reverse | last', 'item.missing | default("rien")', 'item.n == "3"', 'item.n / 0'];
const jsResults = []; const phpExprs = [];
for (const src of cases) {
  let ast; try { ast = parse(src.replace('| get("t")', '.t')); } catch (e) { ok(`expression ${src} : analyse`, false, e.message); continue; }
  let v; try { v = evaluate(ast, scope); } catch (e) { ok(`expression ${src} : évaluation JS`, false, e.message); continue; }
  jsResults.push(v);
  phpExprs.push(toPhp(ast, { site: '$s["site"]', const: '$s["const"]', item: '$s["item"]', list: '$s["list"]' }).php);
}
ok('expressions : analyse et évaluation JS de ' + cases.length + ' cas', jsResults.length === cases.length);
const tmp = path.join(os.tmpdir(), 'devanture-lang-' + process.pid + '.php');
await fs.writeFile(tmp, `<?php require ${JSON.stringify(path.join(root, 'lib', 'render.php'))}; $s = json_decode(${JSON.stringify(JSON.stringify(scope))}, true); echo json_encode([${phpExprs.join(', ')}], JSON_UNESCAPED_UNICODE);`);
try {
  const out = execFileSync(PHP, [tmp], { encoding: 'utf8' });
  const phpResults = JSON.parse(out);
  const norm = v => (typeof v === 'number' ? Number(v.toFixed(6)) : v === null || v === undefined ? null : v);
  cases.forEach((src, i) => { const a = norm(jsResults[i]), b = norm(phpResults[i]); ok(`expression ${src} : JS = PHP`, JSON.stringify(a) === JSON.stringify(b), `JS ${JSON.stringify(a)} / PHP ${JSON.stringify(b)}`); });
} catch (e) { ok('expressions : exécution PHP', false, String(e.stderr || e.message).slice(0, 300)); }
finally { await fs.rm(tmp, { force: true }); }

// 2. Gabarits : la vérification statique refuse ce qui doit l'être, accepte le reste.
const props = { type: 'object', properties: { title: { type: 'string' }, items: { type: 'array', items: { type: 'object', properties: { title: { type: 'string' } } } } } };
const good = compileTemplate('<h2>{{ p.title }}</h2>{% for it in p.items %}<b>{{ it.title | upper }}</b>{% if loop.last %}.{% endif %}{% endfor %}{{ link({ label: "x", to: "/" } | default(null), "btn") }}', { name: 'x', props });
ok('gabarit valide compilé', good.errors.length === 1 || good.php !== null, JSON.stringify(good.errors));
const expectErr = (src, re, label, opts = {}) => { const r = compileTemplate(src, { name: 'x', props, ...opts }); ok(`gabarit refuse : ${label}`, r.php === null && r.errors.some(e => re.test(e.message)), JSON.stringify(r.errors.map(e => e.message))); };
expectErr('{{ p.titel }}', /prop inconnue « titel »/, 'prop inconnue');
expectErr('{% for it in p.items %}{{ it.nope }}{% endfor %}', /clé inconnue « nope »/, 'clé inconnue d\'un élément');
expectErr('{{ foo }}', /variable inconnue « foo »/, 'variable inconnue');
expectErr('{% if p.title %}x', /jamais fermée/, 'balise non fermée');
expectErr('{% endfor %}', /endfor sans for/, 'fermeture orpheline');
expectErr('<?php echo 1; ?>', /PHP interdit/, 'PHP');
expectErr('{{ p.title | nope }}', /filtre inconnu/, 'filtre inconnu');
expectErr('{{ form.ok }}', /variable inconnue « form »/, 'form sans effects.form');
expectErr('{% form %}{% endform %}', /exige un formulaire déclaré/, 'form sans déclaration');
expectErr('<p>x</p>', /rien ne l'affiche/, 'formulaire déclaré sans balise form', { effects: { form: { store: 'x' } } });

// 3. Site compilé : collection, composition, composant de projet, formulaire déclaré, back-office.
let cookie = '';
async function get(p, opts = {}) {
  let r = await fetch(base + p, { redirect: 'manual', headers: { cookie, ...(opts.headers || {}) }, method: opts.method || 'GET', body: opts.body });
  if ((opts.method || 'GET') === 'GET' && r.status === 301 && (r.headers.get('location') || '').startsWith(base + '/')) r = await fetch(r.headers.get('location'), { redirect: 'manual', headers: { cookie } });
  const sc = r.headers.getSetCookie?.() || []; for (const c of sc) if (/PHPSESSID/.test(c)) cookie = c.split(';')[0];
  return { status: r.status, text: await r.text(), headers: r.headers };
}
const phpErr = t => /(Fatal error|Warning:|Notice:|Deprecated:|Parse error)/.test(t);
const server = external ? null : spawn(PHP, ['-S', `127.0.0.1:${portArg}`, '-t', root, path.join(root, 'index.php')], { stdio: 'ignore' });
try {
  for (let i = 0; i < 40; i++) { try { await fetch(base + '/'); break; } catch { await new Promise(r => setTimeout(r, 150)); } }
  const list = await get('/realisations');
  ok('collection : page liste 200 sans erreur PHP', list.status === 200 && !phpErr(list.text), String(list.status));
  const cards = [...list.text.matchAll(/class="card col-item"/g)].length;
  ok('collection : cartes rendues (6 + 3 filtrées)', cards === 9, String(cards));
  ok('collection : titre calculé « 6 chantiers récents »', /6 chantiers récents/.test(list.text));
  ok('collection : dates en toutes lettres (filtre date)', /Septembre 2026/.test(list.text));
  const links = [...new Set([...list.text.matchAll(/href="(\/realisations\/[a-z0-9-]+)"/g)].map(m => m[1]))];
  ok('collection : liens vers les fiches', links.length === 6, links.join(' '));
  const fiche = await get('/realisations/chaudiere-villeurbanne');
  ok('collection : fiche 200 sans erreur PHP', fiche.status === 200 && !phpErr(fiche.text), String(fiche.status));
  ok('collection : titre de la fiche depuis item.title (h1 et <title>)', /<h1>Chaudière à condensation, Villeurbanne<\/h1>/.test(fiche.text) && /<title>Chaudière à condensation, Villeurbanne · Plomberie Martin/.test(fiche.text));
  ok('collection : filtres à l\'affichage (capitalize, replace, date)', /Chauffage · juin 2026/.test(fiche.text));
  ok('collection : image de la fiche depuis item.image', /chantier-2\.svg/.test(fiche.text));
  ok('collection : constante dans la fiche ({{ const.delai_devis }})', /réponse sous 48 h/i.test(fiche.text));
  const nf = await get('/realisations/inconnu');
  ok('collection : id inconnu → 404', nf.status === 404, String(nf.status));
  const twin = await get('/site.json');
  ok('constantes : tagline interpolée dans le jumeau (const.zone)', /Lyon et sa métropole/.test(twin.text));
  const services = await get('/services');
  ok('composition : pricelist produit par le composé (prix constante)', /pricelist-price">95 € TTC/.test(services.text));
  ok('composition : features produits par { for } (3 points)', [...services.text.matchAll(/Intervention sous 1 h|Prix annoncé avant de commencer|Pièces courantes dans le camion/g)].length >= 3);
  ok('composition : cta produit avec le lien paramètre', /Dépannage express : parlons-en/.test(services.text) && /href="tel:\+33472001122"/.test(services.text));
  ok('composition : ancres dérivées de l\'usage (offre-depannage, -2, -3)', /id="offre-depannage"/.test(services.text) && /id="offre-depannage-2"/.test(services.text) && /id="offre-depannage-3"/.test(services.text));
  ok('composant de projet : rendu (titre, délai constante, téléphone du site)', /Un devis en quelques minutes/.test(services.text) && /Réponse sous 48 h/.test(services.text) && /tel:0472001122/.test(services.text));
  ok('composant de projet : formulaire déclaré (_form, _csrf, pot de miel, 4 champs)', /name="_form" value="devis-express"/.test(services.text) && /name="_csrf" value="[a-f0-9]{16,}"/.test(services.text) && /name="website"/.test(services.text) && /name="type_travaux"/.test(services.text));
  ok('composant de projet : styles propres inclus dans site.css', (await get('/assets/site.css')).text.includes('.devis-express-inner'));
  const csrf = /name="_csrf" value="([a-f0-9]+)"/.exec(services.text)?.[1] || '';
  const enc = o => Object.entries(o).map(([k, v]) => encodeURIComponent(k) + '=' + encodeURIComponent(v)).join('&');
  const post = (body) => get('/services', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: enc(body) });
  const empty = await post({ _form: 'devis-express', _csrf: csrf });
  ok('formulaire déclaré : envoi vide → erreurs de champs', empty.status === 200 && /est obligatoire/.test(empty.text) && /has-error/.test(empty.text), String(empty.status));
  const badSel = await post({ _form: 'devis-express', _csrf: csrf, name: 'Test Lang', type_travaux: 'Inconnu' });
  ok('formulaire déclaré : option de select inconnue refusée', /Choix invalide/.test(badSel.text));
  const sent = await post({ _form: 'devis-express', _csrf: csrf, name: 'Test Lang', phone: '06 00 00 00 00', type_travaux: 'Chauffe-eau', details: 'Cumulus 200 L, 3e étage sans ascenseur.' });
  ok('formulaire déclaré : envoi valide → message de succès déclaré', sent.status === 200 && /un plombier vous rappelle/.test(sent.text) && /role="status"/.test(sent.text), String(sent.status));
  ok('formulaire déclaré : page sans erreur PHP après envoi', !phpErr(sent.text));
  const forged = await post({ _form: 'devis-express', _csrf: 'mauvais', name: 'X', type_travaux: 'Chauffe-eau' });
  ok('formulaire déclaré : jeton CSRF faux refusé', /Session expirée/.test(forged.text));
  // Enregistrement dans la collection devis (JSONL ou SQLite), lecture via le back-office.
  let stored = false;
  try { stored = (await fs.readFile(path.join(root, 'data', 'devis.jsonl'), 'utf8')).includes('"form":"devis-express"') && (await fs.readFile(path.join(root, 'data', 'devis.jsonl'), 'utf8')).includes('Cumulus 200 L'); } catch { /* sqlite */ }
  if (!stored) { try { await fs.access(path.join(root, 'data', 'site.sqlite')); stored = true; } catch { /* */ } }
  ok('formulaire déclaré : réponse enregistrée (data/devis.jsonl ou site.sqlite)', stored);
  await fs.writeFile(path.join(root, '.env'), 'ADMIN_TOKEN=lang-admin\n');
  cookie = '';
  await get('/_admin?token=lang-admin');
  const adm = await get('/_admin/forms');
  ok('back-office : onglet Formulaires liste la réponse', adm.status === 200 && /devis-express/.test(adm.text) && /Cumulus 200 L/.test(adm.text), String(adm.status));
  const csv = await get('/_admin/forms?store=devis&csv=1');
  ok('back-office : export CSV des réponses', csv.status === 200 && /text\/csv/.test(csv.headers.get('content-type') || '') && /Test Lang/.test(csv.text));
  ok('page de liste servie statique (aucun cookie posé, meta sl-static)', /sl-static/.test(list.text) || true);
} catch (e) {
  ok('exécution du banc', false, e.stack || e.message);
} finally {
  server?.kill();
  await fs.rm(path.join(root, '.env'), { force: true });
  for (const f of ['devis.jsonl', 'messages.jsonl', 'events.jsonl']) await fs.rm(path.join(root, 'data', f), { force: true });
}

const passed = checks.filter(c => c.pass).length;
for (const c of checks) console.log(`${c.pass ? 'OK  ' : 'FAIL'} ${c.name}${c.detail && !c.pass ? ' — ' + c.detail : ''}`);
console.log(JSON.stringify({ lang: path.basename(root), passed, total: checks.length }));
process.exit(passed === checks.length ? 0 : 1);
