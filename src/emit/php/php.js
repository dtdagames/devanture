import { EXPR_PHP, parse, toPhp } from '../../lang/expr.js';
import { segments, isRuntime } from '../../lang/resolve.js';

/** Convertit une valeur JS en littéral PHP (tableaux associatifs / listes). */
export function phpValue(v, indent = '') {
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'number') return String(v);
  if (typeof v === 'string') return "'" + v.replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
  const inner = indent + '  ';
  if (Array.isArray(v)) {
    if (!v.length) return '[]';
    return '[\n' + v.map(x => inner + phpValue(x, inner)).join(',\n') + '\n' + indent + ']';
  }
  const entries = Object.entries(v);
  if (!entries.length) return '[]';
  return '[\n' + entries.map(([k, x]) => `${inner}${phpValue(k)} => ${phpValue(x, inner)}`).join(',\n') + '\n' + indent + ']';
}

export const RENDER_PHP = `<?php
declare(strict_types=1);

/** Échappement HTML systématique. */
function e(mixed $v): string { return htmlspecialchars((string)($v ?? ''), ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'); }

/** URL d'un fichier du dossier assets/. */
function asset(string $path): string { return '/assets/' . ltrim($path, '/'); }

/** URL d'une route interne ou lien externe tel quel. */
function url(string $to): string { return $to; }

/** Valeur d'en-tête e-mail : telle quelle si ASCII, sinon encodée (RFC 2047, UTF-8 base64). Jamais de retour à la ligne. */
function sl_mail_encode(string $s): string {
    $s = str_replace(["\\r", "\\n"], ' ', $s);
    return preg_match('/[^\\x20-\\x7e]/', $s) ? '=?UTF-8?B?' . base64_encode($s) . '?=' : $s;
}

/** E-mail texte par mail() de PHP (le sendmail de l'hébergement) : expéditeur à l'adresse du domaine (ou MAIL_FROM dans .env), sujet encodé, en-têtes sûrs. $o : reply_to, from_name. */
function sl_mail(string $to, string $subject, string $body, array $o = []): bool {
    $to = trim(str_replace(["\\r", "\\n"], '', $to));
    if ($to === '' || !filter_var($to, FILTER_VALIDATE_EMAIL)) return false;
    $from = sl_env('MAIL_FROM');
    if ($from === '' || !filter_var($from, FILTER_VALIDATE_EMAIL)) {
        $host = strtolower(preg_replace('/:\\d+$/', '', (string)($_SERVER['HTTP_HOST'] ?? 'localhost')));
        $host = preg_replace('/^www\\./', '', $host) ?: 'localhost';
        $from = 'no-reply@' . $host;
    }
    $name = (string)($o['from_name'] ?? '');
    $h = ['From: ' . ($name !== '' ? sl_mail_encode($name) . ' <' . $from . '>' : $from), 'MIME-Version: 1.0', 'Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: 8bit', 'X-Mailer: Devanture'];
    $reply = trim(str_replace(["\\r", "\\n"], '', (string)($o['reply_to'] ?? '')));
    if ($reply !== '' && filter_var($reply, FILTER_VALIDATE_EMAIL)) $h[] = 'Reply-To: ' . $reply;
    return @mail($to, sl_mail_encode($subject), str_replace("\\r\\n", "\\n", $body), implode("\\r\\n", $h));
}

/** Manifeste des images compilées (dimensions, variantes WebP), produit à la compilation dans lib/images.php. */
function sl_images(): array {
    static $m = null;
    if ($m === null) { $f = __DIR__ . '/images.php'; $m = is_file($f) ? (require $f) : []; }
    return $m;
}

/** Balise <img> complète : width/height (pas de saut de mise en page), srcset des variantes WebP, chargement différé. $o : sizes, eager, class. */
function img(string $path, string $alt = '', array $o = []): string {
    $m = sl_images()[ltrim($path, '/')] ?? null;
    $a = '<img src="' . e(asset($path)) . '" alt="' . e($alt) . '"';
    if ($m) {
        $a .= ' width="' . (int)$m['w'] . '" height="' . (int)$m['h'] . '"';
        if (!empty($m['v'])) {
            $set = array_map(fn($v) => asset($v[1]) . ' ' . $v[0] . 'w', $m['v']);
            $a .= ' srcset="' . e(implode(', ', $set)) . '" sizes="' . e($o['sizes'] ?? '100vw') . '"';
        }
    }
    if (!empty($o['class'])) $a .= ' class="' . e($o['class']) . '"';
    $a .= empty($o['eager']) ? ' loading="lazy" decoding="async"' : ' fetchpriority="high"';
    return $a . '>';
}

/** URL de la plus petite variante WebP au moins aussi large que demandé (fond de bandeau, agrandissement), sinon l'original. */
function img_src(string $path, int $width = 1600): string {
    $m = sl_images()[ltrim($path, '/')] ?? null;
    if (!$m || empty($m['v'])) return asset($path);
    foreach ($m['v'] as $v) if ($v[0] >= $width) return asset($v[1]);
    $vs = $m['v'];
    return asset(end($vs)[1]);
}

/** Balisage léger sur un texte déjà échappé : **gras**, *italique*, [texte](/lien). Liens limités à /, #, https, mailto, tel. */
function inline_markup(string $escaped): string {
    $s = preg_replace('/\\*\\*(.+?)\\*\\*/s', '<strong>$1</strong>', $escaped);
    $s = preg_replace('/(?<![\\w*])\\*(?!\\s)(.+?)(?<!\\s)\\*(?![\\w*])/s', '<em>$1</em>', $s);
    return preg_replace_callback('/\\[([^\\]]+)\\]\\(((?:https?:\\/\\/|\\/|#|mailto:|tel:)[^\\s)]+)\\)/', fn($m) => '<a href="' . $m[2] . '">' . $m[1] . '</a>', $s);
}

/** Texte multi-paragraphes : lignes vides → <p>, sauts simples → <br>, lignes « - » → liste, balisage léger. */
function paragraphs(string $text): string {
    $blocks = preg_split('/\\n\\s*\\n/', trim($text)) ?: [];
    $out = '';
    foreach ($blocks as $b) {
        $lines = preg_split('/\\n/', trim($b));
        if ($lines && count(array_filter($lines, fn($l) => preg_match('/^\\s*[-•]\\s+/', $l))) === count($lines)) {
            $out .= '<ul>' . implode('', array_map(fn($l) => '<li>' . inline_markup(e(preg_replace('/^\\s*[-•]\\s+/', '', $l))) . '</li>', $lines)) . '</ul>';
        } else {
            $out .= '<p>' . inline_markup(nl2br(e($b))) . '</p>';
        }
    }
    return $out;
}

/** Icônes inline (SVG 24×24, trait courant) : sans police ni emoji, cohérentes sur tous les systèmes. */
function sl_icon(string $name): string {
    static $P = [
        'leaf' => 'M5 21c0-7 4-13 14-14-1 10-7 14-14 14zm0 0c3-5 6-8 10-10',
        'truck' => 'M1 7h12v9H1zM13 10h4l3 3v3h-7zM5 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm11 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
        'star' => 'M12 3l2.8 5.8 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.3l1.1-6.2L3 9.7l6.2-.9z',
        'heart' => 'M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z',
        'shield' => 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z',
        'clock' => 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zm0-13v5l3 2',
        'phone' => 'M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z',
        'tools' => 'M14.7 6.3a4 4 0 0 0 5 5L9 22l-3-3L16.7 8.3a4 4 0 0 0-2-2z',
        'wrench' => 'M14.7 6.3a4 4 0 0 0 5 5L9 22l-3-3L16.7 8.3a4 4 0 0 0-2-2z',
        'home' => 'M3 11l9-8 9 8v10h-6v-6H9v6H3z',
        'check' => 'M4 12l5 5L20 6',
        'sun' => 'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm0-15v2m0 16v2M2 12h2m16 0h2M4.9 4.9l1.4 1.4m11.4 11.4l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
        'gift' => 'M3 10h18v11H3zM3 10V7h18v3M12 7v14M12 7c-2-4-6-4-6-1s4 1 6 1zm0 0c2-4 6-4 6-1s-4 1-6 1z',
        'scale' => 'M12 3v18M4 21h16M6 7l-3 7a3 3 0 0 0 6 0zM18 7l-3 7a3 3 0 0 0 6 0zM7 7h10',
        'bread' => 'M4 10a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v8H4zM8 10v8m4-8v8',
        'croissant' => 'M4 14c0-5 4-9 9-9l3 3c0 5-4 9-9 9zm9-9l4 4m-7 10l-3 2m6-5l3 3',
        'cake' => 'M4 21h16v-7H4zM6 14v-3h12v3M12 11V8m0 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
        'drop' => 'M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z',
        'flame' => 'M12 3c1 4 5 6 5 11a5 5 0 0 1-10 0c0-2 1-3 1-3 0 2 1 3 2 3 0-5 2-7 2-11z',
        'car' => 'M3 13l2-5h14l2 5v5H3zM6 18a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zm12 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM3 13h18',
        'calendar' => 'M4 6h16v15H4zM4 10h16M8 3v4m8-4v4',
        'pin' => 'M12 21s7-7 7-12a7 7 0 0 0-14 0c0 5 7 12 7 12zm0-9a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
        'scissors' => 'M6 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm0 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM20 4L8.1 15.9M20 20L8.1 8.1',
        'brush' => 'M3 21c3 0 5-2 5-5l9-9 3 3-9 9c-3 0-5 2-8 2zM15 6l3 3',
        'camera' => 'M3 8h4l2-3h6l2 3h4v12H3zm9 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
        'book' => 'M4 4h8a3 3 0 0 1 3 3v14H7a3 3 0 0 0-3 3zm16 0h-5a3 3 0 0 0-3 3v14h5a3 3 0 0 1 3 3z',
        'coffee' => 'M4 8h13v7a5 5 0 0 1-10 0zm13 2h2a2 2 0 0 1 0 4h-2M6 20h11',
        'euro' => 'M18 6a7 7 0 1 0 0 12M4 10h10M4 14h10',
        'users' => 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm-7 10a7 7 0 0 1 14 0zm15-10a3 3 0 1 0 0-6M22 21a6 6 0 0 0-4-6',
        'lock' => 'M6 11h12v10H6zM8 11V7a4 4 0 0 1 8 0v4',
        'mail' => 'M3 6h18v12H3zm0 0l9 7 9-7',
        'globe' => 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18',
    ];
    $d = $P[$name] ?? $P['check'];
    return '<svg class="icon icon-' . e($name) . '" viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' . $d . '"/></svg>';
}

/** Première lettre (UTF-8) en majuscule, sans dépendre de mbstring. */
function first_letter(string $s): string {
    if (preg_match('/^\\s*(\\X)/u', $s, $m) !== 1) return '';
    return function_exists('mb_strtoupper') ? mb_strtoupper($m[1]) : strtoupper($m[1]);
}

/** Tronque une chaîne UTF-8 à $max caractères, sans dépendre de mbstring. */
function str_cut(string $s, int $max): string {
    if (function_exists('mb_substr')) return mb_substr($s, 0, $max);
    return preg_match('/^.{0,' . $max . '}/us', $s, $m) === 1 ? $m[0] : substr($s, 0, $max);
}

/** Variables d'environnement : fichier .env à la racine du site (jamais dans le DSL), puis environnement. */
function sl_env(string $key): string {
    static $env = null;
    if ($env === null) {
        $env = [];
        $f = __DIR__ . '/../.env';
        if (is_file($f)) foreach (file($f, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
            $line = trim($line);
            if ($line === '' || $line[0] === '#' || !str_contains($line, '=')) continue;
            [$k, $v] = explode('=', $line, 2); $env[trim($k)] = trim($v, " \\t\\"'");
        }
    }
    return $env[$key] ?? (getenv($key) ?: '');
}

/** Limitation de débit par IP (fenêtre glissante, fichier data/ratelimit.json). */
function sl_rate_limit(string $bucket, int $max, int $windowSec): bool {
    $dir = __DIR__ . '/../data'; if (!is_dir($dir)) @mkdir($dir, 0775, true);
    $f = $dir . '/ratelimit.json'; $now = time();
    $fh = fopen($f, 'c+'); if (!$fh) return true;
    flock($fh, LOCK_EX);
    $all = json_decode((string)stream_get_contents($fh), true) ?: [];
    $key = $bucket . '|' . ($_SERVER['REMOTE_ADDR'] ?? '?');
    $hits = array_values(array_filter($all[$key] ?? [], fn($t) => $t > $now - $windowSec));
    $allowed = count($hits) < $max;
    if ($allowed) $hits[] = $now;
    $all[$key] = $hits;
    foreach ($all as $k => $v) if (!$v || max($v) < $now - $windowSec) unset($all[$k]);
    ftruncate($fh, 0); rewind($fh); fwrite($fh, json_encode($all)); fflush($fh); flock($fh, LOCK_UN); fclose($fh);
    return $allowed;
}

/** Rend un composant du catalogue avec ses props. Une prop id pose une ancre juste avant la section. */
function render_component(string $name, array $p): void {
    $file = __DIR__ . '/../components/' . $name . '.php';
    if (!is_file($file)) { echo '<!-- composant inconnu : ' . e($name) . ' -->'; return; }
    if (!empty($p['id'])) echo '<span id="' . e($p['id']) . '" class="anchor" aria-hidden="true"' . (!empty($p['_variant']) ? ' data-variant="' . e($p['_variant']) . '"' : '') . (!empty($p['_fragment']) ? ' data-sl-fragment="' . e((string)($GLOBALS['SL_PAGE_ID'] ?? '')) . '"' : '') . (!empty($p['_exp']) ? ' data-sl-exp="' . e($p['_exp']) . '"' : '') . '></span>' . "\n";
    include $file;
}

function render_link(array $link, string $class = ''): string {
    return '<a class="' . e($class) . '" href="' . e(url($link['to'])) . '">' . e($link['label']) . '</a>';
}
` + EXPR_PHP + `
/** Champ d'un formulaire déclaré (effects.form) : libellé, saisie selon le type, valeur conservée, erreur. */
function sl_fn_field(mixed $form, mixed $name): string {
    $n = sl_str($name); $f = null; foreach (($form['fields'] ?? []) as $x) if ($x['name'] === $n) $f = $x;
    if (!$f) return '<!-- champ inconnu : ' . e($n) . ' -->';
    $val = (string)($form['data'][$n] ?? ''); $err = $form['errors'][$n] ?? null; $req = !empty($f['required']); $id = 'f-' . $n;
    $h = '<div class="field' . ($err ? ' has-error' : '') . '"><label for="' . e($id) . '">' . e($f['label']) . ($req ? ' *' : '') . '</label>';
    $ph = !empty($f['placeholder']) ? ' placeholder="' . e($f['placeholder']) . '"' : '';
    if ($f['type'] === 'textarea') $h .= '<textarea id="' . e($id) . '" name="' . e($n) . '" rows="5"' . ($req ? ' required' : '') . $ph . '>' . e($val) . '</textarea>';
    elseif ($f['type'] === 'select') { $h .= '<select id="' . e($id) . '" name="' . e($n) . '"' . ($req ? ' required' : '') . '><option value="">' . e($f['placeholder'] ?? 'Choisir…') . '</option>'; $cap = $form['rules']['capacity'] ?? null; $taken = ($cap && ($cap['by'] ?? null) === $n && !empty($form['store']) && function_exists('sl_reg_state')) ? sl_reg_state((string)$form['store'], $form['rules'])['taken'] : null; foreach (($f['options'] ?? []) as $o) { $isFull = $taken !== null && (int)($taken[(string)$o] ?? 0) >= (int)$cap['max']; $h .= '<option value="' . e($o) . '"' . ((string)$o === $val ? ' selected' : '') . ($isFull && empty($cap['waitlist']) ? ' disabled' : '') . '>' . e($o) . ($isFull ? (empty($cap['waitlist']) ? ' — complet' : ' — liste d\\'attente') : '') . '</option>'; } $h .= '</select>'; }
    else $h .= '<input id="' . e($id) . '" type="' . e($f['type']) . '" name="' . e($n) . '" value="' . e($val) . '"' . ($req ? ' required' : '') . $ph . ($f['type'] === 'number' ? ' inputmode="numeric"' : '') . '>';
    if ($err) $h .= '<div class="field-error">' . e($err) . '</div>';
    return $h . '</div>';
}

/** Lecture à la visite (fonctionnement › lit d'un composant) : une source est un service de la cible ; null si ce site ne l'a pas. */
function sl_source(array $p, string $key, string $id, array $a = []): mixed {
    if (defined('SL_FIXTURES') && array_key_exists('_' . $key, $p)) return $p['_' . $key];
    $f = 'sl_src_' . $id;
    return function_exists($f) ? $f($a) : null;
}
function sl_hm(string $hm): string { return ltrim(substr($hm, 0, 2), '0') . ' h' . (substr($hm, 3, 2) === '00' ? '' : ' ' . substr($hm, 3, 2)); }
/** Source « horaires du moment » : état à l'heure de la visite (ouvert, prochaine ouverture) et plages de chaque jour. */
function sl_src_hours(array $a): array {
    static $DAYS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
    $days = is_array($a['days'] ?? null) ? $a['days'] : [];
    $byDay = [];
    foreach ($days as $d) $byDay[$d['day']] = (!empty($d['closed']) || empty($d['slots'])) ? [] : $d['slots'];
    try { $tz = new DateTimeZone(sl_str($a['timezone'] ?? '') ?: 'Europe/Paris'); } catch (Throwable $e) { $tz = new DateTimeZone('Europe/Paris'); }
    $now = new DateTime('now', $tz);
    $todayIdx = (int)$now->format('N') - 1; $today = $DAYS[$todayIdx];
    $nowMin = (int)$now->format('G') * 60 + (int)$now->format('i');
    $toMin = fn(string $hm) => (int)substr($hm, 0, 2) * 60 + (int)substr($hm, 3, 2);
    $open = false; $closesAt = null;
    foreach ($byDay[$today] ?? [] as $sl) {
        if ($nowMin >= $toMin(substr($sl, 0, 5)) && $nowMin < $toMin(substr($sl, 6, 5))) { $open = true; $closesAt = substr($sl, 6, 5); break; }
    }
    if ($open) $text = 'Ouvert actuellement · ferme à ' . sl_hm($closesAt);
    else {
        $next = null;
        for ($i = 0; $i < 8 && $next === null; $i++) {
            $d = $DAYS[($todayIdx + $i) % 7];
            foreach ($byDay[$d] ?? [] as $sl) {
                $start = $toMin(substr($sl, 0, 5));
                if ($i > 0 || $start > $nowMin) { $next = ($i === 0 ? 'aujourd\\'hui' : ($i === 1 ? 'demain' : $d)) . ' à ' . sl_hm(substr($sl, 0, 5)); break; }
            }
        }
        $text = 'Fermé actuellement' . ($next ? ' · ouvre ' . $next : '');
    }
    $out = ['open' => $open, 'status_text' => $text, 'days' => []];
    foreach ($days as $d) {
        $slots = $byDay[$d['day']];
        $out['days'][] = ['name' => ucfirst($d['day']), 'slots_text' => $slots ? implode(' et ', array_map(fn($sl) => sl_hm(substr($sl, 0, 5)) . ' – ' . sl_hm(substr($sl, 6, 5)), $slots)) : null, 'today' => $d['day'] === $today];
    }
    return $out;
}
/** Source « saisie du contact » : champs du formulaire de la page, saisie conservée, erreurs, envoi réussi. */
function sl_src_contact(array $a): array {
    global $formResult; $r = $formResult ?? ['status' => null]; $old = $r['data'] ?? []; $errs = $r['errors'] ?? [];
    $fields = [];
    foreach ((is_array($a['fields'] ?? null) ? $a['fields'] : []) as $f) {
        if (!is_array($f) || !isset($f['name'])) continue;
        $n = $f['name']; $val = $old[$n] ?? ''; $w = $f['when'] ?? null;
        $shown = !$w || in_array((string)($old[$w['field']] ?? ''), array_map('strval', $w['values']), true);
        $opts = []; foreach (($f['options'] ?? []) as $o) $opts[] = ['value' => $o, 'selected' => (string)$val === (string)$o];
        $fields[] = ['name' => $n, 'label' => $f['label'], 'type' => $f['type'], 'long' => $f['type'] === 'textarea', 'choice' => $f['type'] === 'select', 'numeric' => $f['type'] === 'number',
            'required' => !empty($f['required']), 'value' => (string)$val, 'error' => $errs[$n] ?? null, 'placeholder' => $f['placeholder'] ?? null, 'options' => $opts,
            'when_field' => $w ? $w['field'] : null, 'when_values' => $w ? json_encode(array_map('strval', $w['values']), JSON_UNESCAPED_UNICODE) : null, 'hidden' => !$shown];
    }
    return ['sent' => ($r['status'] ?? null) === 'ok', 'error' => ($r['status'] ?? null) === 'error' ? (string)($r['message'] ?? '') : null, 'csrf' => (string)($r['csrf'] ?? ''), 'fields' => $fields];
}
/** Source « consultations récentes » : la mémoire du visiteur, résolue en titres et liens. */
function sl_src_recent(array $a): array {
    if (!function_exists('sl_recent')) return [];
    $kinds = is_array($a['kinds'] ?? null) && $a['kinds'] ? $a['kinds'] : ['products', 'sections'];
    $out = [];
    foreach (sl_recent((int)sl_num($a['limit'] ?? 0) ?: 4, $kinds) as $it) {
        $isP = $it['kind'] === 'product';
        $out[] = ['title' => $it['title'], 'url' => $it['url'], 'is_product' => $isP, 'image' => $isP ? ($it['image'] ?? null) : null, 'meta' => $isP ? $it['price'] : $it['page']];
    }
    return $out;
}
/** Jeton des formulaires d'action (panier, commande) et marqueur d'un événement de mesure : HTML sûr, échappé ici. */
function sl_fn_csrf(): string { return '<input type="hidden" name="_csrf" value="' . e(csrf_token()) . '">'; }
function sl_fn_event(mixed $name, mixed ...$kv): string {
    $d = []; for ($i = 0; $i + 1 < count($kv); $i += 2) $d[sl_str($kv[$i])] = $kv[$i + 1];
    return '<span hidden data-sl-event="' . e(sl_str($name)) . '"' . ($d ? ' data-sl-data="' . e(json_encode($d)) . '"' : '') . '></span>';
}
`;

