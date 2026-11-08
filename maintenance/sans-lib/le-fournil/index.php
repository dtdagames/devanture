<?php
declare(strict_types=1);

/**
 * Routeur du site Le Fournil.
 * Usage : php -S localhost:8000 -t <dossier> <dossier>/index.php
 * Les fichiers statiques existants sont servis par PHP (return false).
 */

$uri  = $_SERVER['REQUEST_URI'] ?? '/';
$path = parse_url($uri, PHP_URL_PATH);
$path = is_string($path) ? $path : '/';
$path = rawurldecode($path);

// Fichier statique existant (assets/…) : laisser le serveur intégré le servir.
if ($path !== '/' && PHP_SAPI === 'cli-server') {
    $real = realpath(__DIR__ . $path);
    if ($real !== false && is_file($real) && strncmp($real, realpath(__DIR__) . DIRECTORY_SEPARATOR, strlen(realpath(__DIR__)) + 1) === 0) {
        return false;
    }
}

$site = require __DIR__ . '/config.php';
require __DIR__ . '/lib/helpers.php';
require __DIR__ . '/lib/blocks.php';
require __DIR__ . '/lib/layout.php';

if (session_status() === PHP_SESSION_NONE) {
    session_start([
        'cookie_httponly' => true,
        'cookie_samesite' => 'Lax',
    ]);
}

// Normalisation : /contact/ -> /contact
if ($path !== '/' && substr($path, -1) === '/') {
    $path = rtrim($path, '/');
}

$pageId = $site['routes'][$path] ?? null;
if ($pageId === null || !is_file(__DIR__ . '/pages/' . $pageId . '.php')) {
    http_response_code(404);
    $pageId = '404';
}

header('Content-Type: text/html; charset=UTF-8');
header('X-Content-Type-Options: nosniff');

/** @var array $page */
$page = require __DIR__ . '/pages/' . $pageId . '.php';

echo render_layout($page, $site, $path);
