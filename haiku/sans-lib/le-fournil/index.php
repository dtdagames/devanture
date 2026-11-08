<?php
declare(strict_types=1);

// Routeur pour : php -S localhost:PORT -t <dossier> <dossier>/index.php
$root = __DIR__;

$path = rawurldecode((string) parse_url((string) ($_SERVER['REQUEST_URI'] ?? '/'), PHP_URL_PATH));
$path = rtrim($path, '/');
if ($path === '') {
    $path = '/';
}

// Fichier statique existant (hors PHP et hors data/) : laissé à php -S.
$reel = realpath($root . $path);
if (
    $reel !== false
    && is_file($reel)
    && str_starts_with($reel, $root . DIRECTORY_SEPARATOR)
    && strtolower(pathinfo($reel, PATHINFO_EXTENSION)) !== 'php'
    && !str_starts_with($path, '/data/')
) {
    return false;
}

// Tableau des routes : chemin => identifiant de page (pages/<id>.php).
$routes = [
    '/' => 'accueil',
    '/nos-produits' => 'nos-produits',
    '/la-boulangerie' => 'la-boulangerie',
    '/commandes-evenements' => 'commandes-evenements',
    '/contact' => 'contact',
    '/mentions-legales' => 'mentions-legales',
];

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

require_once $root . '/inc/layout.php';

if (isset($routes[$path])) {
    render_page($routes[$path], $path);
} else {
    http_response_code(404);
    render_page('introuvable', $path);
}
