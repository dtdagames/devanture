// Déploiement signé (/_deploy) : le compilateur pousse une version compilée, le serveur la vérifie et la met en place.
// Le site reste immuable : seuls data/, cache/ et .env survivent ; tout le reste est remplacé d'après le manifeste d'empreintes.
export const DEPLOY_PHP = `<?php
declare(strict_types=1);
// Généré par sitec. Protocole : requêtes POST gzip(JSON), en-têtes X-SL-Timestamp et X-SL-Signature = HMAC-SHA256(ts . "\\n" . sha256(corps), DEPLOY_SECRET).
// Plusieurs envois { release, files: { chemin: base64 } } puis un { release, commit: true, manifest: { chemin: sha256 } }.

function sl_deploy_handle(): void {
    // L'atelier navigateur déploie depuis une autre origine : l'authentification est la signature, pas l'origine.
    header('Access-Control-Allow-Origin: *'); header('Access-Control-Allow-Methods: POST, OPTIONS'); header('Access-Control-Allow-Headers: Content-Type, X-SL-Timestamp, X-SL-Signature'); header('Access-Control-Max-Age: 600');
    if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') { http_response_code(204); exit; }
    header('Content-Type: application/json; charset=UTF-8');
    $secret = sl_env('DEPLOY_SECRET');
    if ($secret === '') { http_response_code(503); echo json_encode(['error' => 'Déploiement désactivé : définir DEPLOY_SECRET dans .env']); exit; }
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') { http_response_code(405); echo json_encode(['error' => 'POST attendu']); exit; }
    $ts = (string)($_SERVER['HTTP_X_SL_TIMESTAMP'] ?? ''); $sig = (string)($_SERVER['HTTP_X_SL_SIGNATURE'] ?? '');
    $body = (string)file_get_contents('php://input');
    if (!preg_match('/^\\d{10}$/', $ts) || abs(time() - (int)$ts) > 300) { http_response_code(403); echo json_encode(['error' => 'horodatage absent ou trop ancien']); exit; }
    $expected = hash_hmac('sha256', $ts . "\\n" . hash('sha256', $body), $secret);
    if (!hash_equals($expected, $sig)) { http_response_code(403); echo json_encode(['error' => 'signature invalide']); exit; }
    $json = @gzdecode($body); $payload = $json !== false ? json_decode($json, true) : null;
    if (!is_array($payload) || !preg_match('/^[a-z0-9-]{4,64}$/', (string)($payload['release'] ?? ''))) { http_response_code(400); echo json_encode(['error' => 'charge utile illisible']); exit; }
    $root = realpath(__DIR__ . '/..'); $stage = $root . '/.release-' . $payload['release'];
    $okPath = fn(string $rel): bool => $rel !== '' && !preg_match('#(^|/)\\.\\.(/|$)|^/|^data/|^cache/|^\\.env$|^\\.release-|\\\\\\\\#', $rel);

    if (!empty($payload['files']) && is_array($payload['files'])) {
        $n = 0;
        foreach ($payload['files'] as $rel => $b64) {
            if (!$okPath((string)$rel)) { http_response_code(400); echo json_encode(['error' => "chemin refusé : $rel"]); exit; }
            $bin = base64_decode((string)$b64, true); if ($bin === false) { http_response_code(400); echo json_encode(['error' => "contenu illisible : $rel"]); exit; }
            $dest = $stage . '/' . $rel; @mkdir(dirname($dest), 0775, true);
            if (file_put_contents($dest, $bin) === false) { http_response_code(500); echo json_encode(['error' => "écriture impossible : $rel"]); exit; }
            $n++;
        }
        echo json_encode(['ok' => true, 'staged' => $n]); exit;
    }
    if (!empty($payload['commit'])) {
        $manifest = $payload['manifest'] ?? null;
        if (!is_array($manifest) || !$manifest || !is_dir($stage)) { http_response_code(400); echo json_encode(['error' => 'manifeste absent ou rien de préparé']); exit; }
        // 1. La version préparée doit correspondre exactement au manifeste : rien de plus, rien de moins, mêmes empreintes.
        foreach ($manifest as $rel => $hash) {
            if (!$okPath((string)$rel)) { http_response_code(400); echo json_encode(['error' => "chemin refusé : $rel"]); exit; }
            $f = $stage . '/' . $rel;
            if (!is_file($f)) { http_response_code(400); echo json_encode(['error' => "fichier manquant dans l'envoi : $rel"]); exit; }
            if (hash_file('sha256', $f) !== $hash) { http_response_code(400); echo json_encode(['error' => "empreinte différente : $rel"]); exit; }
        }
        foreach (sl_deploy_list($stage) as $rel) if (!isset($manifest[$rel]) && $rel !== 'manifest.sha256.json') { http_response_code(400); echo json_encode(['error' => "fichier hors manifeste : $rel"]); exit; }
        // 2. Mise en place : écriture par renommage fichier à fichier, puis suppression de ce qui n'est plus dans la version.
        $written = 0;
        foreach (array_keys($manifest) as $rel) { $dest = $root . '/' . $rel; @mkdir(dirname($dest), 0775, true); if (!@rename($stage . '/' . $rel, $dest)) { @copy($stage . '/' . $rel, $dest); } $written++; }
        if (is_file($stage . '/manifest.sha256.json')) @rename($stage . '/manifest.sha256.json', $root . '/manifest.sha256.json');
        $removed = [];
        foreach (sl_deploy_list($root) as $rel) {
            if (isset($manifest[$rel]) || $rel === 'manifest.sha256.json' || $rel === '.env' || str_starts_with($rel, 'data/') || str_starts_with($rel, 'cache/') || str_starts_with($rel, '.release-')) continue;
            @unlink($root . '/' . $rel); $removed[] = $rel;
        }
        foreach (glob($root . '/cache/*.html') ?: [] as $c) @unlink($c);
        sl_deploy_rmdir($stage);
        if (function_exists('sl_store_append')) sl_store_append('events', ['at' => date('c'), 'name' => 'admin_deploy', 'data' => ['release' => $payload['release'], 'files' => $written, 'removed' => count($removed)], 'segments' => []]);
        echo json_encode(['ok' => true, 'release' => $payload['release'], 'files' => $written, 'removed' => $removed]); exit;
    }
    http_response_code(400); echo json_encode(['error' => 'ni files ni commit']); exit;
}
function sl_deploy_list(string $dir): array {
    $out = []; if (!is_dir($dir)) return $out;
    $it = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($dir, FilesystemIterator::SKIP_DOTS));
    foreach ($it as $f) $out[] = str_replace('\\\\', '/', substr($f->getPathname(), strlen($dir) + 1));
    return $out;
}
function sl_deploy_rmdir(string $dir): void {
    if (!is_dir($dir)) return;
    $it = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($dir, FilesystemIterator::SKIP_DOTS), RecursiveIteratorIterator::CHILD_FIRST);
    foreach ($it as $f) $f->isDir() ? @rmdir($f->getPathname()) : @unlink($f->getPathname());
    @rmdir($dir);
}
`;

