<?php
declare(strict_types=1);

/**
 * Traite le formulaire de contact (GET : affichage ; POST : validation et envoi).
 * Retourne : status ('form' | 'sent'), values, errors (par champ), general (message global).
 */
function contact_handle(array $fields, array $site): array
{
    if (session_status() !== PHP_SESSION_ACTIVE) {
        session_start();
    }
    if (empty($_SESSION['csrf']) || !is_string($_SESSION['csrf'])) {
        $_SESSION['csrf'] = bin2hex(random_bytes(16));
    }

    $result = ['status' => 'form', 'values' => [], 'errors' => [], 'general' => '', 'csrf' => $_SESSION['csrf']];
    foreach ($fields as $f) {
        $result['values'][$f['name']] = '';
    }

    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
        return $result;
    }

    $posted = $_POST;
    foreach ($fields as $f) {
        $raw = $posted[$f['name']] ?? '';
        $result['values'][$f['name']] = is_string($raw) ? trim($raw) : '';
    }

    // Jeton CSRF : comparaison en temps constant.
    $token = isset($posted['csrf']) && is_string($posted['csrf']) ? $posted['csrf'] : '';
    if (!hash_equals($_SESSION['csrf'], $token)) {
        $result['general'] = 'Votre session a expiré. Merci de renvoyer le formulaire.';

        return $result;
    }

    // Pot de miel : on affiche le succes sans rien enregistrer.
    $honeypot = $posted['website'] ?? '';
    if (is_string($honeypot) && trim($honeypot) !== '') {
        $result['status'] = 'sent';

        return $result;
    }

    foreach ($fields as $f) {
        $name = $f['name'];
        $value = $result['values'][$name];
        $label = $f['label'];
        if ($value === '') {
            if (!empty($f['required'])) {
                $result['errors'][$name] = 'Le champ ' . $label . ' est obligatoire.';
            }
            continue;
        }
        if (strlen($value) > 5000) {
            $result['errors'][$name] = 'Ce texte est trop long (5000 caractères maximum).';
        } elseif ($f['type'] === 'email' && filter_var($value, FILTER_VALIDATE_EMAIL) === false) {
            $result['errors'][$name] = 'Adresse e-mail invalide.';
        } elseif ($f['type'] === 'select' && !in_array($value, $f['options'], true)) {
            $result['errors'][$name] = 'Merci de choisir une valeur dans la liste.';
        }
    }

    if ($result['errors'] !== []) {
        return $result;
    }

    $v = $result['values'];
    $record = [
        'date' => date('c'),
        'nom' => $v['name'] ?? '',
        'email' => $v['email'] ?? '',
        'telephone' => $v['phone'] ?? '',
        'sujet' => $v['subject'] ?? '',
        'message' => $v['message'] ?? '',
    ];
    $line = json_encode($record, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($line === false) {
        $result['general'] = 'Votre message n\'a pas pu être enregistré. Merci de réessayer.';

        return $result;
    }

    $dir = dirname(__DIR__) . DIRECTORY_SEPARATOR . 'data';
    if (!is_dir($dir)) {
        mkdir($dir, 0775, true);
    }
    file_put_contents($dir . DIRECTORY_SEPARATOR . 'messages.jsonl', $line . "\n", FILE_APPEND | LOCK_EX);

    $body = "Nouveau message depuis le site du cabinet.\n\n"
        . 'Nom : ' . $record['nom'] . "\n"
        . 'E-mail : ' . $record['email'] . "\n"
        . 'Téléphone : ' . $record['telephone'] . "\n"
        . 'Domaine : ' . $record['sujet'] . "\n\n"
        . $record['message'] . "\n";
    $headers = 'From: ' . $site['email'] . "\r\n"
        . 'Reply-To: ' . $record['email'] . "\r\n"
        . "Content-Type: text/plain; charset=UTF-8\r\n"
        . "Content-Transfer-Encoding: 8bit\r\n";
    // Pas de serveur d'envoi en local : l'echec de mail() n'empeche pas l'enregistrement.
    @mail($site['email'], 'Nouveau message depuis le site', $body, $headers);

    $_SESSION['csrf'] = bin2hex(random_bytes(16));
    $result['status'] = 'sent';
    $result['csrf'] = $_SESSION['csrf'];

    return $result;
}

/** Rendu HTML du formulaire (ou du message de confirmation). */
function render_contact_form(array $fields, array $state): string
{
    if ($state['status'] === 'sent') {
        return '<div class="notice notice--success" role="status"><h2>Merci pour votre message</h2>'
            . '<p>Votre demande a bien été transmise au cabinet. Nous vous répondrons dans les meilleurs délais, en général sous deux jours ouvrés.</p></div>';
    }

    $csrf = e($state['csrf']);
    $html = '<form class="contact-form" method="post" action="/contact" novalidate>'
        . '<input type="hidden" name="csrf" value="' . $csrf . '">';
    if ($state['general'] !== '') {
        $html .= '<p class="notice notice--error" role="alert">' . e($state['general']) . '</p>';
    }

    foreach ($fields as $f) {
        $name = $f['name'];
        $id = 'champ-' . $name;
        $value = $state['values'][$name] ?? '';
        $error = $state['errors'][$name] ?? null;
        $req = !empty($f['required']) ? ' required aria-required="true"' : '';
        $label = e($f['label']) . (!empty($f['required']) ? ' <span class="req">(obligatoire)</span>' : '');
        $aria = $error !== null ? ' aria-invalid="true" aria-describedby="err-' . $name . '"' : '';

        $html .= '<div class="field">';
        if ($f['type'] === 'textarea') {
            $html .= '<label for="' . $id . '">' . $label . '</label>'
                . '<textarea id="' . $id . '" name="' . $name . '" rows="6"' . $req . $aria . '>' . e($value) . '</textarea>';
        } elseif ($f['type'] === 'select') {
            $html .= '<label for="' . $id . '">' . $label . '</label><select id="' . $id . '" name="' . $name . '"' . $req . $aria . '>'
                . '<option value="">Choisissez...</option>';
            foreach ($f['options'] as $opt) {
                $sel = $opt === $value ? ' selected' : '';
                $html .= '<option value="' . e($opt) . '"' . $sel . '>' . e($opt) . '</option>';
            }
            $html .= '</select>';
        } else {
            $html .= '<label for="' . $id . '">' . $label . '</label>'
                . '<input id="' . $id . '" type="' . e($f['type']) . '" name="' . $name . '" value="' . e($value) . '"' . $req . $aria . '>';
        }
        if ($error !== null) {
            $html .= '<p class="field__error" id="err-' . $name . '">' . e($error) . '</p>';
        }
        $html .= '</div>';
    }

    $html .= '<div class="hp" aria-hidden="true"><label>Ne pas remplir ce champ'
        . '<input type="text" name="website" tabindex="-1" autocomplete="off"></label></div>'
        . '<button class="btn btn--primary" type="submit">Envoyer ma demande</button>'
        . '</form>';

    return $html;
}
