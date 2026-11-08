<?php
declare(strict_types=1);

/** @var array $site */
return [
    'title'       => 'La boulangerie – Notre histoire et notre équipe | Le Fournil Nantes',
    'description' => 'Depuis 2009, Anne et Marc Lefèvre et leur équipe de trois salariés font vivre Le Fournil, boulangerie artisanale du quartier Bouffay à Nantes.',
    'blocks'      => [
        [
            'type'     => 'hero',
            'title'    => 'La boulangerie',
            'subtitle' => 'Une échoppe du vieux Nantes, un four à sole, un levain qui a dix-sept ans et une équipe de cinq personnes qui se lève très tôt.',
            'image'    => 'fournil-four.svg',
        ],
        [
            'type'       => 'text_image',
            'title'      => 'Depuis 2009, rue de la Juiverie',
            'text'       => [
                'Anne et Marc Lefèvre se sont rencontrés en apprentissage à Angers. Après dix ans dans des boulangeries de la région, ils reprennent en 2009 une ancienne échoppe du Bouffay, à deux pas de la place du Change, et y installent un four à sole en pierre.',
                'L\'idée était simple : revenir au levain naturel, aux farines de meule et aux cuissons longues, à une époque où le quartier n\'avait plus que des terminaux de cuisson. Les premiers mois ont été rudes, puis le bouche-à-oreille a fait le reste.',
                'En 2024, la baguette tradition du Fournil a reçu la médaille d\'argent du concours départemental de Loire-Atlantique. Une fierté pour toute l\'équipe, et surtout pour Marc qui en règle le façonnage depuis quinze ans.',
            ],
            'image'      => 'anne-marc.svg',
            'alt'        => 'Anne et Marc Lefèvre devant le four du Fournil',
            'caption'    => 'Anne et Marc Lefèvre, fondateurs',
            'image_side' => 'left',
        ],
        [
            'type'    => 'features',
            'title'   => 'Nos engagements',
            'columns' => 3,
            'items'   => [
                ['icon' => 'leaf',  'title' => 'Farines de la région', 'text' => 'Blés de Loire-Atlantique et de Vendée, moulus sur meule par le Moulin de Saint-Mars et la Minoterie Giraudineau.'],
                ['icon' => 'clock', 'title' => 'Fermentations longues', 'text' => 'Entre 18 et 24 heures de pousse pour les pains au levain : moins de sel, plus de goût, meilleure digestibilité.'],
                ['icon' => 'heart', 'title' => 'Zéro gaspillage', 'text' => 'Les invendus deviennent chapelure, pain perdu ou sont donnés à l\'épicerie solidaire du Bouffay chaque soir.'],
            ],
        ],
        [
            'type'  => 'team',
            'title' => 'L\'équipe',
            'intro' => 'Cinq personnes, deux fondateurs et trois salariés, se relaient du fournil à la boutique.',
            'items' => [
                ['name' => 'Marc Lefèvre',   'role' => 'Boulanger, cofondateur', 'bio' => 'Au pétrin dès 4 h du matin. Responsable des pains au levain et de la baguette tradition médaillée.'],
                ['name' => 'Anne Lefèvre',   'role' => 'Pâtissière, cofondatrice', 'bio' => 'Compose la vitrine sucrée au fil des saisons et pilote les commandes pour les événements.'],
                ['name' => 'Yann Guéguen',   'role' => 'Boulanger', 'bio' => 'Arrivé en 2015 après son CAP à Nantes. Spécialiste du feuilletage et des viennoiseries du matin.'],
                ['name' => 'Inès Moreau',    'role' => 'Vendeuse, responsable boutique', 'bio' => 'Accueille les clients depuis 2018, gère les réservations de pain et les sandwichs du midi.'],
                ['name' => 'Élodie Rouxel',  'role' => 'Apprentie pâtissière', 'bio' => 'En deuxième année de BTM, elle alterne entre le fournil et le CFA de Sainte-Luce-sur-Loire.'],
            ],
        ],
        [
            'type'  => 'stats',
            'items' => [
                ['value' => '17 ans', 'label' => 'Le même levain, entretenu chaque jour'],
                ['value' => '4 h',    'label' => 'Heure d\'allumage du four'],
                ['value' => '2',      'label' => 'Moulins partenaires en Loire-Atlantique'],
                ['value' => '1',      'label' => 'Médaille d\'argent baguette tradition 2024'],
            ],
        ],
        [
            'type'  => 'gallery',
            'title' => 'Le fournil en images',
            'items' => [
                ['image' => 'fournil-four.svg', 'caption' => 'Le four à sole en pierre, installé en 2009'],
                ['image' => 'boutique.svg',     'caption' => 'Le comptoir en bois d\'origine'],
                ['image' => 'medaille.svg',     'caption' => 'Médaille d\'argent baguette tradition, Loire-Atlantique 2024'],
            ],
        ],
        [
            'type'   => 'cta',
            'title'  => 'Venez nous rencontrer',
            'text'   => 'La boutique est ouverte du mardi au dimanche. Le fournil se visite sur rendez-vous pour les écoles du quartier.',
            'button' => ['label' => 'Nous contacter', 'to' => '/contact'],
        ],
    ],
];
