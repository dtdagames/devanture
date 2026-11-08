<?php
declare(strict_types=1);

function site_config(): array
{
    return [
        'site' => [
            'name' => 'Cabinet Garnier & Associés',
            'short' => 'Garnier & Associés',
            'tagline' => 'Avocats à Bordeaux depuis 2011',
            'phone_label' => '05 56 00 00 00',
            'phone_href' => 'tel:+33556000000',
            'email' => 'contact@garnier-associes.fr',
            'address' => "25 cours de l'Intendance, 33000 Bordeaux",
        ],
        'nav' => [
            ['label' => 'Accueil', 'route' => '/', 'id' => 'accueil'],
            ['label' => 'Domaines', 'route' => '/domaines', 'id' => 'domaines'],
            ['label' => 'Le cabinet', 'route' => '/cabinet', 'id' => 'cabinet'],
            ['label' => 'Honoraires', 'route' => '/honoraires', 'id' => 'honoraires'],
            ['label' => 'Contact', 'route' => '/contact', 'id' => 'contact'],
        ],
        'routes' => [
            '/' => 'accueil',
            '/domaines' => 'domaines',
            '/cabinet' => 'cabinet',
            '/honoraires' => 'honoraires',
            '/contact' => 'contact',
            '/mentions-legales' => 'mentions-legales',
        ],
        'not_found' => [
            'route' => null,
            'title' => 'Page introuvable',
            'description' => "La page demandée n'existe pas.",
        ],
        'pages' => require __DIR__ . '/pages.php',
    ];
}
