<?php
declare(strict_types=1);

/** @param array<int, array{label: string, to: string, variant?: string}> $buttons */
function b_buttons(array $buttons): string
{
    $html = '<div class="actions">';
    foreach ($buttons as $i => $b) {
        $variant = $b['variant'] ?? ($i === 0 ? 'primary' : 'secondary');
        $html .= '<a class="btn btn--' . e($variant) . '" href="' . e($b['to']) . '">' . e($b['label']) . '</a>';
    }

    return $html . '</div>';
}

/** Bandeau d'en-tete, image de fond optionnelle avec voile sombre. */
function b_hero(string $title, string $subtitle, ?string $image = null, array $buttons = []): string
{
    $cls = 'hero' . ($image !== null ? ' hero--image' : '');
    $html = '<section class="' . $cls . '">';
    if ($image !== null) {
        $html .= '<img class="hero__img" src="' . e(asset($image)) . '" alt="" width="1200" height="600">'
            . '<div class="hero__veil" aria-hidden="true"></div>';
    }
    $html .= '<div class="container hero__inner"><h1>' . e($title) . '</h1>'
        . '<p class="hero__sub">' . e($subtitle) . '</p>';
    if ($buttons !== []) {
        $html .= b_buttons($buttons);
    }

    return $html . '</div></section>';
}

/** Grille de points forts, 2 a 4 colonnes. */
function b_points(string $heading, array $items): string
{
    $html = '<section class="block points"><div class="container"><h2>' . e($heading) . '</h2><ul class="points__grid">';
    foreach ($items as $it) {
        $html .= '<li class="point"><span class="point__icon">' . icon($it['icon']) . '</span>'
            . '<h3>' . e($it['title']) . '</h3><p>' . e($it['text']) . '</p></li>';
    }

    return $html . '</ul></div></section>';
}

/** Bloc de texte riche avec image a cote, plusieurs paragraphes. */
function b_richtext(string $heading, array $paragraphs, ?string $image = null, string $alt = '', string $side = 'right'): string
{
    $text = '<div class="split__text"><h2>' . e($heading) . '</h2>';
    foreach ($paragraphs as $p) {
        $text .= '<p>' . e($p) . '</p>';
    }
    $text .= '</div>';
    $media = '';
    if ($image !== null) {
        $media = '<figure class="split__media"><img src="' . e(asset($image)) . '" alt="' . e($alt) . '" width="800" height="600" loading="lazy"></figure>';
    }
    $order = $side === 'left' ? ' split--image-left' : '';
    $inner = $side === 'left' ? $media . $text : $text . $media;

    return '<section class="block split' . $order . '"><div class="container split__inner">' . $inner . '</div></section>';
}

/** Galerie en grille avec legende et agrandissement (JS). */
function b_gallery(string $heading, array $images): string
{
    $html = '<section class="block gallery"><div class="container"><h2>' . e($heading) . '</h2><ul class="gallery__grid">';
    foreach ($images as $img) {
        $html .= '<li class="gallery__item"><a class="gallery__link" href="' . e(asset($img['src'])) . '" data-caption="' . e($img['caption']) . '">'
            . '<img src="' . e(asset($img['src'])) . '" alt="' . e($img['alt']) . '" width="800" height="600" loading="lazy"></a>'
            . '<p class="gallery__caption">' . e($img['caption']) . '</p></li>';
    }

    return $html . '</ul></div></section>';
}

/** FAQ en accordeon ; la premiere question est ouverte. */
function b_faq(string $heading, array $items): string
{
    $html = '<section class="block faq"><div class="container"><h2>' . e($heading) . '</h2>';
    foreach ($items as $i => $it) {
        $open = $i === 0 ? ' open' : '';
        $html .= '<details class="faq__item"' . $open . '><summary>' . e($it['q']) . '</summary><p>' . e($it['a']) . '</p></details>';
    }

    return $html . '</div></section>';
}

/** Bandeau d'appel a l'action. */
function b_cta(string $title, string $text, string $label, string $to): string
{
    return '<section class="block cta"><div class="container cta__inner"><div><h2>' . e($title) . '</h2><p>' . e($text) . '</p></div>'
        . '<a class="btn btn--light" href="' . e($to) . '">' . e($label) . '</a></div></section>';
}

/** Equipe : nom, role, bio, initiales dans un disque. */
function b_team(string $heading, array $members): string
{
    $html = '<section class="block team"><div class="container"><h2>' . e($heading) . '</h2><ul class="team__grid">';
    foreach ($members as $m) {
        $html .= '<li class="team__card"><div class="team__avatar" aria-hidden="true">' . e($m['initials']) . '</div>'
            . '<h3>' . e($m['name']) . '</h3><p class="team__role">' . e($m['role']) . '</p><p>' . e($m['bio']) . '</p></li>';
    }

    return $html . '</ul></div></section>';
}

/** Chiffres cles en ligne. */
function b_figures(array $items): string
{
    $html = '<section class="block figures"><div class="container"><ul class="figures__list">';
    foreach ($items as $it) {
        $html .= '<li><span class="figures__value">' . e($it['value']) . '</span><span class="figures__label">' . e($it['label']) . '</span></li>';
    }

    return $html . '</ul></div></section>';
}
