<?php
declare(strict_types=1);

function e(string $s): string
{
    return htmlspecialchars($s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function render_document(array $config, string $path, array $page, string $body): string
{
    $site = $config['site'];
    $title = $page['title'];
    if ($path !== '/') {
        $title .= ' | ' . $site['name'];
    } else {
        $title = $site['name'] . ' | ' . $title;
    }
    $desc = $page['description'];

    $nav = '';
    foreach ($config['nav'] as $item) {
        $current = $item['route'] === $path ? ' aria-current="page"' : '';
        $nav .= '<li><a href="' . e($item['route']) . '"' . $current . '>' . e($item['label']) . '</a></li>';
    }

    $footerLinks = '';
    foreach ($config['nav'] as $item) {
        $footerLinks .= '<li><a href="' . e($item['route']) . '">' . e($item['label']) . '</a></li>';
    }
    $footerLinks .= '<li><a href="/mentions-legales">Mentions légales</a></li>';

    $year = date('Y');

    return '<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>' . e($title) . '</title>
<meta name="description" content="' . e($desc) . '">
<link rel="stylesheet" href="/assets/css/site.css">
</head>
<body>
<a class="skip-link" href="#contenu">Aller au contenu</a>
<header class="site-header">
  <div class="wrap header-inner">
    <a class="brand" href="/">' . e($site['name']) . '</a>
    <button class="menu-toggle" type="button" aria-expanded="false" aria-controls="nav-principale">Menu</button>
    <nav id="nav-principale" class="site-nav" aria-label="Navigation principale">
      <ul>' . $nav . '</ul>
    </nav>
  </div>
</header>
<main id="contenu">
' . $body . '
</main>
<footer class="site-footer">
  <div class="wrap footer-grid">
    <div>
      <p class="footer-name">' . e($site['name']) . '</p>
      <p>' . e($site['tagline']) . '.</p>
      <p class="small">Avocats inscrits au barreau de Bordeaux. <a href="/mentions-legales">Mentions légales</a>.</p>
    </div>
    <div>
      <h2 class="footer-title">Liens</h2>
      <ul class="footer-links">' . $footerLinks . '</ul>
    </div>
    <div>
      <h2 class="footer-title">Coordonnées</h2>
      <p>' . e($site['address']) . '</p>
      <p>Tél. <a href="' . e($site['phone_href']) . '">' . e($site['phone_label']) . '</a></p>
      <p><a href="mailto:' . e($site['email']) . '">' . e($site['email']) . '</a></p>
    </div>
  </div>
  <div class="wrap small copyright">&copy; ' . e($year) . ' ' . e($site['name']) . '</div>
</footer>
<script src="/assets/js/site.js" defer></script>
</body>
</html>
';
}

function render_not_found(): string
{
    return '<section class="section wrap narrow">
  <h1>Page introuvable</h1>
  <p>La page que vous cherchez n\'existe pas ou a été déplacée.</p>
  <p><a class="btn btn-primary" href="/">Retour à l\'accueil</a></p>
</section>
';
}

function render_blocks(array $blocks, ?array $form): string
{
    $html = '';
    foreach ($blocks as $block) {
        switch ($block['type']) {
            case 'hero':
                $html .= block_hero($block);
                break;
            case 'features':
                $html .= block_features($block);
                break;
            case 'text_image':
                $html .= block_text_image($block);
                break;
            case 'gallery':
                $html .= block_gallery($block);
                break;
            case 'faq':
                $html .= block_faq($block);
                break;
            case 'cta':
                $html .= block_cta($block);
                break;
            case 'team':
                $html .= block_team($block);
                break;
            case 'figures':
                $html .= block_figures($block);
                break;
            case 'form':
                $html .= block_form($block, $form ?? []);
                break;
            case 'prose':
                $html .= block_prose($block);
                break;
        }
    }
    return $html;
}

function icon_svg(string $name): string
{
    $paths = [
        'clock' => '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
        'scale' => '<path d="M12 3v18M5 7h14M7 7l-3 6h6zM17 7l-3 6h6z"/>',
        'euro' => '<path d="M17 6a6 6 0 1 0 0 12M4 10h9M4 14h9"/>',
        'pin' => '<path d="M12 21s-7-6-7-11a7 7 0 0 1 14 0c0 5-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
        'users' => '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5a6.5 6.5 0 0 1 3.5 5.5"/>',
        'file' => '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 13h6M9 17h6"/>',
        'shield' => '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>',
        'heart' => '<path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/>',
    ];
    $inner = $paths[$name] ?? $paths['file'];
    return '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' . $inner . '</svg>';
}

function paragraphs_html(array $paras): string
{
    $out = '';
    foreach ($paras as $p) {
        $out .= '<p>' . e($p) . '</p>';
    }
    return $out;
}

function block_hero(array $b): string
{
    $bg = '';
    $cls = 'hero';
    if (!empty($b['image'])) {
        $cls .= ' hero-image';
        $bg = ' style="background-image:url(\'' . e($b['image']) . '\')"';
    }
    $buttons = '';
    foreach ($b['buttons'] ?? [] as $btn) {
        $buttons .= '<a class="btn btn-' . e($btn['style']) . '" href="' . e($btn['to']) . '">' . e($btn['label']) . '</a>';
    }
    $eyebrow = !empty($b['eyebrow']) ? '<p class="eyebrow">' . e($b['eyebrow']) . '</p>' : '';
    $sub = !empty($b['subtitle']) ? '<p class="lead">' . e($b['subtitle']) . '</p>' : '';
    $btnWrap = $buttons !== '' ? '<div class="actions">' . $buttons . '</div>' : '';
    return '<section class="' . $cls . '"' . $bg . '>
  <div class="wrap hero-inner">
    ' . $eyebrow . '
    <h1>' . e($b['title']) . '</h1>
    ' . $sub . '
    ' . $btnWrap . '
  </div>
</section>
';
}

function block_features(array $b): string
{
    $cols = (int) ($b['columns'] ?? 3);
    if ($cols < 2 || $cols > 4) {
        $cols = 3;
    }
    $items = '';
    foreach ($b['items'] as $it) {
        $items .= '<li class="card">' . icon_svg($it['icon']) . '<h3>' . e($it['title']) . '</h3><p>' . e($it['text']) . '</p></li>';
    }
    $title = !empty($b['title']) ? '<h2>' . e($b['title']) . '</h2>' : '';
    $intro = !empty($b['intro']) ? '<p class="intro">' . e($b['intro']) . '</p>' : '';
    return '<section class="section wrap">
  ' . $title . $intro . '
  <ul class="cards cols-' . $cols . '">' . $items . '</ul>
</section>
';
}

function block_text_image(array $b): string
{
    $side = ($b['side'] ?? 'right') === 'left' ? ' split-left' : '';
    return '<section class="section wrap split' . $side . '">
  <div class="split-media"><img src="' . e($b['image']) . '" alt="' . e($b['alt']) . '" loading="lazy" width="800" height="600"></div>
  <div class="split-text">
    <h2>' . e($b['title']) . '</h2>
    ' . paragraphs_html($b['paragraphs']) . '
  </div>
</section>
';
}

function block_gallery(array $b): string
{
    $items = '';
    foreach ($b['items'] as $it) {
        $items .= '<figure class="gallery-item">
      <a href="' . e($it['src']) . '" data-lightbox data-alt="' . e($it['alt']) . '" data-caption="' . e($it['caption']) . '">
        <img src="' . e($it['src']) . '" alt="' . e($it['alt']) . '" loading="lazy" width="800" height="600">
      </a>
      <figcaption>' . e($it['caption']) . '</figcaption>
    </figure>';
    }
    $title = !empty($b['title']) ? '<h2>' . e($b['title']) . '</h2>' : '';
    return '<section class="section wrap">
  ' . $title . '
  <div class="gallery">' . $items . '</div>
</section>
';
}

function block_faq(array $b): string
{
    $items = '';
    foreach ($b['items'] as $i => $it) {
        $open = $i === 0 ? ' open' : '';
        $items .= '<details class="faq-item"' . $open . '><summary>' . e($it['q']) . '</summary><p>' . e($it['a']) . '</p></details>';
    }
    $title = !empty($b['title']) ? '<h2>' . e($b['title']) . '</h2>' : '';
    return '<section class="section wrap narrow">
  ' . $title . '
  <div class="faq">' . $items . '</div>
</section>
';
}

function block_cta(array $b): string
{
    return '<section class="cta-band">
  <div class="wrap cta-inner">
    <div>
      <h2>' . e($b['title']) . '</h2>
      <p>' . e($b['text']) . '</p>
    </div>
    <a class="btn btn-light" href="' . e($b['button']['to']) . '">' . e($b['button']['label']) . '</a>
  </div>
</section>
';
}

function block_team(array $b): string
{
    $members = '';
    foreach ($b['members'] as $m) {
        $members .= '<li class="card member">
      <span class="avatar" aria-hidden="true">' . e($m['initial']) . '</span>
      <h3>' . e($m['name']) . '</h3>
      <p class="role">' . e($m['role']) . '</p>
      <p>' . e($m['bio']) . '</p>
    </li>';
    }
    $title = !empty($b['title']) ? '<h2>' . e($b['title']) . '</h2>' : '';
    $intro = !empty($b['intro']) ? '<p class="intro">' . e($b['intro']) . '</p>' : '';
    return '<section class="section wrap">
  ' . $title . $intro . '
  <ul class="cards cols-3">' . $members . '</ul>
</section>
';
}

function block_figures(array $b): string
{
    $items = '';
    foreach ($b['items'] as $it) {
        $items .= '<li><span class="figure-value">' . e($it['value']) . '</span><span class="figure-label">' . e($it['label']) . '</span></li>';
    }
    return '<section class="figures">
  <ul class="wrap figures-list">' . $items . '</ul>
</section>
';
}

function block_prose(array $b): string
{
    $title = !empty($b['title']) ? '<h1>' . e($b['title']) . '</h1>' : '';
    $sections = '';
    foreach ($b['sections'] as $s) {
        $sections .= '<h2>' . e($s['title']) . '</h2>' . paragraphs_html($s['paragraphs']);
    }
    return '<section class="section wrap narrow prose">
  ' . $title . '
  ' . $sections . '
</section>
';
}

function block_form(array $b, array $state): string
{
    $values = $state['values'] ?? [];
    $errors = $state['errors'] ?? [];
    $title = '<h2>' . e($b['title']) . '</h2>';

    if (!empty($state['sent'])) {
        return '<section class="section wrap narrow">
  ' . $title . '
  <div class="notice notice-success" role="status">' . e($b['success']) . '</div>
</section>
';
    }

    $general = '';
    if (!empty($errors['_form'])) {
        $general = '<div class="notice notice-error" role="alert">' . e($errors['_form']) . '</div>';
    }

    $fields = '';
    foreach ($b['fields'] as $f) {
        $name = $f['name'];
        $id = 'f-' . $name;
        $req = !empty($f['required']);
        $label = e($f['label']) . ($req ? ' <span class="req" aria-hidden="true">*</span>' : '');
        $val = isset($values[$name]) ? (string) $values[$name] : '';
        $hasErr = isset($errors[$name]);
        $attrs = ($req ? ' required aria-required="true"' : '')
            . ($hasErr ? ' aria-invalid="true" aria-describedby="err-' . e($name) . '"' : '');
        $cls = 'field' . ($hasErr ? ' has-error' : '');

        $control = '';
        if ($f['type'] === 'textarea') {
            $control = '<textarea id="' . e($id) . '" name="' . e($name) . '" rows="6"' . $attrs . '>' . e($val) . '</textarea>';
        } elseif ($f['type'] === 'select') {
            $opts = '<option value="">Choisir…</option>';
            foreach ($f['options'] as $o) {
                $sel = $val === $o ? ' selected' : '';
                $opts .= '<option value="' . e($o) . '"' . $sel . '>' . e($o) . '</option>';
            }
            $control = '<select id="' . e($id) . '" name="' . e($name) . '"' . $attrs . '>' . $opts . '</select>';
        } else {
            $control = '<input id="' . e($id) . '" type="' . e($f['type']) . '" name="' . e($name) . '" value="' . e($val) . '" autocomplete="' . e(autocomplete_for($name)) . '"' . $attrs . '>';
        }

        $err = $hasErr ? '<p class="error" id="err-' . e($name) . '">' . e($errors[$name]) . '</p>' : '';
        $fields .= '<div class="' . $cls . '"><label for="' . e($id) . '">' . $label . '</label>' . $control . $err . '</div>';
    }

    $csrf = e($state['csrf'] ?? '');
    return '<section class="section wrap narrow">
  ' . $title . '
  <p class="intro">' . e($b['intro']) . '</p>
  ' . $general . '
  <form method="post" action="/contact" class="contact-form" novalidate>
    <input type="hidden" name="csrf" value="' . $csrf . '">
    <div class="hp" aria-hidden="true">
      <label>Ne pas remplir ce champ <input type="text" name="website" tabindex="-1" autocomplete="off"></label>
    </div>
    ' . $fields . '
    <button type="submit" class="btn btn-primary">' . e($b['submit']) . '</button>
  </form>
</section>
';
}

function autocomplete_for(string $name): string
{
    $map = ['name' => 'name', 'email' => 'email', 'phone' => 'tel'];
    return $map[$name] ?? 'off';
}
