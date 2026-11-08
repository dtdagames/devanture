<?php
declare(strict_types=1);

return [
    'route' => '/honoraires',
    'title' => 'Honoraires et conventions',
    'description' => 'Honoraires au forfait ou au temps passé, convention d\'honoraires systématique et première consultation de 30 minutes offerte.',
    'blocks' => [
        [
            'type' => 'hero',
            'compact' => true,
            'title' => 'Honoraires et conventions',
            'subtitle' => 'Des modalités connues avant le début de la mission, formalisées dans une convention d\'honoraires.',
        ],
        [
            'type' => 'features',
            'title' => 'Deux modes de facturation',
            'intro' => 'Selon la nature du dossier, nous proposons un forfait ou une facturation au temps passé.',
            'columns' => 3,
            'items' => [
                ['icon' => 'euro', 'title' => 'Au forfait', 'text' => 'Un montant fixé à l\'avance pour une prestation définie, par exemple la rédaction d\'un contrat ou la négociation d\'une rupture.'],
                ['icon' => 'clock', 'title' => 'Au temps passé', 'text' => 'Une facturation selon le temps réellement consacré au dossier, avec un point d\'étape régulier sur le budget.'],
                ['icon' => 'shield', 'title' => 'Première consultation offerte', 'text' => 'Trente minutes pour analyser votre situation et vous indiquer les options possibles, sans frais.'],
            ],
        ],
        [
            'type' => 'richtext',
            'side' => 'right',
            'title' => 'Une convention d\'honoraires systématique',
            'paragraphs' => [
                'Avant toute mission, une convention d\'honoraires est établie et signée. Elle précise l\'objet de la mission, le mode de calcul des honoraires, les débours éventuels et les modalités de paiement.',
                'Cette convention vous permet de savoir à tout moment ce que couvre votre dossier et ce qu\'il coûte.',
            ],
        ],
        [
            'type' => 'faq',
            'title' => 'Questions sur les honoraires',
            'items' => [
                ['q' => 'La première consultation est-elle vraiment gratuite ?', 'a' => 'Oui. La première consultation de 30 minutes est offerte. Elle ne donne pas lieu à la signature d\'une convention.'],
                ['q' => 'Comment choisir entre forfait et temps passé ?', 'a' => 'Lors du premier rendez-vous, nous vous proposons la formule la plus adaptée à votre dossier et vous expliquons les raisons de ce choix.'],
                ['q' => 'Que contient la convention d\'honoraires ?', 'a' => 'Elle décrit la mission, son périmètre, le montant ou le mode de calcul des honoraires, les débours et les modalités de paiement.'],
                ['q' => 'Puis-je obtenir une estimation avant de m\'engager ?', 'a' => 'Oui. Après la première consultation, nous vous adressons un devis ou une estimation écrite avant toute signature.'],
            ],
        ],
        [
            'type' => 'cta',
            'title' => 'Demander un devis',
            'text' => 'Décrivez-nous votre dossier : nous vous indiquerons la formule proposée.',
            'button' => ['label' => 'Nous contacter', 'to' => '/contact'],
        ],
    ],
];
