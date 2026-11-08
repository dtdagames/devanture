<?php
declare(strict_types=1);

/** Icônes SVG en trait, inline, sans dépendance. */
function icon_svg(string $name): string
{
    $formes = [
        'epi' => '<path d="M12 21V6"/><path d="M12 10c-2.5 0-4-1.6-4-4 2.5 0 4 1.6 4 4z"/><path d="M12 10c2.5 0 4-1.6 4-4-2.5 0-4 1.6-4 4z"/><path d="M12 15c-2.5 0-4-1.6-4-4 2.5 0 4 1.6 4 4z"/><path d="M12 15c2.5 0 4-1.6 4-4-2.5 0-4 1.6-4 4z"/>',
        'horloge' => '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
        'coeur' => '<path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/>',
        'etoile' => '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
    ];
    $forme = $formes[$name] ?? $formes['etoile'];

    return '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' . $forme . '</svg>';
}

/** Lien-bouton : $bouton = ['label' => ..., 'to' => ...]. */
function link_button(array $bouton, string $classe): string
{
    return '<a class="' . e($classe) . '" href="' . e($bouton['to']) . '">' . e($bouton['label']) . '</a>';
}

/** Bandeau d'en-tête. Clés : title, subtitle?, image?, buttons? (1 ou 2). */
function block_hero(array $hero): void
{
    $avecImage = !empty($hero['image']);
    $classe = 'hero' . ($avecImage ? ' hero--image' : '');
    $style = $avecImage ? ' style="--hero-bg: url(' . e("'" . $hero['image'] . "'") . ')"' : '';

    echo '<section class="' . $classe . '"' . $style . '>';
    echo '<div class="container hero-inner">';
    echo '<h1>' . e($hero['title']) . '</h1>';
    if (!empty($hero['subtitle'])) {
        echo '<p class="lead">' . e($hero['subtitle']) . '</p>';
    }
    if (!empty($hero['buttons'])) {
        echo '<div class="actions">';
        foreach ($hero['buttons'] as $index => $bouton) {
            echo link_button($bouton, $index === 0 ? 'btn' : 'btn btn--ghost');
        }
        echo '</div>';
    }
    echo '</div></section>';
}

/** Grille de points forts. $items : icon, title, text. */
function block_points(string $titre, array $items): void
{
    echo '<section class="section"><div class="container">';
    echo '<h2>' . e($titre) . '</h2>';
    echo '<div class="grid grid--points">';
    foreach ($items as $item) {
        echo '<article class="card">' . icon_svg($item['icon']);
        echo '<h3>' . e($item['title']) . '</h3>';
        echo '<p>' . e($item['text']) . '</p></article>';
    }
    echo '</div></div></section>';
}

/** Texte riche + image à côté. Clés : title, paragraphs[], image, alt, side (left|right). */
function block_text_image(array $bloc): void
{
    $gauche = ($bloc['side'] ?? 'right') === 'left';
    $media = '<figure class="split-media"><img src="' . e($bloc['image']) . '" alt="' . e($bloc['alt']) . '" loading="lazy"></figure>';
    $texte = '<div class="split-text"><h2>' . e($bloc['title']) . '</h2>';
    foreach ($bloc['paragraphs'] as $paragraphe) {
        $texte .= '<p>' . e($paragraphe) . '</p>';
    }
    $texte .= '</div>';

    echo '<section class="section"><div class="container split-grid">';
    echo $gauche ? $media . $texte : $texte . $media;
    echo '</div></section>';
}

/** Galerie en grille avec légende ; agrandissement géré par app.js. $items : src, alt, caption. */
function block_gallery(string $titre, array $items): void
{
    echo '<section class="section"><div class="container">';
    echo '<h2>' . e($titre) . '</h2>';
    echo '<ul class="grid grid--gallery">';
    foreach ($items as $item) {
        echo '<li><a class="gallery-link" href="' . e($item['src']) . '" data-lightbox="1" data-caption="' . e($item['caption']) . '">';
        echo '<img src="' . e($item['src']) . '" alt="' . e($item['alt']) . '" loading="lazy">';
        echo '<span class="caption">' . e($item['caption']) . '</span></a></li>';
    }
    echo '</ul></div></section>';
}

/** FAQ en accordéon natif (details). $items : q, a. La première question est ouverte. */
function block_faq(string $titre, array $items): void
{
    echo '<section class="section"><div class="container narrow">';
    echo '<h2>' . e($titre) . '</h2><div class="faq">';
    foreach ($items as $index => $item) {
        echo '<details' . ($index === 0 ? ' open' : '') . '>';
        echo '<summary>' . e($item['q']) . '</summary>';
        echo '<p>' . e($item['a']) . '</p></details>';
    }
    echo '</div></div></section>';
}

/** Bandeau d'appel à l'action. Clés : title, text, button (label, to). */
function block_cta(array $bloc): void
{
    echo '<section class="cta"><div class="container cta-inner"><div>';
    echo '<h2>' . e($bloc['title']) . '</h2>';
    echo '<p>' . e($bloc['text']) . '</p></div>';
    echo link_button($bloc['button'], 'btn btn--light');
    echo '</div></section>';
}

/** Équipe. $members : name, role, bio, initial (lettre affichée dans un disque). */
function block_team(string $titre, array $members): void
{
    echo '<section class="section section--tinted"><div class="container">';
    echo '<h2>' . e($titre) . '</h2><ul class="grid grid--team">';
    foreach ($members as $membre) {
        echo '<li class="card member">';
        echo '<span class="avatar" aria-hidden="true">' . e($membre['initial']) . '</span>';
        echo '<h3>' . e($membre['name']) . '</h3>';
        echo '<p class="role">' . e($membre['role']) . '</p>';
        echo '<p>' . e($membre['bio']) . '</p></li>';
    }
    echo '</ul></div></section>';
}

/** Chiffres clés en ligne. $items : value, label. */
function block_stats(array $items): void
{
    echo '<section class="stats" aria-label="Chiffres clés"><div class="container">';
    echo '<ul class="stats-list">';
    foreach ($items as $item) {
        echo '<li><strong>' . e($item['value']) . '</strong><span>' . e($item['label']) . '</span></li>';
    }
    echo '</ul></div></section>';
}

/** Bloc de texte simple. $paragraphs : liste de chaînes. */
function block_prose(string $titre, array $paragraphs): void
{
    echo '<section class="section"><div class="container narrow prose">';
    echo '<h2>' . e($titre) . '</h2>';
    foreach ($paragraphs as $paragraphe) {
        echo '<p>' . e($paragraphe) . '</p>';
    }
    echo '</div></section>';
}
