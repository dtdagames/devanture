<?php
render_component('hero', [
    'title' => 'Rejoignez-nous',
    'subtitle' => 'Le cabinet recrute un collaborateur ou une collaboratrice en droit des affaires.',
]);

render_component('richtext', [
    'title' => 'Le poste',
    'text' => "Vous rejoindrez l'équipe de Me Thomas Ruiz sur des dossiers de droit des sociétés, de contrats commerciaux et de contentieux d'affaires, pour une clientèle de PME et de dirigeants de la région bordelaise.\n\nProfil : titulaire du CAPA, deux ans d'expérience minimum, rigueur rédactionnelle et goût du contact client. Rémunération selon profil, prise de poste dès que possible.",
]);

render_component('cta', [
    'title' => 'Candidater',
    'text' => 'Envoyez CV et lettre de motivation via le formulaire de contact.',
    'button' => ['label' => 'Postuler', 'to' => '/contact'],
]);
