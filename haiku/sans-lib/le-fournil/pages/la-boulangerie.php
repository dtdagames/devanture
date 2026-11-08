<?php
declare(strict_types=1);

require_once __DIR__ . '/../inc/blocks.php';

return [
    'title' => 'La boulangerie | Le Fournil, Nantes Bouffay',
    'description' => 'Découvrez l\'histoire du Fournil, boulangerie fondée en 2009 par Anne et Marc Lefèvre, rue de la Juiverie à Nantes, et ses horaires.',
    'body' => static function (): void {
        block_hero([
            'title' => 'La boulangerie',
            'subtitle' => 'Une maison de quartier, un levain entretenu depuis 2009 et une équipe qui cuit sous vos yeux.',
        ]);

        block_text_image([
            'side' => 'right',
            'image' => '/assets/boutique.svg',
            'alt' => 'Façade de la boulangerie rue de la Juiverie',
            'title' => 'Une histoire de levain et de quartier',
            'paragraphs' => [
                'Le Fournil s\'est installé rue de la Juiverie, au cœur du quartier Bouffay. La boutique et le fournil sont au même endroit : on voit les pains sortir du four.',
                'Nous travaillons avec des farines sélectionnées et un levain naturel. Les pâtes reposent longtemps, ce qui donne une mie alvéolée et une croûte qui croustille.',
            ],
        ]);

        block_team('Les fondateurs', [
            [
                'name' => 'Anne Lefèvre',
                'role' => 'Cofondatrice, responsable de la boutique',
                'bio' => 'Elle accueille les clients au comptoir, prend les commandes d\'événements et veille à la qualité de chaque fournée.',
                'initial' => 'A',
            ],
            [
                'name' => 'Marc Lefèvre',
                'role' => 'Cofondateur, boulanger',
                'bio' => 'Il tient le levain et conduit les fournées du matin. Il a obtenu la médaille d\'argent de la baguette tradition en 2024.',
                'initial' => 'M',
            ],
        ]);

        block_prose('Horaires et accès', [
            'Ouvert du mardi au dimanche, de 6h30 à 19h30. Fermé le lundi.',
            'Adresse : 8 rue de la Juiverie, 44000 Nantes. Téléphone : 02 40 00 00 00.',
            'Trois salariés travaillent avec les deux fondateurs pour assurer la vente, la fabrication et les sandwichs du midi.',
        ]);
    },
];
