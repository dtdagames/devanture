<?php
declare(strict_types=1);

/**
 * Mise en page commune : en-tete collant, menu mobile, contenu, pied de page.
 * @param array{title: string, description: string, body: string} $page
 */
function render_layout(array $site, string $path, array $page): string
{
    $nav = '';
    foreach ($site['nav'] as $item) {
        $current = $item['path'] === $path ? ' aria-current="page"' : '';
        $nav .= '<li><a href="' . e($item['path']) . '"' . $current . '>' . e($item['label']) . '</a></li>';
    }

    $links = '';
    foreach ($site['footer_links'] as $item) {
        $links .= '<li><a href="' . e($item['path']) . '">' . e($item['label']) . '</a></li>';
    }

    $title = e($page['title']);
    $description = e($page['description']);
    $name = e($site['name']);
    $legal = e($site['legal_name']);
    $address = e($site['address']);
    $phoneLabel = e($site['phone_label']);
    $phoneHref = e($site['phone_href']);
    $email = e($site['email']);
    $tagline = e($site['tagline']);
    $year = '2011-2026';
    $lang = 'fr';

    return <<<HTML
<!doctype html>
<html lang="{$lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{$title}</title>
<meta name="description" content="{$description}">
<link rel="stylesheet" href="/assets/css/site.css">
<script src="/assets/js/site.js" defer></script>
</head>
<body>
<a class="skip-link" href="#contenu">Aller au contenu</a>
<header class="site-header">
  <div class="container site-header__bar">
    <a class="brand" href="/">{$name}</a>
    <button class="menu-toggle" type="button" aria-expanded="false" aria-controls="site-nav">Menu</button>
    <nav id="site-nav" class="site-nav" aria-label="Navigation principale">
      <ul>{$nav}</ul>
    </nav>
  </div>
</header>
<main id="contenu">
{$page['body']}
</main>
<footer class="site-footer">
  <div class="container site-footer__grid">
    <div>
      <p class="site-footer__name">{$legal}</p>
      <p>{$tagline}</p>
      <p class="site-footer__legal">Avocats inscrits au Barreau de Bordeaux.</p>
    </div>
    <div>
      <p class="site-footer__title">Coordonnées</p>
      <p>{$address}</p>
      <p>Tel. <a href="{$phoneHref}">{$phoneLabel}</a></p>
      <p>E-mail : <a href="mailto:{$email}">{$email}</a></p>
    </div>
    <nav aria-label="Liens utiles">
      <p class="site-footer__title">Liens</p>
      <ul>{$links}</ul>
    </nav>
  </div>
  <div class="container site-footer__copy">&copy; {$year} {$legal}</div>
</footer>
</body>
</html>
HTML;
}
