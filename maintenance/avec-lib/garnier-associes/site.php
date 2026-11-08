<?php
declare(strict_types=1);

return [
    'name' => 'Garnier & Associés',
    'tagline' => 'Avocats à Bordeaux',
    'contact' => [
        'email' => 'contact@garnier-associes.fr',
        'phone' => '05 56 00 00 00',
        'address' => "25 cours de l'Intendance\n33000 Bordeaux",
    ],
    'nav' => [
        ['label' => 'Accueil', 'to' => '/'],
        ['label' => "Domaines d'intervention", 'to' => '/domaines-d-intervention'],
        ['label' => 'Le cabinet', 'to' => '/le-cabinet'],
        ['label' => 'Honoraires', 'to' => '/honoraires'],
        ['label' => 'Recrutement', 'to' => '/recrutement'],
        ['label' => 'Contact', 'to' => '/contact'],
    ],
    'footer_links' => [
        ['label' => 'Mentions légales', 'to' => '/mentions-legales'],
        ['label' => 'Honoraires', 'to' => '/honoraires'],
        ['label' => 'Recrutement', 'to' => '/recrutement'],
    ],
    'routes' => [
        '/' => ['page' => 'accueil', 'title' => 'Garnier & Associés, avocats à Bordeaux', 'description' => "Cabinet d'avocats à Bordeaux fondé en 2011 : droit du travail, droit des affaires, droit de la famille. Première consultation de 30 minutes offerte."],
        '/domaines-d-intervention' => ['page' => 'domaines', 'title' => "Domaines d'intervention | Garnier & Associés", 'description' => "Droit du travail, droit des affaires et droit de la famille : les domaines dans lesquels le cabinet Garnier & Associés vous conseille et vous défend à Bordeaux."],
        '/le-cabinet' => ['page' => 'cabinet', 'title' => 'Le cabinet et son équipe | Garnier & Associés', 'description' => "Trois avocats associés, deux collaboratrices et une assistante : découvrez le cabinet Garnier & Associés, installé cours de l'Intendance à Bordeaux depuis 2011."],
        '/honoraires' => ['page' => 'honoraires', 'title' => 'Honoraires | Garnier & Associés', 'description' => "Honoraires au forfait ou au temps passé, convention d'honoraires systématique, première consultation de 30 minutes offerte : toute la transparence sur nos tarifs."],
        '/recrutement' => ['page' => 'recrutement', 'title' => 'Recrutement · Garnier & Associés', 'description' => 'Le cabinet recrute un collaborateur ou une collaboratrice en droit des affaires à Bordeaux.'],
        '/contact' => ['page' => 'contact', 'title' => 'Contact | Garnier & Associés', 'description' => "Contactez le cabinet Garnier & Associés à Bordeaux : 25 cours de l'Intendance, 05 56 00 00 00. Interventions à Bordeaux, Libourne et Arcachon."],
        '/mentions-legales' => ['page' => 'mentions', 'title' => 'Mentions légales | Garnier & Associés', 'description' => "Mentions légales du site du cabinet d'avocats Garnier & Associés : éditeur, hébergement, données personnelles et déontologie."],
    ],
];
