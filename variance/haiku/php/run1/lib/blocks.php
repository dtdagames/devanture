<?php
declare(strict_types=1);

function icon(string $name): string
{
    $paths = [
        'clock' => '<circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/>',
        'shield' => '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>',
        'scale' => '<path d="M12 3v18M5 7h14M5 7l-3 6a3 3 0 0 0 6 0zM19 7l-3 6a3 3 0 0 0 6 0z"/>',
        'pin' => '<path d="M12 21s-7-6-7-11a7 7 0 0 1 14 0c0 5-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
        'euro' => '<path d="M17 7a6 6 0 1 0 0 10M4 10h9M4 14h9"/>',
        'home' => '<path d="M3 11l9-7 9 7v9H3z"/>',
    ];
    $inner = $paths[$name] ?? $paths['shield'];
    return '<svg class="icon" viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' . $inner . '</svg>';
}

function render_block(array $b): void
{
    $type = $b['type'] ?? '';
    switch ($type) {
        case 'hero':
            block_hero($b);
            break;
        case 'figures':
            block_figures($b);
            break;
        case 'features':
            block_features($b);
            break;
        case 'richtext':
            block_richtext($b);
            break;
        case 'gallery':
            block_gallery($b);
            break;
        case 'faq':
            block_faq($b);
            break;
        case 'team':
            block_team($b);
            break;
        case 'cta':
            block_cta($b);
            break;
        case 'contact_form':
            block_contact_form($b);
            break;
        default:
            break;
    }
}

function block_hero(array $b): void
{
    $has_image = !empty($b['image']);
    $class = 'hero' . ($has_image ? ' hero--image' : '') . (!empty($b['compact']) ? ' hero--compact' : '');
    $style = $has_image ? ' style="background-image:url(' . e(asset($b['image'])) . ')"' : '';
    echo '<section class="' . $class . '"' . $style . '>';
    echo '<div class="container hero__inner">';
    if (!empty($b['eyebrow'])) {
        echo '<p class="eyebrow">' . e($b['eyebrow']) . '</p>';
    }
    echo '<h1>' . e($b['title']) . '</h1>';
    if (!empty($b['subtitle'])) {
        echo '<p class="lead">' . e($b['subtitle']) . '</p>';
    }
    if (!empty($b['buttons'])) {
        echo '<div class="actions">';
        foreach ($b['buttons'] as $btn) {
            $cls = !empty($btn['primary']) ? 'btn btn--primary' : 'btn btn--ghost';
            echo '<a class="' . $cls . '" href="' . e($btn['to']) . '">' . e($btn['label']) . '</a>';
        }
        echo '</div>';
    }
    echo '</div></section>';
}

function block_figures(array $b): void
{
    echo '<section class="section figures"><div class="container">';
    echo '<ul class="figures__list">';
    foreach ($b['items'] as $item) {
        echo '<li><strong>' . e($item['value']) . '</strong><span>' . e($item['label']) . '</span></li>';
    }
    echo '</ul></div></section>';
}

function block_features(array $b): void
{
    $cols = max(2, min(4, (int) ($b['columns'] ?? 3)));
    echo '<section class="section"><div class="container">';
    if (!empty($b['title'])) {
        echo '<h2>' . e($b['title']) . '</h2>';
    }
    if (!empty($b['intro'])) {
        echo '<p class="intro">' . e($b['intro']) . '</p>';
    }
    echo '<div class="grid grid--' . $cols . '">';
    foreach ($b['items'] as $item) {
        echo '<article class="card">';
        echo icon($item['icon'] ?? 'shield');
        echo '<h3>' . e($item['title']) . '</h3>';
        echo '<p>' . e($item['text']) . '</p>';
        echo '</article>';
    }
    echo '</div></div></section>';
}

function block_richtext(array $b): void
{
    $side = ($b['side'] ?? 'right') === 'left' ? 'left' : 'right';
    echo '<section class="section split split--' . $side . '"><div class="container split__inner">';
    echo '<div class="split__text">';
    if (!empty($b['title'])) {
        echo '<h2>' . e($b['title']) . '</h2>';
    }
    foreach ($b['paragraphs'] as $p) {
        echo '<p>' . e($p) . '</p>';
    }
    echo '</div>';
    if (!empty($b['image'])) {
        echo '<figure class="split__media"><img src="' . e(asset($b['image'])) . '" alt="' . e($b['image_alt'] ?? '') . '" loading="lazy" width="800" height="600"></figure>';
    }
    echo '</div></section>';
}

function block_gallery(array $b): void
{
    echo '<section class="section section--alt"><div class="container">';
    if (!empty($b['title'])) {
        echo '<h2>' . e($b['title']) . '</h2>';
    }
    echo '<ul class="gallery">';
    foreach ($b['items'] as $item) {
        $src = e(asset($item['src']));
        echo '<li class="gallery__item"><a href="' . $src . '" data-lightbox="1" data-caption="' . e($item['caption']) . '">';
        echo '<img src="' . $src . '" alt="' . e($item['alt'] ?? $item['caption']) . '" loading="lazy" width="600" height="450">';
        echo '</a><p class="gallery__caption">' . e($item['caption']) . '</p></li>';
    }
    echo '</ul></div></section>';
}

