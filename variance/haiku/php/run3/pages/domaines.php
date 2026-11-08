<?php
declare(strict_types=1);

return function (array $ctx): array {
    $body = b_hero(
        'Nos domaines d\'intervention',
        'Trois associés, trois spécialités, un même objectif : défendre vos intérêts avec clarté.',
        null,
        [['label' => 'Demander un rendez-vous', 'to' => '/contact']]
    )
    . b_richtext(
        'Droit du travail',
        [
            'Conseil et représentation des salariés et des employeurs : licenciement, rupture conventionnelle, démission, harcèlement, discrimination, durée du travail, salaires impayés.',
            'Le cabinet intervient en amont pour sécuriser les procédures, puis devant le conseil de prud\'hommes lorsque la négociation n\'aboutit pas.',
        ],
        'travail.svg',
        'Illustration droit du travail',
        'right'
    )
    . b_richtext(
        'Droit des affaires',
        [
            'Création, transmission et restructuration de sociétés, rédaction et négociation de contrats, recouvrement de créances, baux commerciaux.',
            'Nous accompagnons dirigeants et associés dans leurs décisions courantes comme dans les opérations ponctuelles.',
        ],
        'affaires.svg',
        'Illustration droit des affaires',
        'left'
    )
    . b_richtext(
        'Droit de la famille',
        [
            'Divorce, séparation, pension alimentaire, résidence des enfants, liquidation du régime matrimonial, pacs et questions successorales.',
            'Nous privilégions les solutions amiables lorsque c\'est possible, sans jamais renoncer à la défense de vos droits devant le juge.',
        ],
        'famille.svg',
        'Illustration droit de la famille',
        'right'
    )
    . b_cta(
        'Vous ne savez pas quel domaine concerne votre situation ?',
        'Contactez le cabinet : nous orientons votre demande vers l\'associé compétent.',
        'Écrire au cabinet',
        '/contact'
    );

    return [
        'title' => 'Domaines d\'intervention | Cabinet Garnier & Associés',
        'description' => 'Droit du travail, droit des affaires et droit de la famille : les domaines d\'intervention du cabinet Garnier & Associés à Bordeaux.',
        'body' => $body,
    ];
};
