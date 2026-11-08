<?php
declare(strict_types=1);

/**
 * Mise en page commune : <head>, en-tête collant, navigation, pied de page.
 *
 * $page : [ 'title' => string, 'description' => string, 'blocks' => array ]
 * $path : route courante (pour aria-current)
 */
function render_layout(array $page, array $site, string $path): string
{
    $title = $page['title'] ?? $site['name'];
    $desc  = $page['description'] ?? $site['tagline'];
    $c     = $site['contact'];

    ob_start();
    ?>
<!DOCTYPE html>
<html lang="<?= e(substr($site['locale'], 0, 2)) ?>">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title><?= e($title) ?></title>
<meta name="description" content="<?= e($desc) ?>">
<link rel="stylesheet" href="/assets/css/style.css">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Ccircle cx='8' cy='8' r='8' fill='%236b2d5c'/%3E%3C/svg%3E">
</head>
<body>
<a class="skip-link" href="#contenu">Aller au contenu</a>
<header class="site-header">
  <div class="container site-header-inner">
    <a class="brand" href="/" aria-label="<?= e($site['name']) ?> – accueil">
      <span class="brand-mark" aria-hidden="true"><?= icon('wheat') ?></span>
      <span class="brand-name"><?= e($site['name']) ?></span>
    </a>
    <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="nav-principale">
      <span class="nav-toggle-bar" aria-hidden="true"></span>
      Menu
    </button>
    <nav class="site-nav" id="nav-principale" aria-label="Navigation principale">
      <ul>
<?php foreach ($site['nav'] as $item): ?>
        <li><a href="<?= e(href($item['to'])) ?>"<?= $item['to'] === $path ? ' aria-current="page"' : '' ?>><?= e($item['label']) ?></a></li>
<?php endforeach; ?>
      </ul>
    </nav>
  </div>
</header>

<main id="contenu">
<?= render_blocks($page['blocks'] ?? [], $site) ?>
</main>

<footer class="site-footer">
  <div class="container footer-grid">
    <div class="footer-col">
      <p class="footer-brand"><?= e($site['name']) ?></p>
      <p class="footer-tagline"><?= e($site['tagline']) ?></p>
      <p class="footer-legal"><?= e($site['footer']['text']) ?></p>
    </div>
    <div class="footer-col">
      <h2 class="footer-title">Nous trouver</h2>
      <address>
        <p><?= e($c['address']) ?></p>
        <p><a href="tel:<?= e($c['phone_tel']) ?>"><?= e($c['phone']) ?></a></p>
        <p><a href="mailto:<?= e($c['email']) ?>"><?= e($c['email']) ?></a></p>
        <p><?= e($c['hours']) ?></p>
      </address>
    </div>
    <div class="footer-col">
      <h2 class="footer-title">Liens</h2>
      <ul class="footer-links">
<?php foreach ($site['footer']['links'] as $l): ?>
        <li><a href="<?= e(href($l['to'])) ?>"><?= e($l['label']) ?></a></li>
<?php endforeach; ?>
      </ul>
    </div>
  </div>
  <div class="container footer-bottom">
    <p>&copy; <?= date('Y') ?> <?= e($site['name']) ?>. Tous droits réservés.</p>
  </div>
</footer>

<div class="lightbox" id="lightbox" hidden role="dialog" aria-modal="true" aria-label="Image agrandie">
  <button class="lightbox-close" type="button" aria-label="Fermer">&times;</button>
  <figure>
    <img src="" alt="">
    <figcaption></figcaption>
  </figure>
</div>

<script src="/assets/js/main.js" defer></script>
</body>
</html>
<?php
    return (string) ob_get_clean();
}
