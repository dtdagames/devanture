#!/usr/bin/env node
// Écart visuel entre un site d'origine et sa recréation : captures aux mêmes largeurs, mêmes routes, puis mesure.
// Usage : node scripts/compare-visuel.mjs <origine> <recréation> [--largeurs 1280,390] [--pages /,/contact=/contact.html] [--sortie dossier]
//   <origine>, <recréation> : une adresse (https://…, http://localhost:8791) ou un dossier dist/ (servi par php -S le temps du banc).
//   --pages : routes à comparer ; « /a=/b.html » quand l'adresse d'origine diffère de celle de la recréation (recréation=origine).
//   Sous Git Bash, préfixer par MSYS_NO_PATHCONV=1 : sans cela « / » est récrit en chemin Windows.
// Mesures, par page et par largeur :
//   - écran : écart moyen des pixels du premier écran (0 % identique, 100 % opposé), après réduction à 1/4 pour ignorer le détail du texte ;
//   - couleurs : part des couleurs du premier écran communes aux deux (100 % = même palette, mêmes proportions) ;
//   - hauteur : hauteur de la page recréée rapportée à celle de l'origine.
// Ce sont des indices grossiers, à lire avec les captures posées côte à côte dans <sortie>/index.html : ils disent si l'on s'approche,
// pas si la page est fidèle. La page est capturée entière depuis une fenêtre de 800 px de haut (une fenêtre très haute fausserait les
// hauteurs dites en part d'écran). Requis : Chrome (CHROME_BIN pour un autre chemin), sharp, Node 22 (WebSocket).
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf('--' + name); if (i < 0) return def; const v = args[i + 1]; args.splice(i, 2); return v; };
const widths = String(opt('largeurs', '1280,390')).split(',').map(Number).filter(Boolean);
const pagesArg = String(opt('pages', '/')).split(',').map(x => x.trim()).filter(Boolean);
const outDir = path.resolve(opt('sortie', 'compare-visuel'));
const [origin, copy] = args;
if (!origin || !copy) { console.error('usage : compare-visuel.mjs <origine> <recréation> [--largeurs 1280,390] [--pages /,/a=/b.html] [--sortie dossier]'); process.exit(2); }

const CHROME = process.env.CHROME_BIN || ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(p => fsSync.existsSync(p));
if (!CHROME) { console.error('Chrome introuvable : donner son chemin par CHROME_BIN.'); process.exit(2); }
if (typeof WebSocket !== 'function') { console.error('Node 22 ou plus est requis (WebSocket).'); process.exit(2); }
let sharp; try { sharp = (await import('sharp')).default; } catch { console.error('sharp est requis (npm install sharp).'); process.exit(2); }
const PHP = process.env.PHP_BIN || 'php';
const sleep = ms => new Promise(r => setTimeout(r, ms));

