<?php
declare(strict_types=1);

/** @var array $site */
return [
    'title'       => 'Recrutement · Le Fournil',
    'description' => 'La boulangerie Le Fournil recrute un apprenti boulanger à Nantes pour la rentrée.',
    'blocks'      => [
        [
            'type'     => 'hero',
            'title'    => 'Rejoignez-nous',
            'subtitle' => 'Le Fournil recrute un apprenti boulanger pour la rentrée.',
        ],
        [
            'type'  => 'prose',
            'title' => 'Le poste',
            'items' => [
                [
                    'text' => [
                        'Vous apprendrez le pain au levain naturel, les viennoiseries pur beurre et la pâtisserie de saison aux côtés de Marc Lefèvre, dans un fournil de quartier où tout est pétri, façonné et cuit sur place.',
                        'Profil : CAP boulanger en cours ou en projet, goût du travail d\'équipe et du lever tôt. Contrat d\'apprentissage de deux ans, repos le lundi, prise de poste en septembre.',
                    ],
                ],
            ],
        ],
        [
            'type'   => 'cta',
            'title'  => 'Candidater',
            'text'   => 'Envoyez-nous quelques lignes et votre CV via le formulaire de contact.',
            'button' => ['label' => 'Postuler', 'to' => '/contact'],
        ],
    ],
];
