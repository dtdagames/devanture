// Mesure le diff entre un site original et sa version modifiée : lignes ajoutées/supprimées, fichiers touchés, tokens des lignes ajoutées.
// Usage : node scripts/measure-diff.mjs <original> <modifié> [...paires]
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { encode } from 'gpt-tokenizer';

const args = process.argv.slice(2);
if (args.length < 2 || args.length % 2) { console.error('usage: measure-diff.mjs <original> <modifié> [...]'); process.exit(2); }

function gitDiff(a, b, extra) {
  try { return execFileSync('git', ['-c', 'core.autocrlf=false', '-c', 'core.safecrlf=false', 'diff', '--no-index', ...extra, a, b], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] }); }
  catch (e) { if (e.stdout) return e.stdout; throw e; } // git diff renvoie 1 quand il y a des différences
}

for (let i = 0; i < args.length; i += 2) {
  const a = path.resolve(args[i]), b = path.resolve(args[i + 1]);
  const numstat = gitDiff(a, b, ['--numstat']).trim().split('\n').filter(Boolean);
  let added = 0, removed = 0; const files = [];
  for (const line of numstat) {
    const [ad, rm, f] = line.split('\t');
    if (/\.svg$/.test(f) || /\/data\//.test(f)) continue;
    added += Number(ad) || 0; removed += Number(rm) || 0; files.push(f.replace(/^.*?\{|\}$/g, '').split(' => ').pop());
  }
  const unified = gitDiff(a, b, ['-U0']);
  // Ignorer les hunks des SVG et de data/ (on repère le fichier courant via les en-têtes +++).
  let skip = false; const addedLines = [], removedLines = [];
  for (const l of unified.split('\n')) {
    if (l.startsWith('+++ ') || l.startsWith('--- ')) { if (l.startsWith('+++ ')) skip = /\.svg$|\/data\//.test(l); continue; }
    if (skip) continue;
    if (l.startsWith('+')) addedLines.push(l.slice(1)); else if (l.startsWith('-')) removedLines.push(l.slice(1));
  }
  const addedText = addedLines.join('\n'), removedText = removedLines.join('\n');
  console.log(JSON.stringify({ site: path.relative(process.cwd(), b).replaceAll('\\', '/'), fichiers_touches: files.length, lignes_ajoutees: added, lignes_supprimees: removed, tokens_ajoutes: encode(addedText).length, tokens_supprimes: encode(removedText).length }));
}
