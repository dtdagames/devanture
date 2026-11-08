<?php
declare(strict_types=1);

require_once __DIR__ . '/../inc/blocks.php';

return [
    'title' => 'Commandes événements | Le Fournil, Nantes',
    'description' => 'Buffets de petits pains, pièces montées et pâtisseries pour vos mariages, réunions et fêtes, préparés par Le Fournil à Nantes sur devis.',
    'body' => static function (): void {
        block_hero([
            'title' => 'Commandes pour vos événements',
            'subtitle' => 'Mariage, anniversaire, réunion d\'entreprise : nous préparons buffets et pièces montées sur devis.',
            'buttons' => [
                ['label' => 'Demander un devis', 'to' => '/contact'],
                ['label' => 'Voir nos produits', 'to' => '/nos-produits'],
            ],
        ]);

        block_points('Ce que nous préparons', [
            ['icon' => 'etoile', 'title' => 'Buffets salés et sucrés', 'text' => 'Petits pains garnis, mini-viennoiseries et pâtisseries en bouchées.'],
            ['icon' => 'coeur', 'title' => 'Pièces montées', 'text' => 'Choux, nougatine ou fruits de saison, montés sur votre thème.'],
            ['icon' => 'horloge', 'title' => 'Commande anticipée', 'text' => 'Indiquez-nous la date, le nombre de convives et le lieu de livraison.'],
        ]);

        block_gallery('Quelques réalisations', [
            ['src' => '/assets/evenement-1.svg', 'alt' => 'Pièce montée pour un mariage', 'caption' => 'Pièce montée pour mariage'],
            ['src' => '/assets/evenement-2.svg', 'alt' => 'Buffet de petits pains', 'caption' => 'Buffet de petits pains'],
            ['src' => '/assets/galerie-4.svg', 'alt' => 'Four à bois du fournil', 'caption' => 'Notre four à bois'],
        ]);

        block_faq('Questions sur les commandes', [
            [
                'q' => 'Quel délai prévoir ?',
                'a' => 'Comptez au moins cinq jours ouvrés pour une pièce montée et quarante-huit heures pour un buffet de petits pains.',
            ],
            [
                'q' => 'Livrez-vous ?',
                'a' => 'Nous livrons à Nantes et dans l\'agglomération, sur devis. Le retrait au fournil reste possible.',
            ],
            [
                'q' => 'Faut-il verser un acompte ?',
                'a' => 'Un acompte peut être demandé à la commande, notamment pour les pièces montées. Nous vous l\'indiquons dans le devis.',
            ],
        ]);

        block_cta([
            'title' => 'Parlez-nous de votre événement',
            'text' => 'Date, nombre de personnes, envies : nous revenons vers vous avec un devis.',
            'button' => ['label' => 'Nous écrire', 'to' => '/contact'],
        ]);
    },
];
