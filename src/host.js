// Couche hôte : plusieurs sites sur un même hébergement (routage par domaine) et déploiement signé.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import { parse } from 'yaml';
import { loadProject } from './load.js';
import { validateProject } from './validate.js';
import { emit } from './emit/index.js';
import { formatErrors } from './errors.js';

const MIME = { css: 'text/css', js: 'application/javascript', json: 'application/json', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', svg: 'image/svg+xml', webp: 'image/webp', avif: 'image/avif', ico: 'image/x-icon', woff: 'font/woff', woff2: 'font/woff2', txt: 'text/plain', html: 'text/html', webmanifest: 'application/manifest+json', pdf: 'application/pdf', mp4: 'video/mp4' };

/** hosts.yaml : sites: [ { domain, aliases: [], project } ]. Chaque projet est compilé dans dist/sites/<nom>. */
export async function buildHost(hostDir, catalog, { draft = false } = {}) {
  const root = path.resolve(hostDir);
  const cfg = parse(await fs.readFile(path.join(root, 'hosts.yaml'), 'utf8'));
  if (!cfg?.sites?.length) throw new Error('hosts.yaml : liste « sites » attendue ({ domain, aliases, project })');
  const out = path.join(root, 'dist');
  await fs.mkdir(path.join(out, 'sites'), { recursive: true });
  const sites = [];
  for (const s of cfg.sites) {
    if (!s.domain || !s.project) throw new Error('hosts.yaml : chaque site a « domain » et « project »');
    const projRoot = path.resolve(root, s.project);
    const name = (s.name || path.basename(projRoot)).replace(/[^a-z0-9-]/gi, '-').toLowerCase();
    const project = await loadProject(projRoot);
    const errors = validateProject(project, catalog);
    if (errors.length) { process.stdout.write(formatErrors(errors, { json: true, root: projRoot })); throw new Error(`${s.domain} : erreurs de validation`); }
    const report = await emit(project, catalog, path.join(out, 'sites', name));
    sites.push({ name, domain: s.domain.toLowerCase(), aliases: (s.aliases || []).map(a => a.toLowerCase()), staticRoutes: report.staticRoutes, pages: report.pages });
  }
  const hostMap = {}; for (const s of sites) { hostMap[s.domain] = s.name; for (const a of s.aliases) hostMap[a] = s.name; }
  const esc = d => d.replace(/\./g, '\\.');
  const passthrough = '(sw\\.js|manifest\\.webmanifest|offline\\.html)$';
  let ht = `Options -Indexes\nRewriteEngine On\n# Généré par sitec host : un hébergement, plusieurs sites, choisis par le domaine.\n`;
  for (const s of sites) {
    const hosts = [s.domain, ...s.aliases].map(esc).join('|');
    ht += `\n# ${s.domain} → sites/${s.name}\n`;
    for (const r of s.staticRoutes) {
      ht += `RewriteCond %{HTTP_HOST} ^(${hosts})$ [NC]\nRewriteCond %{REQUEST_METHOD} GET\nRewriteCond %{HTTP_COOKIE} ^$\nRewriteCond %{DOCUMENT_ROOT}/sites/${s.name}/${r.file} -f\nRewriteRule ^${r.route === '/' ? '' : r.route.slice(1).replace(/[.+?^${}()|[\]\\]/g, '\\$&')}$ sites/${s.name}/${r.file} [L]\n`;
    }
    // Fichiers publics du site (assets, cache, service worker…) : une seule condition d'URI ; avec [OR], Apache lierait la condition de domaine à la suivante et les assets ne seraient plus servis.
    ht += `RewriteCond %{HTTP_HOST} ^(${hosts})$ [NC]\nRewriteCond %{REQUEST_URI} ^/((assets|cache)/|${passthrough})\nRewriteRule ^(.*)$ sites/${s.name}/$1 [L]\n`;
  }
  ht += `\n# Tout le reste passe par le routeur hôte.\nRewriteCond %{REQUEST_URI} !^/sites/\nRewriteRule ^ index.php [L]\n`;
  await fs.writeFile(path.join(out, '.htaccess'), ht);
  await fs.writeFile(path.join(out, 'index.php'), `<?php
declare(strict_types=1);
// Généré par sitec host. Routeur par domaine : chaque site vit dans sites/<nom>/ avec ses propres données et son .env.
$map = ${JSON.stringify(hostMap).replace(/"/g, "'").replace(/:/g, ' => ').replace(/^\{/, '[').replace(/\}$/, ']')};
$default = '${sites[0].name}';
$host = strtolower(preg_replace('/:\\d+$/', '', (string)($_SERVER['HTTP_HOST'] ?? '')));
$dir = $map[$host] ?? $default;
$_SERVER['SL_SITE'] = $dir;
$base = __DIR__ . '/sites/' . $dir;
$path = rtrim(parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/', '/') ?: '/';
// Serveur de développement (php -S) : fichiers publics du site servis ici ; sous Apache, .htaccess le fait sans PHP.
if (PHP_SAPI === 'cli-server' && (str_starts_with($path, '/assets/') || str_starts_with($path, '/cache/') || in_array($path, ['/sw.js', '/manifest.webmanifest', '/offline.html'], true))) {
    $f = realpath($base . $path);
    if ($f && str_starts_with($f, realpath($base)) && is_file($f)) { $ext = strtolower(pathinfo($f, PATHINFO_EXTENSION)); $mime = ${JSON.stringify(MIME).replace(/"/g, "'").replace(/:/g, ' => ').replace(/^\{/, '[').replace(/\}$/, ']')}; header('Content-Type: ' . ($mime[$ext] ?? 'application/octet-stream')); readfile($f); exit; }
    http_response_code(404); exit;
}
require $base . '/index.php';
`);
  await fs.writeFile(path.join(out, 'README.txt'), `Hébergement multi-sites généré par sitec host.\n\n${sites.map(s => `${[s.domain, ...s.aliases].join(', ')}  →  sites/${s.name}/   (données : sites/${s.name}/data, secrets : sites/${s.name}/.env)`).join('\n')}\n\nDéposer le contenu de dist/ à la racine web ; faire pointer tous les domaines dessus. Test local : php -S 127.0.0.1:8080 index.php puis en-tête Host.\n`);
  return { sites, out };
}

/** Pousse un dist/ compilé vers /_deploy d'un site : envois signés par lot, puis commit vérifié contre le manifeste. */
export async function deploy(distDir, { to, secret, batchBytes = 3 * 1024 * 1024, log = () => {} }) {
  const root = path.resolve(distDir);
  const manifestPath = path.join(root, 'manifest.sha256.json');
  const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
  const release = 'r-' + new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14) + '-' + crypto.randomBytes(2).toString('hex');
  const url = to.replace(/\/+$/, '').replace(/\/_deploy$/, '') + '/_deploy';
  const send = async (payload) => {
    const body = zlib.gzipSync(Buffer.from(JSON.stringify(payload)));
    const ts = String(Math.floor(Date.now() / 1000));
    const sig = crypto.createHmac('sha256', secret).update(ts + '\n' + crypto.createHash('sha256').update(body).digest('hex')).digest('hex');
    const res = await fetch(url, { method: 'POST', body, headers: { 'Content-Type': 'application/octet-stream', 'Connection': 'close', 'X-SL-Timestamp': ts, 'X-SL-Signature': sig } });
    const text = await res.text(); let json; try { json = JSON.parse(text); } catch { json = { error: text.slice(0, 300) }; }
    if (!res.ok || json.error) throw new Error(`${url} → ${res.status} ${json.error || text.slice(0, 200)}`);
    return json;
  };
  // Lots de fichiers (le manifeste lui-même voyage aussi, il sert à l'intégrité côté serveur).
  const files = [...Object.keys(manifest), 'manifest.sha256.json'];
  let batch = {}, size = 0, sent = 0, batches = 0;
  for (const rel of files) {
    const buf = await fs.readFile(path.join(root, rel));
    if (rel !== 'manifest.sha256.json' && crypto.createHash('sha256').update(buf).digest('hex') !== manifest[rel]) throw new Error(`${rel} ne correspond pas au manifeste : recompiler avant de déployer`);
    batch[rel] = buf.toString('base64'); size += buf.length; sent++;
    if (size >= batchBytes) { await send({ release, files: batch }); batches++; log(`  lot ${batches} : ${Object.keys(batch).length} fichiers`); batch = {}; size = 0; }
  }
  if (Object.keys(batch).length) { await send({ release, files: batch }); batches++; log(`  lot ${batches} : ${Object.keys(batch).length} fichiers`); }
  const result = await send({ release, commit: true, manifest });
  return { release, files: sent, batches, removed: result.removed || [] };
}
