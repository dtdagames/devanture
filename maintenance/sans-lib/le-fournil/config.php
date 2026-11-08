<?php
declare(strict_types=1);

/**
 * Configuration du site Le Fournil.
 * Tout le contenu "identité" est centralisé ici ; les pages sont dans pages/.
 */
return [
    'name'        => 'Le Fournil',
    'tagline'     => 'Artisan boulanger à Nantes, quartier Bouffay',
    'locale'      => 'fr-FR',
    'base_url'    => '',
    'contact'     => [
        'address'   => '8 rue de la Juiverie, 44000 Nantes',
        'phone'     => '02 40 00 00 00',
        'phone_tel' => '+33240000000',
        'email'     => 'bonjour@lefournil-nantes.fr',
        'hours'     => 'Du mardi au dimanche, 6 h 30 – 19 h 30',
    ],
    // Adresse qui reçoit les messages du formulaire de contact.
    'mail_to'     => 'bonjour@lefournil-nantes.fr',
    'nav'         => [
        ['label' => 'Accueil',        'to' => '/'],
        ['label' => 'Nos produits',   'to' => '/nos-produits'],
        ['label' => 'La boulangerie', 'to' => '/la-boulangerie'],
        ['label' => 'Événements',     'to' => '/commandes-evenements'],
        ['label' => 'Recrutement',    'to' => '/recrutement'],
        ['label' => 'Contact',        'to' => '/contact'],
    ],
    'footer'      => [
        'text'  => 'Le Fournil – SARL au capital de 20 000 €, SIRET 512 345 678 00019',
        'links' => [
            ['label' => 'Mentions légales', 'to' => '/mentions-legales'],
            ['label' => 'Recrutement',      'to' => '/recrutement'],
            ['label' => 'Contact',          'to' => '/contact'],
        ],
    ],
    // Route => identifiant du fichier dans pages/
    'routes'      => [
        '/'                      => 'accueil',
        '/nos-produits'          => 'nos-produits',
        '/la-boulangerie'        => 'la-boulangerie',
        '/commandes-evenements'  => 'commandes-evenements',
        '/contact'               => 'contact',
        '/recrutement'           => 'recrutement',
        '/mentions-legales'      => 'mentions-legales',
    ],
];
