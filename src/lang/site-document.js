// Site au format document (prototype) : site.md à la place de site.yaml, pages/<id>.md à la place de pages/<id>.page.yaml.
//
// Un document de page est du texte : « # » le titre de la page, « ## composant : titre » une section, puis son contenu comme on
// l'écrirait pour un rédacteur : des paragraphes, des lignes « Nom : valeur », des liens « Libellé → /cible », des listes à puces
// dont les valeurs se suivent, séparées par « | ». Le lecteur ne devine pas à quoi sert une ligne : il le lit dans les données
// que le composant déclare (son bloc « données »), dans leur ordre. Aucun modèle, aucune règle par composant.
//
// Mêmes garde-fous que le document d'un composant :
//   1. toute ligne a un rôle : une ligne qui ne trouve pas sa place est refusée (E_DOCUMENT, à sa ligne), jamais ignorée ;
//   2. une seule lecture : les valeurs remplissent les données dans l'ordre de la déclaration, le type tranche, « rien » en saute une ;
//   3. la lecture est redite et figée : le YAML que le document vaut, dans lecture/ ; s'il change, la compilation s'arrête
//      (E_READING) jusqu'à « sitec lire <dossier> --accepter ».
// Ce qui ne se dit pas en lignes (variantes, groupes libres, collections) s'écrit dans un bloc ```yaml du document.
import YAML from 'yaml';
import { compileDonnees } from './donnees.js';
import { readDocument } from './document.js';

const norm = s => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[’`]/g, "'").replace(/\s+/g, ' ').trim();
function lev(a, b) { const d = Array.from({ length: a.length + 1 }, (_, i) => [i]); for (let j = 1; j <= b.length; j++) d[0][j] = j; for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); return d[a.length][b.length]; }
const near = (w, list) => { let best = null, bd = Infinity; for (const c of list) { const d = lev(norm(w), norm(c)); if (d < bd) { bd = d; best = c; } } return bd <= (norm(w).length <= 4 ? 1 : norm(w).length <= 8 ? 2 : 3) ? best : null; };

/** Noms français des composants natifs : « ## Bandeau : … » vaut « ## hero : … ». Le nom du composant reste toujours lu. */
export const COMPONENT_NAMES = {
  hero: 'bandeau', features: 'points forts', richtext: 'texte', gallery: 'galerie', testimonials: 'témoignages', faq: 'questions',
  cta: 'appel', team: 'équipe', stats: 'chiffres', map: 'accès', hours: 'horaires', pricelist: 'tarifs', steps: 'étapes',
  timeline: 'dates', 'contact.form': 'formulaire de contact', 'collection.list': 'liste',
};
/** Noms français des données les plus courantes : « Bouton : … » vaut « cta : … ». Le nom de la donnée reste toujours lu. */
export const PROP_NAMES = {
  title: 'titre', subtitle: 'sous-titre', text: 'texte', intro: 'introduction', cta: 'bouton', button: 'bouton', secondary: 'second bouton',
  link: 'lien', columns: 'colonnes', items: 'éléments', align: 'alignement', image_position: "côté de l'image", to: 'destinataire',
  fields: 'champs', required: 'obligatoires', success: 'confirmation', members: 'membres', address: 'adresse', access: 'accès',
  limit: 'limite', sort: 'tri', days: 'jours', groups: 'groupes', icon: 'icône', tone: 'ton', label: 'libellé', value: 'valeur',
  q: 'question', a: 'réponse', name: 'nom', role: 'rôle', src: 'fichier', caption: 'légende', price: 'prix', badge: 'mention',
  back: 'retour', unit: 'unité', timezone: 'fuseau', closed: 'fermé', slots: 'plages', day: 'jour', id: 'ancre', keywords: 'mots-clés', empty: 'vide',
};
/** Valeurs d'un choix dites en français. */
const VALUE_NAMES = { gauche: 'left', droite: 'right', centre: 'center', 'centré': 'center' };
const SKIP = 'rien';
const TARGET = /^(\/|#|https?:\/\/|mailto:|tel:|\{\{)/;
const FILE = /^[\w./-]+\.(svg|png|jpe?g|webp|gif|avif)$/i;

// ---------------------------------------------------------------------------------------------------------------------------
// Ce qu'une donnée attend, lu dans son schéma.

/** Genre d'une donnée : text, number, bool, enum, image, link, list (avec item), group, free. */
export function kindOf(s) {
  if (!s || typeof s !== 'object') return { k: 'text' };
  if (s.$ref && /\/link$/.test(s.$ref)) return { k: 'link' };
  if (Array.isArray(s.enum)) return { k: 'enum', values: s.enum };
  const t = Array.isArray(s.type) ? (s.type.includes('string') ? 'string' : s.type[0]) : s.type;
  if (t === 'array') return { k: 'list', item: s.items && Object.keys(s.items).length ? kindOf(s.items) : { k: 'text' }, schema: s.items || {} };
  if (t === 'object') return s.properties ? { k: 'group', schema: s } : { k: 'free' };
  if (t === 'integer' || t === 'number') return { k: 'number', integer: t === 'integer' };
  if (t === 'boolean') return { k: 'bool' };
  if (t === 'string' && s.format === 'asset') return { k: 'image' };
  if (t === undefined && !s.format) return { k: 'free' };
  return { k: 'text', plain: !s.format && !s.pattern };
}

/** Lien écrit « Libellé → /cible » (ou « -> », ou [Libellé](/cible)). */
export function parseLink(raw) {
  const s = String(raw).trim();
  let m = /^\[([^\]]+)\]\((\S[^)]*)\)$/.exec(s);
  if (m && TARGET.test(m[2])) return { label: m[1].trim(), to: m[2].trim() };
  const re = /\s*(?:→|->)\s*/g;
  while ((m = re.exec(s))) { const label = s.slice(0, m.index).trim(), to = s.slice(m.index + m[0].length).trim(); if (label && TARGET.test(to)) return { label, to }; }
  return null;
}
const isNumber = s => /^-?\d+(?:[.,]\d+)?$/.test(String(s).trim());
const toNumber = s => Number(String(s).trim().replace(',', '.'));
const inEnum = (values, raw) => { const r = String(raw).trim(); const hit = values.find(v => String(v) === r) ?? values.find(v => norm(v) === norm(r)); if (hit !== undefined) return { value: hit }; const al = VALUE_NAMES[norm(r)]; return al !== undefined && values.includes(al) ? { value: al } : null; };
const toBool = raw => { const r = norm(raw); return ['oui', 'true', 'vrai'].includes(r) ? { value: true } : ['non', 'false', 'faux'].includes(r) ? { value: false } : null; };

/** Valeur d'une ligne « Nom : valeur », selon le genre de la donnée. Renvoie { value } ou { error }. */
function parseValue(kind, raw) {
  const s = String(raw).trim();
  switch (kind.k) {
    case 'link': { const l = parseLink(s); return l ? { value: l } : { error: 'un lien s\'écrit « Libellé → /cible » (cible : /route, #ancre, https://…, mailto:…, tel:…)' }; }
    case 'number': return isNumber(s) && (!kind.integer || /^-?\d+$/.test(s)) ? { value: toNumber(s) } : { error: `un nombre${kind.integer ? ' entier' : ''} est attendu (lu : « ${s} »)` };
    case 'bool': return toBool(s) || { error: `oui ou non est attendu (lu : « ${s} »)` };
    case 'enum': return inEnum(kind.values, s) || { error: `une valeur parmi ${kind.values.join(', ')} est attendue (lu : « ${s} »)` };
    case 'list': {
      if (kind.item.k === 'text' || kind.item.k === 'free' || kind.item.k === 'image') return { value: s.split(/\s*,\s*/).filter(Boolean) };
      return { error: 'cette liste s\'écrit en dessous, une ligne « - » par élément' };
    }
    case 'group': case 'free': return { error: 'cette donnée ne se dit pas sur une ligne : écrivez-la dans un bloc ```yaml' };
    default: return { value: s };
  }
}

