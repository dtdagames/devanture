<?php
declare(strict_types=1);

const CONTACT_SUBJECTS = [
    'droit-travail' => 'Droit du travail',
    'droit-affaires' => 'Droit des affaires',
    'droit-famille' => 'Droit de la famille',
    'autre' => 'Autre demande',
];

const CONTACT_HONEYPOT = 'website';

/**
 * Champs du formulaire : libellé, type, obligatoire, longueur max (et min si besoin).
 *
 * @return array<string, array{label: string, type: string, required: bool, max: int, min?: int, autocomplete?: string}>
 */
function contact_fields(): array
{
    return [
        'nom' => ['label' => 'Nom et prénom', 'type' => 'text', 'required' => true, 'max' => 100, 'autocomplete' => 'name'],
        'email' => ['label' => 'Adresse e-mail', 'type' => 'email', 'required' => true, 'max' => 254, 'autocomplete' => 'email'],
        'telephone' => ['label' => 'Téléphone (facultatif)', 'type' => 'tel', 'required' => false, 'max' => 20, 'autocomplete' => 'tel'],
        'sujet' => ['label' => 'Domaine concerné', 'type' => 'select', 'required' => true, 'max' => 40],
        'message' => ['label' => 'Votre message', 'type' => 'textarea', 'required' => true, 'max' => 5000, 'min' => 10],
    ];
}

/**
 * Traite la requête éventuelle du formulaire et renvoie l'état à afficher.
 *
 * @return array{sent: bool, values: array<string, string>, errors: array<string, string>, form_error: ?string}
 */
function contact_form_state(): array
{
    if (session_status() === PHP_SESSION_NONE) {
        session_set_cookie_params(['lifetime' => 0, 'path' => '/', 'httponly' => true, 'samesite' => 'Lax']);
        session_start();
    }
    if (empty($_SESSION['csrf']) || !is_string($_SESSION['csrf'])) {
        $_SESSION['csrf'] = bin2hex(random_bytes(32));
    }

    $state = ['sent' => false, 'values' => [], 'errors' => [], 'form_error' => null];
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
        return $state;
    }

    // Lecture et nettoyage des valeurs (contrôle de caractères, pas de retours à la ligne dans les champs courts).
    foreach (contact_fields() as $name => $field) {
        $raw = $_POST[$name] ?? '';
        $raw = is_string($raw) ? $raw : '';
        $raw = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/', '', $raw) ?? '';
        $state['values'][$name] = $name === 'message'
            ? trim($raw)
            : trim(str_replace(["\r", "\n"], ' ', $raw));
    }

    // Pot de miel : champ caché rempli = robot. On affiche le succès sans rien enregistrer.
    $honey = $_POST[CONTACT_HONEYPOT] ?? '';
    if (is_string($honey) && $honey !== '') {
        $state['sent'] = true;
        return $state;
    }

    $submitted = $_POST['csrf'] ?? '';
    if (!is_string($submitted) || !hash_equals((string) $_SESSION['csrf'], $submitted)) {
        $state['form_error'] = 'Votre session a expiré. Merci de renvoyer le formulaire.';
        $_SESSION['csrf'] = bin2hex(random_bytes(32));
        return $state;
    }

    foreach (contact_fields() as $name => $field) {
        $v = $state['values'][$name];
        if ($v === '') {
            if ($field['required']) {
                $state['errors'][$name] = 'Ce champ est obligatoire.';
            }
            continue;
        }
        if (strlen($v) > $field['max']) {
            $state['errors'][$name] = 'Ce texte est trop long.';
            continue;
        }
        if ($name === 'email' && filter_var($v, FILTER_VALIDATE_EMAIL) === false) {
            $state['errors'][$name] = 'Adresse e-mail invalide.';
        }
        if ($name === 'telephone' && preg_match('/^\+?[0-9 .()\-]{6,20}$/', $v) !== 1) {
            $state['errors'][$name] = 'Numéro de téléphone invalide.';
        }
        if ($name === 'sujet' && !array_key_exists($v, CONTACT_SUBJECTS)) {
            $state['errors'][$name] = 'Choisissez un domaine dans la liste.';
        }
        if ($name === 'message' && strlen($v) < ($field['min'] ?? 0)) {
            $state['errors'][$name] = 'Votre message est trop court (10 caractères minimum).';
        }
    }
    if ($state['errors'] !== []) {
        return $state;
    }

    $values = $state['values'];
    $dir = dirname(__DIR__) . '/data';
    if (!is_dir($dir) && !mkdir($dir, 0775, true) && !is_dir($dir)) {
        $state['form_error'] = 'Une erreur est survenue. Merci de réessayer ou de nous appeler.';
        return $state;
    }
    $record = [
        'recu_le' => date('c'),
        'nom' => $values['nom'],
        'email' => $values['email'],
        'telephone' => $values['telephone'],
        'domaine' => CONTACT_SUBJECTS[$values['sujet']],
        'message' => $values['message'],
    ];
    $json = json_encode($record, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($json === false || file_put_contents($dir . '/messages.jsonl', $json . "\n", FILE_APPEND | LOCK_EX) === false) {
        $state['form_error'] = 'Une erreur est survenue. Merci de réessayer ou de nous appeler.';
        return $state;
    }

    // Envoi par e-mail. Un échec (serveur sans mail configuré) ne bloque pas : le message reste dans data/messages.jsonl.
    $body = "Nouvelle demande de contact depuis le site\n\n"
        . 'Nom : ' . $values['nom'] . "\n"
        . 'E-mail : ' . $values['email'] . "\n"
        . 'Téléphone : ' . ($values['telephone'] !== '' ? $values['telephone'] : 'non renseigné') . "\n"
        . 'Domaine : ' . CONTACT_SUBJECTS[$values['sujet']] . "\n\n"
        . $values['message'] . "\n";
    $headers = 'From: Site du cabinet <' . SITE['email'] . ">\r\n"
        . 'Reply-To: <' . $values['email'] . ">\r\n"
        . "Content-Type: text/plain; charset=UTF-8\r\n"
        . "Content-Transfer-Encoding: 8bit\r\n";
    @mail(SITE['email'], 'Nouvelle demande de contact depuis le site', $body, $headers);

    $state['sent'] = true;
    $state['values'] = [];
    return $state;
}

