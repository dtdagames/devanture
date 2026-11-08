<?php
declare(strict_types=1);

/**
 * Affiche une page complète dans la mise en page du site.
 * $page = ['route' => '/', 'title' => '...', 'description' => '...', 'blocks' => [...]]
 */
function render_page(array $page, int $status = 200): void
{
    http_response_code($status);
    header('Content-Type: text/html; charset=UTF-8');

    $current = $page['route'] ?? '';
    $title = $page['title'];
    $full_title = $title === SITE['name'] ? $title : $title . ' | ' . SITE['name'];
    $description = $page['description'] ?? SITE['tagline'];
    ?>
<!doctype html>
<html lang="<?= e(SITE['lang']) ?>">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title><?= e($full_title) ?></title>
    <meta name="description" content="<?= e($description) ?>">
    <link rel="stylesheet" href="/assets/css/style.css">
    <script src="/assets/js/main.js" defer></script>
</head>
<body>
<a class="skip-link" href="#contenu">Aller au contenu</a>
<header class="site-header">
    <div class="container header__inner">
        <a class="brand" href="/"><?= e(SITE['name']) ?></a>
        <button class="menu-toggle" type="button" aria-expanded="false" aria-controls="site-nav">Menu</button>
        <nav id="site-nav" class="site-nav" aria-label="Navigation principale">
            <ul>
                <?php foreach (SITE['nav'] as $item): ?>
                    <li><a href="<?= e($item['route']) ?>"<?= $item['route'] === $current ? ' aria-current="page"' : '' ?>><?= e($item['label']) ?></a></li>
                <?php endforeach; ?>
            </ul>
        </nav>
    </div>
</header>

<main id="contenu">
<?php foreach ($page['blocks'] as $block): ?>
    <?php render_block($block); ?>
<?php endforeach; ?>
</main>

<footer class="site-footer">
    <div class="container footer__grid">
        <div>
            <p class="footer__name"><?= e(SITE['name']) ?></p>
            <p class="footer__legal"><?= e(SITE['footer_legal']) ?></p>
        </div>
        <nav aria-label="Liens utiles">
            <ul class="footer__links">
                <?php foreach (SITE['nav'] as $item): ?>
                    <li><a href="<?= e($item['route']) ?>"><?= e($item['label']) ?></a></li>
                <?php endforeach; ?>
                <li><a href="/mentions-legales">Mentions légales</a></li>
            </ul>
        </nav>
        <address class="footer__contact">
            <p><?= e(SITE['address']) ?></p>
            <p>Tél. <a href="<?= e(SITE['phone_href']) ?>"><?= e(SITE['phone']) ?></a></p>
            <p><a href="mailto:<?= e(SITE['email']) ?>"><?= e(SITE['email']) ?></a></p>
        </address>
    </div>
    <div class="container footer__bottom">
        <p>&copy; <?= e((string) date('Y')) ?> <?= e(SITE['name']) ?></p>
    </div>
</footer>

<div class="lightbox" hidden role="dialog" aria-modal="true" aria-label="Image agrandie">
    <button class="lightbox__close" type="button" aria-label="Fermer">&times;</button>
    <figure>
        <img src="" alt="">
        <figcaption></figcaption>
    </figure>
</div>
</body>
</html>
<?php
}
