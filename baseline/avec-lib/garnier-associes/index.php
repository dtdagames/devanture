<?php
declare(strict_types=1);

/** Routeur : php -S localhost:8000 -t <dossier> <dossier>/index.php */

$path = rawurldecode((string)parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH));
if ($path === '') $path = '/';

// Fichiers statiques : le serveur intégré les sert (return false), sauf code source et données.
$blocked = '#^/(data|lib|components|pages)(/|$)#';
$file = __DIR__ . $path;
if ($path !== '/' && is_file($file) && !preg_match($blocked, $path) && !str_ends_with($path, '.php')) {
    return false;
}

require __DIR__ . '/lib/render.php';
require __DIR__ . '/lib/forms.php';

$site = require __DIR__ . '/site.php';
$routes = $site['routes'];

if (strlen($path) > 1) $path = rtrim($path, '/');

if (session_status() !== PHP_SESSION_ACTIVE) session_start();

$formResult = ['status' => null, 'csrf' => csrf_token()];
$current = $path;

if (isset($routes[$path])) {
    $route = $routes[$path];
    http_response_code(200);
    if ($path === '/contact') {
        // Le destinataire vient de la configuration, jamais du champ caché du client.
        $_POST['_to'] = $site['contact']['email'];
        $formResult = handle_contact_form($site);
        $formResult['csrf'] = csrf_token();
    }
    $pageFile = __DIR__ . '/pages/' . $route['page'] . '.php';
} else {
    http_response_code(404);
    $route = [
        'title' => 'Page introuvable | ' . $site['name'],
        'description' => 'La page demandée est introuvable sur le site du cabinet ' . $site['name'] . '.',
    ];
    $pageFile = __DIR__ . '/pages/404.php';
    $current = '';
}

require __DIR__ . '/layout.php';
