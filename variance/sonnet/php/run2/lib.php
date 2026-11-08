<?php
declare(strict_types=1);

const SITE = [
    'name' => 'Garnier & Associés',
    'full' => 'Cabinet Garnier & Associés, avocats',
    'address' => "25 cours de l'Intendance, 33000 Bordeaux",
    'phone' => '05 56 00 00 00',
    'email' => 'contact@garnier-associes.fr',
];

function e($v): string { return htmlspecialchars((string)$v, ENT_QUOTES, 'UTF-8'); }
function tel(string $p): string { return 'tel:+33' . substr(preg_replace('/\D/', '', $p), 1); }

function nav(): array {
    return [
        '/' => 'Accueil',
        '/domaines-d-intervention' => 'Domaines',
        '/le-cabinet' => 'Le cabinet',
        '/honoraires' => 'Honoraires',
        '/contact' => 'Contact',
        '/mentions-legales' => 'Mentions légales',
    ];
}

function btn(array $b, string $cls = ''): string {
    return '<a class="btn ' . e($cls) . '" href="' . e($b[1]) . '">' . e($b[0]) . '</a>';
}

function b_hero(string $title, string $sub, ?string $img, array $buttons): string {
    $style = $img ? ' style="background-image:url(\'' . e($img) . '\')"' : '';
    $h = '<section class="hero' . ($img ? ' has-img' : '') . '"' . $style . '><div class="hero-in wrap"><h1>' . e($title) . '</h1><p class="lead">' . e($sub) . '</p><div class="btns">';
    foreach ($buttons as $i => $b) $h .= btn($b, $i ? 'btn-alt' : '');
    return $h . '</div></div></section>';
}

function b_features(string $title, array $items, int $cols = 3): string {
    $h = '<section class="wrap block"><h2>' . e($title) . '</h2><div class="grid cols-' . $cols . '">';
    foreach ($items as [$ic, $t, $x]) {
        $h .= '<article class="card"><span class="ico" aria-hidden="true">' . e($ic) . '</span><h3>' . e($t) . '</h3><p>' . e($x) . '</p></article>';
    }
    return $h . '</div></section>';
}

function b_textimg(string $title, array $paras, string $img, string $alt, string $side = 'right', ?array $button = null): string {
    $h = '<section class="wrap block textimg ' . e($side) . '"><div class="txt"><h2>' . e($title) . '</h2>';
    foreach ($paras as $p) $h .= '<p>' . e($p) . '</p>';
    if ($button) $h .= btn($button);
    return $h . '</div><figure><img src="' . e($img) . '" alt="' . e($alt) . '" loading="lazy"></figure></section>';
}

function b_gallery(string $title, array $imgs): string {
    $h = '<section class="wrap block"><h2>' . e($title) . '</h2><div class="gallery">';
    foreach ($imgs as [$src, $cap]) {
        $h .= '<figure><a href="' . e($src) . '" class="lb" data-cap="' . e($cap) . '"><img src="' . e($src) . '" alt="' . e($cap) . '" loading="lazy"></a><figcaption>' . e($cap) . '</figcaption></figure>';
    }
    return $h . '</div></section>';
}

function b_faq(string $title, array $qa): string {
    $h = '<section class="wrap block narrow"><h2>' . e($title) . '</h2>';
    foreach ($qa as $i => [$q, $a]) {
        $h .= '<details' . ($i === 0 ? ' open' : '') . '><summary>' . e($q) . '</summary><p>' . e($a) . '</p></details>';
    }
    return $h . '</section>';
}

function b_cta(string $title, string $text, array $button): string {
    return '<section class="cta"><div class="wrap"><h2>' . e($title) . '</h2><p>' . e($text) . '</p>' . btn($button, 'btn-alt') . '</div></section>';
}

function b_team(string $title, array $people): string {
    $h = '<section class="wrap block"><h2>' . e($title) . '</h2><div class="grid cols-3">';
    foreach ($people as [$n, $r, $bio, $init]) {
        $h .= '<article class="card person"><span class="avatar" aria-hidden="true">' . e($init) . '</span><h3>' . e($n) . '</h3><p class="role">' . e($r) . '</p><p>' . e($bio) . '</p></article>';
    }
    return $h . '</div></section>';
}

function b_stats(array $stats): string {
    $h = '<section class="stats"><div class="wrap grid cols-4">';
    foreach ($stats as [$v, $l]) $h .= '<div class="stat"><strong>' . e($v) . '</strong><span>' . e($l) . '</span></div>';
    return $h . '</div></section>';
}

function b_prose(string $title, array $paras): string {
    $h = '<section class="wrap block narrow prose"><h2>' . e($title) . '</h2>';
    foreach ($paras as $p) $h .= '<p>' . e($p) . '</p>';
    return $h . '</section>';
}

