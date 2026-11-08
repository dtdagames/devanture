<?php
declare(strict_types=1);

// Routeur compatible : php -S localhost:PORT -t <dossier> <dossier>/index.php
$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
$path = is_string($path) ? rawurldecode($path) : '/';

// Fichiers statiques existants : laisser le serveur intégré les servir
if ($path !== '/' && strpos($path, '..') === false
    && !preg_match('~^/(inc|data)/~', $path)
    && !preg_match('~\.php$~i', $path)
    && is_file(__DIR__ . $path)) {
    return false;
}

session_start();

require __DIR__ . '/inc/config.php';
require __DIR__ . '/inc/blocks.php';
require __DIR__ . '/inc/contact.php';
require __DIR__ . '/inc/layout.php';
require __DIR__ . '/inc/pages.php';

if ($path !== '/') {
    $path = rtrim($path, '/');
}

$routes = site_pages();

if (isset($routes[$path])) {
    [$title, $desc, $blocks] = $routes[$path];
    $ctx = [];
    if ($path === '/contact') {
        $ctx['form'] = handle_contact();
    }
    echo render_layout($path, $title, $desc, render_blocks($blocks, $ctx));
    return;
}

http_response_code(404);
$notFound = [
    ['type' => 'hero', 'title' => 'Page introuvable', 'subtitle' => 'La page demandée n\'existe pas ou a été déplacée.',
        'buttons' => [['Retour à l\'accueil', '/']]],
];
echo render_layout($path, 'Page introuvable — Garnier & Associés', 'La page demandée est introuvable.', render_blocks($notFound));
