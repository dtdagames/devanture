<?php
declare(strict_types=1);

// Harnais de test en ligne de commande (pas de serveur) :
//   php tests/render.php <uri> [GET|POST] [json-des-champs-POST]
// En POST, une session fixe est préparée avec le jeton CSRF « jeton-test ».

$uri = $argv[1] ?? '/';
$method = strtoupper($argv[2] ?? 'GET');

$_SERVER['REQUEST_URI'] = $uri;
$_SERVER['REQUEST_METHOD'] = $method;
$_SERVER['HTTP_HOST'] = 'localhost';

if ($method === 'POST') {
    $fields = json_decode($argv[3] ?? '{}', true);
    $_POST = is_array($fields) ? $fields : [];
    $_POST['csrf'] = $_POST['csrf'] ?? 'jeton-test';
    session_id('garnier-test');
    session_start();
    $_SESSION['csrf'] = 'jeton-test';
    session_write_close();
}

require dirname(__DIR__) . '/index.php';

echo "\n[HTTP " . var_export(http_response_code(), true) . "]\n";
