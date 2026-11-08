<?php
declare(strict_types=1);

echo block_hero([
    'title' => 'Le cabinet et son équipe',
    'lead' => 'Un cabinet fondé en 2011 à Bordeaux, avec trois associés chacun référent d\'une matière.',
]);

echo block_split([
    'title' => 'Une équipe réduite, des interlocuteurs stables',
    'paragraphs' => [
        'Le cabinet compte trois associés, deux collaboratrices et une assistante. Le dossier que vous nous confiez reste suivi par la même personne du début à la fin.',
        'Nos bureaux sont situés cours de l\'Intendance, au cœur de Bordeaux. Nous intervenons aussi à Libourne et à Arcachon, sur rendez-vous.',
    ],
    'image' => '/assets/cabinet-accueil.svg',
    'alt' => 'Illustration de substitution : accueil du cabinet',
    'reverse' => true,
]);

echo block_team([
    'title' => 'Les associés',
    'intro' => 'Chaque associé est référent de sa matière et répond personnellement de la mission qui lui est confiée.',
    'members' => [
        [
            'initials' => 'HG',
            'name' => 'Me Hélène Garnier',
            'role' => 'Associée, droit du travail',
            'bio' => 'Elle conseille employeurs et salariés sur la rupture du contrat, les difficultés disciplinaires et le contentieux prud\'homal.',
        ],
        [
            'initials' => 'TR',
            'name' => 'Me Thomas Ruiz',
            'role' => 'Associé, droit des affaires',
            'bio' => 'Il accompagne les dirigeants dans la création et la vie de leur société, la rédaction des contrats commerciaux et la gestion des litiges entre partenaires.',
        ],
        [
            'initials' => 'IK',
            'name' => 'Me Inès Kaddour',
            'role' => 'Associée, droit de la famille',
            'bio' => 'Elle accompagne les familles dans les séparations, les procédures de divorce, les questions d\'autorité parentale et de pension alimentaire.',
        ],
    ],
]);

echo block_gallery([
    'title' => 'Le cabinet en images',
    'intro' => 'Quelques vues de nos locaux. Cliquez sur une image pour l\'agrandir.',
    'items' => [
        ['image' => '/assets/cabinet-facade.svg', 'alt' => 'Illustration de substitution : façade du cabinet', 'caption' => 'Façade, cours de l\'Intendance'],
        ['image' => '/assets/cabinet-salle.svg', 'alt' => 'Illustration de substitution : salle de réunion', 'caption' => 'Salle de réunion'],
        ['image' => '/assets/cabinet-bureau.svg', 'alt' => 'Illustration de substitution : bureau de consultation', 'caption' => 'Bureau de consultation'],
    ],
]);
