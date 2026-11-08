<?php
declare(strict_types=1);

/**
 * Rendu des blocs. Chaque page décrit ses sections sous forme
 * [ 'type' => 'hero', ...props ] ; render_block() dispatche.
 */

function render_block(array $block, array $site): string
{
    $type = $block['type'] ?? '';
    $fn   = 'block_' . str_replace('-', '_', $type);
    if (!function_exists($fn)) {
        return '<!-- bloc inconnu : ' . e($type) . ' -->';
    }
    return $fn($block, $site);
}

function render_blocks(array $blocks, array $site): string
{
    $out = '';
    foreach ($blocks as $b) {
        $out .= render_block($b, $site) . "\n";
    }
    return $out;
}

/** En-tête de section optionnel (titre + chapeau). */
function section_head(array $b): string
{
    if (empty($b['title']) && empty($b['intro'])) {
        return '';
    }
    $h = '<div class="section-head">';
    if (!empty($b['title'])) {
        $h .= '<h2>' . e($b['title']) . '</h2>';
    }
    if (!empty($b['intro'])) {
        $h .= '<p class="section-intro">' . e($b['intro']) . '</p>';
    }
    return $h . '</div>';
}

/** Paragraphes : accepte une chaîne (séparée par lignes vides) ou une liste. */
function paragraphs($text): string
{
    $parts = is_array($text) ? $text : preg_split('/\n\s*\n/', (string) $text);
    $out = '';
    foreach ($parts as $p) {
        $p = trim((string) $p);
        if ($p !== '') {
            $out .= '<p>' . e($p) . '</p>';
        }
    }
    return $out;
}

/* ------------------------------------------------------------- 1. Hero */

function block_hero(array $b, array $site): string
{
    $style = '';
    $class = 'hero';
    if (!empty($b['image'])) {
        $style = ' style="background-image:url(\'' . e(asset($b['image'])) . '\')"';
        $class .= ' hero--image';
    }
    $h = '<section class="' . $class . '"' . $style . '><div class="hero-inner container">';
    if (!empty($b['kicker'])) {
        $h .= '<p class="hero-kicker">' . e($b['kicker']) . '</p>';
    }
    $h .= '<h1>' . e($b['title'] ?? '') . '</h1>';
    if (!empty($b['subtitle'])) {
        $h .= '<p class="hero-subtitle">' . e($b['subtitle']) . '</p>';
    }
    if (!empty($b['cta']) || !empty($b['secondary'])) {
        $h .= '<div class="hero-actions">';
        if (!empty($b['cta'])) {
            $h .= render_button($b['cta'], 'btn btn-primary');
        }
        if (!empty($b['secondary'])) {
            $h .= render_button($b['secondary'], 'btn btn-ghost');
        }
        $h .= '</div>';
    }
    return $h . '</div></section>';
}

/* --------------------------------------------------------- 2. Features */

function block_features(array $b, array $site): string
{
    $cols = (int) ($b['columns'] ?? 3);
    $cols = max(2, min(4, $cols));
    $h = '<section class="section features"><div class="container">' . section_head($b);
    $h .= '<div class="grid grid-' . $cols . '">';
    foreach ($b['items'] ?? [] as $it) {
        $h .= '<article class="feature">';
        if (!empty($it['icon'])) {
            $h .= '<div class="feature-icon">' . icon($it['icon']) . '</div>';
        }
        $h .= '<h3>' . e($it['title'] ?? '') . '</h3>';
        if (!empty($it['text'])) {
            $h .= '<p>' . e($it['text']) . '</p>';
        }
        $h .= '</article>';
    }
    return $h . '</div></div></section>';
}

/* ------------------------------------------------------- 3. Text + image */

function block_text_image(array $b, array $site): string
{
    $side  = ($b['image_side'] ?? 'right') === 'left' ? 'left' : 'right';
    $h  = '<section class="section text-image text-image--' . $side . '"><div class="container text-image-inner">';
    $h .= '<div class="text-image-text">';
    if (!empty($b['title'])) {
        $h .= '<h2>' . e($b['title']) . '</h2>';
    }
    $h .= paragraphs($b['text'] ?? '');
    if (!empty($b['cta'])) {
        $h .= '<p>' . render_button($b['cta'], 'btn btn-secondary') . '</p>';
    }
    $h .= '</div>';
    if (!empty($b['image'])) {
        $h .= '<figure class="text-image-figure"><img src="' . e(asset($b['image'])) . '" alt="' . e($b['alt'] ?? '') . '" loading="lazy" width="800" height="600">';
        if (!empty($b['caption'])) {
            $h .= '<figcaption>' . e($b['caption']) . '</figcaption>';
        }
        $h .= '</figure>';
    }
    return $h . '</div></section>';
}

/* ----------------------------------------------------------- 4. Gallery */

