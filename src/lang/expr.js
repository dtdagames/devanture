// Langage d'expressions de Devanture : une grammaire, deux usages.
//   - évaluée à la compilation (interpolation {{ site.contact.phone }}, paramètres des composants composés, listes de collections) ;
//   - traduite en PHP pour ce qui n'est connu qu'à la requête (élément d'une collection, produit, commande, formulaire, boucles des gabarits).
// Déclaratif et sans effet : chemins, littéraux, arithmétique, comparaisons, and/or/not, concaténation (~), filtres (| nom(args)),
// fonctions d'affichage (link, img, icon, paragraphs…). Pas d'affectation, pas d'appel arbitraire.

const KEYWORDS = new Set(['and', 'or', 'not', 'true', 'false', 'null', 'in']);

/** Découpe une expression en jetons ; lève une erreur lisible sur un caractère inattendu. */
export function tokenize(src) {
  const toks = []; let i = 0;
  const push = (type, value) => toks.push({ type, value, pos: i });
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) { i++; continue; }
    if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(src[i + 1] || ''))) { const m = /^\d*\.?\d+(e[+-]?\d+)?/i.exec(src.slice(i)); push('num', Number(m[0])); i += m[0].length; continue; }
    if (c === '"' || c === "'") {
      let j = i + 1, s = '';
      while (j < src.length && src[j] !== c) { if (src[j] === '\\' && j + 1 < src.length) { j++; s += ({ n: '\n', t: '\t' })[src[j]] ?? src[j]; } else s += src[j]; j++; }
      if (j >= src.length) throw new ExprError(`chaîne non terminée`, i);
      push('str', s); i = j + 1; continue;
    }
    if (/[A-Za-z_]/.test(c)) { const m = /^[A-Za-z_][A-Za-z0-9_]*/.exec(src.slice(i)); const w = m[0]; push(KEYWORDS.has(w) ? 'kw' : 'id', w); i += w.length; continue; }
    const two = src.slice(i, i + 2);
    if (['==', '!=', '<=', '>='].includes(two)) { push('op', two); i += 2; continue; }
    if ('+-*/%<>()[].,|~:'.includes(c)) { push('op', c); i++; continue; }
    throw new ExprError(`caractère inattendu « ${c} »`, i);
  }
  push('eof', null);
  return toks;
}

export class ExprError extends Error { constructor(message, pos) { super(message); this.pos = pos; } }

const BIN_PREC = { or: 1, and: 2, '==': 4, '!=': 4, '<': 5, '<=': 5, '>': 5, '>=': 5, in: 5, '~': 6, '+': 7, '-': 7, '*': 8, '/': 8, '%': 8 };

/** Analyse une expression ; renvoie un AST : { t: 'num'|'str'|'bool'|'null'|'var'|'get'|'index'|'bin'|'not'|'neg'|'filter'|'call'|'list' }. */
export function parse(src) {
  const toks = tokenize(src); let k = 0;
  const peek = () => toks[k]; const next = () => toks[k++];
  const isOp = (v) => peek().type === 'op' && peek().value === v;
  const isKw = (v) => peek().type === 'kw' && peek().value === v;
  const expect = (v) => { if (!isOp(v)) throw new ExprError(`« ${v} » attendu`, peek().pos); next(); };
  function primary() {
    const t = next();
    if (t.type === 'num') return { t: 'num', v: t.value };
    if (t.type === 'str') return { t: 'str', v: t.value };
    if (t.type === 'kw' && (t.value === 'true' || t.value === 'false')) return { t: 'bool', v: t.value === 'true' };
    if (t.type === 'kw' && t.value === 'null') return { t: 'null' };
    if (t.type === 'id') {
      if (isOp('(')) { next(); const args = []; while (!isOp(')')) { args.push(expr(0)); if (isOp(',')) next(); else break; } expect(')'); return { t: 'call', name: t.value, args }; }
      return { t: 'var', name: t.value };
    }
    if (t.type === 'op' && t.value === '(') { const e = expr(0); expect(')'); return e; }
    if (t.type === 'op' && t.value === '[') { const items = []; while (!isOp(']')) { items.push(expr(0)); if (isOp(',')) next(); else break; } expect(']'); return { t: 'list', items }; }
    if (t.type === 'op' && t.value === '-') return { t: 'neg', e: unary() };
    if (t.type === 'kw' && t.value === 'not') return { t: 'not', e: unary() };
    throw new ExprError(t.type === 'eof' ? 'expression incomplète' : `jeton inattendu « ${t.value} »`, t.pos);
  }
  function postfix(e) {
    for (;;) {
      if (isOp('.')) { next(); const id = next(); if (id.type !== 'id' && id.type !== 'kw') throw new ExprError('nom attendu après « . »', id.pos); e = { t: 'get', e, key: id.value }; continue; }
      if (isOp('[')) { next(); const idx = expr(0); expect(']'); e = { t: 'index', e, idx }; continue; }
      if (isOp('|')) {
        next(); const id = next(); if (id.type !== 'id') throw new ExprError('nom de filtre attendu après « | »', id.pos);
        const args = []; if (isOp('(')) { next(); while (!isOp(')')) { args.push(expr(0)); if (isOp(',')) next(); else break; } expect(')'); }
        e = { t: 'filter', e, name: id.value, args }; continue;
      }
      return e;
    }
  }
  function unary() { return postfix(primary()); }
  function expr(minPrec) {
    let left = unary();
    for (;;) {
      const t = peek(); const opv = (t.type === 'op' || t.type === 'kw') ? t.value : null;
      const prec = opv !== null ? BIN_PREC[opv] : undefined;
      if (prec === undefined || prec < minPrec) return left;
      next();
      const right = expr(prec + 1);
      left = { t: 'bin', op: opv, l: left, r: right };
    }
  }
  const ast = expr(0);
  if (peek().type !== 'eof') throw new ExprError(`jeton inattendu « ${peek().value} »`, peek().pos);
  return ast;
}

