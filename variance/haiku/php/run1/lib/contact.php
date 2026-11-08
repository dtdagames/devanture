<?php
declare(strict_types=1);

const CONTACT_SUBJECTS = [
    'Droit du travail',
    'Droit des affaires',
    'Droit de la famille',
    'Autre demande',
];

const CONTACT_FIELDS = [
    ['name' => 'nom', 'label' => 'Nom et prénom', 'type' => 'text', 'required' => true],
    ['name' => 'email', 'label' => 'Adresse e-mail', 'type' => 'email', 'required' => true],
    ['name' => 'telephone', 'label' => 'Téléphone', 'type' => 'tel', 'required' => false],
    ['name' => 'sujet', 'label' => 'Domaine concerné', 'type' => 'select', 'options' => CONTACT_SUBJECTS, 'required' => false],
    ['name' => 'message', 'label' => 'Votre message', 'type' => 'textarea', 'required' => true],
];

const CONTACT_MESSAGE_MAX = 5000;

/**
 * Traite la requête du formulaire de contact et renvoie l'état d'affichage.
 * Doit être appelée après session_start().
 */
function contact_process(): array
{
    if (session_status() !== PHP_SESSION_ACTIVE) {
        session_start();
    }
    if (empty($_SESSION['csrf']) || !is_string($_SESSION['csrf'])) {
        $_SESSION['csrf'] = bin2hex(random_bytes(16));
    }

    $state = [
        'csrf' => $_SESSION['csrf'],
        'success' => false,
        'csrf_error' => false,
        'errors' => [],
        'values' => [],
    ];

    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
        return $state;
    }

    $posted = $_POST;
    $values = [];
    foreach (CONTACT_FIELDS as $f) {
        $values[$f['name']] = trim((string) ($posted[$f['name']] ?? ''));
    }
    $state['values'] = $values;

    $token = (string) ($posted['csrf'] ?? '');
    if (!hash_equals($_SESSION['csrf'], $token)) {
        $state['csrf_error'] = true;
        return $state;
    }

    // Pot de miel : on fait croire au succès sans rien enregistrer.
    if (trim((string) ($posted['site_web'] ?? '')) !== '') {
        $state['success'] = true;
        return $state;
    }

    $errors = [];
    foreach (CONTACT_FIELDS as $f) {
        $name = $f['name'];
        if (!empty($f['required']) && $values[$name] === '') {
            $errors[$name] = 'Ce champ est obligatoire.';
        }
    }
    if ($values['email'] !== '' && filter_var($values['email'], FILTER_VALIDATE_EMAIL) === false) {
        $errors['email'] = 'Adresse e-mail invalide.';
    }
    if ($values['telephone'] !== '' && !preg_match('/^\+?[0-9 .()-]{6,20}$/', $values['telephone'])) {
        $errors['telephone'] = 'Numéro de téléphone invalide.';
    }
    if ($values['sujet'] !== '' && !in_array($values['sujet'], CONTACT_SUBJECTS, true)) {
        $errors['sujet'] = 'Choix invalide.';
    }
    if (strlen($values['message']) > CONTACT_MESSAGE_MAX) {
        $errors['message'] = 'Message trop long (' . CONTACT_MESSAGE_MAX . ' caractères maximum).';
    }

    if ($errors) {
        $state['errors'] = $errors;
        return $state;
    }

    contact_store($values);
    contact_notify($values);

    // Nouveau jeton après envoi réussi.
    $_SESSION['csrf'] = bin2hex(random_bytes(16));
    $state['csrf'] = $_SESSION['csrf'];
    $state['success'] = true;
    return $state;
}

function contact_store(array $values): void
{
    $dir = dirname(__DIR__) . '/data';
    if (!is_dir($dir)) {
        mkdir($dir, 0775, true);
    }
    $record = ['date' => date('c')] + $values;
    $line = json_encode($record, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n";
    file_put_contents($dir . '/messages.jsonl', $line, FILE_APPEND | LOCK_EX);
}

function contact_notify(array $values): void
{
    $subject = 'Nouveau message depuis le site';
    $body = "Nouveau message depuis le formulaire de contact.\n\n"
        . 'Nom : ' . $values['nom'] . "\n"
        . 'E-mail : ' . $values['email'] . "\n"
        . 'Téléphone : ' . ($values['telephone'] !== '' ? $values['telephone'] : '-') . "\n"
        . 'Domaine : ' . ($values['sujet'] !== '' ? $values['sujet'] : '-') . "\n\n"
        . $values['message'] . "\n";
    $headers = "From: " . SITE['email'] . "\r\n"
        . 'Reply-To: ' . $values['email'] . "\r\n"
        . "Content-Type: text/plain; charset=UTF-8\r\n";
    // Le message est déjà enregistré ; un échec d'envoi ne bloque pas la confirmation.
    @mail(SITE['email'], $subject, $body, $headers);
}