function block_gallery(array $b, array $site): string
{
    $h = '<section class="section gallery"><div class="container">' . section_head($b);
    $h .= '<div class="gallery-grid" data-gallery>';
    foreach ($b['items'] ?? [] as $i => $it) {
        $src = asset($it['image'] ?? '');
        $cap = $it['caption'] ?? '';
        $h .= '<figure class="gallery-item">'
            . '<a href="' . e($src) . '" data-lightbox data-caption="' . e($cap) . '" aria-label="' . e('Agrandir : ' . $cap) . '">'
            . '<img src="' . e($src) . '" alt="' . e($it['alt'] ?? $cap) . '" loading="lazy" width="800" height="600">'
            . '</a>';
        if ($cap !== '') {
            $h .= '<figcaption>' . e($cap) . '</figcaption>';
        }
        $h .= '</figure>';
    }
    return $h . '</div></div></section>';
}

/* ------------------------------------------------------ 5. Testimonials */

function stars(int $n): string
{
    $n = max(0, min(5, $n));
    $s = '<span class="stars" role="img" aria-label="' . e("Note : $n sur 5") . '">';
    for ($i = 1; $i <= 5; $i++) {
        $s .= '<span class="star' . ($i <= $n ? ' star--on' : '') . '" aria-hidden="true">&#9733;</span>';
    }
    return $s . '</span>';
}

function block_testimonials(array $b, array $site): string
{
    $h = '<section class="section testimonials"><div class="container">' . section_head($b);
    $h .= '<div class="grid grid-3">';
    foreach ($b['items'] ?? [] as $it) {
        $h .= '<blockquote class="testimonial">';
        if (isset($it['rating'])) {
            $h .= stars((int) $it['rating']);
        }
        $h .= '<p>' . e($it['quote'] ?? '') . '</p>';
        $h .= '<footer><cite>' . e($it['author'] ?? '') . '</cite>';
        if (!empty($it['place'])) {
            $h .= ' <span class="testimonial-place">' . e($it['place']) . '</span>';
        }
        $h .= '</footer></blockquote>';
    }
    return $h . '</div></div></section>';
}

/* --------------------------------------------------------------- 6. FAQ */

function block_faq(array $b, array $site): string
{
    $h = '<section class="section faq"><div class="container container--narrow">' . section_head($b);
    $h .= '<div class="faq-list">';
    foreach ($b['items'] ?? [] as $i => $it) {
        $h .= '<details class="faq-item"' . ($i === 0 ? ' open' : '') . '>'
            . '<summary>' . e($it['q'] ?? '') . '</summary>'
            . '<div class="faq-answer">' . paragraphs($it['a'] ?? '') . '</div>'
            . '</details>';
    }
    return $h . '</div></div></section>';
}

/* --------------------------------------------------------------- 7. CTA */

function block_cta(array $b, array $site): string
{
    $h = '<section class="section cta"><div class="container cta-inner">';
    $h .= '<div><h2>' . e($b['title'] ?? '') . '</h2>';
    if (!empty($b['text'])) {
        $h .= '<p>' . e($b['text']) . '</p>';
    }
    $h .= '</div>';
    if (!empty($b['button'])) {
        $h .= render_button($b['button'], 'btn btn-primary btn-lg');
    }
    return $h . '</div></section>';
}

/* -------------------------------------------------------------- 8. Team */

function block_team(array $b, array $site): string
{
    $h = '<section class="section team"><div class="container">' . section_head($b);
    $h .= '<div class="grid grid-3">';
    foreach ($b['items'] ?? [] as $it) {
        $name = $it['name'] ?? '';
        $h .= '<article class="member">';
        if (!empty($it['photo'])) {
            $h .= '<img class="member-photo" src="' . e(asset($it['photo'])) . '" alt="' . e($name) . '" loading="lazy" width="160" height="160">';
        } else {
            $h .= '<div class="member-initial" aria-hidden="true">' . e(initial($name)) . '</div>';
        }
        $h .= '<h3>' . e($name) . '</h3>';
        if (!empty($it['role'])) {
            $h .= '<p class="member-role">' . e($it['role']) . '</p>';
        }
        if (!empty($it['bio'])) {
            $h .= '<p class="member-bio">' . e($it['bio']) . '</p>';
        }
        $h .= '</article>';
    }
    return $h . '</div></div></section>';
}

/* ------------------------------------------------------------- 9. Stats */

function block_stats(array $b, array $site): string
{
    $h = '<section class="section stats"><div class="container">' . section_head($b);
    $h .= '<dl class="stats-row">';
    foreach ($b['items'] ?? [] as $it) {
        $h .= '<div class="stat"><dt>' . e($it['label'] ?? '') . '</dt><dd>' . e((string) ($it['value'] ?? '')) . '</dd></div>';
    }
    return $h . '</dl></div></section>';
}

/* ---------------------------------------------------- 10. Contact form */

/**
 * Props : fields (liste), required (liste), state (résultat de handle_contact_form),
 *         title, intro, success (texte de confirmation).
 */
