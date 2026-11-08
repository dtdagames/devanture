<?php
declare(strict_types=1);

require_once __DIR__ . '/../inc/blocks.php';

return [
    'title' => 'Page introuvable | Boulangerie Le Fournil',
    'description' => 'La page demandée n\'existe pas ou a été déplacée. Revenez à l\'accueil de la boulangerie Le Fournil.',
    'body' => static function (): void {
        block_hero([
            'title' => 'Page introuvable',
            'subtitle' => 'La page demandée n\'existe pas ou a été déplacée.',
            'buttons' => [
                ['label' => 'Retour à l\'accueil', 'to' => '/'],
            ],
        ]);
    },
];
