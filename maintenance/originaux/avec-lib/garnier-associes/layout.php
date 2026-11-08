<?php
declare(strict_types=1);
/** Mise en page commune. Variables attendues : $site, $route, $pageFile, $current. */
$phoneHref = 'tel:' . preg_replace('/\s+/', '', $site['contact']['phone']);
?>
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title><?= e($route['title']) ?></title>
  <meta name="description" content="<?= e($route['description']) ?>">
  <link rel="stylesheet" href="<?= e(asset('site.css')) ?>">
  <link rel="stylesheet" href="<?= e(asset('garnier.css')) ?>">
</head>
<body>
<header class="site-header">
  <div class="container">
    <a class="brand" href="/"><?= e($site['name']) ?></a>
    <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="site-nav">Menu</button>
    <nav class="site-nav" id="site-nav" aria-label="Navigation principale">
      <ul>
        <?php foreach ($site['nav'] as $item): ?>
        <li><a href="<?= e(url($item['to'])) ?>"<?= $item['to'] === $current ? ' aria-current="page"' : '' ?>><?= e($item['label']) ?></a></li>
        <?php endforeach; ?>
      </ul>
    </nav>
  </div>
</header>
<main>
<?php require $pageFile; ?>
</main>
<footer class="site-footer">
  <div class="container">
    <div>
      <strong><?= e($site['name']) ?></strong><br>
      <span>Avocats au Barreau de Bordeaux, cabinet fondé en 2011.</span>
    </div>
    <ul>
      <?php foreach ($site['footer_links'] as $l): ?>
      <li><?= render_link($l) ?></li>
      <?php endforeach; ?>
    </ul>
    <address>
      <?= nl2br(e($site['contact']['address'])) ?><br>
      <a href="<?= e($phoneHref) ?>"><?= e($site['contact']['phone']) ?></a> ·
      <a href="mailto:<?= e($site['contact']['email']) ?>"><?= e($site['contact']['email']) ?></a>
    </address>
  </div>
</footer>
<script src="<?= e(asset('site.js')) ?>"></script>
</body>
</html>
