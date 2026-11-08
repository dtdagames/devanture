<?php
declare(strict_types=1);

// Routeur : php -S localhost:PORT -t <dossier> <dossier>/index.php
// Les fichiers statiques de /assets/ sont servis tels quels par le serveur intégré.

$root = __DIR__;
$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
if (!is_string($path) || $path === '') {
    $path = '/';
}
$path = rtrim($path, '/');
if ($path === '') {
    $path = '/';
}

if (PHP_SAPI === 'cli-server' && str_starts_with($path, '/assets/')) {
    $real = realpath($root . $path);
    $assetsDir = realpath($root . '/assets');
    if ($real !== false && $assetsDir !== false && is_file($real)
        && str_starts_with($real, $assetsDir . DIRECTORY_SEPARATOR)) {
        return false;
    }
}

require $root . '/lib/config.php';
require $root . '/lib/render.php';
require $root . '/lib/contact.php';

$config = site_config();
$routes = $config['routes'];

if (!array_key_exists($path, $routes)) {
    http_response_code(404);
    $page = $config['not_found'];
    $body = render_not_found();
} else {
    $page_id = $routes[$path];
    $page = $config['pages'][$page_id];
    $form = $page_id === 'contact' ? contact_handle($root, $config) : null;
    $body = render_blocks($page['blocks'] ?? [], $form);
}

header('Content-Type: text/html; charset=UTF-8');
echo render_document($config, $path, $page, $body);
