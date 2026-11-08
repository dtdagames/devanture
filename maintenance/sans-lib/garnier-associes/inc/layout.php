<?php
declare(strict_types=1);

function render_layout(string $path, string $title, string $description, string $content): string
{
    ob_start(); ?>
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title><?= e($title) ?></title>
<meta name="description" content="<?= e($description) ?>">
<link rel="stylesheet" href="/assets/style.css">
<script src="/assets/app.js" defer></script>
</head>
<body>
<a class="skip" href="#main">Aller au contenu</a>
<header class="site-header">
  <div class="container header__inner">
    <a class="brand" href="/"><?= e(SITE['name']) ?><span class="brand__tag"><?= e(SITE['tagline']) ?></span></a>
    <button class="menu-toggle" type="button" aria-expanded="false" aria-controls="main-nav">Menu</button>
    <nav id="main-nav" class="nav" aria-label="Navigation principale">
      <ul>
<?php foreach (NAV as $href => $label): ?>
        <li><a href="<?= e($href) ?>"<?= $href === $path ? ' aria-current="page"' : '' ?>><?= e($label) ?></a></li>
<?php endforeach; ?>
      </ul>
    </nav>
  </div>
</header>
<main id="main">
<?= $content ?>
</main>
<footer class="site-footer">
  <div class="container footer__grid">
    <div>
      <p class="footer__name"><?= e(SITE['name']) ?></p>
      <p>Cabinet d'avocats inscrit au barreau de Bordeaux. Les informations de ce site ont une portée générale et ne constituent pas une consultation juridique.</p>
    </div>
    <div>
      <p class="footer__title">Liens</p>
      <ul>
<?php foreach (NAV as $href => $label): ?>
        <li><a href="<?= e($href) ?>"><?= e($label) ?></a></li>
<?php endforeach; ?>
        <li><a href="/mentions-legales">Mentions légales</a></li>
      </ul>
    </div>
    <div>
      <p class="footer__title">Coordonnées</p>
      <address>
        <?= e(SITE['address']) ?><br>
        Tél. <a href="tel:<?= e(SITE['phone_tel']) ?>"><?= e(SITE['phone']) ?></a><br>
        <a href="mailto:<?= e(SITE['email']) ?>"><?= e(SITE['email']) ?></a>
      </address>
    </div>
  </div>
  <p class="container footer__legal">&copy; <?= e(date('Y')) ?> <?= e(SITE['name']) ?> &middot; Tous droits réservés</p>
</footer>
</body>
</html>
<?php
    return (string)ob_get_clean();
}
