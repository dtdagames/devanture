// Stockage des données d'exploitation : SQLite via PDO quand l'extension existe, fichiers JSONL sinon.
// Même interface des deux côtés ; le choix se fait à l'exécution, sans configuration.
export const STORE_PHP = `<?php
declare(strict_types=1);
// Généré par sitec. Collections : messages, orders, events. Clé d'identité : champ id (events : sans).

function sl_store_kind(): string {
    static $kind = null;
    if ($kind !== null) return $kind;
    $forced = sl_env('STORE');
    $sqliteOk = class_exists('PDO') && in_array('sqlite', PDO::getAvailableDrivers(), true);
    $kind = ($forced === 'jsonl' || !$sqliteOk) ? 'jsonl' : 'sqlite';
    return $kind;
}
function sl_store_dir(): string { $d = __DIR__ . '/../data'; if (!is_dir($d)) @mkdir($d, 0775, true); return $d; }

function sl_store_db(): PDO {
    static $pdo = null;
    if ($pdo) return $pdo;
    $pdo = new PDO('sqlite:' . sl_store_dir() . '/site.sqlite', null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
    // Le délai d'attente d'abord : le passage en WAL demande un verrou, et sans délai il échoue dès qu'un autre processus ouvre la base au même instant.
    $pdo->exec('PRAGMA busy_timeout=5000;'); $pdo->exec('PRAGMA journal_mode=WAL;');
    foreach (['messages', 'orders', 'events'] as $t) $pdo->exec("CREATE TABLE IF NOT EXISTS $t (seq INTEGER PRIMARY KEY AUTOINCREMENT, id TEXT, at TEXT, doc TEXT NOT NULL)");
    $pdo->exec('CREATE INDEX IF NOT EXISTS orders_id ON orders(id); CREATE INDEX IF NOT EXISTS messages_id ON messages(id);');
    // Reprise des fichiers JSONL existants, une seule fois.
    foreach (['messages', 'orders', 'events'] as $t) { $f = sl_store_dir() . "/$t.jsonl"; if (is_file($f) && !is_file("$f.imported")) { foreach (file($f, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) { $d = json_decode($line, true); if ($d) sl_store_sqlite_insert($t, $d); } @rename($f, "$f.imported"); } }
    return $pdo;
}
/** Nom de collection sûr ; table créée à la demande (formulaires déclarés par les composants). */
function sl_store_table(string $t): string {
    static $known = ['messages' => true, 'orders' => true, 'events' => true];
    if (!preg_match('/^[a-z][a-z0-9_]{0,40}$/', $t)) throw new RuntimeException('collection invalide');
    if (empty($known[$t]) && sl_store_kind() === 'sqlite') { sl_store_db()->exec("CREATE TABLE IF NOT EXISTS $t (seq INTEGER PRIMARY KEY AUTOINCREMENT, id TEXT, at TEXT, doc TEXT NOT NULL)"); $known[$t] = true; }
    return $t;
}
function sl_store_sqlite_insert(string $t, array $doc): void { $t = sl_store_table($t); $st = sl_store_db()->prepare("INSERT INTO $t (id, at, doc) VALUES (?, ?, ?)"); $st->execute([$doc['id'] ?? null, $doc['at'] ?? date('c'), json_encode($doc, JSON_UNESCAPED_UNICODE)]); }

/** Ajoute un document. */
function sl_store_append(string $t, array $doc): void {
    if (sl_store_kind() === 'sqlite') { sl_store_sqlite_insert($t, $doc); return; }
    @file_put_contents(sl_store_dir() . "/$t.jsonl", json_encode($doc, JSON_UNESCAPED_UNICODE) . "\\n", FILE_APPEND | LOCK_EX);
}
/** Tous les documents, dans l'ordre d'insertion (dernière version d'un id pour les collections à identité). */
function sl_store_all(string $t): array {
    $t = sl_store_table($t);
    if (sl_store_kind() === 'sqlite') { $rows = sl_store_db()->query("SELECT doc FROM $t ORDER BY seq")->fetchAll(PDO::FETCH_COLUMN); return array_map(fn($d) => json_decode($d, true), $rows); }
    $f = sl_store_dir() . "/$t.jsonl"; if (!is_file($f)) return [];
    $out = []; foreach (file($f, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) { $d = json_decode($line, true); if ($d) $out[] = $d; }
    return $out;
}
/** Un document par id (le plus récent). */
function sl_store_get(string $t, string $id): ?array {
    $t = sl_store_table($t);
    if (sl_store_kind() === 'sqlite') { $st = sl_store_db()->prepare("SELECT doc FROM $t WHERE id = ? ORDER BY seq DESC LIMIT 1"); $st->execute([$id]); $d = $st->fetchColumn(); return $d ? json_decode($d, true) : null; }
    $found = null; foreach (sl_store_all($t) as $d) if (($d['id'] ?? null) === $id) $found = $d; return $found;
}
/** Met à jour un document par id, sous verrou. $fn reçoit le document et renvoie la version modifiée. */
function sl_store_update(string $t, string $id, callable $fn): ?array {
    $t = sl_store_table($t);
    if (sl_store_kind() === 'sqlite') {
        // BEGIN IMMEDIATE : le droit d'écrire est pris avant de lire. Une transaction qui lit d'abord puis écrit est refusée par SQLite
        // (« database is locked », sans attendre) dès qu'un autre processus a écrit entre les deux : vu avec douze envois simultanés.
        $db = sl_store_db(); $db->exec('BEGIN IMMEDIATE');
        try { $st = $db->prepare("SELECT seq, doc FROM $t WHERE id = ? ORDER BY seq DESC LIMIT 1"); $st->execute([$id]); $row = $st->fetch(PDO::FETCH_ASSOC); $st->closeCursor(); if (!$row) { $db->exec('COMMIT'); return null; } $doc = $fn(json_decode($row['doc'], true)); $up = $db->prepare("UPDATE $t SET doc = ?, at = ? WHERE seq = ?"); $up->execute([json_encode($doc, JSON_UNESCAPED_UNICODE), $doc['at'] ?? date('c'), $row['seq']]); $db->exec('COMMIT'); return $doc; }
        catch (Throwable $e) { try { $db->exec('ROLLBACK'); } catch (Throwable $e2) { /* transaction déjà close */ } throw $e; }
    }
    $f = sl_store_dir() . "/$t.jsonl"; if (!is_file($f)) return null;
    $fh = fopen($f, 'c+'); if (!$fh) return null; flock($fh, LOCK_EX);
    $lines = preg_split('/\\n/', trim((string)stream_get_contents($fh))); $out = []; $updated = null;
    foreach ($lines as $line) { if ($line === '') continue; $o = json_decode($line, true); if ($o && ($o['id'] ?? null) === $id) { $o = $fn($o); $updated = $o; } $out[] = json_encode($o, JSON_UNESCAPED_UNICODE); }
    if ($updated) { ftruncate($fh, 0); rewind($fh); fwrite($fh, implode("\\n", $out) . "\\n"); fflush($fh); }
    flock($fh, LOCK_UN); fclose($fh);
    return $updated;
}

/** Intégrité : compare les fichiers compilés au manifeste d'empreintes émis par le compilateur. */
function sl_integrity_check(): array {
    $root = realpath(__DIR__ . '/..'); $mf = $root . '/manifest.sha256.json';
    $manifest = is_file($mf) ? (json_decode((string)file_get_contents($mf), true) ?: []) : [];
    $modified = []; $missing = []; $added = []; $checked = 0;
    foreach ($manifest as $rel => $hash) { $p = $root . '/' . $rel; if (!is_file($p)) { $missing[] = $rel; continue; } $checked++; if (hash_file('sha256', $p) !== $hash) $modified[] = $rel; }
    $it = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($root, FilesystemIterator::SKIP_DOTS));
    foreach ($it as $file) { $rel = str_replace('\\\\', '/', substr($file->getPathname(), strlen($root) + 1)); if (preg_match('#^(data|cache)/|^\\.env$|^manifest\\.sha256\\.json$#', $rel)) continue; if (!isset($manifest[$rel])) $added[] = $rel; }
    sort($added);
    return ['checked' => $checked, 'modified' => $modified, 'missing' => $missing, 'added' => $added];
}
`;
