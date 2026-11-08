<?php
declare(strict_types=1);

require_once __DIR__ . '/../inc/blocks.php';

return [
    'title' => 'Boulangerie Le Fournil | Pain au levain à Nantes',
    'description' => 'Boulangerie artisanale au Bouffay, à Nantes : pain au levain naturel, viennoiseries pur beurre, pâtisseries de saison et commandes pour vos événements.',
    'body' => static function (): void {
        block_hero([
            'title' => 'Le pain au levain, pétri et cuit chaque matin au Bouffay',
            'subtitle' => 'Boulangerie artisanale fondée en 2009 par Anne et Marc Lefèvre, rue de la Juiverie à Nantes.',
            'image' => '/assets/hero.svg',
            'buttons' => [
                ['label' => 'Découvrir nos produits', 'to' => '/nos-produits'],
                ['label' => 'Nous contacter', 'to' => '/contact'],
            ],
        ]);

        block_points('Ce qui fait notre pain', [
            ['icon' => 'epi', 'title' => 'Levain naturel', 'text' => 'Nos pains fermentent lentement, au levain que nous entretenons depuis 2009.'],
            ['icon' => 'horloge', 'title' => 'Fabrication du jour', 'text' => 'Le fournil démarre tôt : ce qui est en vitrine a été cuit le matin même.'],
            ['icon' => 'coeur', 'title' => 'Beurre pur', 'text' => 'Croissants, pains au chocolat et brioches sont faits avec du beurre pur.'],
            ['icon' => 'etoile', 'title' => 'Une distinction', 'text' => 'Médaille d\'argent de la baguette tradition en Loire-Atlantique, en 2024.'],
        ]);

        block_text_image([
            'side' => 'left',
            'image' => '/assets/fondateurs.svg',
            'alt' => 'Anne et Marc Lefèvre, fondateurs de la boulangerie',
            'title' => 'Anne et Marc, deux boulangers installés au Bouffay',
            'paragraphs' => [
                'Anne et Marc Lefèvre ont ouvert Le Fournil en 2009 dans une rue du vieux Nantes. Ils ont voulu une boulangerie où le pain se fait vraiment sur place, à partir d\'un levain entretenu chaque jour.',
                'Aujourd\'hui, l\'équipe compte trois salariés aux côtés des deux fondateurs. Ensemble, ils préparent la fournée du matin, les viennoiseries pur beurre et les sandwichs du midi.',
            ],
        ]);

        block_stats([
            ['value' => '2009', 'label' => 'Année de fondation'],
            ['value' => '5', 'label' => 'Personnes au fournil, fondateurs compris'],
            ['value' => '6', 'label' => 'Jours d\'ouverture par semaine'],
            ['value' => 'Argent', 'label' => 'Médaille de la baguette tradition, 2024'],
        ]);

        block_cta([
            'title' => 'Un buffet, un mariage, une réunion ?',
            'text' => 'Nous préparons vos commandes pour vos événements : petits pains garnis, pièces montées et pâtisseries sur mesure.',
            'button' => ['label' => 'Demander un devis', 'to' => '/commandes-evenements'],
        ]);
    },
];
