<?php
declare(strict_types=1);

require_once __DIR__ . '/blocks.php';
require_once __DIR__ . '/contact.php';

/** Échappe une valeur pour le HTML (texte et attributs). */
function e(string $valeur): string
{
    return htmlspecialchars($valeur, ENT_QUOTES, 'UTF-8');
}

/** Configuration du site (inc/config.php), chargée une seule fois. */
function site_config(): array
{
    static $config = null;
    if ($config === null) {
        $config = require __DIR__ . '/config.php';
    }

    return $config;
}

/**
 * Affiche une page complète dans la mise en page commune.
 * La page (pages/<id>.php) renvoie ['title', 'description', 'body' => callable].
 */
function render_page(string $pageId, string $cheminCourant): void
{
    $site = site_config();
    $page = require dirname(__DIR__) . '/pages/' . $pageId . '.php';
    $body = $page['body'];
    $annee = date('Y');
    ?>
<!doctype html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title><?= e($page['title']) ?></title>
    <meta name="description" content="<?= e($page['description']) ?>">
    <link rel="stylesheet" href="/assets/css/style.css">
    <script src="/assets/js/app.js" defer></script>
</head>
<body>
<a class="skip-link" href="#contenu">Aller au contenu</a>

<header class="site-header">
    <div class="container bar">
        <a class="brand" href="/"><?= e($site['name']) ?></a>
        <button class="menu-toggle" type="button" aria-expanded="false" aria-controls="site-nav">Menu</button>
        <nav id="site-nav" class="site-nav" aria-label="Navigation principale">
            <ul>
            <?php foreach ($site['nav'] as $lien): ?>
                <li><a href="<?= e($lien['to']) ?>"<?= $lien['to'] === $cheminCourant ? ' aria-current="page"' : '' ?>><?= e($lien['label']) ?></a></li>
            <?php endforeach; ?>
            </ul>
        </nav>
    </div>
</header>

<main id="contenu">
<?php $body(); ?>
</main>

<footer class="site-footer">
    <div class="container footer-grid">
        <div>
            <p class="footer-name"><?= e($site['name']) ?></p>
            <p><?= e($site['tagline']) ?></p>
            <p class="small">Mentions légales : voir la page dédiée du site.</p>
        </div>
        <div>
            <p class="footer-name">Navigation</p>
            <ul class="footer-links">
            <?php foreach (array_merge($site['nav'], $site['legal']) as $lien): ?>
                <li><a href="<?= e($lien['to']) ?>"><?= e($lien['label']) ?></a></li>
            <?php endforeach; ?>
            </ul>
        </div>
        <address>
            <p class="footer-name">Coordonnées</p>
            <p><?= e($site['address']) ?></p>
            <p>Téléphone : <a href="<?= e($site['phone_link']) ?>"><?= e($site['phone']) ?></a></p>
            <p>E-mail : <a href="mailto:<?= e($site['email']) ?>"><?= e($site['email']) ?></a></p>
            <p class="small"><?= e($site['hours']) ?></p>
        </address>
    </div>
    <div class="container small">&copy; <?= e($annee) ?> <?= e($site['name']) ?>. Tous droits réservés.</div>
</footer>
</body>
</html>
<?php
}
