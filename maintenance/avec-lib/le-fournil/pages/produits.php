<?php
$meta = [
    'title'       => 'Nos produits – Pains, viennoiseries, pâtisseries et sandwichs | Le Fournil Nantes',
    'description' => 'Pain au levain naturel, baguette tradition médaillée, viennoiseries pur beurre, pâtisseries de saison et sandwichs du midi : découvrez la carte de la boulangerie Le Fournil à Nantes.',
];

render_component('hero', [
    'title'    => 'Nos produits',
    'subtitle' => 'Tout est fabriqué sur place, rue de la Juiverie, à partir de farines françaises, de beurre AOP et de fruits de saison.',
    'align'    => 'left',
    'cta'      => ['label' => 'Commander pour un événement', 'to' => '/commandes-evenements'],
]);

render_component('richtext', [
    'title'          => 'Le pain au levain naturel',
    'image'          => 'pain-levain.svg',
    'image_position' => 'right',
    'text'           => <<<'TXT'
Notre levain est né en 2009, la semaine de l’ouverture. Nous l’entretenons chaque jour avec de la farine de blé et de l’eau, sans levure ajoutée. Il donne à nos pains leur mie souple, leur croûte épaisse et ce léger goût acidulé qui se développe avec le temps.

Les pâtes reposent entre 18 et 24 heures au froid avant d’être façonnées à la main et cuites sur sole en pierre. Résultat : un pain qui se conserve plusieurs jours et se digère facilement.

À la carte toute l’année : le pain de campagne (500 g et 1 kg), le complet, le seigle, le pain aux graines, le petit épeautre et notre baguette tradition, médaille d’argent au concours de Loire-Atlantique 2024. Le vendredi et le samedi, nous sortons aussi une tourte de meule et un pain aux noix.
TXT,
    'cta'            => ['label' => 'Horaires et accès', 'to' => '/contact'],
]);

render_component('gallery', [
    'title'   => 'Un aperçu de la vitrine',
    'intro'   => 'Les fournées se succèdent du matin au soir : pains à 6 h 30, viennoiseries à 7 h, sandwichs à 11 h 30, seconde fournée de baguettes à 16 h.',
    'columns' => 3,
    'images'  => [
        ['src' => 'pain-levain.svg',         'alt' => 'Pains de campagne au levain sur la grille de refroidissement', 'caption' => 'Pain de campagne au levain naturel'],
        ['src' => 'baguette-tradition.svg',  'alt' => 'Baguettes tradition dorées',                                    'caption' => 'Baguette tradition, médaille d’argent 2024'],
        ['src' => 'croissants.svg',          'alt' => 'Croissants pur beurre feuilletés',                              'caption' => 'Croissants et pains au chocolat pur beurre'],
        ['src' => 'tarte-saison.svg',        'alt' => 'Tarte aux fruits de saison',                                    'caption' => 'Tartes de saison, flan et entremets'],
        ['src' => 'sandwichs.svg',           'alt' => 'Sandwichs préparés sur pain au levain',                         'caption' => 'Sandwichs du midi, dès 11 h 30'],
        ['src' => 'atelier.svg',             'alt' => 'Le fournil au petit matin',                                     'caption' => 'Le fournil, 4 h du matin'],
    ],
]);

render_component('features', [
    'title'   => 'Les autres rayons',
    'columns' => 3,
    'items'   => [
        ['icon' => 'star', 'title' => 'Viennoiseries', 'text' => 'Croissant, pain au chocolat, pain aux raisins, brioche nantaise, kouign-amann le week-end. Feuilletage pur beurre AOP, pousse lente.'],
        ['icon' => 'gift', 'title' => 'Pâtisseries', 'text' => 'Flan à la vanille, tarte du jour, éclairs, Paris-Brest et gâteau nantais. Sur commande : entremets 6 à 12 parts.'],
        ['icon' => 'clock', 'title' => 'Le midi', 'text' => 'Sandwichs sur pain au levain ou baguette tradition, salades composées, quiches, boissons. Formule sandwich + dessert + boisson à 9,50 €.'],
    ],
]);

render_component('faq', [
    'title' => 'Questions sur nos produits',
    'items' => [
        ['q' => 'À quelle heure trouve-t-on le plus de choix ?', 'a' => 'Les pains sont tous en vitrine à partir de 7 h 30 et les viennoiseries de 7 h. Une seconde fournée de baguettes tradition sort vers 16 h. Les sandwichs sont préparés à partir de 11 h 30 et partent généralement avant 14 h.'],
        ['q' => 'Peut-on réserver un pain ?', 'a' => "Oui. Appelez-nous au 02 40 00 00 00 avant 18 h pour le lendemain, ou passez commande en boutique. Nous mettons de côté pains spéciaux, tourtes et grosses pièces (1 kg, 2 kg) sans supplément."],
        ['q' => 'Avez-vous des produits sans gluten ?', 'a' => 'Non. Notre fournil travaille exclusivement des farines de blé, de seigle et d’épeautre dans le même espace : nous ne pouvons pas garantir l’absence de traces de gluten. Le pain au petit épeautre, moins riche en gluten, convient à certaines personnes sensibles mais pas aux personnes cœliaques.'],
        ['q' => 'Comment conserver le pain au levain ?', 'a' => 'Dans un torchon ou un sac en papier, à température ambiante, jamais au réfrigérateur. Il reste bon 3 à 4 jours ; passé à la poêle ou au grille-pain, il retrouve tout son croustillant. Il se congèle très bien en tranches.'],
        ['q' => 'Où sont indiqués les allergènes ?', 'a' => 'La liste des allergènes de chaque produit est affichée en boutique et disponible sur demande au comptoir. Tous nos produits contiennent du gluten ; la plupart des viennoiseries et pâtisseries contiennent lait, œufs et parfois fruits à coque.'],
    ],
]);

render_component('cta', [
    'title'  => 'Envie d’une pièce particulière ?',
    'text'   => 'Entremets, brioche géante, pain à votre forme : parlez-nous de votre idée.',
    'button' => ['label' => 'Nous contacter', 'to' => '/contact'],
    'style'  => 'surface',
]);
