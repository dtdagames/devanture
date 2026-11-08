<?php
declare(strict_types=1);

const SITE = [
    'name' => 'Garnier & Associés',
    'city' => 'Bordeaux',
    'phone' => '05 56 00 00 00',
    'phone_link' => '+33556000000',
    'email' => 'contact@garnier-associes.fr',
    'address' => '25 cours de l\'Intendance, 33000 Bordeaux',
];

function e(string $s): string
{
    return htmlspecialchars($s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

/**
 * Rend une page complète (mise en page + contenu).
 *
 * @param array<string, mixed> $page
 * @param array<string, array<string, mixed>> $routes
 */
function render_site(array $page, string $path, array $routes): void
{
    $body = render_fragment(__DIR__ . '/pages/' . $page['page'] . '.php');
    require __DIR__ . '/layout.php';
}

function render_fragment(string $file): string
{
    ob_start();
    require $file;
    return (string) ob_get_clean();
}

require __DIR__ . '/blocks.php';
require __DIR__ . '/contact.php';
