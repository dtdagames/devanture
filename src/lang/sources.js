// Sources : ce qu'un composant lit à la visite, déclaré dans son bloc « fonctionnement ».
//
//   fonctionnement:
//     lit:
//       produits: produits de la boutique, catégorie filter.category, tri sort, limite limit
//       panier: panier du visiteur
//
// « nom: source, paramètre valeur, … ». Le nom s'emploie ensuite dans la forme comme une donnée (« - grille de produits: »).
// Une source est un service de la cible (boutique, horaires, mémoire du visiteur) : le langage dit ce qu'on lui demande et
// connaît la forme de ce qu'elle rend, écrite ici comme un bloc « données » ; la cible l'exécute à chaque visite
// (docs/CIBLES.md). Une valeur de paramètre est une donnée du composant (limit, filter.category), un nombre, oui, non ou « un texte ».
import { compileDonnees } from './donnees.js';

const norm = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[\s_]+/g, ' ').trim();

const PRODUIT = {
  id: 'texte — identifiant du produit',
  name: 'texte',
  price: 'nombre',
  price_text: 'texte — prix dans la devise de la boutique',
  category: 'texte, facultatif',
  image: 'image, facultatif',
  description: 'texte, facultatif',
  summary: 'texte, facultatif — description coupée à 110 caractères',
  badge: 'texte, facultatif',
  unit: 'texte, facultatif',
  featured: 'oui ou non, facultatif',
  stock: 'nombre, facultatif — rien quand le stock n\'est pas suivi',
  stock_text: 'texte, facultatif — « 12 en stock », « Plus que 2 en stock » ; rien quand le stock n\'est pas suivi ou qu\'il est épuisé',
  in_stock: 'oui ou non, facultatif — commandable',
  low_stock: 'oui ou non, facultatif — il en reste trois ou moins',
  max_qty: 'nombre — quantité maximale commandable',
  url: 'texte, facultatif — page du produit, quand le site en a une',
};
const LIGNE = { qty: 'nombre', name: 'texte', total_text: 'texte — prix de la ligne' };

