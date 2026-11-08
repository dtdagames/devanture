<?php
declare(strict_types=1);

const SITE_NAME = 'Garnier & Associés';
const SITE_FULL = 'Cabinet Garnier & Associés, avocats à Bordeaux';
const SITE_EMAIL = 'contact@garnier-associes.fr';
const SITE_PHONE = '05 56 00 00 00';
const SITE_ADDRESS = '25 cours de l\'Intendance, 33000 Bordeaux';

$root = __DIR__;
$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
$path = is_string($path) ? rawurldecode($path) : '/';

// Fichiers statiques : laisser le serveur intégré les servir.
if (PHP_SAPI === 'cli-server' && $path !== '/' && $path !== '/index.php') {
    $file = realpath($root . $path);
    if ($file !== false && is_file($file) && str_starts_with($file, $root . DIRECTORY_SEPARATOR)
        && !str_ends_with($file, '.php') && !str_starts_with($file, $root . DIRECTORY_SEPARATOR . 'data')) {
        return false;
    }
}

if (session_status() === PHP_SESSION_NONE && PHP_SAPI !== 'cli') {
    session_start();
} elseif (!isset($_SESSION)) {
    $_SESSION = [];
}

function e(?string $s): string
{
    return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8');
}

function asset(string $f): string
{
    return '/assets/' . $f;
}

function initial(string $name): string
{
    $name = trim(preg_replace('/^(Me|Maître)\s+/u', '', $name) ?? $name);
    return strtoupper(substr($name, 0, 1));
}

// ---------------------------------------------------------------- Blocs

function b_hero(array $b): string
{
    $style = isset($b['image']) ? ' style="background-image:url(' . e(asset($b['image'])) . ')"' : '';
    $h = '<section class="hero"' . $style . '><div class="hero-veil"></div><div class="wrap hero-in">';
    $h .= '<h1>' . e($b['title']) . '</h1>';
    if (!empty($b['subtitle'])) {
        $h .= '<p class="lead">' . e($b['subtitle']) . '</p>';
    }
    $h .= '<p class="btns">';
    foreach ($b['buttons'] ?? [] as $i => $btn) {
        $h .= '<a class="btn' . ($i > 0 ? ' btn-alt' : '') . '" href="' . e($btn[1]) . '">' . e($btn[0]) . '</a> ';
    }
    return $h . '</p></div></section>';
}

function b_features(array $b): string
{
    $cols = (int)($b['cols'] ?? 3);
    $h = '<section class="section"><div class="wrap">';
    if (!empty($b['title'])) {
        $h .= '<h2>' . e($b['title']) . '</h2>';
    }
    $h .= '<div class="grid cols-' . $cols . '">';
    foreach ($b['items'] as $it) {
        $h .= '<article class="card"><div class="icon" aria-hidden="true">' . e($it[0]) . '</div><h3>' . e($it[1]) . '</h3><p>' . e($it[2]) . '</p></article>';
    }
    return $h . '</div></div></section>';
}

function b_richtext(array $b): string
{
    $side = ($b['side'] ?? 'right') === 'left' ? 'img-left' : 'img-right';
    $h = '<section class="section"><div class="wrap split ' . $side . '"><div class="split-text">';
    $h .= '<h2>' . e($b['title']) . '</h2>';
    foreach ($b['paragraphs'] as $p) {
        $h .= '<p>' . e($p) . '</p>';
    }
    if (!empty($b['button'])) {
        $h .= '<p><a class="btn" href="' . e($b['button'][1]) . '">' . e($b['button'][0]) . '</a></p>';
    }
    $h .= '</div><figure class="split-img"><img src="' . e(asset($b['image'])) . '" alt="' . e($b['alt']) . '" loading="lazy"></figure>';
    return $h . '</div></section>';
}

function b_gallery(array $b): string
{
    $h = '<section class="section alt"><div class="wrap"><h2>' . e($b['title']) . '</h2><div class="grid cols-3 gallery">';
    foreach ($b['items'] as $it) {
        $h .= '<figure><a href="' . e(asset($it[0])) . '" class="lb" data-caption="' . e($it[1]) . '"><img src="' . e(asset($it[0])) . '" alt="' . e($it[1]) . '" loading="lazy"></a><figcaption>' . e($it[1]) . '</figcaption></figure>';
    }
    return $h . '</div></div></section>';
}

