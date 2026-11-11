// Inventaire de ce qui reste écrit en YAML ou en PHP par un auteur : les blocs ```yaml que « sitec rediger » garderait dans les
// sites d'exemple, puis les autres fichiers YAML et PHP des exemples et du catalogue natif. Sert de jauge au remplacement du YAML.
// Usage : node scripts/inventaire-yaml.mjs [--json]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';
import { loadCatalog } from '../src/catalog.js';
import { loadProject } from '../src/load.js';
import { SITE_SCHEMA } from '../src/validate.js';
import { componentSchemas, writePageDocument, writeSiteDocument } from '../src/lang/site-document.js';
import { THEME_PRESETS } from '../src/emit/php/css.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tokens = Object.keys(THEME_PRESETS.clair), groups = SITE_SCHEMA.properties.site.properties, catalog = await loadCatalog();
const fences = {};
const note = (where, text) => { for (const m of text.matchAll(/```yaml\n([\s\S]*?)```/g)) { let o = {}; try { o = YAML.parse(m[1]) || {}; } catch { /* illisible : compté sans détail */ } for (const k of Object.keys(o)) { const key = `${where} › ${k}${k === 'site' && o.site && typeof o.site === 'object' ? ' { ' + Object.keys(o.site).join(', ') + ' }' : ''}`; fences[key] = (fences[key] || 0) + 1; } } };
for (const site of ['garnier-associes', 'plomberie-martin', 'le-fournil', 'savonnerie']) {
  const project = await loadProject(path.join(ROOT, 'examples', site));
  if (project.documents?.site) continue;
  const schemas = componentSchemas(project, catalog);
  note('site.md', writeSiteDocument(project.site, { tokens, groups }).text || '');
  for (const p of project.pages) {
    const parts = (writePageDocument(p.data, { schemas, pageOf: id => project.pages.find(x => x.id === id)?.data || null }).text || '').split(/^## /m);
    note('page, en-tête', parts[0]);
    for (const s of parts.slice(1)) note(s.split('\n')[0].split(' : ')[0].replace(/ #.*/, '').toLowerCase(), s);
  }
}
const walk = (d, out = []) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { if (['dist', 'node_modules', 'lecture', 'cache'].includes(e.name)) continue; const p = path.join(d, e.name); if (e.isDirectory()) walk(p, out); else out.push(path.relative(ROOT, p).replaceAll('\\', '/')); } return out; };
const kinds = {};
for (const f of walk(path.join(ROOT, 'examples')).filter(f => /\.(yaml|php)$/.test(f) && !/\/(site\.yaml|pages\/[^/]+\.page\.yaml|lecture\.yaml)$/.test(f))) {
  const k = f.replace(/^examples\/[^/]+\//, '').replace(/components\/[^/]+\//, 'components/<nom>/').replace(/fixtures\/[^/]+\.yaml/, 'fixtures/<cas>.yaml').replace(/data\/[^/]+\.yaml/, 'data/<nom>.yaml').replace(/custom\/[^/]+\.php/, 'custom/<bloc>.php');
  kinds[k] = (kinds[k] || 0) + 1;
}
const natif = { yaml: walk(path.join(ROOT, 'components')).filter(f => /\.yaml$/.test(f)).length, php: walk(path.join(ROOT, 'components')).filter(f => /\.php$/.test(f)).length };
const total = Object.values(fences).reduce((a, b) => a + b, 0);
if (process.argv.includes('--json')) { console.log(JSON.stringify({ blocs_yaml: total, par_donnee: fences, fichiers_des_exemples: kinds, catalogue_natif: natif })); process.exit(0); }
console.log(`Blocs yaml que garderaient les quatre sites d'exemple écrits en documents : ${total}`);
for (const [k, n] of Object.entries(fences).sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(2)}  ${k}`);
console.log('\nAutres fichiers YAML et PHP d\'auteur dans examples/ :');
for (const [k, n] of Object.entries(kinds).sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(2)}  ${k}`);
console.log(`\nCatalogue natif : ${natif.yaml} fichiers yaml, ${natif.php} fichier php`);
