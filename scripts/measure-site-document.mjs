// Mesure du format document du site : ce qu'il y a à écrire, en tokens, pour le même site en YAML et en documents.
//
//   création : la source entière de chaque site d'exemple (site.yaml + pages/*.page.yaml, contre site.md + pages/*.md).
//              Les documents sont ceux que « sitec rediger » écrit depuis le YAML : relus, ils rendent les mêmes données.
//   éditions : les quatre modifications du test de maintenance (maintenance/MODIFICATIONS-*.md : une FAQ, le thème, une page,
//              un champ de formulaire). Avant et après sont au dépôt en YAML (maintenance/originaux/dsl → maintenance/dsl) ;
//              on écrit chaque état en documents et l'on compare les lignes changées dans les deux formats.
//
// Le YAML est compté sans ses lignes de commentaire, que les documents écrits ne reprennent pas : sans cela l'écart serait flatté.
// C'est une mesure du texte, pas d'un travail : elle ne dit ni les commandes lancées, ni les erreurs, ni les relectures.
// Ce qu'un agent dépense vraiment pour créer et modifier un site se mesure en le faisant travailler (docs/rapports).
// Tokenizer : cl100k (gpt-tokenizer), ordre de grandeur comparable à celui des modèles Claude.
//
// Usage : node scripts/measure-site-document.mjs [--detail] [--json]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { encode } from 'gpt-tokenizer';
import { loadCatalog } from '../src/catalog.js';
import { loadProject } from '../src/load.js';
import { componentSchemas, writePageDocument, writeSiteDocument } from '../src/lang/site-document.js';
import { THEME_PRESETS } from '../src/emit/php/css.js';
import { SITE_SCHEMA } from '../src/validate.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const detail = process.argv.includes('--detail'), json = process.argv.includes('--json');
const tok = t => encode(t).length;
/** Le YAML sans ses lignes de commentaire (les documents écrits depuis le YAML n'en portent pas). */
const bare = t => t.split('\n').filter(l => !/^\s*#/.test(l)).join('\n');
const tokens = Object.keys(THEME_PRESETS.clair);
const catalog = await loadCatalog();

/** Les deux écritures d'un site YAML : { yaml: Map fichier → texte, md: Map fichier → texte, blocs }. */
async function both(dir) {
  const project = await loadProject(path.join(ROOT, dir));
  if (project.documents?.site) throw new Error(`${dir} est déjà en documents : la mesure part du YAML`);
  const schemas = componentSchemas(project, catalog);
  const yaml = new Map(), md = new Map();
  const s = writeSiteDocument(project.site, { tokens, groups: SITE_SCHEMA.properties.site.properties });
  if (s.error) throw new Error(`${dir} site.yaml : ${s.error}`);
  yaml.set('site', bare(fs.readFileSync(project.siteFile, 'utf8'))); md.set('site', s.text);
  for (const p of project.pages) {
    const r = writePageDocument(p.data, { schemas, pageOf: id => project.pages.find(x => x.id === id)?.data || null });
    if (r.error) throw new Error(`${dir} ${p.id} : ${r.error}`);
    yaml.set(p.id, bare(fs.readFileSync(p.file, 'utf8'))); md.set(p.id, r.text);
  }
  const blocs = [...md.values()].reduce((n, t) => n + (t.match(/^```yaml/gm) || []).length, 0);
  return { yaml, md, blocs };
}
const total = m => [...m.values()].reduce((n, t) => n + tok(t), 0);
const pct = (a, b) => Math.round((1 - b / a) * 100);

/** Lignes ajoutées et retirées entre deux textes (plus longue sous-suite commune). */
function diff(before, after) {
  const a = before.replace(/\r\n/g, '\n').split('\n'), b = after.replace(/\r\n/g, '\n').split('\n'), n = a.length, m = b.length;
  const L = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = a[i] === b[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const added = [], removed = []; let i = 0, j = 0;
  while (i < n || j < m) { if (i < n && j < m && a[i] === b[j]) { i++; j++; } else if (j < m && (i >= n || L[i][j + 1] >= L[i + 1][j])) added.push(b[j++]); else removed.push(a[i++]); }
  return { added, removed };
}
function edits(before, after) {
  const out = { fichiers: 0, lignes_ajoutees: 0, lignes_retirees: 0, tokens_ajoutes: 0, tokens_retires: 0 };
  for (const k of new Set([...before.keys(), ...after.keys()])) {
    const d = diff(before.get(k) ?? '', after.get(k) ?? '');
    if (!d.added.length && !d.removed.length) continue;
    out.fichiers++; out.lignes_ajoutees += d.added.filter(l => l.trim()).length; out.lignes_retirees += d.removed.filter(l => l.trim()).length;
    out.tokens_ajoutes += tok(d.added.join('\n')); out.tokens_retires += tok(d.removed.join('\n'));
  }
  return out;
}

const result = { creation: [], editions: [] };
for (const site of ['garnier-associes', 'plomberie-martin', 'le-fournil', 'savonnerie']) {
  const w = await both(path.join('examples', site));
  const row = { site, pages: w.yaml.size - 1, yaml: total(w.yaml), documents: total(w.md), gain_pct: pct(total(w.yaml), total(w.md)), blocs_yaml_gardes: w.blocs };
  if (detail) row.fichiers = [...w.yaml.keys()].map(k => ({ fichier: k, yaml: tok(w.yaml.get(k)), documents: tok(w.md.get(k)) }));
  result.creation.push(row);
}
for (const site of ['garnier-associes', 'le-fournil']) {
  const before = await both(path.join('maintenance', 'originaux', 'dsl', site)), after = await both(path.join('maintenance', 'dsl', site));
  const y = edits(before.yaml, after.yaml), d = edits(before.md, after.md);
  result.editions.push({ site, modifications: 4, yaml: y, documents: d, gain_pct_tokens_ecrits: pct(y.tokens_ajoutes, d.tokens_ajoutes), gain_pct_tokens_touches: pct(y.tokens_ajoutes + y.tokens_retires, d.tokens_ajoutes + d.tokens_retires) });
}
const sum = (rows, f) => rows.reduce((n, r) => n + f(r), 0);
result.total = {
  creation: { yaml: sum(result.creation, r => r.yaml), documents: sum(result.creation, r => r.documents) },
  editions: { yaml_ecrits: sum(result.editions, r => r.yaml.tokens_ajoutes), documents_ecrits: sum(result.editions, r => r.documents.tokens_ajoutes) },
};
result.total.creation.gain_pct = pct(result.total.creation.yaml, result.total.creation.documents);
result.total.editions.gain_pct = pct(result.total.editions.yaml_ecrits, result.total.editions.documents_ecrits);

if (json) { console.log(JSON.stringify(result)); process.exit(0); }
console.log('Création : la source entière, en tokens\n');
console.log('site               pages    YAML  documents   gain   blocs yaml gardés');
for (const r of result.creation) {
  console.log(`${r.site.padEnd(18)} ${String(r.pages).padStart(5)}  ${String(r.yaml).padStart(6)}  ${String(r.documents).padStart(9)}  ${String(r.gain_pct).padStart(3)} %   ${r.blocs_yaml_gardes}`);
  if (detail) for (const f of r.fichiers) console.log(`    ${f.fichier.padEnd(22)} ${String(f.yaml).padStart(6)}  ${String(f.documents).padStart(9)}  ${String(pct(f.yaml, f.documents)).padStart(3)} %`);
}
console.log(`${'total'.padEnd(18)} ${''.padStart(5)}  ${String(result.total.creation.yaml).padStart(6)}  ${String(result.total.creation.documents).padStart(9)}  ${String(result.total.creation.gain_pct).padStart(3)} %`);
console.log('\nÉditions : les quatre modifications du test de maintenance, lignes changées\n');
console.log('site               format     fichiers  lignes +/-    tokens écrits  tokens retirés');
for (const r of result.editions) for (const [k, v] of [['YAML', r.yaml], ['documents', r.documents]]) console.log(`${(k === 'YAML' ? r.site : '').padEnd(18)} ${k.padEnd(10)} ${String(v.fichiers).padStart(8)}  ${`${v.lignes_ajoutees} / ${v.lignes_retirees}`.padStart(10)}  ${String(v.tokens_ajoutes).padStart(15)}  ${String(v.tokens_retires).padStart(14)}${k === 'documents' ? `   ${r.gain_pct_tokens_ecrits} % de tokens écrits en moins` : ''}`);
console.log(`\ntotal des tokens écrits pour les éditions : ${result.total.editions.yaml_ecrits} en YAML, ${result.total.editions.documents_ecrits} en documents (${result.total.editions.gain_pct} %)`);
