// Relecture éditoriale à la compilation : ce qui n'est pas dans le brief, ce qui engage, ce qui reste à compléter.
import { normalize } from './emit/twin.js';

const PLACEHOLDER = /\[(?:à compléter|a completer|à valider|a valider|todo|tbd|xxx|\.\.\.|…)[^\]]*\]|\b(?:lorem ipsum|TODO|TBD|XXX|à compléter avant|a completer avant)\b/i;
const COMMITMENTS = [
  [/\bgaranti(?:e|s|es)?\b/i, 'garantie'],
  [/\bsous\s+\d+\s*(?:h|heures?|jours?|min(?:utes)?)\b/i, 'délai'],
  [/\b(?:en|dans les)\s+\d+\s*(?:h|heures?|jours?|min(?:utes)?)\b/i, 'délai'],
  [/\b(?:gratuit(?:e|s|es)?|offert(?:e|s|es)?|sans frais|sans engagement)\b/i, 'gratuité'],
  [/\brembours(?:é|ée|és|ées|ement)\b|satisfait ou/i, 'remboursement'],
  [/\b(?:24\s*h\s*\/\s*24|7\s*j\s*\/\s*7|7 jours sur 7|24 heures sur 24)\b/i, 'disponibilité'],
  [/\b(?:meilleur prix|le moins cher|prix le plus bas|n°\s*1|numéro 1|leader|le seul|unique à)\b/i, 'supériorité'],
  [/\b(?:certifi(?:é|ée|és|ées)|agréé(?:e|s)?|labellis(?:é|ée|és)|médaill(?:e|é)|récompens(?:e|é)|RGE|Qualibat|QualiPAC|Qualigaz|ISO\s*\d+)\b/i, 'certification ou distinction'],
  [/\b(?:100\s*%|toujours|jamais|aucun(?:e)? (?:risque|frais|surprise))\b/i, 'absolu'],
];
const FACT = /(?:\b\d{1,3}(?:[   ]\d{3})+(?:[.,]\d+)?|\b\d+(?:[.,]\d+)?)\s*(?:€|euros?|%|h\b|heures?\b|min\b|minutes?\b|jours?\b|ans?\b|années?\b|km\b|m²|kg\b|g\b|cl\b|ml\b|avis\b|clients?\b|interventions?\b|références?\b|salariés?\b|artisans?\b)|\b(?:19|20)\d{2}\b|\b0\d(?:[ .]?\d{2}){4}\b|\bSIRET\b\s*[\d ]{14,20}/gi;
const TEXT_KEYS = new Set(['title', 'subtitle', 'intro', 'text', 'note', 'name', 'description', 'quote', 'author', 'role', 'bio', 'caption', 'label', 'q', 'a', 'badge', 'unit', 'success', 'tagline', 'value', 'price']);
const SKIP_KEYS = new Set(['id', 'keywords', 'image', 'src', 'photo', 'to', 'php', 'css', 'js', 'slots', 'day', 'icon', 'type', 'options', 'when', 'fields', 'required', 'variants']);

/** Parcourt les textes d'une page : callback(texte, chemin). */
function walkTexts(v, path, cb, depth = 0) {
  if (depth > 6 || v == null) return;
  if (typeof v === 'string') { cb(v, path); return; }
  if (Array.isArray(v)) { v.forEach((x, i) => walkTexts(x, `${path}[${i}]`, cb, depth + 1)); return; }
  if (typeof v === 'object') for (const [k, x] of Object.entries(v)) {
    if (SKIP_KEYS.has(k)) continue;
    const p = path ? `${path}.${k}` : k;
    if (typeof x === 'string') { if (TEXT_KEYS.has(k)) cb(x, p); continue; }
    walkTexts(x, p, cb, depth + 1);
  }
}

function sentenceAround(text, index, len) {
  const start = Math.max(0, text.lastIndexOf('.', index - 1) + 1);
  const end = text.indexOf('.', index + len);
  return text.slice(start, end < 0 ? undefined : end + 1).trim().slice(0, 160);
}

/**
 * Relit un projet. brief = texte libre (brief.md) ou null.
 * Retourne des constats { level, code, file, path, excerpt, value?, message, hint }.
 */
