<?php
declare(strict_types=1);

/** Bandeau d'en-tête. $b: title, subtitle, image?, buttons[[label,href,secondary?]] */
function block_hero(array $b): string
{
    $style = '';
    $cls = 'hero';
    if (!empty($b['image'])) {
        $cls .= ' hero--image';
        $style = ' style="background-image:url(\'' . e($b['image']) . '\')"';
    }
    $h = '<section class="' . $cls . '"' . $style . '><div class="hero__veil"><div class="container hero__inner">';
    $h .= '<h1>' . e($b['title']) . '</h1>';
    if (!empty($b['subtitle'])) {
        $h .= '<p class="hero__sub">' . e($b['subtitle']) . '</p>';
    }
    if (!empty($b['buttons'])) {
        $h .= '<p class="hero__actions">';
        foreach ($b['buttons'] as $btn) {
            $c = !empty($btn[2]) ? 'btn btn--ghost' : 'btn';
            $h .= '<a class="' . $c . '" href="' . e($btn[1]) . '">' . e($btn[0]) . '</a> ';
        }
        $h .= '</p>';
    }
    return $h . '</div></div></section>';
}

/** Grille de points forts. $b: title?, cols (2-4), items[[icon,title,text]] */
function block_features(array $b): string
{
    $cols = max(2, min(4, (int)($b['cols'] ?? 3)));
    $h = '<section class="section"><div class="container">';
    if (!empty($b['title'])) {
        $h .= '<h2 class="section__title">' . e($b['title']) . '</h2>';
    }
    $h .= '<div class="grid grid--' . $cols . '">';
    foreach ($b['items'] as $it) {
        $h .= '<article class="feature"><span class="feature__icon" aria-hidden="true">' . e($it[0]) . '</span>'
            . '<h3>' . e($it[1]) . '</h3><p>' . e($it[2]) . '</p></article>';
    }
    return $h . '</div></div></section>';
}

/** Texte riche + image. $b: title, paragraphs[], image, alt, side (left|right), list?[] */
function block_richtext(array $b): string
{
    $side = ($b['side'] ?? 'right') === 'left' ? 'left' : 'right';
    $h = '<section class="section' . (!empty($b['alt_bg']) ? ' section--alt' : '') . '"><div class="container split split--img-' . $side . '">';
    $h .= '<div class="split__text"><h2>' . e($b['title']) . '</h2>';
    foreach ($b['paragraphs'] as $p) {
        $h .= '<p>' . e($p) . '</p>';
    }
    if (!empty($b['list'])) {
        $h .= '<ul class="checks">';
        foreach ($b['list'] as $li) {
            $h .= '<li>' . e($li) . '</li>';
        }
        $h .= '</ul>';
    }
    if (!empty($b['button'])) {
        $h .= '<p><a class="btn" href="' . e($b['button'][1]) . '">' . e($b['button'][0]) . '</a></p>';
    }
    $h .= '</div>';
    if (!empty($b['image'])) {
        $h .= '<figure class="split__media"><img src="' . e($b['image']) . '" alt="' . e($b['alt'] ?? '') . '" loading="lazy"></figure>';
    }
    return $h . '</div></section>';
}

/** Galerie avec lightbox. $b: title?, items[[src,caption]] */
function block_gallery(array $b): string
{
    $h = '<section class="section section--alt"><div class="container">';
    if (!empty($b['title'])) {
        $h .= '<h2 class="section__title">' . e($b['title']) . '</h2>';
    }
    $h .= '<div class="gallery">';
    foreach ($b['items'] as $it) {
        $h .= '<figure class="gallery__item"><button type="button" class="gallery__btn" data-full="' . e($it[0]) . '" data-caption="' . e($it[1]) . '" aria-label="Agrandir : ' . e($it[1]) . '">'
            . '<img src="' . e($it[0]) . '" alt="' . e($it[1]) . '" loading="lazy"></button>'
            . '<figcaption>' . e($it[1]) . '</figcaption></figure>';
    }
    return $h . '</div></div></section>';
}

