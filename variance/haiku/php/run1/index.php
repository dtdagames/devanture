<?php
declare(strict_types=1);

// Routeur : compatible avec `php -S localhost:PORT -t <dossier> <dossier>/index.php`.

$root = __DIR__;
require $root . '/lib/site.php';
require $root . '/lib/blocks.php';
require $root . '/lib/contact.php';
require $root . '/lib/layout.php';

$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
if (!is_string($path) || $path === '') {
    $path = '/';
}

// Fichiers statiques existants sous assets/ : servis tels quels par le serveur.
if (str_starts_with($path, '/assets/')) {
    $real = realpath($root . $path);
    $assets_dir = realpath($root . '/assets');
    if ($real !== false && $assets_dir !== false && is_file($real)
        && str_starts_with($real, $assets_dir . DIRECTORY_SEPARATOR)) {
        return false;
    }
}

$key = $path === '/' ? '/' : rtrim($path, '/');

if (isset(ROUTES[$key])) {
    $page = require $root . '/pages/' . ROUTES[$key] . '.php';
    render_page($page, 200);
} else {
    $page = require $root . '/pages/404.php';
    render_page($page, 404);
}
