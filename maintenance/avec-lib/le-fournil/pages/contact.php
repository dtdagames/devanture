<?php
$meta = [
    'title'       => 'Contact, horaires et accès | Boulangerie Le Fournil, Nantes',
    'description' => 'Contactez la boulangerie Le Fournil, 8 rue de la Juiverie à Nantes : téléphone 02 40 00 00 00, e-mail, formulaire de contact et devis pour vos événements. Ouvert du mardi au dimanche de 6 h 30 à 19 h 30.',
];

render_component('hero', [
    'title'    => 'Nous contacter',
    'subtitle' => 'Une question, une réservation de pain, un devis pour un événement ? Écrivez-nous ou appelez-nous : Anne vous répond du mardi au dimanche.',
    'align'    => 'left',
]);

render_component('contact.form', [
    'title'    => 'Écrivez-nous',
    'intro'    => 'Pour une demande de devis, indiquez la date, le nombre de convives et le type de prestation souhaité.',
    'to'       => 'bonjour@lefournil-nantes.fr',
    'fields'   => ['name', 'email', 'phone', 'company', 'subject', 'message'],
    'required' => ['name', 'email', 'message'],
    'success'  => 'Merci pour votre message ! Nous vous répondons sous 48 heures, du mardi au dimanche.',
]);

render_component('richtext', [
    'title' => 'Horaires et accès',
    'text'  => <<<'TXT'
La boutique est ouverte du mardi au dimanche, de 6 h 30 à 19 h 30, sans interruption. Nous sommes fermés le lundi, ainsi que le 25 décembre, le 1er janvier et trois semaines en août (dates affichées en boutique dès le mois de juin).

Le Fournil se trouve au 8 rue de la Juiverie, dans le quartier Bouffay, à 150 mètres de la place du Bouffay et du château des ducs de Bretagne. En tramway : ligne 1, arrêt Bouffay (2 minutes à pied). En voiture : parkings Commerce et Bouffay à moins de 5 minutes ; la rue est piétonne de 11 h à 19 h.

Pour une réservation de pain ou une commande du lendemain, le téléphone reste le plus simple : 02 40 00 00 00, avant 18 h.
TXT,
]);