// ---------------------------------------------------------------------------------------------------------------------------
// Un élément de liste : « - valeur | valeur | … », les valeurs remplissent les champs dans l'ordre de leur déclaration.

function labelsOf(properties) {
  const map = new Map();
  map.shown = new Map(); // nom normalisé → nom tel qu'on l'écrit
  for (const k of Object.keys(properties)) { map.set(norm(k), k); map.shown.set(norm(k), k); }
  for (const k of Object.keys(properties)) { const a = PROP_NAMES[k]; if (a && !map.has(norm(a))) { map.set(norm(a), k); map.shown.set(norm(a), a); } }
  return map;
}
const split = text => String(text).split(/\s+\|\s+/).map(x => x.trim());

/** Lit un élément objet. Renvoie { value } ou { error }. */
function fitItem(text, schema) {
  const P = schema.properties || {}, keys = Object.keys(P), labels = labelsOf(P), out = {};
  const kinds = Object.fromEntries(keys.map(k => [k, kindOf(P[k])]));
  const later = (from, k) => keys.slice(from).some(x => !(x in out) && kinds[x].k === k);
  let p = 0;
  for (const raw of split(text)) {
    if (raw === '') return { error: 'valeur vide entre deux « | » : écrivez « rien » pour sauter un champ' };
    // Valeur nommée : « réponse : Oui » remplit le champ réponse, où qu'il soit.
    const m = /^([^:|]{1,40}?)\s*:\s+(.+)$/.exec(raw), named = m && labels.get(norm(m[1]));
    if (named && !(named in out)) { const v = parseValue(kinds[named], m[2]); if (!v.error) { out[named] = v.value; continue; } }
    if (norm(raw) === SKIP) { while (p < keys.length && keys[p] in out) p++; p++; continue; }
    let j = p;
    for (; j < keys.length; j++) { if (keys[j] in out) continue; if (accepts(kinds[keys[j]], raw, later(j + 1, 'link'), later(j + 1, 'image'))) break; }
    if (j >= keys.length) return { error: `« ${raw} » ne trouve pas de champ : après ${keys.slice(0, p).filter(k => k in out).join(', ') || 'le début'}, il reste ${keys.slice(p).filter(k => !(k in out)).join(', ') || 'aucun champ'}` };
    const v = parseValue(kinds[keys[j]], raw);
    if (v.error) return { error: v.error };
    out[keys[j]] = v.value; p = j + 1;
  }
  return { value: out };
}
/** Un champ accepte-t-il cette valeur ? Un lien va à un champ lien, un fichier image à un champ image, tant qu'il en reste un. */
function accepts(kind, raw, linkLater, imageLater) {
  const link = !!parseLink(raw), file = FILE.test(raw);
  switch (kind.k) {
    case 'link': return link;
    case 'image': return file;
    case 'enum': return !!inEnum(kind.values, raw);
    case 'number': return isNumber(raw) && (!kind.integer || /^-?\d+$/.test(raw.trim()));
    case 'bool': return !!toBool(raw);
    case 'list': return (kind.item.k === 'text' || kind.item.k === 'free') && !link && !file;
    case 'text': return !(link && linkLater) && !(file && imageLater);
    default: return false;
  }
}

/** Arbre de puces (par retrait) → valeurs d'une liste dont les éléments suivent itemSchema. */
function readItems(nodes, kind, fail, where, base) {
  const out = [];
  nodes.forEach((n, i) => {
    const at = `${base}[${i}]`; where[at] = n.line;
    if (kind.k === 'group') {
      const r = fitItem(n.text, kind.schema);
      if (r.error) { fail(n.line, r.error, `Champs, dans l'ordre : ${Object.keys(kind.schema.properties || {}).join(' | ')}.`); out.push({}); return; }
      if (n.children.length) {
        const lists = Object.entries(kind.schema.properties || {}).filter(([k, s]) => kindOf(s).k === 'list' && !(k in r.value));
        if (lists.length !== 1) fail(n.children[0].line, lists.length ? `des puces en retrait, mais ${lists.length} listes possibles (${lists.map(x => x[0]).join(', ')}) : écrivez cet élément dans un bloc \`\`\`yaml` : 'des puces en retrait, mais cet élément n\'a pas de liste');
        else r.value[lists[0][0]] = readItems(n.children, kindOf(lists[0][1]).item.k === 'text' && !kindOf(lists[0][1]).schema?.properties ? { k: 'text' } : kindOf(lists[0][1]).item, fail, where, `${at}.${lists[0][0]}`);
      }
      out.push(r.value); return;
    }
    if (n.children.length) fail(n.children[0].line, 'des puces en retrait sous une valeur simple');
    if (kind.k === 'link') { const l = parseLink(n.text); if (!l) fail(n.line, 'un lien s\'écrit « Libellé → /cible »'); out.push(l || n.text); return; }
    const v = kind.k === 'text' || kind.k === 'free' || kind.k === 'image' ? { value: n.text } : parseValue(kind, n.text);
    if (v.error) fail(n.line, v.error);
    out.push(v.error ? n.text : v.value);
  });
  return out;
}

// ---------------------------------------------------------------------------------------------------------------------------
// Du texte aux blocs, puis d'un bloc de lignes aux données d'un schéma.

