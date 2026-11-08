<?php
declare(strict_types=1);

return function (array $ctx): array {
    $body = b_hero(
        'Honoraires et modalités',
        'Des honoraires convenus avant le début de votre dossier, jamais après.',
        null,
        [['label' => 'Première consultation offerte', 'to' => '/contact']]
    )
    . b_points('Nos modes de facturation', [
        ['icon' => 'euro', 'title' => 'Au forfait', 'text' => 'Pour les dossiers dont le périmètre est défini : un montant global, connu à l\'avance.'],
        ['icon' => 'clock', 'title' => 'Au temps passé', 'text' => 'Pour les dossiers évolutifs : un taux horaire appliqué au temps réellement consacré.'],
        ['icon' => 'file', 'title' => 'Convention écrite', 'text' => 'Chaque mission fait l\'objet d\'une convention d\'honoraires signée avant le début du travail.'],
    ])
    . b_richtext(
        'Comment se déroule la facturation',
        [
            'Lors de la première consultation de 30 minutes, qui est offerte, l\'associé évalue votre situation et vous indique le mode de facturation le plus adapté.',
            'La convention précise l\'objet de la mission, le mode de calcul des honoraires, les frais et débours éventuels, ainsi que les modalités de paiement.',
        ],
        null,
        '',
        'right'
    )
    . b_faq('Questions fréquentes sur les honoraires', [
        [
            'q' => 'La première consultation est-elle vraiment gratuite ?',
            'a' => 'Oui. La première consultation d\'une durée de 30 minutes est offerte. Elle permet d\'examiner votre situation et de définir la suite à donner.',
        ],
        [
            'q' => 'Comment connaîtrai-je le montant avant de m\'engager ?',
            'a' => 'Le montant, ou le taux horaire et une estimation du temps nécessaire, figure dans la convention d\'honoraires que vous signez avant le début de la mission.',
        ],
        [
            'q' => 'Quels frais peuvent s\'ajouter aux honoraires ?',
            'a' => 'Certains frais dits débours, comme les droits de greffe ou les frais d\'huissier, sont avancés pour votre compte. Ils sont mentionnés dans la convention.',
        ],
        [
            'q' => 'Puis-je obtenir une aide juridictionnelle ?',
            'a' => 'Sous conditions de ressources, l\'aide juridictionnelle peut couvrir tout ou partie des honoraires. Le cabinet vous indique comment en faire la demande.',
        ],
    ])
    . b_cta(
        'Une question sur vos honoraires ?',
        'Nous vous répondons par téléphone ou par e-mail, et nous vous proposons une première consultation offerte.',
        'Nous écrire',
        '/contact'
    );

    return [
        'title' => 'Honoraires et modalités | Cabinet Garnier & Associés',
        'description' => 'Honoraires au forfait ou au temps passé, convention d\'honoraires systématique et première consultation de 30 minutes offerte au cabinet Garnier & Associés.',
        'body' => $body,
    ];
};