/** Formulaire ou confirmation, selon l'état. */
function render_contact_form(array $state): string
{
    if ($state['sent']) {
        return '<div class="notice notice--success" role="status"><h2>Merci, votre message a bien été envoyé.</h2>'
            . '<p>Nous revenons vers vous rapidement pour convenir d\'un rendez-vous. '
            . 'Pour une question urgente, appelez-nous au <a href="tel:' . e(SITE['phone_link']) . '">'
            . e(SITE['phone']) . '</a>.</p></div>';
    }

    $html = '';
    if ($state['form_error'] !== null) {
        $html .= '<p class="notice notice--error" role="alert">' . e($state['form_error']) . '</p>';
    } elseif ($state['errors'] !== []) {
        $html .= '<p class="notice notice--error" role="alert">Merci de corriger les champs signalés ci-dessous.</p>';
    }

    $html .= '<form class="form" method="post" action="/contact">';
    $html .= '<input type="hidden" name="csrf" value="' . e((string) $_SESSION['csrf']) . '">';

    foreach (contact_fields() as $name => $field) {
        $value = $state['values'][$name] ?? '';
        $error = $state['errors'][$name] ?? null;
        $id = 'f-' . $name;
        $errId = 'err-' . $name;
        $req = $field['required'] ? ' required' : '';
        $describe = $error !== null ? ' aria-describedby="' . $errId . '" aria-invalid="true"' : '';
        $mark = $field['required'] ? ' <span class="req" aria-hidden="true">*</span>' : '';

        $html .= '<div class="field' . ($error !== null ? ' field--error' : '') . '">';
        $html .= '<label for="' . $id . '">' . e($field['label']) . $mark . '</label>';
        if ($field['type'] === 'select') {
            $html .= '<select id="' . $id . '" name="' . $name . '"' . $req . $describe . '>';
            $html .= '<option value="">Choisissez un domaine</option>';
            foreach (CONTACT_SUBJECTS as $key => $label) {
                $sel = $value === $key ? ' selected' : '';
                $html .= '<option value="' . e($key) . '"' . $sel . '>' . e($label) . '</option>';
            }
            $html .= '</select>';
        } elseif ($field['type'] === 'textarea') {
            $html .= '<textarea id="' . $id . '" name="' . $name . '" rows="6"' . $req . $describe . '>'
                . e($value) . '</textarea>';
        } else {
            $auto = isset($field['autocomplete']) ? ' autocomplete="' . $field['autocomplete'] . '"' : '';
            $html .= '<input id="' . $id . '" name="' . $name . '" type="' . $field['type'] . '" value="' . e($value) . '"'
                . $auto . $req . $describe . '>';
        }
        if ($error !== null) {
            $html .= '<p class="field-error" id="' . $errId . '">' . e($error) . '</p>';
        }
        $html .= '</div>';
    }

    // Pot de miel : masqué visuellement et hors tabulation.
    $html .= '<div class="hp" aria-hidden="true"><label for="f-' . CONTACT_HONEYPOT . '">Ne pas remplir</label>'
        . '<input id="f-' . CONTACT_HONEYPOT . '" name="' . CONTACT_HONEYPOT . '" type="text" tabindex="-1" autocomplete="off"></div>';

    $html .= '<button class="btn btn--primary" type="submit">Envoyer ma demande</button>';
    $html .= '<p class="form-note">Les informations transmises servent uniquement à répondre à votre demande (voir les mentions légales).</p>';
    return $html . '</form>';
}
