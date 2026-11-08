<?php
declare(strict_types=1);

/*
 * Routeur du site « Boulangerie Le Fournil ».
 * Lancement : php -S localhost:8000 -t <dossier> <dossier>/index.php
 * Les fichiers statiques existants (assets/…) sont servis directement par php -S (return false).
 */

$requestPath = (string)(parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/');
$requestPath = rawurldecode($requestPath);

// Fichier statique existant : on laisse le serveur intégré le servir.
if ($requestPath !== '/' && !str_contains($requestPath, '..') && !str_ends_with($requestPath, '.php')
    && is_file(__DIR__ . $requestPath)) {
    return false;
}

// Normalisation : pas de barre oblique finale (sauf la racine).
$path = rtrim($requestPath, '/');
if ($path === '') $path = '/';

require_once __DIR__ . '/lib/render.php';
require_once __DIR__ . '/lib/forms.php';

/** Identité et coordonnées du site (utilisées par la mise en page et le formulaire). */
$site = [
    'name'    => 'Boulangerie Le Fournil',
    'short'   => 'Le Fournil',
    'tagline' => 'Artisan boulanger à Nantes, quartier Bouffay, depuis 2009',
    'hours'   => 'Ouvert du mardi au dimanche, 6 h 30 – 19 h 30',
    'legal'   => 'SARL Le Fournil – RCS Nantes 512 846 237 – © ' . date('Y'),
    'contact' => [
        'email'   => 'bonjour@lefournil-nantes.fr',
        'phone'   => '02 40 00 00 00',
        'address' => "8 rue de la Juiverie\n44000 Nantes",
    ],
];

/** Table des routes : chemin → fichier de page (dans pages/), libellé de navigation. */
$routes = [
    '/'                     => ['file' => 'accueil',     'label' => 'Accueil'],
    '/nos-produits'         => ['file' => 'produits',    'label' => 'Nos produits'],
    '/la-boulangerie'       => ['file' => 'boulangerie', 'label' => 'La boulangerie'],
    '/commandes-evenements' => ['file' => 'evenements',  'label' => 'Commandes & événements'],
    '/recrutement'          => ['file' => 'recrutement', 'label' => 'Recrutement'],
    '/contact'              => ['file' => 'contact',     'label' => 'Contact'],
    '/mentions-legales'     => ['file' => 'mentions',    'label' => 'Mentions légales', 'nav' => false],
];

if (session_status() !== PHP_SESSION_ACTIVE) {
    session_start();
}

// Traitement éventuel du formulaire de contact, avant toute sortie.
$formResult = handle_contact_form($site) + ['csrf' => csrf_token()];

header('Content-Type: text/html; charset=UTF-8');

$currentPath = $path;
$meta = ['title' => $site['name'], 'description' => $site['tagline']];

if (isset($routes[$path])) {
    $pageFile = __DIR__ . '/pages/' . $routes[$path]['file'] . '.php';
} else {
    http_response_code(404);
    $currentPath = null;
    $pageFile = __DIR__ . '/pages/404.php';
}

ob_start();
include $pageFile;
$content = (string)ob_get_clean();

include __DIR__ . '/layout.php';
