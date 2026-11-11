// Banc de la documentation : ce que la prose affirme est comparé à ce que le compilateur fait.
//   A. Chaque bloc ```yaml (ou gabarit ```html) de docs/LANGAGE.md, CLAUDE.md, README.md, docs/CIBLES.md porte un marqueur
//      <!-- sitec: … --> qui dit où il va dans un site ; les blocs d'un document forment un site, passé à « check » puis « build ».
//        <!-- sitec: site.yaml -->                  le fichier entier
//        <!-- sitec: site.yaml (ajout) -->          des clés ajoutées à la racine du fichier
//        <!-- sitec: fragment sections -->          une liste de sections (une page est créée autour)
//        <!-- sitec: fragment faq.items -->         la valeur d'une prop d'un composant
//        <!-- sitec: aucun — raison -->             bloc non compilable seul (compté et listé)
//      Le banc ajoute ce qu'un exemple cite sans le montrer : pages des routes citées, images, fichiers custom.
//   B. Commandes, options, chemins, codes d'erreur, variables d'environnement, routes d'exploitation, attributs et jetons
//      cités dans la prose : ils doivent exister dans le compilateur.
//   C. Listes de mots écrites à la main (types, filtres, primitives, événements…) : comparées aux constantes du compilateur.
//   D. Exemples des fiches « sitec explain » (site et chaque composant) : compilés eux aussi.
//   E. CLAUDE.md d'un dépôt créé par « sitec init » : mêmes exemples, commandes valides.
// Ce que le banc ne voit pas : une phrase qui décrit un comportement sans le montrer par un exemple ni citer un nom vérifiable.
// Usage : node scripts/verify-docs.mjs [--verbose]
import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { EVENTS, GOAL_EVENTS, CONTROL, DEFAULT_MINIMUM } from '../src/segments.js';
import { KNOWN_FIELDS, FIELD_TYPES as FORM_FIELD_TYPES } from '../src/forms.js';
import { FIELD_TYPES as COLLECTION_FIELD_TYPES, RESERVED as RESERVED_COLLECTIONS } from '../src/collections.js';
import { PARAM_TYPES } from '../src/composition.js';
import { LANGUAGE_VERSIONS, SITE_SCHEMA } from '../src/validate.js';
import { THEME_PRESETS } from '../src/emit/php/css.js';
import { DEFAULTS as IMAGE_DEFAULTS } from '../src/images/index.js';
import { PRODUCT_KEYS } from '../src/shop.js';
import { BEHAVIOR_NAMES } from '../src/lang/behaviors.js';
import { ICON_NAMES, TYPE_WORDS } from '../src/lang/donnees.js';
import { PRIMITIVES } from '../src/lang/forme.js';
import { WORD_KEYS, compileVocabulaire } from '../src/lang/vocabulaire.js';
import { SOURCES, PUBLIC_SOURCE_NAMES } from '../src/lang/sources.js';
import { TOURNURES, readDocument } from '../src/lang/document.js';
import { INTENT_NAMES } from '../src/lang/apparence.js';
import { FIELD_TYPE_WORDS, FORM_SETTINGS, RESERVED_STORES } from '../src/lang/fonctionnement.js';
import { FILTERS, FUNCTION_NAMES, SAFE_FUNCTIONS } from '../src/lang/expr.js';
import { TEMPLATE_VOCABULARY } from '../src/lang/template.js';
import { DEFAULT_MODEL as MODEL_COMPONENTS } from '../src/component-gen.js';
import { DEFAULT_MODEL as MODEL_KEYWORDS } from '../src/keywords.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITEC = path.join(ROOT, 'bin', 'sitec.js');
const VERBOSE = process.argv.includes('--verbose');
const checks = [];
const ok = (n, pass, detail = '') => { checks.push({ name: n, pass: !!pass, detail: Array.isArray(detail) ? detail.join(' ; ') : detail }); };
const node = (args, cwd = ROOT) => { try { return { code: 0, out: execFileSync(process.execPath, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) }; } catch (e) { return { code: e.status ?? 1, out: (e.stdout || '') + (e.stderr || '') }; } };
const run = (...args) => node([SITEC, ...args]);
const lines = out => out.split('\n').filter(Boolean).map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
const read = rel => fs.readFile(path.join(ROOT, rel), 'utf8').then(s => s.replace(/\r\n/g, '\n'));
const exists = p => fs.access(p).then(() => true, () => false);
const walk = async (dir, keep = () => true) => { const out = []; for (const e of await fs.readdir(dir, { withFileTypes: true })) { const p = path.join(dir, e.name); if (e.isDirectory()) { if (!/^(dist|node_modules|\.git)$/.test(e.name)) out.push(...await walk(p, keep)); } else if (keep(p)) out.push(p); } return out; };
const uniq = a => [...new Set(a)];
const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'sitec-docs-'));

// ───────────────────────────── Site d'essai : écrire, compléter, compiler ─────────────────────────────