/** Une adresse telle quelle, ou un dossier dist/ servi par PHP le temps du banc. */
const children = [];
async function base(target, port) {
  if (/^https?:\/\//i.test(target)) return target.replace(/\/$/, '');
  const root = path.resolve(target);
  children.push(spawn(PHP, ['-S', `localhost:${port}`, '-t', root, path.join(root, 'index.php')], { stdio: 'ignore' }));
  for (let i = 0; i < 40; i++) { try { await fetch(`http://localhost:${port}/`); break; } catch { await sleep(150); } }
  return `http://localhost:${port}`;
}

/** Chrome sans fenêtre, piloté par son protocole de débogage : une seule instance pour tout le banc. */
const SCREEN = 800, MAX = 12000;
const DEBUG_PORT = 9300 + Math.floor(Math.random() * 400);
const profile = fsSync.mkdtempSync(path.join(os.tmpdir(), 'compare-visuel-'));
children.push(spawn(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--no-default-browser-check', `--user-data-dir=${profile}`, `--remote-debugging-port=${DEBUG_PORT}`, 'about:blank'], { stdio: 'ignore' }));
let wsUrl = null;
for (let i = 0; i < 60 && !wsUrl; i++) { try { wsUrl = (await (await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/version`)).json()).webSocketDebuggerUrl; } catch { await sleep(200); } }
if (!wsUrl) { for (const c of children) c.kill(); console.error('Chrome ne répond pas sur son port de débogage.'); process.exit(2); }
const ws = new WebSocket(wsUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
let seq = 0; const waiting = new Map(), listeners = new Set();
ws.onmessage = ev => { const m = JSON.parse(ev.data); if (m.id && waiting.has(m.id)) { const { res, rej } = waiting.get(m.id); waiting.delete(m.id); m.error ? rej(new Error(m.error.message)) : res(m.result); } else for (const l of listeners) l(m); };
const send = (method, params = {}, sessionId) => new Promise((res, rej) => { const id = ++seq; waiting.set(id, { res, rej }); ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) })); });

/** Capture la page entière à cette largeur ; renvoie sa hauteur, ou null si la page ne s'est pas chargée. */
async function shoot(url, width, file) {
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  const s = (m, p) => send(m, p, sessionId);
  try {
    await s('Page.enable');
    await s('Emulation.setDeviceMetricsOverride', { width, height: SCREEN, deviceScaleFactor: 1, mobile: width < 768 });
    const loaded = new Promise(res => { const l = m => { if (m.sessionId === sessionId && m.method === 'Page.loadEventFired') { listeners.delete(l); res(true); } }; listeners.add(l); setTimeout(() => { listeners.delete(l); res(false); }, 30000); });
    const nav = await s('Page.navigate', { url });
    if (nav.errorText || !(await loaded)) return null;
    // Images différées : la page est parcourue une fois, puis ramenée en haut.
    await s('Runtime.evaluate', { awaitPromise: true, expression: `(async()=>{document.querySelectorAll('img[loading=lazy]').forEach(i=>i.loading='eager');const h=document.documentElement.scrollHeight;for(let y=0;y<h;y+=600){scrollTo(0,y);await new Promise(r=>setTimeout(r,40));}scrollTo(0,0);await new Promise(r=>setTimeout(r,700));})()` });
    const { cssContentSize } = await s('Page.getLayoutMetrics');
    const height = Math.min(MAX, Math.max(SCREEN, Math.ceil(cssContentSize.height)));
    const { data } = await s('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width, height, scale: 1 } });
    await fs.writeFile(file, Buffer.from(data, 'base64'));
    return Math.ceil(cssContentSize.height);
  } finally { await send('Target.closeTarget', { targetId }).catch(() => {}); }
}

async function measure(a, b, width) {
  const w = Math.round(width / 4), h = Math.round(SCREEN / 4);
  const raw = f => sharp(f).extract({ left: 0, top: 0, width, height: SCREEN }).resize(w, h, { fit: 'fill' }).removeAlpha().raw().toBuffer();
  const [x, y] = await Promise.all([raw(a), raw(b)]);
  let sum = 0; for (let i = 0; i < x.length; i++) sum += Math.abs(x[i] - y[i]);
  const hist = buf => { const m = new Map(); for (let i = 0; i < buf.length; i += 3) { const k = (buf[i] >> 5) << 6 | (buf[i + 1] >> 5) << 3 | (buf[i + 2] >> 5); m.set(k, (m.get(k) || 0) + 1); } return m; };
  const hx = hist(x), hy = hist(y); let common = 0; for (const [k, v] of hx) common += Math.min(v, hy.get(k) || 0);
  return { ecran: +(100 * sum / (x.length * 255)).toFixed(1), couleurs: +(100 * common / (x.length / 3)).toFixed(1) };
}

await fs.mkdir(outDir, { recursive: true });
const rows = [];
try {
  const A = await base(origin, 8931), B = await base(copy, 8932);
  for (const spec of pagesArg) {
    const [pb, pa = pb] = spec.split('=');
    for (const width of widths) {
      const slug = (pb === '/' ? 'accueil' : pb.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '')) + '-' + width;
      const fa = path.join(outDir, slug + '-origine.png'), fb = path.join(outDir, slug + '-recree.png');
      const ha = await shoot(A + pa, width, fa), hb = await shoot(B + pb, width, fb);
      if (!ha || !hb) { rows.push({ page: pb, largeur: width, erreur: `capture manquée (${!ha ? 'origine' : 'recréation'})` }); continue; }
      const m = await measure(fa, fb, width);
      // Premier écran seul, pour la lecture côte à côte.
      for (const f of [fa, fb]) await sharp(f).extract({ left: 0, top: 0, width, height: SCREEN }).toFile(f.replace(/\.png$/, '-ecran.png'));
      rows.push({ page: pb, largeur: width, ...m, hauteur_origine: ha, hauteur_recree: hb, hauteur: +(100 * hb / Math.max(1, ha)).toFixed(0), fichiers: [path.basename(fa), path.basename(fb)] });
    }
  }
} finally {
  try { ws.close(); } catch { /* déjà fermé */ }
  for (const c of children) c.kill();
  await sleep(300);
  try { fsSync.rmSync(profile, { recursive: true, force: true }); } catch { /* profil encore tenu par Chrome */ }
}

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const html = `<!doctype html><html lang="fr"><meta charset="utf-8"><title>Écart visuel</title>
<style>body{font:15px/1.5 system-ui,sans-serif;margin:24px;color:#1b1f24}table{border-collapse:collapse;margin-bottom:32px}td,th{border:1px solid #d5dae0;padding:6px 10px;text-align:right}th:first-child,td:first-child{text-align:left}.pair{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:40px;align-items:start}.pair img{width:100%;border:1px solid #d5dae0}figure{margin:0}h2{margin-top:40px}small{color:#5b6470}</style>
<h1>Écart visuel</h1><p>Origine : ${esc(origin)} · recréation : ${esc(copy)} · ${new Date().toISOString().slice(0, 10)}</p>
<p><small>écran : écart moyen des pixels du premier écran (0 % = identique) ; couleurs : part de palette commune (100 % = même palette) ; hauteur : page recréée rapportée à l'origine. Indices grossiers, à lire avec les captures.</small></p>
<table><tr><th>Page</th><th>Largeur</th><th>Écran</th><th>Couleurs</th><th>Hauteur</th></tr>
${rows.map(r => r.erreur ? `<tr><td>${esc(r.page)}</td><td>${r.largeur}</td><td colspan="3">${esc(r.erreur)}</td></tr>` : `<tr><td>${esc(r.page)}</td><td>${r.largeur}</td><td>${r.ecran} %</td><td>${r.couleurs} %</td><td>${r.hauteur} % <small>(${r.hauteur_recree} / ${r.hauteur_origine} px)</small></td></tr>`).join('\n')}
</table>
${rows.filter(r => !r.erreur).map(r => `<h2>${esc(r.page)} · ${r.largeur} px</h2><div class="pair"><figure><figcaption>Origine</figcaption><img src="${esc(r.fichiers[0])}" loading="lazy"></figure><figure><figcaption>Recréation</figcaption><img src="${esc(r.fichiers[1])}" loading="lazy"></figure></div>`).join('\n')}
</html>`;
await fs.writeFile(path.join(outDir, 'index.html'), html);
await fs.writeFile(path.join(outDir, 'mesures.json'), JSON.stringify({ origine: origin, recreation: copy, date: new Date().toISOString(), mesures: rows }, null, 1));
for (const r of rows) console.log(r.erreur ? `${r.page} ${r.largeur} : ${r.erreur}` : `${r.page} ${r.largeur} px : écran ${r.ecran} %, couleurs ${r.couleurs} %, hauteur ${r.hauteur} % (${r.hauteur_recree}/${r.hauteur_origine} px)`);
console.log('captures et rapport : ' + path.join(outDir, 'index.html'));
process.exit(rows.some(r => r.erreur) ? 1 : 0);