/** Catalogue des sources. id : nom de la fonction de la cible (sl_src_<id>) ; params : nom français → clé passée à la cible. */
export const SOURCES = {
  'produits de la boutique': {
    id: 'products', service: 'boutique', description: 'les produits de data/products.yaml, avec le stock restant',
    params: { 'catégorie': 'category', 'vedettes': 'featured', 'tri': 'sort', 'limite': 'limit' },
    gives: { list: PRODUIT },
  },
  'produit de la page': {
    id: 'product', service: 'boutique', description: 'le produit de la page (route /produit/[id], source: products)',
    params: {}, gives: { group: PRODUIT },
  },
  'produits voisins': {
    id: 'related', service: 'boutique', description: 'les autres produits de la catégorie du produit de la page',
    params: { 'limite': 'limit' }, gives: { list: PRODUIT },
  },
  'panier du visiteur': {
    id: 'cart', service: 'boutique', description: 'le panier de la session : lignes et totaux',
    params: {},
    gives: { group: {
      'lines (liste)': { ...PRODUIT, qty: 'nombre', total_text: 'texte — prix de la ligne', low_text: 'texte, facultatif — « Plus que 2 disponibles »' },
      empty: 'oui ou non, facultatif — aucun article',
      subtotal_text: 'texte',
      shipping_text: 'texte — frais de livraison, ou « Offerte »',
      free_from_text: 'texte, facultatif — seuil de livraison offerte, s\'il n\'est pas atteint',
      total_text: 'texte',
      cart_url: 'texte, facultatif — page du panier',
      cart: 'lien, facultatif — « Voir le panier »',
      checkout: 'lien, facultatif — « Commander », vers la page de commande',
    } },
  },
  'saisie de la commande': {
    id: 'checkout', service: 'boutique', description: 'le formulaire de commande : ses champs, ce que le visiteur a saisi, les erreurs, le mode de paiement',
    params: { 'précisions': 'notes_label' },
    gives: { group: {
      error: 'texte, facultatif — message quand la commande est refusée',
      'fields (liste)': { name: 'texte', label: 'texte', type: 'texte', rows: 'nombre', long: 'oui ou non, facultatif — texte sur plusieurs lignes', required: 'oui ou non, facultatif', value: 'texte, facultatif', error: 'texte, facultatif' },
      payment_text: 'texte — comment se fait le paiement',
      submit_label: 'texte — « Confirmer la commande », ou « Payer 24,90 € »',
    } },
  },
  'commande de la page': {
    id: 'order', service: 'boutique', description: 'la commande de la page (route /commande/[id], source: orders)',
    params: {},
    gives: { group: {
      id: 'texte', date_text: 'texte — « 09/11/2026 à 14:05 »', status: 'texte', status_text: 'texte — statut en clair',
      'lines (liste)': LIGNE,
      subtotal_text: 'texte', shipping_text: 'texte — frais de livraison, ou « offerte »', total: 'nombre', total_text: 'texte',
      note: 'texte, facultatif — où en est le paiement',
      address: 'texte', email: 'texte',
    } },
  },
  'saisie du contact': {
    id: 'contact', service: 'formulaire de contact', only: 'contact.form', description: 'le formulaire de contact de la page : ses champs, ce que le visiteur a saisi, les erreurs, l\'envoi réussi',
    params: { 'champs': 'fields' },
    gives: { group: {
      sent: 'oui ou non, facultatif — le message vient d\'être envoyé',
      error: 'texte, facultatif — message quand l\'envoi est refusé',
      csrf: 'texte — jeton du formulaire',
      'fields (liste)': {
        name: 'texte', label: 'texte', type: 'texte', long: 'oui ou non, facultatif', choice: 'oui ou non, facultatif', numeric: 'oui ou non, facultatif',
        required: 'oui ou non, facultatif', value: 'texte, facultatif', error: 'texte, facultatif', placeholder: 'texte, facultatif',
        'options (liste)': { value: 'texte', selected: 'oui ou non, facultatif' },
        when_field: 'texte, facultatif — champ dont dépend l\'affichage', when_values: 'texte, facultatif', hidden: 'oui ou non, facultatif',
      },
    } },
  },
  'état du registre': {
    id: 'register', service: 'registre', description: 'où en est le registre d\'un formulaire : envois comptés, places prises et restantes, liste d\'attente',
    params: { 'registre': 'store' }, names: ['registre'],
    gives: { group: {
      limited: 'oui ou non, facultatif — le registre a un nombre de places',
      capacity: 'nombre, facultatif — places par groupe, ou en tout',
      count: 'nombre — places prises (envois annulés et liste d\'attente exclus)',
      entries: 'nombre — envois comptés',
      waiting: 'nombre — places demandées en liste d\'attente',
      left: 'nombre, facultatif — places restantes, tous groupes confondus',
      full: 'oui ou non, facultatif — plus aucune place',
      left_text: 'texte, facultatif — « 3 places restantes », « Dernière place », « Complet »',
      'groups (liste)': { value: 'texte — valeur du champ qui groupe', taken: 'nombre', left: 'nombre', full: 'oui ou non, facultatif', left_text: 'texte', waiting: 'nombre' },
    } },
  },
  'horaires du moment': {
    id: 'hours', service: 'horaires', description: 'les horaires d\'ouverture lus à l\'heure de la visite',
    params: { 'jours': 'days', 'fuseau': 'timezone' },
    gives: { group: {
      open: 'oui ou non, facultatif — ouvert en ce moment',
      status_text: 'texte — « Ouvert actuellement · ferme à 18 h », « Fermé actuellement · ouvre demain à 8 h »',
      'days (liste)': { name: 'texte — Lundi', slots_text: 'texte, facultatif — « 8 h – 12 h et 14 h – 18 h » ; rien quand c\'est fermé', today: 'oui ou non, facultatif' },
    } },
  },
  'consultations récentes': {
    id: 'recent', service: 'mémoire du visiteur', description: 'les produits et sections que le visiteur a consultés (consentement requis)',
    params: { 'limite': 'limit', 'types': 'kinds' },
    gives: { list: { title: 'texte', url: 'texte', is_product: 'oui ou non, facultatif', image: 'image, facultatif', meta: 'texte, facultatif — prix du produit, ou page de la section' } },
  },
};
export const SOURCE_NAMES = Object.keys(SOURCES);
/** Sources qu'un composant de projet ou de paquet peut lire (les autres sont liées à un composant natif). */
export const PUBLIC_SOURCE_NAMES = SOURCE_NAMES.filter(n => !SOURCES[n].only);

