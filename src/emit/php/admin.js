// Back-office compilé : lecture et actions sur les données d'exploitation seulement (messages, commandes, stock, événements).
// Le contenu du site ne s'édite pas ici : il vit dans le DSL et se recompile.
export const ADMIN_PHP = `<?php
declare(strict_types=1);
// Généré par sitec. Route /_admin, protégée par ADMIN_TOKEN (.env). Sans jeton configuré : 503.

function admin_guard(): void {
    sl_session();
    $token = sl_env('ADMIN_TOKEN');
    if ($token === '') { http_response_code(503); header('Content-Type: text/plain; charset=UTF-8'); echo "Back-office désactivé : définir ADMIN_TOKEN dans .env"; exit; }
    if (!empty($_SESSION['admin_ok']) && hash_equals($token, (string)$_SESSION['admin_ok'])) return;
    $given = (string)($_GET['token'] ?? $_POST['token'] ?? '');
    if ($given !== '' && hash_equals($token, $given)) { session_regenerate_id(true); $_SESSION['admin_ok'] = $token; header('Location: /_admin', true, 303); exit; }
    if ($given !== '' && !sl_rate_limit('admin_login', 10, 900)) { http_response_code(429); echo 'Trop de tentatives.'; exit; }
    http_response_code(401); header('Content-Type: text/html; charset=UTF-8');
    echo '<!doctype html><meta charset="utf-8"><title>Accès</title><body style="font:16px system-ui;max-width:420px;margin:80px auto;padding:0 16px"><h1>Back-office</h1><form method="post"><p><label>Jeton d\\'accès<br><input type="password" name="token" style="width:100%;padding:8px" autofocus></label></p><button style="padding:8px 16px">Entrer</button></form>' . ($given !== '' ? '<p style="color:#b00">Jeton refusé.</p>' : '') . '</body>';
    exit;
}

/** Atelier servi par le site : fichiers de lib/studio, derrière le jeton d'administration. */
function sl_studio_serve(string $path): void {
    $dir = __DIR__ . '/studio';
    if (!is_dir($dir)) { http_response_code(404); header('Content-Type: text/plain; charset=UTF-8'); echo "Atelier non compilé dans ce site (site.studio: { enabled: true })."; exit; }
    sl_session(); admin_guard();
    $raw = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
    if ($raw === '/_studio') { header('Location: /_studio/', true, 302); exit; }
    $rel = $raw === '/_studio/' ? 'index.html' : substr($raw, 9);
    if (!preg_match('/^[a-z0-9.-]+$/i', $rel) || !is_file("$dir/$rel")) { http_response_code(404); exit; }
    $mime = ['html' => 'text/html; charset=UTF-8', 'js' => 'application/javascript; charset=UTF-8', 'json' => 'application/json; charset=UTF-8', 'css' => 'text/css; charset=UTF-8'];
    header('Content-Type: ' . ($mime[strtolower(pathinfo($rel, PATHINFO_EXTENSION))] ?? 'application/octet-stream')); header('Cache-Control: no-store');
    readfile("$dir/$rel"); exit;
}
function admin_csrf(): string { return csrf_token(); }
function admin_check_csrf(): void { if (!hash_equals($_SESSION['csrf'] ?? '', (string)($_POST['_csrf'] ?? ''))) { http_response_code(400); echo 'Session expirée.'; exit; } }
function admin_log(string $action, array $data = []): void { sl_store_append('events', ['at' => date('c'), 'name' => 'admin_' . $action, 'data' => $data, 'segments' => []]); }

function admin_layout(string $title, string $body, string $tab): void {
    global $site;
    $tabs = function_exists('shop_products') ? [['', 'Tableau de bord'], ['messages', 'Messages'], ['orders', 'Commandes'], ['stock', 'Stock'], ['events', 'Mesures'], ['integrity', 'Intégrité']] : [['', 'Tableau de bord'], ['messages', 'Messages'], ['events', 'Mesures'], ['integrity', 'Intégrité']];
    header('Content-Type: text/html; charset=UTF-8');
    echo '<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>' . e($title) . ' · ' . e($site['name']) . '</title><link rel="stylesheet" href="/assets/site.css"><style>
    .adm{max-width:1100px;margin:0 auto;padding:20px 16px 60px}.adm h1{font-size:1.4rem;margin:0 0 4px}.adm-tabs{display:flex;gap:6px;flex-wrap:wrap;margin:14px 0 22px}.adm-tabs a{padding:7px 12px;border:1px solid var(--color-border);border-radius:999px;text-decoration:none;color:var(--color-fg)}.adm-tabs a.on{background:var(--color-primary);color:var(--color-primary-fg);border-color:var(--color-primary)}
    .adm table{width:100%;border-collapse:collapse;font-size:.92rem}.adm th,.adm td{padding:8px;border-bottom:1px solid var(--color-border);text-align:left;vertical-align:top}.adm th{background:var(--color-surface)}
    .adm .kpis{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));margin-bottom:22px}.adm .kpi{background:var(--color-surface);border:1px solid var(--color-border);border-radius:var(--radius);padding:14px}.adm .kpi b{display:block;font-size:1.6rem;color:var(--color-primary)}
    .adm form.inline{display:inline;margin:0}.adm .btn{padding:6px 12px;font-size:.88rem}.adm select,.adm input[type=number]{padding:5px 8px;font:inherit;border:1px solid var(--color-border);border-radius:6px}
    .adm .muted{color:var(--color-muted)}.adm .tag{display:inline-block;padding:2px 8px;border-radius:999px;background:var(--color-surface);font-size:.8rem}.adm pre{white-space:pre-wrap;font-size:.85rem}
    </style></head><body><div class="adm"><h1>' . e($site['name']) . ' · back-office</h1><p class="muted">Les données d\\'exploitation seulement. Le contenu du site se modifie dans le DSL puis se recompile. <a href="/">Voir le site</a> · <a href="/_admin?logout=1">Quitter</a></p><nav class="adm-tabs">';
    foreach ($tabs as [$k, $label]) echo '<a href="/_admin' . ($k ? '/' . $k : '') . '"' . ($tab === $k ? ' class="on"' : '') . '>' . e($label) . '</a>';
    if (is_dir(__DIR__ . '/studio')) echo '<a href="/_studio/" title="Éditer la source du site et redéployer">Atelier ↗</a>';
    echo '</nav>' . $body . '</div></body></html>';
    exit;
}

function admin_csv(string $name, array $rows): void {
    header('Content-Type: text/csv; charset=UTF-8'); header('Content-Disposition: attachment; filename="' . $name . '-' . date('Ymd') . '.csv"');
    $out = fopen('php://output', 'w'); fwrite($out, "\\xEF\\xBB\\xBF");
    $keys = []; foreach ($rows as $r) foreach (array_keys($r) as $k) if (!in_array($k, $keys, true)) $keys[] = $k;
    fputcsv($out, $keys, ';');
    foreach ($rows as $r) fputcsv($out, array_map(fn($k) => is_array($r[$k] ?? null) ? json_encode($r[$k], JSON_UNESCAPED_UNICODE) : (string)($r[$k] ?? ''), $keys), ';');
    exit;
}

function admin_dispatch(string $path, array $site): void {
    sl_session();
    if (isset($_GET['logout'])) { unset($_SESSION['admin_ok']); header('Location: /_admin', true, 303); exit; }
    admin_guard();
    if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST' && isset($_POST['purge'])) { admin_check_csrf(); $n = 0; foreach (glob(__DIR__ . '/../cache/*.html') ?: [] as $f) { @unlink($f); $n++; } admin_log('cache_purge', ['files' => $n]); header('Location: /_admin', true, 303); exit; }
    $sub = trim(substr($path, 7), '/'); // après /_admin
    $csrf = admin_csrf();
    $shop = function_exists('shop_products');

    if ($sub === 'messages') {
        if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') { admin_check_csrf(); $id = (string)$_POST['id']; sl_store_update('messages', $id, fn($m) => array_merge($m, ['handled' => !empty($_POST['handled']), 'handled_at' => date('c')])); admin_log('message_handled', ['id' => $id]); header('Location: /_admin/messages', true, 303); exit; }
        $rows = array_reverse(sl_store_all('messages'));
        if (isset($_GET['csv'])) admin_csv('messages', $rows);
        $b = '<p><a class="btn btn-outline" href="/_admin/messages?csv=1">Exporter en CSV</a></p><table><tr><th>Date</th><th>Source</th><th>E-mail</th><th>Contenu</th><th>Traité</th></tr>';
        foreach ($rows as $m) { $fields = array_diff_key($m, array_flip(['id', 'at', 'source', 'ip', 'page', 'handled', 'handled_at', 'mail'])); $b .= '<tr><td>' . e(substr($m['at'], 0, 16)) . '<br><span class="muted">' . e($m['id'] ?? '') . '</span></td><td><span class="tag">' . e($m['source'] ?? 'form') . '</span></td><td>' . (isset($m['mail']) ? '<span class="tag">' . e($m['mail'] === 'sent' ? 'envoyé' : ($m['mail'] === 'failed' ? 'échec' : 'aucun')) . '</span>' : '') . '</td><td>'; foreach ($fields as $k => $v) $b .= '<b>' . e($k) . '</b> : ' . nl2br(e((string)$v)) . '<br>'; $b .= '</td><td><form class="inline" method="post"><input type="hidden" name="_csrf" value="' . e($csrf) . '"><input type="hidden" name="id" value="' . e($m['id'] ?? '') . '"><input type="hidden" name="handled" value="' . (empty($m['handled']) ? '1' : '') . '"><button class="btn ' . (empty($m['handled']) ? 'btn-outline' : '') . '">' . (empty($m['handled']) ? 'À traiter' : 'Traité ✔') . '</button></form></td></tr>'; }
        admin_layout('Messages', $b . '</table>' . (!$rows ? '<p class="muted">Aucun message.</p>' : ''), 'messages');
    }
    if ($sub === 'orders' && $shop) {
        if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
            admin_check_csrf(); $id = (string)$_POST['id']; $status = (string)$_POST['status'];
            if (in_array($status, ['pending', 'paid', 'confirmed', 'shipped', 'cancelled'], true)) {
                $o = shop_update_order($id, fn($o) => array_merge($o, ['status' => $status, 'status_at' => date('c')]));
                if ($o && $status === 'cancelled' && empty($o['stock_released'])) { shop_release($o['lines']); shop_update_order($id, fn($x) => array_merge($x, ['stock_released' => true])); }
                admin_log('order_status', ['id' => $id, 'status' => $status]);
            }
            header('Location: /_admin/orders', true, 303); exit;
        }
        $rows = array_reverse(sl_store_all('orders'));
        if (isset($_GET['csv'])) admin_csv('commandes', array_map(fn($o) => ['id' => $o['id'], 'date' => $o['at'], 'statut' => $o['status'], 'paiement' => $o['payment'], 'total' => $o['total'], 'client' => $o['customer']['name'] ?? '', 'email' => $o['customer']['email'] ?? '', 'adresse' => $o['customer']['address'] ?? '', 'lignes' => implode(' | ', array_map(fn($l) => $l['qty'] . 'x ' . $l['name'], $o['lines']))], $rows));
        $b = '<p><a class="btn btn-outline" href="/_admin/orders?csv=1">Exporter en CSV</a></p><table><tr><th>Commande</th><th>Client</th><th>Lignes</th><th>Total</th><th>Statut</th></tr>';
        foreach ($rows as $o) { $b .= '<tr><td><b>' . e($o['id']) . '</b><br><span class="muted">' . e(substr($o['at'], 0, 16)) . ' · ' . e($o['payment']) . '</span></td><td>' . e($o['customer']['name'] ?? '') . '<br><span class="muted">' . e($o['customer']['email'] ?? '') . '</span><br><span class="muted">' . nl2br(e($o['customer']['address'] ?? '')) . '</span>' . (!empty($o['customer']['notes']) ? '<br><em>' . e($o['customer']['notes']) . '</em>' : '') . '</td><td>'; foreach ($o['lines'] as $l) $b .= (int)$l['qty'] . ' × ' . e($l['name']) . '<br>'; $b .= '</td><td>' . e(shop_money((float)$o['total'])) . '</td><td><form class="inline" method="post"><input type="hidden" name="_csrf" value="' . e($csrf) . '"><input type="hidden" name="id" value="' . e($o['id']) . '"><select name="status" onchange="this.form.submit()">'; foreach (['pending' => 'En attente', 'paid' => 'Payée', 'confirmed' => 'Confirmée', 'shipped' => 'Expédiée', 'cancelled' => 'Annulée'] as $k => $label) $b .= '<option value="' . $k . '"' . ($o['status'] === $k ? ' selected' : '') . '>' . $label . '</option>'; $b .= '</select></form></td></tr>'; }
        admin_layout('Commandes', $b . '</table>' . (!$rows ? '<p class="muted">Aucune commande.</p>' : ''), 'orders');
    }
    if ($sub === 'stock' && $shop) {
        if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') { admin_check_csrf(); $id = (string)$_POST['id']; $n = max(0, (int)$_POST['remaining']); shop_stock_set($id, $n); admin_log('stock_set', ['id' => $id, 'remaining' => $n]); header('Location: /_admin/stock', true, 303); exit; }
        $catalog = json_decode((string)@file_get_contents(__DIR__ . '/../data/products.json'), true) ?: [];
        $state = shop_stock_state($catalog);
        $b = '<table><tr><th>Produit</th><th>Prix</th><th>Stock déclaré</th><th>Restant</th><th></th></tr>';
        foreach ($catalog as $p) { $s = $state[$p['id']] ?? null; $b .= '<tr><td><b>' . e($p['name']) . '</b><br><span class="muted">' . e($p['id']) . '</span></td><td>' . e(shop_money((float)$p['price'])) . '</td><td>' . ($s ? (int)$s['base'] : '<span class="muted">illimité</span>') . '</td><td>' . ($s ? '<form class="inline" method="post"><input type="hidden" name="_csrf" value="' . e($csrf) . '"><input type="hidden" name="id" value="' . e($p['id']) . '"><input type="number" name="remaining" value="' . (int)$s['remaining'] . '" min="0" style="width:80px"> <button class="btn btn-outline">OK</button></form>' : '—') . '</td><td>' . ($s && (int)$s['remaining'] <= 0 ? '<span class="tag">épuisé</span>' : '') . '</td></tr>'; }
        admin_layout('Stock', $b . '</table><p class="muted">Le stock déclaré se change dans data/products.yaml puis recompilation ; le restant s\\'ajuste ici (réception, casse, inventaire).</p>', 'stock');
    }
    if ($sub === 'events') {
        $rows = sl_store_all('events');
        $byName = []; $variants = [];
        foreach ($rows as $ev) { $byName[$ev['name']] = ($byName[$ev['name']] ?? 0) + 1; if ($ev['name'] === 'variant_shown' && !empty($ev['data']['segment'])) { $k = $ev['data']['section'] . ' / ' . $ev['data']['segment']; $variants[$k] = ($variants[$k] ?? 0) + 1; } }
        arsort($byName); arsort($variants);
        $b = '<h2>Événements</h2><table><tr><th>Événement</th><th>Nombre</th></tr>'; foreach ($byName as $n => $c) $b .= '<tr><td>' . e($n) . '</td><td>' . $c . '</td></tr>'; $b .= '</table>';
        $b .= '<h2>Variantes affichées</h2><table><tr><th>Section / segment</th><th>Affichages</th></tr>'; foreach ($variants as $k => $c) $b .= '<tr><td>' . e($k) . '</td><td>' . $c . '</td></tr>'; $b .= '</table>';
        $conv = ['form_submit' => $byName['form_submit'] ?? 0, 'purchase' => $byName['purchase'] ?? 0, 'checkout_start' => $byName['checkout_start'] ?? 0];
        $b .= '<h2>Conversions</h2><p>Formulaires envoyés : <b>' . $conv['form_submit'] . '</b> · Commandes commencées : <b>' . $conv['checkout_start'] . '</b> · Achats : <b>' . $conv['purchase'] . '</b></p><p class="muted">Seuls les visiteurs ayant accepté la personnalisation envoient des événements.</p>';
        admin_layout('Mesures', $b, 'events');
    }
    if ($sub === 'integrity') {
        $report = sl_integrity_check();
        $b = '<p>Fichiers compilés : <b>' . $report['checked'] . '</b> · modifiés : <b>' . count($report['modified']) . '</b> · manquants : <b>' . count($report['missing']) . '</b> · ajoutés : <b>' . count($report['added']) . '</b></p>';
        foreach (['modified' => 'Modifiés', 'missing' => 'Manquants', 'added' => 'Ajoutés (hors données)'] as $k => $label) if ($report[$k]) { $b .= '<h2>' . $label . '</h2><pre>' . e(implode("\\n", $report[$k])) . '</pre>'; }
        if (!$report['modified'] && !$report['missing'] && !$report['added']) $b .= '<p class="tag">Intégrité vérifiée : le site est identique à sa compilation.</p>';
        $b .= '<p class="muted">Même vérification en ligne de commande, pour un cron : <code>php lib/integrity.php</code> (code de sortie 1 si écart).</p>';
        admin_layout('Intégrité', $b, 'integrity');
    }
    // tableau de bord
    $msgs = sl_store_all('messages'); $orders = $shop ? sl_store_all('orders') : []; $events = sl_store_all('events');
    $pendingMsg = count(array_filter($msgs, fn($m) => empty($m['handled']))); $pendingOrd = count(array_filter($orders, fn($o) => in_array($o['status'], ['pending', 'paid'], true)));
    $ca = array_sum(array_map(fn($o) => in_array($o['status'], ['paid', 'confirmed', 'shipped'], true) ? (float)$o['total'] : 0, $orders));
    $b = '<div class="kpis"><div class="kpi"><b>' . $pendingMsg . '</b>messages à traiter</div>' . ($shop ? '<div class="kpi"><b>' . $pendingOrd . '</b>commandes à préparer</div><div class="kpi"><b>' . e(shop_money($ca)) . '</b>encaissé (payées et suivantes)</div>' : '') . '<div class="kpi"><b>' . count($events) . '</b>événements mesurés</div><div class="kpi"><b>' . e(sl_store_kind()) . '</b>stockage</div><div class="kpi"><b>' . count(glob(__DIR__ . '/../cache/*.html') ?: []) . '</b>pages en cache statique</div></div>';
    $b .= '<form method="post" class="inline"><input type="hidden" name="_csrf" value="' . e($csrf) . '"><input type="hidden" name="purge" value="1"><button class="btn btn-outline">Vider le cache statique</button></form> <span class="muted">Le cache se vide aussi à chaque déploiement.</span>';
    $b .= '<p class="muted">Compilé le ' . e(date('d/m/Y H:i', (int)@filemtime(__DIR__ . '/../index.php'))) . '. Version texte, jumeau pour agents et API sont servis par le même routeur.</p>';
    admin_layout('Tableau de bord', $b, '');
}
`;

/** Vérification d'intégrité en ligne de commande (cron). */
export const INTEGRITY_CLI_PHP = `<?php
declare(strict_types=1);
require __DIR__ . '/render.php';
require __DIR__ . '/store.php';
$r = sl_integrity_check();
echo "Fichiers compilés : {$r['checked']}\\n";
foreach (['modified' => 'MODIFIÉ', 'missing' => 'MANQUANT', 'added' => 'AJOUTÉ'] as $k => $label) foreach ($r[$k] as $f) echo "$label  $f\\n";
exit(($r['modified'] || $r['missing'] || $r['added']) ? 1 : 0);
`;
