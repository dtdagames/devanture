<?php
declare(strict_types=1);

/**
 * Gestion du formulaire de contact : CSRF, pot de miel, validation serveur,
 * enregistrement JSONL dans data/messages.jsonl, envoi par mail().
 *
 * Retourne l'état à afficher : values, errors (par champ, clé '_form' pour le général),
 * sent (bool) et csrf (jeton à inclure dans le formulaire).
 */
function contact_handle(string $root, array $config): array
{
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    if (empty($_SESSION['csrf']) || !is_string($_SESSION['csrf'])) {
        $_SESSION['csrf'] = bin2hex(random_bytes(32));
    }

    $state = [
        'values' => [],
        'errors' => [],
        'sent' => false,
        'csrf' => $_SESSION['csrf'],
    ];

    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
        return $state;
    }

    $form = null;
    foreach ($config['pages']['contact']['blocks'] as $block) {
        if ($block['type'] === 'form') {
            $form = $block;
            break;
        }
    }
    if ($form === null) {
        return $state;
    }
    $fields = $form['fields'];

    // Valeurs saisies, toujours des chaînes
    $values = [];
    foreach ($fields as $f) {
        $raw = $_POST[$f['name']] ?? '';
        $values[$f['name']] = is_string($raw) ? trim($raw) : '';
    }
    $state['values'] = $values;

    $token = $_POST['csrf'] ?? '';
    if (!is_string($token) || !hash_equals($_SESSION['csrf'], $token)) {
        $state['errors']['_form'] = 'Votre session a expiré. Merci de renvoyer le formulaire.';
        return $state;
    }

    // Pot de miel : on fait croire à un succès sans rien enregistrer
    $honeypot = $_POST['website'] ?? '';
    if (is_string($honeypot) && $honeypot !== '') {
        $state['sent'] = true;
        $state['values'] = [];
        return $state;
    }

    $errors = [];
    foreach ($fields as $f) {
        $name = $f['name'];
        $v = $values[$name];
        if ($v === '') {
            if (!empty($f['required'])) {
                $errors[$name] = 'Ce champ est obligatoire.';
            }
            continue;
        }
        if (strlen($v) > 5000) {
            $errors[$name] = 'Ce texte est trop long.';
            continue;
        }
        if ($f['type'] === 'email' && filter_var($v, FILTER_VALIDATE_EMAIL) === false) {
            $errors[$name] = 'Adresse e-mail invalide.';
        } elseif ($f['type'] === 'tel' && preg_match('/^\+?[0-9 .()\-]{6,20}$/', $v) !== 1) {
            $errors[$name] = 'Numéro de téléphone invalide.';
        } elseif ($f['type'] === 'select' && !in_array($v, $f['options'], true)) {
            $errors[$name] = 'Choix invalide.';
        }
    }
    if ($errors !== []) {
        $state['errors'] = $errors;
        return $state;
    }

    $dir = $root . '/data';
    if (!is_dir($dir) && !@mkdir($dir, 0775, true) && !is_dir($dir)) {
        $state['errors']['_form'] = "Votre message n'a pas pu être enregistré. Merci de réessayer ou d'appeler le cabinet.";
        return $state;
    }

    $record = ['date' => date('c')] + $values;
    $line = json_encode($record, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n";
    if (file_put_contents($dir . '/messages.jsonl', $line, FILE_APPEND | LOCK_EX) === false) {
        $state['errors']['_form'] = "Votre message n'a pas pu être enregistré. Merci de réessayer ou d'appeler le cabinet.";
        return $state;
    }

    $to = $config['site']['email'];
    $subject = '=?UTF-8?B?' . base64_encode('Nouvelle demande de contact depuis le site') . '?=';
    $body = "Nouvelle demande reçue depuis le formulaire de contact.\n\n";
    foreach ($fields as $f) {
        $body .= $f['label'] . " : " . $values[$f['name']] . "\n";
    }
    $headers = "From: " . $to . "\r\n"
        . "Reply-To: " . $values['email'] . "\r\n"
        . "MIME-Version: 1.0\r\n"
        . "Content-Type: text/plain; charset=UTF-8\r\n"
        . "Content-Transfer-Encoding: 8bit\r\n";
    // L'enregistrement est déjà fait ; un échec d'envoi n'est pas bloquant pour l'internaute.
    @mail($to, $subject, $body, $headers);

    $_SESSION['csrf'] = bin2hex(random_bytes(32));
    $state['sent'] = true;
    $state['values'] = [];
    $state['csrf'] = $_SESSION['csrf'];
    return $state;
}
