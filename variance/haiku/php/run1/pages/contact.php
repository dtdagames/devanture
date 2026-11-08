<?php
declare(strict_types=1);

$state = contact_process();

return [
    'route' => '/contact',
    'title' => 'Contact',
    'description' => 'Contactez le cabinet Garnier & Associés à Bordeaux : formulaire en ligne, téléphone et adresse cours de l\'Intendance.',
    'blocks' => [
        [
            'type' => 'hero',
            'compact' => true,
            'title' => 'Contact',
            'subtitle' => 'Décrivez-nous votre situation en quelques lignes. Un associé vous répond dans les meilleurs délais.',
        ],
        [
            'type' => 'contact_form',
            'title' => 'Écrire au cabinet',
            'fields' => CONTACT_FIELDS,
            'state' => $state,
        ],
        [
            'type' => 'features',
            'title' => 'Nous trouver',
            'columns' => 3,
            'items' => [
                ['icon' => 'pin', 'title' => 'Adresse', 'text' => SITE['address'] . '.'],
                ['icon' => 'clock', 'title' => 'Téléphone', 'text' => SITE['phone'] . '. Pour un rendez-vous, appelez ou écrivez-nous.'],
                ['icon' => 'home', 'title' => 'Interventions', 'text' => 'Bordeaux, Libourne et Arcachon.'],
            ],
        ],
    ],
];
