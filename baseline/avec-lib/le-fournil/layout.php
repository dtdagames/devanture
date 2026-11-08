<?php
/**
 * Mise en page commune. Variables attendues :
 *   $site (array), $routes (array), $currentPath (?string), $meta (title, description), $content (HTML).
 */
$navItems = array_filter($routes, fn($r) => $r['nav'] ?? true);
$c = $site['contact'];
$telHref = 'tel:+33' . substr(preg_replace('/\D+/', '', $c['phone']), 1);
?>
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title><?= e($meta['title']) ?></title>
  <meta name="description" content="<?= e($meta['description']) ?>">
  <link rel="stylesheet" href="<?= e(asset('site.css')) ?>">
</head>
<body>
  <header class="site-header">
    <div class="container">
      <a class="brand" href="<?= e(url('/')) ?>"><?= e($site['short']) ?></a>
      <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="site-nav">Menu</button>
      <nav class="site-nav" id="site-nav" aria-label="Navigation principale">
        <ul>
          <?php foreach ($navItems as $to => $r): ?>
          <li><a href="<?= e(url($to)) ?>"<?= $to === $currentPath ? ' aria-current="page"' : '' ?>><?= e($r['label']) ?></a></li>
          <?php endforeach; ?>
        </ul>
      </nav>
    </div>
  </header>

  <main id="contenu">
    <?= $content ?>
  </main>

  <footer class="site-footer">
    <div class="container">
      <div>
        <strong><?= e($site['name']) ?></strong><br>
        <?= e($site['hours']) ?><br>
        <small><?= e($site['legal']) ?></small>
      </div>
      <ul>
        <?php foreach ($routes as $to => $r): ?>
        <li><a href="<?= e(url($to)) ?>"><?= e($r['label']) ?></a></li>
        <?php endforeach; ?>
      </ul>
      <address style="font-style:normal">
        <?= nl2br(e($c['address'])) ?><br>
        <a href="<?= e($telHref) ?>"><?= e($c['phone']) ?></a><br>
        <a href="mailto:<?= e($c['email']) ?>"><?= e($c['email']) ?></a>
      </address>
    </div>
  </footer>

  <script src="<?= e(asset('site.js')) ?>" defer></script>
</body>
</html>
