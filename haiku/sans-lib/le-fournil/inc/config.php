<?php
declare(strict_types=1);

return [
    'name' => 'Boulangerie Le Fournil',
    'tagline' => 'Pain au levain et viennoiseries pur beurre, à Nantes',
    'address' => '8 rue de la Juiverie, 44000 Nantes',
    'phone' => '02 40 00 00 00',
    'phone_link' => 'tel:+33240000000',
    'email' => 'bonjour@lefournil-nantes.fr',
    'hours' => 'Du mardi au dimanche, de 6h30 à 19h30. Fermé le lundi.',
    // Destinataire des messages du formulaire de contact.
    'contact_recipient' => 'bonjour@lefournil-nantes.fr',
    'nav' => [
        ['label' => 'Accueil', 'to' => '/'],
        ['label' => 'Nos produits', 'to' => '/nos-produits'],
        ['label' => 'La boulangerie', 'to' => '/la-boulangerie'],
        ['label' => 'Commandes événements', 'to' => '/commandes-evenements'],
        ['label' => 'Contact', 'to' => '/contact'],
    ],
    'legal' => [
        ['label' => 'Mentions légales', 'to' => '/mentions-legales'],
    ],
];
