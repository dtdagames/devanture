<?php
declare(strict_types=1);

/** Définition des champs : clé => [libellé, type, obligatoire] */
const CONTACT_FIELDS = [
    'name'    => ['Nom et prénom', 'text', true],
    'email'   => ['Adresse e-mail', 'email', true],
    'phone'   => ['Téléphone', 'tel', false],
    'company' => ['Entreprise', 'text', false],
    'subject' => ['Sujet', 'text', true],
    'message' => ['Votre message', 'textarea', true],
];

function csrf_token(): string
{
    if (empty($_SESSION['csrf']) || !is_string($_SESSION['csrf'])) {
        $_SESSION['csrf'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf'];
}

/** Traite la requête courante ; retourne l'état du formulaire. */
function handle_contact(): array
{
    $state = ['status' => 'new', 'values' => [], 'errors' => []];
    foreach (CONTACT_FIELDS as $k => $_) {
        $state['values'][$k] = '';
    }
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
        return $state;
    }

    foreach (CONTACT_FIELDS as $k => $_) {
        $v = $_POST[$k] ?? '';
        $state['values'][$k] = is_string($v) ? trim($v) : '';
    }

    // Pot de miel : succès apparent, rien d'enregistré
    $honey = $_POST['website'] ?? '';
    if (is_string($honey) && $honey !== '') {
        $state['status'] = 'success';
        return $state;
    }

    // CSRF
    $sent = $_POST['csrf'] ?? '';
    if (!is_string($sent) || !hash_equals(csrf_token(), $sent)) {
        $state['status'] = 'error';
        $state['errors']['_form'] = 'Votre session a expiré. Merci de renvoyer le formulaire.';
        return $state;
    }

    foreach (CONTACT_FIELDS as $k => [$label, $type, $required]) {
        $v = $state['values'][$k];
        if ($required && $v === '') {
            $state['errors'][$k] = 'Ce champ est obligatoire.';
        } elseif ($k === 'email' && $v !== '' && filter_var($v, FILTER_VALIDATE_EMAIL) === false) {
            $state['errors'][$k] = 'Adresse e-mail invalide.';
        }
    }
    if ($state['errors']) {
        $state['status'] = 'error';
        return $state;
    }

    // Enregistrement JSONL
    $dir = __DIR__ . '/../data';
    if (!is_dir($dir)) {
        @mkdir($dir, 0775, true);
    }
    $record = $state['values'] + ['date' => date('c'), 'ip' => $_SERVER['REMOTE_ADDR'] ?? ''];
    $line = json_encode($record, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    @file_put_contents($dir . '/messages.jsonl', $line . "\n", FILE_APPEND | LOCK_EX);

    // Envoi par mail() ; Reply-To sur l'expéditeur (retours à la ligne retirés)
    $clean = static fn(string $s): string => str_replace(["\r", "\n"], ' ', $s);
    $v = $state['values'];
    $body = "Nom : {$v['name']}\nE-mail : {$v['email']}\nTéléphone : {$v['phone']}\nEntreprise : {$v['company']}\n\n{$v['message']}\n";
    $headers = 'Reply-To: ' . $clean($v['email']) . "\r\n"
        . "Content-Type: text/plain; charset=UTF-8\r\n"
        . 'From: ' . SITE['mail_to'];
    @mail(SITE['mail_to'], '=?UTF-8?B?' . base64_encode('Site web : ' . $clean($v['subject'])) . '?=', $body, $headers);

    $state['status'] = 'success';
    return $state;
}

/** Bloc formulaire de contact. $b: title?, intro?, fields[] (sous-ensemble de CONTACT_FIELDS) */
function block_contact_form(array $b, array $state): string
{
    $h = '<section class="section"><div class="container container--narrow">';
    if (!empty($b['title'])) {
        $h .= '<h2 class="section__title">' . e($b['title']) . '</h2>';
    }
    if (!empty($b['intro'])) {
        $h .= '<p>' . e($b['intro']) . '</p>';
    }
    if (($state['status'] ?? '') === 'success') {
        return $h . '<div class="notice notice--ok" role="status"><strong>Merci, votre message a bien été envoyé.</strong> '
            . 'Nous vous répondons sous un jour ouvré. Ce message ne crée pas de relation avec le cabinet avant la signature d\'une convention d\'honoraires.</div></div></section>';
    }
    $values = $state['values'] ?? [];
    $errors = $state['errors'] ?? [];
    $h .= '<form class="form" method="post" action="/contact" novalidate>';
    if (!empty($errors['_form'])) {
        $h .= '<div class="notice notice--err" role="alert">' . e($errors['_form']) . '</div>';
    } elseif ($errors) {
        $h .= '<div class="notice notice--err" role="alert">Le formulaire contient des erreurs, merci de les corriger.</div>';
    }
    $h .= '<input type="hidden" name="csrf" value="' . e(csrf_token()) . '">';
    $h .= '<div class="hp" aria-hidden="true"><label>Ne pas remplir <input type="text" name="website" tabindex="-1" autocomplete="off"></label></div>';
    foreach (($b['fields'] ?? array_keys(CONTACT_FIELDS)) as $k) {
        [$label, $type, $required] = CONTACT_FIELDS[$k];
        $val = $values[$k] ?? '';
        $err = $errors[$k] ?? '';
        $id = 'f-' . $k;
        $h .= '<div class="field' . ($err !== '' ? ' field--err' : '') . '"><label for="' . $id . '">' . e($label) . ($required ? ' <span class="req" aria-hidden="true">*</span>' : '') . '</label>';
        $aria = ($required ? ' required' : '') . ($err !== '' ? ' aria-invalid="true" aria-describedby="' . $id . '-err"' : '');
        if ($type === 'textarea') {
            $h .= '<textarea id="' . $id . '" name="' . $k . '" rows="6"' . $aria . '>' . e($val) . '</textarea>';
        } else {
            $h .= '<input id="' . $id . '" type="' . $type . '" name="' . $k . '" value="' . e($val) . '"' . $aria . '>';
        }
        if ($err !== '') {
            $h .= '<p class="field__err" id="' . $id . '-err">' . e($err) . '</p>';
        }
        $h .= '</div>';
    }
    $h .= '<p class="form__note">Les champs marqués * sont obligatoires. Ne joignez pas de pièces confidentielles avant la première prise de contact.</p>';
    $h .= '<button class="btn" type="submit">Envoyer le message</button></form></div></section>';
    return $h;
}