function block_contact_form(array $b, array $site): string
{
    $defs     = contact_field_defs();
    $fields   = $b['fields'] ?? ['nom', 'email', 'message'];
    $required = $b['required'] ?? ['nom', 'email', 'message'];
    $state    = $b['state'] ?? ['status' => 'idle', 'values' => [], 'errors' => []];
    $values   = $state['values'];
    $errors   = $state['errors'];

    $h = '<section class="section contact-form" id="formulaire"><div class="container container--narrow">' . section_head($b);

    if ($state['status'] === 'success') {
        $h .= '<div class="alert alert-success" role="status"><h3>Message envoyé</h3><p>'
            . e($b['success'] ?? 'Merci, nous vous répondrons très vite.') . '</p></div>';
        return $h . '</div></section>';
    }

    if (!empty($errors['_form'])) {
        $h .= '<div class="alert alert-error" role="alert">' . e($errors['_form']) . '</div>';
    } elseif ($errors !== []) {
        $h .= '<div class="alert alert-error" role="alert">Merci de corriger les champs signalés ci-dessous.</div>';
    }

    $h .= '<form class="form" method="post" action="' . e($b['action'] ?? '') . '#formulaire" novalidate>';
    $h .= '<input type="hidden" name="csrf" value="' . e(csrf_token()) . '">';
    // Pot de miel : hors écran, hors tabulation, ignoré par les navigateurs.
    $h .= '<div class="hp" aria-hidden="true"><label for="site_web">Site web</label>'
        . '<input type="text" id="site_web" name="site_web" tabindex="-1" autocomplete="off"></div>';

    foreach ($fields as $f) {
        if (!isset($defs[$f])) {
            continue;
        }
        $d     = $defs[$f];
        $req   = in_array($f, $required, true);
        $val   = $values[$f] ?? '';
        $err   = $errors[$f] ?? '';
        $id    = 'f-' . $f;
        $h .= '<div class="field' . ($err !== '' ? ' field--error' : '') . '">';
        $h .= '<label for="' . $id . '">' . e($d['label']) . ($req ? ' <span class="req" aria-hidden="true">*</span>' : '') . '</label>';
        $attrs = ' id="' . $id . '" name="' . $f . '" autocomplete="' . $d['autocomplete'] . '"'
            . ($req ? ' required aria-required="true"' : '')
            . ($err !== '' ? ' aria-invalid="true" aria-describedby="' . $id . '-err"' : '');
        if ($d['type'] === 'textarea') {
            $h .= '<textarea rows="6"' . $attrs . '>' . e($val) . '</textarea>';
        } else {
            $h .= '<input type="' . $d['type'] . '"' . $attrs . ' value="' . e($val) . '">';
        }
        if ($err !== '') {
            $h .= '<p class="field-error" id="' . $id . '-err">' . e($err) . '</p>';
        }
        $h .= '</div>';
    }

    $h .= '<p class="form-note">* champs obligatoires</p>';
    $h .= '<button type="submit" class="btn btn-primary">' . e($b['submit'] ?? 'Envoyer') . '</button>';
    $h .= '</form>';
    return $h . '</div></section>';
}

/* ---------------------------------------------------- 11. Texte simple */

/** Bloc de texte libre (mentions légales, 404…) : liste de sections { title, text }. */
function block_prose(array $b, array $site): string
{
    $h = '<section class="section prose"><div class="container container--narrow">';
    if (!empty($b['title'])) {
        $h .= '<h2>' . e($b['title']) . '</h2>';
    }
    foreach ($b['items'] ?? [] as $it) {
        if (!empty($it['title'])) {
            $h .= '<h3>' . e($it['title']) . '</h3>';
        }
        $h .= paragraphs($it['text'] ?? '');
    }
    if (!empty($b['cta'])) {
        $h .= '<p>' . render_button($b['cta'], 'btn btn-primary') . '</p>';
    }
    return $h . '</div></section>';
}

/* ------------------------------------------------- 12. Infos pratiques */

/** Coordonnées + horaires (utilisé sur la page contact). */
function block_infos(array $b, array $site): string
{
    $c = $site['contact'];
    $h = '<section class="section infos"><div class="container">' . section_head($b);
    $h .= '<div class="grid grid-3">';
    $h .= '<div class="info">' . icon('pin') . '<h3>Adresse</h3><p>' . e($c['address']) . '</p></div>';
    $h .= '<div class="info">' . icon('clock') . '<h3>Horaires</h3><p>' . e($c['hours']) . '</p><p>Fermé le lundi.</p></div>';
    $h .= '<div class="info">' . icon('phone') . '<h3>Nous joindre</h3>'
        . '<p><a href="tel:' . e($c['phone_tel']) . '">' . e($c['phone']) . '</a></p>'
        . '<p><a href="mailto:' . e($c['email']) . '">' . e($c['email']) . '</a></p></div>';
    return $h . '</div></div></section>';
}