function b_faq(array $b): string
{
    $h = '<section class="section"><div class="wrap narrow"><h2>' . e($b['title']) . '</h2>';
    foreach ($b['items'] as $i => $it) {
        $h .= '<details' . ($i === 0 ? ' open' : '') . '><summary>' . e($it[0]) . '</summary><p>' . e($it[1]) . '</p></details>';
    }
    return $h . '</div></section>';
}

function b_cta(array $b): string
{
    return '<section class="cta"><div class="wrap"><h2>' . e($b['title']) . '</h2><p>' . e($b['text']) . '</p><p><a class="btn" href="'
        . e($b['button'][1]) . '">' . e($b['button'][0]) . '</a></p></div></section>';
}

function b_team(array $b): string
{
    $h = '<section class="section"><div class="wrap"><h2>' . e($b['title']) . '</h2><div class="grid cols-3">';
    foreach ($b['items'] as $m) {
        $h .= '<article class="card member"><div class="disc" aria-hidden="true">' . e(initial($m[0])) . '</div><h3>' . e($m[0]) . '</h3><p class="role">' . e($m[1]) . '</p><p>' . e($m[2]) . '</p></article>';
    }
    return $h . '</div></div></section>';
}

function b_stats(array $b): string
{
    $h = '<section class="stats"><div class="wrap"><ul>';
    foreach ($b['items'] as $s) {
        $h .= '<li><strong>' . e($s[0]) . '</strong><span>' . e($s[1]) . '</span></li>';
    }
    return $h . '</ul></div></section>';
}

function b_text(array $b): string
{
    $h = '<section class="section"><div class="wrap narrow"><h2>' . e($b['title']) . '</h2>';
    foreach ($b['paragraphs'] as $p) {
        $h .= '<p>' . e($p) . '</p>';
    }
    return $h . '</div></section>';
}

function contact_config(): array
{
    return [
        'fields' => [
            'name' => ['Nom et prénom', 'text', true],
            'email' => ['Adresse e-mail', 'email', true],
            'phone' => ['Téléphone', 'tel', false],
            'subject' => ['Sujet', 'text', false],
            'message' => ['Votre message', 'textarea', true],
        ],
        'to' => SITE_EMAIL,
    ];
}