const SAMPLES = { svg: 'examples/plomberie-martin/assets/hero.svg', jpg: 'examples/savonnerie/assets/atelier.jpg', jpeg: 'examples/savonnerie/assets/atelier.jpg' };
const PIXELS = { png: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', webp: 'UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA' };
const BASE_SITE = 'language: 1\nsite:\n  name: Exemple de la documentation\n';
const indent = (text, n) => text.split('\n').map(l => (l.trim() ? ' '.repeat(n) + l : l)).join('\n');
const put = async (dir, rel, text) => { const f = path.join(dir, rel); await fs.mkdir(path.dirname(f), { recursive: true }); await fs.writeFile(f, text); };
const routeSlug = r => (r === '/' ? 'accueil' : r.replace(/^\/|\/$/g, '').replace(/[^a-z0-9]+/g, '-'));

/** Ajoute ce que les exemples citent sans le montrer : pages des routes citées, images, fichiers custom. Renvoie ce qui a été ajouté. */
async function complete(dir) {
  const added = [];
  if (!await exists(path.join(dir, 'site.yaml'))) await put(dir, 'site.yaml', BASE_SITE);
  const yamls = await walk(dir, p => p.endsWith('.yaml'));
  const texts = await Promise.all(yamls.map(f => fs.readFile(f, 'utf8')));
  const all = texts.join('\n');
  // routes déclarées (les routes à paramètre deviennent des motifs) et routes citées
  const declared = [...all.matchAll(/^route:\s*["']?([^\s"']+)/gm)].map(m => m[1]);
  const matches = r => declared.some(d => d === r || (d.includes('[') && new RegExp('^' + d.replace(/\[\w+\]/g, '[^/]+') + '$').test(r)));
  const cited = new Map([['/', new Set()]]);
  for (const m of all.matchAll(/\bto:\s*["']?(\/[^\s"',}#\]]*)(?:#([\w-]+))?/g)) { if (m[1].includes('[')) continue; if (!cited.has(m[1])) cited.set(m[1], new Set()); if (m[2]) cited.get(m[1]).add(m[2]); }
  for (const [route, anchors] of cited) {
    if (matches(route)) continue;
    const id = 'cite-' + routeSlug(route);
    const sections = [...anchors].map(a => `  - richtext: { id: ${a}, text: Section ajoutée par le banc pour une ancre citée. }`);
    sections.push('  - richtext: { text: Page ajoutée par le banc pour que les liens des exemples aboutissent. }');
    await put(dir, `pages/${id}.page.yaml`, `page: ${id}\nroute: ${route}\nseo: { title: Page citée par un exemple }\nsections:\n${sections.join('\n')}\n`);
    added.push('page ' + route);
  }
  for (const m of all.matchAll(/(?<![\w/.:-])([\w][\w\-/]*\.(jpe?g|png|webp|svg))\b/g)) {
    const f = path.join(dir, 'assets', m[1]); if (await exists(f)) continue;
    await fs.mkdir(path.dirname(f), { recursive: true });
    if (SAMPLES[m[2]]) await fs.copyFile(path.join(ROOT, SAMPLES[m[2]]), f); else await fs.writeFile(f, Buffer.from(PIXELS[m[2]], 'base64'));
    added.push('image ' + m[1]);
  }
  for (const m of all.matchAll(/\b(custom\/[\w\-/]+\.(php|css))\b/g)) {
    const f = path.join(dir, m[1]); if (await exists(f)) continue;
    await put(dir, m[1], m[2] === 'php' ? '<p>Bloc libre ajouté par le banc.</p>\n' : '.bloc-libre { margin: 0; }\n');
    added.push('fichier ' + m[1]);
  }
  return uniq(added);
}

/** check puis build --draft. Renvoie erreurs, avertissements, codes de sortie. */
function compile(dir, name) {
  const c = run('check', dir); const all = lines(c.out);
  const errors = all.filter(e => e.code && e.level !== 'warning'), warnings = all.filter(e => e.level === 'warning');
  if (c.code !== 0 && !errors.length) errors.push({ code: 'E_?', file: '', path: '', message: c.out.trim().slice(0, 400) });
  const b = errors.length ? { code: -1, out: 'non lancé : check a échoué' } : run('build', dir, '--draft', '--out', path.join(tmp, 'out-' + name));
  return { errors, warnings, build: b };
}
const norm = f => String(f || '').replace(/\\/g, '/');
const tell = e => `${e.code} ${norm(e.file)}${e.path ? ' › ' + e.path : ''} : ${e.message}${e.hint ? ' (' + e.hint + ')' : ''}`;

// ───────────────────────────── A. Blocs de la documentation ─────────────────────────────

/** Blocs ``` d'un texte : langue, première ligne, corps désindenté, marqueur <!-- sitec: … --> de la ligne non vide qui précède. */
function fences(text) {
  const L = text.split('\n'); const out = [];
  for (let i = 0; i < L.length; i++) {
    const m = /^(\s*)```(\w*)\s*$/.exec(L[i]); if (!m) continue;
    let j = i + 1; while (j < L.length && !/^\s*```\s*$/.test(L[j])) j++;
    const body = L.slice(i + 1, j).map(l => (l.startsWith(m[1]) ? l.slice(m[1].length) : l.trimStart())).join('\n') + '\n';
    let k = i - 1; while (k >= 0 && !L[k].trim()) k--;
    const mk = k >= 0 ? /^\s*<!--\s*sitec:\s*(.+?)\s*-->\s*$/.exec(L[k]) : null;
    out.push({ lang: m[2], line: i + 1, body, marker: mk ? mk[1] : null });
    i = j;
  }
  return out;
}
function parseMarker(m) {
  let f;
  if (/^aucun\b/.test(m)) return { kind: 'none', reason: m.replace(/^aucun\s*[—-]*\s*/, '') };
  if (/^fragment\s+sections$/.test(m)) return { kind: 'sections' };
  if ((f = /^fragment\s+([\w.-]+)\.(\w+)$/.exec(m))) return { kind: 'prop', component: f[1], prop: f[2] };
  if ((f = /^([\w./-]+\.yaml)\s+\(ajout\)$/.exec(m))) return { kind: 'append', file: f[1] };
  if (/^[\w./-]+\.(yaml|html|css|md)$/.test(m)) return { kind: 'file', file: m };
  return { kind: 'bad' };
}

const DOCS = ['docs/LANGAGE.md', 'CLAUDE.md', 'README.md', 'docs/CIBLES.md'];
const doc = {}; for (const d of DOCS) doc[d] = await read(d);
let compiledBlocks = 0; const skipped = [];

async function compileDoc(name, text, label = name) {
  const dir = path.join(tmp, 'doc-' + label.replace(/[^\w]+/g, '-'));
  const placed = []; // { file, line, marker }
  const unmarked = [], bad = [], twice = [];
  let n = 0;
  for (const b of fences(text)) {
    if (!['yaml', 'yml', 'html', 'markdown'].includes(b.lang)) continue;
    if (!b.marker) { unmarked.push(`${name}:${b.line}`); continue; }
    const mk = parseMarker(b.marker);
    if (mk.kind === 'bad') { bad.push(`${name}:${b.line} « ${b.marker} »`); continue; }
    if (mk.kind === 'none') { skipped.push(`${name}:${b.line} (${mk.reason || 'sans raison'})`); continue; }
    let file = mk.file;
    if (mk.kind === 'sections' || mk.kind === 'prop') {
      n++; file = `pages/doc-${n}.page.yaml`;
      const head = `page: doc-${n}\nroute: /doc-${n}\nseo: { title: Exemple ${n} }\nsections:\n`;
      await put(dir, file, head + (mk.kind === 'sections' ? indent(b.body, 2) : `  - ${mk.component}:\n      ${mk.prop}:\n${indent(b.body, 8)}`));
    } else if (mk.kind === 'append') {
      const f = path.join(dir, file); const before = await exists(f) ? await fs.readFile(f, 'utf8') : (file === 'site.yaml' ? BASE_SITE : '');
      await put(dir, file, before + (before.endsWith('\n') || !before ? '' : '\n') + b.body);
    } else {
      if (placed.some(p => p.file === file)) twice.push(`${name}:${b.line} ${file}`);
      await put(dir, file, b.body);
    }
    placed.push({ file, line: b.line, marker: b.marker });
  }
  ok(`${label} : chaque bloc yaml ou html dit où il va (marqueur <!-- sitec: … -->)`, !unmarked.length && !bad.length, [...unmarked.map(u => u + ' sans marqueur'), ...bad.map(u => u + ' marqueur illisible')]);
  ok(`${label} : pas deux blocs pour le même fichier`, !twice.length, twice);
  if (!placed.length) return;
  const added = await complete(dir);
  const { errors, warnings, build } = compile(dir, label.replace(/[^\w]+/g, '-'));
  const files = uniq(placed.map(p => p.file));
  for (const file of files) {
    const here = placed.filter(p => p.file === file); const errs = errors.filter(e => norm(e.file).endsWith(file) || (file.startsWith('components/') && norm(e.file).includes(path.posix.dirname(file))));
    ok(`${label}:${here.map(p => p.line).join('+')} → ${file} est accepté par check`, !errs.length, errs.map(tell));
    compiledBlocks += here.length;
  }
  const elsewhere = errors.filter(e => !files.some(file => norm(e.file).endsWith(file) || (file.startsWith('components/') && norm(e.file).includes(path.posix.dirname(file)))));
  ok(`${label} : aucune erreur hors des blocs (site complété par le banc : ${added.join(', ') || 'rien'})`, !elsewhere.length, elsewhere.map(tell));
  ok(`${label} : aucun avertissement sur les exemples`, !warnings.length, warnings.map(tell));
  ok(`${label} : le site formé par les exemples se compile (build)`, build.code === 0, build.out.trim().slice(0, 600));
}

// ───────────────────────────── B. Ce que la prose cite ─────────────────────────────

const helpText = run('help').out;
const COMMANDS = uniq([...helpText.matchAll(/^\s+sitec\s+([a-z]+)/gm)].map(m => m[1]));
const SUBCOMMANDS = uniq([...helpText.matchAll(/^\s+sitec\s+component\s+([a-z]+)/gm)].map(m => m[1]));
const FLAGS = uniq([...helpText.matchAll(/(?<![\w-])--([a-z][\w-]*)/g)].map(m => m[1]));
const srcFiles = await walk(path.join(ROOT, 'src'));
const srcText = (await Promise.all(srcFiles.map(f => fs.readFile(f, 'utf8')))).join('\n');
const compText = (await Promise.all((await walk(path.join(ROOT, 'components'))).map(f => fs.readFile(f, 'utf8')))).join('\n');
const toolText = (await Promise.all([...(await walk(path.join(ROOT, 'scripts'))), ...(await walk(path.join(ROOT, '.github')))].map(f => fs.readFile(f, 'utf8')))).join('\n');
const pkg = JSON.parse(await read('package.json'));
const catalogNames = (await fs.readdir(path.join(ROOT, 'components'), { withFileTypes: true })).filter(e => e.isDirectory()).map(e => e.name);
const FAMILIES = uniq(catalogNames.filter(n => n.includes('.')).map(n => n.split('.')[0]));
const THEME_KEYS = Object.keys(THEME_PRESETS.clair);
const SITE_PROPS = Object.keys(SITE_SCHEMA.properties.site.properties);
const CSS_VARS = new Set(THEME_KEYS.map(k => '--' + k.replace(/\./g, '-')));

async function cites(name, text, { commands = true } = {}) {
  const where = i => `l.${text.slice(0, i).split('\n').length}`;
  const bad = { commandes: [], options: [], fiches: [], chemins: [], liens: [], scripts: [], codes: [], variables: [], routes: [], attributs: [], jetons: [], reglages: [], composants: [] };
  if (commands) for (const m of text.matchAll(/(?:node bin\/sitec\.js|npx sitec|(?<![\w/.-])sitec)[ \t]+([a-z]+)(?:[ \t]+([a-z]+))?/g)) {
    if (!COMMANDS.includes(m[1])) bad.commandes.push(`${where(m.index)} sitec ${m[1]}`);
    else if (m[1] === 'component' && !SUBCOMMANDS.includes(m[2])) bad.commandes.push(`${where(m.index)} sitec component ${m[2] || ''}`);
  }
  const L = text.split('\n');
  for (let i = 0; i < L.length; i++) {
    if (/^\s*(npm|git|docker|php)\s/.test(L[i].replace(/^[\s`$]*/, ''))) continue;
    let known = '';
    for (const s of L[i].matchAll(/scripts\/([\w-]+\.(?:mjs|sh))/g)) if (await exists(path.join(ROOT, 'scripts', s[1]))) known += await fs.readFile(path.join(ROOT, 'scripts', s[1]), 'utf8');
    for (const m of L[i].matchAll(/(?<![\w(-])--([a-z][\w-]*)/g)) if (!(FLAGS.includes(m[1]) || known.includes('--' + m[1]))) bad.options.push(`l.${i + 1} --${m[1]}`);
  }
  for (const m of text.matchAll(/\bexplain[ \t]+([a-z][\w.-]*[\w])(?![\w.-])([ \t]+<dossier>)?/g)) if (!m[2] && !['site', 'langage', ...catalogNames].includes(m[1])) bad.fiches.push(`${where(m.index)} explain ${m[1]}`);
  for (const m of text.matchAll(/(?<![\w/.<>:@#-])((?:src|scripts|docs|bin|examples|studio|\.github)\/[\w./-]*)/g)) {
    const p = m[1].replace(/[.]+$/, ''); const next = text[m.index + m[1].length] || '';
    if ('<*…'.includes(next) && next || /\/dist(\/|$)/.test(p) || p === 'studio/sitec-browser.js') continue;
    if (!await exists(path.join(ROOT, p))) bad.chemins.push(`${where(m.index)} ${p}`);
  }
  if (name.endsWith('.md')) for (const m of text.matchAll(/\]\(([^)#\s]+)(?:#[^)]*)?\)/g)) if (!/^(https?:|mailto:|tel:|\/)/.test(m[1]) && !await exists(path.join(ROOT, path.dirname(name), m[1]))) bad.liens.push(`${where(m.index)} ${m[1]}`);
  for (const m of text.matchAll(/\bnpm run ([\w:-]+)/g)) if (!pkg.scripts?.[m[1]]) bad.scripts.push(`${where(m.index)} npm run ${m[1]}`);
  for (const m of text.matchAll(/\b([EW]_[A-Z][A-Z0-9_]*[A-Z0-9])\b/g)) if (!srcText.includes(m[1])) bad.codes.push(`${where(m.index)} ${m[1]}`);
  for (const m of text.matchAll(/(?<![\w.])([A-Z][A-Z0-9]+(?:_[A-Z0-9]+)+)\b/g)) if (!/^[EW]_/.test(m[1]) && !srcText.includes(m[1]) && !toolText.includes(m[1])) bad.variables.push(`${where(m.index)} ${m[1]}`);
  for (const m of text.matchAll(/(?<![\w.<>/*])\/_([a-z]+)/g)) if (!srcText.includes('/_' + m[1])) bad.routes.push(`${where(m.index)} /_${m[1]}`);
  for (const m of text.matchAll(/\bdata-sl-[a-z]+(?:-[a-z]+)*/g)) if (!srcText.includes(m[0]) && !compText.includes(m[0])) bad.attributs.push(`${where(m.index)} ${m[0]}`);
  for (const m of text.matchAll(/var\((--[a-z][\w-]*)\)/g)) if (!CSS_VARS.has(m[1]) && !srcText.includes(m[1])) bad.jetons.push(`${where(m.index)} ${m[1]}`);
  for (const m of text.matchAll(/`((?:color|font|radius|space)\.[\w-]+)`/g)) if (!THEME_KEYS.includes(m[1])) bad.jetons.push(`${where(m.index)} ${m[1]}`);
  for (const m of text.matchAll(/(?<![\w.{/-])site\.([a-z_]+)\b/g)) if (!['yaml', 'json', 'js', 'css', 'php'].includes(m[1]) && !SITE_PROPS.includes(m[1])) bad.reglages.push(`${where(m.index)} site.${m[1]}`);
  for (const m of text.matchAll(/`([a-z]+)\.([a-z]+)`/g)) if (FAMILIES.includes(m[1]) && !['yaml', 'json', 'js', 'css', 'php', 'html', 'md'].includes(m[2]) && !catalogNames.includes(m[1] + '.' + m[2])) bad.composants.push(`${where(m.index)} ${m[0]}`);
  const say = { commandes: 'commandes citées connues de sitec help', options: 'options citées connues (sitec help, ou le script de la même ligne)', fiches: 'fiches « explain » citées existantes', chemins: 'chemins du dépôt cités existants', liens: 'liens relatifs valides', scripts: 'scripts npm cités déclarés', codes: 'codes d\'erreur et d\'avertissement cités émis par le compilateur', variables: 'variables d\'environnement citées lues quelque part', routes: 'routes d\'exploitation citées servies par la cible', attributs: 'attributs de comportement cités connus', jetons: 'jetons de thème cités existants', reglages: 'réglages site.* cités acceptés par le schéma', composants: 'composants natifs cités présents au catalogue' };
  for (const k of Object.keys(bad)) ok(`${name} : ${say[k]}`, !bad[k].length, uniq(bad[k]));
}

// ───────────────────────────── C. Listes écrites à la main ─────────────────────────────

const ticks = s => [...String(s).matchAll(/`([^`]+)`/g)].map(m => m[1]);
const noParens = s => String(s).replace(/\([^)]*\)/g, '');
const words = s => noParens(s).split(/,| \| /).map(w => w.trim().replace(/[.;:]$/, '')).filter(Boolean);
const lineWith = (text, re) => text.split('\n').find(l => re.test(l)) ?? null;
const grab = (text, re) => { const m = re.exec(text); return m ? m[1] : null; };
const section = (text, heading) => { const L = text.split('\n'); const a = L.findIndex(l => l.trim() === heading); if (a < 0) return null; const level = /^#+/.exec(heading)[0].length; let b = a + 1; while (b < L.length && !(/^#+ /.test(L[b]) && /^#+/.exec(L[b])[0].length <= level)) b++; return L.slice(a, b).join('\n'); };
const rows = (text, headRe) => { const L = text.split('\n'); const a = L.findIndex(l => headRe.test(l)); if (a < 0) return null; const out = []; for (let i = a + 2; i < L.length && L[i].startsWith('|'); i++) out.push(L[i].split('|').slice(1, -1).map(c => c.trim())); return out; };
/** Compare une liste de la documentation à celle du compilateur. mode « equal » : mêmes éléments ; « subset » : rien d'inconnu. */
function claim(name, got, expected, mode = 'equal') {
  if (got == null) return ok(name, false, 'repère introuvable dans la documentation (phrase déplacée ou reformulée : mettre à jour le banc)');
  const g = uniq(got.map(String)), e = uniq([...expected].map(String));
  const missing = mode === 'equal' ? e.filter(x => !g.includes(x)) : [], extra = g.filter(x => !e.includes(x));
  ok(name, g.length > 0 && !missing.length && !extra.length, [missing.length ? 'absents de la documentation : ' + missing.join(', ') : '', extra.length ? 'inconnus du compilateur : ' + extra.join(', ') : '', g.length ? '' : 'liste vide'].filter(Boolean));
}
const sentence = l => (l == null ? null : l.split(/\. (?=[A-ZÀ-Ü`«])/)[0]);
const fnName = s => s.replace(/\(.*$/, '');
const modelName = id => { const p = id.split('-'); return 'Claude ' + p[1][0].toUpperCase() + p[1].slice(1) + ' ' + p.slice(2).join('.'); };

async function claims() {
  const L = doc['docs/LANGAGE.md'], C = doc['CLAUDE.md'], R = doc['README.md'];
  const langageNatives = [], targetNatives = [];
  for (const n of catalogNames) { const m = await read(`components/${n}/manifest.yaml`); if (/^forme:/m.test(m)) langageNatives.push(n); if (await exists(path.join(ROOT, 'components', n, 'template.php'))) targetNatives.push(n); }

  // docs/LANGAGE.md
  claim('LANGAGE.md : événements = ceux du compilateur', ticks(sentence(lineWith(L, /^Événements : /))), EVENTS);
  { const t = rows(L, /^\| Événement \| Précisions permises \|/); const got = t && t.flatMap(([ev, w]) => ticks(ev).map(e => e + ' → ' + (ticks(w).join(', ') || 'aucune')));
    claim('LANGAGE.md : table des objectifs (événement → précisions) = GOAL_EVENTS', got, Object.entries(GOAL_EVENTS).map(([e, w]) => e + ' → ' + (w.join(', ') || 'aucune'))); }
  claim('LANGAGE.md : groupe témoin nommé comme dans le compilateur', [grab(L, /groupe témoin tiré au sort, nommé `(\w+)`/)].filter(Boolean), [CONTROL]);
  claim('LANGAGE.md : minimum par défaut d\'une expérience', [grab(L, /avant tout verdict \((\d+) par défaut/)].filter(Boolean), [DEFAULT_MINIMUM]);
  claim('LANGAGE.md : filtres = ceux de l\'évaluateur', ticks(sentence(lineWith(L, /^Filtres : /))).map(fnName), Object.keys(FILTERS));
  claim('LANGAGE.md : types de champ de collection', ticks(noParens(sentence(lineWith(L, /^Types de champ : /)))), COLLECTION_FIELD_TYPES);
  claim('LANGAGE.md : noms de collection réservés', ticks(sentence(lineWith(L, /^Les noms .* sont réservés/))), RESERVED_COLLECTIONS);
  claim('LANGAGE.md : types de paramètre d\'un composé', ticks(sentence(lineWith(L, /^Types de paramètre : /))), PARAM_TYPES);
  { const s = section(L, '### Données'); const t = s && rows(s, /^\| Écrit \| Signifie \|/); claim('LANGAGE.md : types du bloc données = TYPE_WORDS', t && [...t.slice(0, 3).flatMap(r => ticks(r[0])), ...ticks(t[3]?.[1] || '').filter(w => !/[:(]/.test(w))], TYPE_WORDS); }
  { const s = section(L, '### Forme'); const absent = s ? Object.keys(PRIMITIVES).filter(k => !new RegExp('(?<![\\wéèêàç-])' + k + '(?![\\wéèêàç-])').test(s)) : ['section « Forme » introuvable']; ok(`LANGAGE.md : les ${Object.keys(PRIMITIVES).length} primitives de la forme sont toutes décrites`, !absent.length, 'non décrites : ' + absent.join(', '));
    const t = s && rows(s, /^\| Primitive \| Rendu \|/); const first = t && t.flatMap(r => ticks(r[0])).map(x => x.split(/[:,]| de x/)[0].trim().replace(/ x$/, '')).filter(Boolean);
    claim('LANGAGE.md : la table de la forme ne cite que des primitives connues', first, Object.keys(PRIMITIVES), 'subset'); }
  claim('LANGAGE.md : intentions d\'apparence citées connues', ticks((grab(L, /en intentions fixes traduites vers les jetons du thème : ([^…]*)…/) || '')), INTENT_NAMES, 'subset');
  { const s = section(L, '### Fonctionnement'); const t = s && rows(s, /^\| Écrit \| Signifie \|/);
    claim('LANGAGE.md : types de champ d\'un formulaire (fonctionnement)', t && ticks((t.find(r => /types de champ/.test(r[1])) || [''])[0]), FIELD_TYPE_WORDS);
    claim('LANGAGE.md : réglages du formulaire (fonctionnement)', t && t.map(r => ticks(r[0])[0] || '').filter(x => x.includes(':')).map(x => x.split(':')[0]), FORM_SETTINGS);
    claim('LANGAGE.md : registres réservés', t && ticks((t.find(r => /^`enregistre dans/.test(r[0])) || ['', ''])[1]), RESERVED_STORES);
    claim('LANGAGE.md : champs connus d\'un formulaire', ticks((grab(s || '', /^Les noms (.*?) ont leur type/m) || '')), Object.keys(KNOWN_FIELDS)); }
  { const s = section(L, '### Gabarit') || '';
    claim('LANGAGE.md : fonctions au HTML sûr', ticks(grab(s, /HTML sûr seulement pour (.*?) en tête d'expression/) || ''), SAFE_FUNCTIONS);
    claim('LANGAGE.md : variables du gabarit', ticks(noParens(grab(s, /^Variables : (.*?)\. Fonctions :/m) || '')), TEMPLATE_VOCABULARY.variables);
    claim('LANGAGE.md : fonctions du gabarit', ticks(grab(s, /\. Fonctions : (.*)$/m) || '').map(fnName), FUNCTION_NAMES); }
  claim('LANGAGE.md : jetons de couleur = ceux du thème', ticks(lineWith(L, /^Jetons de couleur : /)), THEME_KEYS.filter(k => k.startsWith('color.')).map(k => k.slice(6)));
  { const t = rows(L, /^\| Comportement \| Attributs \|/); claim('LANGAGE.md : comportements déclarés', t && t.map(r => ticks(r[0])[0]), BEHAVIOR_NAMES); }
  // Règles de registre : chaque règle documentée est un réglage du formulaire, et inversement pour les cinq réglages de règle.
  { const t = rows(L, /^\| Règle \| Ce que le serveur fait \|/);
    const RULE_SETTINGS = ['places', 'si complet', 'liste d\'attente', 'une fois par', 'si déjà inscrit'];
    claim('LANGAGE.md : règles de registre documentées = réglages de règle du formulaire', t && uniq(t.map(r => (ticks(r[0])[0] || '').split(':')[0])), RULE_SETTINGS.filter(x => x !== 'si déjà inscrit'));
    claim('fonctionnement.js : les réglages de règle existent', RULE_SETTINGS.filter(x => FORM_SETTINGS.includes(x)), RULE_SETTINGS); }
  // Format document : la table des tournures est celle du lecteur, et chaque phrase d'exemple est lue par la tournure qu'elle illustre.
  { const t = rows(L, /^\| Ce que dit la phrase \| Exemple \| Ce qui est lu \|/);
    const shown = TOURNURES.filter(x => x.id !== 'message_seul');
    claim('LANGAGE.md : tournures du format document = TOURNURES', t && t.slice(1).map(r => r[0]), shown.map(x => x.label));
    const BASE_DOC = '# Atelier\n\nInscription à un atelier.\n\n';
    const fieldsRow = t && t[0], fieldsLine = fieldsRow ? fieldsRow[1] : "Le visiteur indique son nom.";
    const wrong = [];
    for (const r of (t || []).slice(1)) { const tn = shown.find(x => x.label === r[0]); if (!tn) continue; const d = readDocument(BASE_DOC + fieldsLine + '\n' + r[1] + '\n', { name: 'atelier' }); const tr = d.trace[d.trace.length - 1]; if (!tr || tr.error || tr.tournure !== tn.id) wrong.push(`${r[0]} : « ${r[1]} » → ${tr ? tr.error || tr.tournure : 'non lue'}`); else if (tr.said !== r[2].replace(/`/g, '')) wrong.push(`${r[0]} : lu « ${tr.said} », la table dit « ${r[2]} »`); }
    ok('LANGAGE.md : chaque phrase d\'exemple de la table est lue par sa tournure, et la table dit ce qui est lu', !!t && !wrong.length, wrong);
    const d0 = t && readDocument(BASE_DOC + fieldsLine + '\n', { name: 'atelier' }); const tr0 = d0 && d0.trace[0];
    ok('LANGAGE.md : la phrase des champs de la table est lue comme la table le dit', !!tr0 && !tr0.error && tr0.tournure === 'champs' && tr0.said === fieldsRow[2].replace(/`/g, ''), tr0 ? tr0.error || tr0.said : 'table introuvable'); }
  // Lectures à la visite : sources et paramètres de la table = ceux du compilateur ; sources citées par CLAUDE.md.
  { const t = rows(L, /^\| Source \| Paramètres \| Ce qu'elle rend \|/);
    claim('LANGAGE.md : sources lues à la visite = SOURCES', t && t.map(r => ticks(r[0])[0]), PUBLIC_SOURCE_NAMES);
    claim('LANGAGE.md : paramètres des sources', t && t.map(r => `${ticks(r[0])[0]} : ${ticks(r[1]).join(', ') || 'aucun'}`), PUBLIC_SOURCE_NAMES.map(n => `${n} : ${Object.keys(SOURCES[n].params).join(', ') || 'aucun'}`));
    const c = grab(C, /Sources : (.*?)\. Valeur d'un paramètre/) || '';
    claim('CLAUDE.md : sources et paramètres cités', c.split(/,\s*(?![^()]*\))/).map(x => x.trim()).filter(Boolean).map(x => { const m = /^(.*?)\s*\((.*)\)$/.exec(x); return m ? `${m[1]} : ${m[2]}` : `${x} : aucun`; }), PUBLIC_SOURCE_NAMES.map(n => `${n} : ${Object.keys(SOURCES[n].params).join(', ') || 'aucun'}`)); }
  // Vocabulaire : clés d'un mot, mots natifs (components/vocabulaire.yaml), et natifs qui les emploient.
  { const nativeWords = [...compileVocabulaire(await read('components/vocabulaire.yaml'), { scope: 'natif', lint: false }).own.keys()];
    const t = rows(L, /^\| Dans la définition d'un mot \| Signifie \|/); claim('LANGAGE.md : clés de la définition d\'un mot = WORD_KEYS', t && t.map(r => ticks(r[0])[0]), WORD_KEYS);
    const l = lineWith(L, /Mots natifs : /) || ''; claim('LANGAGE.md : mots natifs = components/vocabulaire.yaml', ticks(grab(l, /Mots natifs : ([^;]*);/) || ''), nativeWords);
    const users = []; for (const n of catalogNames) { const m = await read(`components/${n}/manifest.yaml`); if (nativeWords.some(w => new RegExp('^\\s*- ' + w + '(:|,|$)', 'm').test(m))) users.push(n); }
    claim('LANGAGE.md : natifs écrits avec les mots natifs', ticks(grab(l, /; les natifs (.*?) sont écrits avec eux/) || ''), users);
    claim('CLAUDE.md : mots natifs cités', words(grab(C, /Mots natifs : ([^.]*)\./) || ''), nativeWords); }
  { const l = lineWith(L, /^Composants natifs écrits sans code de la cible/); const [a, b] = l ? l.split('Composants natifs écrits pour la cible') : [null, null];
    claim('LANGAGE.md § 8 : natifs écrits sans code de la cible', a && ticks(a), catalogNames.filter(n => !targetNatives.includes(n)));
    claim('LANGAGE.md § 8 : natifs écrits pour la cible (template.php)', b && ticks(b.split('. Leur contrat')[0]), targetNatives); }
  ok('LANGAGE.md : modèle par défaut cité = celui du compilateur', MODEL_COMPONENTS === MODEL_KEYWORDS && L.includes(modelName(MODEL_COMPONENTS) + ' par défaut'), `compilateur : ${MODEL_COMPONENTS} / ${MODEL_KEYWORDS}`);
  { const last = Math.max(...LANGUAGE_VERSIONS); ok('LANGAGE.md : version du langage du titre et des exemples = dernière version connue', new RegExp(`^# Devanture, langage version ${last}$`, 'm').test(L) && new RegExp(`^- \\*\\*${last}\\*\\*`, 'm').test(L) && uniq([...(L + C).matchAll(/\blanguage: (\d+)/g)].map(m => +m[1])).every(v => LANGUAGE_VERSIONS.includes(v)), 'versions connues : ' + LANGUAGE_VERSIONS.join(', ')); }

  // CLAUDE.md
  claim('CLAUDE.md : thèmes proposés', words(grab(C, /theme: \{ preset: \w+ \}\s+# ([a-z |]+?) ;/) || ''), Object.keys(THEME_PRESETS));
  claim('CLAUDE.md : clés acceptées sous site', ticks(grab(C, /`site\.yaml` accepte : (.*?)\. Rien d'autre/) || '').map(t => t.split(/[ *]/)[0]), SITE_PROPS);
  claim('CLAUDE.md : largeurs d\'image par défaut', words(grab(C, /\(([\d, ]+) px par défaut\)/) || ''), IMAGE_DEFAULTS.widths);
  claim('CLAUDE.md : qualité d\'image par défaut', [grab(C, /widths: \[\.\.\.\], quality: (\d+)/)].filter(Boolean), [IMAGE_DEFAULTS.quality]);
  claim('CLAUDE.md : champs connus du formulaire de contact', ticks(grab(C, /noms connus \(([^)]*)\)/) || ''), Object.keys(KNOWN_FIELDS));
  claim('CLAUDE.md : types de champ libre', words(grab(C, /\(types : ([^;]+);/) || '').map(w => w.split(' ')[0]), FORM_FIELD_TYPES);
  claim('CLAUDE.md : clés d\'un produit', words(grab(C, /`products: \[ \{ ([^}]+) \} \]`/) || ''), PRODUCT_KEYS);
  claim('CLAUDE.md : types de champ de collection', words(grab(C, /Types : (string[^.]*)\./) || ''), COLLECTION_FIELD_TYPES);
  claim('CLAUDE.md : noms de collection réservés', words(grab(C, /Noms réservés : ([^.]*)\./) || ''), RESERVED_COLLECTIONS);
  claim('CLAUDE.md : types de paramètre d\'un composé', words(grab(C, /Types de paramètre : ([^.]*)\./) || ''), PARAM_TYPES);
  claim('CLAUDE.md : types du bloc données cités', words(grab(C, /types (texte, nombre entier[^;]*) ;/) || ''), TYPE_WORDS, 'subset');
  claim('CLAUDE.md : primitives de la forme citées', words(grab(C, /\(primitives : ([^;]*) ;/) || '').flatMap(w => w.split(' + ')).map(w => w.replace(/ de x.*$/, '')).map(w => (w in PRIMITIVES ? w : w.split(' ')[0])), Object.keys(PRIMITIVES), 'subset');
  claim('CLAUDE.md : types de champ d\'un formulaire (fonctionnement)', words(grab(C, /types (texte, texte long[^;]*) ;/) || ''), FIELD_TYPE_WORDS);
  claim('CLAUDE.md : réglages du formulaire (fonctionnement)', [...(grab(C, /`fonctionnement` \((.*?)la forme place le formulaire/) || '').matchAll(/« ([^:»]+):/g)].map(m => m[1].trim()).filter(x => !/^(nom|formulaire)$/.test(x)), FORM_SETTINGS, 'subset');
  claim('CLAUDE.md : champs connus (fonctionnement)', words(grab(C, /; ([a-z, ]+) sont connus/) || ''), Object.keys(KNOWN_FIELDS));
  claim('CLAUDE.md : natifs écrits dans le langage (bloc forme)', ticks(grab(C, /Les composants natifs (.*?) sont écrits ainsi/) || ''), langageNatives);
  claim('CLAUDE.md : variables du gabarit', words(grab(C, /Variables : (p, [^.]*)\./) || ''), TEMPLATE_VOCABULARY.variables);
  claim('CLAUDE.md : fonctions du gabarit citées', ticks(grab(C, /fonctions (`link\(.*?)\. Variables/) || '').map(fnName), FUNCTION_NAMES, 'subset');
  claim('CLAUDE.md : comportements déclarés', words(grab(C, /`behaviors: \[([^\]]+)\]`/) || ''), BEHAVIOR_NAMES);
  claim('CLAUDE.md : nombre de pictogrammes', [grab(C, /: (\d+) pictogrammes SVG/)].filter(Boolean), [ICON_NAMES.length]);
  claim('CLAUDE.md : pictogrammes cités', words(grab(C, /\(dont ([a-z, ]+)\)/) || ''), ICON_NAMES, 'subset');
  claim('CLAUDE.md : groupe témoin', [grab(C, /groupe témoin tiré au sort \(`(\w+)`/)].filter(Boolean), [CONTROL]);
  claim('CLAUDE.md : minimum par défaut d\'une expérience', [grab(C, /`minimum: (\d+)` visiteurs par groupe/)].filter(Boolean), [DEFAULT_MINIMUM]);
  { const used = uniq([...C.matchAll(/\{ (?:goal|event): (\w+)/g), ...C.matchAll(/event: (\w+), where/g)].map(m => m[1]).filter(e => /_/.test(e))); claim('CLAUDE.md : événements d\'objectif cités', used, Object.keys(GOAL_EVENTS), 'subset'); }

  // version épinglée, partout la même
  const pin = `github:dtdagames/devanture#v${pkg.version}`;
  const lock = JSON.parse(await read('package-lock.json'));
  ok(`version ${pkg.version} : package-lock.json, étiquette épinglée par sitec init, CLAUDE.md et CHANGELOG.md d'accord`, lock.version === pkg.version && lock.packages[''].version === pkg.version && (await read('src/init.js')).includes(`'${pin}'`) && C.includes(pin) && (await read('CHANGELOG.md')).includes(pin) && new RegExp(`^## v${pkg.version.replace(/\./g, '\\.')} `, 'm').test(await read('CHANGELOG.md')), pin);

  // mesure du format langage : chiffres de la prose = sortie du script (qui lit l'étiquette v0.6.0 du dépôt)
  { const m = node([path.join(ROOT, 'scripts', 'measure-format.mjs')]); const j = lines(m.out).find(x => x.tokens_avant);
    const fr = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    const said = /de ([\d  ]+) à ([\d  ]+) tokens \(−(\d+) %\)/.exec(L); const readme = grab(R, /(\d+) % de tokens en moins à écrire/);
    ok('économie de tokens : README.md et LANGAGE.md donnent le même pourcentage', said && readme && said[3] === readme, `LANGAGE.md ${said?.[3]} %, README.md ${readme} %`);
    if (j) ok('économie de tokens : chiffres de LANGAGE.md = sortie de scripts/measure-format.mjs', said && said[1].replace(/[  ]/g, ' ') === fr(j.tokens_avant) && said[2].replace(/[  ]/g, ' ') === fr(j.tokens_apres) && +said[3] === j.reduction_pct, `mesuré : ${j.tokens_avant} → ${j.tokens_apres} (${j.reduction_pct} %)`);
    else skipped.push('mesure de tokens non rejouée (scripts/measure-format.mjs a besoin de l\'étiquette v0.6.0 dans le dépôt cloné)'); }

  // README : table des commandes et bloc « Vérifier »
  { const table = R.split('\n').filter(l => l.startsWith('| `')).join('\n');
    const absent = [...COMMANDS.filter(c => c !== 'component').filter(c => !new RegExp('`[^`|]*\\b' + c + '\\b').test(table)), ...SUBCOMMANDS.filter(s => !new RegExp('`component ' + s + '\\b').test(table))];
    ok('README.md : la table des commandes couvre toutes celles de sitec help', !absent.length, 'absentes : ' + absent.join(', '));
    const ci = await read('.github/workflows/ci.yml'); const inCi = uniq([...ci.matchAll(/scripts\/(verify-[\w-]+\.mjs)/g)].map(m => m[1]));
    const block = section(R, '## Vérifier') || ''; const absentBench = inCi.filter(b => !block.includes('scripts/' + b));
    ok('README.md : le bloc « Vérifier » cite chaque banc lancé par l\'intégration continue', inCi.length > 0 && !absentBench.length, 'absents : ' + absentBench.join(', '));
    const all = (await fs.readdir(path.join(ROOT, 'scripts'))).filter(f => /^verify-.*\.mjs$/.test(f)); const notRun = all.filter(b => !inCi.includes(b) && b !== 'verify-maintenance.mjs');
    ok('intégration continue : chaque banc scripts/verify-*.mjs est lancé (sauf le banc de mesure verify-maintenance)', !notRun.length, 'non lancés : ' + notRun.join(', ')); }
}

// ───────────────────────────── D. Exemples des fiches explain ─────────────────────────────

const dedent = block => { const L = block.replace(/\s+$/, '').split('\n'); const n = Math.min(...L.filter(l => l.trim()).map(l => l.length - l.trimStart().length)); return L.map(l => l.slice(n)).join('\n') + '\n'; };

async function explainSite() {
  const out = run('explain', 'site').out.replace(/\r\n/g, '\n');
  await cites('sitec explain site', out);
  const dir = path.join(tmp, 'explain-site'); const found = [];
  for (const m of out.matchAll(/^Exemple \(([\w./-]+)\) :\n((?:(?: {2}.*)?\n)*?)(?=\n|\S|$)/gm)) { const body = m[2].split('\n'); const end = body.findIndex(l => !l.trim()); await put(dir, m[1], dedent(body.slice(0, end < 0 ? body.length : end).join('\n'))); found.push(m[1]); }
  ok('explain site : exemples de site.yaml, segments.yaml et d\'une page présents', ['site.yaml', 'segments.yaml'].every(f => found.includes(f)) && found.some(f => f.startsWith('pages/')), found);
  const added = await complete(dir); const { errors, warnings, build } = compile(dir, 'explain-site');
  ok(`explain site : ses exemples forment un site accepté par check (complété par le banc : ${added.join(', ') || 'rien'})`, !errors.length, errors.map(tell));
  ok('explain site : aucun avertissement sur ses exemples', !warnings.length, warnings.map(tell));
  ok('explain site : ses exemples se compilent (build)', build.code === 0, build.out.trim().slice(0, 600));
  // listes de la fiche écrites à la main
  claim('explain site : thèmes', words(grab(out, /\.preset: ([a-z |]+?) —/) || ''), Object.keys(THEME_PRESETS));
  claim('explain site : props de site décrites', [...(out.split('Props de site :')[1] || '').split('Exemple (site.yaml)')[0].matchAll(/^ {2}([a-z_]+)(?: \(obligatoire\))?: /gm)].map(m => m[1]), SITE_PROPS);
}

async function explainLangage() {
  const out = run('explain', 'langage').out.replace(/\r\n/g, '\n');
  ok('explain langage : la fiche s\'affiche', out.length > 500, out.slice(0, 200));
  await cites('sitec explain langage', out);
}

async function explainComponents() {
  const dir = path.join(tmp, 'explain-composants');
  await put(dir, 'site.yaml', BASE_SITE + `  shop: { currency: €, payment: manual }\ncollections:\n  realisations:\n    label: Réalisations\n    fields:\n      title: { type: string, required: true }\n      category: string\n      text: text\n      image: asset\n      date: date\n`);
  await put(dir, 'data/realisations.yaml', 'realisations:\n  - { id: salle-de-bain-1, title: Salle de bain, category: salle-de-bain, text: Exemple., date: "2026-09" }\n  - { id: cuisine-1, title: Cuisine, category: cuisine, text: Exemple., date: "2026-08" }\n');
  await put(dir, 'data/products.yaml', 'products:\n  - { id: savon-lavande, name: Savon lavande, price: 6.5, category: savons, description: Exemple., stock: 10, featured: true }\n  - { id: savon-miel, name: Savon miel, price: 7, category: savons, description: Exemple., stock: 4 }\n');
  const where = {}; const dynamic = { 'product.hero': 'produit', 'products.related': 'produit', 'order.confirmation': 'commande' };
  const dyn = { produit: [], commande: [] }; const missing = [];
  for (const name of catalogNames) {
    const out = run('explain', name).out.replace(/\r\n/g, '\n'); const i = out.indexOf('\nExemple :\n');
    if (i < 0) { missing.push(name); continue; }
    const body = dedent(out.slice(i + '\nExemple :\n'.length));
    if (dynamic[name]) { dyn[dynamic[name]].push(body); where[name] = `pages/${dynamic[name]}.page.yaml`; continue; }
    const id = 'fiche-' + name.replace(/\./g, '-'); where[name] = `pages/${id}.page.yaml`;
    await put(dir, where[name], `page: ${id}\nroute: /${id}\nseo: { title: Exemple de ${name} }\nsections:\n${indent(body, 2)}`);
  }
  ok('explain <composant> : chaque fiche du catalogue donne un exemple', !missing.length, 'sans exemple : ' + missing.join(', '));
  await put(dir, 'pages/produit.page.yaml', `page: produit\nroute: /produit/[id]\nsource: products\nseo: { title: "{{ product.name }}" }\nsections:\n${indent(dyn.produit.join(''), 2)}`);
  await put(dir, 'pages/commande.page.yaml', `page: commande\nroute: /commande/[id]\nsource: orders\nseo: { title: Votre commande }\nsections:\n${indent(dyn.commande.join(''), 2)}`);
  const added = await complete(dir); const { errors, warnings, build } = compile(dir, 'explain-composants');
  for (const name of catalogNames.filter(n => where[n])) {
    const errs = errors.filter(e => norm(e.file).endsWith(where[name]) && (!dynamic[name] || String(e.path).includes(name) || !/sections\[/.test(String(e.path))));
    ok(`explain ${name} : l'exemple de la fiche est accepté par check`, !errs.length, errs.map(tell));
  }
  const files = Object.values(where); const elsewhere = errors.filter(e => !files.some(f => norm(e.file).endsWith(f)));
  ok(`explain <composant> : aucune erreur hors des exemples (site complété par le banc : ${added.length} pages, images ou fichiers)`, !elsewhere.length, elsewhere.map(tell));
  const unexpected = warnings.filter(w => w.code !== 'W_CUSTOM');
  ok('explain <composant> : aucun avertissement sur les exemples (hors W_CUSTOM, attendu pour le bloc libre)', !unexpected.length, unexpected.map(tell));
  ok('explain <composant> : les exemples des fiches se compilent ensemble (build)', build.code === 0, build.out.trim().slice(0, 600));
}

// ───────────────────────────── E. CLAUDE.md d'un dépôt créé par sitec init ─────────────────────────────

async function initCopy() {
  const dir = path.join(tmp, 'init'); const r = run('init', dir, '--name', 'Site du banc', '--local', '--no-git');
  const f = path.join(dir, 'CLAUDE.md'); if (r.code !== 0 || !await exists(f)) return ok('sitec init : CLAUDE.md du dépôt de site créé', false, r.out.slice(0, 400));
  const text = (await fs.readFile(f, 'utf8')).replace(/\r\n/g, '\n');
  ok('CLAUDE.md du dépôt de site : aucune commande du dépôt du compilateur (node bin/sitec.js)', !text.includes('node bin/sitec.js') && /npx sitec check/.test(text));
  const bad = [...text.matchAll(/npx sitec[ \t]+([a-z]+)/g)].map(m => m[1]).filter(c => !COMMANDS.includes(c));
  ok('CLAUDE.md du dépôt de site : commandes npx sitec connues', !bad.length, uniq(bad));
  const a = fences(doc['CLAUDE.md']).filter(b => b.lang === 'yaml').map(b => b.body), b = fences(text).filter(x => x.lang === 'yaml').map(x => x.body);
  ok('CLAUDE.md du dépôt de site : mêmes exemples yaml que le CLAUDE.md vérifié', a.length > 0 && a.length === b.length && a.every((x, i) => x === b[i]), `${a.length} blocs ici, ${b.length} dans le dépôt créé`);
  await compileDoc('CLAUDE.md', text, 'CLAUDE.md (sitec init)');
}

// ───────────────────────────── Exécution ─────────────────────────────

try {
  ok('sitec help : commandes et options lues', COMMANDS.length >= 10 && FLAGS.length >= 10, `${COMMANDS.length} commandes, ${FLAGS.length} options`);
  for (const d of DOCS) { await compileDoc(d, doc[d]); await cites(d, doc[d]); }
  await claims();
  await explainSite();
  await explainLangage();
  await explainComponents();
  await initCopy();
  ok('des exemples ont bien été compilés', compiledBlocks >= 15, `${compiledBlocks} blocs`);
} catch (e) {
  ok('exécution du banc', false, e.stack || e.message);
} finally {
  await fs.rm(tmp, { recursive: true, force: true });
}

const passed = checks.filter(c => c.pass).length;
for (const c of checks) if (!c.pass || VERBOSE) console.log(`${c.pass ? 'OK  ' : 'FAIL'} ${c.name}${c.detail && !c.pass ? ' — ' + c.detail : ''}`);
for (const s of skipped) console.log('NOTE non compilé : ' + s);
console.log(JSON.stringify({ banc: 'documentation', passed, total: checks.length, blocs_compiles: compiledBlocks, non_compiles: skipped.length }));
process.exit(passed === checks.length ? 0 : 1);
