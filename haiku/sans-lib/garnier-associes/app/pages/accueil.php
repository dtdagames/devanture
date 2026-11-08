<?php
declare(strict_types=1);

echo block_hero([
    'eyebrow' => 'Avocats à Bordeaux depuis 2011',
    'title' => 'Un conseil clair pour vos affaires, votre travail et votre famille',
    'lead' => 'Le cabinet Garnier & Associés intervient en droit du travail, en droit des affaires et en droit de la famille, à Bordeaux, Libourne et Arcachon. Une première consultation de 30 minutes est offerte.',
    'image' => '/assets/hero-bordeaux.svg',
    'actions' => [
        ['label' => 'Prendre rendez-vous', 'to' => '/contact', 'variant' => 'primary'],
        ['label' => 'Nos domaines', 'to' => '/domaines', 'variant' => 'secondary'],
    ],
]);

echo block_stats([
    'items' => [
        ['value' => '2011', 'label' => 'année de fondation'],
        ['value' => '3', 'label' => 'associés'],
        ['value' => '6', 'label' => 'personnes dans l\'équipe'],
        ['value' => '3', 'label' => 'villes d\'intervention'],
    ],
]);

echo block_points([
    'title' => 'Pourquoi nous consulter',
    'intro' => 'Des règles simples, annoncées dès le premier échange.',
    'items' => [
        ['icon' => 'clock', 'title' => 'Première consultation offerte', 'text' => 'Trente minutes pour analyser votre situation et vous indiquer les options possibles.'],
        ['icon' => 'file', 'title' => 'Convention d\'honoraires écrite', 'text' => 'Chaque mission fait l\'objet d\'une convention d\'honoraires signée avant le début du travail.'],
        ['icon' => 'briefcase', 'title' => 'Forfait ou temps passé', 'text' => 'Vous choisissez le mode de facturation le plus adapté à votre dossier, expliqué clairement.'],
        ['icon' => 'pin', 'title' => 'Présence locale', 'text' => 'Interventions à Bordeaux, Libourne et Arcachon, sur rendez-vous.'],
    ],
]);

echo block_split([
    'title' => 'Un cabinet bordelais, à taille humaine',
    'paragraphs' => [
        'Fondé en 2011, le cabinet réunit trois associés, deux collaboratrices et une assistante. Chaque dossier a un interlocuteur identifié.',
        'Nous employons un langage sans jargon, nous annonçons les délais dès le départ et nous vous tenons informés des étapes de la procédure ou de la négociation.',
        'Employeurs, salariés, entreprises ou particuliers : nous accompagnons aussi bien les situations urgentes que les projets de long terme.',
    ],
    'image' => '/assets/cabinet-facade.svg',
    'alt' => 'Illustration de substitution : façade du cabinet',
]);

echo block_cta([
    'title' => 'Une question sur votre situation ?',
    'text' => 'Prenez rendez-vous pour une première consultation de 30 minutes, offerte.',
    'label' => 'Nous contacter',
    'to' => '/contact',
]);
