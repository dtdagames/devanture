<?php
declare(strict_types=1);

echo block_hero([
    'title' => 'Honoraires et modalités',
    'lead' => 'Une convention d\'honoraires écrite pour chaque mission, des modes de facturation clairs et une première consultation offerte.',
]);

echo block_points([
    'title' => 'Deux modes de facturation',
    'intro' => 'Le choix se fait avec vous, en fonction de la nature du dossier et de votre visibilité sur sa durée.',
    'items' => [
        [
            'icon' => 'briefcase',
            'title' => 'Au forfait',
            'text' => 'Un montant fixé à l\'avance pour une prestation définie, par exemple la rédaction d\'un contrat, la création d\'une société ou une procédure de divorce par consentement mutuel. Le périmètre est précisé dans la convention.',
        ],
        [
            'icon' => 'clock',
            'title' => 'Au temps passé',
            'text' => 'Une rémunération calculée sur le temps réellement consacré au dossier, selon un taux horaire défini dans la convention, avec des points d\'étape réguliers pour que vous suiviez le total.',
        ],
    ],
]);

echo block_points([
    'title' => 'Ce que prévoit la convention',
    'items' => [
        ['icon' => 'file', 'title' => 'Le mode de calcul', 'text' => 'Forfait ou taux horaire, périmètre de la mission et ce qui est exclu.'],
        ['icon' => 'shield', 'title' => 'Les frais annexes', 'text' => 'Les débours (frais de greffe, d\'huissier, d\'expertise) sont facturés en sus, à leur coût réel, et jamais masqués.'],
        ['icon' => 'scale', 'title' => 'Les modalités de paiement', 'text' => 'Échéancier, acompte éventuel et conditions de résiliation de la mission.'],
    ],
]);

echo block_faq([
    'title' => 'Questions fréquentes',
    'items' => [
        [
            'q' => 'La première consultation est-elle vraiment gratuite ?',
            'a' => 'Oui. La première consultation de 30 minutes est offerte. Elle permet de faire le point sur votre situation et de voir les options possibles, sans engagement de votre part.',
        ],
        [
            'q' => 'Comment sont fixés mes honoraires ?',
            'a' => 'Une convention d\'honoraires écrite est établie avant le début de la mission. Elle indique le mode de calcul, le périmètre, la durée prévisible et les frais annexes.',
        ],
        [
            'q' => 'Quelle différence entre forfait et temps passé ?',
            'a' => 'Le forfait donne un montant connu dès le départ pour une prestation définie. Le temps passé convient mieux aux dossiers dont la durée est difficile à anticiper, avec des points d\'étape réguliers.',
        ],
        [
            'q' => 'Des frais s\'ajoutent-ils aux honoraires ?',
            'a' => 'Les débours, c\'est-à-dire les frais payés pour votre compte, sont facturés à leur coût réel et détaillés dans la convention. Nous ne réalisons aucun gain sur ces sommes.',
        ],
        [
            'q' => 'Puis-je bénéficier de l\'aide juridictionnelle ?',
            'a' => 'Cela dépend de vos ressources. Si votre situation le permet, nous vous orientons vers le bureau d\'aide juridictionnelle compétent et nous vous expliquons la procédure.',
        ],
    ],
]);

echo block_cta([
    'title' => 'Un devis pour votre dossier ?',
    'text' => 'Décrivez-nous votre situation : nous vous indiquons le mode de facturation le plus adapté.',
    'label' => 'Demander un devis',
    'to' => '/contact',
]);
