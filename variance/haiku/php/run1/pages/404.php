<?php
declare(strict_types=1);

return [
    'route' => '',
    'title' => 'Page introuvable',
    'description' => 'La page demandée n\'existe pas ou a été déplacée.',
    'blocks' => [
        [
            'type' => 'hero',
            'compact' => true,
            'title' => 'Page introuvable',
            'subtitle' => 'La page demandée n\'existe pas ou a été déplacée.',
            'buttons' => [
                ['label' => 'Retour à l\'accueil', 'to' => '/', 'primary' => true],
                ['label' => 'Nous contacter', 'to' => '/contact'],
            ],
        ],
    ],
];
