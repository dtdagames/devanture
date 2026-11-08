<?php
render_component('hero', [
    'title' => 'Avocats à Bordeaux, à vos côtés depuis 2011',
    'subtitle' => "Droit du travail, droit des affaires, droit de la famille : un conseil clair, des honoraires annoncés d'avance, et une première consultation de 30 minutes offerte.",
    'image' => 'hero.svg',
    'cta' => ['label' => 'Prendre rendez-vous', 'to' => '/contact'],
    'secondary' => ['label' => "Nos domaines d'intervention", 'to' => '/domaines-d-intervention'],
]);

render_component('features', [
    'title' => 'Un cabinet à taille humaine',
    'intro' => "Trois associés, chacun spécialiste de sa matière, et une équipe qui suit votre dossier de bout en bout.",
    'columns' => 3,
    'items' => [
        ['icon' => 'shield', 'title' => 'Droit du travail', 'text' => 'Licenciement, rupture conventionnelle, harcèlement, contentieux prud\'homal : salariés et employeurs sont conseillés par Me Hélène Garnier.', 'link' => ['label' => 'En savoir plus', 'to' => '/domaines-d-intervention#travail']],
        ['icon' => 'tools', 'title' => 'Droit des affaires', 'text' => 'Création et vie de la société, baux commerciaux, contrats, litiges entre associés : Me Thomas Ruiz accompagne dirigeants et entrepreneurs.', 'link' => ['label' => 'En savoir plus', 'to' => '/domaines-d-intervention#affaires']],
        ['icon' => 'home', 'title' => 'Droit de la famille', 'text' => 'Divorce, garde des enfants, pensions, succession : Me Inès Kaddour vous écoute et défend vos intérêts avec tact.', 'link' => ['label' => 'En savoir plus', 'to' => '/domaines-d-intervention#famille']],
    ],
]);

render_component('richtext', [
    'title' => 'Le cabinet Garnier & Associés',
    'text' => "Fondé en 2011 cours de l'Intendance, au cœur de Bordeaux, le cabinet réunit trois avocats associés, deux collaboratrices et une assistante.\n\nNous intervenons à Bordeaux, à Libourne et à Arcachon, devant les juridictions de la Gironde et, selon les dossiers, devant d'autres juridictions.\n\nNotre méthode tient en trois points : écouter, expliquer les options avec leurs risques, puis agir. Chaque mission débute par une convention d'honoraires écrite.",
    'image' => 'cabinet.svg',
    'image_position' => 'right',
    'cta' => ['label' => "Découvrir l'équipe", 'to' => '/le-cabinet'],
]);

render_component('stats', [
    'items' => [
        ['value' => '2011', 'label' => 'année de fondation'],
        ['value' => '3', 'label' => 'avocats associés'],
        ['value' => '3', 'label' => 'villes desservies'],
        ['value' => '30 min', 'label' => 'de première consultation offerte'],
    ],
]);

render_component('faq', [
    'title' => 'Questions fréquentes',
    'items' => [
        ['q' => 'Combien coûte la première consultation ?', 'a' => 'Elle est offerte et dure 30 minutes, au cabinet ou en visioconférence.'],
        ['q' => 'Intervenez-vous en dehors de Bordeaux ?', 'a' => "Oui, à Libourne et Arcachon, et devant toutes les juridictions de la cour d'appel de Bordeaux."],
        ['q' => 'Comment sont fixés les honoraires ?', 'a' => "Au forfait ou au temps passé, toujours dans une convention d'honoraires signée avant toute intervention."],
    ],
]);

render_component('cta', [
    'title' => 'Parlons de votre situation',
    'text' => 'Première consultation de 30 minutes offerte, sans engagement.',
    'button' => ['label' => 'Nous contacter', 'to' => '/contact'],
]);
