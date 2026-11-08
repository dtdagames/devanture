// Mesure ce qu'un LLM doit écrire : tokens du DSL source vs tokens du code généré.
// Usage : node scripts/measure.mjs <dossier-site> [autre-dossier...]
// Tokenizer : cl100k (gpt-tokenizer). Ordre de grandeur comparable aux tokenizers Claude.
import fs from 'node:fs/promises';
import path from 'node:path';
import { encode } from 'gpt-tokenizer';

async function walk(dir, filter) {
  const out = [];
  let entries = [];
  try { entries = await fs.readdir(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...await walk(p, filter));
    else if (filter(p)) out.push(p);
  }
  return out;
}

async function measure(files) {
  let chars = 0, lines = 0, tokens = 0;
  for (const f of files) {
    const t = await fs.readFile(f, 'utf8');
    chars += t.length; lines += t.split('\n').length; tokens += encode(t).length;
  }
  return { files: files.length, lines, chars, tokens };
}

const isCode = p => /\.(php|js|css|htaccess)$/.test(p) || p.endsWith('.htaccess');
const isDsl = p => p.endsWith('.yaml');

for (const dir of process.argv.slice(2)) {
  const dsl = await measure(await walk(dir, p => isDsl(p) && !p.includes(`${path.sep}dist${path.sep}`)));
  const dist = await measure(await walk(path.join(dir, 'dist'), p => isCode(p) && !p.includes(`${path.sep}assets${path.sep}`) || /site\.(css|js)$/.test(p)));
  const ratio = dist.tokens ? (dist.tokens / dsl.tokens).toFixed(1) : 'n/a (pas de dist)';
  console.log(JSON.stringify({ site: path.basename(dir), dsl, dist, ratio_dist_sur_dsl: ratio }));
}

// Coût du contexte « protocole » : CLAUDE.md + catalog.
const claudeMd = await fs.readFile('CLAUDE.md', 'utf8');
console.log(JSON.stringify({ contexte: { 'CLAUDE.md': encode(claudeMd).length } }));
