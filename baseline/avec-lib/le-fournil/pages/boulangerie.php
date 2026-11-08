<?php
$meta = [
    'title'       => 'La boulangerie – Notre histoire et notre équipe | Le Fournil Nantes',
    'description' => 'Fondée en 2009 par Anne et Marc Lefèvre dans le quartier Bouffay, la boulangerie Le Fournil réunit cinq artisans passionnés par le pain au levain et le travail bien fait.',
];

render_component('hero', [
    'title'    => 'La boulangerie',
    'subtitle' => 'Une boutique de quartier, un fournil ouvert sur la rue et cinq personnes qui se lèvent tôt depuis 2009.',
    'align'    => 'left',
]);

render_component('richtext', [
    'title'          => 'Notre histoire',
    'image'          => 'atelier.svg',
    'image_position' => 'left',
    'text'           => <<<'TXT'
Anne et Marc Lefèvre se sont rencontrés en 2003 dans une boulangerie de Rennes, elle à la vente, lui au fournil. Six ans plus tard, ils reprennent une ancienne boulangerie du quartier Bouffay, au 8 rue de la Juiverie, et lancent leur premier levain la semaine de l’ouverture, en septembre 2009.

Le pari était simple : revenir à des pains longs à faire, sans additifs ni améliorants, avec des farines de meuniers de la région. Les premières années ont été rudes – le quartier ne connaissait pas encore le pain au levain –, mais le bouche-à-oreille a fait le reste.

Aujourd’hui, Le Fournil compte cinq personnes et cuit chaque jour près de 400 pains et autant de viennoiseries. En 2024, notre baguette tradition a reçu la médaille d’argent au concours départemental de Loire-Atlantique, une reconnaissance pour toute l’équipe. Depuis 2019, nous préparons aussi des buffets et des pièces montées pour les événements des familles et des entreprises nantaises.
TXT,
]);

render_component('features', [
    'title'   => 'Nos engagements',
    'columns' => 3,
    'items'   => [
        ['icon' => 'leaf',   'title' => 'Farines de la région', 'text' => 'Blés cultivés et moulus en Loire-Atlantique et en Vendée, livrés chaque semaine par deux moulins partenaires.'],
        ['icon' => 'clock',  'title' => 'Du temps, pas d’additifs', 'text' => 'Fermentation longue, façonnage à la main, aucun améliorant ni conservateur. La liste des ingrédients tient sur une ligne.'],
        ['icon' => 'heart',  'title' => 'Zéro gaspillage', 'text' => 'Les invendus de la veille sont vendus à moitié prix le matin, le reste part à l’association Les Restos du Cœur de Nantes.'],
    ],
]);

render_component('team', [
    'title'   => 'L’équipe',
    'intro'   => 'Deux fondateurs et trois salariés, présents du mardi au dimanche.',
    'members' => [
        ['name' => 'Anne Lefèvre',  'role' => 'Cofondatrice, boutique et commandes', 'photo' => 'anne.svg', 'bio' => 'Accueil, vitrine et devis événementiels. C’est elle que vous entendez au téléphone.'],
        ['name' => 'Marc Lefèvre',  'role' => 'Cofondateur, chef boulanger',        'photo' => 'marc.svg', 'bio' => 'Au fournil dès 3 h 30. Gardien du levain et de la baguette tradition médaillée.'],
        ['name' => 'Léa Moreau',    'role' => 'Boulangère',                           'bio' => 'Formée au Fournil en apprentissage, embauchée en 2018. Responsable des pains spéciaux.'],
        ['name' => 'Thomas Guérin', 'role' => 'Pâtissier-tourier',                   'bio' => 'Viennoiseries, tartes et pièces montées. Dix ans de métier, dont quatre chez nous.'],
        ['name' => 'Sofia Benali',  'role' => 'Vente et sandwichs',                  'bio' => 'Arrivée en 2022. Prépare le midi et tient la boutique l’après-midi.'],
    ],
]);

render_component('stats', [
    'title' => 'Le Fournil en chiffres',
    'items' => [
        ['value' => '400',  'label' => 'pains cuits chaque jour'],
        ['value' => '6 j/7', 'label' => 'du mardi au dimanche, 6 h 30 – 19 h 30'],
        ['value' => '2',    'label' => 'moulins partenaires en Loire-Atlantique et Vendée'],
        ['value' => '0',    'label' => 'additif dans nos pains'],
    ],
]);

render_component('cta', [
    'title'  => 'Venez goûter',
    'text'   => '8 rue de la Juiverie, à deux pas de la place du Bouffay. Tram ligne 1, arrêt Bouffay.',
    'button' => ['label' => 'Horaires et accès', 'to' => '/contact'],
]);
