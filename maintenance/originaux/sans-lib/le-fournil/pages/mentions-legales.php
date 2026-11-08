<?php
declare(strict_types=1);

/** @var array $site */
return [
    'title'       => 'Mentions légales | Le Fournil Nantes',
    'description' => 'Mentions légales du site de la boulangerie Le Fournil, 8 rue de la Juiverie, 44000 Nantes : éditeur, hébergeur, données personnelles.',
    'blocks'      => [
        [
            'type'     => 'hero',
            'title'    => 'Mentions légales',
            'subtitle' => 'Informations légales relatives au site lefournil-nantes.fr.',
        ],
        [
            'type'  => 'prose',
            'items' => [
                [
                    'title' => 'Éditeur du site',
                    'text'  => [
                        'Le présent site est édité par la SARL Le Fournil, au capital de 20 000 €, immatriculée au RCS de Nantes sous le numéro 512 345 678, SIRET 512 345 678 00019, TVA intracommunautaire FR 42 512345678.',
                        'Siège social : 8 rue de la Juiverie, 44000 Nantes. Téléphone : 02 40 00 00 00. E-mail : bonjour@lefournil-nantes.fr.',
                        'Directeurs de la publication : Anne Lefèvre et Marc Lefèvre, cogérants.',
                    ],
                ],
                [
                    'title' => 'Hébergement',
                    'text'  => 'Le site est hébergé par OVH SAS, 2 rue Kellermann, 59100 Roubaix, France. Téléphone : 09 72 10 10 07.',
                ],
                [
                    'title' => 'Propriété intellectuelle',
                    'text'  => 'L\'ensemble des contenus de ce site (textes, images, logo, recettes décrites) est la propriété de la SARL Le Fournil, sauf mention contraire. Toute reproduction, même partielle, est soumise à autorisation écrite préalable.',
                ],
                [
                    'title' => 'Données personnelles',
                    'text'  => [
                        'Les informations saisies dans le formulaire de contact (nom, e-mail, téléphone, message) sont utilisées uniquement pour répondre à votre demande. Elles sont conservées douze mois au maximum puis supprimées. Elles ne sont ni cédées ni vendues à des tiers.',
                        'Conformément au Règlement général sur la protection des données (RGPD) et à la loi Informatique et Libertés, vous disposez d\'un droit d\'accès, de rectification et de suppression de vos données. Pour l\'exercer, écrivez à bonjour@lefournil-nantes.fr ou par courrier à l\'adresse du siège.',
                    ],
                ],
                [
                    'title' => 'Cookies',
                    'text'  => 'Ce site n\'utilise aucun cookie de mesure d\'audience ni de publicité. Un seul cookie technique de session est déposé pour sécuriser le formulaire de contact ; il expire à la fermeture du navigateur.',
                ],
                [
                    'title' => 'Crédits',
                    'text'  => 'Conception et réalisation : Le Fournil. Illustrations de substitution générées en interne.',
                ],
            ],
        ],
    ],
];
