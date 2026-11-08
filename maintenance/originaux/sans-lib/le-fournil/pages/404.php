<?php
declare(strict_types=1);

/** @var array $site */
return [
    'title'       => 'Page introuvable | Le Fournil Nantes',
    'description' => 'La page demandée n\'existe pas ou a été déplacée.',
    'blocks'      => [
        [
            'type'     => 'hero',
            'kicker'   => 'Erreur 404',
            'title'    => 'Page introuvable',
            'subtitle' => 'Cette page n\'existe pas ou a changé d\'adresse, un peu comme la brioche du dimanche quand on arrive après 11 h.',
            'cta'      => ['label' => 'Retour à l\'accueil', 'to' => '/'],
            'secondary' => ['label' => 'Voir nos produits', 'to' => '/nos-produits'],
        ],
    ],
];
