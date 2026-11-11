// Banc des expériences (objectifs, bras, groupe témoin) : le site compilé est servi par php -S et visité par des visiteurs SIMULÉS.
// Le « navigateur » de chaque visiteur est le vrai assets/site.js compilé, exécuté dans node:vm sur un DOM minimal reconstruit
// depuis l'HTML reçu : cookies, bandeau de consentement, tirage, fragments, exposition, clics, formulaire, balises d'événement.
// Les taux de conversion des visiteurs sont choisis par le banc (vérité connue) ; le back-office doit retrouver les mêmes comptes
// et le même verdict qu'un calcul indépendant fait ici. Rien de tout cela n'est du trafic réel.
// Usage : node scripts/verify-experiments.mjs <dossier-dist-plomberie> <port> [chemin-php]
import { existsSync } from 'node:fs';
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const [dir, portArg, phpArg] = process.argv.slice(2);
if (!dir || !portArg) { console.error('usage: verify-experiments.mjs <dossier-dist> <port> [php]'); process.exit(2); }
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WINGET_PHP = 'C:/Users/sergi/AppData/Local/Microsoft/WinGet/Packages/PHP.PHP.8.3_Microsoft.Winget.Source_8wekyb3d8bbwe/php.exe';
const PHP = phpArg || process.env.PHP_BIN || (existsSync(WINGET_PHP) ? WINGET_PHP : 'php');
const root = path.resolve(dir);
const base = `http://127.0.0.1:${portArg}`;
const checks = [];
const ok = (n, pass, detail = '') => { checks.push({ name: n, pass: !!pass, detail: String(detail) }); };
const phpErr = t => /(Fatal error|Warning:|Notice:|Deprecated:|Parse error)/.test(t);
let requests = 0;

// --- générateur pseudo-aléatoire à graine : le banc donne toujours les mêmes visiteurs
const mulberry = seed => () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

