// Inventaire de ce qui reste écrit en YAML ou en PHP par un auteur dans le dépôt : fichiers des exemples et du catalogue natif,
// et blocs ```yaml gardés dans leurs documents. Sert de jauge au remplacement du YAML.
// Usage : node scripts/inventaire-yaml.mjs [--json]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const walk = (d, out = []) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { if (['dist', 'node_modules', 'cache'].includes(e.name)) continue; const p = path.join(d, e.name); if (e.isDirectory()) walk(p, out); else out.push(path.relative(ROOT, p).replaceAll('\\', '/')); } return out; };
const files = [...walk(path.join(ROOT, 'examples')), ...walk(path.join(ROOT, 'components'))];
// La lecture figée (lecture/, lecture.yaml) est écrite par le compilateur, pas par l'auteur.
const authored = files.filter(f => !/(^|\/)lecture(\/|\.yaml$)/.test(f));
const yaml = authored.filter(f => /\.ya?ml$/.test(f)), php = authored.filter(f => /\.php$/.test(f));
const blocs = {};
for (const f of authored.filter(x => /\.md$/.test(x))) { const n = (fs.readFileSync(path.join(ROOT, f), 'utf8').match(/^\s*```ya?ml\s*$/gm) || []).length; if (n) blocs[f] = n; }
const out = { fichiers_yaml: yaml, fichiers_php: php, blocs_yaml: blocs, documents: authored.filter(f => /\.md$/.test(f)).length };
if (process.argv.includes('--json')) { console.log(JSON.stringify(out)); process.exit(0); }
console.log(`Documents d'auteur (exemples et catalogue natif) : ${out.documents}`);
console.log(`\nFichiers YAML d'auteur : ${yaml.length}`); for (const f of yaml) console.log('  ' + f);
console.log(`\nFichiers PHP d'auteur : ${php.length}`); for (const f of php) console.log('  ' + f);
console.log(`\nBlocs yaml gardés dans des documents : ${Object.values(blocs).reduce((a, b) => a + b, 0)}`); for (const [f, n] of Object.entries(blocs)) console.log(`  ${n}  ${f}`);
