// Mesure de la tolérance du format document : combien de phrases le lecteur lit dans des rédactions libres.
//
// scripts/reference/redactions/ garde neuf textes, en trois lots de trois. Chacun décrit un composant à formulaire différent
// et a été rédigé par un modèle à qui l'on n'avait montré ni le lexique ni les tournures du lecteur (seulement : « une phrase
// par règle, les textes affichés entre « » »). Chaque lot a d'abord été lu par le lecteur tel qu'il était, sans retouche :
//
//   lot 1 : 3 phrases lues sur 30 (10 %)   le lecteur ne connaissait que les reformulations de son auteur
//   lot 2 : 13 sur 31 (42 %)               après un tour d'élargissement fait d'après le lot 1
//   lot 3 : 10 sur 30 (33 %)               après un second tour fait d'après le lot 2
//
// Ces taux de premier passage ne se reproduisent plus : le lecteur a été élargi depuis d'après les lots 1 et 2, et sa phrase
// des champs d'après le lot 3. Ce script donne les taux du lecteur actuel et sert de garde contre une régression.
// Une phrase lue de travers ne se voit pas ici : elle se voit dans la lecture redite (--detail), à relire phrase par phrase.
//
// Usage : node scripts/measure-document.mjs [--detail]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readDocument, splitDocument } from '../src/lang/document.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const base = path.join(ROOT, 'scripts', 'reference', 'redactions');
const detail = process.argv.includes('--detail');
const out = [];
for (const lot of fs.readdirSync(base).sort()) {
  let total = 0, read = 0;
  for (const f of fs.readdirSync(path.join(base, lot)).filter(x => x.endsWith('.md')).sort()) {
    const text = fs.readFileSync(path.join(base, lot, f), 'utf8'), name = f.replace('.md', '');
    const n = splitDocument(text).sentences.length, r = readDocument(text, { name });
    const refused = new Set(r.errors.map(e => e.line));
    const ok = r.trace.filter(t => !t.error && !refused.has(t.line));
    total += n; read += ok.length;
    if (!detail) continue;
    console.log(`\n=== ${lot}/${name} : ${ok.length} phrases lues sur ${n}`);
    for (const t of ok) console.log(`  lu     l.${t.line} ${t.text}\n           → ${t.said}${t.corrected ? ' [' + t.corrected.join(' ; ') + ']' : ''}`);
    for (const e of r.errors) console.log(`  REFUS  l.${e.line} ${e.message}`);
  }
  out.push({ lot, phrases: total, lues: read, taux: Math.round(read / total * 100) + ' %' });
}
if (detail) console.log('');
for (const o of out) console.log(JSON.stringify(o));
