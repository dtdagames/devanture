<?php
// Bloc custom : inclut le fichier PHP du projet copié dans dist/custom/. $p contient les props libres.
$__file = __DIR__ . '/../custom/' . ($p['_file'] ?? '');
if ($__file !== '' && is_file($__file)) { include $__file; }
else { echo '<!-- custom : fichier introuvable ' . e($p['_file'] ?? '') . ' -->'; }
