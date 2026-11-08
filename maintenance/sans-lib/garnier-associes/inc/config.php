<?php
declare(strict_types=1);

const SITE = [
    'name'    => 'Garnier & Associés',
    'tagline' => 'Avocats à Bordeaux',
    'address' => '25 cours de l\'Intendance, 33000 Bordeaux',
    'phone'   => '05 56 00 00 00',
    'phone_tel' => '+33556000000',
    'email'   => 'contact@garnier-associes.fr',
    'mail_to' => 'contact@garnier-associes.fr',
];

const NAV = [
    '/'                => 'Accueil',
    '/domaines'        => 'Domaines',
    '/cabinet'         => 'Le cabinet',
    '/honoraires'      => 'Honoraires',
    '/recrutement'     => 'Recrutement',
    '/contact'         => 'Contact',
];

function e($v): string
{
    return htmlspecialchars((string)$v, ENT_QUOTES, 'UTF-8');
}
