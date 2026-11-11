// Empreinte de tout ce que le catalogue compile : pour chaque composant natif, puis chaque composant des sites d'exemple et de
// leurs paquets, son manifeste lu, ses données, ses effets, son gabarit, ses feuilles et le PHP compilé. Sert à prouver qu'un
// changement d'écriture des composants (du manifeste YAML au plan composant.md) ne change rien à ce qui est compilé.
// Usage : node scripts/empreinte-catalogue.mjs <fichier.json> [--exemples <dossier>]   écrit l'empreinte (exemples pris dans ce dossier)
//         node scripts/empreinte-catalogue.mjs --compare <a.json> <b.json>  dit ce qui diffère
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';
import { loadCatalog } from '../src/catalog.js';
import { loadProject } from '../src/load.js';
import { validateProject } from '../src/validate.js';
import { compileTemplate } from '../src/lang/template.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// Ce qui ne compte pas : la ligne où commence la forme dans la source, l'ordre des blocs du manifeste (données et forme sont
// compilées dans un ordre fixe) et l'ordre des données dans l'exemple. L'ordre à l'intérieur d'un bloc compte, lui.
const sortDeep = v => (Array.isArray(v) ? v.map(sortDeep) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map(k => [k, sortDeep(v[k])])) : v);
/** Schéma à mots-clés triés : « properties » garde l'ordre des données, « required » et « enum » le leur. */
const sortSchema = s => { if (!s || typeof s !== 'object' || Array.isArray(s)) return s; const out = {}; for (const k of Object.keys(s).sort()) out[k] = k === 'properties' && s[k] && typeof s[k] === 'object' ? Object.fromEntries(Object.entries(s[k]).map(([n, v]) => [n, sortSchema(v)])) : k === 'items' ? sortSchema(s[k]) : s[k]; return out; };
const settle = c => { if (!c || typeof c !== 'object' || !c.manifest) return c; c = { ...c, manifest: { ...c.manifest, ...(c.manifest.props ? { props: sortSchema(c.manifest.props) } : {}) } }; const produced = c.produced ? { ...c.produced } : c.produced; if (produced) delete produced.formeLine; return { ...c, manifest: Object.fromEntries(Object.keys(c.manifest).sort().map(k => [k, c.manifest[k]])), example: sortDeep(c.example), produced }; };
const raw = process.argv.slice(2), exAt = raw.indexOf('--exemples');
const EXAMPLES = exAt >= 0 ? path.resolve(raw[exAt + 1]) : path.join(ROOT, 'examples');
const args = raw.filter((a, i) => exAt < 0 || (i !== exAt && i !== exAt + 1));
if (args[0] === '--compare') {
  const a = JSON.parse(fs.readFileSync(args[1], 'utf8')), b = JSON.parse(fs.readFileSync(args[2], 'utf8'));
  const flat = o => { const out = {}; for (const [k, v] of Object.entries(o.natifs)) out['natif ' + k] = settle(v); for (const [s, x] of Object.entries(o.sites)) { out[`site ${s} (erreurs)`] = x.erreurs; for (const [k, v] of Object.entries(x.composants)) out[`${s} › ${k}`] = settle(v); } return out; };
  const fa = flat(a), fb = flat(b); let diff = 0;
  for (const k of new Set([...Object.keys(fa), ...Object.keys(fb)])) {
    if (JSON.stringify(fa[k]) === JSON.stringify(fb[k])) continue;
    diff++;
    const parts = fa[k] && fb[k] && typeof fa[k] === 'object' ? Object.keys({ ...fa[k], ...fb[k] }).filter(p => JSON.stringify(fa[k][p]) !== JSON.stringify(fb[k][p])) : ['présence'];
    console.log(`${k} : diffère (${parts.join(', ')})`);
    for (const p of parts.slice(0, 2)) { const x = JSON.stringify(fa[k]?.[p] ?? null), y = JSON.stringify(fb[k]?.[p] ?? null); let i = 0; while (i < x.length && x[i] === y[i]) i++; console.log(`    ${p} : …${x.slice(Math.max(0, i - 60), i + 90)}…\n    ${' '.repeat(p.length)}   …${y.slice(Math.max(0, i - 60), i + 90)}…`); }
  }
  console.log(JSON.stringify({ composants: Object.keys(fa).length, identiques: Object.keys(fa).length - diff, differents: diff }));
  process.exit(diff ? 1 : 0);
}
// Dans un exemple, un nombre vaut son écriture (1999 et « 1999 ») et une fin de texte ne compte pas.
const loose = v => (typeof v === 'number' ? String(v) : typeof v === 'string' ? v.replace(/\s+$/, '') : Array.isArray(v) ? v.map(loose) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, loose(x)])) : v);
const view = c => {
  const m = { ...c.manifest }; let example = null; try { example = YAML.parse(String(m.example ?? '')); } catch { example = 'illisible'; }
  delete m.example;
  const compiled = c.files['template.html'] !== undefined ? compileTemplate(c.files['template.html'], { name: c.name, props: m.props, effects: m.effects || null, sources: m.sources || null }) : null;
  return settle({ manifest: m, example: loose(example), files: c.files, produced: c.produced, wordsCss: c.wordsCss, php: compiled?.php ?? null, erreurs_du_gabarit: compiled?.errors ?? null });
};
const out = { natifs: {}, sites: {} };
const catalog = await loadCatalog();
for (const c of catalog.list()) out.natifs[c.name] = view(c);
for (const site of ['garnier-associes', 'plomberie-martin', 'le-fournil', 'savonnerie']) {
  const project = await loadProject(path.join(EXAMPLES, site));
  const errors = validateProject(project, catalog);
  out.sites[site] = { erreurs: errors.length, composants: {} };
  for (const c of project.catalog.list()) if (!catalog.has(c.name)) out.sites[site].composants[c.name] = view(c);
}
if (!args[0]) { console.error('usage : empreinte-catalogue.mjs <fichier.json> | --compare <a.json> <b.json>'); process.exit(2); }
fs.writeFileSync(args[0], JSON.stringify(out, null, 1));
console.log(`${Object.keys(out.natifs).length} natifs ; ${Object.entries(out.sites).map(([k, v]) => `${k} ${Object.keys(v.composants).length}`).join(', ')}`);
