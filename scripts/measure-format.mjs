// Mesure ce qu'un auteur (humain ou modèle) écrit pour un composant, avant (props en schéma JSON + template.html + styles.css)
// et après (données + forme + apparence), en lignes, caractères et tokens (gpt-tokenizer, approximation commune).
// Usage : node scripts/measure-format.mjs <révision-avant>     ex. node scripts/measure-format.mjs v0.6.0
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';
import { encode } from 'gpt-tokenizer';
import { parseComponentOutline } from '../src/lang/outline.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rev = process.argv[2] || 'v0.6.0';
const git = p => { try { return execFileSync('git', ['show', `${rev}:${p}`], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }); } catch { return ''; } };
// Un composant écrit en plan (composant.md) : ses blocs sont ceux d'un manifeste, rendus en YAML pour être mesurés à l'identique.
const planAsManifest = p => { try { const v = parseComponentOutline(fs.readFileSync(path.join(ROOT, p.replace(/manifest\.yaml$/, 'composant.md')), 'utf8')).value; delete v.example; return YAML.stringify(v, { lineWidth: 0 }); } catch { return ''; } };
const now = p => { try { return fs.readFileSync(path.join(ROOT, p), 'utf8'); } catch { return /manifest\.yaml$/.test(p) ? planAsManifest(p) : ''; } };
// Partie « à écrire » d'un manifeste : props ou données + forme + apparence (description, exemple, intentions sont communs aux deux formats).
const authored = (text, keys) => { const m = YAML.parse(text) || {}; return keys.filter(k => m[k] !== undefined).map(k => YAML.stringify({ [k]: m[k] }, { lineWidth: 0 })).join(''); };
const stat = t => ({ lignes: t ? t.trim().split('\n').length : 0, caracteres: t.length, tokens: encode(t).length });

const COMPONENTS = [
  ...['features', 'stats', 'steps', 'testimonials', 'faq', 'timeline', 'cta'].map(n => ({ label: n, dir: `components/${n}`, styles: false })),
  { label: 'avis-defilants (projet)', dir: 'examples/le-fournil/components/avis-defilants', styles: true },
  { label: 'devis-express (projet, formulaire)', dir: 'examples/plomberie-martin/components/devis-express', styles: true },
  { label: 'vitrine.onglets (paquet)', dir: 'examples/paquets/vitrine/components/onglets', styles: true },
];
const rows = [];
for (const c of COMPONENTS) {
  // Avant : schéma des props + gabarit (+ feuille de style pour les composants de projet). Après : données + forme (+ apparence).
  const before = authored(git(`${c.dir}/manifest.yaml`), ['props', 'behaviors']) + git(`${c.dir}/template.html`) + (c.styles ? git(`${c.dir}/styles.css`) : '');
  const after = authored(now(`${c.dir}/manifest.yaml`), ['données', 'forme', 'apparence']) + now(`${c.dir}/template.html`) + (c.styles ? now(`${c.dir}/styles.css`) : '');
  rows.push({ composant: c.label, avant: stat(before), apres: stat(after) });
}
const tot = k => rows.reduce((n, r) => n + r[k].tokens, 0);
for (const r of rows) console.log(`${r.composant.padEnd(36)} ${String(r.avant.tokens).padStart(5)} → ${String(r.apres.tokens).padStart(5)} tokens   ${String(r.avant.lignes).padStart(3)} → ${String(r.apres.lignes).padStart(3)} lignes   ${Math.round((1 - r.apres.tokens / r.avant.tokens) * 100)} %`);
console.log(JSON.stringify({ revision_avant: rev, composants: rows.length, tokens_avant: tot('avant'), tokens_apres: tot('apres'), reduction_pct: Math.round((1 - tot('apres') / tot('avant')) * 100) }));
