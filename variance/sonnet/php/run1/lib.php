<?php
declare(strict_types=1);

const SITE_NAME = 'Cabinet Garnier & Associés';
const SITE_MAIL = 'contact@garnier-associes.fr';
const SITE_PHONE = '05 56 00 00 00';
const SITE_ADDR = '25 cours de l\'Intendance, 33000 Bordeaux';

function e(?string $s): string
{
    return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8');
}

function paras(string $t): string
{
    $out = '';
    foreach (preg_split('/\n\s*\n/', trim($t)) as $p) {
        $out .= '<p>' . e(trim($p)) . '</p>';
    }
    return $out;
}

function img(string $f, string $alt): string
{
    return '<img src="/assets/' . e($f) . '" alt="' . e($alt) . '" loading="lazy">';
}

function btn(array $b, string $cls = ''): string
{
    return '<a class="btn ' . e($cls) . '" href="' . e($b[1]) . '">' . e($b[0]) . '</a>';
}

function b_hero(string $title, string $sub, ?string $bg = null, array $btns = []): string
{
    $style = $bg ? ' style="background-image:url(/assets/' . e($bg) . ')"' : '';
    $h = '<section class="hero"' . $style . '><div class="hero-veil"></div><div class="wrap hero-in"><h1>' . e($title) . '</h1><p class="lead">' . e($sub) . '</p><div class="btns">';
    foreach ($btns as $i => $b) {
        $h .= btn($b, $i ? 'btn-ghost' : '');
    }
    return $h . '</div></div></section>';
}

function b_features(string $title, array $items, int $cols = 3): string
{
    $h = '<section class="band"><div class="wrap"><h2>' . e($title) . '</h2><div class="grid cols-' . $cols . '">';
    foreach ($items as [$icon, $t, $x]) {
        $h .= '<article class="card"><span class="icon" aria-hidden="true">' . e($icon) . '</span><h3>' . e($t) . '</h3><p>' . e($x) . '</p></article>';
    }
    return $h . '</div></div></section>';
}

function b_split(string $title, string $text, string $file, string $alt, string $side = 'right', ?string $id = null): string
{
    $idAttr = $id ? ' id="' . e($id) . '"' : '';
    return '<section class="band"' . $idAttr . '><div class="wrap split ' . ($side === 'left' ? 'img-left' : 'img-right') . '"><div class="split-text"><h2>' . e($title) . '</h2>' . paras($text) . '</div><figure>' . img($file, $alt) . '</figure></div></section>';
}

function b_gallery(string $title, array $items): string
{
    $h = '<section class="band"><div class="wrap"><h2>' . e($title) . '</h2><div class="grid cols-3 gallery">';
    foreach ($items as [$f, $cap]) {
        $h .= '<figure><a href="/assets/' . e($f) . '" class="zoom" data-caption="' . e($cap) . '">' . img($f, $cap) . '</a><figcaption>' . e($cap) . '</figcaption></figure>';
    }
    return $h . '</div></div></section>';
}

function b_faq(string $title, array $items): string
{
    $h = '<section class="band"><div class="wrap narrow"><h2>' . e($title) . '</h2>';
    foreach ($items as $i => [$q, $a]) {
        $h .= '<details' . ($i === 0 ? ' open' : '') . '><summary>' . e($q) . '</summary><p>' . e($a) . '</p></details>';
    }
    return $h . '</div></section>';
}

function b_cta(string $title, string $text, array $b): string
{
    return '<section class="cta"><div class="wrap"><h2>' . e($title) . '</h2><p>' . e($text) . '</p>' . btn($b, 'btn-light') . '</div></section>';
}

function b_team(string $title, array $items): string
{
    $h = '<section class="band"><div class="wrap"><h2>' . e($title) . '</h2><div class="grid cols-3">';
    foreach ($items as [$name, $role, $bio, $photo]) {
        $visual = $photo ? img($photo, $name) : '<span class="disc" aria-hidden="true">' . e(strtoupper(substr(preg_replace('/^(Me|M\.)\s+/u', '', $name), 0, 1))) . '</span>';
        $h .= '<article class="card person">' . $visual . '<h3>' . e($name) . '</h3><p class="role">' . e($role) . '</p><p>' . e($bio) . '</p></article>';
    }
    return $h . '</div></div></section>';
}

function b_stats(array $items): string
{
    $h = '<section class="stats"><div class="wrap"><ul>';
    foreach ($items as [$n, $l]) {
        $h .= '<li><strong>' . e($n) . '</strong><span>' . e($l) . '</span></li>';
    }
    return $h . '</ul></div></section>';
}

function b_table(string $title, array $head, array $rows): string
{
    $h = '<section class="band"><div class="wrap narrow"><h2>' . e($title) . '</h2><div class="tablewrap"><table><thead><tr>';
    foreach ($head as $c) {
        $h .= '<th scope="col">' . e($c) . '</th>';
    }
    $h .= '</tr></thead><tbody>';
    foreach ($rows as $r) {
        $h .= '<tr>';
        foreach ($r as $c) {
            $h .= '<td>' . e($c) . '</td>';
        }
        $h .= '</tr>';
    }
    return $h . '</tbody></table></div></div></section>';
}

function csrf_token(): string
{
    if (empty($_SESSION['csrf'])) {
        $_SESSION['csrf'] = bin2hex(random_bytes(16));
    }
    return $_SESSION['csrf'];
}

