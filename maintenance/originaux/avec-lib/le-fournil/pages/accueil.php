<?php
$meta = [
    'title'       => 'Boulangerie Le Fournil – Artisan boulanger à Nantes (Bouffay)',
    'description' => 'Pain au levain naturel, viennoiseries pur beurre, pâtisseries de saison et sandwichs le midi. Boulangerie artisanale rue de la Juiverie à Nantes, ouverte du mardi au dimanche.',
];

render_component('hero', [
    'title'     => 'Le pain au levain, comme on l’aimait avant',
    'subtitle'  => 'Boulangerie artisanale au cœur du Bouffay, à Nantes. Pétri, façonné et cuit sur place chaque jour depuis 2009.',
    'image'     => 'hero-fournil.svg',
    'cta'       => ['label' => 'Découvrir nos produits', 'to' => '/nos-produits'],
    'secondary' => ['label' => 'Commander pour un événement', 'to' => '/commandes-evenements'],
]);

render_component('features', [
    'title'   => 'Ce qui sort de notre fournil',
    'intro'   => 'Des recettes simples, des matières premières choisies et du temps : c’est tout le secret.',
    'columns' => 4,
    'items'   => [
        ['icon' => 'leaf',  'title' => 'Pain au levain naturel', 'text' => 'Farines de blé de la région, levain entretenu depuis 2009, fermentation lente de 24 heures.'],
        ['icon' => 'star',  'title' => 'Viennoiseries pur beurre', 'text' => 'Croissants, pains au chocolat et brioches feuilletés au beurre AOP Charentes-Poitou.'],
        ['icon' => 'sun',   'title' => 'Pâtisseries de saison', 'text' => 'Tartes, flans et entremets qui suivent le marché : fraises au printemps, pommes à l’automne.'],
        ['icon' => 'clock', 'title' => 'Sandwichs le midi', 'text' => 'Préparés à partir de 11 h 30 sur nos pains du jour, avec des produits frais et locaux.'],
    ],
]);

render_component('stats', [
    'items' => [
        ['value' => '2009',  'label' => 'année de création, rue de la Juiverie'],
        ['value' => '5',     'label' => 'personnes au fournil et en boutique'],
        ['value' => '24 h',  'label' => 'de fermentation pour nos pains au levain'],
        ['value' => 'Argent', 'label' => 'Baguette tradition Loire-Atlantique 2024'],
    ],
]);

render_component('testimonials', [
    'title' => 'Ils passent nous voir chaque semaine',
    'items' => [
        ['quote' => 'Le pain de campagne au levain se garde quatre jours sans problème. On vient du Pellerin exprès le samedi.', 'author' => 'Hélène R.', 'role' => 'Le Pellerin', 'rating' => 5],
        ['quote' => 'Les croissants sont parmi les meilleurs de Nantes, croustillants et pas gras. Et l’accueil d’Anne est toujours chaleureux.', 'author' => 'Julien M.', 'role' => 'Nantes, Bouffay', 'rating' => 5],
        ['quote' => 'Ils ont réalisé la pièce montée de notre mariage pour 80 personnes : livrée à l’heure, magnifique et délicieuse.', 'author' => 'Camille et Nadir', 'role' => 'Rezé', 'rating' => 5],
    ],
]);

render_component('cta', [
    'title'  => 'Un buffet, un petit-déjeuner d’équipe, une pièce montée ?',
    'text'   => 'Nous préparons vos commandes pour les événements, à retirer en boutique ou livrées à Nantes.',
    'button' => ['label' => 'Demander un devis', 'to' => '/contact'],
]);
