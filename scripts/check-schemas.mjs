// Valide les fichiers YAML d'un site contre les schémas produits par « sitec schema » (même correspondance que .vscode/settings.json).
// Usage : node scripts/check-schemas.mjs <dossier-site>   (après sitec schema <dossier-site>)
import fs from 'node:fs/promises';
import path from 'node:path';
import YAML from 'yaml';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const root = path.resolve(process.argv[2] || '.');
const settings = JSON.parse(await fs.readFile(path.join(root, '.vscode', 'settings.json'), 'utf8'));
const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const globToRe = g => new RegExp('^' + g.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*') + '$');
const files = [];
const walk = async (d, rel = '') => { for (const e of await fs.readdir(d, { withFileTypes: true })) { if (['node_modules', 'dist', '.git', '.devanture'].includes(e.name)) continue; const r = rel ? rel + '/' + e.name : e.name; if (e.isDirectory()) await walk(path.join(d, e.name), r); else if (/\.ya?ml$/.test(e.name)) files.push(r); } };
await walk(root);
let checked = 0, failed = 0;
for (const [schemaRel, globs] of Object.entries(settings['yaml.schemas'] || {})) {
  if (!schemaRel.startsWith('./.devanture/')) continue;
  const validate = ajv.compile(JSON.parse(await fs.readFile(path.join(root, schemaRel), 'utf8')));
  for (const f of files.filter(f => globs.some(g => globToRe(g).test(f)))) {
    checked++;
    const doc = YAML.parse(await fs.readFile(path.join(root, f), 'utf8'));
    if (!validate(doc)) { failed++; console.log(`FAIL ${f} (${path.basename(schemaRel)}) : ${validate.errors.slice(0, 4).map(e => `${e.instancePath || '/'} ${e.message}${e.params?.additionalProperty ? ' ' + e.params.additionalProperty : ''}`).join(' ; ')}`); }
  }
}
console.log(JSON.stringify({ site: path.basename(root), checked, failed }));
process.exit(failed ? 1 : 0);
