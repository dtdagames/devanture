<?php
declare(strict_types=1);

/** Traitement du formulaire de contact : validation, anti-spam, stockage JSONL, e-mail si possible. */
function handle_contact_form(array $site): array {
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST' || ($_POST['_form'] ?? '') !== 'contact') return ['status' => null];
    if (!hash_equals($_SESSION['csrf'] ?? '', (string)($_POST['_csrf'] ?? ''))) return ['status' => 'error', 'message' => 'Session expirée, merci de réessayer.'];
    if (!empty($_POST['website'])) return ['status' => 'ok']; // honeypot : on fait semblant

    $fields = ['name' => 'Nom', 'email' => 'E-mail', 'phone' => 'Téléphone', 'subject' => 'Sujet', 'message' => 'Message'];
    $data = []; $errors = [];
    foreach ($fields as $k => $label) {
        $v = trim((string)($_POST[$k] ?? ''));
        if ($v !== '') $data[$k] = str_cut($v, $k === 'message' ? 5000 : 200);
    }
    foreach (explode(',', (string)($_POST['_required'] ?? '')) as $k) {
        if ($k !== '' && empty($data[$k])) $errors[$k] = ($fields[$k] ?? $k) . ' est obligatoire.';
    }
    if (!empty($data['email']) && !filter_var($data['email'], FILTER_VALIDATE_EMAIL)) $errors['email'] = 'Adresse e-mail invalide.';
    if ($errors) return ['status' => 'error', 'message' => 'Merci de corriger les champs indiqués.', 'errors' => $errors, 'data' => $data];

    $record = ['at' => date('c'), 'ip' => $_SERVER['REMOTE_ADDR'] ?? '', 'page' => $_SERVER['REQUEST_URI'] ?? ''] + $data;
    $dir = __DIR__ . '/../data';
    if (!is_dir($dir)) @mkdir($dir, 0775, true);
    @file_put_contents($dir . '/messages.jsonl', json_encode($record, JSON_UNESCAPED_UNICODE) . "\n", FILE_APPEND | LOCK_EX);

    $to = (string)($_POST['_to'] ?? ($site['contact']['email'] ?? ''));
    if ($to !== '' && filter_var($to, FILTER_VALIDATE_EMAIL)) {
        $body = '';
        foreach ($data as $k => $v) $body .= ($fields[$k] ?? $k) . " : $v\n";
        @mail($to, '[' . ($site['name'] ?? 'Site') . '] Nouveau message', $body, "Content-Type: text/plain; charset=UTF-8\r\n" . (!empty($data['email']) ? 'Reply-To: ' . $data['email'] . "\r\n" : ''));
    }
    return ['status' => 'ok'];
}

function csrf_token(): string {
    if (empty($_SESSION['csrf'])) $_SESSION['csrf'] = bin2hex(random_bytes(16));
    return $_SESSION['csrf'];
}
