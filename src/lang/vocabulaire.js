// Vocabulaire : des mots nouveaux pour la forme, définis hors du compilateur (vocabulaire.yaml d'un site, d'un paquet, ou
// components/vocabulaire.yaml pour les mots natifs). Un mot s'emploie dans une forme comme une primitive.
//
//   mots:
//     carte de visite:
//       description: Une personne, son rôle et un lien pour la joindre.
//       données:
//         nom: texte
//         role: texte, facultatif
//         lien: lien, facultatif
//       forme:
//         - carte « carte-de-visite »:
//             - sous-titre: nom
//             - texte discret: role
//             - bouton discret: lien
//       apparence:
//         carte-de-visite: centrée
//
// Un mot se définit par une forme (d'autres mots et primitives, « contenu » pour ce que l'appelant écrit en dessous) ou, quand
// aucune primitive ne produit le balisage voulu, par un fragment de gabarit neutre (« gabarit: », avec « feuille: » pour son CSS).
// Dans les deux cas le mot ne voit que ses données : c'est l'appelant qui les lui passe, dans l'ordre de la définition.
import { parseWithLines } from './lines.js';
import { parseVocabularyOutline } from './outline.js';
import { compileDonnees } from './donnees.js';
import { compileForme, PRIMITIVES, RESERVED_WORDS, COLLECTION_PRIMITIVES, slug } from './forme.js';
import { wantedParts } from './apparence.js';
import { compileTemplate } from './template.js';
import { lintComponentCss } from './css-lint.js';