/** Racines (noms de variables) qu'une expression lit. */
export function roots(ast, out = new Set()) {
  if (!ast || typeof ast !== 'object') return out;
  if (ast.t === 'var') out.add(ast.name);
  for (const v of Object.values(ast)) { if (Array.isArray(v)) v.forEach(x => roots(x, out)); else if (v && typeof v === 'object' && 't' in v) roots(v, out); }
  return out;
}

/** Chemins complets (racine.clé.clé) lus par l'expression, pour la vérification statique. */
export function paths(ast, out = []) {
  const walk = (n) => {
    if (!n || typeof n !== 'object') return;
    if (n.t === 'get') { const p = pathOf(n); if (p) { out.push(p); return; } }
    if (n.t === 'var') { out.push([n.name]); return; }
    for (const v of Object.values(n)) { if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v === 'object' && 't' in v) walk(v); }
  };
  walk(ast);
  return out;
}
function pathOf(n) { const parts = []; while (n && n.t === 'get') { parts.unshift(n.key); n = n.e; } if (n && n.t === 'var') { parts.unshift(n.name); return parts; } return null; }

// ---------------------------------------------------------------------------------------------------------------------------
// Évaluation (compilation) : sémantique partagée avec le PHP produit (sl_truthy, sl_get, sl_f_*).

export const truthy = v => !(v === null || v === undefined || v === false || v === 0 || v === '' || (Array.isArray(v) && v.length === 0));
const isList = v => Array.isArray(v);
const num = v => { if (typeof v === 'number') return v; const n = Number(String(v ?? '').replace(',', '.')); return Number.isNaN(n) ? 0 : n; };
const str = v => v === null || v === undefined ? '' : (typeof v === 'object' ? JSON.stringify(v) : String(v));

