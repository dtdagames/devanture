<?php
declare(strict_types=1);

require_once __DIR__ . '/../inc/blocks.php';

return [
    'title' => 'Nos produits | Boulangerie Le Fournil, Nantes',
    'description' => 'Pains au levain, baguette tradition, viennoiseries pur beurre et pâtisseries de saison : découvrez les produits du Fournil, à Nantes.',
    'body' => static function (): void {
        block_hero([
            'title' => 'Nos produits',
            'subtitle' => 'Des pains longuement fermentés, des viennoiseries au beurre pur et des pâtisseries qui suivent les saisons.',
        ]);

        block_gallery('Quelques-unes de nos fabrications', [
            ['src' => '/assets/pains.svg', 'alt' => 'Pains au levain sur une planche', 'caption' => 'Pains au levain'],
            ['src' => '/assets/galerie-1.svg', 'alt' => 'Baguettes tradition alignées', 'caption' => 'Baguette tradition'],
            ['src' => '/assets/viennoiseries.svg', 'alt' => 'Viennoiseries dorées', 'caption' => 'Viennoiseries pur beurre'],
            ['src' => '/assets/galerie-2.svg', 'alt' => 'Croissants au beurre', 'caption' => 'Croissants au beurre'],
            ['src' => '/assets/patisseries.svg', 'alt' => 'Pâtisseries de saison', 'caption' => 'Pâtisseries de saison'],
            ['src' => '/assets/galerie-3.svg', 'alt' => 'Tartes aux fruits', 'caption' => 'Tartes aux fruits'],
        ]);

        block_faq('Questions fréquentes', [
            [
                'q' => 'Comment conserver le pain au levain ?',
                'a' => 'Dans un sac en papier ou un linge, à température ambiante, il se garde trois à quatre jours. Tranché, il se congèle très bien.',
            ],
            [
                'q' => 'Avez-vous des produits sans gluten ?',
                'a' => 'Non. Notre fournil travaille la farine de blé. Pour toute question sur les allergènes, demandez-nous au comptoir.',
            ],
            [
                'q' => 'Peut-on réserver une pâtisserie pour le week-end ?',
                'a' => 'Oui, par téléphone au 02 40 00 00 00 ou via le formulaire de contact, au moins 48 heures à l\'avance.',
            ],
        ]);

        block_cta([
            'title' => 'Une commande pour un événement ?',
            'text' => 'Buffets, pièces montées et plateaux sur mesure : nous préparons vos commandes sur devis.',
            'button' => ['label' => 'Voir nos commandes événements', 'to' => '/commandes-evenements'],
        ]);
    },
];