/** Découpe un document en blocs : titres, lignes, puces, blocs ```yaml, lignes vides. */
export function splitBlocks(text) {
  const lines = String(text).replace(/\r\n/g, '\n').replace(/^\uFEFF/, '').split('\n'), out = [];
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i], l = raw.trim(), n = i + 1;
    if (/^```/.test(l)) {
      const lang = l.slice(3).trim().toLowerCase(), body = []; let j = i + 1;
      for (; j < lines.length && !/^```\s*$/.test(lines[j].trim()); j++) body.push(lines[j]);
      out.push({ kind: 'fence', line: n, lang, text: body.join('\n'), closed: j < lines.length }); i = j; continue;
    }
    if (!l) { out.push({ kind: 'blank', line: n }); continue; }
    let m;
    if ((m = /^(#{1,6})\s+(.*)$/.exec(l))) { out.push({ kind: 'h' + m[1].length, line: n, text: m[2].trim() }); continue; }
    if ((m = /^(\s*)[-*]\s+(.*)$/.exec(raw))) { out.push({ kind: 'item', line: n, indent: m[1].replace(/\t/g, '  ').length, text: m[2].trim(), raw: l }); continue; }
    out.push({ kind: 'text', line: n, text: l });
  }
  return out;
}

/**
 * Lit les lignes d'un bloc (une section, l'en-tête d'une page, le document du site) d'après un schéma de données.
 * opts : { title (donnée du titre déjà lue dans l'intitulé, ou null), prose (donnée des paragraphes, ou undefined pour la chercher),
 * labels (noms supplémentaires : Map nom normalisé → donnée), what (« ce composant », « la page »…) }.
 * Renvoie { props, where: { donnée → ligne }, errors: [{ line, message, hint }] }.
 */
export function readBody(blocks, schema, opts = {}) {
  const P = schema.properties || {}, keys = Object.keys(P), props = {}, where = {}, errors = [];
  const fail = (line, message, hint) => errors.push({ line, message, ...(hint ? { hint } : {}) });
  const kinds = Object.fromEntries(keys.map(k => [k, kindOf(P[k])]));
  const labels = labelsOf(P); for (const [l, k] of opts.labels || []) { labels.set(norm(l), k); labels.shown.set(norm(l), l); }
  const titleProp = opts.title !== undefined ? opts.title : ['title', 'titre'].find(k => kinds[k]?.k === 'text') || null;
  const proseProp = opts.prose !== undefined ? opts.prose : keys.slice(titleProp ? keys.indexOf(titleProp) + 1 : 0).find(k => kinds[k].k === 'text' && kinds[k].plain) || null;
  const lists = keys.filter(k => kinds[k].k === 'list' && k !== 'keywords');
  const structured = lists.filter(k => ['group', 'link'].includes(kinds[k].item.k));
  const defaultList = lists.length === 1 ? lists[0] : structured.length === 1 ? structured[0] : null;
  const links = keys.filter(k => kinds[k].k === 'link');
  const what = opts.what || 'ce composant';
  const paragraphs = {}; // donnée → [[lignes]]
  let target = null, open = false; // donnée texte ou liste choisie par « Nom : » ; paragraphe en cours
  const say = (k, line) => { if (!open || !paragraphs[k]) { (paragraphs[k] ||= []).push([]); open = true; where[k] ??= line; } return paragraphs[k][paragraphs[k].length - 1]; };
  const set = (k, value, line) => { if (k in props || paragraphs[k]) { fail(line, `« ${k} » est déjà dit ligne ${where[k]}`); return; } props[k] = value; where[k] = line; };
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    if (b.kind === 'blank') { open = false; continue; }
    if (b.kind === 'fence') {
      open = false;
      if (!b.closed) { fail(b.line, 'bloc ``` non fermé'); continue; }
      if (b.lang !== 'yaml' && b.lang !== 'yml') { fail(b.line, 'seul un bloc ```yaml est lu dans un document', 'Il porte les données qui ne se disent pas en lignes : variantes, groupes libres.'); continue; }
      let obj; try { obj = YAML.parse(b.text); } catch (e) { fail(b.line, `bloc yaml illisible : ${String(e.message).split('\n')[0]}`); continue; }
      if (!obj || typeof obj !== 'object' || Array.isArray(obj)) { fail(b.line, 'un bloc ```yaml porte des données nommées (« nom: valeur »)'); continue; }
      for (const [k, v] of Object.entries(obj)) {
        if (!(k in P) && !schema.open) { const s = near(k, keys); fail(b.line, `donnée inconnue de ${what} : ${k}${s ? ` (vouliez-vous dire ${s} ?)` : ''}`, `Données : ${keys.join(', ')}.`); continue; }
        set(k, v, b.line);
      }
      continue;
    }
    if (/^h[3-6]$/.test(b.kind)) { fail(b.line, 'intertitre non lu : une section s\'ouvre par « ## composant : titre », une liste par « Nom : »'); continue; }
    if (b.kind === 'item') {
      const list = target && kinds[target]?.k === 'list' ? target : (!target || kinds[target]?.k !== 'text') ? defaultList : null;
      if (!list) {
        // Pas de liste à remplir : les puces font partie du texte (balisage léger : une ligne vide puis des lignes « - »).
        const k = target && kinds[target]?.k === 'text' ? target : proseProp;
        if (lists.length && !(target && kinds[target]?.k === 'text')) { fail(b.line, `des puces, mais ${lists.length} listes possibles (${lists.join(', ')}) : annoncez-la par « ${PROP_NAMES[lists[0]] || lists[0]} : »`); continue; }
        if (!k) { fail(b.line, `${what} n'a ni liste ni texte libre où ranger cette puce`); continue; }
        say(k, b.line).push(b.raw); continue;
      }
      open = false;
      // Les puces qui se suivent forment la liste ; le retrait fait les éléments d'un élément.
      const run = []; let j = i;
      for (; j < blocks.length; j++) { if (blocks[j].kind === 'item') run.push(blocks[j]); else if (blocks[j].kind === 'blank' && blocks[j + 1]?.kind === 'item') continue; else break; }
      i = j - 1;
      const root = { children: [], indent: -1 }, stack = [root];
      for (const it of run) { while (stack.length > 1 && it.indent <= stack[stack.length - 1].indent) stack.pop(); const node = { text: it.text, line: it.line, indent: it.indent, children: [] }; stack[stack.length - 1].children.push(node); stack.push(node); }
      const values = readItems(root.children, kinds[list].item, fail, where, list);
      if (list in props) { fail(run[0].line, `« ${list} » est déjà dit ligne ${where[list]}`); continue; }
      props[list] = values; where[list] = run[0].line;
      continue;
    }
    // --- ligne de texte : « Nom : valeur », lien seul, ou paragraphe
    const m = /^([^:]{1,48}?)\s*:(?:\s+(.*))?$/.exec(b.text);
    const label = m ? labels.get(norm(m[1])) : null;
    if (m && label) {
      open = false;
      const value = (m[2] || '').trim(), kind = kinds[label];
      if (!value) {
        if (kind.k === 'list' || kind.k === 'text') { target = label; if (kind.k === 'text') { if (label in props || paragraphs[label]) fail(b.line, `« ${label} » est déjà dit ligne ${where[label]}`); } continue; }
        fail(b.line, `« ${m[1].trim()} : » attend une valeur sur la même ligne`); continue;
      }
      target = null;
      const v = parseValue(kind, value);
      if (v.error) { fail(b.line, `${m[1].trim()} : ${v.error}`); continue; }
      set(label, v.value, b.line); continue;
    }
    if (m && !label && m[1].trim().split(/\s+/).length <= 4 && m[2]) {
      // Une ligne qui a tout d'un réglage sans en être un est refusée, pas rangée dans le texte : un nom à une lettre près d'une
      // donnée (« Alignment »), ou qui reprend un mot d'une donnée du composant (« Image côté » pour « côté de l'image »).
      const said = norm(m[1]), wordsOf = s => s.split(/[^a-z0-9]+/).filter(w => w.length >= 4);
      const close = [...labels.keys()].filter(l => l.length >= 5 && lev(l, said) === 1);
      const shared = [...labels.keys()].map(l => ({ l, n: wordsOf(l).filter(w => wordsOf(said).includes(w)).length })).filter(x => x.n).sort((x, y) => y.n - x.n || x.l.length - y.l.length);
      const cand = close[0] || shared[0]?.l;
      if (cand) { fail(b.line, `« ${m[1].trim()} » n'est pas une donnée de ${what} : vouliez-vous dire « ${labels.shown.get(cand) || cand} » ?`, 'Un texte qui commence ainsi se tourne autrement, ou s\'écrit dans un bloc ```yaml.'); continue; }
    }
    const link = links.length ? parseLink(b.text) : null;
    if (link && !(target && kinds[target]?.k === 'text')) {
      open = false;
      const free = links.find(k => !(k in props));
      if (!free) { fail(b.line, `un lien de trop : ${what} en accepte ${links.length} (${links.join(', ')})`); continue; }
      set(free, link, b.line); continue;
    }
    const k = target && kinds[target]?.k === 'text' ? target : proseProp;
    if (!k) { fail(b.line, `ligne sans rôle : ${what} n'a pas de texte libre`, `Données : ${keys.filter(x => x !== 'variants').join(', ')}. Une ligne se dit « nom : valeur ».`); continue; }
    if (k in props) { fail(b.line, `« ${k} » est déjà dit ligne ${where[k]}`); continue; }
    say(k, b.line).push(b.text);
  }
  for (const [k, ps] of Object.entries(paragraphs)) props[k] = ps.map(p => p.join('\n')).join('\n\n');
  return { props, where, errors };
}

