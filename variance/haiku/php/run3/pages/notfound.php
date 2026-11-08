<?php
declare(strict_types=1);

return function (array $ctx): array {
    $body = b_hero(
        'Page introuvable',
        'La page que vous cherchez n\'existe pas ou a été déplacée.',
        null,
        [['label' => 'Retour à l\'accueil', 'to' => '/']]
    );

    return [
        'title' => 'Page introuvable | Cabinet Garnier & Associés',
        'description' => 'La page demandée est introuvable sur le site du cabinet Garnier & Associés.',
        'body' => $body,
    ];
};
