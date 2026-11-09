// Lecture d'un YAML en gardant la ligne de chaque clé et de chaque élément de liste : les erreurs des blocs du langage
// (données, forme, apparence, fonctionnement) citent la ligne du manifeste, pas seulement un chemin.
import YAML, { LineCounter, isMap, isSeq, isScalar } from 'yaml';

/**
 * Renvoie { value, lineOf }. lineOf(ref) : ligne (à partir de 1) d'un objet ou d'une liste lus, ou d'un membre
 * désigné par { in: conteneur, at: clé ou indice } ; null si inconnue. Lève l'erreur YAML si le texte est illisible.
 */
export function parseWithLines(text) {
  const lc = new LineCounter();
  const doc = YAML.parseDocument(text, { lineCounter: lc });
  if (doc.errors.length) throw doc.errors[0];
  const value = doc.toJS();
  const own = new WeakMap(), members = new WeakMap();
  const line = n => (n && n.range ? lc.linePos(n.range[0]).line : null);
  const walk = (n, v) => {
    if (!n || v === null || typeof v !== 'object') return;
    if (isMap(n)) {
      const m = new Map(); own.set(v, line(n)); members.set(v, m);
      for (const pair of n.items) { if (!isScalar(pair.key)) continue; const k = String(pair.key.value); m.set(k, line(pair.key)); walk(pair.value, v[k]); }
    } else if (isSeq(n) && Array.isArray(v)) {
      const m = new Map(); own.set(v, line(n)); members.set(v, m);
      n.items.forEach((it, i) => { m.set(String(i), line(it)); walk(it, v[i]); });
    }
  };
  walk(doc.contents, value);
  const lineOf = (ref) => {
    if (!ref || typeof ref !== 'object') return null;
    if ('in' in ref && 'at' in ref && ref.in && typeof ref.in === 'object') return members.get(ref.in)?.get(String(ref.at)) ?? own.get(ref.in) ?? null;
    return own.get(ref) ?? null;
  };
  return { value, lineOf };
}