/** FAQ en accordéon, première ouverte. $b: title?, items[[q,a]] */
function block_faq(array $b): string
{
    $h = '<section class="section"><div class="container container--narrow">';
    if (!empty($b['title'])) {
        $h .= '<h2 class="section__title">' . e($b['title']) . '</h2>';
    }
    foreach ($b['items'] as $i => $it) {
        $h .= '<details class="faq"' . ($i === 0 ? ' open' : '') . '><summary>' . e($it[0]) . '</summary><p>' . e($it[1]) . '</p></details>';
    }
    return $h . '</div></section>';
}

/** Bandeau d'appel à l'action. $b: title, text, button[label,href] */
function block_cta(array $b): string
{
    return '<section class="cta"><div class="container cta__inner"><div><h2>' . e($b['title']) . '</h2><p>' . e($b['text']) . '</p></div>'
        . '<a class="btn btn--light" href="' . e($b['button'][1]) . '">' . e($b['button'][0]) . '</a></div></section>';
}

/** Équipe. $b: title?, members[[name,role,bio,photo?]] */
function block_team(array $b): string
{
    $h = '<section class="section"><div class="container">';
    if (!empty($b['title'])) {
        $h .= '<h2 class="section__title">' . e($b['title']) . '</h2>';
    }
    $h .= '<div class="grid grid--3">';
    foreach ($b['members'] as $m) {
        $name = (string)$m[0];
        // Initiale : dernier mot du nom (sans mbstring, les noms utilisés commencent par une lettre ASCII)
        $parts = preg_split('/\s+/', trim(preg_replace('/^(Me|Maître)\s+/u', '', $name)));
        $initial = strtoupper(substr((string)($parts[0] ?? '?'), 0, 1));
        $h .= '<article class="member">';
        if (!empty($m[3])) {
            $h .= '<img class="member__photo" src="' . e($m[3]) . '" alt="Portrait de ' . e($name) . '" loading="lazy">';
        } else {
            $h .= '<span class="member__disc" aria-hidden="true">' . e($initial) . '</span>';
        }
        $h .= '<h3>' . e($name) . '</h3><p class="member__role">' . e($m[1]) . '</p><p>' . e($m[2]) . '</p></article>';
    }
    return $h . '</div></div></section>';
}

/** Chiffres clés. $b: items[[value,label]] */
function block_stats(array $b): string
{
    $h = '<section class="stats"><div class="container"><dl class="stats__row">';
    foreach ($b['items'] as $it) {
        $h .= '<div class="stat"><dt>' . e($it[1]) . '</dt><dd>' . e($it[0]) . '</dd></div>';
    }
    return $h . '</dl></div></section>';
}

/** Témoignages (non utilisé sur ce site : déontologie). $b: items[[quote,author,place,stars?]] */
function block_testimonials(array $b): string
{
    $h = '<section class="section"><div class="container"><div class="grid grid--3">';
    foreach ($b['items'] as $it) {
        $stars = isset($it[3]) ? str_repeat('★', max(0, min(5, (int)$it[3]))) : '';
        $h .= '<blockquote class="quote"><p>' . e($it[0]) . '</p>'
            . ($stars !== '' ? '<p class="quote__stars" aria-label="Note : ' . (int)$it[3] . ' sur 5">' . $stars . '</p>' : '')
            . '<footer>' . e($it[1]) . ', ' . e($it[2]) . '</footer></blockquote>';
    }
    return $h . '</div></div></section>';
}

/** Rendu générique de liste de blocs : [ ['type'=>..., ...], ... ] */
function render_blocks(array $blocks, array $ctx = []): string
{
    $out = '';
    foreach ($blocks as $b) {
        $fn = 'block_' . $b['type'];
        if ($b['type'] === 'contact_form') {
            $out .= block_contact_form($b, $ctx['form'] ?? []);
        } elseif (function_exists($fn)) {
            $out .= $fn($b);
        }
    }
    return $out;
}
