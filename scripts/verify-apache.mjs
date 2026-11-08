// Vérifie un site compilé servi par un vrai Apache : image officielle php:8.3-apache (Docker), .htaccess généré, AllowOverride All.
// Contrôles propres à Apache (cache statique servi sans PHP, dossiers et fichiers interdits, routes réécrites, assets et en-têtes,
// back-office, déploiement signé), puis les bancs HTTP habituels (site, boutique) rejoués contre ce serveur.
// Usage : node scripts/verify-apache.mjs <dossier-dist> <port> [--keep] [--no-benches] [--host domaine]
//   --host domaine : le dossier est la sortie de « sitec host » ; toutes les requêtes portent cet en-tête Host et visent le site
//                    que le .htaccess lui associe (bancs et déploiement non rejoués dans ce mode).
// Le dossier est copié dans un répertoire de travail (données vides, .env de test) : rien n'est modifié dans dist/.
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const [dir, portArg, ...flags] = process.argv.slice(2);
if (!dir || !portArg) { console.error('usage: verify-apache.mjs <dossier-dist> <port> [--keep] [--no-benches] [--host domaine]'); process.exit(2); }
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.resolve(dir);
const HOST = flags.includes('--host') ? flags[flags.indexOf('--host') + 1] : null;
const project = !HOST && path.basename(dist) === 'dist' ? path.dirname(dist) : null;
const port = Number(portArg);
const name = `devanture-apache-${port}`;
const work = path.join(os.tmpdir(), 'devanture-apache', `${path.basename(project || path.dirname(dist))}-${port}`);
const base = `http://127.0.0.1:${port}`;
const ADMIN = 'apache-admin', SECRET = 'apache-secret';
const checks = [];
const ok = (n, pass, detail = '') => { checks.push({ name: n, pass: !!pass, detail }); };
const docker = (args, opts = {}) => execFileSync('docker', args, { stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8', ...opts });

/** Requête HTTP brute (l'API fetch ne laisse pas fixer l'en-tête Host). Redirection 301 vers la même origine suivie une fois pour les GET. */
function raw(p, { cookie = '', method = 'GET', headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, path: p, method, headers: { ...(HOST ? { host: HOST } : {}), ...(cookie ? { cookie } : {}), ...headers } }, res => {
      const chunks = []; res.on('data', c => chunks.push(c)); res.on('end', () => {
        const h = res.headers;
        const hdr = { get: n => { const v = h[n.toLowerCase()]; return v === undefined ? null : Array.isArray(v) ? v.join(', ') : v; }, has: n => h[n.toLowerCase()] !== undefined, keys: () => Object.keys(h), getSetCookie: () => h['set-cookie'] || [] };
        resolve({ status: res.statusCode, headers: hdr, text: Buffer.concat(chunks).toString('utf8') });
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}
async function get(p, opts = {}) {
  let r = await raw(p, opts);
  const loc = r.headers.get('location') || '';
  if ((opts.method || 'GET') === 'GET' && r.status === 301 && (loc.startsWith(base + '/') || (HOST && loc.startsWith(`http://${HOST}/`)))) r = await raw(new URL(loc).pathname + new URL(loc).search, { cookie: opts.cookie, headers: opts.headers });
  return r;
}
const phpErr = t => /(Fatal error|Warning:|Notice:|Deprecated:|Parse error)/.test(t);

// 1. Répertoire de travail : copie du site (ou de l'hôte), données vides, cache vide, .env de test.
await fs.rm(work, { recursive: true, force: true });
await fs.cp(dist, work, { recursive: true });
const siteDirs = HOST ? (await fs.readdir(path.join(work, 'sites'))).map(d => path.join(work, 'sites', d)) : [work];
for (const d of siteDirs) {
  for (const f of await fs.readdir(path.join(d, 'data')).catch(() => [])) if (!['products.json', '.htaccess', '.gitkeep'].includes(f)) await fs.rm(path.join(d, 'data', f), { recursive: true, force: true });
  await fs.rm(path.join(d, 'cache'), { recursive: true, force: true }); await fs.mkdir(path.join(d, 'cache'));
  await fs.writeFile(path.join(d, '.env'), `ADMIN_TOKEN=${ADMIN}\nDEPLOY_SECRET=${SECRET}\n`);
}

// 2. Apache : mod_rewrite, mod_headers, mod_expires, mod_deflate ; .htaccess autorisés ; le dossier monté comme racine du serveur.
try { docker(['rm', '-f', name]); } catch { /* pas de conteneur résiduel */ }
docker(['run', '-d', '--rm', '--name', name, '-p', `127.0.0.1:${port}:80`, '-v', `${work.replaceAll('\\', '/')}:/var/www/html`, 'php:8.3-apache', 'bash', '-c',
  // Sous Linux, le dossier monté appartient à l'utilisateur hôte : PHP (www-data) doit pouvoir écrire data/, cache/ et déployer ;
  // chez un hébergeur mutualisé, PHP tourne sous le compte du client et la question ne se pose pas. Sans effet sur un montage Windows.
  // Puits de courrier : mail() de PHP écrit chaque message dans data/mail.log au lieu d'un vrai sendmail, pour vérifier en-têtes et contenu.
  "chmod -R a+rwX /var/www/html 2>/dev/null; printf '%s\\n' '#!/bin/sh' 'cat >> /var/www/html/data/mail.log' 'printf \"\\n--- fin ---\\n\" >> /var/www/html/data/mail.log' > /usr/local/bin/mailsink; chmod +x /usr/local/bin/mailsink; echo 'sendmail_path = /usr/local/bin/mailsink' > /usr/local/etc/php/conf.d/zz-mail.ini; a2enmod rewrite headers expires deflate >/dev/null 2>&1; sed -i 's/AllowOverride None/AllowOverride All/g' /etc/apache2/apache2.conf; exec apache2-foreground"]);
let up = false;
for (let i = 0; i < 120 && !up; i++) { try { await raw('/'); up = true; } catch { await new Promise(r => setTimeout(r, 500)); } }
ok('Apache démarré (php:8.3-apache)' + (HOST ? ` pour Host: ${HOST}` : ''), up);

try {
  if (!up) throw new Error('serveur injoignable');
  const ht = await fs.readFile(path.join(work, '.htaccess'), 'utf8');
  // En mode hôte, le site visé est celui dont la condition de domaine du .htaccess accepte HOST.
  let siteName = null;
  if (HOST) {
    for (const m of ht.matchAll(/RewriteCond %\{HTTP_HOST\} \^\(([^)]+)\)\$ \[NC\]\nRewriteCond %\{REQUEST_URI\} [^\n]+\nRewriteRule \^\(\.\*\)\$ sites\/([^/]+)\/\$1/g)) if (new RegExp(`^(${m[1]})$`, 'i').test(HOST)) siteName = m[2];
    ok(`Site associé à ${HOST} dans .htaccess`, !!siteName, siteName || 'aucun');
    if (!siteName) throw new Error('domaine inconnu du .htaccess');
  }
  const prefix = siteName ? `/sites/${siteName}` : '';
  const siteDir = siteName ? path.join(work, 'sites', siteName) : work;
  const staticRoutes = [...ht.matchAll(/RewriteRule \^(.*?)\$ ((?:sites\/[^ /]+\/)?cache\/[^ ]+) \[L\]/g)].map(m => ({ route: '/' + m[1], file: m[2] })).filter(r => !siteName || r.file.startsWith(`sites/${siteName}/`));
  const home = await get('/');
  ok('GET / → 200 sans erreur PHP', home.status === 200 && !phpErr(home.text), String(home.status));
  ok('HTML en UTF-8 (en-tête ou meta)', /utf-8/i.test(home.headers.get('content-type') || '') || /<meta charset="utf-8">/i.test(home.text));
  if (HOST) {
    const siteJson = await fs.readFile(path.join(siteDir, 'site.json'), 'utf8').catch(() => '');
    const siteTitle = /"name":\s*"([^"]+)"/.exec(siteJson)?.[1];
    ok(`Page d'accueil du bon site (${siteTitle || siteName})`, !siteTitle || home.text.includes(siteTitle));
  }

  // Statique d'abord : premier passage par PHP (écrit cache/), deuxième servi par Apache seul, cookie → PHP.
  if (staticRoutes.length) {
    const { route, file } = staticRoutes[0];
    const first = await get(route);
    ok(`Statique ${route} : premier passage rendu par PHP (X-SL-Static: miss)`, first.status === 200 && first.headers.get('x-sl-static') === 'miss', first.headers.get('x-sl-static') || 'absent');
    let written = false; try { await fs.access(path.join(work, file)); written = true; } catch { /* non écrit */ }
    ok(`Statique ${route} : fichier ${file} écrit par PHP`, written);
    const second = await get(route);
    const byApache = second.status === 200 && !second.headers.has('x-sl-static') && second.headers.has('last-modified');
    ok(`Statique ${route} : deuxième passage servi par Apache sans PHP (Last-Modified, pas de X-SL-Static)`, byApache, second.headers.keys().join(','));
    ok(`Statique ${route} : contenu identique à la version PHP`, second.text.replace(/\s+/g, ' ') === first.text.replace(/\s+/g, ' '));
    ok(`Statique ${route} : Content-Type text/html`, /text\/html/.test(second.headers.get('content-type') || ''));
    const withCookie = await get(route, { cookie: 'sl_c=1' });
    ok(`Statique ${route} : visiteur avec cookie → rendu par PHP (pas de Last-Modified de fichier)`, withCookie.status === 200 && !withCookie.headers.has('last-modified') && /<nav/i.test(withCookie.text), withCookie.headers.keys().join(','));
    const post = await get(route, { method: 'POST', body: 'a=1', headers: { 'content-type': 'application/x-www-form-urlencoded' } });
    ok(`Statique ${route} : POST ne reçoit pas le fichier de cache`, post.headers.has('x-sl-static') || post.status !== 200 || !post.headers.has('last-modified'));
  } else ok('Au moins une route statique dans .htaccess', false, 'aucune');

  // Jamais servis directement.
  const pages = (await fs.readdir(path.join(siteDir, 'pages')).catch(() => [])).filter(f => f.endsWith('.php'));
  const comps = (await fs.readdir(path.join(siteDir, 'components')).catch(() => [])).filter(f => f.endsWith('.php'));
  const hidden = [`${prefix}/lib/render.php`, `${prefix}/lib/images.php`, `${prefix}/lib/segments.php`, `${prefix}/data/.htaccess`, `${prefix}/pages/${pages[0]}`, `${prefix}/components/${comps[0]}`, `${prefix}/custom/.htaccess`, `${prefix}/.env`, `${prefix}/.htaccess`, `${prefix}/manifest.sha256.json`, '/.htaccess', '/.env'];
  try { await fs.access(path.join(siteDir, 'data', 'products.json')); hidden.push(`${prefix}/data/products.json`); } catch { /* pas de boutique */ }
  if (prefix) hidden.push(`${prefix}/index.php`, '/sites/'); // les assets d'un site restent lisibles par leur chemin sous sites/ : publics de toute façon
  for (const p of [...new Set(hidden)]) {
    const r = await get(p);
    ok(`Interdit ${p} → ${r.status}`, (r.status === 403 || r.status === 404) && !/<\?php|ADMIN_TOKEN|DEPLOY_SECRET/.test(r.text), String(r.status));
  }
  const listing = await get('/assets/');
  ok('Pas de listage de /assets/', listing.status !== 200 || !/Index of/i.test(listing.text), String(listing.status));

  // Assets : types MIME, cache navigateur, compression.
  const css = /href="(\/assets\/site\.css[^"]*)"/.exec(home.text)?.[1];
  const cssR = css ? await get(css, { headers: { 'accept-encoding': 'gzip' } }) : null;
  ok('CSS servie (200, text/css)', cssR && cssR.status === 200 && /text\/css/.test(cssR.headers.get('content-type') || ''), css ? `${css} → ${cssR.status}` : 'aucune');
  ok('CSS : Cache-Control long (versionnée par ?v=)', cssR && /max-age=\d{6,}/.test(cssR.headers.get('cache-control') || ''), cssR?.headers.get('cache-control') || 'absent');
  ok('CSS : compressée (Content-Encoding gzip)', cssR && cssR.headers.get('content-encoding') === 'gzip', cssR?.headers.get('content-encoding') || 'absent');
  const assets = await fs.readdir(path.join(siteDir, 'assets'));
  const webp = assets.find(f => f.endsWith('.webp')), svg = assets.find(f => f.endsWith('.svg'));
  if (webp) { const r = await get('/assets/' + webp); ok(`WebP servi en image/webp (${webp})`, r.status === 200 && /image\/webp/.test(r.headers.get('content-type') || ''), `${r.status} ${r.headers.get('content-type') || ''}`); ok('WebP : Cache-Control', /max-age=\d+/.test(r.headers.get('cache-control') || ''), r.headers.get('cache-control') || 'absent'); }
  if (svg) { const r = await get('/assets/' + svg); ok(`SVG servi en image/svg+xml (${svg})`, r.status === 200 && /image\/svg\+xml/.test(r.headers.get('content-type') || ''), `${r.status} ${r.headers.get('content-type') || ''}`); }
  const idx = await get('/assets/intent-index.json');
  ok('Index d\'intention servi en JSON', idx.status === 200 && /json/.test(idx.headers.get('content-type') || ''), `${idx.status} ${idx.headers.get('content-type') || ''}`);

  // Routes réécrites vers index.php.
  const nav = new Set([...home.text.matchAll(/href="(\/[a-z0-9\-\/]*)"/g)].map(m => m[1].replace(/\/+$/, '') || '/'));
  for (const r of nav) { const res = await get(r); ok(`Route ${r} → ${res.status}`, res.status === 200 && !phpErr(res.text)); }
  const nf = await get('/page-inexistante-xyz');
  ok('Route inconnue → 404 dans la mise en page', nf.status === 404 && /<nav/i.test(nf.text), String(nf.status));
  const lisible = await get('/lisible/');
  ok('Version texte /lisible/ → 200', lisible.status === 200 && !phpErr(lisible.text), String(lisible.status));
  for (const [p, type] of [['/site.json', /json/], ['/llms.txt', /text\/plain/]]) {
    try { await fs.access(path.join(siteDir, p.slice(1))); const r = await get(p); ok(`${p} → 200 (${type.source})`, r.status === 200 && type.test(r.headers.get('content-type') || ''), `${r.status} ${r.headers.get('content-type') || ''}`); } catch { /* agents désactivés */ }
  }
  try {
    const products = JSON.parse(await fs.readFile(path.join(siteDir, 'data', 'products.json'), 'utf8'));
    const r = await get('/produit/' + products[0].id);
    ok(`Route dynamique /produit/${products[0].id} → 200`, r.status === 200 && !phpErr(r.text), String(r.status));
  } catch { /* pas de boutique */ }
  try {
    await fs.access(path.join(siteDir, 'sw.js'));
    const sw = await get('/sw.js'); ok('Service worker servi (javascript)', sw.status === 200 && /javascript/.test(sw.headers.get('content-type') || ''), `${sw.status} ${sw.headers.get('content-type') || ''}`);
    const mf = await get('/manifest.webmanifest'); ok('manifest.webmanifest servi (manifest+json)', mf.status === 200 && /manifest\+json|json/.test(mf.headers.get('content-type') || ''), `${mf.status} ${mf.headers.get('content-type') || ''}`);
    const off = await get('/offline.html'); ok('offline.html servi', off.status === 200, String(off.status));
  } catch { /* hors ligne désactivé */ }

  // Bancs HTTP habituels contre Apache (site seul : les bancs ne savent pas fixer l'en-tête Host).
  if (!flags.includes('--no-benches') && !HOST) {
    const run = (script) => new Promise(resolve => {
      const p = spawn(process.execPath, [path.join(ROOT, 'scripts', script), work, base], { stdio: ['ignore', 'pipe', 'pipe'] });
      let out = ''; p.stdout.on('data', d => { out += d; }); p.stderr.on('data', d => { out += d; });
      p.on('close', code => resolve({ code, out }));
    });
    const site = await run('verify-php-site.mjs');
    const siteSum = site.out.match(/\{"site".*\}/)?.[0] || '';
    ok('Banc site sous Apache', site.code === 0, siteSum + ' ' + site.out.split('\n').filter(l => l.startsWith('FAIL')).join(' | ').slice(0, 600));
    if (siteSum) console.log('  banc site :', siteSum);
    let shop = null;
    try { await fs.access(path.join(work, 'data', 'products.json')); shop = await run('verify-shop.mjs'); } catch { /* pas de boutique */ }
    if (shop) {
      const shopSum = shop.out.match(/\{"site".*\}/)?.[0] || '';
      ok('Banc boutique sous Apache', shop.code === 0, shopSum + ' ' + shop.out.split('\n').filter(l => l.startsWith('FAIL')).join(' | ').slice(0, 600));
      if (shopSum) console.log('  banc boutique :', shopSum);
    }
  }

  // E-mails produits pendant les bancs (formulaire de contact, commandes), lus dans le puits de courrier.
  if (!flags.includes('--no-benches') && !HOST) {
    const log = await fs.readFile(path.join(work, 'data', 'mail.log'), 'utf8').catch(() => '');
    const mails = log.split('--- fin ---').map(m => m.trim()).filter(Boolean);
    ok('E-mails : au moins un message envoyé par mail()', mails.length > 0, String(mails.length));
    const contact = mails.find(m => /^Subject: .*Nouveau message/m.test(m));
    ok('E-mail du formulaire : présent, To et Reply-To du visiteur', !!contact && /^To: .+@.+/m.test(contact) && /^Reply-To: .+@.+/m.test(contact), contact ? contact.split('\n').slice(0, 8).join(' | ') : 'absent');
    ok('E-mail du formulaire : From au domaine du site, MIME et UTF-8 déclarés', !!contact && /^From: .*no-reply@127\.0\.0\.1/m.test(contact) && /^MIME-Version: 1\.0/m.test(contact) && /^Content-Type: text\/plain; charset=UTF-8/m.test(contact));
    ok('E-mail du formulaire : accents intacts dans le corps', !!contact && /éàç/.test(contact));
    ok('E-mails : aucun sujet avec caractères non ASCII bruts', mails.every(m => { const s = /^Subject: (.*)$/m.exec(m)?.[1] || ''; return !/[^\x20-\x7e]/.test(s); }));
    let orderMail = null; try { await fs.access(path.join(work, 'data', 'products.json')); orderMail = mails.filter(m => /^Subject: .*[Cc]ommande/m.test(m)); } catch { /* pas de boutique */ }
    if (orderMail) ok('E-mails de commande : marchand et client', orderMail.length >= 2 && orderMail.some(m => /^Subject: Votre commande/m.test(m)), String(orderMail.length));
  }

  // Back-office : jeton requis, session ensuite.
  const anon = await get('/_admin');
  ok('/_admin sans jeton → 401', anon.status === 401, String(anon.status));
  const login = await get('/_admin?token=' + ADMIN);
  const cookie = login.headers.getSetCookie().map(c => c.split(';')[0]).filter(Boolean).reverse().find(c => /PHPSESSID|sl_s/i.test(c)) || '';
  const admin = await get('/_admin', { cookie });
  ok('/_admin avec jeton → session puis 200', login.status === 303 && admin.status === 200 && !phpErr(admin.text), `${login.status} puis ${admin.status}`);
  const integrity = await get('/_admin?tab=integrity', { cookie });
  ok('Onglet intégrité : aucun fichier modifié', integrity.status === 200 && !/modifié|manquant/i.test(integrity.text.replace(/0 (fichier|fichiers) (modifié|manquant)[^<]*/g, '')), integrity.status);

  // Déploiement signé : même site redéployé via /_deploy, données et .env conservés.
  if (project) {
    let dataBefore = []; try { dataBefore = (await fs.readdir(path.join(work, 'data'))).filter(f => !['.htaccess', '.gitkeep', 'products.json'].includes(f)); } catch { /* */ }
    let dep = '';
    try { dep = execFileSync(process.execPath, [path.join(ROOT, 'bin', 'sitec.js'), 'deploy', project, '--to', base, '--secret', SECRET], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); ok('sitec deploy vers Apache (/_deploy)', true); }
    catch (e) { ok('sitec deploy vers Apache (/_deploy)', false, (e.stdout || '') + (e.stderr || e.message)); }
    if (dep) console.log('  ' + dep.trim().split('\n').slice(-1)[0]);
    let after = { status: 0, text: '' };
    for (let i = 0; i < 10; i++) { try { after = await get('/'); break; } catch (e) { after = { status: 0, text: String(e) }; await new Promise(r => setTimeout(r, 500)); } }
    ok('Site répond après déploiement', after.status === 200 && !phpErr(after.text), String(after.status) + ' ' + after.text.slice(0, 200));
    const env = await fs.readFile(path.join(work, '.env'), 'utf8');
    ok('.env conservé par le déploiement', env.includes('DEPLOY_SECRET=' + SECRET));
    let dataAfter = []; try { dataAfter = (await fs.readdir(path.join(work, 'data'))).filter(f => !['.htaccess', '.gitkeep', 'products.json'].includes(f)); } catch { /* */ }
    ok('Données conservées par le déploiement', dataBefore.every(f => dataAfter.includes(f)), `${dataBefore.join(',')} → ${dataAfter.join(',')}`);
    const bad = await get('/_deploy', { method: 'POST', body: '{}', headers: { 'content-type': 'application/json', 'x-sl-signature': 'nope', 'x-sl-timestamp': String(Math.floor(Date.now() / 1000)) } });
    ok('/_deploy refuse une signature fausse', bad.status === 401 || bad.status === 403 || bad.status === 400, String(bad.status));
  }
} catch (e) {
  ok('exécution du banc', false, e.stack || e.message);
} finally {
  if (checks.some(c => !c.pass)) { try { console.log('--- journal Apache (fin) ---\n' + docker(['logs', '--tail', '25', name]).trim()); } catch { /* conteneur absent */ } }
  if (flags.includes('--keep')) console.log(`conteneur ${name} laissé en route sur ${base}, dossier ${work}`);
  else { try { docker(['stop', name]); } catch { /* déjà arrêté */ } await fs.rm(work, { recursive: true, force: true }).catch(() => {}); }
}

const passed = checks.filter(c => c.pass).length;
for (const c of checks) console.log(`${c.pass ? 'OK  ' : 'FAIL'} ${c.name}${c.detail && !c.pass ? ' — ' + c.detail : ''}`);
console.log(JSON.stringify({ apache: path.basename(project || path.dirname(dist)) + (HOST ? ' @ ' + HOST : ''), passed, total: checks.length }));
process.exit(passed === checks.length ? 0 : 1);