const schemaCache = new Map();
/** Schéma (celui d'une donnée) de ce que rend une source : une liste d'éléments ou un groupe. */
export function sourceSchema(name) {
  if (!schemaCache.has(name)) {
    const g = SOURCES[name].gives;
    const r = compileDonnees(g.list || g.group, 'source');
    if (r.errors.length) throw new Error(`source « ${name} » mal décrite : ${r.errors.map(e => e.path + ' ' + e.message).join(' ; ')}`);
    const obj = { type: 'object', additionalProperties: false, ...(r.schema.required ? { required: r.schema.required } : {}), properties: r.schema.properties };
    schemaCache.set(name, g.list ? { type: 'array', items: obj } : obj);
  }
  return schemaCache.get(name);
}

function splitOutside(s) { const out = []; let cur = '', q = 0; for (const ch of s) { if (ch === '«') q++; else if (ch === '»') q = Math.max(0, q - 1); if (ch === ',' && !q) { out.push(cur); cur = ''; } else cur += ch; } out.push(cur); return out.map(x => x.trim()).filter(Boolean); }
function lev(a, b) { const d = Array.from({ length: a.length + 1 }, (_, i) => [i]); for (let j = 1; j <= b.length; j++) d[0][j] = j; for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); return d[a.length][b.length]; }
const nearest = (w, list) => { let best = null, bd = Infinity; for (const c of list) { const d = lev(norm(w), norm(c)); if (d < bd) { bd = d; best = c; } } return bd <= Math.max(2, Math.floor(String(w).length / 3)) ? best : null; };

/** Valeur d'un paramètre → expression neutre : donnée du composant (p.a.b), nombre, booléen, texte. */
function valueExpr(text, props) {
  const t = text.trim();
  if (/^-?\d+([.,]\d+)?$/.test(t)) return { expr: t.replace(',', '.') };
  if (/^oui$/i.test(t)) return { expr: 'true' };
  if (/^non$/i.test(t)) return { expr: 'false' };
  const q = /^«\s*(.*?)\s*»$/.exec(t);
  if (q) return { expr: "'" + q[1].replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'" };
  if (/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)*$/.test(t)) {
    const path = t.split('.'); let sch = props;
    for (const [i, k] of path.entries()) {
      const next = sch?.properties?.[k];
      if (!next) { if (i === 0 || sch?.properties) return { error: `« ${t} » : « ${k} » n'est pas une donnée du composant${sch?.properties ? ` (connues : ${Object.keys(sch.properties).filter(x => !['id', 'keywords', 'variants', 'appearance'].includes(x)).join(', ')})` : ''}` }; break; }
      sch = next;
    }
    return { expr: 'p.' + t };
  }
  return { error: `« ${t} » n'est ni une donnée du composant, ni un nombre, ni oui ou non, ni « un texte »` };
}

/**
 * Compile « lit: » (objet YAML nom → phrase). props : schéma des données du composant (pour vérifier les valeurs).
 * Renvoie { sources: [{ key, source, id, args: { cléCible: expression neutre } }], errors: [{ path, message, ref }], failed: [noms en erreur] }.
 */