/** Service worker : assets en cache-first (versionnés), navigation réseau d'abord, repli sur la version texte puis offline.html. */
export function buildServiceWorker({ version, shell }) {
  return `/* Généré par sitec. Hors ligne : assets et versions texte des pages. */
var V='sl-${version}'; var SHELL=${JSON.stringify(shell)};
self.addEventListener('install',function(e){ e.waitUntil(caches.open(V).then(function(c){ return c.addAll(SHELL); }).then(function(){ return self.skipWaiting(); })); });
self.addEventListener('activate',function(e){ e.waitUntil(caches.keys().then(function(ks){ return Promise.all(ks.filter(function(k){ return k!==V; }).map(function(k){ return caches.delete(k); })); }).then(function(){ return self.clients.claim(); })); });
self.addEventListener('fetch',function(e){
  var req=e.request; if(req.method!=='GET') return; var url=new URL(req.url); if(url.origin!==location.origin) return;
  if(url.pathname.indexOf('/assets/')===0||url.pathname.indexOf('/lisible/')===0||url.pathname==='/offline.html'){ e.respondWith(caches.match(req,{ignoreSearch:false}).then(function(r){ return r||fetch(req).then(function(res){ if(res.ok){ var copy=res.clone(); caches.open(V).then(function(c){ c.put(req,copy); }); } return res; }); })); return; }
  if(req.mode==='navigate'){ e.respondWith(fetch(req).catch(function(){ var p=url.pathname.replace(/\\/+$/,''); return caches.match('/lisible'+(p===''?'/':p)).then(function(r){ return r||caches.match('/offline.html'); }); })); }
});
`;
}

export function buildOfflinePage(site, pages) {
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Hors ligne · ${esc(site.name)}</title><link rel="stylesheet" href="/assets/site.css"></head><body><main class="container" style="padding:40px 16px"><h1>${esc(site.name)}</h1><p>Vous êtes hors ligne. Les versions texte de ces pages restent consultables :</p><ul>${pages.map(p => `<li><a href="/lisible${p.route === '/' ? '/' : p.route}">${esc(p.title)}</a></li>`).join('')}</ul>${site.contact?.phone ? `<p>Téléphone : <a href="tel:${esc(site.contact.phone.replace(/\s/g, ''))}">${esc(site.contact.phone)}</a></p>` : ''}</main></body></html>\n`;
}

export function buildWebManifest(site, themeColor) {
  return JSON.stringify({ name: site.name, short_name: site.offline?.short_name || site.name.slice(0, 12), start_url: '/', display: 'browser', background_color: '#ffffff', theme_color: themeColor, lang: site.locale || 'fr-FR', icons: [] }, null, 1);
}
