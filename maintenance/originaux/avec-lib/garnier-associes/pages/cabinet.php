<?php
render_component('hero', [
    'title' => 'Le cabinet et son équipe',
    'subtitle' => "Trois associés, deux collaboratrices et une assistante, réunis cours de l'Intendance depuis 2011.",
    'align' => 'left',
]);

render_component('richtext', [
    'title' => 'Notre façon d\'exercer',
    'text' => "Garnier & Associés est né en 2011 du souhait de trois avocats d'exercer un métier exigeant dans un cadre humain : des dossiers suivis personnellement, des explications sans jargon et des coûts connus d'avance.\n\nLe cabinet est installé au centre de Bordeaux, à proximité des juridictions. Nous nous déplaçons également à Libourne et à Arcachon.\n\nNous sommes tenus au secret professionnel et respectons les règles déontologiques de la profession d'avocat.",
    'image' => 'cabinet.svg',
    'image_position' => 'left',
]);

render_component('team', [
    'title' => 'Les associés',
    'members' => [
        ['name' => 'Me Hélène Garnier', 'role' => 'Avocate associée, droit du travail', 'bio' => "Fondatrice du cabinet, elle conseille salariés et employeurs et plaide devant le conseil de prud'hommes."],
        ['name' => 'Me Thomas Ruiz', 'role' => 'Avocat associé, droit des affaires', 'bio' => "Il accompagne les dirigeants de PME dans la création, la vie et les litiges de leur entreprise."],
        ['name' => 'Me Inès Kaddour', 'role' => 'Avocate associée, droit de la famille', 'bio' => "Elle traite divorces, questions d'enfants et successions, avec une priorité aux solutions amiables."],
    ],
]);

render_component('team', [
    'title' => "L'équipe au quotidien",
    'intro' => "Deux collaboratrices et une assistante complètent l'équipe et assurent le suivi de vos dossiers.",
    'members' => [
        ['name' => 'Les collaboratrices', 'role' => 'Avocates collaboratrices (2)', 'bio' => 'Elles travaillent aux côtés des associés sur les dossiers de conseil et de contentieux.'],
        ['name' => 'Notre assistante', 'role' => 'Assistante du cabinet', 'bio' => "Premier contact par téléphone, gestion des rendez-vous et des pièces de votre dossier."],
    ],
]);

render_component('gallery', [
    'title' => 'Le cabinet en images',
    'intro' => 'Images de substitution en attendant les photographies du cabinet.',
    'columns' => 3,
    'images' => [
        ['src' => 'accueil.svg', 'alt' => "Espace d'accueil du cabinet", 'caption' => 'Accueil'],
        ['src' => 'salle.svg', 'alt' => 'Salle de réunion du cabinet', 'caption' => 'Salle de réunion'],
        ['src' => 'bibliotheque.svg', 'alt' => 'Bibliothèque juridique du cabinet', 'caption' => 'Bibliothèque'],
    ],
]);

render_component('stats', [
    'items' => [
        ['value' => '2011', 'label' => 'création du cabinet'],
        ['value' => '6', 'label' => 'personnes à votre service'],
        ['value' => '3', 'label' => 'domaines de spécialité'],
    ],
]);
