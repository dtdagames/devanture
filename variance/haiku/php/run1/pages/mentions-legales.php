<?php
declare(strict_types=1);

return [
    'route' => '/mentions-legales',
    'title' => 'Mentions légales',
    'description' => 'Mentions légales du site du cabinet Garnier & Associés : éditeur, hébergement, propriété intellectuelle et données personnelles.',
    'blocks' => [
        [
            'type' => 'hero',
            'compact' => true,
            'title' => 'Mentions légales',
        ],
        [
            'type' => 'richtext',
            'side' => 'right',
            'title' => 'Éditeur du site',
            'paragraphs' => [
                'Le site est édité par le cabinet Garnier & Associés, société d\'avocats dont le siège est situé 25 cours de l\'Intendance, 33000 Bordeaux.',
                'Téléphone : 05 56 00 00 00. Adresse e-mail : contact@garnier-associes.fr.',
                'Les avocats du cabinet sont inscrits au Barreau de Bordeaux.',
            ],
        ],
        [
            'type' => 'richtext',
            'side' => 'left',
            'title' => 'Hébergement',
            'paragraphs' => [
                'Le site est hébergé par un prestataire dont les coordonnées sont communiquées sur demande adressée au cabinet.',
            ],
        ],
        [
            'type' => 'richtext',
            'side' => 'right',
            'title' => 'Propriété intellectuelle',
            'paragraphs' => [
                'L\'ensemble des textes, images et éléments graphiques du site sont protégés. Toute reproduction, même partielle, est interdite sans accord préalable du cabinet.',
            ],
        ],
        [
            'type' => 'richtext',
            'side' => 'left',
            'title' => 'Données personnelles',
            'paragraphs' => [
                'Les informations transmises par le formulaire de contact servent uniquement à répondre à votre demande. Elles ne sont ni revendues ni transmises à des tiers.',
                'Vous pouvez demander l\'accès, la rectification ou la suppression de vos données en écrivant au cabinet à l\'adresse contact@garnier-associes.fr.',
            ],
        ],
        [
            'type' => 'richtext',
            'side' => 'right',
            'title' => 'Responsabilité',
            'paragraphs' => [
                'Les informations présentées sur ce site sont données à titre général et ne constituent pas un conseil juridique. Pour toute situation personnelle, prenez contact avec le cabinet.',
            ],
        ],
    ],
];
