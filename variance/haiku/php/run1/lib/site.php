<?php
declare(strict_types=1);

const SITE = [
    'name' => 'Cabinet Garnier & Associés',
    'tagline' => 'Avocats à Bordeaux depuis 2011',
    'lang' => 'fr',
    'nav' => [
        ['label' => 'Accueil', 'route' => '/'],
        ['label' => 'Domaines', 'route' => '/domaines'],
        ['label' => 'Le cabinet', 'route' => '/cabinet'],
        ['label' => 'Honoraires', 'route' => '/honoraires'],
        ['label' => 'Contact', 'route' => '/contact'],
    ],
    'phone' => '05 56 00 00 00',
    'phone_href' => 'tel:+33556000000',
    'email' => 'contact@garnier-associes.fr',
    'address' => "25 cours de l'Intendance, 33000 Bordeaux",
    'footer_legal' => 'Avocats au Barreau de Bordeaux. Interventions à Bordeaux, Libourne et Arcachon.',
];

const ROUTES = [
    '/' => 'accueil',
    '/domaines' => 'domaines',
    '/cabinet' => 'cabinet',
    '/honoraires' => 'honoraires',
    '/contact' => 'contact',
    '/mentions-legales' => 'mentions-legales',
];

function e(string $s): string
{
    return htmlspecialchars($s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function asset(string $path): string
{
    return '/assets/' . ltrim($path, '/');
}
