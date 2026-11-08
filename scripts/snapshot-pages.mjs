// Instantané du HTML rendu de toutes les pages d'un site compilé (exploration depuis /), pour comparer deux versions du compilateur.
// Usage : node scripts/snapshot-pages.mjs <dossier-dist> <port> <dossier-sortie>
//         node scripts/snapshot-pages.mjs --compare <dossier-a> <dossier-b>
// Le HTML est normalisé : jetons CSRF, empreintes d'assets (?v=, integrity), espaces et horaires « ouvert/fermé » neutralisés.
import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

const args = process.argv.slice(2);
const norm = (h) => h
  .replace(/name="_csrf" value="[a-f0-9]+"/g, 'name="_csrf" value="X"')
  .replace(/\?v=[a-f0-9]+/g, '?v=X').replace(/integrity="[^"]+"/g, 'integrity="X"')
  .replace(/<div class="hours-status[^<]*<\/div>/g, '<div class="hours-status"></div>').replace(/ class="is-today"/g, '')
  .replace(/>\s+</g, '><').replace(/\s+/g, ' ').trim();

if (args[0] === '--compare') {
  const [, a, b] = args;
  const files = new Set([...(await fs.readdir(a)), ...(await fs.readdir(b))]);
  let diff = 0;
  for (const f of [...files].sort()) {
    const x = await fs.readFile(path.join(a, f), 'utf8').catch(() => null), y = await fs.readFile(path.join(b, f), 'utf8').catch(() => null);
    if (x === y) continue;
    diff++;
    if (x === null || y === null) { console.log(`${f} : ${x === null ? 'absent avant' : 'absent après'}`); continue; }
    let i = 0; while (i < x.length && x[i] === y[i]) i++;
    console.log(`${f} : différence au caractère ${i}\n  avant : …${x.slice(Math.max(0, i - 80), i + 120)}…\n  après : …${y.slice(Math.max(0, i - 80), i + 120)}…`);
  }
  console.log(JSON.stringify({ pages: files.size, identical: files.size - diff, different: diff }));
  process.exit(diff ? 1 : 0);
}

const [dir, port, out] = args;
const WINGET_PHP = 'C:/Users/sergi/AppData/Local/Microsoft/WinGet/Packages/PHP.PHP.8.3_Microsoft.Winget.Source_8wekyb3d8bbwe/php.exe';
const PHP = process.env.PHP_BIN || (existsSync(WINGET_PHP) ? WINGET_PHP : 'php');
const root = path.resolve(dir); const base = `http://127.0.0.1:${port}`;
const server = spawn(PHP, ['-S', `127.0.0.1:${port}`, '-t', root, path.join(root, 'index.php')], { stdio: 'ignore' });
try {
  for (let i = 0; i < 40; i++) { try { await fetch(base + '/'); break; } catch { await new Promise(r => setTimeout(r, 150)); } }
  await fs.mkdir(out, { recursive: true });
  const seen = new Set(); const queue = ['/'];
  while (queue.length && seen.size < 80) {
    const p = queue.shift(); if (seen.has(p)) continue; seen.add(p);
    const r = await fetch(base + p, { redirect: 'manual' }); if (r.status !== 200 || !/html/.test(r.headers.get('content-type') || '')) continue;
    const html = await r.text();
    await fs.writeFile(path.join(out, (p === '/' ? 'index' : p.slice(1).replace(/\//g, '__')) + '.html'), norm(html));
    for (const m of html.matchAll(/href="(\/[a-z0-9\-\/]*)"/g)) { const q = m[1].replace(/\/+$/, '') || '/'; if (!seen.has(q) && !/^\/(assets|lisible|_)/.test(q)) queue.push(q); }
  }
  console.log(JSON.stringify({ site: path.basename(path.dirname(root)), pages: seen.size }));
} finally { server.kill(); }
