// Compare les props d'un composant natif dans une version git (schéma JSON écrit à la main) et dans l'arbre de travail
// (bloc données compilé). Égalité stricte après normalisation de l'ordre des clés et des listes « required ».
// Usage : node scripts/compare-props.mjs <révision> <composant…>      ex. node scripts/compare-props.mjs v0.6.0 features stats
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';
import { loadCatalog } from '../src/catalog.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [rev, ...names] = process.argv.slice(2);
if (!rev || !names.length) { console.error('usage: compare-props.mjs <révision> <composant…>'); process.exit(2); }
const canon = v => {
  if (Array.isArray(v)) return v.map(canon);
  if (v && typeof v === 'object') return Object.fromEntries(Object.keys(v).sort().map(k => [k, k === 'required' && Array.isArray(v[k]) ? [...v[k]].sort() : canon(v[k])]));
  return v;
};
const strip = p => { const c = JSON.parse(JSON.stringify(p)); delete c.$defs; for (const k of ['id', 'keywords', 'variants']) delete c.properties?.[k]; delete c.additionalProperties; return c; };
const catalog = await loadCatalog();
let diff = 0;
for (const name of names) {
  const before = YAML.parse(execFileSync('git', ['show', `${rev}:components/${name}/manifest.yaml`], { cwd: ROOT, encoding: 'utf8' })).props;
  const after = strip(catalog.get(name).manifest.props);
  const a = JSON.stringify(canon(before)), b = JSON.stringify(canon(after));
  if (a === b) { console.log(`IDENTIQUE  ${name}`); continue; }
  diff++;
  let i = 0; while (i < a.length && a[i] === b[i]) i++;
  console.log(`DIFFÉRENT  ${name} au caractère ${i}\n  avant : …${a.slice(Math.max(0, i - 60), i + 80)}…\n  après : …${b.slice(Math.max(0, i - 60), i + 80)}…`);
}
console.log(JSON.stringify({ compared: names.length, identical: names.length - diff }));
process.exit(diff ? 1 : 0);
