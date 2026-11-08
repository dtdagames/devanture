<?php
declare(strict_types=1);

return [
    'route' => '/cabinet',
    'title' => 'Le cabinet et l\'équipe',
    'description' => 'Le cabinet Garnier & Associés, fondé en 2011 à Bordeaux : trois associés, deux collaboratrices et une assistante à votre service.',
    'blocks' => [
        [
            'type' => 'hero',
            'compact' => true,
            'title' => 'Le cabinet',
            'subtitle' => 'Fondé en 2011 à Bordeaux, le cabinet Garnier & Associés est organisé autour de trois associés spécialisés.',
        ],
        [
            'type' => 'richtext',
            'side' => 'left',
            'title' => 'Une histoire bordelaise',
            'paragraphs' => [
                'Depuis 2011, le cabinet exerce à Bordeaux, au 25 cours de l\'Intendance. Nos interventions s\'étendent à Libourne et à Arcachon, selon la nature du dossier et les besoins de nos clients.',
                'Notre équipe compte trois associés, deux collaboratrices et une assistante. Chacun connaît les dossiers qu\'il suit et reste disponible pour vous répondre.',
            ],
            'image' => 'cabinet.svg',
            'image_alt' => 'Salle de réunion du cabinet',
        ],
        [
            'type' => 'team',
            'title' => 'Les associés',
            'intro' => 'Chaque associé dirige son propre domaine et suit personnellement les dossiers qui lui sont confiés.',
            'members' => [
                [
                    'initial' => 'HG',
                    'name' => 'Me Hélène Garnier',
                    'role' => 'Associée, droit du travail',
                    'bio' => 'Elle conseille salariés et employeurs sur les ruptures du contrat de travail, les contentieux prud\'homaux et la négociation de transactions.',
                ],
                [
                    'initial' => 'TR',
                    'name' => 'Me Thomas Ruiz',
                    'role' => 'Associé, droit des affaires',
                    'bio' => 'Il accompagne les dirigeants et les sociétés dans la rédaction de leurs contrats, leur vie sociétaire et leurs litiges commerciaux.',
                ],
                [
                    'initial' => 'IK',
                    'name' => 'Me Inès Kaddour',
                    'role' => 'Associée, droit de la famille',
                    'bio' => 'Elle accompagne les familles dans les séparations, les questions de garde et de pension, et les liquidations de régimes matrimoniaux.',
                ],
            ],
        ],
        [
            'type' => 'features',
            'title' => 'Comment nous travaillons',
            'columns' => 3,
            'items' => [
                ['icon' => 'shield', 'title' => 'Confidentialité', 'text' => 'Les échanges avec le cabinet sont couverts par le secret professionnel de l\'avocat.'],
                ['icon' => 'home', 'title' => 'Un interlocuteur identifié', 'text' => 'Vous savez dès le départ quel associé suit votre dossier et qui vous répond au quotidien.'],
                ['icon' => 'clock', 'title' => 'Des délais annoncés', 'text' => 'Nous vous indiquons les étapes et les échéances à venir, pour que vous puissiez les anticiper.'],
            ],
        ],
        [
            'type' => 'cta',
            'title' => 'Prendre rendez-vous avec un associé',
            'text' => 'La première consultation de 30 minutes est offerte.',
            'button' => ['label' => 'Nous contacter', 'to' => '/contact'],
        ],
    ],
];