// ---------------------------------------------------------------------------------------------------------------------------
// Le document d'une page.

const PAGE_HEAD = { open: true, properties: { description: { type: 'string' }, route: { type: 'string', pattern: '^/' }, source: { type: 'string', pattern: '^[a-z]' } } };
const PAGE_LABELS = [['adresse', 'route'], ['description', 'description'], ['source', 'source']];
const PAGE_KEYS = ['variants', 'extends', 'override', 'remove', 'prepend', 'append', 'seo', 'page'];
const HEADER = what => `# Lecture de ${what} par sitec : le YAML que ce document vaut.\n# Ne modifiez pas ce fichier : corrigez le document, relisez « sitec lire <dossier> », puis acceptez (« --accepter »).\n`;

/** Nom de composant écrit dans un intitulé de section → nom du catalogue, ou null. */
function componentOf(said, schemas) {
  if (schemas.has(said)) return said;
  const n = norm(said);
  for (const name of schemas.keys()) if (norm(name) === n) return name;
  for (const [name, fr] of Object.entries(COMPONENT_NAMES)) if (norm(fr) === n && schemas.has(name)) return name;
  return null;
}

/**
 * Lit le document d'une page. schemas : Map nom de composant → schéma de ses données.
 * Renvoie { data (la page, comme lue d'un .page.yaml), yaml (la lecture, texte), errors: [{ line, message, hint }], where: { chemin → ligne } }.
 */