// --- DOM minimal : liste d'éléments avec parent, sélecteurs simples, écouteurs mémorisés
const ENT = { quot: '"', amp: '&', lt: '<', gt: '>', '#039': "'", '#39': "'" };
const decode = s => s.replace(/&(quot|amp|lt|gt|#0?39);/g, (m, k) => ENT[k]);
const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
// Seuls les sélecteurs de la personnalisation trouvent des éléments : le reste de site.js (menu, recherche, comportements) reste inerte ici.
const KNOWN = new Set(['.consent', '.consent-accept', '.consent-refuse', 'span.anchor[data-sl-fragment]', 'span.anchor[id]', 'span.anchor[data-variant]', '[data-sl-exp]', '[data-sl-event]', 'form.contact-form, form.sl-form', 'a.btn']);
function matches(el, selector) {
  return selector.split(',').some(part => {
    const s = part.trim(); if (!s || /[\s:>+~]/.test(s)) return false;
    const tag = /^[a-z][a-z0-9]*/i.exec(s)?.[0];
    if (tag && tag.toUpperCase() !== el.tagName) return false;
    const cls = (el.attrs.class || '').split(/\s+/);
    for (const m of s.matchAll(/\.([-\w]+)/g)) if (!cls.includes(m[1])) return false;
    for (const m of s.matchAll(/\[([-\w]+)(?:=["']?([^"'\]]*)["']?)?\]/g)) { if (!(m[1] in el.attrs)) return false; if (m[2] !== undefined && el.attrs[m[1]] !== m[2]) return false; }
    return true;
  });
}
function makeEl(tag, attrs, owner) {
  const el = {
    tagName: tag.toUpperCase(), attrs, handlers: {}, parent: null, owner,
    get id() { return attrs.id ?? ''; },
    get hidden() { return 'hidden' in attrs; }, set hidden(v) { if (v) attrs.hidden = ''; else delete attrs.hidden; },
    getAttribute: n => (n in attrs ? attrs[n] : null), setAttribute: (n, v) => { attrs[n] = String(v); }, hasAttribute: n => n in attrs,
    addEventListener: (t, fn) => { (el.handlers[t] ||= []).push(fn); },
    querySelector: sel => el.owner.querySelector(sel), querySelectorAll: sel => el.owner.querySelectorAll(sel),
    closest: sel => (matches(el, sel) ? el : null),
    get parentNode() { return el.parent ?? el.owner.body; },
    get nextElementSibling() { const all = el.owner.elements; for (let i = all.indexOf(el) + 1; i > 0 && i < all.length; i++) { if (all[i].parent === el.parent) return all[i]; if (!descends(all[i], el)) return null; } return null; },
    insertBefore: (node, ref) => el.owner.insert(el, node, ref), removeChild: node => el.owner.remove(node),
  };
  return el;
}
const descends = (el, anc) => { for (let p = el.parent; p; p = p.parent) if (p === anc) return true; return false; };
function parseInto(html, owner) {
  const clean = html.replace(/<script\b[\s\S]*?<\/script>/gi, '').replace(/<style\b[\s\S]*?<\/style>/gi, '').replace(/<!--[\s\S]*?-->/g, '');
  const out = []; const stack = [];
  for (const m of clean.matchAll(/<(\/?)([a-zA-Z][a-zA-Z0-9]*)((?:"[^"]*"|'[^']*'|[^>"'])*)>/g)) {
    const tag = m[2].toLowerCase();
    if (m[1]) { const i = stack.map(e => e.tagName).lastIndexOf(tag.toUpperCase()); if (i >= 0) stack.length = i; continue; }
    const attrs = {};
    for (const a of m[3].matchAll(/([^\s=\/"']+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g)) attrs[a[1].toLowerCase()] = decode(a[2] ?? a[3] ?? a[4] ?? '');
    const el = makeEl(tag, attrs, owner); el.parent = stack[stack.length - 1] ?? null; out.push(el);
    if (!VOID.has(tag) && !/\/\s*$/.test(m[3])) stack.push(el);
  }
  return out;
}
function makeDoc(html, visitor) {
  const doc = {
    elements: [], handlers: {}, body: null,
    get cookie() { return [...visitor.jar].map(([k, v]) => `${k}=${v}`).join('; '); },
    set cookie(v) { const m = /^([^=]+)=([^;]*)/.exec(v); if (m) visitor.jar.set(m[1], m[2]); },
    querySelector: sel => (KNOWN.has(sel) ? doc.elements.find(e => matches(e, sel)) ?? null : null),
    querySelectorAll: sel => (KNOWN.has(sel) ? doc.elements.filter(e => matches(e, sel)) : []),
    getElementById: id => doc.elements.find(e => e.attrs.id === id) ?? null,
    addEventListener: (t, fn) => { (doc.handlers[t] ||= []).push(fn); },
    dispatchEvent: () => true,
    createElement: tag => {
      if (tag !== 'template') return makeEl(tag, {}, doc);
      const tpl = { elements: [], body: null, querySelector: () => null, querySelectorAll: () => [] };
      return { set innerHTML(h) { tpl.elements = parseInto(h, tpl); }, content: { get childNodes() { return tpl.elements.filter(e => e.parent === null); } }, _tpl: tpl };
    },
    // déplace un nœud (et sa descendance) d'un gabarit vers le document, avant ref
    insert: (parent, node, ref) => {
      const src = node.owner; const moved = src.elements.filter(e => e === node || descends(e, node));
      src.elements = src.elements.filter(e => !moved.includes(e));
      for (const e of moved) e.owner = doc;
      node.parent = parent === doc.body ? null : parent;
      const at = doc.elements.indexOf(ref);
      doc.elements.splice(at < 0 ? doc.elements.length : at, 0, ...moved);
    },
    remove: node => { doc.elements = doc.elements.filter(e => e !== node && !descends(e, node)); },
  };
  doc.body = { insertBefore: (node, ref) => doc.insert(doc.body, node, ref), removeChild: node => doc.remove(node) };
  doc.elements = parseInto(html, doc);
  return doc;
}

// --- visiteur simulé
let siteJs = null;
class Visitor {
  constructor(seed) { this.jar = new Map(); this.sess = {}; this.rnd = mulberry(seed); this.pending = []; this.errors = []; this.width = 1280; }
  async http(pathname, { method = 'GET', body, headers = {} } = {}) {
    const cookie = [...this.jar].map(([k, v]) => `${k}=${v}`).join('; ');
    requests++;
    const r = await fetch(base + pathname, { method, body, headers: { ...(cookie ? { cookie } : {}), ...headers }, redirect: 'manual' });
    this.setCookies = {};
    for (const c of r.headers.getSetCookie()) { const m = /^([^=]+)=([^;]*)/.exec(c); if (!m) continue; this.setCookies[m[1]] = m[2]; if (m[2] === 'deleted' || /max-age=0\b/i.test(c)) this.jar.delete(m[1]); else this.jar.set(m[1], m[2]); }
    return { status: r.status, text: await r.text(), headers: r.headers };
  }
  /** Charge une page : requête avec les cookies, puis scripts de la page (en ligne et site.js) exécutés sur le DOM reconstruit. */
  async load(pathname, opts) {
    const res = await this.http(pathname, opts);
    this.status = res.status; this.html = res.text; this.served = res.headers.get('x-sl-static');
    const doc = this.doc = makeDoc(res.text, this);
    const self = this;
    const sandbox = {
      document: doc, console, URLSearchParams, Blob, setTimeout, clearTimeout, innerWidth: this.width, addEventListener() {}, __rnd: this.rnd,
      location: { pathname: pathname.split(/[?#]/)[0], search: pathname.includes('?') ? '?' + pathname.split('?')[1].split('#')[0] : '', hash: '', href: base + pathname },
      sessionStorage: { getItem: k => (k in self.sess ? self.sess[k] : null), setItem: (k, v) => { self.sess[k] = String(v); } },
      navigator: { sendBeacon: (url, blob) => { self.pending.push(blob.text().then(b => self.http(url, { method: 'POST', body: b, headers: { 'content-type': 'application/json' } })).catch(() => {})); return true; } },
      fetch: (url, o = {}) => { const p = self.http(url, { method: o.method, body: o.body, headers: o.headers }).then(r => ({ ok: r.status >= 200 && r.status < 300, status: r.status, text: async () => r.text, json: async () => JSON.parse(r.text) })); self.pending.push(p.catch(() => {})); return p; },
      CustomEvent: class { constructor(type, o) { this.type = type; Object.assign(this, o); } }, Event: class { constructor(type) { this.type = type; } },
    };
    sandbox.window = sandbox; this.window = sandbox;
    vm.createContext(sandbox); vm.runInContext('Math.random = __rnd;', sandbox);
    const run = (code, name) => { try { vm.runInContext(code, sandbox, { filename: name }); } catch (e) { this.errors.push(`${name} : ${e.message}`); } };
    for (const m of res.text.matchAll(/<script(?![^>]*\b(?:src|type)=)[^>]*>([\s\S]*?)<\/script>/g)) run(m[1], 'script de la page');
    const src = /<script src="(\/assets\/site\.js[^"]*)"/.exec(res.text)?.[1];
    if (src) { siteJs ??= (await this.http(src)).text; run(siteJs, 'site.js'); }
    await this.settle();
    return res;
  }
  async settle() { for (let i = 0; i < 100; i++) { if (this.pending.length) await Promise.all(this.pending.splice(0)); await new Promise(r => setImmediate(r)); if (!this.pending.length) { await new Promise(r => setImmediate(r)); if (!this.pending.length) return; } } }
  profile() { const raw = this.jar.get('sl_p'); if (!raw) return null; try { return JSON.parse(decodeURIComponent(raw)); } catch { return null; } }
  async consent(accept = true) { const b = this.doc.querySelector(accept ? '.consent-accept' : '.consent-refuse'); if (!b?.handlers.click) return false; b.handlers.click.forEach(fn => fn({})); await this.settle(); return true; }
  /** Clic sur un bouton de la page (a.btn) désigné par sa cible. */
  async click(href) { const a = this.doc.elements.find(e => e.tagName === 'A' && matches(e, 'a.btn') && e.attrs.href === href); if (!a) return false; (this.doc.handlers.click || []).forEach(fn => fn({ target: a, preventDefault() {}, stopPropagation() {} })); await this.settle(); return true; }
  async form(event) { const forms = this.doc.querySelectorAll('form.contact-form, form.sl-form'); forms.forEach(f => (f.handlers[event] || []).forEach(fn => fn({ target: f, preventDefault() {} }))); await this.settle(); return forms.length > 0; }
  variant(id) { return this.doc.getElementById(id)?.getAttribute('data-variant') ?? null; }
}

// --- calcul indépendant du verdict (Wilson puis Newcombe), à comparer à celui du back-office
function wilson(c, n, z) { const p = c / n, z2 = z * z, den = 1 + z2 / n, mid = (p + z2 / (2 * n)) / den, half = z * Math.sqrt(p * (1 - p) / n + z2 / (4 * n * n)) / den; return [Math.max(0, mid - half), Math.min(1, mid + half)]; }
function verdict(arm, ctl, minimum, z = 1.96) {
  const out = {};
  if (arm.n > 0 && ctl.n > 0) { const p1 = arm.c / arm.n, p2 = ctl.c / ctl.n, [l1, u1] = wilson(arm.c, arm.n, z), [l2, u2] = wilson(ctl.c, ctl.n, z); out.diff = p1 - p2; out.low = out.diff - Math.hypot(p1 - l1, u2 - p2); out.high = out.diff + Math.hypot(u1 - p1, p2 - l2); }
  const missing = Math.max(0, minimum - Math.min(arm.n, ctl.n));
  if (missing > 0) { out.verdict = 'insufficient'; out.missing = missing; } else if (arm.c + ctl.c < 10) out.verdict = 'few_conversions'; else out.verdict = out.low > 0 ? 'better' : out.high < 0 ? 'worse' : 'none';
  return out;
}
const near = (a, b) => typeof a === 'number' && typeof b === 'number' && Math.abs(a - b) < 1e-9;

// --- mise en place : copie de travail du site compilé (données vierges, dist d'origine intact)
const work = await fs.mkdtemp(path.join(os.tmpdir(), 'devanture-exp-'));
const copyDist = async (from, to) => fs.cp(from, to, { recursive: true, filter: src => { const rel = path.relative(from, src).replaceAll('\\', '/'); return rel !== '.env' && rel !== 'data' && !rel.startsWith('data/') && !/^cache\/.+/.test(rel); } });
let server = null;
const serve = async d => { server = spawn(PHP, ['-S', `127.0.0.1:${portArg}`, '-t', d, path.join(d, 'index.php')], { stdio: 'ignore' }); for (let i = 0; i < 60; i++) { try { await fetch(base + '/'); return; } catch { await new Promise(r => setTimeout(r, 150)); } } throw new Error('le serveur PHP ne répond pas'); };
const stop = async () => { if (!server) return; const s = server; server = null; await new Promise(r => { s.once('exit', r); s.kill(); setTimeout(r, 2000); }); };
const admin = new Visitor(1);
const report = async () => { const r = await admin.http('/_admin/experiments?json=1'); try { return JSON.parse(r.text); } catch { return { _raw: r.text.slice(0, 300) }; } };
const group = (rep, exp, g) => rep?.[exp]?.groups?.find(x => x.name === g) ?? {};
const TEL = 'tel:0472001122';
// Vérité du banc : exposés (n) et conversions (c) par groupe, comptés ici au fil de la simulation.
const truth = { accroche: { temoin: { n: 0, c: 0 }, prix_annonce: { n: 0, c: 0 } }, relance: { temoin: { n: 0, c: 0 }, devis_abandonne: { n: 0, c: 0 } } };
// Répartition attendue d'après les segments du site (segments.md) : arms: [prix_annonce] = moitié-moitié ; holdout: 20 = 20 % de témoins dans le segment.
const armOf = d => (d < 5000 ? 'prix_annonce' : 'temoin');
const heldOf = d => (d < 2000 ? 'temoin' : 'devis_abandonne');
const sameCounts = (rep, exp) => Object.entries(truth[exp]).every(([g, t]) => group(rep, exp, g).exposed === t.n && group(rep, exp, g).conversions === t.c);
const counts = (rep, exp) => JSON.stringify(Object.fromEntries((rep?.[exp]?.groups ?? []).map(g => [g.name, [g.exposed, g.conversions]]))) + ' attendu ' + JSON.stringify(Object.fromEntries(Object.entries(truth[exp]).map(([g, t]) => [g, [t.n, t.c]])));

try {
  const dist = path.join(work, 'dist');
  await copyDist(root, dist);
  await fs.writeFile(path.join(dist, '.env'), 'ADMIN_TOKEN=exp-admin\n');
  await serve(dist);
  await admin.http('/_admin?token=exp-admin');

  // 1. Ce que le site déclare
  const first = new Visitor(2); await first.load('/');
  const spec = first.window.SL?.spec ?? {};
  ok('la page porte les expériences et les objectifs compilés', spec.experiments?.accroche && spec.experiments?.relance && spec.goals?.appel && spec.goals?.devis, Object.keys(spec.experiments ?? {}).join(','));
  ok('accroche : témoin et bras prix_annonce à parts égales', JSON.stringify(spec.experiments?.accroche?.arms) === JSON.stringify([{ name: 'prix_annonce', upto: 5000 }]) && spec.experiments.accroche.groups.join() === 'temoin,prix_annonce');
  ok('relance : témoin de 20 % dans le segment devis_abandonne', spec.experiments?.relance?.holdout === 2000 && spec.experiments.relance.segment === 'devis_abandonne' && spec.experiments.relance.cond?.type === 'all');
  ok('le segment mesuré exige d\'être hors du témoin', JSON.stringify(spec.segments?.devis_abandonne?.items?.[1]) === JSON.stringify({ type: 'treated', exp: 'relance' }));
  ok('chaque expérience porte une empreinte de son contenu', /^[0-9a-f]{8}$/.test(spec.experiments?.accroche?.sig ?? '') && /^[0-9a-f]{8}$/.test(spec.experiments?.relance?.sig ?? '') && spec.experiments.accroche.sig !== spec.experiments.relance.sig);
  ok('la section comparée est marquée (data-sl-exp)', /<span id="s1" class="anchor"[^>]*data-sl-exp="accroche relance"/.test(first.html), first.html.match(/<span id="s1"[^>]*>/)?.[0]);
  ok('site.js s\'exécute sur le DOM du banc sans erreur', first.errors.length === 0, first.errors.join(' | '));
  ok('sans consentement : bandeau affiché, ni tirage ni profil', first.doc.querySelector('.consent')?.hidden === false && !first.jar.has('sl_p'));
  const sigA = spec.experiments.accroche.sig, sigR = spec.experiments.relance.sig;
  const empty = await report();
  ok('back-office : expériences listées, aucun visiteur compté', sameCounts(empty, 'accroche') && sameCounts(empty, 'relance') && empty.accroche?.since === null, JSON.stringify(empty).slice(0, 200));

  // 2. A/B « accroche » : visiteurs nouveaux, taux d'appel vrais de 10 % (témoin) et 25 % (bras)
  const dice = mulberry(20261109);
  const bad = { group: 0, variant: 0, relance: 0, text: 0, errors: 0 };
  let keptArm = null, keptCtl = null;
  /** Première visite de l'accueil : page de base, consentement, tirage, fragment, exposition. */
  async function home(v) {
    await v.load('/'); await v.consent(true);
    const p = v.profile(); const x = p?.x?.accroche; const g = armOf(x?.[0]);
    truth.accroche[g].n++;
    if (!x || x[1] !== sigA || x[2] !== (g === 'temoin' ? 1 : 2)) bad.group++;
    if (v.variant('s1') !== (g === 'temoin' ? null : 'prix_annonce')) bad.variant++;
    if (p?.x?.relance?.[2] !== 0) bad.relance++;
    if (v.errors.length) bad.errors++;
    return g;
  }
  const N = 460;
  for (let i = 0; i < N; i++) {
    const v = new Visitor(1000 + i);
    const g = await home(v);
    if (i < 12) { const r = await v.http('/'); if (/à partir de 95 € TTC<\/h1>/.test(r.text) !== (g === 'prix_annonce')) bad.text++; }
    const calls = dice() < (g === 'prix_annonce' ? 0.25 : 0.10);
    if (calls) { await v.click(TEL); truth.accroche[g].c++; if (i % 3 === 0) await v.click(TEL); }
    else if (i % 5 === 0) await v.click('/contact'); // un autre bouton : pas l'objectif
    if (i % 7 === 0) { await v.load('/'); if (calls) await v.click(TEL); } // revenir ne recompte ni l'exposition ni la conversion
    if (g === 'prix_annonce' && calls) keptArm ??= v;
    if (g === 'temoin') keptCtl ??= v;
    if (i === 99) {
      const rep = await report(); const exp = verdict(truth.accroche.prix_annonce, truth.accroche.temoin, 200); const got = group(rep, 'accroche', 'prix_annonce');
      ok('après 100 visiteurs : comptes exacts par groupe', sameCounts(rep, 'accroche'), counts(rep, 'accroche'));
      ok('après 100 visiteurs : « pas assez de données », avec ce qu\'il manque', got.verdict === 'insufficient' && got.missing === exp.missing && exp.missing > 0, `${got.verdict} ${got.missing} / ${exp.missing}`);
    }
  }
  ok(`${N} visiteurs : tirage du navigateur conforme à la répartition déclarée, groupe d'exposition enregistré`, bad.group === 0, `${bad.group} écarts`);
  ok('le bras voit sa variante (fragment), le témoin le contenu de base', bad.variant === 0 && bad.text === 0, `${bad.variant} fragments, ${bad.text} rendus serveur`);
  ok('aucun visiteur exposé à « relance » hors de sa condition', bad.relance === 0, String(bad.relance));
  ok('aucune erreur de script chez les visiteurs', bad.errors === 0, String(bad.errors));
  const share = truth.accroche.prix_annonce.n / N;
  ok('répartition proche de moitié-moitié', share > 0.42 && share < 0.58, share.toFixed(3));
  ok('window.devanture.group donne le groupe du visiteur', keptArm?.window.devanture?.group('accroche') === 'prix_annonce' && keptCtl?.window.devanture?.group('accroche') === 'temoin');
  {
    const rep = await report(); const exp = verdict(truth.accroche.prix_annonce, truth.accroche.temoin, 200); const got = group(rep, 'accroche', 'prix_annonce');
    ok('back-office : exposés et conversions identiques à la vérité du banc (une fois par visiteur)', sameCounts(rep, 'accroche'), counts(rep, 'accroche'));
    ok('back-office : écart et intervalle à 95 % identiques au calcul indépendant', near(got.diff, exp.diff) && near(got.low, exp.low) && near(got.high, exp.high), `${got.diff} [${got.low}, ${got.high}] / ${exp.diff} [${exp.low}, ${exp.high}]`);
    ok('verdict : le bras « fait mieux » (25 % contre 10 % simulés)', got.verdict === 'better' && exp.verdict === 'better' && got.low > 0, `${got.verdict} / ${exp.verdict}`);
    ok('aucune mesure ancienne signalée, date de début renseignée', rep.accroche?.ignored === 0 && /^\d{4}-\d\d-\d\d/.test(rep.accroche?.since ?? ''));
  }

  // 3. Refus du consentement : ni tirage, ni événement
  for (let i = 0; i < 5; i++) { const v = new Visitor(5000 + i); await v.load('/'); await v.consent(false); await v.click(TEL); await v.load('/'); await v.click(TEL); if (v.jar.has('sl_p') || v.jar.get('sl_c') !== '0') bad.group++; }
  ok('refus du consentement : pas de profil, pas de tirage', bad.group === 0);

  // 4. Segment mesuré « relance » : devis commencé, puis retour à l'accueil ; taux d'envoi vrais de 20 % (témoin) et 50 % (variante)
  const fields = csrf => new URLSearchParams({ _form: 'contact', _csrf: csrf, name: 'Visiteur du banc', phone: '0611223344', kind: 'Autre', message: 'Demande envoyée par le banc des expériences.', website: '' });
  const csrfOf = html => /name="_csrf" value="([^"]+)"/.exec(html)?.[1] ?? '';
  const post = (v, body) => v.load('/contact', { method: 'POST', body: body.toString(), headers: { 'content-type': 'application/x-www-form-urlencoded' } });
  const badR = { early: 0, group: 0, variant: 0, text: 0, sent: 0 };
  /** Commence le formulaire puis revient à l'accueil : c'est là que la relance agit. */
  async function abandon(v) {
    await home(v);
    await v.load('/contact'); await v.form('input');
    if (v.profile()?.x?.relance?.[2] !== 0) badR.early++; // pas d'exposition sur une page où l'expérience n'agit pas
    await v.load('/');
    const x = v.profile()?.x?.relance; const g = heldOf(x?.[0]);
    truth.relance[g].n++;
    if (!x || x[2] !== (g === 'temoin' ? 1 : 2)) badR.group++;
    if ((v.variant('s1') === 'devis_abandonne') !== (g === 'devis_abandonne')) badR.variant++;
    if (/Votre demande de devis vous attend/.test(v.html) !== (g === 'devis_abandonne')) badR.text++;
    return g;
  }
  let sentHtml = '';
  for (let i = 0; i < 60; i++) {
    const v = new Visitor(7000 + i);
    const g = await abandon(v);
    if (dice() < (g === 'devis_abandonne' ? 0.5 : 0.2)) {
      await v.load('/contact'); const csrf = csrfOf(v.html);
      await v.form('input'); await v.form('submit');
      await post(v, fields(csrf));
      truth.relance[g].c++; sentHtml ||= v.html;
      if (!/data-sl-event="form_sent"/.test(v.html) || v.profile()?.x?.relance?.[3] !== 1) badR.sent++;
      if (i % 4 === 0) await v.load('/'); // revenir après l'envoi ne recompte rien
    }
  }
  ok('relance : pas d\'exposition tant que le visiteur n\'a pas revu la section', badR.early === 0, String(badR.early));
  ok('relance : 20 % de témoins tirés dans le segment, groupe enregistré', badR.group === 0 && truth.relance.temoin.n > 0 && truth.relance.devis_abandonne.n > truth.relance.temoin.n, `${badR.group} écarts, ${truth.relance.temoin.n} témoins`);
  ok('relance : la variante est rendue aux traités, le contenu de base aux témoins', badR.variant === 0 && badR.text === 0, `${badR.variant} / ${badR.text}`);
  ok('formulaire accepté : balise form_sent dans la réponse, conversion enregistrée', badR.sent === 0 && /data-sl-event="form_sent" data-sl-data="[^"]*contact/.test(sentHtml) && !phpErr(sentHtml), String(badR.sent));
  {
    // pot de miel et formulaire refusé : ni balise, ni conversion
    const bot = new Visitor(7900); const gb = await abandon(bot); await bot.load('/contact'); const b = fields(csrfOf(bot.html)); b.set('website', 'http://spam.example'); await post(bot, b);
    ok('pot de miel : succès simulé sans balise form_sent ni conversion', !/data-sl-event="form_sent"/.test(bot.html) && bot.profile()?.x?.relance?.[3] === 0, gb);
    const inv = new Visitor(7901); await abandon(inv); await inv.load('/contact'); const f = fields(csrfOf(inv.html)); f.delete('phone'); await inv.form('submit'); await post(inv, f);
    ok('formulaire refusé par le serveur : pas de conversion (form_submit n\'est qu\'une tentative)', !/data-sl-event="form_sent"/.test(inv.html) && inv.profile()?.x?.relance?.[3] === 0);
    const rep = await report(); const exp = verdict(truth.relance.devis_abandonne, truth.relance.temoin, 200); const got = group(rep, 'relance', 'devis_abandonne');
    ok('back-office : comptes de « relance » identiques à la vérité du banc', sameCounts(rep, 'relance'), counts(rep, 'relance'));
    ok('back-office : comptes de « accroche » toujours exacts (visiteurs des deux expériences)', sameCounts(rep, 'accroche'), counts(rep, 'accroche'));
    ok('relance : trop peu de visiteurs, verdict retenu et manque chiffré', got.verdict === 'insufficient' && got.missing === exp.missing && near(got.diff, exp.diff), `${got.verdict} ${got.missing}`);
    ok('back-office : objectif et emplacement affichés', rep.relance?.goal === 'devis' && rep.relance.goal_def?.event === 'form_sent' && rep.relance.kind === 'segment' && rep.accroche?.where?.[0] === '/#s1');
  }

  // 5. Visiteur déjà connu (profil d'avant l'expérience) : tirage côté serveur, premier rendu déjà dans son groupe
  {
    const seen = { prix_annonce: 0, temoin: 0 }; let wrong = 0, kept = 0, tries = 0;
    const before = { v: 1, n: 3, e: { page_view: { n: 4, t: Math.floor(Date.now() / 1000) - 86400 } }, r: { s: ['services'] } };
    for (; tries < 40 && (tries < 6 || !seen.prix_annonce || !seen.temoin); tries++) {
      const v = new Visitor(9000 + tries); v.sess.sl_s = '1'; v.jar.set('sl_c', '1'); v.jar.set('sl_p', encodeURIComponent(JSON.stringify(tries % 2 ? before : { v: 1, n: 3, e: {} })));
      const res = await v.http('/'); const raw = v.setCookies.sl_p ? decodeURIComponent(v.setCookies.sl_p) : ''; let p = null; try { p = JSON.parse(raw); } catch { /* compté plus bas */ }
      const d = p?.x?.accroche?.[0]; const g = armOf(d); seen[g]++;
      if (!Number.isInteger(d) || d < 0 || d > 9999 || p.x.accroche[1] !== sigA || p.x.accroche[2] !== 0 || !Number.isInteger(p.x.relance?.[0])) wrong++;
      const { x, ...rest } = p ?? {}; if (JSON.stringify(rest) === JSON.stringify(tries % 2 ? before : { v: 1, n: 3, e: {} }) && /"e":\{/.test(raw)) kept++;
      const shown = /<span id="s1"[^>]*data-variant="([^"]+)"/.exec(res.text)?.[1] ?? null;
      if ((shown === 'prix_annonce') !== (g === 'prix_annonce') || (g === 'temoin' && shown !== 'recurrent')) wrong++;
      await v.load('/'); truth.accroche[g].n++; // son navigateur garde le tirage du serveur et déclare l'exposition
      if (v.profile()?.x?.accroche?.[0] !== d || v.profile()?.x?.accroche?.[2] !== (g === 'temoin' ? 1 : 2)) wrong++;
    }
    ok('visiteur connu : tirage côté serveur, premier rendu dans son groupe (bras ou variante habituelle)', wrong === 0 && seen.prix_annonce > 0 && seen.temoin > 0, `${wrong} écarts sur ${tries}, ${JSON.stringify(seen)}`);
    ok('visiteur connu : le reste du profil est conservé tel quel dans le cookie', kept === tries, `${kept}/${tries}`);
    const nc = new Visitor(9100); nc.jar.set('sl_p', encodeURIComponent(JSON.stringify(before))); await nc.http('/');
    ok('sans consentement : le serveur ne tire pas', nc.setCookies.sl_p === undefined);
  }

  // 6. Événements fabriqués : le groupe vient du profil, jamais de la requête
  {
    const send = async (cookies, name, data) => { requests++; return fetch(base + '/_event', { method: 'POST', headers: { 'content-type': 'application/json', ...(cookies ? { cookie: cookies } : {}) }, body: JSON.stringify({ name, data }) }); };
    const prof = x => 'sl_p=' + encodeURIComponent(JSON.stringify({ v: 1, n: 1, e: {}, x }));
    await send(null, 'exp_exposure', { exp: 'accroche', group: 'prix_annonce' });                                    // sans profil
    await send('sl_c=1; ' + prof({ accroche: [100, sigA, 0, 0] }), 'exp_exposure', { exp: 'accroche' });           // pas exposé
    await send('sl_c=1; ' + prof({ accroche: [100, 'deadbeef', 2, 0] }), 'exp_exposure', { exp: 'accroche' });     // autre empreinte
    await send('sl_c=1; ' + prof({ accroche: [100, sigA, 1, 0] }), 'exp_exposure', { exp: 'accroche' });           // groupe qui contredit le tirage
    await send('sl_c=1; ' + prof({ accroche: [100, sigA, 2, 0] }), 'exp_conversion', { exp: 'accroche' });         // conversion sans objectif atteint
    await send('sl_c=1; ' + prof({ nope: [100, sigA, 2, 1] }), 'exp_exposure', { exp: 'nope' });                    // expérience inconnue
    await send('sl_c=0; ' + prof({ accroche: [100, sigA, 2, 1] }), 'exp_exposure', { exp: 'accroche' });           // consentement refusé
    const rep = await report();
    ok('événements fabriqués ou incohérents : aucun n\'est compté', sameCounts(rep, 'accroche') && sameCounts(rep, 'relance'), counts(rep, 'accroche'));
    await send('sl_c=1; ' + prof({ accroche: [9000, sigA, 1, 0] }), 'exp_exposure', { exp: 'accroche', group: 'prix_annonce' }); truth.accroche.temoin.n++;
    const rep2 = await report();
    ok('groupe demandé dans la requête ignoré : c\'est celui du tirage qui compte', sameCounts(rep2, 'accroche'), counts(rep2, 'accroche'));
    const page = await admin.http('/_admin/experiments');
    ok('back-office : onglet « Expériences » lisible, sans erreur PHP', page.status === 200 && !phpErr(page.text) && /Fait mieux/.test(page.text) && /Pas assez de données/.test(page.text) && /prix_annonce/.test(page.text) && /contenu de base/.test(page.text), String(page.status));
    ok('back-office : l\'onglet apparaît dans la navigation', /href="\/_admin\/experiments"/.test((await admin.http('/_admin')).text));
  }

  // 7. Modifier le contenu comparé ouvre une nouvelle mesure
  {
    const project = path.resolve(root, '..'); const site = path.join(work, 'site');
    await fs.cp(project, site, { recursive: true, filter: src => { const rel = path.relative(project, src).replaceAll('\\', '/'); return rel !== 'dist' && !rel.startsWith('dist/') && !rel.startsWith('node_modules') && !rel.startsWith('.devanture'); } });
    // La page est écrite en document (pages/accueil.md) ou en YAML : le titre du bras se change dans l'écriture du site, et la
    // lecture d'un document modifié s'accepte avant de compiler.
    const docFile = path.join(site, 'pages', 'accueil.md'); const isDoc = await fs.access(docFile).then(() => true, () => false);
    const pageFile = isDoc ? docFile : path.join(site, 'pages', 'accueil.page.yaml'); const src = await fs.readFile(pageFile, 'utf8');
    const changed = isDoc ? src.replace('- prix_annonce | Dépannage à Lyon à partir de 95 € TTC', '- prix_annonce | Votre dépannage à Lyon à partir de 95 € TTC') : src.replace('title: Dépannage à Lyon à partir de 95 € TTC', 'title: Votre dépannage à Lyon à partir de 95 € TTC');
    await fs.writeFile(pageFile, changed);
    let built = src !== changed; let buildErr = built ? '' : 'titre du bras introuvable dans ' + path.basename(pageFile);
    if (built && isDoc) try { execFileSync(process.execPath, [path.join(ROOT, 'bin', 'sitec.js'), 'lire', site, '--accepter'], { encoding: 'utf8', stdio: 'pipe' }); } catch (e) { built = false; buildErr = String(e.stdout || e.message).slice(0, 300); }
    if (built) try { execFileSync(process.execPath, [path.join(ROOT, 'bin', 'sitec.js'), 'build', site], { encoding: 'utf8', stdio: 'pipe' }); } catch (e) { built = false; buildErr = String(e.stdout || e.message).slice(0, 300); }
    ok('recompilation avec un titre de bras modifié', built, buildErr);
    if (built) {
      const before = await report();
      await stop();
      await fs.cp(path.join(dist, 'data'), path.join(site, 'dist', 'data'), { recursive: true });
      await fs.copyFile(path.join(dist, '.env'), path.join(site, 'dist', '.env'));
      await serve(path.join(site, 'dist'));
      await admin.http('/_admin?token=exp-admin');
      const rep = await report(); const old = before.accroche.groups.reduce((s, g) => s + g.exposed + g.conversions, 0);
      ok('nouvelle empreinte pour l\'expérience modifiée, inchangée pour l\'autre', rep.accroche?.sig !== sigA && /^[0-9a-f]{8}$/.test(rep.accroche?.sig ?? '') && rep.relance?.sig === sigR, `${rep.accroche?.sig} / ${rep.relance?.sig}`);
      ok('la mesure repart de zéro et l\'ancienne est signalée, sans être mélangée', rep.accroche.groups.every(g => g.exposed === 0 && g.conversions === 0) && rep.accroche.ignored === old && old > 0, `${rep.accroche.ignored} / ${old}`);
      ok('l\'autre expérience garde sa mesure', sameCounts(rep, 'relance'), counts(rep, 'relance'));
      const d = keptArm.profile().x.accroche[0];
      await keptArm.load('/'); const x = keptArm.profile()?.x?.accroche;
      ok('visiteur de retour : même groupe (tirage conservé), exposition et conversion remises à zéro', x?.[0] === d && x[1] === rep.accroche.sig && x[2] === 2 && x[3] === 0, JSON.stringify(x));
      ok('visiteur de retour : il voit le nouveau titre', /Votre dépannage à Lyon à partir de 95 € TTC<\/h1>/.test(keptArm.html));
      await keptArm.click(TEL);
      const rep2 = await report(); const g2 = group(rep2, 'accroche', 'prix_annonce');
      ok('nouvelle mesure : une exposition et une conversion comptées pour ce visiteur', g2.exposed === 1 && g2.conversions === 1 && group(rep2, 'accroche', 'temoin').exposed === 0, `${g2.exposed} / ${g2.conversions}`);
    }
  }
} catch (e) {
  ok('exécution du banc', false, e.stack || e.message);
} finally {
  await stop();
  await fs.rm(work, { recursive: true, force: true }).catch(() => {});
}

const passed = checks.filter(c => c.pass).length;
for (const c of checks) console.log(`${c.pass ? 'OK  ' : 'FAIL'} ${c.name}${c.detail && !c.pass ? ' — ' + c.detail : ''}`);
console.log(JSON.stringify({ experiments: path.basename(path.dirname(root)), trafic: 'simulé', visiteurs: truth.accroche.temoin.n + truth.accroche.prix_annonce.n, requetes: requests, verite: truth, passed, total: checks.length }));
process.exit(passed === checks.length ? 0 : 1);
