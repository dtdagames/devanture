// Mesure ce que l'agent a écrit dans un site baseline : fichiers PHP/JS/CSS, hors copies identiques de la bibliothèque.
// Usage : node scripts/measure-baseline.mjs <dossier-site> [autre...]
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { encode } from 'gpt-tokenizer';

const LIB = path.resolve('baseline/lib-composants');
const isCode = p => /\.(php|js|css|htaccess|json)$/.test(p) || p.endsWith('.htaccess');

async function walk(dir) {
  const out = [];
  let entries = [];
  try { entries = await fs.readdir(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== 'data' && e.name !== 'node_modules') out.push(...await walk(p)); }
    else if (isCode(p)) out.push(p);
  }
  return out;
}

const libHashes = new Set();
for (const f of await walk(LIB)) libHashes.add(crypto.createHash('sha1').update(await fs.readFile(f)).digest('hex'));

for (const dir of process.argv.slice(2)) {
  const files = await walk(path.resolve(dir));
  let written = { files: 0, lines: 0, tokens: 0 }, copied = { files: 0, lines: 0, tokens: 0 };
  for (const f of files) {
    const buf = await fs.readFile(f);
    const t = buf.toString('utf8');
    const stat = { lines: t.split('\n').length, tokens: encode(t).length };
    const target = libHashes.has(crypto.createHash('sha1').update(buf).digest('hex')) ? copied : written;
    target.files++; target.lines += stat.lines; target.tokens += stat.tokens;
  }
  console.log(JSON.stringify({ site: path.relative(process.cwd(), dir).replaceAll('\\', '/'), ecrit_par_agent: written, copie_de_la_lib: copied }));
}
