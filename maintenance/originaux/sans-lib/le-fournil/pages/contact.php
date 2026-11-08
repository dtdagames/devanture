<?php
declare(strict_types=1);

/** @var array $site */

$fields   = ['nom', 'email', 'telephone', 'sujet', 'message'];
$required = ['nom', 'email', 'message'];
$state    = handle_contact_form($site, $fields, $required);

return [
    'title'       => 'Contact – Adresse, horaires et formulaire | Le Fournil Nantes',
    'description' => 'Contactez la boulangerie Le Fournil, 8 rue de la Juiverie à Nantes : horaires, téléphone, e-mail et formulaire pour vos questions ou commandes.',
    'blocks'      => [
        [
            'type'     => 'hero',
            'title'    => 'Contact',
            'subtitle' => 'Une question, une réservation de pain, une demande de devis ? Écrivez-nous ou passez à la boutique.',
        ],
        [
            'type' => 'infos',
        ],
        [
            'type'     => 'contact_form',
            'title'    => 'Écrivez-nous',
            'intro'    => 'Nous répondons sous 48 heures, du mardi au samedi.',
            'fields'   => $fields,
            'required' => $required,
            'state'    => $state,
            'action'   => '/contact',
            'submit'   => 'Envoyer le message',
            'success'  => 'Merci pour votre message. Anne ou Inès vous répondra sous 48 heures à l\'adresse indiquée.',
        ],
        [
            'type'  => 'faq',
            'title' => 'Avant de nous écrire',
            'items' => [
                ['q' => 'Où se garer ?', 'a' => 'Le quartier Bouffay est piéton. Les parkings Decré-Bouffay et Commerce sont à cinq minutes à pied ; l\'arrêt de tram Bouffay (ligne 1) est à 150 mètres.'],
                ['q' => 'Êtes-vous ouverts les jours fériés ?', 'a' => 'Oui, sauf le 25 décembre et le 1er mai. Les horaires des jours fériés sont affichés en boutique et sur la porte deux semaines avant.'],
                ['q' => 'Recrutez-vous ?', 'a' => 'Nous accueillons un ou une apprentie chaque année en boulangerie ou en pâtisserie. Envoyez votre candidature par e-mail à bonjour@lefournil-nantes.fr.'],
            ],
        ],
    ],
];