/** Champs : nom => [libellé, type, obligatoire] */
function contact_form(array $fields): string
{
    $labels = [
        'name' => ['Nom et prénom', 'text'],
        'email' => ['Adresse e-mail', 'email'],
        'phone' => ['Téléphone', 'tel'],
        'subject' => ['Domaine concerné', 'text'],
        'message' => ['Votre message', 'textarea'],
    ];
    $errors = [];
    $vals = [];
    foreach ($fields as $k => $_) {
        $vals[$k] = trim((string)($_POST[$k] ?? ''));
    }

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $tok = (string)($_POST['csrf'] ?? '');
        if (!hash_equals(csrf_token(), $tok)) {
            $errors['_'] = 'Session expirée, merci de renvoyer le formulaire.';
        } elseif (trim((string)($_POST['website'] ?? '')) !== '') {
            return '<div class="notice ok" role="status"><h3>Message envoyé</h3><p>Merci, nous vous répondons rapidement.</p></div>';
        } else {
            foreach ($fields as $k => $req) {
                if ($req && $vals[$k] === '') {
                    $errors[$k] = 'Ce champ est obligatoire.';
                }
            }
            if (isset($vals['email']) && $vals['email'] !== '' && !filter_var($vals['email'], FILTER_VALIDATE_EMAIL)) {
                $errors['email'] = 'Adresse e-mail invalide.';
            }
            if (!$errors) {
                save_message($vals);
                unset($_SESSION['csrf']);
                return '<div class="notice ok" role="status"><h3>Message envoyé</h3><p>Merci, nous vous répondons sous un jour ouvré.</p></div>';
            }
        }
    }

    $h = '<form method="post" action="/contact#formulaire" class="form" novalidate>';
    if (isset($errors['_'])) {
        $h .= '<p class="err" role="alert">' . e($errors['_']) . '</p>';
    }
    $h .= '<input type="hidden" name="csrf" value="' . e(csrf_token()) . '">';
    $h .= '<div class="hp" aria-hidden="true"><label>Ne pas remplir <input type="text" name="website" tabindex="-1" autocomplete="off"></label></div>';
    foreach ($fields as $k => $req) {
        [$lab, $type] = $labels[$k];
        $h .= '<div class="field' . (isset($errors[$k]) ? ' invalid' : '') . '"><label for="f-' . $k . '">' . e($lab) . ($req ? ' <abbr title="obligatoire">*</abbr>' : '') . '</label>';
        if ($type === 'textarea') {
            $h .= '<textarea id="f-' . $k . '" name="' . $k . '" rows="6">' . e($vals[$k]) . '</textarea>';
        } else {
            $h .= '<input id="f-' . $k . '" type="' . $type . '" name="' . $k . '" value="' . e($vals[$k]) . '">';
        }
        if (isset($errors[$k])) {
            $h .= '<span class="err" role="alert">' . e($errors[$k]) . '</span>';
        }
        $h .= '</div>';
    }
    return $h . '<button class="btn" type="submit">Envoyer</button></form>';
}

function save_message(array $vals): void
{
    $dir = __DIR__ . '/data';
    if (!is_dir($dir)) {
        mkdir($dir, 0775, true);
    }
    $rec = ['date' => date('c')] + $vals;
    file_put_contents($dir . '/messages.jsonl', json_encode($rec, JSON_UNESCAPED_UNICODE) . "\n", FILE_APPEND | LOCK_EX);
    $from = $vals['email'] ?? '';
    $headers = "Content-Type: text/plain; charset=UTF-8\r\n";
    if ($from !== '') {
        $headers .= 'Reply-To: ' . str_replace(["\r", "\n"], '', $from) . "\r\n";
    }
    $body = '';
    foreach ($vals as $k => $v) {
        $body .= "$k : $v\n";
    }
    @mail(SITE_MAIL, '=?UTF-8?B?' . base64_encode('Nouveau message du site') . '?=', $body, $headers);
}

function layout(string $title, string $desc, string $route, string $content, int $status = 200): void
{
    http_response_code($status);
    $nav = ['/' => 'Accueil', '/domaines' => 'Domaines', '/cabinet' => 'Le cabinet', '/honoraires' => 'Honoraires', '/contact' => 'Contact'];
    ?><!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title><?= e($title) ?></title>
<meta name="description" content="<?= e($desc) ?>">
<link rel="stylesheet" href="/assets/style.css">
</head>
<body>
<a class="skip" href="#main">Aller au contenu</a>
<header class="site-head">
<div class="wrap head-in">
<a class="brand" href="/"><?= e(SITE_NAME) ?></a>
<button class="menu-btn" type="button" aria-expanded="false" aria-controls="nav">Menu</button>
<nav id="nav" aria-label="Navigation principale"><ul>
<?php foreach ($nav as $href => $label): ?>
<li><a href="<?= e($href) ?>"<?= $href === $route ? ' aria-current="page"' : '' ?>><?= e($label) ?></a></li>
<?php endforeach; ?>
</ul></nav>
</div>
</header>
<main id="main">
<?= $content ?>
</main>
<footer class="site-foot">
<div class="wrap foot-in">
<div><strong><?= e(SITE_NAME) ?></strong><p>Avocats au Barreau de Bordeaux depuis 2011.</p><p class="small">&copy; <?= date('Y') ?> Tous droits réservés.</p></div>
<div><strong>Liens</strong><ul><li><a href="/mentions-legales">Mentions légales</a></li><li><a href="/honoraires">Honoraires</a></li><li><a href="/contact">Prendre rendez-vous</a></li></ul></div>
<div><strong>Coordonnées</strong><address><?= e(SITE_ADDR) ?><br><a href="tel:+33556000000"><?= e(SITE_PHONE) ?></a><br><a href="mailto:<?= e(SITE_MAIL) ?>"><?= e(SITE_MAIL) ?></a></address></div>
</div>
</footer>
<div class="lightbox" hidden><button type="button" class="lb-close" aria-label="Fermer">&times;</button><img alt=""><p></p></div>
<script src="/assets/app.js"></script>
</body>
</html>
<?php
}
