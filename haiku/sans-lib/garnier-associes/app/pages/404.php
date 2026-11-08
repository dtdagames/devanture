<?php
declare(strict_types=1);

echo block_hero([
    'title' => 'Page introuvable',
    'lead' => 'La page que vous cherchez n\'existe pas ou n\'est plus disponible.',
    'actions' => [
        ['label' => 'Retour à l\'accueil', 'to' => '/', 'variant' => 'primary'],
        ['label' => 'Nous contacter', 'to' => '/contact', 'variant' => 'secondary'],
    ],
]);