export const FILTERS = {
  upper: (v) => str(v).toUpperCase(),
  lower: (v) => str(v).toLowerCase(),
  capitalize: (v) => { const s = str(v); return s.charAt(0).toUpperCase() + s.slice(1); },
  trim: (v) => str(v).trim(),
  default: (v, d = '') => (truthy(v) ? v : d),
  join: (v, sep = ', ') => (isList(v) ? v.map(str).join(sep) : str(v)),
  count: (v) => (isList(v) ? v.length : v && typeof v === 'object' ? Object.keys(v).length : str(v).length),
  length: (v) => FILTERS.count(v),
  first: (v) => (isList(v) ? v[0] ?? null : str(v).charAt(0)),
  last: (v) => (isList(v) ? v[v.length - 1] ?? null : str(v).slice(-1)),
  reverse: (v) => (isList(v) ? [...v].reverse() : [...str(v)].reverse().join('')),
  sort: (v, key = null) => { if (!isList(v)) return v; const k = key ? String(key) : null; const desc = k && k.startsWith('-'); const kk = desc ? k.slice(1) : k; return [...v].sort((a, b) => { const x = kk ? a?.[kk] : a, y = kk ? b?.[kk] : b; const c = typeof x === 'number' && typeof y === 'number' ? x - y : str(x).localeCompare(str(y), 'fr'); return desc ? -c : c; }); },
  map: (v, key) => (isList(v) ? v.map(x => (x && typeof x === 'object' ? x[key] ?? null : null)) : []),
  where: (v, key, val) => (isList(v) ? v.filter(x => x && typeof x === 'object' && (val === undefined ? truthy(x[key]) : str(x[key]) === str(val))) : []),
  limit: (v, n) => (isList(v) ? v.slice(0, Math.max(0, num(n))) : v),
  money: (v, cur = '€') => num(v).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' ' + cur,
  round: (v, d = 0) => { const f = 10 ** num(d); return Math.round(num(v) * f) / f; },
  slug: (v) => str(v).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
  truncate: (v, n = 120) => { const s = str(v); return s.length <= num(n) ? s : s.slice(0, num(n)).replace(/\s+\S*$/, '') + '…'; },
  split: (v, sep = ',') => str(v).split(sep).map(s => s.trim()).filter(Boolean),
  replace: (v, a, b = '') => str(v).split(str(a)).join(str(b)),
  date: (v, fmt = 'd/m/Y') => { const d = parseDate(v); if (!d) return str(v); return formatDate(d, str(fmt)); },
  nl2br: (v) => str(v),
  repeat: (v, n = 1) => str(v).repeat(Math.max(0, Math.floor(num(n)))),
  int: (v) => Math.trunc(num(v)),
  price: (v, cur = '€') => { if (typeof v !== 'number' && Number.isNaN(Number(String(v).replace(',', '.')))) return str(v); const n = num(v); return (Number.isInteger(n) ? String(n) : n.toFixed(2).replace('.', ',')).replace(/B(?=(d{3})+(?!d))/g, ' ') + ' ' + cur; },
};
function parseDate(v) { if (v instanceof Date) return v; const s = str(v); const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s); if (m) return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])); if (/^\d{4}$/.test(s)) return new Date(Date.UTC(+s, 0, 1)); return null; }
const MONTHS_FR = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
function formatDate(d, fmt) {
  const Y = d.getUTCFullYear(), m = d.getUTCMonth() + 1, j = d.getUTCDate();
  return fmt.replace(/Y|y|m|n|d|j|F/g, t => ({ Y: String(Y), y: String(Y).slice(-2), m: String(m).padStart(2, '0'), n: String(m), d: String(j).padStart(2, '0'), j: String(j), F: MONTHS_FR[m - 1] })[t]);
}

/**
 * Évalue un AST. scope : { racine: valeur } ; functions : { nom: fn } (fonctions d'affichage, absentes à la compilation).
 * Lève ExprError sur racine inconnue, filtre inconnu, fonction inconnue.
 */
