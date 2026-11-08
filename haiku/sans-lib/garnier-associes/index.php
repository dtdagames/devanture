<?php
declare(strict_types=1);

// Routeur : php -S localhost:PORT -t <dossier> <dossier>/index.php
$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
$path = is_string($path) ? rtrim($path, '/') : '';
if ($path === '') {
    $path = '/';
}

// Fichiers statiques existants (images, CSS, JS) servis directement par le serveur intégré.
if (PHP_SAPI === 'cli-server'
    && str_starts_with($path, '/assets/')
    && !str_ends_with($path, '.php')
    && strpos($path, '..') === false
    && is_file(__DIR__ . $path)) {
    return false;
}

require __DIR__ . '/app/bootstrap.php';

// Tableau de routes : chemin => méta de la page. Seules ces routes existent.
$routes = require __DIR__ . '/app/routes.php';

if (isset($routes[$path])) {
    http_response_code(200);
    render_site($routes[$path], $path, $routes);
} else {
    http_response_code(404);
    render_site(
        [
            'page' => '404',
            'title' => 'Page introuvable | Garnier & Associés',
            'description' => 'La page demandée n\'existe pas ou n\'est plus disponible.',
        ],
        $path,
        $routes
    );
}
