import path from 'node:path';

/** Distance de Levenshtein, pour les suggestions « vouliez-vous dire ». */
export function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 1; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) {
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  }
  return d[m][n];
}

/** Candidat le plus proche si la distance est raisonnable, sinon null. */
export function nearest(word, candidates) {
  if (!word) return null;
  let best = null, bestD = Infinity;
  for (const c of candidates) {
    const d = levenshtein(word.toLowerCase(), c.toLowerCase());
    if (d < bestD) { bestD = d; best = c; }
  }
  // Seuil prudent : un faux ami (« date » → « name ») est pire qu'une absence de suggestion.
  const limit = word.length <= 4 ? 1 : word.length <= 8 ? 2 : 3;
  return bestD <= limit ? best : null;
}

/**
 * Fabrique une erreur normalisée.
 * code     : identifiant stable (E_UNKNOWN_PROP…)
 * file     : fichier source relatif au projet
 * path     : chemin dans le document (sections[2].hero.titre)
 * message  : phrase courte, en français
 * expected : valeurs acceptées (liste) si pertinent
 * hint     : suggestion humaine
 * fix      : correction mécanique applicable, si possible
 */
export function err(code, { file, path: p = '', message, expected, hint, fix }) {
  const e = { code, file, path: p, message };
  if (expected) e.expected = expected;
  if (hint) e.hint = hint;
  if (fix) e.fix = fix;
  return e;
}

export function formatErrors(errors, { json, root }) {
  const rel = e => ({ ...e, file: e.file ? path.relative(root, e.file).replaceAll('\\', '/') : e.file });
  if (json) return errors.map(e => JSON.stringify(rel(e))).join('\n') + '\n';
  return errors.map(e => {
    const r = rel(e);
    let s = `${r.code}  ${r.file}${r.path ? ' › ' + r.path : ''}\n  ${r.message}`;
    if (r.expected) s += `\n  attendu : ${r.expected.join(', ')}`;
    if (r.hint) s += `\n  → ${r.hint}`;
    return s;
  }).join('\n\n') + '\n';
}