export function readPageDocument(text, { schemas }) {
  const blocks = splitBlocks(text), errors = [], where = {};
  const fail = (line, message, hint) => errors.push({ line, message, ...(hint ? { hint } : {}) });
  const firstSection = blocks.findIndex(b => b.kind === 'h2');
  const head = firstSection < 0 ? blocks : blocks.slice(0, firstSection);
  const data = {};
  // --- en-tête : « # titre », la description, « Adresse : /route »
  const h1 = head.findIndex(b => b.kind === 'h1');
  if (head.slice(0, Math.max(h1, 0)).some(b => b.kind !== 'blank') && h1 >= 0) fail(head[0].line, 'rien ne précède le titre de la page (« # Titre »)');
  if (head.filter(b => b.kind === 'h1').length > 1) fail(head.filter(b => b.kind === 'h1')[1].line, 'un seul « # » par page : c\'est son titre');
  const r = readBody(head.filter((b, i) => i !== h1), PAGE_HEAD, { title: null, prose: 'description', labels: PAGE_LABELS, what: 'la page' });
  errors.push(...r.errors);
  const { description, route, source, ...rest } = r.props;
  if (route !== undefined) { data.route = route; where.route = r.where.route; }
  else fail(head[h1 >= 0 ? h1 : 0]?.line || 1, 'la page ne dit pas son adresse', 'Ajoutez sous le titre : « Adresse : /contact » (« / » pour la page d\'accueil).');
  if (source !== undefined) data.source = source;
  if (h1 >= 0 || description !== undefined) { data.seo = { ...(h1 >= 0 ? { title: head[h1].text } : {}), ...(description !== undefined ? { description } : {}) }; where.seo = h1 >= 0 ? head[h1].line : r.where.description; }
  for (const [k, v] of Object.entries(rest)) { if (!PAGE_KEYS.includes(k)) { fail(r.where[k], `donnée inconnue de la page : ${k}`, `Dans un bloc yaml de l'en-tête : ${PAGE_KEYS.join(', ')}.`); continue; } if (k === 'seo' && data.seo) { data.seo = { ...v, ...data.seo }; continue; } data[k] = v; where[k] = r.where[k]; }
  // --- sections : « ## composant : titre » ou « ## composant #ancre : titre »
  const sections = [];
  if (firstSection >= 0) {
    const starts = blocks.map((b, i) => (b.kind === 'h2' ? i : -1)).filter(i => i >= 0);
    starts.forEach((s, n) => {
      const h = blocks[s], body = blocks.slice(s + 1, starts[n + 1] ?? blocks.length), base = `sections[${n}]`;
      where[base] = h.line;
      // Le nom du composant est ce qui précède le premier « : » ; sans « : », tout l'intitulé.
      let said = h.text, title, id; const cut = h.text.search(/\s:\s|:\s/);
      const tryName = s => { const m = /^(.*?)\s+#([a-z][a-z0-9-]*)$/.exec(s.trim()); const name = componentOf(m ? m[1].trim() : s.trim(), schemas); return name ? { name, id: m ? m[2] : undefined } : null; };
      let hit = tryName(h.text);
      if (!hit && cut >= 0) { hit = tryName(h.text.slice(0, cut)); if (hit) title = h.text.slice(cut).replace(/^\s*:\s*/, '').trim(); said = h.text.slice(0, cut).trim(); }
      if (!hit) {
        const names = [...schemas.keys(), ...Object.values(COMPONENT_NAMES)], bare = said.replace(/\s+#\S+$/, ''), s = near(bare, names) || names.find(n => norm(n).startsWith(norm(bare) + ' ')) || null;
        fail(h.line, `« ${said} » n'est pas un composant${s ? ` : vouliez-vous dire « ${s} » ?` : ''}`, 'Une section s\'ouvre par « ## composant : titre de la section » (sitec catalog <dossier> pour la liste).');
        sections.push({ [said]: {} }); return;
      }
      const schema = schemas.get(hit.name), P = schema.properties || {};
      const titleProp = ['title', 'titre'].find(k => kindOf(P[k]).k === 'text' && k in P) || null;
      const rb = readBody(body, schema, { what: hit.name });
      errors.push(...rb.errors);
      const props = {};
      if (title !== undefined && title !== '') { if (!titleProp) fail(h.line, `${hit.name} n'a pas de titre : rien après « : » dans l'intitulé`); else if (titleProp in rb.props) fail(rb.where[titleProp], `le titre est déjà dans l'intitulé de la section (ligne ${h.line})`); else props[titleProp] = title; }
      if (hit.id !== undefined) { if ('id' in rb.props) fail(rb.where.id, `l'ancre est déjà dans l'intitulé (ligne ${h.line})`); props.id = hit.id; }
      // Ordre des données : celui de la déclaration du composant, comme on l'écrirait en YAML.
      const all = { ...props, ...rb.props };
      const ordered = {}; for (const k of Object.keys(P)) if (k in all) ordered[k] = all[k]; for (const k of Object.keys(all)) if (!(k in ordered)) ordered[k] = all[k];
      for (const [k, l] of Object.entries(rb.where)) where[`${base}.${hit.name}.${k}`] = l;
      sections.push({ [hit.name]: ordered });
    });
  }
  if (sections.length) data.sections = sections;
  else if (data.extends === undefined) fail(blocks.find(b => b.kind !== 'blank')?.line || 1, 'la page n\'a aucune section', 'Une section s\'ouvre par « ## composant : titre ».');
  const ordered = {}; for (const k of ['route', 'source', 'seo', 'sections']) if (k in data) ordered[k] = data[k]; for (const k of Object.keys(data)) if (!(k in ordered)) ordered[k] = data[k];
  return { data: ordered, yaml: HEADER('ce document') + YAML.stringify(ordered, { lineWidth: 0 }), errors: errors.sort((a, b) => (a.line || 0) - (b.line || 0)), where };
}

// ---------------------------------------------------------------------------------------------------------------------------
// Le document du site.

/** Données du site dites en lignes ; le reste (boutique, collections, constantes…) s'écrit dans un bloc ```yaml. */
function siteSchema(tokens) {
  const properties = {
    tagline: { type: 'string' }, locale: { type: 'string' }, preset: { type: 'string' },
    ...Object.fromEntries(tokens.map(t => [t, { type: 'string' }])),
    nav: { type: 'array', items: { $ref: '#/$defs/link' } },
    footer_text: { type: 'string' }, footer_links: { type: 'array', items: { $ref: '#/$defs/link' } },
    email: { type: 'string' }, phone: { type: 'string' }, address: { type: 'string' },
    packages: { type: 'array', items: { type: 'string' } }, language: { type: 'integer' },
  };
  return { open: true, properties };
}
const SITE_LABELS = [['langue', 'locale'], ['thème', 'preset'], ['menu', 'nav'], ['pied de page', 'footer_text'], ['liens du pied de page', 'footer_links'], ['liens du pied', 'footer_links'], ['e-mail', 'email'], ['courriel', 'email'], ['téléphone', 'phone'], ['adresse', 'address'], ['paquets', 'packages'], ['langage', 'language']];

/**
 * Lit le document du site. tokens : noms des jetons de thème (« color.primary : #123456 » se dit sur une ligne).
 * Renvoie { data (comme lue de site.yaml), yaml, errors, where }.
 */
export function readSiteDocument(text, { tokens = [] } = {}) {
  const blocks = splitBlocks(text), errors = [], where = {};
  const fail = (line, message, hint) => errors.push({ line, message, ...(hint ? { hint } : {}) });
  const h1 = blocks.findIndex(b => b.kind === 'h1');
  if (h1 < 0) fail(1, 'le document du site commence par son nom : « # Nom du site »');
  for (const b of blocks) if (b.kind === 'h2' || (b.kind === 'h1' && b !== blocks[h1])) fail(b.line, 'le document du site n\'a qu\'un titre, son nom ; les pages s\'écrivent dans pages/<id>.md');
  const r = readBody(blocks.filter((b, i) => i !== h1 && b.kind !== 'h2' && b.kind !== 'h1'), siteSchema(tokens), { title: null, prose: 'tagline', labels: SITE_LABELS, what: 'le site' });
  errors.push(...r.errors);
  const p = r.props, site = {};
  if (h1 >= 0) { site.name = blocks[h1].text; where['site.name'] = blocks[h1].line; }
  const put = (obj, k, v, path, from) => { if (v !== undefined) { obj[k] = v; where[path] = r.where[from]; } };
  put(site, 'tagline', p.tagline, 'site.tagline', 'tagline'); put(site, 'locale', p.locale, 'site.locale', 'locale');
  const theme = {}; put(theme, 'preset', p.preset, 'site.theme.preset', 'preset');
  const tk = {}; for (const t of tokens) put(tk, t, p[t], `site.theme.tokens.${t}`, t);
  if (Object.keys(tk).length) theme.tokens = tk;
  if (Object.keys(theme).length) site.theme = theme;
  put(site, 'nav', p.nav, 'site.nav', 'nav');
  const footer = {}; put(footer, 'text', p.footer_text, 'site.footer.text', 'footer_text'); put(footer, 'links', p.footer_links, 'site.footer.links', 'footer_links');
  if (Object.keys(footer).length) site.footer = footer;
  const contact = {}; put(contact, 'email', p.email, 'site.contact.email', 'email'); put(contact, 'phone', p.phone, 'site.contact.phone', 'phone'); put(contact, 'address', p.address, 'site.contact.address', 'address');
  if (Object.keys(contact).length) site.contact = contact;
  const data = { language: p.language ?? 1 };
  if (p.packages !== undefined) { data.packages = p.packages; where.packages = r.where.packages; }
  const said = new Set(['tagline', 'locale', 'preset', ...tokens, 'nav', 'footer_text', 'footer_links', 'email', 'phone', 'address', 'packages', 'language']);
  const merge = (into, from, path, line) => { for (const [k, v] of Object.entries(from)) { if (v && typeof v === 'object' && !Array.isArray(v) && into[k] && typeof into[k] === 'object' && !Array.isArray(into[k])) merge(into[k], v, `${path}${k}.`, line); else if (k in into) fail(line, `« ${path}${k} » est dit deux fois : en ligne et dans le bloc yaml`); else { into[k] = v; where[`${path}${k}`] = line; } } };
  for (const [k, v] of Object.entries(p)) {
    if (said.has(k)) continue;
    if (k === 'site') { if (!v || typeof v !== 'object' || Array.isArray(v)) fail(r.where[k], 'site: attend des données nommées'); else merge(site, v, 'site.', r.where[k]); continue; }
    if (k in data) { fail(r.where[k], `« ${k} » est dit deux fois`); continue; }
    data[k] = v; where[k] = r.where[k];
  }
  data.site = site;
  // Ordre de lecture : celui d'un site.yaml.
  const ordered = {}; for (const k of ['language', 'constants', 'collections', 'packages', 'site']) if (k in data) ordered[k] = data[k]; for (const k of Object.keys(data)) if (!(k in ordered)) ordered[k] = data[k];
  return { data: ordered, yaml: HEADER('site.md') + YAML.stringify(ordered, { lineWidth: 0 }), errors: errors.sort((a, b) => (a.line || 0) - (b.line || 0)), where };
}

// ---------------------------------------------------------------------------------------------------------------------------
// Schémas des données de tous les composants visibles d'un site, sans attendre la validation : natifs, composants du site et des
// paquets (bloc données, props, ou document), composés (params).

const COMMON = { id: { type: 'string', pattern: '^[a-z][a-z0-9-]*$' }, keywords: { type: 'array', items: { type: 'string' } }, variants: { type: 'object' } };
const PARAM = { string: { type: 'string' }, text: { type: 'string' }, number: { type: 'number' }, boolean: { type: 'boolean' }, list: { type: 'array', items: {} }, object: { type: 'object' }, link: { $ref: '#/$defs/link' }, asset: { type: 'string', format: 'asset' } };

export function componentSchemas(project, catalog) {
  const out = new Map();
  for (const c of catalog.list()) out.set(c.name, c.manifest.props || { properties: {} });
  const fromSource = src => {
    try {
      const m = src.documentText !== undefined ? readDocument(src.documentText, { name: src.name }).manifest : YAML.parse(src.manifestText || '') || {};
      const s = m['données'] ? compileDonnees(m['données']).schema : (m.props && typeof m.props === 'object' ? m.props : { properties: {} });
      return { ...s, properties: { ...(s.properties || {}), ...COMMON } };
    } catch { return { properties: { ...COMMON } }; }
  };
  const fromComposites = (raw, prefix) => {
    const defs = raw && typeof raw === 'object' && raw.components && typeof raw.components === 'object' ? raw.components : {};
    for (const [name, def] of Object.entries(defs)) {
      const properties = {}, required = [];
      for (const [k, v] of Object.entries((def && def.params) || {})) { const t = typeof v === 'string' ? v : v?.type || 'string'; properties[k] = { ...(PARAM[t] || PARAM.string) }; if (v && typeof v === 'object' && v.required === true) required.push(k); }
      out.set(prefix ? `${prefix}.${name}` : name, { properties: { ...properties, id: COMMON.id, keywords: COMMON.keywords }, required });
    }
  };
  for (const pkg of project.packages || []) {
    const prefix = pkg.meta && typeof pkg.meta === 'object' ? pkg.meta.name : null;
    if (typeof prefix !== 'string') continue;
    for (const src of pkg.componentSources || []) out.set(`${prefix}.${src.name}`, fromSource(src));
    fromComposites(pkg.compositesRaw, prefix);
  }
  for (const src of project.componentSources || []) out.set(src.name, fromSource(src));
  fromComposites(project.componentsRaw, null);
  return out;
}

// ---------------------------------------------------------------------------------------------------------------------------
// L'écriture : d'un site en YAML à ses documents. Chaque document écrit est relu ; ce qui ne revient pas à l'identique passe
// dans un bloc ```yaml, si bien que la lecture du document rend toujours les données d'origine.

const same = (a, b) => JSON.stringify(canon(a)) === JSON.stringify(canon(b));
/** Forme de comparaison : clés triées, fins de texte ignorées (un bloc « | » de YAML finit par un saut de ligne). */
export function canon(v) {
  if (typeof v === 'string') return v.replace(/\s+$/, '');
  if (Array.isArray(v)) return v.map(canon);
  if (v && typeof v === 'object') return Object.fromEntries(Object.keys(v).sort().map(k => [k, canon(v[k])]));
  return v;
}
const oneLine = v => typeof v === 'string' && v.trim() === v && v !== '' && !/\n/.test(v);
const scalarText = (kind, v) => {
  if (kind.k === 'link') return v && typeof v === 'object' && oneLine(v.label) && oneLine(v.to) && Object.keys(v).length === 2 ? `${v.label} → ${v.to}` : null;
  if (kind.k === 'bool') return typeof v === 'boolean' ? (v ? 'oui' : 'non') : null;
  if (kind.k === 'number') return typeof v === 'number' ? String(v) : null;
  if (kind.k === 'enum') return typeof v === 'string' || typeof v === 'number' ? String(v) : null;
  if (kind.k === 'list') return Array.isArray(v) && v.length && v.every(x => oneLine(x) && !/[,|]/.test(x)) && ['text', 'free', 'image'].includes(kind.item.k) ? v.join(', ') : null;
  if (kind.k === 'text' || kind.k === 'image') return oneLine(v) ? v : null;
  return null;
};
const capital = s => s[0].toUpperCase() + s.slice(1);
const labelFor = (k, P) => { const fr = PROP_NAMES[k]; return capital(fr && !(fr in P) && !Object.keys(P).some(o => o !== k && PROP_NAMES[o] === fr) ? fr : k); };

/** Écrit un élément de liste sur une ligne, ou null s'il ne s'y écrit pas. */
function writeItem(item, kind) {
  if (kind.k !== 'group') { const t = kind.k === 'link' ? scalarText(kind, item) : oneLine(item) ? item : null; return t === null || / \| /.test(t) ? null : [t]; }
  if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
  const P = kind.schema.properties || {}, keys = Object.keys(P);
  if (Object.keys(item).some(k => !(k in P))) return null;
  const sub = keys.filter(k => k in item && kindOf(P[k]).k === 'list' && scalarText(kindOf(P[k]), item[k]) === null);
  const flat = keys.filter(k => k in item && !sub.includes(k));
  const texts = {};
  for (const k of flat) { const t = scalarText(kindOf(P[k]), item[k]); if (t === null || / \| /.test(t) || norm(t) === SKIP) return null; texts[k] = t; }
  // Essais, du plus court au plus sûr : valeurs à la suite ; puis les champs mal rangés dits par leur nom.
  const named = new Set();
  for (let round = 0; round <= flat.length; round++) {
    const line = flat.map(k => (named.has(k) ? `${labelFor(k, P).toLowerCase()} : ${texts[k]}` : texts[k])).join(' | ');
    const r = fitItem(line, kind.schema);
    const want = Object.fromEntries(flat.map(k => [k, item[k]]));
    if (!r.error && same(r.value, want)) {
      const lines = [line];
      for (const k of sub) {
        if (sub.length > 1) return null;
        const ik = kindOf(P[k]).item;
        for (const child of item[k]) { const w = writeItem(child, ik); if (!w) return null; lines.push(...w.map((l, n) => (n === 0 ? '  - ' : '  ') + l)); }
      }
      return lines;
    }
    const bad = flat.find(k => !named.has(k) && (r.error || !same(r.value?.[k], item[k])));
    if (bad === undefined) return null;
    named.add(bad);
  }
  return null;
}

/** Écrit les lignes d'un bloc d'après son schéma. fenced : données à écrire dans le bloc yaml. Renvoie { lines, fence }. */
function writeBody(props, schema, opts, fenced) {
  const P = schema.properties || {}, keys = Object.keys(P), kinds = Object.fromEntries(keys.map(k => [k, kindOf(P[k])]));
  const titleProp = opts.title !== undefined ? opts.title : ['title', 'titre'].find(k => kinds[k]?.k === 'text') || null;
  const proseProp = opts.prose !== undefined ? opts.prose : keys.slice(titleProp ? keys.indexOf(titleProp) + 1 : 0).find(k => kinds[k].k === 'text' && kinds[k].plain) || null;
  const lists = keys.filter(k => kinds[k].k === 'list' && k !== 'keywords');
  const structured = lists.filter(k => ['group', 'link'].includes(kinds[k].item.k));
  const defaultList = lists.length === 1 ? lists[0] : structured.length === 1 ? structured[0] : null;
  const links = keys.filter(k => kinds[k].k === 'link');
  const label = k => (opts.label ? opts.label(k) : null) || labelFor(k, P);
  const prose = [], named = [], bare = [], listed = [], long = [], fence = {};
  for (const k of [...keys, ...Object.keys(props).filter(k => !(k in P))]) {
    if (!(k in props) || (opts.skip || []).includes(k)) continue;
    const v = props[k], kind = kinds[k] || { k: 'free' };
    if (fenced.has(k)) { fence[k] = v; continue; }
    if (k === proseProp && typeof v === 'string' && v.trim() !== '' && v.trim() === v.replace(/\s+$/, '')) { prose.push(...v.replace(/\s+$/, '').split('\n')); continue; }
    if (kind.k === 'link') { const t = scalarText(kind, v); if (t === null) { fence[k] = v; continue; } if (links.slice(0, links.indexOf(k)).every(o => o in props && !fenced.has(o))) bare.push(t); else named.push(`${label(k)} : ${t}`); continue; }
    if (kind.k === 'list') {
      const t = scalarText(kind, v);
      if (t !== null && kind.item.k !== 'group' && kind.item.k !== 'link') { named.push(`${label(k)} : ${t}`); continue; }
      if (!Array.isArray(v) || !v.length) { fence[k] = v; continue; }
      const lines = []; let ok = true;
      for (const it of v) { const w = writeItem(it, kind.item); if (!w) { ok = false; break; } lines.push(...w.map((l, n) => (n === 0 ? '- ' + l : l))); }
      if (!ok) { fence[k] = v; continue; }
      listed.push({ k, lines: k === defaultList ? lines : [`${label(k)} :`, ...lines] }); continue;
    }
    const t = scalarText(kind, v);
    if (t === null && kind.k === 'text' && typeof v === 'string' && v.trim() !== '') { long.push(`${label(k)} :`, ...v.replace(/\s+$/, '').split('\n')); continue; }
    if (t === null) { fence[k] = v; continue; }
    named.push(`${label(k)} : ${t}`);
  }
  // La liste sans annonce d'abord (rien ne doit la précéder qui choisisse une autre liste), puis les listes annoncées.
  listed.sort((a, b) => (a.k === defaultList ? -1 : 0) - (b.k === defaultList ? -1 : 0));
  const lines = [...prose, ...named, ...bare, ...listed.flatMap(l => l.lines), ...long];
  if (Object.keys(fence).length) lines.push('```yaml', ...YAML.stringify(fence, { lineWidth: 0 }).trimEnd().split('\n'), '```');
  return { lines, fence };
}

/** Écrit un bloc et le relit jusqu'à ce que la lecture rende les données : ce qui diffère passe dans le bloc yaml. */
function writeChecked(props, schema, opts, read) {
  const fenced = new Set();
  for (let round = 0; round <= Object.keys(props).length + 1; round++) {
    const w = writeBody(props, schema, opts, fenced);
    const back = read(w.lines);
    const bad = Object.keys(props).filter(k => !(opts.skip || []).includes(k) && !fenced.has(k) && !same(back.props[k], props[k]));
    const extra = Object.keys(back.props).filter(k => !(k in props));
    if (!back.errors.length && !bad.length && !extra.length) return w.lines;
    if (!bad.length) { for (const k of Object.keys(props)) if (!(opts.skip || []).includes(k)) fenced.add(k); if (round > Object.keys(props).length) break; continue; }
    for (const k of bad) fenced.add(k);
  }
  return null;
}

/** Écrit une section (« ## composant : titre » puis son contenu). Renvoie { lines } ou { error }. */
export function writeSectionDocument(section, { schemas }) {
  const name = section && typeof section === 'object' ? Object.keys(section)[0] : null, props = name ? section[name] : null;
  if (!name || Object.keys(section).length !== 1 || !schemas.has(name) || (props !== null && (typeof props !== 'object' || Array.isArray(props)))) return { error: `section qui ne s'écrit pas en document : ${name || JSON.stringify(section)}` };
  const schema = schemas.get(name), P = schema.properties || {}, p = props || {};
  const titleProp = ['title', 'titre'].find(k => k in P && kindOf(P[k]).k === 'text') || null;
  const said = COMPONENT_NAMES[name] && !schemas.has(COMPONENT_NAMES[name]) ? capital(COMPONENT_NAMES[name]) : name;
  for (const tr of [{ t: true, i: true }, { t: false, i: true }, { t: false, i: false }]) {
    const inTitle = tr.t && titleProp && oneLine(p[titleProp]), inId = tr.i && typeof p.id === 'string' && /^[a-z][a-z0-9-]*$/.test(p.id);
    const heading = `## ${said}${inId ? ' #' + p.id : ''}${inTitle ? ' : ' + p[titleProp] : ''}`;
    const skip = [...(inTitle ? [titleProp] : []), ...(inId ? ['id'] : [])];
    const body = writeChecked(p, schema, { skip, what: name }, lines => readBody(splitBlocks(lines.join('\n')), schema, { what: name }));
    if (!body) continue;
    const back = readPageDocument(`Adresse : /x\n\n${[heading, ...body].join('\n')}\n`, { schemas });
    if (back.errors.length || !same(back.data.sections?.[0], { [name]: p })) continue;
    return { lines: [heading, ...body] };
  }
  return { error: `section ${name} qui ne se relit pas à l'identique` };
}

/** Écrit le document d'une page. Renvoie { text } ou { error }. */
export function writePageDocument(data, { schemas }) {
  const out = [], d = data || {};
  const title = d.seo && typeof d.seo === 'object' ? d.seo.title : undefined;
  if (title !== undefined && !oneLine(title)) return { error: 'titre de page sur plusieurs lignes' };
  if (title !== undefined) out.push(`# ${title}`, '');
  const headProps = { ...(d.seo && d.seo.description !== undefined ? { description: d.seo.description } : {}), ...(d.route !== undefined ? { route: d.route } : {}), ...(d.source !== undefined ? { source: d.source } : {}) };
  for (const k of Object.keys(d)) if (!['seo', 'route', 'source', 'sections', 'page'].includes(k)) headProps[k] = d[k];
  const seoRest = d.seo && typeof d.seo === 'object' ? Object.fromEntries(Object.entries(d.seo).filter(([k]) => !['title', 'description'].includes(k))) : {};
  if (Object.keys(seoRest).length) headProps.seo = seoRest;
  const headOpts = { title: null, prose: 'description', what: 'la page', label: k => ({ route: 'Adresse', source: 'Source' }[k] || null) };
  const head = writeChecked(headProps, PAGE_HEAD, headOpts, lines => readBody(splitBlocks(lines.join('\n')), PAGE_HEAD, { ...headOpts, labels: PAGE_LABELS }));
  if (!head) return { error: 'en-tête de page qui ne se relit pas' };
  // La description d'abord, sur son paragraphe ; puis les réglages.
  const descEnd = headProps.description !== undefined && head.length && !/^(Adresse|Source) : |^```/.test(head[0]) ? String(headProps.description).replace(/\s+$/, '').split('\n').length : 0;
  out.push(...head.slice(0, descEnd), ...(descEnd ? [''] : []), ...head.slice(descEnd));
  for (const section of Array.isArray(d.sections) ? d.sections : []) {
    const w = writeSectionDocument(section, { schemas });
    if (w.error) return { error: w.error };
    out.push('', ...w.lines);
  }
  const text = out.join('\n').replace(/\n{3,}/g, '\n\n').replace(/^\n+/, '') + '\n';
  const back = readPageDocument(text, { schemas });
  const { page: _page, ...want } = d;
  if (back.errors.length) return { error: `le document écrit ne se relit pas : ligne ${back.errors[0].line}, ${back.errors[0].message}` };
  if (!same(back.data, want)) return { error: 'le document écrit ne rend pas la page d\'origine' };
  return { text };
}

/** Écrit le document du site. Renvoie { text } ou { error }. */
export function writeSiteDocument(data, { tokens = [] } = {}) {
  const d = data || {}, site = d.site && typeof d.site === 'object' ? d.site : {};
  if (!oneLine(site.name)) return { error: 'site.name manquant ou sur plusieurs lignes' };
  const props = {}, rest = {};
  const take = (k, v) => { if (v !== undefined) props[k] = v; };
  take('tagline', site.tagline); take('locale', site.locale);
  const theme = site.theme && typeof site.theme === 'object' ? site.theme : {};
  take('preset', theme.preset);
  const tk = theme.tokens && typeof theme.tokens === 'object' ? theme.tokens : {};
  const themeRest = {}; for (const [k, v] of Object.entries(theme)) if (!['preset', 'tokens'].includes(k)) themeRest[k] = v;
  const tokensRest = {}; for (const [k, v] of Object.entries(tk)) { if (tokens.includes(k) && oneLine(v)) props[k] = v; else tokensRest[k] = v; }
  if (Object.keys(tokensRest).length) themeRest.tokens = tokensRest;
  if (theme.tokens && !Object.keys(tk).length) themeRest.tokens = theme.tokens;
  if (Object.keys(themeRest).length) rest.theme = themeRest;
  take('nav', site.nav);
  const footer = site.footer && typeof site.footer === 'object' ? site.footer : {};
  take('footer_text', footer.text); take('footer_links', footer.links);
  const footerRest = Object.fromEntries(Object.entries(footer).filter(([k]) => !['text', 'links'].includes(k))); if (Object.keys(footerRest).length || (site.footer !== undefined && !Object.keys(footer).length)) rest.footer = footerRest;
  const contact = site.contact && typeof site.contact === 'object' ? site.contact : {};
  take('email', contact.email); take('phone', contact.phone); take('address', contact.address);
  const contactRest = Object.fromEntries(Object.entries(contact).filter(([k]) => !['email', 'phone', 'address'].includes(k))); if (Object.keys(contactRest).length) rest.contact = contactRest;
  for (const [k, v] of Object.entries(site)) if (!['name', 'tagline', 'locale', 'theme', 'nav', 'footer', 'contact'].includes(k)) rest[k] = v;
  take('packages', d.packages);
  if (d.language !== undefined && d.language !== 1) props.language = d.language;
  for (const [k, v] of Object.entries(d)) if (!['site', 'packages', 'language'].includes(k)) props[k] = v;
  if (Object.keys(rest).length) props.site = rest;
  const schema = siteSchema(tokens);
  const label = k => ({ locale: 'Langue', preset: 'Thème', nav: 'Menu', footer_text: 'Pied de page', footer_links: 'Liens du pied de page', email: 'E-mail', phone: 'Téléphone', address: 'Adresse', packages: 'Paquets', language: 'Langage' }[k] || (tokens.includes(k) ? k : null));
  const opts = { title: null, prose: 'tagline', what: 'le site', label };
  const body = writeChecked(props, schema, opts, lines => readBody(splitBlocks(lines.join('\n')), schema, { ...opts, labels: SITE_LABELS }));
  if (!body) return { error: 'document du site qui ne se relit pas' };
  const tagEnd = props.tagline !== undefined && body[0] === String(props.tagline).split('\n')[0] ? String(props.tagline).replace(/\s+$/, '').split('\n').length : 0;
  const text = [`# ${site.name}`, '', ...body.slice(0, tagEnd), ...(tagEnd ? [''] : []), ...body.slice(tagEnd)].join('\n').replace(/\n{3,}/g, '\n\n') + '\n';
  const back = readSiteDocument(text, { tokens });
  if (back.errors.length) return { error: `le document écrit ne se relit pas : ligne ${back.errors[0].line}, ${back.errors[0].message}` };
  if (!same(back.data, { language: 1, ...d })) return { error: 'le document écrit ne rend pas le site d\'origine' };
  return { text };
}

/** Ligne du document où se trouve un chemin de validation (« sections[2].hero.cta.to ») : le préfixe connu le plus long. */
export function lineOfPath(where, path) {
  let p = String(path || '');
  while (p) { if (where[p] !== undefined && typeof where[p] === 'number') return where[p]; const cut = Math.max(p.lastIndexOf('.'), p.lastIndexOf('[')); if (cut <= 0) break; p = p.slice(0, cut); }
  return null;
}