export function evaluate(ast, scope, { functions = {}, strict = true } = {}) {
  const ev = (n) => {
    switch (n.t) {
      case 'num': case 'str': case 'bool': return n.v;
      case 'null': return null;
      case 'list': return n.items.map(ev);
      case 'var': if (!(n.name in scope)) { if (strict) throw new ExprError(`variable inconnue « ${n.name} »`, 0); return null; } return scope[n.name];
      case 'get': { const b = ev(n.e); return b === null || b === undefined ? null : (typeof b === 'object' ? (b[n.key] ?? null) : null); }
      case 'index': { const b = ev(n.e); const i = ev(n.idx); return b === null || b === undefined ? null : (b[typeof i === 'number' ? i : str(i)] ?? null); }
      case 'neg': return -num(ev(n.e));
      case 'not': return !truthy(ev(n.e));
      case 'filter': { const f = FILTERS[n.name]; if (!f) throw new ExprError(`filtre inconnu « ${n.name} »`, 0); return f(ev(n.e), ...n.args.map(ev)); }
      case 'call': { const f = functions[n.name]; if (!f) throw new ExprError(`fonction inconnue « ${n.name} »`, 0); return f(...n.args.map(ev)); }
      case 'bin': {
        if (n.op === 'and') return truthy(ev(n.l)) ? ev(n.r) : ev(n.l);
        if (n.op === 'or') return truthy(ev(n.l)) ? ev(n.l) : ev(n.r);
        const a = ev(n.l), b = ev(n.r);
        switch (n.op) {
          case '+': return num(a) + num(b); case '-': return num(a) - num(b); case '*': return num(a) * num(b);
          case '/': return num(b) === 0 ? 0 : num(a) / num(b); case '%': return num(b) === 0 ? 0 : num(a) % num(b);
          case '~': return str(a) + str(b);
          case '==': return looseEq(a, b); case '!=': return !looseEq(a, b);
          case '<': return cmp(a, b) < 0; case '<=': return cmp(a, b) <= 0; case '>': return cmp(a, b) > 0; case '>=': return cmp(a, b) >= 0;
          case 'in': return isList(b) ? b.some(x => looseEq(x, a)) : str(b).includes(str(a));
        }
      }
    }
    throw new ExprError(`nœud inconnu ${n.t}`, 0);
  };
  return ev(ast);
}
function looseEq(a, b) { if (typeof a === 'number' || typeof b === 'number') return num(a) === num(b); return str(a) === str(b); }
function cmp(a, b) { if (typeof a === 'number' || typeof b === 'number') return num(a) - num(b); return str(a).localeCompare(str(b), 'fr'); }

// ---------------------------------------------------------------------------------------------------------------------------
// Traduction en PHP : même sémantique via les aides sl_get / sl_truthy / sl_f_* / sl_str du runtime.

export const SAFE_FUNCTIONS = new Set(['link', 'img', 'icon', 'paragraphs', 'markup', 'field']);
const PHP_FUNCTIONS = { link: 'sl_fn_link', img: 'sl_fn_img', img_src: 'img_src', asset: 'asset', url: 'url', icon: 'sl_icon', paragraphs: 'paragraphs', markup: 'sl_fn_markup', money: 'sl_f_money', field: 'sl_fn_field' };
export const FUNCTION_NAMES = Object.keys(PHP_FUNCTIONS);

/**
 * Compile un AST en expression PHP. vars : { racine: '$expression_php' }.
 * Renvoie { php, safe } ; safe = vrai quand la valeur est déjà du HTML sûr (fonction d'affichage en tête).
 */
export function toPhp(ast, vars) {
  const q = s => "'" + String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
  const c = (n) => {
    switch (n.t) {
      case 'num': return String(n.v);
      case 'str': return q(n.v);
      case 'bool': return n.v ? 'true' : 'false';
      case 'null': return 'null';
      case 'list': return '[' + n.items.map(c).join(', ') + ']';
      case 'var': { if (!(n.name in vars)) throw new ExprError(`variable inconnue « ${n.name} »`, 0); return vars[n.name]; }
      case 'get': { const p = pathOf(n); if (p && p[0] in vars) return `sl_get(${vars[p[0]]}, ${p.slice(1).map(q).join(', ')})`; return `sl_get(${c(n.e)}, ${q(n.key)})`; }
      case 'index': return `sl_get(${c(n.e)}, ${c(n.idx)})`;
      case 'neg': return `(-sl_num(${c(n.e)}))`;
      case 'not': return `(!sl_truthy(${c(n.e)}))`;
      case 'filter': { if (!FILTERS[n.name]) throw new ExprError(`filtre inconnu « ${n.name} »`, 0); return `sl_f_${n.name}(${[c(n.e), ...n.args.map(c)].join(', ')})`; }
      case 'call': { const f = PHP_FUNCTIONS[n.name]; if (!f) throw new ExprError(`fonction inconnue « ${n.name} »`, 0); if (n.name === 'field') { if (!('form' in vars)) throw new ExprError('field() n\'existe que dans un composant à effects.form', 0); return `sl_fn_field(${vars.form}, ${n.args.map(c).join(', ')})`; } return `${f}(${n.args.map(c).join(', ')})`; }
      case 'bin': {
        const a = c(n.l), b = c(n.r);
        switch (n.op) {
          case 'and': return `(sl_truthy(${a}) ? ${b} : ${a})`;
          case 'or': return `(sl_truthy(${a}) ? ${a} : ${b})`;
          case '+': return `(sl_num(${a}) + sl_num(${b}))`; case '-': return `(sl_num(${a}) - sl_num(${b}))`; case '*': return `(sl_num(${a}) * sl_num(${b}))`;
          case '/': return `sl_div(${a}, ${b})`; case '%': return `sl_mod(${a}, ${b})`;
          case '~': return `(sl_str(${a}) . sl_str(${b}))`;
          case '==': return `sl_eq(${a}, ${b})`; case '!=': return `(!sl_eq(${a}, ${b}))`;
          case '<': return `(sl_cmpv(${a}, ${b}) < 0)`; case '<=': return `(sl_cmpv(${a}, ${b}) <= 0)`; case '>': return `(sl_cmpv(${a}, ${b}) > 0)`; case '>=': return `(sl_cmpv(${a}, ${b}) >= 0)`;
          case 'in': return `sl_in(${a}, ${b})`;
        }
      }
    }
    throw new ExprError(`nœud inconnu ${n.t}`, 0);
  };
  return { php: c(ast), safe: ast.t === 'call' && SAFE_FUNCTIONS.has(ast.name) };
}