function b_contact_form(array $f): string {
    $h = '<section class="wrap block narrow"><h2>Écrivez-nous</h2>';
    if ($f['done']) {
        return $h . '<p class="ok" role="status">Merci, votre message a bien été envoyé. Nous vous répondons sous un jour ouvré.</p></section>';
    }
    if ($f['errors']) $h .= '<p class="err-sum" role="alert">' . e($f['errors']['_'] ?? 'Le formulaire contient des erreurs.') . '</p>';
    $h .= '<form method="post" action="/contact" novalidate class="form"><input type="hidden" name="csrf" value="' . e($f['csrf']) . '">';
    $h .= '<div class="hp" aria-hidden="true"><label>Ne pas remplir <input type="text" name="website" tabindex="-1" autocomplete="off"></label></div>';
    foreach ($f['fields'] as $name => [$label, $type, $req]) {
        $val = $f['values'][$name] ?? '';
        $err = $f['errors'][$name] ?? '';
        $h .= '<div class="field' . ($err ? ' invalid' : '') . '"><label for="f-' . e($name) . '">' . e($label) . ($req ? ' <span class="req">*</span>' : '') . '</label>';
        if ($type === 'textarea') {
            $h .= '<textarea id="f-' . e($name) . '" name="' . e($name) . '" rows="6"' . ($req ? ' required' : '') . '>' . e($val) . '</textarea>';
        } else {
            $h .= '<input id="f-' . e($name) . '" type="' . e($type) . '" name="' . e($name) . '" value="' . e($val) . '"' . ($req ? ' required' : '') . '>';
        }
        if ($err) $h .= '<p class="err">' . e($err) . '</p>';
        $h .= '</div>';
    }
    return $h . '<button class="btn" type="submit">Envoyer</button></form></section>';
}

function handle_contact(array $fields, string $to): array {
    $st = ['done' => false, 'errors' => [], 'values' => [], 'fields' => $fields, 'csrf' => ''];
    if (empty($_SESSION['csrf'])) $_SESSION['csrf'] = bin2hex(random_bytes(16));
    $st['csrf'] = $_SESSION['csrf'];
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') return $st;

    $tok = (string)($_POST['csrf'] ?? '');
    if (!hash_equals($_SESSION['csrf'], $tok)) {
        $st['errors']['_'] = 'Session expirée, veuillez réessayer.';
        return $st;
    }
    if (trim((string)($_POST['website'] ?? '')) !== '') {
        $st['done'] = true; // pot de miel : succès simulé, rien d'enregistré
        return $st;
    }
    $data = [];
    foreach ($fields as $name => [$label, $type, $req]) {
        $v = trim((string)($_POST[$name] ?? ''));
        $v = str_replace(["\r\n", "\r"], "\n", $v);
        if ($type !== 'textarea') $v = str_replace("\n", ' ', $v);
        $data[$name] = $v;
        if ($req && $v === '') $st['errors'][$name] = 'Ce champ est obligatoire.';
        elseif ($type === 'email' && $v !== '' && !filter_var($v, FILTER_VALIDATE_EMAIL)) $st['errors'][$name] = 'Adresse e-mail invalide.';
    }
    $st['values'] = $data;
    if ($st['errors']) return $st;

    $dir = __DIR__ . '/data';
    if (!is_dir($dir)) @mkdir($dir, 0775, true);
    $line = json_encode(['date' => date('c')] + $data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    @file_put_contents($dir . '/messages.jsonl', $line . "\n", FILE_APPEND | LOCK_EX);

    $body = '';
    foreach ($fields as $name => [$label]) $body .= $label . ' : ' . $data[$name] . "\n";
    $reply = preg_replace('/[\r\n]+/', '', $data['email'] ?? '');
    $headers = 'Content-Type: text/plain; charset=UTF-8';
    if ($reply !== '') $headers .= "\r\nReply-To: " . $reply;
    $subject = '=?UTF-8?B?' . base64_encode('Message du site : ' . ($data['subject'] ?: $data['name'])) . '?=';
    @mail($to, $subject, $body, $headers);

    $_SESSION['csrf'] = bin2hex(random_bytes(16));
    $st['done'] = true;
    return $st;
}

function layout(string $title, string $desc, string $path, string $body, int $status = 200): void {
    http_response_code($status);
    header('Content-Type: text/html; charset=UTF-8');
    ?><!doctype html>
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
<header class="site-header">
  <div class="wrap bar">
    <a class="brand" href="/"><?= e(SITE['name']) ?></a>
    <button class="menu-btn" type="button" aria-expanded="false" aria-controls="nav">Menu</button>
    <nav id="nav" aria-label="Navigation principale"><ul>
<?php foreach (nav() as $href => $label): ?>
      <li><a href="<?= e($href) ?>"<?= $href === $path ? ' aria-current="page"' : '' ?>><?= e($label) ?></a></li>
<?php endforeach; ?>
    </ul></nav>
  </div>
</header>
<main id="main">
<?= $body ?>
</main>
<footer class="site-footer">
  <div class="wrap grid cols-3">
    <div><strong><?= e(SITE['full']) ?></strong><p class="small">Avocats inscrits au Barreau de Bordeaux. Les informations de ce site ne constituent pas une consultation juridique.</p></div>
    <div><strong>Liens</strong><ul>
<?php foreach (nav() as $href => $label): ?>
      <li><a href="<?= e($href) ?>"><?= e($label) ?></a></li>
<?php endforeach; ?>
    </ul></div>
    <div><strong>Coordonnées</strong>
      <address><?= e(SITE['address']) ?><br>
      <a href="<?= e(tel(SITE['phone'])) ?>"><?= e(SITE['phone']) ?></a><br>
      <a href="mailto:<?= e(SITE['email']) ?>"><?= e(SITE['email']) ?></a></address></div>
  </div>
  <p class="wrap copy">© <?= date('Y') ?> <?= e(SITE['name']) ?></p>
</footer>
<script src="/assets/app.js" defer></script>
</body>
</html>
<?php
}
