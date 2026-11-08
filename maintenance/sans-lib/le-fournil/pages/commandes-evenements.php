<?php
declare(strict_types=1);

/** @var array $site */
return [
    'title'       => 'Commandes pour événements – Buffets et pièces montées | Le Fournil Nantes',
    'description' => 'Buffets salés, pièces montées, brioches et pains spéciaux pour vos mariages, réceptions et séminaires à Nantes. Devis sous 48 heures par la boulangerie Le Fournil.',
    'blocks'      => [
        [
            'type'     => 'hero',
            'title'    => 'Commandes pour vos événements',
            'subtitle' => 'Mariages, baptêmes, séminaires, pots de départ : nous préparons buffets et pièces montées sur mesure, livrés dans Nantes et sa métropole.',
            'image'    => 'buffet.svg',
            'cta'      => ['label' => 'Demander un devis', 'to' => '/contact'],
        ],
        [
            'type'    => 'features',
            'title'   => 'Ce que nous préparons',
            'columns' => 3,
            'items'   => [
                ['icon' => 'cake',  'title' => 'Pièces montées', 'text' => 'Choux à la crème vanille, chocolat ou café, nougatine maison, à partir de 40 choux. Montage sur place possible.'],
                ['icon' => 'wheat', 'title' => 'Buffets salés', 'text' => 'Mini-sandwichs, pains surprise, fougasses, quiches et feuilletés : comptez 6 à 8 pièces par personne pour un cocktail.'],
                ['icon' => 'truck', 'title' => 'Livraison', 'text' => 'Livraison le jour même dans Nantes et sa métropole, ou retrait en boutique à l\'heure convenue.'],
            ],
        ],
        [
            'type'       => 'text_image',
            'title'      => 'Comment ça se passe',
            'text'       => [
                'Vous nous décrivez l\'événement (date, nombre de convives, lieu, envies) par téléphone, par e-mail ou via le formulaire de contact. Anne vous rappelle sous 48 heures avec une proposition chiffrée.',
                'Pour une pièce montée, nous conseillons de réserver trois semaines avant la date ; pour un buffet, une semaine suffit la plupart du temps. Un acompte de 30 % confirme la commande.',
                'Le jour J, nous livrons ou vous retirez en boutique. Les pièces montées de plus de 80 choux sont montées sur place par Anne pour arriver intactes.',
            ],
            'image'      => 'piece-montee.svg',
            'alt'        => 'Pièce montée de choux et nougatine',
            'caption'    => 'Pièce montée de 90 choux, montée sur place',
            'image_side' => 'right',
        ],
        [
            'type'  => 'gallery',
            'title' => 'Quelques réalisations',
            'items' => [
                ['image' => 'piece-montee.svg', 'caption' => 'Pièce montée de mariage, 120 choux'],
                ['image' => 'buffet.svg',       'caption' => 'Buffet salé pour un séminaire de 60 personnes'],
                ['image' => 'viennoiseries.svg', 'caption' => 'Petit-déjeuner d\'entreprise, viennoiseries miniatures'],
            ],
        ],
        [
            'type'  => 'testimonials',
            'title' => 'Ils nous ont fait confiance',
            'items' => [
                ['quote' => 'Pièce montée de 120 choux pour notre mariage à Vertou, montée sur place en vingt minutes. Impeccable et délicieuse.', 'author' => 'Sophie et Karim', 'place' => 'Vertou', 'rating' => 5],
                ['quote' => 'Nous commandons les petits-déjeuners de nos séminaires au Fournil depuis trois ans. Livraison à 8 h précises, jamais un retard.', 'author' => 'Agence Rivage', 'place' => 'Nantes centre', 'rating' => 5],
            ],
        ],
        [
            'type'  => 'faq',
            'title' => 'Questions sur les commandes',
            'items' => [
                ['q' => 'Quel délai pour commander ?', 'a' => 'Trois semaines pour une pièce montée, une semaine pour un buffet, 48 heures pour un plateau de viennoiseries ou un entremets. En période de fêtes, les délais sont plus longs : appelez-nous tôt.'],
                ['q' => 'Livrez-vous en dehors de Nantes ?', 'a' => 'Nous livrons dans toute la métropole nantaise (Rezé, Vertou, Orvault, Saint-Herblain, Carquefou…). Au-delà de 25 km, nous vous proposons un retrait en boutique.'],
                ['q' => 'Proposez-vous des options végétariennes ou sans porc ?', 'a' => 'Oui. Chaque buffet comprend au moins un tiers de pièces végétariennes, et nous adaptons les garnitures sur demande. Nous ne pouvons pas garantir l\'absence de gluten ou de fruits à coque.'],
                ['q' => 'Comment régler ?', 'a' => 'Acompte de 30 % à la commande, solde à la livraison ou au retrait. Nous acceptons la carte, les espèces, les chèques et les virements pour les entreprises.'],
            ],
        ],
        [
            'type'   => 'cta',
            'title'  => 'Parlons de votre événement',
            'text'   => 'Appelez-nous au 02 40 00 00 00 ou envoyez votre demande : nous répondons sous 48 heures avec un devis détaillé.',
            'button' => ['label' => 'Envoyer une demande', 'to' => '/contact'],
        ],
    ],
];
