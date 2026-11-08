<?php
$meta = [
    'title'       => 'Commandes pour événements – Buffets, pièces montées, petits-déjeuners | Le Fournil Nantes',
    'description' => 'Buffets salés et sucrés, pièces montées, petits-déjeuners d’entreprise et goûters : la boulangerie Le Fournil prépare vos commandes événementielles à Nantes, à retirer ou livrées.',
];

render_component('hero', [
    'title'    => 'Commandes & événements',
    'subtitle' => 'Mariages, baptêmes, séminaires, pots de départ : nous préparons des buffets et des pièces montées de 10 à 150 personnes, avec les mêmes produits qu’en boutique.',
    'image'    => 'buffet.svg',
    'cta'      => ['label' => 'Demander un devis', 'to' => '/contact'],
    'secondary' => ['label' => 'Voir nos produits', 'to' => '/nos-produits'],
]);

render_component('features', [
    'title'   => 'Ce que nous proposons',
    'columns' => 2,
    'items'   => [
        ['icon' => 'gift',  'title' => 'Pièces montées', 'text' => 'Choux à la crème traditionnels (vanille, chocolat, café) ou pièce montée de macarons. À partir de 30 choux. Décor sobre : nougatine, fleurs fraîches, caramel.'],
        ['icon' => 'home',  'title' => 'Buffets salés', 'text' => 'Mini-sandwichs sur pain au levain, pains surprise, quiches et feuilletés, planches de pains spéciaux pour accompagner fromages et charcuteries.'],
        ['icon' => 'sun',   'title' => 'Petits-déjeuners d’entreprise', 'text' => 'Mini-viennoiseries pur beurre, brioches, pains et confitures, jus de fruits. Livraison possible dans Nantes dès 7 h 30.'],
        ['icon' => 'heart', 'title' => 'Goûters et buffets sucrés', 'text' => 'Tartes de saison en grand format, assortiments de mignardises, gâteau nantais, cookies et brioches. Idéal pour les anniversaires et fêtes d’école.'],
    ],
]);

render_component('gallery', [
    'title'   => 'Quelques réalisations',
    'columns' => 4,
    'images'  => [
        ['src' => 'piece-montee.svg', 'alt' => 'Pièce montée de choux et nougatine', 'caption' => 'Pièce montée 90 choux, mariage à Rezé'],
        ['src' => 'buffet.svg',       'alt' => 'Buffet salé dressé',                 'caption' => 'Buffet salé, séminaire de 60 personnes'],
        ['src' => 'croissants.svg',   'alt' => 'Plateau de mini-viennoiseries',      'caption' => 'Petit-déjeuner d’entreprise, île de Nantes'],
        ['src' => 'tarte-saison.svg', 'alt' => 'Grande tarte aux fruits',            'caption' => 'Tarte aux fraises 20 parts, baptême'],
    ],
]);

render_component('stats', [
    'items' => [
        ['value' => '10 à 150', 'label' => 'convives par commande'],
        ['value' => '72 h',     'label' => 'de délai minimum pour un buffet'],
        ['value' => '2 sem.',   'label' => 'de délai pour une pièce montée'],
    ],
]);

render_component('faq', [
    'title' => 'Comment ça se passe ?',
    'intro' => 'Les réponses aux questions que l’on nous pose le plus souvent avant une commande.',
    'items' => [
        ['q' => 'Quel est le délai pour commander ?', 'a' => 'Comptez 72 heures pour un buffet ou un petit-déjeuner, et deux semaines pour une pièce montée (une dégustation est possible sur rendez-vous). Pour les mariages de mai à septembre, réservez idéalement deux mois à l’avance.'],
        ['q' => 'Livrez-vous ?', 'a' => "Oui, dans Nantes et sa première couronne (Rezé, Saint-Herblain, Orvault, Sainte-Luce, Vertou), le matin entre 7 h 30 et 11 h. La livraison est offerte à partir de 250 € de commande, sinon facturée 25 €. Le retrait en boutique est toujours possible aux heures d’ouverture."],
        ['q' => 'Comment se passe le devis et le paiement ?', 'a' => "Vous nous décrivez l’événement (date, nombre de convives, type de buffet) via le formulaire de contact ou par téléphone. Anne vous envoie un devis sous 48 h. Un acompte de 30 % confirme la commande, le solde se règle à la livraison ou au retrait. Nous acceptons les virements et les paiements par carte."],
        ['q' => 'Peut-on adapter aux régimes et aux allergies ?', 'a' => 'Nous proposons des options végétariennes et sans porc pour les buffets, et pouvons éviter les fruits à coque sur demande. En revanche, tout est fabriqué dans un fournil où le gluten est présent partout : nous ne proposons pas d’option sans gluten garantie.'],
        ['q' => 'Fournissez-vous la vaisselle et le service ?', 'a' => 'Les buffets sont livrés sur plateaux consignés, avec serviettes. Nous ne proposons pas de service en salle ni de vaisselle, mais nous pouvons vous recommander des traiteurs et loueurs nantais avec qui nous travaillons régulièrement.'],
    ],
]);

render_component('cta', [
    'title'  => 'Parlons de votre événement',
    'text'   => 'Décrivez-nous la date, le nombre de convives et vos envies : devis sous 48 h.',
    'button' => ['label' => 'Demander un devis', 'to' => '/contact'],
]);
