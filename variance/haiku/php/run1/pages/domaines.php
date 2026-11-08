<?php
declare(strict_types=1);

return [
    'route' => '/domaines',
    'title' => 'Domaines d\'intervention',
    'description' => 'Droit du travail, droit des affaires et droit de la famille : les domaines d\'intervention du cabinet Garnier & Associés à Bordeaux.',
    'blocks' => [
        [
            'type' => 'hero',
            'compact' => true,
            'title' => 'Nos domaines d\'intervention',
            'subtitle' => 'Trois spécialités, un même objectif : vous expliquer votre situation et défendre vos intérêts.',
        ],
        [
            'type' => 'richtext',
            'side' => 'left',
            'title' => 'Droit du travail',
            'paragraphs' => [
                'Nous conseillons salariés et employeurs : rupture du contrat de travail, licenciement, démission, contentieux devant le conseil de prud\'hommes et négociation de transactions.',
                'Me Hélène Garnier suit ces dossiers, en amont comme au contentieux.',
            ],
            'image' => 'domaine-travail.svg',
            'image_alt' => 'Illustration du droit du travail',
        ],
        [
            'type' => 'richtext',
            'side' => 'right',
            'title' => 'Droit des affaires',
            'paragraphs' => [
                'Nous accompagnons les dirigeants et les sociétés : création et vie sociétaire, rédaction et négociation de contrats, recouvrement de créances et litiges commerciaux.',
                'Me Thomas Ruiz intervient pour les entreprises de Bordeaux, Libourne et Arcachon.',
            ],
            'image' => 'domaine-affaires.svg',
            'image_alt' => 'Illustration du droit des affaires',
        ],
        [
            'type' => 'richtext',
            'side' => 'left',
            'title' => 'Droit de la famille',
            'paragraphs' => [
                'Nous accompagnons les familles dans les séparations, les questions de garde et de pension, ainsi que les liquidations de régimes matrimoniaux.',
                'Me Inès Kaddour privilégie la recherche d\'accords lorsque c\'est possible, et la préparation rigoureuse du dossier lorsque ce ne l\'est pas.',
            ],
            'image' => 'domaine-famille.svg',
            'image_alt' => 'Illustration du droit de la famille',
        ],
        [
            'type' => 'gallery',
            'title' => 'Nos locaux et nos échanges',
            'items' => [
                ['src' => 'galerie-reunion.svg', 'caption' => 'Salle de réunion', 'alt' => 'Salle de réunion du cabinet'],
                ['src' => 'galerie-accueil.svg', 'caption' => 'Espace d\'accueil', 'alt' => 'Espace d\'accueil du cabinet'],
                ['src' => 'galerie-bibliotheque.svg', 'caption' => 'Bibliothèque juridique', 'alt' => 'Bibliothèque juridique du cabinet'],
            ],
        ],
        [
            'type' => 'faq',
            'title' => 'Questions fréquentes',
            'items' => [
                ['q' => 'Intervenez-vous en dehors de Bordeaux ?', 'a' => 'Oui. Nous intervenons à Bordeaux, Libourne et Arcachon, et nous pouvons organiser certains rendez-vous à distance.'],
                ['q' => 'Un premier rendez-vous est-il payant ?', 'a' => 'La première consultation de 30 minutes est offerte. Elle sert à faire le point sur votre situation et sur les options possibles.'],
                ['q' => 'Un de vos associés peut-il être mon interlocuteur sur plusieurs domaines ?', 'a' => 'Chaque dossier est suivi par l\'associé spécialiste du domaine concerné. Si votre situation touche deux domaines, nous vous indiquons clairement qui fait quoi.'],
            ],
        ],
        [
            'type' => 'cta',
            'title' => 'Votre affaire relève-t-elle de l\'un de ces domaines ?',
            'text' => 'Contactez le cabinet pour une première consultation de 30 minutes.',
            'button' => ['label' => 'Prendre contact', 'to' => '/contact'],
        ],
    ],
];
