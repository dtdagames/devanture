<?php
declare(strict_types=1);

return function (array $ctx): array {
    $site = $ctx['site'];

    $fields = [
        ['name' => 'name', 'label' => 'Nom et prénom', 'type' => 'text', 'required' => true],
        ['name' => 'email', 'label' => 'Adresse e-mail', 'type' => 'email', 'required' => true],
        ['name' => 'phone', 'label' => 'Téléphone', 'type' => 'tel', 'required' => false],
        [
            'name' => 'subject',
            'label' => 'Domaine concerné',
            'type' => 'select',
            'required' => true,
            'options' => ['Droit du travail', 'Droit des affaires', 'Droit de la famille', 'Autre demande'],
        ],
        ['name' => 'message', 'label' => 'Votre message', 'type' => 'textarea', 'required' => true],
    ];

    $state = contact_handle($fields, $site);

    $form = render_contact_form($fields, $state);

    $body = b_hero(
        'Contact',
        'Décrivez-nous votre situation. Une première consultation de 30 minutes vous est offerte.',
        null,
        []
    )
    . '<section class="block contact"><div class="container contact__grid">'
    . '<div class="contact__form">' . $form . '</div>'
    . '<aside class="contact__info"><h2>Nous trouver</h2>'
    . '<p><strong>Adresse</strong><br>' . e($site['address']) . '</p>'
    . '<p><strong>Téléphone</strong><br><a href="' . e($site['phone_href']) . '">' . e($site['phone_label']) . '</a></p>'
    . '<p><strong>E-mail</strong><br><a href="mailto:' . e($site['email']) . '">' . e($site['email']) . '</a></p>'
    . '<p>Vos informations sont utilisées uniquement pour répondre à votre demande.</p>'
    . '</aside></div></section>';

    return [
        'title' => 'Contact | Cabinet Garnier & Associés',
        'description' => 'Contactez le cabinet Garnier & Associés à Bordeaux : formulaire en ligne, téléphone 05 56 00 00 00 et adresse 25 cours de l\'Intendance.',
        'body' => $body,
    ];
};
