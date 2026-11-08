<?php
declare(strict_types=1);

return function (array $ctx): array {
    $body = b_hero(
        "Avocats à Bordeaux : un conseil clair pour vos affaires et votre famille",
        "Cabinet Garnier & Associés, fondé en 2011. Droit du travail, droit des affaires et droit de la famille, à Bordeaux, Libourne et Arcachon.",
        'hero.svg',
        [
            ['label' => 'Prendre rendez-vous', 'to' => '/contact'],
            ['label' => 'Nos domaines', 'to' => '/domaines', 'variant' => 'light'],
        ]
    )
    . b_figures([
        ['value' => '2011', 'label' => 'Année de fondation'],
        ['value' => '3', 'label' => 'Associés'],
        ['value' => '30 min', 'label' => 'Première consultation offerte'],
        ['value' => '3', 'label' => 'Villes d\'intervention'],
    ])
    . b_points('Pourquoi nous confier votre dossier', [
        ['icon' => 'clock', 'title' => 'Première consultation offerte', 'text' => 'Trente minutes pour faire le point sur votre situation, sans frais.'],
        ['icon' => 'euro', 'title' => 'Honoraires annoncés', 'text' => 'Forfait ou temps passé, convenu avant le début du travail.'],
        ['icon' => 'file', 'title' => 'Convention d\'honoraires', 'text' => 'Une convention écrite est établie systématiquement pour chaque dossier.'],
        ['icon' => 'pin', 'title' => 'Bordeaux, Libourne, Arcachon', 'text' => 'Nous intervenons dans ces trois villes, au cabinet ou sur place.'],
    ])
    . b_richtext(
        'Un cabinet à taille humaine',
        [
            "Depuis 2011, le cabinet accompagne salariés, employeurs, entreprises, particuliers et familles. Chaque dossier est suivi par l'associé spécialiste du domaine, qui reste votre interlocuteur du début à la fin.",
            "Nous privilégions des réponses précises, des délais annoncés et une information régulière sur l'avancement de votre affaire.",
        ],
        'cabinet.svg',
        'Salle de réunion du cabinet',
        'right'
    )
    . b_cta(
        'Un litige, une séparation, un licenciement ?',
        'Décrivez-nous votre situation : une première consultation de 30 minutes vous est offerte.',
        'Nous contacter',
        '/contact'
    );

    return [
        'title' => 'Avocats à Bordeaux | Cabinet Garnier & Associés',
        'description' => 'Cabinet d\'avocats à Bordeaux fondé en 2011 : droit du travail, droit des affaires, droit de la famille. Première consultation de 30 minutes offerte.',
        'body' => $body,
    ];
};
