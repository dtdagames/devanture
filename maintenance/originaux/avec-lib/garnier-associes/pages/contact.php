<?php
render_component('hero', [
    'title' => 'Contact',
    'subtitle' => 'Première consultation de 30 minutes offerte. Nous recevons sur rendez-vous à Bordeaux et intervenons à Libourne et Arcachon.',
    'align' => 'left',
]);

render_component('contact.form', [
    'title' => 'Écrivez-nous',
    'intro' => "Indiquez-nous brièvement votre situation. N'envoyez pas de pièces confidentielles par ce formulaire : nous vous indiquerons comment nous les transmettre.",
    'to' => 'contact@garnier-associes.fr',
    'fields' => ['name', 'email', 'phone', 'subject', 'message'],
    'required' => ['name', 'email', 'message'],
    'success' => 'Merci, votre message a bien été transmis. Nous vous répondons sous 48 heures ouvrées.',
    'show_contact' => true,
]);