export const FORMS_PHP = `<?php
declare(strict_types=1);

/** Traitement du formulaire de contact : validation, anti-spam, stockage JSONL, e-mail si possible. */
function handle_contact_form(array $site, ?array $config): array {
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST' || ($_POST['_form'] ?? '') !== 'contact') return ['status' => null];
    if ($config === null) return ['status' => 'error', 'message' => 'Aucun formulaire sur cette page.'];
    if (!hash_equals($_SESSION['csrf'] ?? '', (string)($_POST['_csrf'] ?? ''))) return ['status' => 'error', 'message' => 'Session expirée, merci de réessayer.'];
    if (!empty($_POST['website'])) return ['status' => 'ok']; // honeypot : on fait semblant

    [$data, $errors] = contact_validate($config['fields'] ?? [], $_POST);
    if ($errors) return ['status' => 'error', 'message' => 'Merci de corriger les champs indiqués.', 'errors' => $errors, 'data' => $data];
    $id = contact_store($config, $data, $site, 'form');
    return ['status' => 'ok', 'id' => $id];
}

/** Validation d'un envoi selon la définition des champs fixée à la compilation. Renvoie [data, erreurs]. */
function contact_validate(array $fields, array $input): array {
    $data = []; $errors = [];
    foreach ($fields as $f) {
        $k = $f['name'];
        // Champ conditionnel : ignoré (ni lu, ni exigé) si la condition n'est pas remplie.
        if (!empty($f['when']) && !in_array(trim((string)($input[$f['when']['field']] ?? '')), array_map('strval', $f['when']['values']), true)) continue;
        $v = trim((string)($input[$k] ?? ''));
        if ($v === '') { if (!empty($f['required'])) $errors[$k] = $f['label'] . ' est obligatoire.'; continue; }
        $v = str_cut($v, $f['type'] === 'textarea' ? 5000 : 200);
        switch ($f['type']) {
            case 'email': if (!filter_var($v, FILTER_VALIDATE_EMAIL)) $errors[$k] = 'Adresse e-mail invalide.'; break;
            case 'tel': if (!preg_match('/^[0-9 +().\\-]{6,30}$/', $v)) $errors[$k] = 'Numéro de téléphone invalide.'; break;
            case 'number': if (!is_numeric(str_replace(',', '.', $v))) $errors[$k] = 'Nombre attendu.'; break;
            case 'date': if (!preg_match('/^\\d{4}-\\d{2}-\\d{2}$/', $v) || !checkdate((int)substr($v, 5, 2), (int)substr($v, 8, 2), (int)substr($v, 0, 4))) $errors[$k] = 'Date invalide.'; break;
            case 'select': if (!in_array($v, array_map('strval', $f['options'] ?? []), true)) $errors[$k] = 'Choix invalide.'; break;
        }
        $data[$k] = $v;
    }
    return [$data, $errors];
}

/** Enregistre le message (JSONL) et l'envoie par e-mail. Renvoie un identifiant. */
function contact_store(array $config, array $data, array $site, string $source): string {
    $fields = $config['fields'] ?? []; $labels = [];
    foreach ($fields as $f) $labels[$f['name']] = $f['label'];
    $id = strtoupper(substr(bin2hex(random_bytes(4)), 0, 8));
    $record = ['id' => $id, 'at' => date('c'), 'source' => $source, 'ip' => $_SERVER['REMOTE_ADDR'] ?? '', 'page' => $_SERVER['REQUEST_URI'] ?? ''] + $data;
    $to = (string)($config['to'] ?? ($site['contact']['email'] ?? ''));
    $sent = null;
    if ($to !== '' && filter_var($to, FILTER_VALIDATE_EMAIL)) {
        $body = ($source === 'agent' ? "(envoyé par un assistant)\\n" : '');
        foreach ($data as $k => $v) $body .= ($labels[$k] ?? $k) . " : $v\\n";
        $reply = '';
        foreach ($fields as $f) if ($f['type'] === 'email' && !empty($data[$f['name']])) { $reply = (string)$data[$f['name']]; break; }
        $sent = sl_mail($to, '[' . ($site['name'] ?? 'Site') . '] Nouveau message', $body, ['reply_to' => $reply, 'from_name' => (string)($site['name'] ?? '')]);
    }
    // Statut d'envoi visible dans le back-office : none (pas de destinataire), sent, failed (mail() a refusé : le message reste enregistré).
    $record['mail'] = $sent === null ? 'none' : ($sent ? 'sent' : 'failed');
    sl_store_append('messages', $record);
    return $id;
}

/**
 * Point d'entrée pour agents : GET /api/contact décrit les champs, POST /api/contact (JSON, Bearer AGENT_API_TOKEN) envoie.
 * Désactivé (503) tant que AGENT_API_TOKEN n'est pas défini dans .env.
 */
function contact_api(?array $config, array $site): void {
    header('Content-Type: application/json; charset=UTF-8');
    $out = fn(int $code, array $body) => (function () use ($code, $body) { http_response_code($code); echo json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); exit; })();
    if (!$config) $out(404, ['ok' => false, 'error' => 'no_contact_form']);
    $token = sl_env('AGENT_API_TOKEN');
    $describe = ['ok' => true, 'fields' => array_map(fn($f) => array_filter(['name' => $f['name'], 'label' => $f['label'], 'type' => $f['type'], 'required' => (bool)$f['required'], 'options' => $f['options'], 'when' => $f['when']], fn($v) => $v !== null && $v !== false), $config['fields'] ?? []), 'auth' => 'Authorization: Bearer <AGENT_API_TOKEN>', 'content_type' => 'application/json', 'enabled' => $token !== ''];
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'GET') $out(200, $describe);
    if ($token === '') $out(503, ['ok' => false, 'error' => 'api_disabled', 'hint' => 'Définir AGENT_API_TOKEN dans .env']);
    $auth = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (!preg_match('/^Bearer\\s+(\\S+)$/', $auth, $m) || !hash_equals($token, $m[1])) $out(401, ['ok' => false, 'error' => 'unauthorized']);
    if (!sl_rate_limit('api_contact', 20, 3600)) $out(429, ['ok' => false, 'error' => 'rate_limited', 'retry_after' => 3600]);
    $input = json_decode((string)file_get_contents('php://input', false, null, 0, 16384), true);
    if (!is_array($input)) $out(400, ['ok' => false, 'error' => 'invalid_json']);
    [$data, $errors] = contact_validate($config['fields'] ?? [], $input);
    if ($errors) $out(400, ['ok' => false, 'error' => 'validation', 'errors' => $errors]);
    $id = contact_store($config, $data, $site, 'agent');
    $out(200, ['ok' => true, 'id' => $id, 'message' => $site['name'] . ' a bien reçu votre demande.']);
}

/** Formulaires déclarés par les composants (effects.form) : validation, enregistrement dans leur collection, e-mail ; résultats par nom. */
function handle_declared_forms(array $site, array $page): void {
    $GLOBALS['SL_FORMS'] = [];
    foreach (($page['forms'] ?? []) as $name => $cfg) {
        $r = ['status' => null, 'errors' => [], 'data' => [], 'fields' => $cfg['fields'] ?? [], 'name' => $name, 'success' => $cfg['success'] ?? null, 'message' => null, 'store' => $cfg['store'] ?? null, 'rules' => $cfg['rules'] ?? null];
        if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST' && ($_POST['_form'] ?? '') === $name) {
            if (!hash_equals($_SESSION['csrf'] ?? '', (string)($_POST['_csrf'] ?? ''))) { $r['status'] = 'error'; $r['message'] = 'Session expirée, merci de réessayer.'; }
            elseif (!empty($_POST['website'])) { $r['status'] = 'ok'; }
            else {
                [$data, $errors] = contact_validate($cfg['fields'] ?? [], $_POST);
                if ($errors) { $r['status'] = 'error'; $r['message'] = 'Merci de corriger les champs indiqués.'; $r['errors'] = $errors; $r['data'] = $data; }
                elseif (!empty($cfg['rules'])) {
                    // Registre à règles : contrôle et enregistrement dans la même section verrouillée ; l'e-mail part après, hors verrou.
                    $rules = $cfg['rules']; $store = (string)$cfg['store'];
                    $res = sl_reg_submit($store, $rules, $data, function (bool $waiting) use (&$r, $name, $cfg, $data, $store) { $rec = sl_form_record($name, $data, $waiting ? ['waiting' => true] : []); $r['id'] = $rec['id']; sl_store_append($store, $rec + ['mail' => 'none']); });
                    if (!$res['ok']) { $r['status'] = 'error'; $r['message'] = $res['message']; $r['data'] = $data; if (!empty($res['field'])) $r['errors'] = [$res['field'] => $res['message']]; }
                    else {
                        $r['status'] = 'ok'; $waiting = !empty($res['waiting']);
                        if ($waiting) { $r['waiting'] = true; $r['success'] = $rules['capacity']['waitlist_message'] ?? 'Il n\\'y a plus de place pour l\\'instant : vous êtes sur la liste d\\'attente, nous vous écrivons si une place se libère.'; }
                        $mail = sl_form_notify($name, $cfg, $data, $site, $waiting ? 'Statut : liste d\\'attente' : '');
                        if ($mail !== 'none') sl_store_update($store, (string)$r['id'], fn($d) => array_merge($d, ['mail' => $mail]));
                    }
                }
                else { $r['status'] = 'ok'; $r['id'] = sl_form_store($name, $cfg, $data, $site); }
            }
        }
        $GLOBALS['SL_FORMS'][$name] = $r;
    }
}
/** Fiche d'un envoi : identifiant, date, provenance, puis les champs saisis et ce que la cible y ajoute (waiting). */
function sl_form_record(string $name, array $data, array $extra = []): array {
    return ['id' => strtoupper(substr(bin2hex(random_bytes(4)), 0, 8)), 'at' => date('c'), 'form' => $name, 'ip' => $_SERVER['REMOTE_ADDR'] ?? '', 'page' => $_SERVER['REQUEST_URI'] ?? ''] + $data + $extra;
}
/** E-mail d'un envoi au destinataire du formulaire ; renvoie none | sent | failed. */
function sl_form_notify(string $name, array $cfg, array $data, array $site, string $note = ''): string {
    $labels = []; foreach (($cfg['fields'] ?? []) as $f) $labels[$f['name']] = $f['label'];
    $notify = $cfg['notify'] ?? true;
    $to = is_string($notify) ? $notify : (string)($cfg['to'] ?? ($site['contact']['email'] ?? ''));
    if ($notify === false || $to === '' || !filter_var($to, FILTER_VALIDATE_EMAIL)) return 'none';
    $body = ''; foreach ($data as $k => $v) $body .= ($labels[$k] ?? $k) . " : $v\\n";
    if ($note !== '') $body .= $note . "\\n";
    $reply = ''; foreach (($cfg['fields'] ?? []) as $f) if ($f['type'] === 'email' && !empty($data[$f['name']])) { $reply = (string)$data[$f['name']]; break; }
    return sl_mail($to, '[' . ($site['name'] ?? 'Site') . '] ' . ($cfg['label'] ?? $name), $body, ['reply_to' => $reply, 'from_name' => (string)($site['name'] ?? '')]) ? 'sent' : 'failed';
}
function sl_form_store(string $name, array $cfg, array $data, array $site): string {
    $record = sl_form_record($name, $data);
    $record['mail'] = sl_form_notify($name, $cfg, $data, $site);
    sl_store_append((string)$cfg['store'], $record);
    return $record['id'];
}

/** Registres à règles (fonctionnement › formulaire : places, liste d'attente, une fois par). Un verrou par registre. */
function sl_reg_lock(string $store, callable $fn): mixed {
    $dir = __DIR__ . '/../data'; if (!is_dir($dir)) @mkdir($dir, 0775, true);
    $fh = @fopen($dir . '/.' . preg_replace('/[^a-z0-9_]/', '', $store) . '.lock', 'c');
    if ($fh) flock($fh, LOCK_EX);
    try { return $fn(); } finally { if ($fh) { flock($fh, LOCK_UN); fclose($fh); } }
}
/** Places que compte un envoi : la valeur du champ « comptées par », sinon une. */
function sl_reg_qty(array $rules, array $d): int { $q = $rules['capacity']['qty'] ?? null; return $q ? max(1, (int)($d[$q] ?? 1)) : 1; }
function sl_reg_group(array $rules, array $d): string { $b = $rules['capacity']['by'] ?? null; return $b ? (string)($d[$b] ?? '') : ''; }
/** État d'un registre : places prises et en attente par groupe (envois annulés exclus). */
function sl_reg_state(string $store, ?array $rules = null): array {
    $rules ??= ($GLOBALS['SL_REGISTERS'][$store]['rules'] ?? []);
    $taken = []; $waiting = []; $entries = 0; $total = 0; $wtotal = 0;
    foreach (sl_store_all($store) as $d) {
        if (!empty($d['cancelled'])) continue;
        $g = sl_reg_group($rules, $d); $q = sl_reg_qty($rules, $d);
        if (!empty($d['waiting'])) { $waiting[$g] = ($waiting[$g] ?? 0) + $q; $wtotal += $q; continue; }
        $taken[$g] = ($taken[$g] ?? 0) + $q; $total += $q; $entries++;
    }
    return ['taken' => $taken, 'waiting' => $waiting, 'entries' => $entries, 'total' => $total, 'waiting_total' => $wtotal];
}
/** Places libres pour le groupe d'un envoi (null : registre sans limite). */
function sl_reg_left(string $store, array $rules, array $d): ?int {
    $c = $rules['capacity'] ?? null; if (!$c) return null;
    return (int)$c['max'] - (int)(sl_reg_state($store, $rules)['taken'][sl_reg_group($rules, $d)] ?? 0);
}
/**
 * Applique les règles puis enregistre, sous le verrou du registre. $save(bool $waiting) écrit l'envoi.
 * Renvoie ['ok' => bool, 'waiting' => bool, 'message' => string, 'field' => ?string].
 */
function sl_reg_submit(string $store, array $rules, array $data, callable $save): array {
    return sl_reg_lock($store, function () use ($store, $rules, $data, $save) {
        $u = $rules['unique'] ?? null;
        if ($u) {
            $key = fn(array $d) => implode('|', array_map(fn($k) => rawurlencode(sl_utf8_lower(trim((string)($d[$k] ?? '')))), $u['fields']));
            $mine = $key($data);
            foreach (sl_store_all($store) as $d) if (empty($d['cancelled']) && $key($d) === $mine) return ['ok' => false, 'message' => $u['message'] ?? 'Vous êtes déjà inscrit.'];
        }
        $waiting = false; $c = $rules['capacity'] ?? null;
        if ($c) {
            $q = 1;
            if (!empty($c['qty'])) {
                $raw = str_replace(',', '.', (string)($data[$c['qty']] ?? ''));
                if (!is_numeric($raw) || (float)$raw != (int)$raw || (int)$raw < 1) return ['ok' => false, 'field' => $c['qty'], 'message' => 'Indiquez un nombre entier, au moins 1.'];
                $q = (int)$raw;
                if ($q > (int)$c['max']) return ['ok' => false, 'field' => $c['qty'], 'message' => 'Au plus ' . (int)$c['max'] . ' par envoi.'];
            }
            $left = (int)sl_reg_left($store, $rules, $data);
            if ($q > $left) {
                if (!empty($c['waitlist'])) $waiting = true;
                else return ['ok' => false, 'message' => ($c['message'] ?? 'Il n\\'y a plus de place.') . ($left > 0 ? ($left === 1 ? ' Il reste une place.' : ' Il reste ' . $left . ' places.') : '')];
            }
        }
        $save($waiting);
        return ['ok' => true, 'waiting' => $waiting, 'message' => ''];
    });
}
/** Source « état du registre » : places prises, restantes, en attente ; par groupe quand les places sont comptées par groupe. */
function sl_src_register(array $a): ?array {
    $store = sl_str($a['store'] ?? ''); $reg = $GLOBALS['SL_REGISTERS'][$store] ?? null;
    if (!$reg || !function_exists('sl_store_all')) return null;
    $rules = $reg['rules'] ?? []; $c = $rules['capacity'] ?? null; $st = sl_reg_state($store, $rules);
    $text = fn(int $left) => $left <= 0 ? 'Complet' : ($left === 1 ? 'Dernière place' : $left . ' places restantes');
    $out = ['limited' => (bool)$c, 'count' => $st['total'], 'entries' => $st['entries'], 'waiting' => $st['waiting_total'], 'capacity' => null, 'left' => null, 'full' => false, 'left_text' => null, 'groups' => []];
    if (!$c) return $out;
    $max = (int)$c['max'];
    if (empty($c['by'])) { $left = max(0, $max - (int)($st['taken'][''] ?? 0)); return ['capacity' => $max, 'left' => $left, 'full' => $left <= 0, 'left_text' => $text($left)] + $out; }
    $known = $reg['options'] ?? []; $values = $known;
    foreach (array_keys($st['taken'] + $st['waiting']) as $g) if ((string)$g !== '' && !in_array((string)$g, $values, true)) $values[] = (string)$g;
    $sum = 0; $groups = [];
    foreach ($values as $g) { $t = (int)($st['taken'][$g] ?? 0); $left = max(0, $max - $t); $sum += $left; $groups[] = ['value' => (string)$g, 'taken' => $t, 'left' => $left, 'full' => $left <= 0, 'left_text' => $text($left), 'waiting' => (int)($st['waiting'][$g] ?? 0)]; }
    return ['capacity' => $max, 'left' => $known ? $sum : null, 'full' => $known ? $sum <= 0 : false, 'left_text' => $known ? $text($sum) : null, 'groups' => $groups] + $out;
}
/** État du formulaire d'un composant, pour son gabarit : status, message, errors, data (alias values), fields, success. */
function sl_form_state(string $name): array {
    $r = $GLOBALS['SL_FORMS'][$name] ?? ['status' => null, 'errors' => [], 'data' => [], 'fields' => [], 'name' => $name, 'success' => null, 'message' => null];
    $r['values'] = $r['data']; $r['ok'] = $r['status'] === 'ok'; $r['failed'] = $r['status'] === 'error';
    return $r;
}

/** Session paresseuse : reprise si un cookie existe, créée seulement quand un état est écrit. Une première visite reste sans cookie (cache statique). */
function sl_session(bool $create = true): void {
    if (session_status() === PHP_SESSION_ACTIVE) return;
    if ($create || isset($_COOKIE[session_name()])) session_start();
}
function csrf_token(): string {
    sl_session();
    if (empty($_SESSION['csrf'])) $_SESSION['csrf'] = bin2hex(random_bytes(16));
    return $_SESSION['csrf'];
}
`;