export const WORD_KEYS = ['description', 'données', 'forme', 'apparence', 'gabarit', 'feuille', 'parties'];
/** Noms qu'une donnée de mot ne peut pas porter : ils désignent autre chose dans une forme ou dans un gabarit. */
export const RESERVED_PARAMS = [...RESERVED_WORDS, 'p', 'site', 'page', 'loop', 'form', 'item', 'product', 'order', 'cart', 'shop', 'true', 'false', 'null', 'and', 'or', 'not', 'in'];
const NAME_RE = /^[a-zà-öø-ÿœ][a-zà-öø-ÿœ0-9]*(?:[ '-][a-zà-öø-ÿœ0-9]+)*$/;
const LINK_DEFS = { link: { type: 'object', additionalProperties: false, required: ['label', 'to'], properties: { label: { type: 'string' }, to: { type: 'string', format: 'route' } } } };

const normName = s => String(s).trim().toLowerCase().replace(/\s+/g, ' ');
const hasContenu = (f) => Array.isArray(f) && f.some(n => (typeof n === 'string' ? normName(n) === 'contenu' : n && typeof n === 'object' && Object.entries(n).some(([k, v]) => (normName(k) === 'contenu' && (v === null || v === undefined)) || hasContenu(v))));

/** Phrase d'emploi d'un mot : « mot: a, b » ou « mot, a, b: » puis les éléments. */
export function wordUsage(w) {
  const args = w.params.map(p => p.name).join(', ');
  return w.container ? `${w.name}${args ? ', ' + args : ''}:` : `${w.name}${args ? ': ' + args : ''}`;
}

/**
 * Lit un vocabulaire. opts : scope (préfixe d'identité : natif, site, nom de paquet), inherited (mots déjà visibles, non
 * redéfinissables), lint (feuilles encadrées comme celles des composants de projet).
 * Renvoie { words (visibles : hérités + propres), own, errors: [{ line, message }], warnings: [{ line, message }] }.
 */
export function compileVocabulaire(text, { scope = 'site', inherited = new Map(), lint = true, outline = false } = {}) {
  const errors = [], warnings = [], own = new Map(), words = new Map(inherited);
  // Mots dont la définition est en erreur : un composant qui les emploie ne répète pas l'erreur (elle est dite une fois, ici).
  const broken = new Set(inherited.broken || []); words.broken = broken;
  const seen = new Set();
  const push = (list, line, message) => { const k = `${line}|${message}`; if (seen.has(k)) return; seen.add(k); list.push({ line: line ?? null, message }); };
  let doc, lineOf;
  if (outline) {
    // Vocabulaire écrit en document (vocabulaire.md) : même structure, mêmes lignes ; une ligne sans rôle arrête la lecture.
    const r = parseVocabularyOutline(text);
    for (const e of r.errors) push(errors, e.line, e.message);
    if (r.errors.length) { words.unreadable = true; return { words, own, errors, warnings }; }
    ({ value: doc, lineOf } = r);
    if (!Object.keys(doc.mots).length) return { words, own, errors, warnings };
  } else try { ({ value: doc, lineOf } = parseWithLines(text)); } catch (e) { push(errors, e.linePos?.[0]?.line ?? null, `vocabulaire.yaml illisible : ${e.message.split('\n')[0]}`); words.unreadable = true; return { words, own, errors, warnings }; }
  if (doc === null || doc === undefined) return { words, own, errors, warnings };
  if (typeof doc !== 'object' || Array.isArray(doc) || !doc.mots || typeof doc.mots !== 'object' || Array.isArray(doc.mots)) { push(errors, 1, 'vocabulaire.yaml : attendu « mots: » puis un mot par clé (description, données, forme ou gabarit)'); return { words, own, errors, warnings }; }
  for (const k of Object.keys(doc)) if (k !== 'mots') push(errors, lineOf({ in: doc, at: k }), `clé inconnue « ${k} » : un vocabulaire ne contient que « mots: »`);

  for (const [rawName, def] of Object.entries(doc.mots)) {
    const name = normName(rawName), line = lineOf({ in: doc.mots, at: rawName });
    const bad = (m, ref = null) => push(errors, (ref ? lineOf(ref) : null) ?? line, `mot « ${name} » : ${m}`);
    if (!NAME_RE.test(name)) { bad('un nom de mot s\'écrit en minuscules, avec des lettres, des chiffres, des espaces, des tirets ou des apostrophes (« carte de visite », « fil d\'ariane »)'); continue; }
    if (name in PRIMITIVES) { bad('c\'est déjà une primitive de la forme'); continue; }
    if (RESERVED_WORDS.includes(name) || /^(si|sinon)( |$)/.test(name)) { bad('ce nom est réservé par la forme'); continue; }
    const coll = COLLECTION_PRIMITIVES.find(c => name.startsWith(c + ' de '));
    if (coll) { bad(`« ${coll} de … » parcourt une liste : choisissez un nom qui ne commence pas ainsi`); continue; }
    if (inherited.has(name)) { bad('ce mot existe déjà dans le langage ; un vocabulaire ajoute des mots, il n\'en redéfinit pas'); continue; }
    if (own.has(name)) { bad('défini deux fois'); continue; }
    if (!def || typeof def !== 'object' || Array.isArray(def)) { bad('attendu : description, données, puis forme ou gabarit'); broken.add(name); continue; }
    let ok = true;
    for (const k of Object.keys(def)) if (!WORD_KEYS.includes(k)) { bad(`clé inconnue « ${k} » (${WORD_KEYS.join(', ')})`, { in: def, at: k }); ok = false; }
    if (typeof def.description !== 'string' || !def.description.trim()) { bad('description manquante : une phrase qui dit ce que le mot affiche'); ok = false; }
    const hasForme = def.forme !== undefined, hasGabarit = def.gabarit !== undefined;
    if (hasForme === hasGabarit) { bad(hasForme ? 'forme et gabarit à la fois : gardez l\'un des deux' : 'ni forme ni gabarit : un mot se définit par une forme (primitives et autres mots) ou par un fragment de gabarit'); ok = false; }
    if (hasForme && !Array.isArray(def.forme)) { bad('forme : attendu une liste d\'éléments (« - primitive: … »)', { in: def, at: 'forme' }); ok = false; }
    if (hasGabarit && (typeof def.gabarit !== 'string' || !def.gabarit.trim())) { bad('gabarit : attendu un texte (« gabarit: | » puis le balisage)', { in: def, at: 'gabarit' }); ok = false; }
    if (def.apparence !== undefined && !hasForme) { bad('apparence sans forme : l\'apparence vise les parties d\'une forme (pour un gabarit, écrivez « feuille: »)', { in: def, at: 'apparence' }); ok = false; }
    if (def.feuille !== undefined && typeof def.feuille !== 'string') { bad('feuille : attendu un texte CSS (« feuille: | »)', { in: def, at: 'feuille' }); ok = false; }
    // Parties : ce que le balisage d'un gabarit laisse viser à l'apparence de qui emploie le mot (« nom: sélecteur »).
    const parties = {};
    if (def.parties !== undefined) {
      if (!hasGabarit) { bad('parties sans gabarit : les parties d\'une forme sont ses primitives et ses noms « »', { in: def, at: 'parties' }); ok = false; }
      else if (!def.parties || typeof def.parties !== 'object' || Array.isArray(def.parties)) { bad('parties : attendu « nom: sélecteur » par ligne', { in: def, at: 'parties' }); ok = false; }
      else for (const [k, v] of Object.entries(def.parties)) {
        const sel = String(v ?? '').trim(), cls = '.' + (slug(name) || 'mot');
        const fine = sel.split(',').every(x => /^\.[a-z][a-z0-9_-]*(?:[ >+~]*(?:[a-z][a-z0-9]*|\.[a-z][a-z0-9_-]*|\[[a-z-]+(?:=[a-z0-9_-]+)?\]|:[a-z-]+(?:\([a-z0-9+ -]*\))?))*$/i.test(x.trim()) && (!lint || x.trim() === cls || x.trim().startsWith(cls + '-') || x.trim().startsWith(cls + ' ') || x.trim().startsWith(cls + '.') || x.trim().startsWith(cls + '>')));
        if (!fine) { bad(`partie « ${k} » : « ${sel} » n'est pas un sélecteur accepté (une classe${lint ? ` du mot, « ${cls} » ou « ${cls}-… »` : ''}, puis des balises, classes et attributs)`, { in: def.parties, at: k }); ok = false; continue; }
        parties[k] = sel;
      }
    }
    const d = compileDonnees(def['données'] ?? {}, 'données');
    for (const e of d.errors) { bad(`${e.path} : ${e.message}`, e.ref || { in: def, at: 'données' }); ok = false; }
    for (const p of Object.keys(d.schema.properties)) if (RESERVED_PARAMS.includes(p) || /^(it|w)\d+/.test(p)) { bad(`donnée « ${p} » : ce nom est réservé (${RESERVED_PARAMS.slice(0, 8).join(', ')}…)`, { in: def, at: 'données' }); ok = false; }
    if (!ok) { broken.add(name); continue; }
    const req = d.schema.required || [];
    const w = {
      id: `${scope}:${name}`, name, description: def.description.trim(), scope: words, line, def,
      params: Object.entries(d.schema.properties).map(([n, schema]) => ({ name: n, schema, required: req.includes(n) })),
      schema: { ...d.schema, $defs: LINK_DEFS },
      kind: hasForme ? 'forme' : 'gabarit', forme: def.forme, apparence: def.apparence, want: wantedParts(def.apparence),
      gabarit: hasGabarit ? def.gabarit : null, feuille: def.feuille ? def.feuille.trim() : null, parties,
      container: hasForme ? hasContenu(def.forme) : /\{\{\s*contenu\s*\}\}/.test(def.gabarit),
    };
    // Une donnée obligatoire après une facultative ne pourrait jamais être omise : l'ordre de la définition est l'ordre d'appel.
    const firstOpt = w.params.findIndex(p => !p.required);
    if (firstOpt >= 0 && w.params.slice(firstOpt).some(p => p.required)) { bad(`donnée « ${w.params.slice(firstOpt).find(p => p.required).name} » : les données obligatoires se déclarent avant les facultatives (elles se passent dans cet ordre)`, { in: def, at: 'données' }); broken.add(name); continue; }
    own.set(name, w); words.set(name, w);
  }

  // Chaque mot est compilé seul, comme l'unique élément d'un composant qui lui passe toutes ses données : une erreur de
  // définition se voit ici, à la ligne du vocabulaire, que le mot serve déjà ou non.
  const failed = [];
  for (const w of own.values()) {
    const before = errors.length;
    const call = w.container ? { [[w.name, ...w.params.map(p => p.name)].join(', ')]: [{ texte: '« … »' }] } : w.params.length ? { [w.name]: w.params.map(p => p.name).join(', ') } : w.name;
    const cname = slug(w.name) || 'mot';
    const at = k => lineOf({ in: w.def, at: k }) ?? w.line;
    const r = compileForme([call], { name: cname, props: w.schema, words });
    for (const e of r.errors) {
      let message = e.message.startsWith('dans le mot') ? e.message.replace(/^dans le mot/, 'mot') : `mot « ${w.name} » : ${e.message}`;
      let line = (e.inner ? lineOf(e.inner) : null) ?? at(w.kind);
      // Erreur dans un fragment de gabarit : la ligne du fragment devient celle du fichier (« gabarit: | » ouvre une ligne plus bas).
      const g = /^(mot « [^»]+ » : )gabarit, ligne ([0-9]+) : /.exec(message);
      if (g && e.inner?.at === 'gabarit' && lineOf(e.inner)) { line = lineOf(e.inner) + Number(g[2]); message = g[1] + message.slice(g[0].length); }
      push(errors, line, message);
    }
    if (!r.errors.length) {
      const t = compileTemplate(r.template, { name: cname, props: { ...w.schema, additionalProperties: false }, effects: null });
      // Le fragment commence à la troisième ligne du gabarit produit (après <section> et son conteneur) ; « gabarit: | » ouvre une ligne plus bas.
      for (const e of t.errors) push(errors, w.kind === 'gabarit' && e.line ? at('gabarit') + 1 + Math.max(0, e.line - 3) : at(w.kind), `mot « ${w.name} » : ${e.message}`);
    }
    if (w.feuille && lint) {
      const l = lintComponentCss(w.feuille, cname);
      for (const e of l.errors) push(errors, at('feuille') + e.line, `mot « ${w.name} », feuille : ${e.message} (chaque sélecteur commence par une classe « .${cname} » ou « .${cname}-… »)`);
      for (const e of l.warnings) push(warnings, at('feuille') + e.line, `mot « ${w.name} », feuille : ${e.message}`);
    }
    if (errors.length > before) failed.push(w.name);
  }
  for (const n of failed) own.get(n).broken = true;
  return { words, own, errors, warnings };
}

/** Mots d'un paquet vus depuis un site : « préfixe.mot ». */
export function prefixedWords(own, prefix) {
  const out = new Map();
  for (const [n, w] of own) out.set(`${prefix}.${n}`, { ...w, name: `${prefix}.${n}`, shortName: n });
  return out;
}