function block_faq(array $b): void
{
    echo '<section class="section"><div class="container narrow">';
    if (!empty($b['title'])) {
        echo '<h2>' . e($b['title']) . '</h2>';
    }
    foreach ($b['items'] as $i => $item) {
        $open = $i === 0 ? ' open' : '';
        echo '<details class="faq"' . $open . '><summary>' . e($item['q']) . '</summary><p>' . e($item['a']) . '</p></details>';
    }
    echo '</div></section>';
}

function block_team(array $b): void
{
    echo '<section class="section"><div class="container">';
    if (!empty($b['title'])) {
        echo '<h2>' . e($b['title']) . '</h2>';
    }
    if (!empty($b['intro'])) {
        echo '<p class="intro">' . e($b['intro']) . '</p>';
    }
    echo '<div class="grid grid--3">';
    foreach ($b['members'] as $m) {
        echo '<article class="member">';
        echo '<div class="member__initial" aria-hidden="true">' . e($m['initial']) . '</div>';
        echo '<h3>' . e($m['name']) . '</h3>';
        echo '<p class="member__role">' . e($m['role']) . '</p>';
        echo '<p>' . e($m['bio']) . '</p>';
        echo '</article>';
    }
    echo '</div></div></section>';
}

function block_cta(array $b): void
{
    echo '<section class="cta"><div class="container cta__inner">';
    echo '<div><h2>' . e($b['title']) . '</h2>';
    if (!empty($b['text'])) {
        echo '<p>' . e($b['text']) . '</p>';
    }
    echo '</div>';
    echo '<a class="btn btn--primary" href="' . e($b['button']['to']) . '">' . e($b['button']['label']) . '</a>';
    echo '</div></section>';
}

function block_contact_form(array $b): void
{
    $state = $b['state'];
    echo '<section class="section"><div class="container narrow">';
    if (!empty($b['title'])) {
        echo '<h2>' . e($b['title']) . '</h2>';
    }
    if ($state['success']) {
        echo '<div class="notice notice--ok" role="status"><p>Merci, votre message a bien été transmis au cabinet. Nous vous répondrons dans les meilleurs délais.</p></div>';
        echo '</div></section>';
        return;
    }
    if ($state['csrf_error']) {
        echo '<div class="notice notice--error" role="alert"><p>Votre session a expiré. Merci de renvoyer le formulaire.</p></div>';
    } elseif ($state['errors']) {
        echo '<div class="notice notice--error" role="alert"><p>Merci de corriger les champs signalés.</p></div>';
    }
    echo '<form method="post" action="/contact" class="form" novalidate>';
    echo '<input type="hidden" name="csrf" value="' . e($state['csrf']) . '">';
    // Champ pot de miel : masqué aux visiteurs humains.
    echo '<div class="hp" aria-hidden="true"><label>Ne pas remplir <input type="text" name="site_web" tabindex="-1" autocomplete="off"></label></div>';
    foreach ($b['fields'] as $f) {
        $name = $f['name'];
        $id = 'f-' . $name;
        $value = $state['values'][$name] ?? '';
        $err = $state['errors'][$name] ?? null;
        $req = !empty($f['required']);
        echo '<div class="field' . ($err ? ' field--error' : '') . '">';
        echo '<label for="' . e($id) . '">' . e($f['label']) . ($req ? ' <span class="req" aria-hidden="true">*</span>' : '') . '</label>';
        $attrs = 'id="' . e($id) . '" name="' . e($name) . '"' . ($req ? ' required aria-required="true"' : '');
        if ($err) {
            $attrs .= ' aria-invalid="true" aria-describedby="' . e($id) . '-err"';
        }
        if ($f['type'] === 'select') {
            echo '<select ' . $attrs . '>';
            echo '<option value="">Choisir</option>';
            foreach ($f['options'] as $opt) {
                $sel = $opt === $value ? ' selected' : '';
                echo '<option value="' . e($opt) . '"' . $sel . '>' . e($opt) . '</option>';
            }
            echo '</select>';
        } elseif ($f['type'] === 'textarea') {
            echo '<textarea rows="6" ' . $attrs . '>' . e($value) . '</textarea>';
        } else {
            $type = in_array($f['type'], ['email', 'tel'], true) ? $f['type'] : 'text';
            echo '<input type="' . $type . '" value="' . e($value) . '" ' . $attrs . '>';
        }
        if ($err) {
            echo '<p class="field__error" id="' . e($id) . '-err">' . e($err) . '</p>';
        }
        echo '</div>';
    }
    echo '<button type="submit" class="btn btn--primary">Envoyer le message</button>';
    echo '</form></div></section>';
}