/** Runtime PHP des expressions : accès sûr, vérité, filtres, fonctions d'affichage. Inclus dans lib/render.php. */
export const EXPR_PHP = `
/** Expressions Devanture : accès sûr à un chemin (tableau ou objet), null si absent. */
function sl_get(mixed $b, string|int|float|null ...$keys): mixed {
    foreach ($keys as $k) { if ($k === null) return null; if (is_array($b)) { $b = $b[$k] ?? null; } elseif (is_object($b)) { $b = $b->{$k} ?? null; } else { return null; } }
    return $b;
}
function sl_truthy(mixed $v): bool { return !($v === null || $v === false || $v === 0 || $v === 0.0 || $v === '' || (is_array($v) && !$v)); }
function sl_num(mixed $v): float|int { if (is_int($v) || is_float($v)) return $v; $s = str_replace(',', '.', trim((string)(is_scalar($v) ? $v : ''))); return is_numeric($s) ? $s + 0 : 0; }
function sl_str(mixed $v): string { if ($v === null || $v === false) return ''; if ($v === true) return '1'; if (is_array($v)) return json_encode($v, JSON_UNESCAPED_UNICODE); return (string)$v; }
function sl_eq(mixed $a, mixed $b): bool { if (is_int($a) || is_float($a) || is_int($b) || is_float($b)) return sl_num($a) == sl_num($b); return sl_str($a) === sl_str($b); }
function sl_cmpv(mixed $a, mixed $b): int { if (is_int($a) || is_float($a) || is_int($b) || is_float($b)) return sl_num($a) <=> sl_num($b); return strcoll(sl_str($a), sl_str($b)); }
function sl_in(mixed $a, mixed $b): bool { if (is_array($b)) { foreach ($b as $x) if (sl_eq($x, $a)) return true; return false; } return str_contains(sl_str($b), sl_str($a)); }
function sl_div(mixed $a, mixed $b): float|int { $d = sl_num($b); return $d == 0 ? 0 : sl_num($a) / $d; }
function sl_mod(mixed $a, mixed $b): float|int { $d = sl_num($b); return $d == 0 ? 0 : fmod(sl_num($a), $d); }
/** Casse et translittération en UTF-8 sans dépendre de mbstring (hébergements sans l'extension) : lettres accentuées des langues latines, puis ASCII. */
function sl_utf8_upper(string $s): string { if (function_exists('mb_strtoupper')) return mb_strtoupper($s); static $m = ['à' => 'À', 'â' => 'Â', 'ä' => 'Ä', 'á' => 'Á', 'ã' => 'Ã', 'å' => 'Å', 'æ' => 'Æ', 'ç' => 'Ç', 'é' => 'É', 'è' => 'È', 'ê' => 'Ê', 'ë' => 'Ë', 'í' => 'Í', 'ì' => 'Ì', 'î' => 'Î', 'ï' => 'Ï', 'ñ' => 'Ñ', 'ó' => 'Ó', 'ò' => 'Ò', 'ô' => 'Ô', 'ö' => 'Ö', 'õ' => 'Õ', 'ø' => 'Ø', 'œ' => 'Œ', 'ú' => 'Ú', 'ù' => 'Ù', 'û' => 'Û', 'ü' => 'Ü', 'ÿ' => 'Ÿ', 'ß' => 'SS']; return strtoupper(strtr($s, $m)); }
function sl_utf8_lower(string $s): string { if (function_exists('mb_strtolower')) return mb_strtolower($s); static $m = ['À' => 'à', 'Â' => 'â', 'Ä' => 'ä', 'Á' => 'á', 'Ã' => 'ã', 'Å' => 'å', 'Æ' => 'æ', 'Ç' => 'ç', 'É' => 'é', 'È' => 'è', 'Ê' => 'ê', 'Ë' => 'ë', 'Í' => 'í', 'Ì' => 'ì', 'Î' => 'î', 'Ï' => 'ï', 'Ñ' => 'ñ', 'Ó' => 'ó', 'Ò' => 'ò', 'Ô' => 'ô', 'Ö' => 'ö', 'Õ' => 'õ', 'Ø' => 'ø', 'Œ' => 'œ', 'Ú' => 'ú', 'Ù' => 'ù', 'Û' => 'û', 'Ü' => 'ü', 'Ÿ' => 'ÿ']; return strtolower(strtr($s, $m)); }
function sl_utf8_ascii(string $s): string { static $m = ['à' => 'a', 'â' => 'a', 'ä' => 'a', 'á' => 'a', 'ã' => 'a', 'å' => 'a', 'æ' => 'ae', 'ç' => 'c', 'é' => 'e', 'è' => 'e', 'ê' => 'e', 'ë' => 'e', 'í' => 'i', 'ì' => 'i', 'î' => 'i', 'ï' => 'i', 'ñ' => 'n', 'ó' => 'o', 'ò' => 'o', 'ô' => 'o', 'ö' => 'o', 'õ' => 'o', 'ø' => 'o', 'œ' => 'oe', 'ú' => 'u', 'ù' => 'u', 'û' => 'u', 'ü' => 'u', 'ÿ' => 'y', 'ß' => 'ss', 'À' => 'A', 'Â' => 'A', 'Ä' => 'A', 'Á' => 'A', 'Ã' => 'A', 'Å' => 'A', 'Æ' => 'AE', 'Ç' => 'C', 'É' => 'E', 'È' => 'E', 'Ê' => 'E', 'Ë' => 'E', 'Í' => 'I', 'Ì' => 'I', 'Î' => 'I', 'Ï' => 'I', 'Ñ' => 'N', 'Ó' => 'O', 'Ò' => 'O', 'Ô' => 'O', 'Ö' => 'O', 'Õ' => 'O', 'Ø' => 'O', 'Œ' => 'OE', 'Ú' => 'U', 'Ù' => 'U', 'Û' => 'U', 'Ü' => 'U', 'Ÿ' => 'Y', '’' => "'"]; return strtr($s, $m); }
function sl_f_upper(mixed $v): string { return sl_utf8_upper(sl_str($v)); }
function sl_f_lower(mixed $v): string { return sl_utf8_lower(sl_str($v)); }
function sl_f_capitalize(mixed $v): string { $s = sl_str($v); return preg_replace_callback('/^./su', fn($m) => sl_utf8_upper($m[0]), $s) ?? $s; }
function sl_f_trim(mixed $v): string { return trim(sl_str($v)); }
function sl_f_default(mixed $v, mixed $d = ''): mixed { return sl_truthy($v) ? $v : $d; }
function sl_f_join(mixed $v, mixed $sep = ', '): string { return is_array($v) ? implode(sl_str($sep), array_map('sl_str', $v)) : sl_str($v); }
function sl_f_count(mixed $v): int { return is_array($v) ? count($v) : strlen(sl_str($v)); }
function sl_f_length(mixed $v): int { return sl_f_count($v); }
function sl_f_first(mixed $v): mixed { if (is_array($v)) { foreach ($v as $x) return $x; return null; } return preg_match('/^./su', sl_str($v), $m) ? $m[0] : ''; }
function sl_f_last(mixed $v): mixed { if (is_array($v)) { return $v ? $v[array_key_last($v)] : null; } return preg_match('/.$/su', sl_str($v), $m) ? $m[0] : ''; }
function sl_f_reverse(mixed $v): mixed { return is_array($v) ? array_reverse($v) : strrev(sl_str($v)); }
function sl_f_sort(mixed $v, mixed $key = null): mixed {
    if (!is_array($v)) return $v; $k = $key === null ? null : sl_str($key); $desc = $k !== null && str_starts_with($k, '-'); $kk = $desc ? substr($k, 1) : $k;
    usort($v, function ($a, $b) use ($kk, $desc) { $x = $kk ? sl_get($a, $kk) : $a; $y = $kk ? sl_get($b, $kk) : $b; $c = sl_cmpv($x, $y); return $desc ? -$c : $c; });
    return $v;
}
function sl_f_map(mixed $v, mixed $key): array { return is_array($v) ? array_values(array_map(fn($x) => sl_get($x, sl_str($key)), $v)) : []; }
function sl_f_where(mixed $v, mixed $key, mixed $val = null): array { if (!is_array($v)) return []; $k = sl_str($key); return array_values(array_filter($v, fn($x) => $val === null ? sl_truthy(sl_get($x, $k)) : sl_str(sl_get($x, $k)) === sl_str($val))); }
function sl_f_limit(mixed $v, mixed $n): mixed { return is_array($v) ? array_slice($v, 0, max(0, (int)sl_num($n))) : $v; }
function sl_f_money(mixed $v, mixed $cur = '€'): string { return number_format((float)sl_num($v), 2, ',', ' ') . ' ' . sl_str($cur); }
function sl_f_round(mixed $v, mixed $d = 0): float|int { $r = round((float)sl_num($v), (int)sl_num($d)); return (int)sl_num($d) === 0 ? (int)$r : $r; }
function sl_f_slug(mixed $v): string { $s = sl_utf8_ascii(sl_str($v)); $s = strtolower(preg_replace('/[^a-zA-Z0-9]+/', '-', $s)); return trim($s, '-'); }
function sl_f_truncate(mixed $v, mixed $n = 120): string { $s = sl_str($v); $n = max(0, (int)sl_num($n)); if (sl_utf8_len($s) <= $n) return $s; preg_match('/^.{0,' . $n . '}/su', $s, $m); return preg_replace('/\\s+\\S*$/u', '', $m[0] ?? '') . '…'; }
function sl_utf8_len(string $s): int { return function_exists('mb_strlen') ? mb_strlen($s) : (preg_match_all('/./su', $s) ?: strlen($s)); }
function sl_f_split(mixed $v, mixed $sep = ','): array { return array_values(array_filter(array_map('trim', explode(sl_str($sep), sl_str($v))), fn($x) => $x !== '')); }
function sl_f_replace(mixed $v, mixed $a, mixed $b = ''): string { return str_replace(sl_str($a), sl_str($b), sl_str($v)); }
function sl_f_date(mixed $v, mixed $fmt = 'd/m/Y'): string {
    $s = sl_str($v); $ts = preg_match('/^\\d{4}$/', $s) ? strtotime($s . '-01-01') : strtotime($s); if ($ts === false) return $s;
    static $F = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
    return preg_replace_callback('/Y|y|m|n|d|j|F/', fn($m) => $m[0] === 'F' ? $F[(int)date('n', $ts) - 1] : date($m[0], $ts), sl_str($fmt));
}
function sl_f_nl2br(mixed $v): string { return sl_str($v); }
function sl_f_repeat(mixed $v, mixed $n = 1): string { return str_repeat(sl_str($v), max(0, (int)sl_num($n))); }
function sl_f_int(mixed $v): int { return (int)sl_num($v); }
function sl_f_price(mixed $v, mixed $cur = '€'): string { if (!is_numeric(is_string($v) ? str_replace(',', '.', $v) : $v)) return sl_str($v); $n = (float)sl_num($v); return number_format($n, floor($n) == $n ? 0 : 2, ',', ' ') . ' ' . sl_str($cur); }
function sl_list(mixed $v): array { return is_array($v) ? $v : []; }
/** Fonctions d'affichage (HTML sûr, échappement fait à l'intérieur). */
function sl_fn_link(mixed $l, mixed $class = ''): string { return is_array($l) && isset($l['to'], $l['label']) ? render_link($l, sl_str($class)) : ''; }
function sl_fn_img(mixed $path, mixed $alt = '', mixed $sizes = null, mixed $eager = false): string { $p = sl_str($path); if ($p === '') return ''; return img($p, sl_str($alt), ['sizes' => $sizes === null ? '100vw' : sl_str($sizes), 'eager' => sl_truthy($eager)]); }
function sl_fn_markup(mixed $v): string { return inline_markup(e(sl_str($v))); }
`;