function handle_contact(): array
{
    $cfg = contact_config();
    $state = ['values' => [], 'errors' => [], 'success' => false];
    if (empty($_SESSION['csrf'])) {
        $_SESSION['csrf'] = bin2hex(random_bytes(16));
    }
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
        return $state;
    }
    $token = (string)($_POST['csrf'] ?? '');
    if (!hash_equals((string)$_SESSION['csrf'], $token)) {
        $state['errors']['_form'] = 'Session expirée, veuillez réessayer.';
        return $state;
    }
    foreach ($cfg['fields'] as $k => $_) {
        $v = $_POST[$k] ?? '';
        $state['values'][$k] = is_string($v) ? trim($v) : '';
    }
    if (trim((string)($_POST['website'] ?? '')) !== '') {
        $state['success'] = true; // pot de miel : succès simulé
        return $state;
    }
    foreach ($cfg['fields'] as $k => [$label, $type, $req]) {
        $v = $state['values'][$k];
        if ($req && $v === '') {
            $state['errors'][$k] = 'Ce champ est obligatoire.';
        } elseif ($k === 'email' && $v !== '' && filter_var($v, FILTER_VALIDATE_EMAIL) === false) {
            $state['errors'][$k] = 'Adresse e-mail invalide.';
        }
    }
    if ($state['errors']) {
        return $state;
    }
    $dir = __DIR__ . '/data';
    if (!is_dir($dir)) {
        @mkdir($dir, 0775, true);
    }
    $rec = ['date' => date('c')] + $state['values'];
    @file_put_contents($dir . '/messages.jsonl', json_encode($rec, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n", FILE_APPEND | LOCK_EX);
    $from = str_replace(["\r", "\n"], '', $state['values']['email']);
    $subject = str_replace(["\r", "\n"], ' ', $state['values']['subject'] ?: 'Nouveau message du site');
    $body = "De : {$state['values']['name']} <{$from}>\nTéléphone : {$state['values']['phone']}\n\n{$state['values']['message']}\n";
    @mail($cfg['to'], '=?UTF-8?B?' . base64_encode($subject) . '?=', $body,
        "From: " . SITE_EMAIL . "\r\nReply-To: {$from}\r\nContent-Type: text/plain; charset=UTF-8");
    $_SESSION['csrf'] = bin2hex(random_bytes(16));
    $state['success'] = true;
    return $state;
}

function b_contactform(array $b): string
{
    $cfg = contact_config();
    $st = handle_contact();
    $h = '<section class="section"><div class="wrap narrow"><h2>' . e($b['title']) . '</h2>';
    if ($st['success']) {
        return $h . '<p class="notice ok" role="status">Merci, votre message a bien été envoyé. Nous vous répondons sous un jour ouvré.</p></div></section>';
    }
    if (!empty($st['errors']['_form'])) {
        $h .= '<p class="notice err" role="alert">' . e($st['errors']['_form']) . '</p>';
    }
    $h .= '<form method="post" action="/contact" novalidate class="form"><input type="hidden" name="csrf" value="' . e((string)$_SESSION['csrf']) . '">';
    $h .= '<div class="hp" aria-hidden="true"><label>Ne pas remplir <input type="text" name="website" tabindex="-1" autocomplete="off"></label></div>';
    foreach ($cfg['fields'] as $k => [$label, $type, $req]) {
        $val = $st['values'][$k] ?? '';
        $err = $st['errors'][$k] ?? '';
        $h .= '<div class="field' . ($err ? ' has-error' : '') . '"><label for="f-' . $k . '">' . e($label) . ($req ? ' <span aria-hidden="true">*</span>' : '') . '</label>';
        $attrs = 'id="f-' . $k . '" name="' . $k . '"' . ($req ? ' required' : '') . ($err ? ' aria-invalid="true" aria-describedby="e-' . $k . '"' : '');
        if ($type === 'textarea') {
            $h .= '<textarea ' . $attrs . ' rows="6">' . e($val) . '</textarea>';
        } else {
            $h .= '<input type="' . $type . '" ' . $attrs . ' value="' . e($val) . '">';
        }
        if ($err) {
            $h .= '<p class="error" id="e-' . $k . '">' . e($err) . '</p>';
        }
        $h .= '</div>';
    }
    return $h . '<button class="btn" type="submit">Envoyer</button></form></div></section>';
}

function b_contactinfo(array $b): string
{
    return '<section class="section alt"><div class="wrap narrow"><h2>Nous trouver</h2><ul class="coords">'
        . '<li><strong>Adresse</strong> ' . e(SITE_ADDRESS) . '</li>'
        . '<li><strong>Téléphone</strong> <a href="tel:+33556000000">' . e(SITE_PHONE) . '</a></li>'
        . '<li><strong>E-mail</strong> <a href="mailto:' . e(SITE_EMAIL) . '">' . e(SITE_EMAIL) . '</a></li>'
        . '<li><strong>Interventions</strong> Bordeaux, Libourne et Arcachon</li></ul></div></section>';
}

function render_blocks(array $blocks): string
{
    $out = '';
    foreach ($blocks as $b) {
        $fn = 'b_' . $b['type'];
        $out .= $fn($b);
    }
    return $out;
}

// ---------------------------------------------------------------- Pages

$consult = ['Réserver ma consultation offerte', '/contact'];

$routes = [
    '/' => [
        'nav' => 'Accueil',
        'title' => 'Avocats à Bordeaux : droit du travail, des affaires et de la famille',
        'desc' => 'Cabinet Garnier & Associés, avocats à Bordeaux depuis 2011. Première consultation de 30 minutes offerte. Interventions à Bordeaux, Libourne et Arcachon.',
        'blocks' => [
            ['type' => 'hero', 'image' => 'hero.svg', 'title' => 'Des avocats à vos côtés, à Bordeaux et en Gironde',
                'subtitle' => 'Droit du travail, droit des affaires, droit de la famille : un cabinet indépendant, fondé en 2011, qui vous écoute avant de vous conseiller.',
                'buttons' => [$consult, ['Nos domaines d\'intervention', '/domaines']]],
            ['type' => 'stats', 'items' => [['2011', 'année de fondation'], ['3', 'avocats associés'], ['30 min', 'de première consultation offerte'], ['3', 'villes d\'intervention']]],
            ['type' => 'features', 'title' => 'Pourquoi nous confier votre dossier', 'cols' => 3, 'items' => [
                ['§', 'Première consultation offerte', 'Trente minutes pour exposer votre situation, comprendre vos options et connaître les étapes à venir, sans engagement.'],
                ['€', 'Honoraires transparents', 'Forfait ou temps passé, selon la nature du dossier. Une convention d\'honoraires est systématiquement signée avant toute intervention.'],
                ['◎', 'Proximité', 'Nous intervenons à Bordeaux, Libourne et Arcachon, au cabinet comme auprès des juridictions de la région.'],
            ]],
            ['type' => 'richtext', 'side' => 'right', 'title' => 'Un cabinet à taille humaine', 'image' => 'cabinet.svg', 'alt' => 'Façade du cabinet, cours de l\'Intendance',
                'paragraphs' => ['Le cabinet Garnier & Associés réunit trois associés, deux collaboratrices et une assistante. Chaque dossier est suivi par un avocat identifié, qui reste votre interlocuteur du premier rendez-vous jusqu\'à la décision.',
                    'Notre équipe est installée cours de l\'Intendance, au cœur de Bordeaux, à proximité des juridictions et des transports.'],
                'button' => ['Découvrir l\'équipe', '/cabinet']],
            ['type' => 'faq', 'title' => 'Questions fréquentes', 'items' => [
                ['La première consultation est-elle vraiment gratuite ?', 'Oui. Les trente premières minutes sont offertes, au cabinet ou par téléphone. Au terme de l\'échange, nous vous indiquons si une intervention est utile et à quelles conditions.'],
                ['Dans quelles villes intervenez-vous ?', 'Nous recevons à Bordeaux et nous intervenons à Libourne et à Arcachon.'],
                ['Comment sont calculés vos honoraires ?', 'Au forfait ou au temps passé, selon le dossier. Dans tous les cas, une convention d\'honoraires écrite vous est remise avant le début de la mission.'],
            ]],
            ['type' => 'cta', 'title' => 'Parlons de votre situation', 'text' => 'Appelez-nous au ' . SITE_PHONE . ' ou écrivez-nous : nous revenons vers vous rapidement.', 'button' => $consult],
        ],
    ],
    '/domaines' => [
        'nav' => 'Domaines',
        'title' => 'Domaines d\'intervention : travail, affaires, famille',
        'desc' => 'Droit du travail, droit des affaires et droit de la famille : les domaines d\'intervention du cabinet Garnier & Associés à Bordeaux.',
        'blocks' => [
            ['type' => 'hero', 'title' => 'Domaines d\'intervention', 'subtitle' => 'Trois spécialités, portées chacune par l\'un des associés du cabinet.', 'buttons' => [$consult]],
            ['type' => 'richtext', 'side' => 'left', 'title' => 'Droit du travail, avec Me Hélène Garnier', 'image' => 'salle.svg', 'alt' => 'Salle de réunion du cabinet',
                'paragraphs' => ['Nous accompagnons les salariés comme les employeurs : contrat de travail, licenciement, rupture conventionnelle, harcèlement, durée du travail, négociation d\'une sortie, représentation devant le conseil de prud\'hommes.',
                    'L\'objectif est toujours de sécuriser votre position, par la négociation lorsque c\'est possible, par la voie judiciaire lorsque c\'est nécessaire.']],
            ['type' => 'richtext', 'side' => 'right', 'title' => 'Droit des affaires, avec Me Thomas Ruiz', 'image' => 'biblio.svg', 'alt' => 'Bibliothèque juridique du cabinet',
                'paragraphs' => ['Création et structuration de société, pactes d\'associés, contrats commerciaux, baux commerciaux, cession de fonds de commerce, recouvrement de créances et litiges entre professionnels.',
                    'Nous intervenons auprès des entrepreneurs, des commerçants et des professions libérales, en conseil comme en contentieux.']],
            ['type' => 'richtext', 'side' => 'left', 'title' => 'Droit de la famille, avec Me Inès Kaddour', 'image' => 'accueil.svg', 'alt' => 'Espace d\'accueil du cabinet',
                'paragraphs' => ['Divorce, séparation, garde des enfants, pension alimentaire, liquidation du régime matrimonial, successions et donations. Ces dossiers touchent à l\'intime : nous les traitons avec discrétion et clarté.',
                    'Nous privilégions les solutions amiables, notamment le divorce par consentement mutuel, et défendons vos intérêts devant le juge aux affaires familiales si le dialogue est rompu.']],
            ['type' => 'cta', 'title' => 'Votre dossier relève d\'un autre domaine ?', 'text' => 'Décrivez-nous votre situation : nous vous dirons honnêtement si nous pouvons vous aider.', 'button' => ['Nous contacter', '/contact']],
        ],
    ],
    '/cabinet' => [
        'nav' => 'Le cabinet',
        'title' => 'Le cabinet et son équipe',
        'desc' => 'Fondé en 2011, le cabinet Garnier & Associés réunit trois avocats associés, deux collaboratrices et une assistante à Bordeaux.',
        'blocks' => [
            ['type' => 'hero', 'title' => 'Le cabinet et son équipe', 'subtitle' => 'Depuis 2011, une équipe soudée au service des particuliers et des entreprises de Gironde.', 'buttons' => []],
            ['type' => 'team', 'title' => 'Les associés', 'items' => [
                ['Me Hélène Garnier', 'Associée fondatrice, droit du travail', 'Elle a fondé le cabinet en 2011 et défend salariés et employeurs en matière de relations individuelles et collectives du travail.'],
                ['Me Thomas Ruiz', 'Associé, droit des affaires', 'Il conseille les dirigeants et les sociétés sur leurs contrats, leurs conflits entre associés et leurs opérations de cession.'],
                ['Me Inès Kaddour', 'Associée, droit de la famille', 'Elle accompagne les familles dans les séparations, les questions d\'enfants et les successions, avec une approche apaisée.'],
            ]],
            ['type' => 'text', 'title' => 'Une équipe complète', 'paragraphs' => ['Les trois associés sont épaulés par deux collaboratrices avocates et une assistante, qui assure l\'accueil, la gestion des rendez-vous et le suivi administratif des dossiers.',
                'Cette organisation nous permet de répondre vite et de ne jamais laisser un dossier sans interlocuteur.']],
            ['type' => 'gallery', 'title' => 'Le cabinet en images', 'items' => [['cabinet.svg', 'Cours de l\'Intendance'], ['salle.svg', 'Salle de réunion'], ['biblio.svg', 'Bibliothèque juridique']]],
            ['type' => 'stats', 'items' => [['2011', 'création du cabinet'], ['6', 'personnes à votre service'], ['3', 'domaines d\'expertise']]],
        ],
    ],
    '/honoraires' => [
        'nav' => 'Honoraires',
        'title' => 'Honoraires : forfait ou temps passé',
        'desc' => 'Première consultation de 30 minutes offerte, honoraires au forfait ou au temps passé, convention d\'honoraires systématique.',
        'blocks' => [
            ['type' => 'hero', 'title' => 'Des honoraires clairs, dès le départ', 'subtitle' => 'Vous savez ce que coûtera votre dossier avant que nous commencions.', 'buttons' => [$consult]],
            ['type' => 'features', 'title' => 'Nos modes de facturation', 'cols' => 3, 'items' => [
                ['0', 'Première consultation offerte', 'Trente minutes pour faire le point sur votre situation et connaître les suites possibles.'],
                ['=', 'Forfait', 'Pour les missions dont le périmètre est connu à l\'avance : rédaction d\'un acte, divorce amiable, démarche précise. Le prix est fixé à l\'avance.'],
                ['⏱', 'Temps passé', 'Pour les dossiers dont la durée est incertaine, notamment les contentieux. Taux horaire et estimation vous sont communiqués par écrit.'],
            ]],
            ['type' => 'text', 'title' => 'La convention d\'honoraires', 'paragraphs' => ['Quelle que soit la formule retenue, une convention d\'honoraires est systématiquement établie et signée avant le début de la mission. Elle précise la nature des prestations, le mode de calcul des honoraires et les frais éventuels.',
                'Les montants dépendent de la complexité du dossier : ils vous sont donnés lors de la première consultation ou à l\'issue de l\'étude de vos pièces.']],
            ['type' => 'faq', 'title' => 'Honoraires : vos questions', 'items' => [
                ['Puis-je connaître le coût total à l\'avance ?', 'Pour une mission au forfait, oui. Pour une facturation au temps passé, nous vous remettons une estimation et vous prévenons si elle devait évoluer.'],
                ['Existe-t-il une aide pour financer un avocat ?', 'Selon vos ressources, l\'aide juridictionnelle peut prendre en charge tout ou partie des frais. Nous vous renseignons lors de la consultation.'],
            ]],
        ],
    ],
    '/contact' => [
        'nav' => 'Contact',
        'title' => 'Contact et prise de rendez-vous',
        'desc' => 'Contactez le cabinet Garnier & Associés à Bordeaux : 25 cours de l\'Intendance, 05 56 00 00 00, contact@garnier-associes.fr.',
        'blocks' => [
            ['type' => 'hero', 'title' => 'Prendre contact', 'subtitle' => 'Première consultation de 30 minutes offerte. Décrivez-nous votre situation, nous vous répondons rapidement.', 'buttons' => []],
            ['type' => 'contactform', 'title' => 'Écrivez-nous'],
            ['type' => 'contactinfo'],
        ],
    ],
    '/mentions-legales' => [
        'nav' => null,
        'title' => 'Mentions légales',
        'desc' => 'Mentions légales du site du cabinet Garnier & Associés, avocats à Bordeaux.',
        'blocks' => [
            ['type' => 'text', 'title' => 'Mentions légales', 'paragraphs' => [
                'Éditeur du site : cabinet Garnier & Associés, cabinet d\'avocats fondé en 2011, ' . SITE_ADDRESS . '. Téléphone : ' . SITE_PHONE . '. E-mail : ' . SITE_EMAIL . '.',
                'Les avocats du cabinet exercent à Bordeaux et sont soumis à la déontologie de la profession d\'avocat et au règlement intérieur national. Ordre : barreau de Bordeaux.',
                'Hébergement : à compléter avec les coordonnées de l\'hébergeur retenu.',
                'Données personnelles : les informations saisies dans le formulaire de contact sont utilisées uniquement pour répondre à votre demande et ne sont pas cédées à des tiers. Vous disposez d\'un droit d\'accès, de rectification et de suppression en écrivant à ' . SITE_EMAIL . '.',
                'Propriété intellectuelle : les textes et visuels de ce site sont la propriété du cabinet. Toute reproduction sans autorisation est interdite.',
                'Ce site fournit des informations générales qui ne constituent pas une consultation juridique.',
            ]],
        ],
    ],
];

// ---------------------------------------------------------------- Rendu

function layout(string $title, string $desc, string $content, string $current, array $routes): string
{
    $nav = '';
    foreach ($routes as $href => $r) {
        if ($r['nav'] === null) {
            continue;
        }
        $nav .= '<li><a href="' . e($href) . '"' . ($href === $current ? ' aria-current="page"' : '') . '>' . e($r['nav']) . '</a></li>';
    }
    return '<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">'
        . '<title>' . e($title) . ' | ' . e(SITE_NAME) . '</title><meta name="description" content="' . e($desc) . '">'
        . '<link rel="stylesheet" href="/assets/style.css"></head><body>'
        . '<header class="site-header"><div class="wrap bar"><a class="brand" href="/">' . e(SITE_NAME) . '</a>'
        . '<button class="menu-btn" type="button" aria-expanded="false" aria-controls="nav">Menu</button>'
        . '<nav id="nav" aria-label="Navigation principale"><ul>' . $nav . '</ul></nav></div></header>'
        . '<main>' . $content . '</main>'
        . '<footer class="site-footer"><div class="wrap foot"><div><strong>' . e(SITE_FULL) . '</strong>'
        . '<p class="small">Les informations de ce site ne constituent pas un conseil juridique. Avocats inscrits au barreau de Bordeaux.</p></div>'
        . '<div><p>' . e(SITE_ADDRESS) . '<br><a href="tel:+33556000000">' . e(SITE_PHONE) . '</a><br><a href="mailto:' . e(SITE_EMAIL) . '">' . e(SITE_EMAIL) . '</a></p></div>'
        . '<div><ul class="flinks"><li><a href="/honoraires">Honoraires</a></li><li><a href="/contact">Contact</a></li><li><a href="/mentions-legales">Mentions légales</a></li></ul></div></div></footer>'
        . '<div id="lightbox" class="lightbox" hidden><img alt=""><p></p></div>'
        . '<script src="/assets/app.js"></script></body></html>';
}

$key = rtrim($path, '/') === '' ? '/' : rtrim($path, '/');
if ($key === '/index.php') {
    $key = '/';
}

if (isset($routes[$key])) {
    $r = $routes[$key];
    $html = layout($r['title'], $r['desc'], render_blocks($r['blocks']), $key, $routes);
} else {
    http_response_code(404);
    $html = layout('Page introuvable', 'La page demandée est introuvable.',
        render_blocks([['type' => 'text', 'title' => 'Page introuvable', 'paragraphs' => ['La page que vous cherchez n\'existe pas ou a été déplacée. Retournez à l\'accueil ou contactez-nous.']]]),
        '', $routes);
}
header('Content-Type: text/html; charset=UTF-8');
echo $html;
