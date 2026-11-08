<?php
declare(strict_types=1);

echo block_hero([
    'title' => 'Nos domaines d\'intervention',
    'lead' => 'Trois spécialités, trois associés, une même exigence : une réponse claire et rapide à chaque question juridique.',
]);

echo block_points([
    'items' => [
        [
            'icon' => 'briefcase',
            'title' => 'Droit du travail',
            'text' => 'Conseil aux employeurs et aux salariés : embauche, rupture du contrat (licenciement, rupture conventionnelle), règlement intérieur, contentieux prud\'homal. Responsable : Me Hélène Garnier.',
        ],
        [
            'icon' => 'scale',
            'title' => 'Droit des affaires',
            'text' => 'Création et vie de la société, contrats commerciaux, baux commerciaux, recouvrement de créances, cession de fonds ou de parts. Responsable : Me Thomas Ruiz.',
        ],
        [
            'icon' => 'heart',
            'title' => 'Droit de la famille',
            'text' => 'Séparation et divorce, consentement mutuel, pension alimentaire, autorité parentale, partage des biens. Responsable : Me Inès Kaddour.',
        ],
    ],
]);

echo block_cta([
    'title' => 'Votre situation ne rentre dans aucune de ces matières ?',
    'text' => 'Décrivez-nous votre cas : nous vous indiquons si nous pouvons le traiter ou vers qui vous orienter.',
    'label' => 'Nous écrire',
    'to' => '/contact',
]);