export function compileLit(block, { props = null, path = 'fonctionnement.lit', component = null } = {}) {
  const errors = [], sources = [], failed = [];
  const fail = (p, message, ref) => errors.push({ path: p, message, ref });
  if (!block || typeof block !== 'object' || Array.isArray(block)) { fail(path, 'attendu : une ligne par lecture, « nom: source, paramètre valeur » (sources : ' + PUBLIC_SOURCE_NAMES.join(', ') + ')', block); return { sources, errors, failed }; }
  const names = [...SOURCE_NAMES].sort((a, b) => b.length - a.length);
  for (const [key, value] of Object.entries(block)) {
    const ref = { in: block, at: key }, fp = `${path}.${key}`;
    if (!/^[a-z][a-z0-9_]*$/.test(key)) { fail(fp, `nom « ${key} » : minuscules sans accent, chiffres et _ (il sert dans la forme)`, ref); continue; }
    if (props?.properties?.[key]) { fail(fp, `« ${key} » est déjà une donnée du composant : donnez un autre nom à la lecture`, ref); continue; }
    if (sources.some(s => s.key === key)) { fail(fp, `lecture déclarée deux fois : ${key}`, ref); continue; }
    if (typeof value !== 'string' || !value.trim()) { fail(fp, 'attendu : « source, paramètre valeur » (sources : ' + PUBLIC_SOURCE_NAMES.join(', ') + ')', ref); continue; }
    const parts = splitOutside(value);
    const head = norm(parts[0]);
    const name = names.find(n => norm(n) === head);
    if (!name) { const s = nearest(parts[0], PUBLIC_SOURCE_NAMES); fail(fp, `source inconnue « ${parts[0]} »${s ? ` ; vouliez-vous dire « ${s} » ?` : ''} (sources : ${PUBLIC_SOURCE_NAMES.join(', ')})`, ref); continue; }
    const def = SOURCES[name], args = {}; let ok = true;
    if (def.only && component !== def.only) { fail(fp, `« ${name} » est réservée au composant ${def.only} ; pour un formulaire à vous, déclarez « fonctionnement: formulaire: »`, ref); continue; }
    const pnames = Object.keys(def.params).sort((a, b) => b.length - a.length);
    for (const part of parts.slice(1)) {
      const pn = pnames.find(n => norm(part) === norm(n) || norm(part).startsWith(norm(n) + ' '));
      if (!pn) { const first = part.split(/\s+/)[0]; const s = nearest(first, pnames); fail(fp, pnames.length ? `paramètre inconnu « ${first} » pour « ${name} »${s ? ` ; vouliez-vous dire « ${s} » ?` : ''} (paramètres : ${pnames.join(', ')})` : `« ${name} » ne prend pas de paramètre`, ref); ok = false; continue; }
      const rest = part.trim().split(/\s+/).slice(pn.split(/\s+/).length).join(' ');
      if (!rest) { fail(fp, `paramètre « ${pn} » sans valeur : « ${pn} donnée », « ${pn} 3 »`, ref); ok = false; continue; }
      if (def.params[pn] in args) { fail(fp, `paramètre « ${pn} » donné deux fois`, ref); ok = false; continue; }
      const isName = (def.names || []).includes(pn);
      if (isName && !/^(«\s*)?[a-z][a-z0-9_]*(\s*»)?$/.test(rest.trim())) { fail(fp, `paramètre « ${pn} » : attendu le nom du registre (celui de « enregistre dans: »), ex. « ${pn} inscriptions »`, ref); ok = false; continue; }
      const v = isName ? { expr: "'" + rest.replace(/[«»\s]/g, '') + "'" } : valueExpr(rest, props);
      if (v.error) { fail(fp, `paramètre « ${pn} » : ${v.error}`, ref); ok = false; continue; }
      args[def.params[pn]] = v.expr;
    }
    if (ok) sources.push({ key, source: name, id: def.id, args });
  }
  // Noms dont la ligne est en erreur : la forme les connaît quand même, pour ne pas répéter l'erreur à chaque emploi.
  for (const key of Object.keys(block)) if (/^[a-z][a-z0-9_]*$/.test(key) && !sources.some(x => x.key === key) && !props?.properties?.[key]) failed.push(key);
  return { sources, errors, failed };
}

/** Phrase d'emploi d'une source : « nom: source, paramètre donnée ». */
export function sourceUsage(name) {
  const d = SOURCES[name];
  return `${name}${Object.keys(d.params).map(p => `, ${p} ${(d.names || []).includes(p) ? '<nom>' : '<donnée>'}`).join('')}`;
}
/** Ce que rend une source, champ par champ, tel qu'écrit dans ce fichier : [{ name, spec, children? }]. */
export function sourceFields(name) {
  const g = SOURCES[name].gives, obj = g.list || g.group;
  const walk = o => Object.entries(o).map(([k, v]) => (typeof v === 'string' ? { name: k, spec: v } : { name: k.replace(/\s*\(.*$/, ''), spec: 'liste', children: walk(v) }));
  return { list: !!g.list, fields: walk(obj) };
}
