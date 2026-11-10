// Mesure des natifs portés au format langage grâce au vocabulaire : tout ce qui s'écrivait avant (schéma des props, gabarit,
// feuille, module) contre tout ce qui s'écrit maintenant (données, calculé, forme, apparence, feuille restante), vocabulaire natif
// entier compris. Le vocabulaire est compté une fois : ses mots servent à plusieurs composants et aux sites.
// Usage : node scripts/measure-vocabulaire.mjs [révision-avant]     défaut v0.9.0
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';
import { encode } from 'gpt-tokenizer';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rev = process.argv[2] || 'v0.9.0';
const git = p => { try { return execFileSync('git', ['show', `${rev}:${p}`], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }); } catch { return ''; } };
const now = p => { try { return fs.readFileSync(path.join(ROOT, p), 'utf8'); } catch { return ''; } };
const authored = (text, keys) => { const m = YAML.parse(text) || {}; return keys.filter(k => m[k] !== undefined).map(k => YAML.stringify({ [k]: m[k] }, { lineWidth: 0 })).join(''); };
const tok = t => encode(t).length, lin = t => (t.trim() ? t.trim().split('\n').length : 0);

const NATIVES = ['hero', 'gallery', 'richtext', 'pricelist', 'map', 'collection.list'];
let before = 0, after = 0, linesBefore = 0, linesAfter = 0, tplBefore = 0;
for (const n of NATIVES) {
  const d = `components/${n}`, tpl = git(`${d}/template.html`);
  const a = authored(git(`${d}/manifest.yaml`), ['props', 'behaviors']) + tpl + git(`${d}/styles.css`) + git(`${d}/module.js`);
  const b = authored(now(`${d}/manifest.yaml`), ['données', 'calculé', 'forme', 'apparence']) + now(`${d}/styles.css`) + now(`${d}/template.html`) + now(`${d}/module.js`);
  console.log(`${n.padEnd(18)} ${String(tok(a)).padStart(5)} → ${String(tok(b)).padStart(5)} tokens   ${String(lin(a)).padStart(3)} → ${String(lin(b)).padStart(3)} lignes   gabarit avant : ${lin(tpl)} lignes`);
  before += tok(a); after += tok(b); linesBefore += lin(a); linesAfter += lin(b); tplBefore += lin(tpl);
}
const voc = now('components/vocabulaire.yaml');
const mots = Object.values(YAML.parse(voc)?.mots || {});
const tplAfter = mots.reduce((s, w) => s + (w.gabarit ? lin(w.gabarit) : 0), 0);
console.log(`${'vocabulaire natif'.padEnd(18)} ${String(tok(voc)).padStart(13)} tokens   ${String(lin(voc)).padStart(9)} lignes   ${mots.length} mots, gabarit : ${tplAfter} lignes`);
console.log(JSON.stringify({ revision_avant: rev, composants: NATIVES.length, tokens_avant: before, tokens_apres: after + tok(voc), dont_vocabulaire: tok(voc), reduction_pct: Math.round((1 - (after + tok(voc)) / before) * 100), lignes_avant: linesBefore, lignes_apres: linesAfter + lin(voc), gabarit_lignes_avant: tplBefore, gabarit_lignes_apres: tplAfter, mots: mots.length }));