export function reviewProject(project, brief) {
  const findings = [];
  const briefNorm = brief ? normalize(brief) : null;
  const briefNums = brief ? new Set((brief.match(/\d+(?:[.,]\d+)?/g) || []).map(n => n.replace(',', '.').replace(/^0+(\d)/, '$1'))) : null;
  const inBrief = (value) => {
    if (!briefNorm) return null;
    const n = normalize(value);
    if (n && briefNorm.includes(n)) return true;
    const num = (value.match(/\d+(?:[.,]\d+)?/g) || []).map(x => x.replace(/[   ]/g, '').replace(',', '.').replace(/^0+(\d)/, '$1'));
    return num.length ? num.every(x => briefNums.has(x)) : false;
  };
  const sources = [{ file: project.siteFile, data: project.site?.site || {}, prefix: 'site' }, ...project.pages.map(p => ({ file: p.file, data: p.data, prefix: '' }))];
  if (project.products) sources.push({ file: project.productsFile, data: project.products.map(p => ({ name: p.name, description: p.description, badge: p.badge, price: p.price !== undefined ? String(p.price) + ' €' : undefined })), prefix: 'products' });
  for (const src of sources) {
    walkTexts(src.data, src.prefix, (text, path) => {
      const seen = new Set();
      if (PLACEHOLDER.test(text)) findings.push({ level: 'error', code: 'E_PLACEHOLDER', file: src.file, path, excerpt: text.slice(0, 120), message: 'Texte à compléter encore présent : la mise en ligne doit attendre.', hint: 'Remplacez le texte ou compilez avec --draft pour un brouillon.' });
      for (const m of text.matchAll(FACT)) {
        const value = m[0].trim();
        if (seen.has(value)) continue; seen.add(value);
        const known = inBrief(value);
        if (known === true) continue;
        findings.push({ level: 'warning', code: known === null ? 'W_FACT' : 'W_FACT_NOT_IN_BRIEF', file: src.file, path, value, excerpt: sentenceAround(text, m.index, value.length), message: known === null ? `Fait chiffré à valider : « ${value} » (aucun brief pour le confirmer).` : `Fait chiffré absent du brief : « ${value} ».`, hint: known === null ? 'Ajoutez brief.md à la racine du site pour que les chiffres du brief soient reconnus.' : 'Vérifiez auprès du client ou retirez.' });
      }
      for (const [re, kind] of COMMITMENTS) {
        const m = re.exec(text);
        if (!m) continue;
        const phrase = m[0];
        if (briefNorm && briefNorm.includes(normalize(phrase))) continue;
        findings.push({ level: 'warning', code: 'W_COMMITMENT', file: src.file, path, value: phrase, excerpt: sentenceAround(text, m.index, phrase.length), message: `Engagement (${kind}) à faire valider : « ${phrase} ».`, hint: briefNorm ? 'Non trouvé dans le brief : confirmez avec le client.' : 'Confirmez avec le client.' });
      }
    });
  }
  // dédoublonnage par (code, file, path, value)
  const uniq = new Map();
  for (const f of findings) uniq.set(`${f.code}|${f.file}|${f.path}|${f.value ?? ''}`, f);
  return [...uniq.values()];
}

export const REVIEW_SYSTEM = `Tu es relecteur éditorial pour un site vitrine. On te donne le brief du client (la seule source de vérité) et une liste de passages du site, chacun avec un identifiant.
Pour chaque passage, réponds : "ok" si le passage est cohérent avec le brief ou purement descriptif ; "verifier" s'il affirme un fait, un chiffre, un délai, une garantie, une certification ou un engagement que le brief ne confirme pas ; "retirer" s'il contredit le brief ou invente une donnée sensible (prix, numéro, distinction).
Ajoute en une phrase courte la raison. Réponds UNIQUEMENT avec un objet JSON : { "<id>": { "verdict": "ok" | "verifier" | "retirer", "raison": "..." }, ... }.`;

export function buildReviewPrompt(brief, findings) {
  const items = findings.map((f, i) => `[${i + 1}] (${f.code}) ${f.excerpt}`).join('\n');
  return `Brief du client :\n${brief || '(aucun brief fourni : considère tout fait chiffré comme à vérifier)'}\n\nPassages à relire :\n${items}\n\nRéponds avec le JSON demandé, une clé par identifiant entre crochets.`;
}
