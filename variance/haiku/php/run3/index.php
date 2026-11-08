<?php
declare(strict_types=1);

// Routeur pour le serveur integre : php -S localhost:8000 -t <dossier> <dossier>/index.php

$root = __DIR__;
$uri = $_SERVER['REQUEST_URI'] ?? '/';
$path = parse_url($uri, PHP_URL_PATH);
if (!is_string($path) || $path === '') {
    $path = '/';
}
if ($path !== '/') {
    $path = rtrim($path, '/');
    if ($path === '') {
        $path = '/';
    }
}

// Fichiers statiques existants (uniquement dans assets/) : servis tels quels.
if (str_starts_with($path, '/assets/')) {
    $real = realpath($root . $path);
    $assetsDir = realpath($root . '/assets');
    if ($real !== false && $assetsDir !== false
        && str_starts_with($real, $assetsDir . DIRECTORY_SEPARATOR) && is_file($real)) {
        return false;
    }
}

$routes = [
    '/' => 'accueil',
    '/domaines' => 'domaines',
    '/cabinet' => 'cabinet',
    '/honoraires' => 'honoraires',
    '/contact' => 'contact',
    '/mentions-legales' => 'mentions',
];

require_once $root . '/lib/helpers.php';
require_once $root . '/lib/layout.php';
require_once $root . '/lib/blocks.php';
require_once $root . '/lib/form.php';

$site = require $root . '/lib/config.php';

if (isset($routes[$path])) {
    $name = $routes[$path];
    $status = 200;
} else {
    $name = 'notfound';
    $status = 404;
}

$build = require $root . '/pages/' . $name . '.php';
$page = $build(['site' => $site, 'path' => $path]);

http_response_code($status);
header('Content-Type: text/html; charset=UTF-8');
echo render_layout($site, $path, $page);