export function indexPhp(site, routes, { jsonld = '', agents = true, shop = null, dynamic = [], staticEnabled = true, stores = [], collections = [], registers = {} } = {}) {
  return `<?php
declare(strict_types=1);
// Généré par sitec. Front controller : route → page. Compatible \`php -S host:port index.php\`.
require __DIR__ . '/lib/render.php';
require __DIR__ . '/lib/store.php';
require __DIR__ . '/lib/forms.php';
require __DIR__ . '/lib/segments.php';
require __DIR__ . '/lib/admin.php';
require __DIR__ . '/lib/deploy.php';
sl_session(false);
${shop ? "require __DIR__ . '/lib/shop.php';" : ''}

$site = ${phpValue(site)};
$routes = ${phpValue(routes)};
$dynamic = ${phpValue(dynamic)};
$SHOP = ${phpValue(shop)};
$jsonld = ${phpValue(jsonld)};
$product = null; $order = null; $SL_ITEM = null; $checkoutResult = ['status' => null];
$SL_STATIC = ${staticEnabled ? 'true' : 'false'};
$SL_STORES = ${phpValue(stores)};
$SL_REGISTERS = ${phpValue(registers)};
$SL_COLLECTIONS = ${phpValue(collections)};
/** Élément d'une collection compilée (lib/data/<nom>.json), par id. */
function sl_collection(string $name): array { static $c = []; if (!isset($c[$name])) { $f = __DIR__ . '/lib/data/' . preg_replace('/[^a-z0-9_]/', '', $name) . '.json'; $c[$name] = is_file($f) ? (json_decode((string)file_get_contents($f), true) ?: []) : []; } return $c[$name]; }
function sl_collection_item(string $name, string $id): ?array { foreach (sl_collection($name) as $it) if (($it['id'] ?? null) === $id) return $it; return null; }

$path = rtrim(parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/', '/') ?: '/';

// Déploiement signé : une version compilée remplace la précédente, données et secrets conservés (DEPLOY_SECRET dans .env).
if ($path === '/_deploy') sl_deploy_handle();

// Fragments : une section rendue pour le profil courant (personnalisation sans rechargement, îlots dans une page servie statique).
if ($path === '/_fragment') {
    $pid = (string)($_GET['page'] ?? ''); $sid = (string)($_GET['section'] ?? ''); $entry = null;
    if (preg_match('/^[a-z0-9_-]{1,64}$/i', $pid) && preg_match('/^[a-z0-9_-]{1,64}$/i', $sid)) foreach ($routes as $r) if ($r['file'] === $pid . '.php') $entry = $r;
    if ($entry === null) { http_response_code(404); exit; }
    header('Content-Type: text/html; charset=UTF-8'); header('Cache-Control: no-store'); header('X-SL-Segments: ' . implode(',', sl_segments()));
    $GLOBALS['SL_PAGE_ID'] = $pid; $GLOBALS['SL_ONLY'] = $sid; $page = $entry; $current = $path; $formResult = ['status' => null];
    include __DIR__ . '/pages/' . $entry['file']; exit;
}

// Back-office compilé : données d'exploitation seulement, jeton ADMIN_TOKEN dans .env.
if ($path === '/_admin' || str_starts_with($path, '/_admin/')) admin_dispatch($path, $site);
if ($path === '/_studio' || str_starts_with($path, '/_studio/')) sl_studio_serve($path);

// Personnalisation : journal d'événements (variant_shown, etc.) envoyé par le navigateur.
if ($path === '/_event' && ($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
    $body = json_decode((string)file_get_contents('php://input', false, null, 0, 2048), true);
    if (is_array($body) && in_array($body['name'] ?? null, ['exp_exposure', 'exp_conversion'], true)) {
        $row = sl_exp_event($body['name'], is_array($body['data'] ?? null) ? $body['data'] : []);
        if ($row !== null) sl_store_append('events', ['at' => date('c'), 'name' => $body['name'], 'data' => $row, 'segments' => []]);
    } elseif (is_array($body) && isset($body['name']) && preg_match('/^[a-z_]{1,32}$/', (string)$body['name'])) {
        sl_store_append('events', ['at' => date('c'), 'name' => $body['name'], 'data' => is_array($body['data'] ?? null) ? array_slice($body['data'], 0, 8, true) : null, 'segments' => sl_segments()]);
    }
    http_response_code(204); exit;
}

// Jumeau pour agents : données structurées, instructions et point d'entrée d'action.
${agents ? `if ($path === '/site.json' && is_file(__DIR__ . '/site.json')) { header('Content-Type: application/json; charset=UTF-8'); readfile(__DIR__ . '/site.json'); exit; }
if ($path === '/llms.txt' && is_file(__DIR__ . '/llms.txt')) { header('Content-Type: text/plain; charset=UTF-8'); readfile(__DIR__ . '/llms.txt'); exit; }
if ($path === '/api/contact') { $cfg = null; foreach ($routes as $r) if (!empty($r['contact'])) { $cfg = $r['contact']; break; } contact_api($cfg, $site); }` : ''}

// Fichiers statiques sous php -S : seuls les assets sont servis tels quels (jamais data/, lib/, pages/…).
if (PHP_SAPI === 'cli-server' && (str_starts_with($path, '/assets/') || str_starts_with($path, '/cache/') || in_array($path, ['/sw.js', '/manifest.webmanifest', '/offline.html'], true)) && is_file(__DIR__ . $path)) return false;
if (PHP_SAPI === 'cli-server' && $path === '/favicon.ico') { http_response_code(404); return true; }

${shop ? `// Boutique : actions sur le panier et webhook de paiement.
if ($path === '/_cart' && ($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') shop_handle_cart();
if ($path === '/_stripe/webhook' && ($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') shop_stripe_webhook($site);
` : ''}
// Version texte simplifié : /lisible<route> sert la page lisible compilée.
if (str_starts_with($path, '/lisible')) {
    $target = substr($path, 8) ?: '/'; $target = ($target === '' || $target === '/') ? '/' : rtrim($target, '/');
    if (isset($routes[$target]['readable']) && is_file(__DIR__ . $routes[$target]['readable'])) { header('Content-Type: text/html; charset=UTF-8'); readfile(__DIR__ . $routes[$target]['readable']); exit; }
    http_response_code(404); echo 'Version texte introuvable.'; exit;
}

// Routes dynamiques (/produit/[id], /commande/[id]) : l'entité est chargée avant le rendu.
$page = $routes[$path] ?? null;
if ($page === null) {
    foreach ($dynamic as $d) {
        if (preg_match($d['pattern'], $path, $m)) {
            if ($d['source'] === 'products') { $product = shop_product($m[1]); if ($product) $page = $d; }
            elseif ($d['source'] === 'orders') { $order = shop_order($m[1], (string)($_GET['t'] ?? '')); if ($order) $page = $d; }
            else { $SL_ITEM = sl_collection_item((string)$d['source'], $m[1]); if ($SL_ITEM) $page = $d; }
            break;
        }
    }
}
if ($page !== null) {
    $current = $path; $GLOBALS['SL_PAGE_ID'] = substr((string)$page['file'], 0, -4);
    // Titres SEO des pages dynamiques : {{product.name}}, {{order.id}}…
    $page['seo'] = array_map(fn($v) => is_string($v) ? preg_replace_callback('/\\{\\{\\s*(product|order|item)((?:\\.[a-z_][a-z0-9_]*)+)\\s*\\}\\}/', fn($mm) => sl_str(sl_get(match ($mm[1]) { 'product' => $product, 'order' => $order, default => $SL_ITEM }, ...explode('.', ltrim($mm[2], '.')))), $v) : $v, $page['seo'] ?? []);
    // Statique d'abord : page sans état ni formulaire, visiteur sans cookie → l'HTML rendu est écrit dans cache/ ; Apache le sert ensuite sans PHP (.htaccess), PHP sinon.
    $static = $SL_STATIC && !empty($page['static']) && ($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'GET' && empty($_COOKIE);
    if ($static && is_file(__DIR__ . '/' . $page['static'])) { header('Content-Type: text/html; charset=UTF-8'); header('X-SL-Static: php'); readfile(__DIR__ . '/' . $page['static']); exit; }
    $formResult = handle_contact_form($site, $page['contact'] ?? null);
    if (!$static && !empty($page['csrf'])) $formResult['csrf'] = csrf_token();
    if (!empty($page['forms'])) handle_declared_forms($site, $page);
    ${shop ? `if (!empty($page['checkout'])) { $checkoutResult = shop_handle_checkout($site); if ($checkoutResult['status'] === 'redirect') { header('Location: ' . $checkoutResult['to'], true, 303); exit; } }` : ''}
    if (!$static) sl_exp_assign();
    if ($static) ob_start();
    include __DIR__ . '/layout.php';
    if ($static) {
        $html = str_replace('<head>', "<head>\n<meta name=\\"sl-static\\" content=\\"1\\">", ob_get_clean());
        header('X-SL-Static: miss'); echo $html;
        @mkdir(__DIR__ . '/cache', 0775, true); $tmp = __DIR__ . '/' . $page['static'] . '.' . bin2hex(random_bytes(3)) . '.tmp';
        if (@file_put_contents($tmp, $html) !== false) @rename($tmp, __DIR__ . '/' . $page['static']);
    }
} else {
    // Anciennes adresses déclarées par le site (site › redirects) : redirection permanente vers la nouvelle.
    foreach (($site['redirects'] ?? []) as $sl_r) if (($sl_r['from'] ?? null) === $path) { header('Location: ' . $sl_r['to'], true, 301); exit; }
    http_response_code(404);
    $page = ['file' => null, 'seo' => ['title' => 'Page introuvable']];
    $current = $path;
    include __DIR__ . '/layout.php';
}
`;
}

export const LAYOUT_PHP = `<!doctype html>
<html lang="<?= e(substr($site['locale'] ?? 'fr-FR', 0, 2)) ?>">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title><?= e($page['seo']['title'] ?? $site['name']) ?></title>
<?php $desc = $page['seo']['description'] ?? $site['tagline'] ?? ''; if ($desc !== ''): ?><meta name="description" content="<?= e($desc) ?>">
<?php endif; ?>
<link rel="stylesheet" href="/assets/site.css?v={{CSS_V}}" integrity="sha256-{{CSS_SRI}}">{{OFFLINE_HEAD}}
<?php if (!empty($jsonld)): ?><script type="application/ld+json"><?= $jsonld ?></script>
<?php endif; ?>
<?php if (is_file(__DIR__ . '/site.json')): ?><link rel="alternate" type="application/json" href="/site.json" title="Données structurées du site">
<?php endif; ?>
<?php if (!empty($page['readable_url'])): ?><link rel="alternate" href="<?= e($page['readable_url']) ?>" title="Version texte simplifié">
<?php endif; ?>
</head>
<body>
<header class="site-header">
  <div class="container">
    <a class="brand" href="/"><?= e($site['name']) ?></a>
    <button class="nav-toggle" aria-label="Menu" aria-expanded="false">☰</button>
    <nav class="site-nav" aria-label="Navigation principale">
      <ul>
      <?php foreach (($site['nav'] ?? []) as $item): ?>
        <li><a href="<?= e(url($item['to'])) ?>"<?= $item['to'] === $current ? ' aria-current="page"' : '' ?>><?= e($item['label']) ?></a></li>
      <?php endforeach; ?>
      </ul>
      <?php if (!empty($SHOP['cart_route'])): ?><a class="cart-link" href="<?= e($SHOP['cart_route']) ?>"<?= $SHOP['cart_route'] === $current ? ' aria-current="page"' : '' ?>>Panier<span class="cart-count"><?= shop_count() ?></span></a><?php endif; ?>
      <?php if ($site['intent']['enabled'] ?? true): ?>
      <form class="intent" role="search" autocomplete="off" data-index="/assets/intent-index.json">
        <input type="search" name="q" placeholder="<?= e($site['intent']['placeholder'] ?? 'Que cherchez-vous ?') ?>" aria-label="<?= e($site['intent']['placeholder'] ?? 'Que cherchez-vous ?') ?>" aria-expanded="false" aria-controls="intent-results">
        <ul class="intent-results" id="intent-results" role="listbox" hidden></ul>
      </form>
      <?php endif; ?>
    </nav>
  </div>
</header>
<main>
<?php if (!empty($_SESSION['flash'])): ?><div class="cart-flash"><div class="container"><?= e($_SESSION['flash']) ?><?php if (!empty($SHOP['cart_route'])): ?> · <a href="<?= e($SHOP['cart_route']) ?>">Voir le panier</a><?php endif; ?></div></div><?php unset($_SESSION['flash']); endif; ?>
<?php if ($page['file']): ob_start(); include __DIR__ . '/pages/' . $page['file']; $sl_body = ob_get_clean();
// Une page sans titre principal (pas de bandeau) : son premier titre de section devient le h1 de la page.
if (stripos($sl_body, '<h1') === false) $sl_body = preg_replace('~<h2((?:\\s[^>]*)?)>(.*?)</h2>~s', '<h1$1>$2</h1>', $sl_body, 1);
echo $sl_body; else: ?>
  <section class="section page-404"><div class="container"><h1>Page introuvable</h1><p class="muted">Cette adresse ne correspond à aucune page.</p><a class="btn" href="/">Retour à l'accueil</a></div></section>
<?php endif; ?>
</main>
<footer class="site-footer">
  <div class="container">
    <div>
      <strong><?= e($site['name']) ?></strong>
      <?php if (!empty($site['footer']['text'])): ?> · <?= e($site['footer']['text']) ?><?php endif; ?>
      <?php if (!empty($site['contact'])): ?><div><?= implode(' · ', array_filter([e($site['contact']['address'] ?? ''), e($site['contact']['phone'] ?? ''), !empty($site['contact']['email']) ? '<a href="mailto:' . e($site['contact']['email']) . '">' . e($site['contact']['email']) . '</a>' : ''])) ?></div><?php endif; ?>
    </div>
    <ul><?php foreach (($site['footer']['links'] ?? []) as $l): ?><li><?= render_link($l) ?></li><?php endforeach; ?><?php if (!empty($page['readable_url'])): ?><li><a href="<?= e($page['readable_url']) ?>" rel="alternate">Version texte</a></li><?php endif; ?></ul>
  </div>
</footer>
<?php if (($site['personalization']['enabled'] ?? true) !== false): ?>
<div class="consent" hidden role="dialog" aria-label="Personnalisation">
  <p><?= e($site['personalization']['consent_text'] ?? 'Ce site adapte certains contenus à votre navigation (pages vues, demandes en cours). Aucune donnée n\\'est transmise à des tiers.') ?></p>
  <div class="consent-actions"><button type="button" class="btn consent-accept">Accepter</button><button type="button" class="btn btn-outline consent-refuse">Refuser</button></div>
</div>
<?php foreach (sl_forms_sent() as $sl_f): ?><span hidden data-sl-event="form_sent" data-sl-data="<?= e(json_encode(['form' => $sl_f, 'route' => (string)($current ?? '')], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)) ?>"></span>
<?php endforeach; ?><script>window.SL = <?= json_encode(['spec' => $GLOBALS['SL_SPEC'], 'consent' => ['required' => (bool)($site['personalization']['requires_consent'] ?? true), 'given' => sl_consent()], 'segments' => sl_segments()], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?>;</script>
<?php endif; ?>
<script src="/assets/site.js?v={{JS_V}}" integrity="sha256-{{JS_SRI}}" defer></script>{{OFFLINE_SW}}
</body>
</html>
`;

const RUNTIME_PHP_VARS = { item: '$SL_ITEM', product: '$product', order: '$order' };
/** Littéral PHP où les chaînes contenant des expressions d'affichage ({{ item.title }}) deviennent des expressions PHP. */
export function phpValueRt(v, indent = '') {
  if (typeof v === 'string') {
    const segs = segments(v);
    if (segs && segs.some(s => s.src !== undefined && isRuntime(s.src))) {
      const part = s => s.src === undefined ? phpValue(s.text) : `sl_str(${toPhp(parse(s.src), RUNTIME_PHP_VARS).php})`;
      if (segs.length === 1) return toPhp(parse(segs[0].src), RUNTIME_PHP_VARS).php;
      return '(' + segs.map(part).join(' . ') + ')';
    }
    return phpValue(v);
  }
  if (v === null || v === undefined || typeof v !== 'object') return phpValue(v);
  const inner = indent + '  ';
  if (Array.isArray(v)) return v.length ? '[\n' + v.map(x => inner + phpValueRt(x, inner)).join(',\n') + '\n' + indent + ']' : '[]';
  const entries = Object.entries(v);
  return entries.length ? '[\n' + entries.map(([k, x]) => `${inner}${phpValue(k)} => ${phpValueRt(x, inner)}`).join(',\n') + '\n' + indent + ']' : '[]';
}

export function pagePhp(page) {
  const sections = page.data.sections.map((section) => {
    const [name] = Object.keys(section);
    const { variants, ...base } = section[name] ?? {};
    return { name, props: base, variants: variants && Object.keys(variants).length ? variants : null };
  });
  const pageVariants = page.data.variants && Object.keys(page.data.variants).length ? page.data.variants : null;
  const dynamic = typeof page.data.route === 'string' && page.data.route.includes('[id]');
  return `<?php /* ${page.id} — généré par sitec */
${dynamic ? 'global $SL_ITEM, $product, $order;\n' : ''}sl_render_page(${dynamic ? phpValueRt(sections) : phpValue(sections)}, ${phpValue(pageVariants)});
`;
}

/** Boutique : produits, panier en session, commandes, paiement manuel ou Stripe Checkout. */
export const SHOP_PHP = `<?php
declare(strict_types=1);
// Généré par sitec. Configuration dans $SHOP (index.php) ; clés secrètes dans .env (jamais dans le DSL).

function shop_env(string $key): string { return sl_env($key); }

/** Catalogue compilé (lib/data/products.json) avec le stock courant (data/stock.json) appliqué. */
function shop_products(): array {
    static $list = null;
    if ($list === null) {
        $list = json_decode((string)@file_get_contents(__DIR__ . '/data/products.json'), true) ?: [];
        $stock = shop_stock_state($list);
        foreach ($list as &$p) if ($p['stock'] !== null) $p['stock'] = $stock[$p['id']]['remaining'] ?? $p['stock'];
        unset($p);
    }
    return $list;
}
function shop_product(string $id): ?array { foreach (shop_products() as $p) if ($p['id'] === $id) return $p; return null; }
function shop_product_url(string $id): ?string { global $SHOP; return $SHOP['product_route'] ? str_replace('{id}', $id, $SHOP['product_route']) : null; }
function shop_in_stock(array $p): bool { return $p['stock'] === null || (int)$p['stock'] > 0; }

/**
 * Réserve de stock : data/stock.json = { id: { base, remaining } }. « base » est le stock déclaré dans products.yaml
 * au moment de la dernière lecture ; s'il change (le propriétaire a réapprovisionné), « remaining » repart de la nouvelle valeur.
 */
function shop_stock_file(): string { $dir = __DIR__ . '/../data'; if (!is_dir($dir)) @mkdir($dir, 0775, true); return $dir . '/stock.json'; }
/** Réconcilie l'état lu avec le catalogue (nouveau produit, réapprovisionnement, stock illimité). Renvoie [état, modifié]. */
function shop_stock_reconcile(array $state, array $catalog): array {
    $changed = false;
    foreach ($catalog as $p) {
        if ($p['stock'] === null) { if (isset($state[$p['id']])) { unset($state[$p['id']]); $changed = true; } continue; }
        if (!isset($state[$p['id']]) || (int)$state[$p['id']]['base'] !== (int)$p['stock']) { $state[$p['id']] = ['base' => (int)$p['stock'], 'remaining' => (int)$p['stock']]; $changed = true; }
    }
    return [$state, $changed];
}
function shop_stock_state(array $catalog): array {
    $f = shop_stock_file();
    $fh = fopen($f, 'c+'); if (!$fh) return [];
    flock($fh, LOCK_EX);
    $raw = stream_get_contents($fh);
    [$state, $changed] = shop_stock_reconcile($raw !== '' ? (json_decode($raw, true) ?: []) : [], $catalog);
    if ($changed) { ftruncate($fh, 0); rewind($fh); fwrite($fh, json_encode($state)); fflush($fh); }
    flock($fh, LOCK_UN); fclose($fh);
    return $state;
}
/** Décrémente le stock de toutes les lignes sous un seul verrou, ou renvoie la liste des manques sans rien changer. */
function shop_reserve(array $lines): array {
    $catalog = json_decode((string)@file_get_contents(__DIR__ . '/data/products.json'), true) ?: [];
    $fh = fopen(shop_stock_file(), 'c+'); if (!$fh) return [];
    flock($fh, LOCK_EX);
    $raw = stream_get_contents($fh);
    [$state] = shop_stock_reconcile($raw !== '' ? (json_decode($raw, true) ?: []) : [], $catalog);
    $short = [];
    foreach ($lines as $l) { if (!isset($state[$l['id']])) continue; $r = (int)$state[$l['id']]['remaining']; if ($l['qty'] > $r) $short[$l['id']] = ['name' => $l['name'], 'available' => $r, 'wanted' => $l['qty']]; }
    if (!$short) foreach ($lines as $l) if (isset($state[$l['id']])) $state[$l['id']]['remaining'] -= $l['qty'];
    ftruncate($fh, 0); rewind($fh); fwrite($fh, json_encode($state)); fflush($fh);
    flock($fh, LOCK_UN); fclose($fh);
    return $short;
}
function shop_money(float $n): string { global $SHOP; return number_format($n, 2, ',', ' ') . ' ' . ($SHOP['currency'] ?? '€'); }
function shop_status_label(string $s): string { return ['pending' => 'En attente de paiement', 'paid' => 'Payée', 'confirmed' => 'Confirmée', 'cancelled' => 'Annulée'][$s] ?? $s; }

function shop_cart(): array { sl_session(false); return $_SESSION['cart'] ?? []; }
function shop_count(): int { return array_sum(shop_cart()); }
function shop_cart_lines(): array {
    $out = [];
    foreach (shop_cart() as $id => $qty) { $p = shop_product((string)$id); if (!$p || $qty < 1) continue; $out[] = $p + ['qty' => (int)$qty, 'total' => $p['price'] * (int)$qty]; }
    return $out;
}
function shop_totals(array $lines): array {
    global $SHOP;
    $sub = array_sum(array_column($lines, 'total'));
    $flat = (float)($SHOP['shipping']['flat'] ?? 0); $free = $SHOP['shipping']['free_from'] ?? null;
    $ship = ($sub <= 0 || ($free !== null && $sub >= (float)$free)) ? 0.0 : $flat;
    return ['subtotal' => $sub, 'shipping' => $ship, 'free_from' => $free !== null ? (float)$free : null, 'total' => $sub + $ship];
}

/** POST /_cart : add | set | remove | clear, puis redirection. */
function shop_handle_cart(): void {
    sl_session();
    global $SHOP;
    $back = $_SERVER['HTTP_REFERER'] ?? ($SHOP['cart_route'] ?? '/');
    if (!str_starts_with($back, '/') && !str_starts_with($back, (isset($_SERVER['HTTPS']) ? 'https' : 'http') . '://' . ($_SERVER['HTTP_HOST'] ?? ''))) $back = $SHOP['cart_route'] ?? '/';
    if (!hash_equals($_SESSION['csrf'] ?? '', (string)($_POST['_csrf'] ?? ''))) { http_response_code(400); echo 'Session expirée, merci de réessayer.'; exit; }
    $cart = shop_cart(); $action = $_POST['action'] ?? ''; $id = (string)($_POST['id'] ?? ''); $qty = max(0, min(99, (int)($_POST['qty'] ?? 1)));
    $p = $id !== '' ? shop_product($id) : null;
    $cap = fn(int $n) => ($p && $p['stock'] !== null) ? min($n, (int)$p['stock']) : $n; // plafond = stock courant
    if ($action === 'add' && $p) {
        $wanted = ($cart[$id] ?? 0) + max(1, $qty); $final = $cap(min(99, $wanted));
        if ($final <= 0) { unset($cart[$id]); $_SESSION['flash'] = 'Cet article est épuisé.'; }
        else { $cart[$id] = $final; $_SESSION['flash'] = $final < $wanted ? "Stock limité : quantité ajustée à $final." : 'Article ajouté au panier.'; }
    }
    elseif ($action === 'set' && isset($cart[$id])) { $final = $cap($qty); if ($final <= 0) unset($cart[$id]); else { $cart[$id] = $final; if ($final < $qty) $_SESSION['flash'] = "Stock limité : quantité ajustée à $final."; } }
    elseif ($action === 'remove') unset($cart[$id]);
    elseif ($action === 'clear') $cart = [];
    $_SESSION['cart'] = $cart;
    header('Location: ' . $back, true, 303); exit;
}

function shop_order_token(): string { return bin2hex(random_bytes(8)); }

/** Traitement du formulaire de commande. Renvoie ['status' => null|'error'|'redirect', ...]. */
function shop_handle_checkout(array $site): array {
    sl_session();
    global $SHOP;
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST' || ($_POST['_form'] ?? '') !== 'checkout') return ['status' => null];
    if (!hash_equals($_SESSION['csrf'] ?? '', (string)($_POST['_csrf'] ?? ''))) return ['status' => 'error', 'message' => 'Session expirée, merci de réessayer.'];
    if (!empty($_POST['website'])) return ['status' => 'error', 'message' => 'Envoi refusé.'];
    $lines = shop_cart_lines();
    if (!$lines) return ['status' => 'error', 'message' => 'Votre panier est vide.'];
    $data = []; $errors = [];
    foreach (['name', 'email', 'phone', 'address', 'notes'] as $k) { $v = trim((string)($_POST[$k] ?? '')); if ($v !== '') $data[$k] = str_cut($v, $k === 'notes' || $k === 'address' ? 1000 : 200); }
    foreach (['name' => 'Le nom', 'email' => 'L\\'e-mail', 'address' => 'L\\'adresse'] as $k => $label) if (empty($data[$k])) $errors[$k] = $label . ' est obligatoire.';
    if (!empty($data['email']) && !filter_var($data['email'], FILTER_VALIDATE_EMAIL)) $errors['email'] = 'Adresse e-mail invalide.';
    if ($errors) return ['status' => 'error', 'message' => 'Merci de corriger les champs indiqués.', 'errors' => $errors, 'data' => $data];
    // Stock : réservation atomique ; en cas de manque, le panier est ajusté et le client prévenu.
    $short = shop_reserve($lines);
    if ($short) {
        $cart = shop_cart(); $msgs = [];
        foreach ($short as $id => $s) { if ($s['available'] <= 0) unset($cart[$id]); else $cart[$id] = $s['available']; $msgs[] = $s['name'] . ' : ' . ($s['available'] <= 0 ? 'épuisé' : 'plus que ' . $s['available'] . ' disponible' . ($s['available'] > 1 ? 's' : '')); }
        $_SESSION['cart'] = $cart;
        return ['status' => 'error', 'message' => 'Le stock a changé pendant votre commande, votre panier a été ajusté (' . implode(' ; ', $msgs) . '). Vérifiez puis confirmez à nouveau.', 'data' => $data, 'stock_changed' => true];
    }
    $t = shop_totals($lines);
    $order = [
        'id' => strtoupper(substr(bin2hex(random_bytes(5)), 0, 8)), 'token' => shop_order_token(), 'at' => date('c'),
        'status' => 'pending', 'payment' => $SHOP['payment'] ?? 'manual',
        'lines' => array_map(fn($l) => ['id' => $l['id'], 'name' => $l['name'], 'price' => $l['price'], 'qty' => $l['qty']], $lines),
        'subtotal' => $t['subtotal'], 'shipping' => $t['shipping'], 'total' => $t['total'], 'customer' => $data,
    ];
    $url = str_replace('{id}', $order['id'], $SHOP['order_route']) . '?t=' . $order['token'];
    if ($order['payment'] === 'stripe') {
        $session = shop_stripe_session($order, $url, $site);
        if (!$session) return ['status' => 'error', 'message' => 'Le paiement en ligne est indisponible pour le moment. Réessayez ou contactez-nous.'];
        $order['stripe_session'] = $session['id'];
        shop_save_order($order); $_SESSION['cart'] = [];
        return ['status' => 'redirect', 'to' => $session['url']];
    }
    shop_save_order($order); $_SESSION['cart'] = [];
    shop_notify_order($order, $site);
    return ['status' => 'redirect', 'to' => $url];
}

function shop_save_order(array $order): void { sl_store_append('orders', $order); }
function shop_order(string $id, string $token): ?array {
    $found = sl_store_get('orders', $id);
    return ($found && hash_equals($found['token'], $token)) ? $found : null;
}
/** Fixe le restant d'un produit (back-office : réception, inventaire). */
function shop_stock_set(string $id, int $remaining): void {
    $catalog = json_decode((string)@file_get_contents(__DIR__ . '/data/products.json'), true) ?: [];
    $fh = fopen(shop_stock_file(), 'c+'); if (!$fh) return;
    flock($fh, LOCK_EX);
    $raw = stream_get_contents($fh);
    [$state] = shop_stock_reconcile($raw !== '' ? (json_decode($raw, true) ?: []) : [], $catalog);
    if (isset($state[$id])) $state[$id]['remaining'] = max(0, $remaining);
    ftruncate($fh, 0); rewind($fh); fwrite($fh, json_encode($state)); fflush($fh);
    flock($fh, LOCK_UN); fclose($fh);
}
function shop_notify_order(array $o, array $site): void {
    $body = "Commande n° {$o['id']}\\n"; foreach ($o['lines'] as $l) $body .= "{$l['qty']} x {$l['name']} : " . shop_money($l['price'] * $l['qty']) . "\\n";
    $body .= "Total : " . shop_money($o['total']) . "\\n\\nClient : {$o['customer']['name']} <{$o['customer']['email']}>\\n{$o['customer']['address']}\\n";
    global $SHOP; $to = (string)($SHOP['order_email'] ?? ($site['contact']['email'] ?? ''));
    $name = (string)($site['name'] ?? 'Boutique'); $ok = true; $any = false;
    if ($to !== '') { $any = true; $ok = sl_mail($to, '[' . $name . '] Commande ' . $o['id'], $body, ['from_name' => $name, 'reply_to' => (string)($o['customer']['email'] ?? '')]) && $ok; }
    if (filter_var($o['customer']['email'] ?? '', FILTER_VALIDATE_EMAIL)) { $any = true; $ok = sl_mail((string)$o['customer']['email'], 'Votre commande ' . $o['id'] . ' - ' . $name, $body, ['from_name' => $name, 'reply_to' => $to]) && $ok; }
    if ($any && function_exists('shop_update_order')) shop_update_order((string)$o['id'], fn($x) => array_merge($x, ['mail' => $ok ? 'sent' : 'failed', 'mail_at' => date('c')]));
}

/** Met à jour une commande. $fn reçoit la commande et renvoie la version modifiée. */
function shop_update_order(string $id, callable $fn): ?array { return sl_store_update('orders', $id, $fn); }

/** Remet en stock les lignes d'une commande annulée. */
function shop_release(array $lines): void {
    $catalog = json_decode((string)@file_get_contents(__DIR__ . '/data/products.json'), true) ?: [];
    $fh = fopen(shop_stock_file(), 'c+'); if (!$fh) return;
    flock($fh, LOCK_EX);
    $raw = stream_get_contents($fh);
    [$state] = shop_stock_reconcile($raw !== '' ? (json_decode($raw, true) ?: []) : [], $catalog);
    foreach ($lines as $l) if (isset($state[$l['id']])) $state[$l['id']]['remaining'] = min((int)$state[$l['id']]['base'], (int)$state[$l['id']]['remaining'] + (int)$l['qty']);
    ftruncate($fh, 0); rewind($fh); fwrite($fh, json_encode($state)); fflush($fh);
    flock($fh, LOCK_UN); fclose($fh);
}

/**
 * Webhook Stripe (POST /_stripe/webhook) : vérifie la signature (STRIPE_WEBHOOK_SECRET dans .env),
 * passe la commande à « payée » sur checkout.session.completed, l'annule et libère le stock sur checkout.session.expired.
 */
function shop_stripe_webhook(array $site): void {
    header('Content-Type: application/json');
    $out = fn(int $code, array $body) => (function () use ($code, $body) { http_response_code($code); echo json_encode($body); exit; })();
    $secret = shop_env('STRIPE_WEBHOOK_SECRET');
    if ($secret === '') $out(503, ['error' => 'webhook_disabled', 'hint' => 'Définir STRIPE_WEBHOOK_SECRET dans .env']);
    $payload = (string)file_get_contents('php://input', false, null, 0, 262144);
    $sig = $_SERVER['HTTP_STRIPE_SIGNATURE'] ?? '';
    $parts = []; foreach (explode(',', $sig) as $kv) { $p = explode('=', trim($kv), 2); if (count($p) === 2) $parts[$p[0]][] = $p[1]; }
    $t = (int)($parts['t'][0] ?? 0);
    if ($t <= 0 || abs(time() - $t) > 300) $out(400, ['error' => 'bad_timestamp']);
    $expected = hash_hmac('sha256', $t . '.' . $payload, $secret);
    $okSig = false; foreach ($parts['v1'] ?? [] as $v) if (hash_equals($expected, $v)) $okSig = true;
    if (!$okSig) $out(400, ['error' => 'bad_signature']);
    $event = json_decode($payload, true);
    if (!is_array($event) || empty($event['type'])) $out(400, ['error' => 'bad_payload']);
    $obj = $event['data']['object'] ?? [];
    $orderId = (string)($obj['client_reference_id'] ?? '');
    if ($event['type'] === 'checkout.session.completed' && ($obj['payment_status'] ?? '') === 'paid' && $orderId !== '') {
        $o = shop_update_order($orderId, fn($o) => $o['status'] === 'paid' ? $o : $o + ['paid_at' => date('c'), 'stripe_payment_intent' => $obj['payment_intent'] ?? null] + ['status' => 'paid']);
        if ($o) { $o['status'] = 'paid'; shop_update_order($orderId, fn($x) => array_merge($x, ['status' => 'paid'])); shop_notify_order(array_merge($o, ['status' => 'paid']), $site); }
        $out(200, ['received' => true, 'order' => $orderId, 'status' => $o ? 'paid' : 'unknown_order']);
    }
    if ($event['type'] === 'checkout.session.expired' && $orderId !== '') {
        $o = shop_update_order($orderId, fn($o) => $o['status'] === 'pending' ? array_merge($o, ['status' => 'cancelled', 'cancelled_at' => date('c')]) : $o);
        if ($o && $o['status'] === 'cancelled' && empty($o['stock_released'])) { shop_release($o['lines']); shop_update_order($orderId, fn($x) => array_merge($x, ['stock_released' => true])); }
        $out(200, ['received' => true, 'order' => $orderId, 'status' => $o ? $o['status'] : 'unknown_order']);
    }
    $out(200, ['received' => true, 'ignored' => $event['type']]);
}

/** Requête HTTPS POST (formulaire) : curl si présent, sinon flux PHP (nécessite openssl). Renvoie le JSON décodé ou null. */
function shop_http_post(string $url, array $fields, string $bearer): ?array {
    $body = http_build_query($fields);
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [CURLOPT_POST => true, CURLOPT_POSTFIELDS => $body, CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 20, CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . $bearer, 'Content-Type: application/x-www-form-urlencoded']]);
        $res = curl_exec($ch); curl_close($ch);
    } else {
        $ctx = stream_context_create(['http' => ['method' => 'POST', 'header' => "Authorization: Bearer $bearer\\r\\nContent-Type: application/x-www-form-urlencoded\\r\\n", 'content' => $body, 'timeout' => 20, 'ignore_errors' => true]]);
        $res = @file_get_contents($url, false, $ctx);
    }
    $j = $res ? json_decode($res, true) : null;
    return is_array($j) && empty($j['error']) ? $j : null;
}

/** Crée une session Stripe Checkout (clé STRIPE_SECRET_KEY dans .env). */
function shop_stripe_session(array $order, string $returnUrl, array $site): ?array {
    $key = shop_env('STRIPE_SECRET_KEY'); if ($key === '') return null;
    $base = (isset($_SERVER['HTTPS']) ? 'https' : 'http') . '://' . ($_SERVER['HTTP_HOST'] ?? 'localhost');
    $fields = ['mode' => 'payment', 'success_url' => $base . $returnUrl . '&paid=1', 'cancel_url' => $base . ($GLOBALS['SHOP']['checkout_route'] ?? '/'), 'customer_email' => $order['customer']['email'], 'client_reference_id' => $order['id']];
    $i = 0;
    foreach ($order['lines'] as $l) { $fields["line_items[$i][quantity]"] = $l['qty']; $fields["line_items[$i][price_data][currency]"] = 'eur'; $fields["line_items[$i][price_data][unit_amount]"] = (int)round($l['price'] * 100); $fields["line_items[$i][price_data][product_data][name]"] = $l['name']; $i++; }
    if ($order['shipping'] > 0) { $fields["line_items[$i][quantity]"] = 1; $fields["line_items[$i][price_data][currency]"] = 'eur'; $fields["line_items[$i][price_data][unit_amount]"] = (int)round($order['shipping'] * 100); $fields["line_items[$i][price_data][product_data][name]"] = 'Livraison'; }
    $s = shop_http_post('https://api.stripe.com/v1/checkout/sessions', $fields, $key);
    return ($s && !empty($s['url']) && !empty($s['id'])) ? ['id' => $s['id'], 'url' => $s['url']] : null;
}

/** Sources de la boutique pour les composants (fonctionnement › lit) : un produit avec ce qui se calcule à la visite. */
function sl_shop_item(array $pr): array {
    $s = $pr['stock'] ?? null; $d = (string)($pr['description'] ?? '');
    return $pr + [
        'price_text' => shop_money((float)$pr['price']),
        'summary' => $d === '' ? null : str_cut($d, 110) . (strlen($d) > 110 ? '…' : ''),
        'in_stock' => shop_in_stock($pr),
        'low_stock' => $s !== null && (int)$s > 0 && (int)$s <= 3,
        'stock_text' => ($s === null || (int)$s <= 0) ? null : ((int)$s <= 3 ? 'Plus que ' . (int)$s . ' en stock' : (int)$s . ' en stock'),
        'max_qty' => $s !== null ? (int)$s : 99,
        'url' => shop_product_url((string)$pr['id']),
    ];
}
function sl_src_products(array $a): array {
    $list = shop_products();
    if (sl_truthy($a['category'] ?? null)) { $c = sl_str($a['category']); $list = array_values(array_filter($list, fn($x) => ($x['category'] ?? null) === $c)); }
    if (sl_truthy($a['featured'] ?? null)) $list = array_values(array_filter($list, fn($x) => !empty($x['featured'])));
    $sort = $a['sort'] ?? null;
    if ($sort === 'name') usort($list, fn($x, $y) => strcmp($x['name'], $y['name']));
    elseif ($sort === 'price') usort($list, fn($x, $y) => $x['price'] <=> $y['price']);
    elseif ($sort === 'price_desc') usort($list, fn($x, $y) => $y['price'] <=> $x['price']);
    if (sl_truthy($a['limit'] ?? null)) $list = array_slice($list, 0, (int)sl_num($a['limit']));
    return array_map('sl_shop_item', $list);
}
function sl_src_product(array $a): ?array { global $product; return $product ? sl_shop_item($product) : null; }
function sl_src_related(array $a): array {
    global $product; if (!$product) return [];
    $list = array_values(array_filter(shop_products(), fn($x) => $x['id'] !== $product['id'] && ($x['category'] ?? null) === ($product['category'] ?? null)));
    return array_map('sl_shop_item', array_slice($list, 0, (int)sl_num($a['limit'] ?? 0) ?: 3));
}
function sl_src_cart(array $a): array {
    global $SHOP; $lines = shop_cart_lines(); $t = shop_totals($lines);
    $out = [];
    foreach ($lines as $l) $out[] = sl_shop_item($l) + ['total_text' => shop_money((float)$l['total']), 'low_text' => ($l['stock'] !== null && $l['stock'] <= 3) ? 'Plus que ' . (int)$l['stock'] . ' disponible' . ($l['stock'] > 1 ? 's' : '') : null];
    return ['lines' => $out, 'empty' => !$lines, 'subtotal_text' => shop_money((float)$t['subtotal']),
        'shipping_text' => $t['shipping'] > 0 ? shop_money((float)$t['shipping']) : 'Offerte',
        'free_from_text' => ($t['free_from'] && $t['shipping'] > 0) ? shop_money((float)$t['free_from']) : null,
        'total_text' => shop_money((float)$t['total']), 'cart_url' => $SHOP['cart_route'] ?? null,
        'cart' => !empty($SHOP['cart_route']) ? ['label' => 'Voir le panier', 'to' => $SHOP['cart_route']] : null,
        'checkout' => !empty($SHOP['checkout_route']) ? ['label' => 'Commander', 'to' => $SHOP['checkout_route']] : null];
}
/** Source « saisie de la commande » : les champs du formulaire, ce qui a été saisi, les erreurs, le paiement. */
function sl_src_checkout(array $a): array {
    global $SHOP, $checkoutResult; $r = $checkoutResult ?? ['status' => null]; $old = $r['data'] ?? []; $errs = $r['errors'] ?? [];
    $stripe = ($SHOP['payment'] ?? 'manual') === 'stripe'; $t = shop_totals(shop_cart_lines());
    $notes = sl_str($a['notes_label'] ?? '') ?: 'Précisions pour la livraison';
    $fields = [];
    foreach ([['name', 'Nom et prénom', 'text', true], ['email', 'E-mail', 'email', true], ['phone', 'Téléphone', 'tel', false], ['address', 'Adresse de livraison', 'textarea', true], ['notes', $notes, 'textarea', false]] as [$n, $label, $type, $req])
        $fields[] = ['name' => $n, 'label' => $label, 'type' => $type, 'long' => $type === 'textarea', 'rows' => $n === 'address' ? 3 : 2, 'required' => $req, 'value' => (string)($old[$n] ?? ''), 'error' => $errs[$n] ?? null];
    return ['error' => ($r['status'] ?? null) === 'error' ? (string)($r['message'] ?? '') : null, 'fields' => $fields,
        'payment_text' => $stripe ? 'Paiement sécurisé par carte à l\\'étape suivante (Stripe).' : ($SHOP['manual_instructions'] ?? 'Paiement à la livraison ou par virement : les instructions vous sont envoyées avec la confirmation.'),
        'submit_label' => $stripe ? 'Payer ' . shop_money((float)$t['total']) : 'Confirmer la commande'];
}
function sl_src_order(array $a): ?array {
    global $order, $SHOP; $o = $order; if (!$o) return null;
    if ($o['status'] === 'cancelled') $note = 'Cette commande a été annulée (paiement non finalisé). Les articles sont de nouveau disponibles.';
    elseif ($o['status'] === 'paid') $note = 'Paiement confirmé' . (!empty($o['paid_at']) ? ' le ' . date('d/m/Y à H:i', strtotime($o['paid_at'])) : '') . '. Préparation en cours.';
    elseif ($o['payment'] === 'manual') $note = $SHOP['manual_instructions'] ?? 'Paiement à la livraison ou par virement : nos coordonnées bancaires vous sont envoyées par e-mail.';
    elseif ($o['status'] === 'pending') $note = 'Paiement en cours de confirmation par Stripe. Cette page se mettra à jour, et vous recevrez un e-mail dès validation.';
    else $note = null;
    return ['id' => $o['id'], 'date_text' => date('d/m/Y à H:i', strtotime($o['at'])), 'status' => $o['status'], 'status_text' => shop_status_label($o['status']),
        'lines' => array_map(fn($l) => ['qty' => (int)$l['qty'], 'name' => $l['name'], 'total_text' => shop_money((float)($l['price'] * $l['qty']))], $o['lines']),
        'subtotal_text' => shop_money((float)$o['subtotal']), 'shipping_text' => $o['shipping'] > 0 ? shop_money((float)$o['shipping']) : 'offerte',
        'total' => $o['total'], 'total_text' => shop_money((float)$o['total']), 'note' => $note,
        'address' => $o['customer']['address'], 'email' => $o['customer']['email']];
}
`;

/** Évaluateur de segments côté serveur : même sémantique que le JavaScript. */
export function segmentsPhp(spec, sectionsMap = {}) {
  return `<?php
declare(strict_types=1);
// Généré par sitec. Segments de personnalisation : profil du visiteur (cookie sl_p) → segments → variante de section.
$SL_SPEC = ${phpValue(spec || { segments: {}, priority: [], tracked: { events: ['page_view'], where: [] } })};
$SL_SECTIONS = ${phpValue(sectionsMap)};

function sl_consent(): ?bool { $c = $_COOKIE['sl_c'] ?? null; return $c === null ? null : $c === '1'; }

function sl_profile(): array {
    if (isset($GLOBALS['SL_PROFILE'])) return $GLOBALS['SL_PROFILE'];
    $raw = $_COOKIE['sl_p'] ?? '';
    $d = $raw !== '' ? json_decode($raw, true) : null;
    $p = is_array($d) ? $d : ['v' => 1, 'n' => 1, 'e' => []];
    if (!isset($p['n'])) $p['n'] = 1;
    if (!isset($p['e']) || !is_array($p['e'])) $p['e'] = [];
    return $GLOBALS['SL_PROFILE'] = $p;
}

function sl_device(): string {
    return preg_match('/Mobile|Android|iPhone|iPad|Windows Phone/i', $_SERVER['HTTP_USER_AGENT'] ?? '') ? 'mobile' : 'desktop';
}

function sl_cmp(int $v, array $c): bool {
    return match ($c['op']) { 'eq' => $v === $c['n'], 'gte' => $v >= $c['n'], 'lte' => $v <= $c['n'], 'gt' => $v > $c['n'], 'lt' => $v < $c['n'], default => false };
}

function sl_eval(array $node, array $p, string $device, int $now): bool {
    switch ($node['type']) {
        case 'all': foreach ($node['items'] as $i) if (!sl_eval($i, $p, $device, $now)) return false; return true;
        case 'any': foreach ($node['items'] as $i) if (sl_eval($i, $p, $device, $now)) return true; return false;
        case 'not': return !sl_eval($node['item'], $p, $device, $now);
        case 'visits': return sl_cmp((int)$p['n'], $node);
        case 'device': return $device === $node['value'];
        case 'arm': return sl_exp_group($node['exp'], $p) === $node['index'] + 1;
        case 'treated': return sl_exp_group($node['exp'], $p) === 2;
        case 'event':
            $ev = $p['e'][$node['name']] ?? null;
            if (!$ev) return sl_cmp(0, $node['count']);
            $count = (int)($ev['n'] ?? 0);
            if ($node['where']) $count = (int)($ev['w'][$node['where']['key']][$node['where']['value']] ?? 0);
            if ($node['within'] !== null && (int)($ev['t'] ?? 0) < $now - (int)$node['within']) $count = 0;
            return sl_cmp($count, $node['count']);
    }
    return false;
}

/**
 * Expériences. Le profil garde par expérience [tirage 0..9999, empreinte, groupe d'exposition, converti].
 * Groupe : 0 sans tirage, 1 témoin (contenu de base), 2 et plus pour les bras, ou 2 pour le segment mesuré.
 */
function sl_exp_group(string $exp, array $p): int {
    global $SL_SPEC;
    $x = $SL_SPEC['experiments'][$exp] ?? null; $s = $p['x'][$exp] ?? null;
    if (!$x || !is_array($s) || !is_numeric($s[0] ?? null)) return 0;
    $d = (int)$s[0];
    if (isset($x['arms'])) { foreach ($x['arms'] as $i => $a) if ($d < $a['upto']) return $i + 2; return 1; }
    return $d < $x['holdout'] ? 1 : 2;
}

function sl_exp_allowed(): bool {
    global $SL_SPEC, $site;
    if (empty($SL_SPEC['experiments']) || ($site['personalization']['enabled'] ?? true) === false) return false;
    return !(($site['personalization']['requires_consent'] ?? true) && sl_consent() !== true);
}

/** Tirage côté serveur pour un visiteur déjà connu dont le profil n'a pas encore l'expérience : le premier rendu montre déjà son groupe. Un nouveau visiteur est tiré par le navigateur. */
function sl_exp_assign(): void {
    global $SL_SPEC;
    if (!sl_exp_allowed() || !isset($_COOKIE['sl_p']) || headers_sent()) return;
    $o = json_decode((string)$_COOKIE['sl_p']); // objets conservés : {} ne devient pas []
    if (!is_object($o)) return;
    if (!isset($o->x) || !is_object($o->x)) $o->x = new stdClass();
    $changed = false;
    foreach ($SL_SPEC['experiments'] as $name => $def) {
        $cur = $o->x->{$name} ?? null;
        if (is_array($cur) && is_numeric($cur[0] ?? null)) continue;
        $o->x->{$name} = [random_int(0, 9999), $def['sig'], 0, 0]; $changed = true;
    }
    if (!$changed) return;
    $json = json_encode($o, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($json === false || strlen(rawurlencode($json)) > 3800) return;
    setrawcookie('sl_p', rawurlencode($json), ['expires' => time() + 180 * 86400, 'path' => '/', 'samesite' => 'Lax']);
    $_COOKIE['sl_p'] = $json; unset($GLOBALS['SL_PROFILE']);
}

/** Événement d'expérience reçu du navigateur : le groupe vient du profil, jamais de la requête. null = à ignorer. */
function sl_exp_event(string $name, array $data): ?array {
    global $SL_SPEC;
    $exp = is_string($data['exp'] ?? null) ? $data['exp'] : ''; $x = $SL_SPEC['experiments'][$exp] ?? null;
    if (!$x || !sl_exp_allowed()) return null;
    $p = sl_profile(); $s = $p['x'][$exp] ?? null;
    if (!is_array($s) || count($s) < 4 || ($s[1] ?? null) !== $x['sig']) return null;
    $g = (int)$s[2];
    if ($g < 1 || $g !== sl_exp_group($exp, $p)) return null;
    if ($name === 'exp_conversion' && empty($s[3])) return null;
    return ['exp' => $exp, 'group' => $x['groups'][$g - 1], 'sig' => $x['sig']];
}

/** Segment (bras ou segment mesuré) → expérience. */
function sl_exp_owners(): array {
    global $SL_SPEC; static $o = null;
    if ($o !== null) return $o;
    $o = [];
    foreach (($SL_SPEC['experiments'] ?? []) as $name => $x) foreach (array_slice($x['groups'], 1) as $g) $o[$g] = $name;
    return $o;
}

/** Formulaires acceptés par le serveur sur cette réponse (hors pot de miel) : source de l'événement form_sent. */
function sl_forms_sent(): array {
    $out = []; $c = $GLOBALS['formResult'] ?? null;
    if (is_array($c) && ($c['status'] ?? null) === 'ok' && !empty($c['id'])) $out[] = 'contact';
    foreach (($GLOBALS['SL_FORMS'] ?? []) as $n => $r) if (($r['status'] ?? null) === 'ok' && !empty($r['id'])) $out[] = (string)$n;
    return $out;
}

/** Segments actifs pour ce visiteur, dans l'ordre de priorité. Vide sans consentement quand il est requis. */
function sl_segments(): array {
    global $SL_SPEC, $site;
    static $out = null;
    if ($out !== null) return $out;
    $out = [];
    if (($site['personalization']['enabled'] ?? true) === false) return $out;
    if (($site['personalization']['requires_consent'] ?? true) && sl_consent() !== true) return $out;
    $p = sl_profile(); $device = sl_device(); $now = time();
    foreach ($SL_SPEC['priority'] as $name) if (sl_eval($SL_SPEC['segments'][$name], $p, $device, $now)) $out[] = $name;
    return $out;
}

/** Applique la première variante dont le segment est actif ; _variant indique laquelle (pour la mesure). */
function sl_variant(array $base, array $variants): array {
    foreach (sl_segments() as $seg) {
        if (isset($variants[$seg])) return array_merge($base, $variants[$seg], ['_variant' => $seg]);
    }
    return $base;
}

/** Assemblage de la page : ordre et présence des sections selon le premier segment actif ayant une règle. */
function sl_page_order(array $sections, ?array $pageVariants): array {
    if (!$pageVariants) return $sections;
    foreach (sl_segments() as $seg) {
        if (!isset($pageVariants[$seg])) continue;
        $rule = $pageVariants[$seg];
        $hide = $rule['hide'] ?? []; $first = $rule['first'] ?? [];
        $kept = array_values(array_filter($sections, fn($s) => !in_array($s['props']['id'] ?? null, $hide, true)));
        $front = []; foreach ($first as $id) foreach ($kept as $s) if (($s['props']['id'] ?? null) === $id) $front[] = $s;
        $rest = array_values(array_filter($kept, fn($s) => !in_array($s['props']['id'] ?? null, $first, true)));
        return array_merge($front, $rest);
    }
    return $sections;
}

function sl_render_page(array $sections, ?array $pageVariants): void {
    $only = $GLOBALS['SL_ONLY'] ?? null; // /_fragment : une seule section
    foreach (sl_page_order($sections, $pageVariants) as $s) {
        if ($only !== null && ($s['props']['id'] ?? null) !== $only) continue;
        $p = $s['variants'] ? sl_variant($s['props'], $s['variants']) : $s['props'];
        if ($s['variants']) {
            $p['_fragment'] = true; // section rafraîchissable par /_fragment
            $ex = array_values(array_unique(array_intersect_key(sl_exp_owners(), $s['variants'])));
            if ($ex) $p['_exp'] = implode(' ', $ex); // expériences qui agissent ici : voir cette section, c'est être exposé
        }
        render_component($s['name'], $p);
    }
    if ($only === null && $pageVariants) {
        $ex = array_values(array_unique(array_intersect_key(sl_exp_owners(), $pageVariants)));
        if ($ex) echo '<span hidden data-sl-exp="' . e(implode(' ', $ex)) . '"></span>' . "\\n";
    }
}

/** Historique du visiteur (profil.r) résolu en titres et liens : sections connues du site, produits de la boutique. */
function sl_recent(int $limit = 4, array $kinds = ['products', 'sections']): array {
    global $SL_SECTIONS;
    $out = [];
    foreach ((sl_profile()['r'] ?? []) as $it) {
        if (count($out) >= $limit) break;
        if (($it['k'] ?? '') === 'p' && in_array('products', $kinds, true) && function_exists('shop_product')) {
            $p = shop_product((string)$it['id']); if ($p) $out[] = ['kind' => 'product', 'title' => $p['name'], 'url' => shop_product_url($p['id']), 'image' => $p['image'] ?? null, 'price' => shop_money($p['price'])];
        } elseif (($it['k'] ?? '') === 's' && in_array('sections', $kinds, true) && isset($SL_SECTIONS[$it['id']])) {
            $s = $SL_SECTIONS[$it['id']]; $out[] = ['kind' => 'section', 'title' => $s['title'], 'url' => $s['route'] . '#' . $it['id'], 'page' => $s['page']];
        }
    }
    return $out;
}
`;
}

export function htaccess(staticRoutes = []) {
  const esc = s => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
  return `Options -Indexes
RewriteEngine On
# Statique d'abord : visiteur sans cookie, page sans état → le fichier écrit dans cache/ est servi par Apache, sans PHP.
${staticRoutes.map(r => `RewriteCond %{REQUEST_METHOD} GET
RewriteCond %{HTTP_COOKIE} ^$
RewriteCond %{DOCUMENT_ROOT}/${r.file} -f
RewriteRule ^${r.route === '/' ? '' : esc(r.route.slice(1))}$ ${r.file} [L]
`).join('')}# Tout ce qui n'est pas un fichier public passe par le routeur (data/, lib/, pages/ ne sont jamais servis directement).
RewriteCond %{REQUEST_URI} !(^|/)assets/
RewriteCond %{REQUEST_URI} !(^|/)cache/
RewriteCond %{REQUEST_URI} !/(sw\\.js|manifest\\.webmanifest|offline\\.html)$
RewriteRule ^ index.php [L]
# Jamais servis : secrets, marqueurs de version, manifeste d'empreintes (lu sur le serveur seulement).
<FilesMatch "^(\\.env|\\.release-.*|manifest\\.sha256\\.json)$">
  Require all denied
</FilesMatch>
# Types MIME parfois absents des hébergements, jeu de caractères, compression du texte.
AddType image/webp .webp
AddType application/manifest+json .webmanifest
AddCharset UTF-8 .html .css .js .json .txt .webmanifest
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/plain text/css application/javascript application/json application/manifest+json image/svg+xml
</IfModule>
`;
}

/** assets/.htaccess : cache navigateur long pour site.css et site.js (toujours référencés avec ?v=<empreinte>), une semaine pour les images, une heure pour les index JSON. */
export const ASSETS_HTACCESS = `<IfModule mod_headers.c>
  <FilesMatch "\\.(css|js)$">
    Header set Cache-Control "public, max-age=31536000, immutable"
  </FilesMatch>
  <FilesMatch "\\.(jpe?g|png|webp|gif|svg|ico|woff2?)$">
    Header set Cache-Control "public, max-age=604800"
  </FilesMatch>
  <FilesMatch "\\.json$">
    Header set Cache-Control "public, max-age=3600"
  </FilesMatch>
</IfModule>
`;

export const DENY_HTACCESS = `Require all denied
`;
