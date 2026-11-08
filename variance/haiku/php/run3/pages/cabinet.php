<?php
declare(strict_types=1);

return function (array $ctx): array {
    $body = b_hero(
        'Le cabinet et son équipe',
        'Un cabinet bordelais fondé en 2011, dirigé par trois associés.',
        null,
        []
    )
    . b_richtext(
        'Notre histoire',
        [
            'Le cabinet Garnier & Associés a été fondé à Bordeaux en 2011. Il s\'est développé autour d\'une idée simple : un associé identifié pour chaque dossier, des explications compréhensibles et des honoraires annoncés dès le départ.',
            'Le cabinet intervient à Bordeaux, à Libourne et à Arcachon, au siège du 25 cours de l\'Intendance ou sur rendez-vous dans les villes de la région.',
        ],
        'cabinet.svg',
        'Salle de réunion du cabinet',
        'left'
    )
    . b_team('Les associés', [
        [
            'initials' => 'HG',
            'name' => 'Me Hélène Garnier',
            'role' => 'Associée fondatrice, droit du travail',
            'bio' => 'Conseil des salariés et des employeurs, négociation des ruptures et représentation devant le conseil de prud\'hommes.',
        ],
        [
            'initials' => 'TR',
            'name' => 'Me Thomas Ruiz',
            'role' => 'Associé, droit des affaires',
            'bio' => 'Accompagnement des sociétés et de leurs dirigeants : contrats, restructurations, transmissions et baux commerciaux.',
        ],
        [
            'initials' => 'IK',
            'name' => 'Me Inès Kaddour',
            'role' => 'Associée, droit de la famille',
            'bio' => 'Séparations, divorces, questions d\'autorité parentale et de pension alimentaire, avec une recherche d\'accord amiable.',
        ],
    ])
    . b_richtext(
        'Une équipe complète',
        [
            'Aux côtés des trois associés, le cabinet compte deux collaboratrices juristes et une assistante, qui assurent le suivi quotidien des dossiers et la liaison avec vous.',
        ],
        null,
        '',
        'right'
    )
    . b_gallery('Nos locaux', [
        ['src' => 'galerie-1.svg', 'alt' => 'Salle de réunion', 'caption' => 'Salle de réunion'],
        ['src' => 'galerie-2.svg', 'alt' => 'Bibliothèque juridique', 'caption' => 'Bibliothèque juridique'],
        ['src' => 'galerie-3.svg', 'alt' => 'Salle d\'accueil', 'caption' => 'Salle d\'accueil'],
        ['src' => 'galerie-4.svg', 'alt' => 'Salle de consultation', 'caption' => 'Salle de consultation'],
    ])
    . b_cta(
        'Rencontrer l\'équipe',
        'Prenez rendez-vous au cabinet ou par téléphone au 05 56 00 00 00.',
        'Prendre rendez-vous',
        '/contact'
    );

    return [
        'title' => 'Le cabinet et son équipe | Cabinet Garnier & Associés',
        'description' => 'Le cabinet Garnier & Associés, avocats à Bordeaux depuis 2011 : présentation des trois associés, de l\'équipe et des locaux.',
        'body' => $body,
    ];
};
