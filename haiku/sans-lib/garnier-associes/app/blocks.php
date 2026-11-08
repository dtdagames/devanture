<?php
declare(strict_types=1);

/** Icônes SVG inline (trait), décoratives. */
function icon(string $name): string
{
    $shapes = [
        'clock' => '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
        'file' => '<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M10 13h6M10 17h6"/>',
        'briefcase' => '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5h6v2"/>',
        'scale' => '<path d="M12 3v18M5 7h14"/><path d="M7 7l-3 6h6zM17 7l-3 6h6z"/>',
        'heart' => '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
        'shield' => '<path d="M12 3l8 3v6c0 4.5-3.4 8.2-8 9-4.6-.8-8-4.5-8-9V6z"/>',
        'pin' => '<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
    ];
    $inner = $shapes[$name] ?? $shapes['file'];

    return '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" '
        . 'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' . $inner . '</svg>';
}

/** @param array<int, array{label: string, to: string, variant?: string}> $actions */
function render_actions(array $actions): string
{
    if ($actions === []) {
        return '';
    }
    $html = '<div class="actions">';
    foreach ($actions as $a) {
        $variant = $a['variant'] ?? 'primary';
        $html .= '<a class="btn btn--' . e($variant) . '" href="' . e($a['to']) . '">' . e($a['label']) . '</a>';
    }
    return $html . '</div>';
}

/**
 * Bandeau d'en-tête : titre, sous-titre, image de fond optionnelle avec voile, 1 ou 2 boutons.
 *
 * @param array{title: string, eyebrow?: string, lead?: string, image?: string, actions?: array} $o
 */
function block_hero(array $o): string
{
    $image = $o['image'] ?? null;
    $class = 'hero' . ($image !== null ? ' hero--image' : '');
    $style = $image !== null ? ' style="--hero-image: url(' . e($image) . ')"' : '';

    $html = '<section class="' . $class . '"' . $style . '><div class="container hero-inner">';
    if (!empty($o['eyebrow'])) {
        $html .= '<p class="eyebrow">' . e($o['eyebrow']) . '</p>';
    }
    $html .= '<h1>' . e($o['title']) . '</h1>';
    if (!empty($o['lead'])) {
        $html .= '<p class="lead">' . e($o['lead']) . '</p>';
    }
    $html .= render_actions($o['actions'] ?? []);
    return $html . '</div></section>';
}

/**
 * Chiffres clés en ligne.
 *
 * @param array{title?: string, items: array<int, array{value: string, label: string}>} $o
 */
function block_stats(array $o): string
{
    $html = '<section class="section section--tint"><div class="container"><ul class="stats">';
    foreach ($o['items'] as $item) {
        $html .= '<li><strong>' . e($item['value']) . '</strong><span>' . e($item['label']) . '</span></li>';
    }
    return $html . '</ul></div></section>';
}

/**
 * Grille de points forts : icône, titre, texte.
 *
 * @param array{title?: string, intro?: string, items: array<int, array{icon: string, title: string, text: string}>} $o
 */
function block_points(array $o): string
{
    $html = '<section class="section"><div class="container">';
    $html .= section_head($o);
    $html .= '<ul class="points">';
    foreach ($o['items'] as $item) {
        $html .= '<li class="point"><span class="point-icon">' . icon($item['icon']) . '</span>'
            . '<h3>' . e($item['title']) . '</h3><p>' . e($item['text']) . '</p></li>';
    }
    return $html . '</ul></div></section>';
}

/** @param array{title?: string, intro?: string} $o */
function section_head(array $o): string
{
    if (empty($o['title'])) {
        return '';
    }
    $html = '<div class="section-head"><h2>' . e($o['title']) . '</h2>';
    if (!empty($o['intro'])) {
        $html .= '<p>' . e($o['intro']) . '</p>';
    }
    return $html . '</div>';
}

/**
 * Bloc de texte riche avec image à côté (gauche ou droite), plusieurs paragraphes.
 *
 * @param array{title: string, paragraphs: string[], image: string, alt: string, reverse?: bool} $o
 */
function block_split(array $o): string
{
    $class = 'split' . (!empty($o['reverse']) ? ' split--reverse' : '');
    $html = '<section class="section"><div class="container"><div class="' . $class . '">';
    $html .= '<div class="split-text"><h2>' . e($o['title']) . '</h2>';
    foreach ($o['paragraphs'] as $p) {
        $html .= '<p>' . e($p) . '</p>';
    }
    $html .= '</div>';
    $html .= '<figure class="split-media"><img src="' . e($o['image']) . '" alt="' . e($o['alt'])
        . '" width="600" height="450" loading="lazy"></figure>';
    return $html . '</div></div></section>';
}

/**
 * Galerie en grille avec légende ; clic = agrandissement (lightbox JS, sans JS le lien ouvre l'image).
 *
 * @param array{title?: string, intro?: string, items: array<int, array{image: string, alt: string, caption: string}>} $o
 */
function block_gallery(array $o): string
{
    $html = '<section class="section section--tint"><div class="container">';
    $html .= section_head($o);
    $html .= '<ul class="gallery">';
    foreach ($o['items'] as $item) {
        $html .= '<li><a class="gallery-link" href="' . e($item['image']) . '" data-lightbox'
            . ' data-alt="' . e($item['alt']) . '" data-caption="' . e($item['caption']) . '">'
            . '<img src="' . e($item['image']) . '" alt="' . e($item['alt']) . '" width="600" height="450" loading="lazy">'
            . '</a><p class="gallery-caption">' . e($item['caption']) . '</p></li>';
    }
    return $html . '</ul></div></section>';
}

/**
 * FAQ en accordéon (details), première question ouverte.
 *
 * @param array{title?: string, items: array<int, array{q: string, a: string}>} $o
 */
function block_faq(array $o): string
{
    $html = '<section class="section"><div class="container narrow">';
    $html .= section_head($o);
    foreach ($o['items'] as $i => $item) {
        $open = $i === 0 ? ' open' : '';
        $html .= '<details class="faq"' . $open . '><summary>' . e($item['q']) . '</summary>'
            . '<p>' . e($item['a']) . '</p></details>';
    }
    return $html . '</div></section>';
}

/**
 * Bandeau d'appel à l'action : titre, texte, bouton.
 *
 * @param array{title: string, text: string, label: string, to: string} $o
 */
function block_cta(array $o): string
{
    return '<section class="section"><div class="container"><div class="cta">'
        . '<div><h2>' . e($o['title']) . '</h2><p>' . e($o['text']) . '</p></div>'
        . render_actions([['label' => $o['label'], 'to' => $o['to'], 'variant' => 'light']])
        . '</div></div></section>';
}

/**
 * Équipe : initiales dans un disque, nom, rôle, bio.
 *
 * @param array{title?: string, intro?: string, members: array<int, array{initials: string, name: string, role: string, bio: string}>} $o
 */
function block_team(array $o): string
{
    $html = '<section class="section section--tint"><div class="container">';
    $html .= section_head($o);
    $html .= '<ul class="team">';
    foreach ($o['members'] as $m) {
        $html .= '<li class="member"><span class="avatar" aria-hidden="true">' . e($m['initials']) . '</span>'
            . '<h3>' . e($m['name']) . '</h3><p class="role">' . e($m['role']) . '</p><p>' . e($m['bio']) . '</p></li>';
    }
    return $html . '</ul></div></section>';
}
