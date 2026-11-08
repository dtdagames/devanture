<?php
declare(strict_types=1);

/** Échappement HTML systématique. */
function e(mixed $v): string { return htmlspecialchars((string)($v ?? ''), ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'); }

/** URL d'un fichier du dossier assets/. */
function asset(string $path): string { return '/assets/' . ltrim($path, '/'); }

/** URL d'une route interne ou lien externe tel quel. */
function url(string $to): string { return $to; }

/** Texte multi-paragraphes : lignes vides → <p>, sauts simples → <br>. */
function paragraphs(string $text): string {
    $blocks = preg_split('/\n\s*\n/', trim($text)) ?: [];
    return implode('', array_map(fn($b) => '<p>' . nl2br(e($b)) . '</p>', $blocks));
}

/** Première lettre (UTF-8) en majuscule, sans dépendre de mbstring. */
function first_letter(string $s): string {
    if (preg_match('/^\s*(\X)/u', $s, $m) !== 1) return '';
    return function_exists('mb_strtoupper') ? mb_strtoupper($m[1]) : strtoupper($m[1]);
}

/** Tronque une chaîne UTF-8 à $max caractères, sans dépendre de mbstring. */
function str_cut(string $s, int $max): string {
    if (function_exists('mb_substr')) return mb_substr($s, 0, $max);
    return preg_match('/^.{0,' . $max . '}/us', $s, $m) === 1 ? $m[0] : substr($s, 0, $max);
}

/** Rend un composant du catalogue avec ses props. */
function render_component(string $name, array $p): void {
    $file = __DIR__ . '/../components/' . $name . '.php';
    if (!is_file($file)) { echo '<!-- composant inconnu : ' . e($name) . ' -->'; return; }
    include $file;
}

function render_link(array $link, string $class = ''): string {
    return '<a class="' . e($class) . '" href="' . e(url($link['to'])) . '">' . e($link['label']) . '</a>';
}
