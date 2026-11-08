<?php
declare(strict_types=1);

return [
    'route' => '/',
    'title' => SITE['name'],
    'description' => 'Cabinet Garnier & Associés, avocats à Bordeaux depuis 2011 : droit du travail, droit des affaires et droit de la famille. Première consultation de 30 minutes offerte.',
    'blocks' => [
        [
            'type' => 'hero',
            'eyebrow' => 'Avocats à Bordeaux depuis 2011',
            'title' => 'Un conseil juridique clair, à Bordeaux, Libourne et Arcachon',
            'subtitle' => 'Le cabinet accompagne particuliers et entreprises en droit du travail, en droit des affaires et en droit de la famille. Votre première consultation de 30 minutes est offerte.',
            'image' => 'hero-cabinet.svg',
            'buttons' => [
                ['label' => 'Prendre contact', 'to' => '/contact', 'primary' => true],
                ['label' => 'Nos domaines', 'to' => '/domaines'],
            ],
        ],
        [
            'type' => 'figures',
            'items' => [
                ['value' => '2011', 'label' => 'Année de fondation'],
                ['value' => '3', 'label' => 'Associés'],
                ['value' => '30 min', 'label' => 'Première consultation offerte'],
                ['value' => '3', 'label' => 'Villes d\'intervention'],
            ],
        ],
        [
            'type' => 'features',
            'title' => 'Pourquoi nous confier votre dossier',
            'intro' => 'Un fonctionnement simple, avec des règles connues dès le premier rendez-vous.',
            'columns' => 4,
            'items' => [
                ['icon' => 'clock', 'title' => 'Première consultation offerte', 'text' => 'Trente minutes pour faire le point sur votre situation avant toute décision.'],
                ['icon' => 'euro', 'title' => 'Honoraires annoncés', 'text' => 'Une convention d\'honoraires est signée systématiquement, au forfait ou au temps passé.'],
                ['icon' => 'pin', 'title' => 'Proche de vous', 'text' => 'Nous intervenons à Bordeaux, Libourne et Arcachon.'],
                ['icon' => 'scale', 'title' => 'Trois spécialités', 'text' => 'Travail, affaires et famille : chaque dossier est suivi par l\'associé spécialiste.'],
            ],
        ],
        [
            'type' => 'richtext',
            'side' => 'right',
            'title' => 'Un cabinet à taille humaine',
            'paragraphs' => [
                'Fondé en 2011, le cabinet Garnier & Associés réunit trois associés, deux collaboratrices et une assistante. Cette taille permet de suivre chaque dossier de bout en bout, sans interlocuteur qui change en cours de route.',
                'Nous privilégions l\'explication claire : vous savez ce qui se passe, ce qu\'il reste à faire et ce que cela coûte.',
            ],
            'image' => 'cabinet.svg',
            'image_alt' => 'Salle de réunion du cabinet Garnier & Associés',
        ],
        [
            'type' => 'cta',
            'title' => 'Une question juridique à régler rapidement ?',
            'text' => 'Décrivez-nous votre situation, nous revenons vers vous pour fixer un rendez-vous.',
            'button' => ['label' => 'Nous écrire', 'to' => '/contact'],
        ],
    ],
];
