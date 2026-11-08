<?php
declare(strict_types=1);

/** Configuration du formulaire : champs, champ pot de miel, destinataire. */
function contact_config(string $destinataire): array
{
    return [
        'destinataire' => $destinataire,
        'honeypot' => 'site_web',
        'fields' => [
            'nom' => ['label' => 'Nom', 'type' => 'text', 'required' => true, 'autocomplete' => 'name'],
            'email' => ['label' => 'Adresse e-mail', 'type' => 'email', 'required' => true, 'autocomplete' => 'email'],
            'telephone' => ['label' => 'Téléphone', 'type' => 'tel', 'required' => false, 'autocomplete' => 'tel'],
            'sujet' => ['label' => 'Sujet', 'type' => 'text', 'required' => true],
            'message' => ['label' => 'Votre message', 'type' => 'textarea', 'required' => true],
        ],
    ];
}

/** Jeton CSRF stocké en session. Nécessite une session active. */
function csrf_token(): string
{
    if (!isset($_SESSION['csrf_token']) || !is_string($_SESSION['csrf_token']) || $_SESSION['csrf_token'] === '') {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }

    return $_SESSION['csrf_token'];
}

/**
 * Traite la requête. Renvoie l'état du formulaire :
 * values, errors (champ => message), global, success.
 */
function contact_process(array $config): array
{
    $etat = ['values' => [], 'errors' => [], 'global' => null, 'success' => false];
    foreach ($config['fields'] as $nom => $champ) {
        $etat['values'][$nom] = '';
    }

    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
        return $etat;
    }

    $post = $_POST;

    $attendu = $_SESSION['csrf_token'] ?? '';
    $recu = is_string($post['csrf_token'] ?? null) ? $post['csrf_token'] : '';
    if (!is_string($attendu) || $attendu === '' || !hash_equals($attendu, $recu)) {
        $etat['global'] = 'Votre session a expiré. Merci de renvoyer le formulaire.';
        return $etat;
    }

    foreach ($config['fields'] as $nom => $champ) {
        $brut = $post[$nom] ?? '';
        $etat['values'][$nom] = is_string($brut) ? trim($brut) : '';
    }

    // Pot de miel : un robot voit le succès, rien n'est enregistré.
    $pot = $post[$config['honeypot']] ?? '';
    if (is_string($pot) && $pot !== '') {
        $etat['success'] = true;
        return $etat;
    }

    foreach ($config['fields'] as $nom => $champ) {
        $valeur = $etat['values'][$nom];
        if ($valeur === '') {
            if ($champ['required']) {
                $etat['errors'][$nom] = 'Ce champ est obligatoire.';
            }
        } elseif (strlen($valeur) > 5000) {
            $etat['errors'][$nom] = 'Ce texte est trop long.';
        } elseif ($champ['type'] === 'email' && filter_var($valeur, FILTER_VALIDATE_EMAIL) === false) {
            $etat['errors'][$nom] = 'Adresse e-mail invalide.';
        }
    }

    if ($etat['errors'] === []) {
        contact_store($etat['values'], $config['destinataire']);
        $etat['success'] = true;
    }

    return $etat;
}

/** Ajoute le message en JSON (une ligne) dans data/messages.jsonl, puis envoie le mail. */
function contact_store(array $valeurs, string $destinataire): void
{
    $dossier = dirname(__DIR__) . '/data';
    if (!is_dir($dossier)) {
        mkdir($dossier, 0775, true);
    }

    $enregistrement = ['recu_le' => date('c')] + $valeurs;
    $ligne = json_encode($enregistrement, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n";
    file_put_contents($dossier . '/messages.jsonl', $ligne, FILE_APPEND | LOCK_EX);

    contact_notify($valeurs, $destinataire);
}

/** Retire les sauts de ligne d'une valeur destinée à un en-tête mail. */
function contact_clean_header(string $texte): string
{
    return str_replace(["\r", "\n"], ' ', $texte);
}

/** Envoi du message par mail(). L'échec d'envoi n'annule pas l'enregistrement. */
function contact_notify(array $valeurs, string $destinataire): void
{
    $lignes = [];
    foreach ($valeurs as $cle => $valeur) {
        $lignes[] = $cle . ' : ' . $valeur;
    }
    $corps = implode("\n", $lignes);

    $entetes = 'From: ' . contact_clean_header($destinataire) . "\r\n"
        . 'Reply-To: ' . contact_clean_header((string) ($valeurs['email'] ?? '')) . "\r\n"
        . "Content-Type: text/plain; charset=UTF-8\r\n";

    @mail($destinataire, 'Nouveau message depuis le site', $corps, $entetes);
}

/** Affiche le formulaire, ou le message de confirmation si l'envoi a réussi. */
function render_contact_form(array $config, array $etat): void
{
    if ($etat['success']) {
        echo '<div class="notice notice--success" role="status">';
        echo '<h3>Merci, votre message a bien été envoyé.</h3>';
        echo '<p>Nous vous répondrons dans les meilleurs délais.</p></div>';
        return;
    }

    echo '<form class="form" method="post" action="/contact" novalidate>';
    if ($etat['global'] !== null) {
        echo '<p class="notice notice--error" role="alert">' . e($etat['global']) . '</p>';
    }
    echo '<input type="hidden" name="csrf_token" value="' . e(csrf_token()) . '">';
    echo '<div class="hp" aria-hidden="true"><label>Laissez ce champ vide';
    echo '<input type="text" name="' . e($config['honeypot']) . '" tabindex="-1" autocomplete="off"></label></div>';

    foreach ($config['fields'] as $nom => $champ) {
        $id = 'champ-' . $nom;
        $erreur = $etat['errors'][$nom] ?? null;
        $valeur = $etat['values'][$nom] ?? '';

        $attributs = 'name="' . e($nom) . '" id="' . e($id) . '"';
        if ($champ['required']) {
            $attributs .= ' aria-required="true"';
        }
        if ($erreur !== null) {
            $attributs .= ' aria-invalid="true" aria-describedby="' . e($id) . '-erreur"';
        }
        if (isset($champ['autocomplete'])) {
            $attributs .= ' autocomplete="' . e($champ['autocomplete']) . '"';
        }

        echo '<div class="field' . ($erreur !== null ? ' field--error' : '') . '">';
        echo '<label for="' . e($id) . '">' . e($champ['label']);
        echo $champ['required'] ? ' <span class="req">(obligatoire)</span>' : '';
        echo '</label>';
        if ($champ['type'] === 'textarea') {
            echo '<textarea ' . $attributs . ' rows="6">' . e($valeur) . '</textarea>';
        } else {
            echo '<input type="' . e($champ['type']) . '" ' . $attributs . ' value="' . e($valeur) . '">';
        }
        if ($erreur !== null) {
            echo '<p class="error" id="' . e($id) . '-erreur">' . e($erreur) . '</p>';
        }
        echo '</div>';
    }

    echo '<button class="btn" type="submit">Envoyer le message</button>';
    echo '</form>';
}
