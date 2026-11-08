<?php
/** @var array<string, mixed> $page */
/** @var string $body */
/** @var string $path */
/** @var array<string, array<string, mixed>> $routes */
?><!doctype html>
<html lang="fr-FR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title><?= e((string) $page['title']) ?></title>
  <meta name="description" content="<?= e((string) $page['description']) ?>">
  <link rel="stylesheet" href="/assets/css/site.css">
  <script src="/assets/js/site.js" defer></script>
</head>
<body>
  <a class="skip-link" href="#contenu">Aller au contenu</a>

  <header class="site-header">
    <div class="container header-inner">
      <a class="brand" href="/">
        <span class="brand-name">Garnier &amp; Associés</span>
        <span class="brand-sub">Avocats à Bordeaux</span>
      </a>
      <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="site-nav">Menu</button>
      <nav id="site-nav" class="site-nav" aria-label="Navigation principale">
        <ul>
          <?php foreach ($routes as $route => $r): ?>
            <?php if (empty($r['nav'])) { continue; } ?>
            <li><a href="<?= e((string) $route) ?>"<?= $route === $path ? ' aria-current="page"' : '' ?>><?= e((string) $r['nav']) ?></a></li>
          <?php endforeach; ?>
        </ul>
      </nav>
    </div>
  </header>

  <main id="contenu" tabindex="-1">
    <?= $body ?>
  </main>

  <footer class="site-footer">
    <div class="container footer-grid">
      <div>
        <p class="footer-name">Garnier &amp; Associés</p>
        <p>Cabinet d'avocats inscrit au barreau de Bordeaux, fondé en 2011.</p>
        <p><a href="/mentions-legales">Mentions légales</a></p>
      </div>
      <div>
        <p class="footer-name">Coordonnées</p>
        <address>
          <?= e(SITE['address']) ?><br>
          Tél. <a href="tel:<?= e(SITE['phone_link']) ?>"><?= e(SITE['phone']) ?></a><br>
          <a href="mailto:<?= e(SITE['email']) ?>"><?= e(SITE['email']) ?></a>
        </address>
      </div>
    </div>
    <p class="footer-legal container">&copy; 2011 &ndash; <?= date('Y') ?> Garnier &amp; Associés. Tous droits réservés.</p>
  </footer>

  <dialog id="lightbox" class="lightbox" aria-label="Agrandissement de l'image">
    <figure>
      <img src="data:," alt="">
      <figcaption></figcaption>
    </figure>
    <button class="lightbox-close" type="button">Fermer</button>
  </dialog>
</body>
</html>
