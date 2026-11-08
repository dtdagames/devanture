<?php
$meta = [
    'title'       => 'Recrutement · Le Fournil',
    'description' => 'La boulangerie Le Fournil recrute un apprenti boulanger à Nantes pour la rentrée.',
];

render_component('hero', [
    'title'    => 'Rejoignez-nous',
    'subtitle' => 'Le Fournil recrute un apprenti boulanger pour la rentrée.',
]);

render_component('richtext', [
    'title' => 'Le poste',
    'text'  => <<<'TXT'
Vous apprendrez le pain au levain naturel, les viennoiseries pur beurre et la pâtisserie de saison aux côtés de Marc Lefèvre, dans un fournil de quartier où tout est pétri, façonné et cuit sur place.

Profil : CAP boulanger en cours ou en projet, goût du travail d'équipe et du lever tôt. Contrat d'apprentissage de deux ans, repos le lundi, prise de poste en septembre.
TXT,
]);

render_component('cta', [
    'title'  => 'Candidater',
    'text'   => 'Envoyez-nous quelques lignes et votre CV via le formulaire de contact.',
    'button' => ['label' => 'Postuler', 'to' => '/contact'],
]);
