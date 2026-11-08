// Mesure des 12 essais de variance : check/build/banc pour les sites DSL, banc pour les sites PHP, tokens écrits, et statistiques par case.
// Usage : node scripts/measure-variance.mjs
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { encode } from 'gpt-tokenizer';

const ROOT = path.resolve('variance');
const cells = [];
for (const model of ['haiku', 'sonnet']) for (const variant of ['dsl', 'php']) for (const run of [1, 2, 3]) cells.push({ model, variant, run, dir: path.join(ROOT, model, variant, `run${run}`) });

async function walk(dir, filter) {
  const out = [];
  let entries = [];
  try { entries = await fs.readdir(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) { const p = path.join(dir, e.name); if (e.isDirectory()) { if (!['dist', 'data', 'node_modules'].includes(e.name)) out.push(...await walk(p, filter)); } else if (filter(p)) out.push(p); }
  return out;
}
async function tokensOf(files) { let t = 0, l = 0; for (const f of files) { const s = await fs.readFile(f, 'utf8'); t += encode(s).length; l += s.split('\n').length; } return { tokens: t, lines: l }; }

let port = 9100;
const results = [];
for (const c of cells) {
  const r = { ...c, dir: path.relative(process.cwd(), c.dir).replaceAll('\\', '/') };
  try {
    if (c.variant === 'dsl') {
      const chk = spawnSync('node', ['bin/sitec.js', 'check', c.dir], { encoding: 'utf8' });
      r.check_ok = chk.status === 0;
      const bld = spawnSync('node', ['bin/sitec.js', 'build', c.dir, '--draft'], { encoding: 'utf8' });
      r.build_ok = bld.status === 0;
      Object.assign(r, await tokensOf(await walk(c.dir, p => p.endsWith('.yaml'))));
      if (r.build_ok) { const v = spawnSync('node', ['scripts/verify-php-site.mjs', path.join(c.dir, 'dist'), String(port++)], { encoding: 'utf8' }); const last = v.stdout.trim().split('\n').pop(); try { const j = JSON.parse(last); r.bench = `${j.passed}/${j.total}`; r.bench_ok = j.passed === j.total; } catch { r.bench = 'erreur'; } }
    } else {
      Object.assign(r, await tokensOf(await walk(c.dir, p => /\.(php|js|css)$/.test(p))));
      const v = spawnSync('node', ['scripts/verify-php-site.mjs', c.dir, String(port++)], { encoding: 'utf8' }); const last = v.stdout.trim().split('\n').pop(); try { const j = JSON.parse(last); r.bench = `${j.passed}/${j.total}`; r.bench_ok = j.passed === j.total; r.fails = v.stdout.split('\n').filter(l => l.startsWith('FAIL')).map(l => l.slice(5, 70)); } catch { r.bench = 'erreur'; }
    }
  } catch (e) { r.error = e.message; }
  results.push(r);
  console.log(JSON.stringify(r));
}
await fs.writeFile(path.join(ROOT, 'mesures.json'), JSON.stringify(results, null, 2));
