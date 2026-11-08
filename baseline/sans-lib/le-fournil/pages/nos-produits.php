<?php
declare(strict_types=1);

/** @var array $site */
return [
    'title'       => 'Nos produits – Pains au levain, viennoiseries, pâtisseries | Le Fournil Nantes',
    'description' => 'Les pains au levain naturel, viennoiseries pur beurre, pâtisseries de saison et sandwichs du midi de la boulangerie Le Fournil, à Nantes.',
    'blocks'      => [
        [
            'type'     => 'hero',
            'title'    => 'Nos produits',
            'subtitle' => 'Tout est pétri, façonné et cuit sur place, rue de la Juiverie. La carte change avec les saisons et les récoltes de nos producteurs.',
        ],
        [
            'type'       => 'text_image',
            'title'      => 'Les pains au levain naturel',
            'text'       => [
                'Notre levain est né en 2009 et n\'a jamais été refait depuis. Il donne à nos pains une mie souple, une croûte épaisse et une conservation de plusieurs jours sans additif.',
                'Toute l\'année : la tourte de meule (1 kg ou 500 g), le pain de campagne, le complet, le seigle-noix et la baguette tradition médaillée en 2024. Le week-end s\'ajoutent le pain aux figues et la miche de petit épeautre.',
                'Les pains sont cuits en deux fournées : la première sort à 6 h 30, la seconde vers 11 h pour le pain chaud du déjeuner.',
            ],
            'image'      => 'pain-levain.svg',
            'alt'        => 'Tourtes de meule au levain sur la grille de refroidissement',
            'image_side' => 'left',
        ],
        [
            'type'       => 'text_image',
            'title'      => 'Les viennoiseries pur beurre',
            'text'       => [
                'Croissants, pains au chocolat, pains aux raisins, brioches et kouign-amann : la pâte feuilletée est tourée à la main chaque après-midi avec un beurre AOP Charentes-Poitou, et cuite le lendemain matin.',
                'Le dimanche, Marc prépare aussi la brioche vendéenne tressée de sa grand-mère, en 400 g et 800 g. Elle part vite : on peut la réserver la veille par téléphone.',
            ],
            'image'      => 'viennoiseries.svg',
            'alt'        => 'Plateau de croissants et pains au chocolat dorés',
            'image_side' => 'right',
        ],
        [
            'type'       => 'text_image',
            'title'      => 'Les pâtisseries de saison',
            'text'       => [
                'Anne compose la vitrine sucrée au rythme des fruits : fraises de Machecoul au printemps, abricots et cassis l\'été, pommes et poires du verger de Mauves à l\'automne, agrumes et chocolat en hiver.',
                'Vous trouverez toujours le flan à la vanille, la tarte du jour, les éclairs, le Paris-Brest et un gâteau de voyage à partager. Les entremets pour 6 à 10 personnes se commandent 48 heures à l\'avance.',
            ],
            'image'      => 'patisseries.svg',
            'alt'        => 'Vitrine de tartes et entremets de saison',
            'image_side' => 'left',
        ],
        [
            'type'       => 'text_image',
            'title'      => 'Les sandwichs du midi',
            'text'       => [
                'De 11 h 30 à 14 h 30, nous proposons chaque jour quatre sandwichs sur pain de campagne ou baguette tradition, garnis le matin même : jambon-beurre de Bretagne, poulet rôti-crudités, chèvre-miel-noix et une recette végétarienne qui change toutes les semaines.',
                'Une formule à 8,90 € réunit un sandwich, une boisson et une pâtisserie individuelle. Les commandes groupées pour les bureaux du quartier se passent avant 10 h au 02 40 00 00 00.',
            ],
            'image'      => 'sandwichs.svg',
            'alt'        => 'Sandwichs du midi alignés sur le comptoir',
            'image_side' => 'right',
        ],
        [
            'type'  => 'faq',
            'title' => 'Questions fréquentes',
            'items' => [
                ['q' => 'Vos pains contiennent-ils de la levure ?', 'a' => 'Non. Tous nos pains sont levés uniquement au levain naturel, ce qui demande 18 à 24 heures de fermentation. Seules les viennoiseries et la brioche contiennent de la levure de boulanger.'],
                ['q' => 'Proposez-vous du pain sans gluten ?', 'a' => 'Nous ne fabriquons pas de pain sans gluten : notre fournil travaille le blé toute la journée et nous ne pouvons pas garantir l\'absence de traces. Nous proposons en revanche du petit épeautre et du seigle, moins riches en gluten.'],
                ['q' => 'Peut-on réserver du pain ?', 'a' => 'Oui, par téléphone ou en boutique, la veille avant 18 h. Votre commande vous attend au comptoir jusqu\'à la fermeture.'],
                ['q' => 'Le pain invendu est-il jeté ?', 'a' => 'Non. Il est transformé en chapelure et en pain perdu, ou remis chaque soir à l\'épicerie solidaire du quartier.'],
            ],
        ],
        [
            'type'   => 'cta',
            'title'  => 'Envie de goûter ?',
            'text'   => 'La boutique est ouverte du mardi au dimanche, de 6 h 30 à 19 h 30, au 8 rue de la Juiverie.',
            'button' => ['label' => 'Voir l\'adresse et les horaires', 'to' => '/contact'],
        ],
    ],
];
