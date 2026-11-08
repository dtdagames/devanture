<?php
declare(strict_types=1);

/** @var array $site */
return [
    'title'       => 'Le Fournil – Boulangerie artisanale à Nantes, quartier Bouffay',
    'description' => 'Boulangerie artisanale Le Fournil à Nantes : pain au levain naturel, viennoiseries pur beurre, pâtisseries de saison et sandwichs le midi. Ouvert du mardi au dimanche, 6 h 30 – 19 h 30.',
    'blocks'      => [
        [
            'type'      => 'hero',
            'kicker'    => 'Artisan boulanger depuis 2009',
            'title'     => 'Le pain au levain, comme on le faisait avant',
            'subtitle'  => 'Au cœur du Bouffay, Anne et Marc Lefèvre pétrissent chaque jour des pains au levain naturel, des viennoiseries pur beurre et des pâtisseries qui suivent les saisons.',
            'image'     => 'hero-fournil.svg',
            'cta'       => ['label' => 'Découvrir nos produits', 'to' => '/nos-produits'],
            'secondary' => ['label' => 'Commander pour un événement', 'to' => '/commandes-evenements'],
        ],
        [
            'type'    => 'features',
            'title'   => 'Ce qui fait la différence',
            'columns' => 4,
            'items'   => [
                ['icon' => 'wheat', 'title' => 'Levain naturel', 'text' => 'Nos pains lèvent lentement, sans levure ajoutée, avec un levain entretenu depuis l\'ouverture en 2009.'],
                ['icon' => 'leaf',  'title' => 'Farines locales', 'text' => 'Des blés cultivés en Loire-Atlantique et Vendée, moulus sur meule de pierre par deux meuniers partenaires.'],
                ['icon' => 'fire',  'title' => 'Cuisson sur sole', 'text' => 'Un four à sole en pierre pour une croûte épaisse, craquante, et une mie bien alvéolée.'],
                ['icon' => 'medal', 'title' => 'Baguette médaillée', 'text' => 'Médaille d\'argent de la baguette tradition de Loire-Atlantique en 2024.'],
            ],
        ],
        [
            'type'       => 'text_image',
            'title'      => 'Une boulangerie de quartier, pour de vrai',
            'text'       => [
                'Le Fournil a ouvert ses portes en 2009 au 8 rue de la Juiverie, dans une ancienne échoppe du vieux Nantes. Anne et Marc Lefèvre voulaient une boulangerie où l\'on connaît le prénom des clients et où le pain a le goût du blé.',
                'Dix-sept ans plus tard, l\'équipe compte cinq personnes et la boutique a gardé son comptoir en bois d\'origine. Le fournil, lui, s\'allume chaque jour à 4 heures du matin.',
                'Du mardi au dimanche, de 6 h 30 à 19 h 30, vous trouverez du pain chaud le matin, des sandwichs frais le midi et des pâtisseries jusqu\'à la fermeture.',
            ],
            'image'      => 'boutique.svg',
            'alt'        => 'La boutique du Fournil, rue de la Juiverie à Nantes',
            'caption'    => 'La boutique, rue de la Juiverie',
            'image_side' => 'right',
            'cta'        => ['label' => 'Notre histoire', 'to' => '/la-boulangerie'],
        ],
        [
            'type'  => 'stats',
            'items' => [
                ['value' => '2009',   'label' => 'Année d\'ouverture'],
                ['value' => '5',      'label' => 'Personnes au fournil et en boutique'],
                ['value' => '6 jours', 'label' => 'D\'ouverture par semaine'],
                ['value' => '300',    'label' => 'Pains au levain cuits chaque jour'],
            ],
        ],
        [
            'type'  => 'gallery',
            'title' => 'Dans la vitrine cette semaine',
            'items' => [
                ['image' => 'pain-levain.svg',   'caption' => 'Tourte de meule au levain'],
                ['image' => 'viennoiseries.svg', 'caption' => 'Croissants et pains au chocolat pur beurre'],
                ['image' => 'patisseries.svg',   'caption' => 'Tarte aux pommes du verger de Mauves'],
                ['image' => 'baguette.svg',      'caption' => 'La baguette tradition médaillée'],
                ['image' => 'sandwichs.svg',     'caption' => 'Sandwichs du midi sur pain de campagne'],
                ['image' => 'fournil-four.svg',  'caption' => 'Le four à sole, allumé dès 4 h du matin'],
            ],
        ],
        [
            'type'  => 'testimonials',
            'title' => 'Ils passent nous voir',
            'items' => [
                ['quote' => 'La tourte de meule se garde quatre jours et elle est encore meilleure le lendemain au petit-déjeuner. On ne va plus ailleurs.', 'author' => 'Hélène R.', 'place' => 'Quartier Bouffay', 'rating' => 5],
                ['quote' => 'Les sandwichs du midi changent toutes les semaines, le pain est frais, les portions honnêtes. Parfait pour la pause déjeuner entre collègues.', 'author' => 'Thomas B.', 'place' => 'Île Feydeau', 'rating' => 5],
                ['quote' => 'Nous avons commandé la pièce montée de notre mariage : 90 choux, livrée à l\'heure et montée sur place. Nos invités en parlent encore.', 'author' => 'Camille et Jules', 'place' => 'Rezé', 'rating' => 5],
            ],
        ],
        [
            'type'  => 'faq',
            'title' => 'Questions fréquentes',
            'items' => [
                ['q' => 'Faites-vous du pain sans gluten ?', 'a' => 'Non, notre fournil travaille le blé et le seigle ; nous ne pouvons pas garantir l\'absence de traces.'],
                ['q' => 'Peut-on réserver une pièce montée ?', 'a' => 'Oui, avec dix jours de préavis, par téléphone ou via le formulaire de contact.'],
                ['q' => 'Êtes-vous ouverts le lundi ?', 'a' => 'Non, la boulangerie est fermée le lundi. Ouvert du mardi au dimanche de 6 h 30 à 19 h 30.'],
            ],
        ],
        [
            'type'   => 'cta',
            'title'  => 'Un événement à venir ?',
            'text'   => 'Buffets salés, pièces montées, brioches géantes : nous préparons vos commandes sur mesure avec un devis sous 48 heures.',
            'button' => ['label' => 'Demander un devis', 'to' => '/commandes-evenements'],
        ],
    ],
];
