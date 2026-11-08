<?php
declare(strict_types=1);

/**
 * Fonctions utilitaires : échappement, liens, CSRF, formulaire.
 * Aucune dépendance à mbstring / intl / curl.
 */

/** Échappe une chaîne pour un contexte HTML. */
function e(?string $value): string
{
    return htmlspecialchars((string) $value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

/** Transforme un `to` (route, ancre, URL externe, mailto:, tel:) en href. */
function href(string $to): string
{
    if ($to === '' || $to[0] === '#' || preg_match('#^(https?:|mailto:|tel:)#i', $to)) {
        return $to;
    }
    return $to; // routes internes : déjà absolues (/contact)
}

/** Chemin public d'un fichier dans assets/. */
function asset(string $path): string
{
    return '/assets/' . ltrim($path, '/');
}

/** Première lettre (UTF-8) d'un prénom, sans mbstring. */
function initial(string $name): string
{
    if (preg_match('/^(.)/u', trim($name), $m)) {
        return strtoupper($m[1]) === $m[1] ? $m[1] : strtoupper($m[1]);
    }
    return '?';
}

/** Génère un bouton/lien à partir d'un tableau { label, to }. */
function render_button(array $link, string $class = 'btn'): string
{
    $label = $link['label'] ?? '';
    $to    = $link['to'] ?? '#';
    return '<a class="' . e($class) . '" href="' . e(href($to)) . '">' . e($label) . '</a>';
}

/** Icônes SVG inline (petit jeu maison, pas de bibliothèque). */
function icon(string $name): string
{
    $paths = [
        'wheat'  => '<path d="M12 2v20M12 6c-3 0-5 2-5 5 3 0 5-2 5-5zM12 6c3 0 5 2 5 5-3 0-5-2-5-5zM12 12c-3 0-5 2-5 5 3 0 5-2 5-5zM12 12c3 0 5 2 5 5-3 0-5-2-5-5z"/>',
        'fire'   => '<path d="M12 22c-4 0-7-3-7-7 0-3 2-5 3-7 0 2 1 3 2 3 0-4 2-7 5-9 0 3 1 5 3 7 2 2 2 4 2 6 0 4-3 7-8 7z"/>',
        'clock'  => '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
        'leaf'   => '<path d="M4 20c0-9 6-15 16-16 0 10-6 16-16 16zM4 20l8-8"/>',
        'medal'  => '<circle cx="12" cy="14" r="6"/><path d="M8 2l2 6M16 2l-2 6M12 11v6M10 13h4"/>',
        'cake'   => '<path d="M4 20h16v-7H4zM4 16c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2M12 9V5M12 5c-1-1-1-2 0-3 1 1 1 2 0 3z"/>',
        'users'  => '<circle cx="9" cy="8" r="3.5"/><circle cx="17" cy="9" r="2.5"/><path d="M2 20c0-4 3-6 7-6s7 2 7 6M16 14c3 0 6 1.5 6 5"/>',
        'heart'  => '<path d="M12 21s-8-5-8-11a4.5 4.5 0 0 1 8-2.5A4.5 4.5 0 0 1 20 10c0 6-8 11-8 11z"/>',
        'pin'    => '<path d="M12 22s7-7 7-13a7 7 0 0 0-14 0c0 6 7 13 7 13z"/><circle cx="12" cy="9" r="2.5"/>',
        'phone'  => '<path d="M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2z"/>',
        'mail'   => '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
        'truck'  => '<path d="M2 7h11v9H2zM13 10h5l3 3v3h-8z"/><circle cx="6" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
    ];
    $d = $paths[$name] ?? '<circle cx="12" cy="12" r="9"/>';
    return '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" '
        . 'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' . $d . '</svg>';
}

/* ----------------------------------------------------------------- CSRF */

function csrf_token(): string
{
    if (empty($_SESSION['csrf'])) {
        $_SESSION['csrf'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf'];
}

function csrf_check(?string $token): bool
{
    return is_string($token) && isset($_SESSION['csrf']) && hash_equals($_SESSION['csrf'], $token);
}

/* ---------------------------------------------------- Formulaire contact */

/**
 * Définition des champs disponibles pour le formulaire de contact.
 * La page décide lesquels afficher et lesquels sont obligatoires.
 */
function contact_field_defs(): array
{
    return [
        'nom'       => ['label' => 'Votre nom',      'type' => 'text',     'autocomplete' => 'name'],
        'email'     => ['label' => 'Votre e-mail',   'type' => 'email',    'autocomplete' => 'email'],
        'telephone' => ['label' => 'Votre téléphone', 'type' => 'tel',     'autocomplete' => 'tel'],
        'company'   => ['label' => 'Entreprise',     'type' => 'text',     'autocomplete' => 'organization'],
        'sujet'     => ['label' => 'Sujet',          'type' => 'text',     'autocomplete' => 'off'],
        'message'   => ['label' => 'Votre message',  'type' => 'textarea', 'autocomplete' => 'off'],
    ];
}

/**
 * Traite une soumission POST du formulaire de contact.
 *
 * @param string[] $fields   champs affichés (clés de contact_field_defs)
 * @param string[] $required champs obligatoires
 * @return array{status: string, values: array, errors: array}
 *         status : 'idle' | 'error' | 'success'
 */
function handle_contact_form(array $site, array $fields, array $required): array
{
    $defs   = contact_field_defs();
    $values = array_fill_keys($fields, '');
    $errors = [];

    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
        return ['status' => 'idle', 'values' => $values, 'errors' => []];
    }

    foreach ($fields as $f) {
        $raw = $_POST[$f] ?? '';
        $values[$f] = is_string($raw) ? trim(str_replace("\r", '', $raw)) : '';
    }

    // Pot de miel : un robot a rempli le champ caché -> faux succès, rien d'enregistré.
    if (!empty($_POST['site_web'])) {
        return ['status' => 'success', 'values' => $values, 'errors' => []];
    }

    if (!csrf_check($_POST['csrf'] ?? null)) {
        $errors['_form'] = 'Votre session a expiré. Merci de renvoyer le formulaire.';
    }

    foreach ($required as $f) {
        if (isset($values[$f]) && $values[$f] === '') {
            $errors[$f] = 'Ce champ est obligatoire.';
        }
    }
    if (isset($values['email']) && $values['email'] !== '' && !isset($errors['email'])
        && filter_var($values['email'], FILTER_VALIDATE_EMAIL) === false) {
        $errors['email'] = 'Cette adresse e-mail ne semble pas valide.';
    }
    if (isset($values['telephone']) && $values['telephone'] !== '' && !isset($errors['telephone'])
        && !preg_match('/^[0-9 +().-]{6,20}$/', $values['telephone'])) {
        $errors['telephone'] = 'Ce numéro de téléphone ne semble pas valide.';
    }
    foreach ($values as $f => $v) {
        if (!isset($errors[$f]) && strlen($v) > 5000) {
            $errors[$f] = 'Ce champ est trop long.';
        }
    }

    if ($errors !== []) {
        return ['status' => 'error', 'values' => $values, 'errors' => $errors];
    }

    save_contact_message($site, $values);
    send_contact_mail($site, $values);
    unset($_SESSION['csrf']); // un jeton par envoi

    return ['status' => 'success', 'values' => $values, 'errors' => []];
}

/** Ajoute le message en JSON (une ligne) dans data/messages.jsonl. */
function save_contact_message(array $site, array $values): bool
{
    $dir = dirname(__DIR__) . DIRECTORY_SEPARATOR . 'data';
    if (!is_dir($dir) && !@mkdir($dir, 0775, true) && !is_dir($dir)) {
        return false;
    }
    $record = [
        'date'   => date('c'),
        'ip'     => $_SERVER['REMOTE_ADDR'] ?? 'cli',
        'fields' => $values,
    ];
    $line = json_encode($record, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($line === false) {
        return false;
    }
    return @file_put_contents($dir . DIRECTORY_SEPARATOR . 'messages.jsonl', $line . "\n", FILE_APPEND | LOCK_EX) !== false;
}

/** Envoie le message par mail() avec Reply-To sur l'expéditeur. */
function send_contact_mail(array $site, array $values): bool
{
    $to      = $site['mail_to'] ?? '';
    if ($to === '') {
        return false;
    }
    $subject = '[' . $site['name'] . '] ' . ($values['sujet'] ?? 'Nouveau message via le site');
    $subject = preg_replace('/[\r\n]+/', ' ', $subject);

    $body = "Nouveau message reçu via le site " . $site['name'] . "\n\n";
    $defs = contact_field_defs();
    foreach ($values as $f => $v) {
        $body .= ($defs[$f]['label'] ?? $f) . " : " . $v . "\n";
    }

    $headers = "Content-Type: text/plain; charset=UTF-8\r\n";
    $headers .= "From: " . $site['name'] . " <no-reply@lefournil-nantes.fr>\r\n";
    $from = $values['email'] ?? '';
    if ($from !== '' && filter_var($from, FILTER_VALIDATE_EMAIL) !== false) {
        $headers .= "Reply-To: " . $from . "\r\n";
    }
    // Sur un poste sans serveur SMTP, mail() échoue : on ne bloque pas l'utilisateur pour ça.
    return @mail($to, $subject, $body, $headers);
}
