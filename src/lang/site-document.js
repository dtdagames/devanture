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
import { sourceSchema } from './sources.js';
import { compileDonnees } from './donnees.js';
import { readDocument } from './document.js';
import { parseFieldSpec } from './fonctionnement.js';
import { parseComponentOutline } from './outline.js';

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
  back: 'retour', unit: 'unité', variants: 'variantes', filter: 'filtre', category: 'catégorie', featured: 'vedette', project: 'projet', domain: 'domaine', aliases: 'alias', priority: 'priorité', goals: 'objectifs', experiments: 'expériences', goal: 'objectif', arms: 'bras', holdout: 'témoin', event: 'événement', where: 'où', constants: 'constantes', enabled: 'actif', currency: 'devise', payment: 'paiement', summary: 'résumé', quality: 'qualité', widths: 'largeurs', business_type: "type d'activité", manual_instructions: 'instructions de paiement', order_email: 'e-mail des commandes', short_name: 'nom court', theme_color: 'couleur du thème', requires_consent: 'consentement requis', consent_text: 'texte du consentement', title_field: 'champ du titre', placeholder: 'invite', timezone: 'fuseau', closed: 'fermé', slots: 'plages', day: 'jour', id: 'ancre', keywords: 'mots-clés', empty: 'vide',
};
/** Valeurs d'un choix dites en français. */
const VALUE_NAMES = { gauche: 'left', droite: 'right', centre: 'center', 'centré': 'center' };
const SKIP = 'rien';
/** Marque, dans le schéma d'une liste, des éléments qui sont des champs de formulaire : un nom connu, ou « nom : type, précisions — Libellé ». */
export const FIELD_MARK = 'champ de formulaire';
const FIELD_WORDS = { textarea: 'texte long', number: 'nombre', tel: 'téléphone', email: 'e-mail', date: 'date' };
const TARGET = /^(\/|#|https?:\/\/|mailto:|tel:|\{\{)/;
const FILE = /^[\w./-]+\.(svg|png|jpe?g|webp|gif|avif)$/i;

// ---------------------------------------------------------------------------------------------------------------------------
// Ce qu'une donnée attend, lu dans son schéma.

/** Genre d'une donnée : text, number, bool, enum, image, link, list (avec item), group, free. */
/** Marque d'un texte long (« texte long » dans les données d'un composant) : un texte en paragraphes. */
const LONG_MARK = 'texte long';
export function kindOf(s) {
  if (!s || typeof s !== 'object') return { k: 'text' };
  if (s.$comment === FIELD_MARK) return { k: 'field' };
  if (s.$ref && /\/link$/.test(s.$ref)) return { k: 'link' };
  if (Array.isArray(s.enum)) return { k: 'enum', values: s.enum };
  const t = Array.isArray(s.type) ? (s.type.includes('string') ? 'string' : s.type[0]) : s.type;
  if (t === 'array') return { k: 'list', item: s.items && Object.keys(s.items).length ? kindOf(s.items) : { k: 'text' }, schema: s.items || {} };
  if (t === 'object') return s.properties ? { k: 'group', schema: s } : { k: 'free' };
  if (t === 'integer' || t === 'number') return { k: 'number', integer: t === 'integer' };
  if (t === 'boolean') return { k: 'bool' };
  if (t === 'string' && s.format === 'asset') return { k: 'image' };
  if (t === undefined && !s.format) return { k: 'free' };
  return { k: 'text', plain: !s.format && !s.pattern, long: s.$comment === LONG_MARK };
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

/** Valeur d'une donnée libre (sans type déclaré) : oui / non, un nombre écrit sans détour, sinon le texte. */
const scalarOf = raw => { const s = String(raw).trim(); if (/^(oui|non)$/i.test(s)) return /^oui$/i.test(s); if (/^-?\d+(\.\d+)?$/.test(s) && String(Number(s)) === s) return Number(s); return s; };
const freeText = v => (typeof v === 'boolean' ? (v ? 'oui' : 'non') : typeof v === 'number' ? (scalarOf(String(v)) === v ? String(v) : null) : typeof v === 'string' && v.trim() === v && v !== '' && !/\n| \| /.test(v) && scalarOf(v) === v ? v : null);

/** Une valeur faite d'une seule expression : « {{ p.cta }} ». Sa valeur n'est connue qu'à la compilation. */
const EXPR = /^\{\{[^{}]+\}\}$/;
const exprFor = kind => ['link', 'number', 'bool', 'enum'].includes(kind.k) || (kind.k === 'list' && ['group', 'link'].includes(kind.item.k));

// Dans les sections d'un composant composé, une puce « pour chaque x de liste : … » produit un élément par valeur de la liste.
let LOOPS = false;
/** Lit ou écrit avec les boucles « pour chaque » permises (sections d'un composé). */
export const withLoops = fn => { const was = LOOPS; LOOPS = true; try { return fn(); } finally { LOOPS = was; } };
const LOOP = /^pour chaque\s+([a-z][a-z0-9_]*)\s+de\s+(.+?)\s*:(?:\s+(.*))?$/i;
const isLoop = v => !!v && typeof v === 'object' && !Array.isArray(v) && 'for' in v && 'item' in v && Object.keys(v).every(k => ['for', 'as', 'item'].includes(k));

/** Valeur d'une ligne « Nom : valeur », selon le genre de la donnée. Renvoie { value } ou { error }. */
function parseValue(kind, raw) {
  const s = String(raw).trim();
  if (EXPR.test(s) && exprFor(kind)) return { value: s };
  switch (kind.k) {
    case 'link': { const l = parseLink(s); return l ? { value: l } : { error: 'un lien s\'écrit « Libellé → /cible » (cible : /route, #ancre, https://…, mailto:…, tel:…)' }; }
    case 'number': return isNumber(s) && (!kind.integer || /^-?\d+$/.test(s)) ? { value: toNumber(s) } : { error: `un nombre${kind.integer ? ' entier' : ''} est attendu (lu : « ${s} »)` };
    case 'bool': return toBool(s) || { error: `oui ou non est attendu (lu : « ${s} »)` };
    case 'enum': return inEnum(kind.values, s) || { error: `une valeur parmi ${kind.values.join(', ')} est attendue (lu : « ${s} »)` };
    case 'list': {
      if (['text', 'free', 'image', 'field'].includes(kind.item.k)) return { value: s.split(/\s*,\s*/).filter(Boolean) };
      if (kind.item.k === 'number') { const parts = s.split(/\s*,\s+|\s+/).filter(Boolean); return parts.every(isNumber) ? { value: parts.map(toNumber) } : { error: `des nombres séparés par des virgules sont attendus (lu : « ${s} »)` }; }
      return { error: 'cette liste s\'écrit en dessous, une ligne « - » par élément' };
    }
    case 'group': case 'free': {
      // « category = savons, featured = oui » : les données du groupe, par leur nom.
      const GP = kind.k === 'group' ? kind.schema.properties || {} : null, L = GP ? labelsOf(GP) : null, out = {};
      for (const part of s.split(/\s*,\s+/)) {
        const m = /^([^=]{1,40}?)\s*=\s*(.+)$/.exec(part);
        if (!m) return { error: 'un groupe s\'écrit « nom = valeur, nom = valeur », ou en dessous : son nom suivi de « : » seul sur la ligne, puis une puce « nom | valeur » par donnée' };
        const k = L ? L.get(norm(m[1])) : m[1].trim();
        if (!k) return { error: `donnée inconnue : ${m[1].trim()} (données : ${Object.keys(GP).join(', ')})` };
        if (k in out) return { error: `« ${m[1].trim()} » est dit deux fois` };
        if (GP) { const v = parseValue(kindOf(GP[k]), m[2]); if (v.error) return { error: `${m[1].trim()} : ${v.error}` }; out[k] = v.value; } else out[k] = scalarOf(m[2]);
      }
      return { value: out };
    }
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
  let p = 0, lastText = null;
  const parts = split(text);
  for (const [n, raw] of parts.entries()) {
    if (raw === '') return { error: 'valeur vide entre deux « | » : écrivez « rien » pour sauter un champ' };
    // Un mot seul en minuscules là où un choix est attendu (une icône), suivi d'autres valeurs : c'est un choix mal écrit,
    // pas le champ suivant. Sans cela « briefcase | Droit des affaires » rangeait « briefcase » dans le titre.
    const due = keys.slice(p).find(k => !(k in out));
    if (due && kinds[due].k === 'enum' && n < parts.length - 1 && /^[a-z][a-z0-9_-]*$/.test(raw) && norm(raw) !== SKIP && !inEnum(kinds[due].values, raw)) {
      const after = keys.slice(keys.indexOf(due) + 1).find(k => !(k in out) && kinds[k].k === 'text');
      return { error: `« ${raw} » n'est pas une valeur de ${due} (valeurs : ${kinds[due].values.join(', ')})${after ? ` ; si c'est le champ ${after}, dites-le par son nom : « ${after} : ${raw} »` : ''}` };
    }
    // Valeur nommée : « réponse : Oui » remplit le champ réponse, où qu'il soit.
    const m = /^([^:|]{1,40}?)\s*:\s+(.+)$/.exec(raw), named = m && labels.get(norm(m[1]));
    if (named && !(named in out)) { const v = parseValue(kinds[named], m[2]); if (!v.error) { out[named] = v.value; lastText = kinds[named].k === 'text' ? named : null; continue; } }
    if (norm(raw) === SKIP) { while (p < keys.length && keys[p] in out) p++; p++; continue; }
    let j = p;
    for (; j < keys.length; j++) { if (keys[j] in out) continue; if (accepts(kinds[keys[j]], raw, later(j + 1, 'link'), later(j + 1, 'image'))) break; }
    if (j >= keys.length) return { error: `« ${raw} » ne trouve pas de champ : après ${keys.slice(0, p).filter(k => k in out).join(', ') || 'le début'}, il reste ${keys.slice(p).filter(k => !(k in out)).join(', ') || 'aucun champ'}` };
    const v = parseValue(kinds[keys[j]], raw);
    if (v.error) return { error: v.error };
    out[keys[j]] = v.value; p = j + 1; lastText = kinds[keys[j]].k === 'text' ? keys[j] : null;
  }
  return { value: out, lastText };
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
    case 'group': case 'free': return /^[^=|]{1,40}=/.test(raw);
    case 'text': return !(link && linkLater) && !(file && imageLater);
    default: return false;
  }
}

/** Arbre de puces (par retrait) → valeurs d'une liste dont les éléments suivent itemSchema. */
/** Puces « nom | … » d'une donnée nommée : valeur libre (« nom | valeur »), ou données d'un schéma (variantes, champs d'une collection). */
function readMap(nodes, map0, fail, where, base) {
  const out = {};
  for (const n of nodes) {
    let map = map0;
    const parts = split(n.text), key = parts[0];
    if (!key || key in out) { fail(n.line, key ? `« ${key} » est dit deux fois` : 'nom manquant avant « | »'); continue; }
    where[`${base}.${key}`] = n.line;
    if (map.parse) { const v = map.parse(parts.slice(1).join(' | '), n.children, fail, n.line); if (v !== undefined) out[key] = v; continue; }
    if (n.children.length) { fail(n.children[0].line, 'pas de puce en retrait sous une donnée nommée'); continue; }
    if (map.group) {
      const GP = map.group.properties || {}, k = labelsOf(GP).get(norm(key));
      if (!k) { const s = near(key, Object.keys(GP)); fail(n.line, `donnée inconnue : ${key}${s ? ` (vouliez-vous dire ${s} ?)` : ''}`, `Données : ${Object.keys(GP).join(', ')}.`); continue; }
      if (parts.length !== 2) { fail(n.line, `« ${key} » s'écrit « nom | valeur »`); continue; }
      const v = parseValue(kindOf(GP[k]), parts[1]);
      if (v.error) { fail(n.line, `${key} : ${v.error}`); continue; }
      delete where[`${base}.${key}`]; where[`${base}.${k}`] = n.line; out[k] = v.value; continue;
    }
    if (map.schemaFor) { const sch = map.schemaFor(key); if (!sch) { fail(n.line, `« ${key} » : ${map.unknown || 'nom inconnu'}`); continue; } map = { ...map, schema: sch, schemaFor: null }; }
    if (!map.schema) { if (parts.length !== 2) { fail(n.line, `une donnée libre s'écrit « nom | valeur » (lu : ${parts.length} partie${parts.length > 1 ? 's' : ''})`); continue; } out[key] = scalarOf(parts[1]); continue; }
    if (parts.length < 2) { fail(n.line, `« ${key} » : ses données manquent après « | »`, `Données : ${Object.keys(map.schema.properties).join(', ')}.`); continue; }
    const r = fitItem(parts.slice(1).join(' | '), map.schema);
    if (r.error) { fail(n.line, `${key} : ${r.error}`, `Données : ${Object.keys(map.schema.properties).join(', ')}.`); continue; }
    // Lignes en retrait sous la puce : la suite de son dernier texte (une ligne vide fait un paragraphe).
    if (n.more?.length) { if (!r.lastText) { fail(n.line + 1, 'des lignes en retrait, mais la puce ne finit pas par un texte'); continue; } r.value[r.lastText] += n.more.map(x => (x.gap ? '\n\n' : '\n') + x.text).join(''); }
    out[key] = map.short && Object.keys(r.value).length === 1 && map.short in r.value ? r.value[map.short] : r.value;
  }
  return out;
}

function readItems(nodes, kind, fail, where, base) {
  const out = [];
  if (LOOPS && nodes.length && LOOP.test(nodes[0].text)) {
    // « - pour chaque pt de p.points : check | {{ pt }} » : la liste entière vient de cette puce.
    const n = nodes[0], m = LOOP.exec(n.text), rest = (m[3] || '').trim();
    if (nodes.length > 1) fail(nodes[1].line, 'une liste « pour chaque » tient en une puce : elle produit tous les éléments de la liste');
    if (!rest && !n.children.length) { fail(n.line, 'après « pour chaque x de liste : », l\'élément à produire'); return { for: m[2].trim(), as: m[1], item: {} }; }
    const inner = readItems([{ ...n, text: rest || SKIP }], kind, fail, where, base);
    where[`${base}.item`] = n.line;
    return { for: m[2].trim(), as: m[1], item: inner[0] };
  }
  nodes.forEach((n, i) => {
    const at = `${base}[${i}]`; where[at] = n.line;
    if (n.more?.length && kind.k !== 'group') fail(n.line + 1, 'des lignes en retrait sous une valeur simple');
    if (kind.k === 'group') {
      const r = fitItem(n.text, kind.schema);
      if (r.error) { fail(n.line, r.error, `Champs, dans l'ordre : ${Object.keys(kind.schema.properties || {}).join(' | ')}.`); out.push({}); return; }
      // Lignes en retrait sous la puce : la suite du dernier texte de la ligne (une ligne vide fait un paragraphe).
      if (n.more?.length) { if (!r.lastText) fail(n.line + 1, 'des lignes en retrait, mais la puce ne finit pas par un texte'); else r.value[r.lastText] += n.more.map(p => (p.gap ? '\n\n' : '\n') + p.text).join(''); }
      if (n.children.length) {
        const lists = Object.entries(kind.schema.properties || {}).filter(([k, s]) => kindOf(s).k === 'list' && !(k in r.value));
        if (lists.length !== 1) fail(n.children[0].line, lists.length ? `des puces en retrait, mais ${lists.length} listes possibles (${lists.map(x => x[0]).join(', ')}) : écrivez cet élément dans un bloc \`\`\`yaml` : 'des puces en retrait, mais cet élément n\'a pas de liste');
        else r.value[lists[0][0]] = readItems(n.children, kindOf(lists[0][1]).item.k === 'text' && !kindOf(lists[0][1]).schema?.properties ? { k: 'text' } : kindOf(lists[0][1]).item, fail, where, `${at}.${lists[0][0]}`);
      }
      out.push(r.value); return;
    }
    if (n.children.length) fail(n.children[0].line, 'des puces en retrait sous une valeur simple');
    if (kind.k === 'field') {
      // Un champ : son nom seul s'il est connu (name, email, phone, subject, message), sinon « nom : type, précisions — Libellé ».
      const m = /^([a-z][a-z0-9_]*)\s*:\s*(.*)$/.exec(n.text);
      if (!m) { if (!/^[a-z][a-z0-9_]*$/.test(n.text)) fail(n.line, `champ illisible : « ${n.text} »`, 'Un champ : son nom (name, email, phone, subject, message), ou « nom : type, précisions — Libellé » (ex. « societe : texte, facultatif — Entreprise »).'); out.push(n.text); return; }
      const r = parseFieldSpec(m[1], m[2], out.map(x => (typeof x === 'string' ? { name: x } : x)));
      for (const e of r.errors) fail(n.line, `champ ${m[1]} : ${e}`);
      const f = r.field;
      out.push({ name: f.name, label: f.label, ...(f.type !== 'text' ? { type: f.type } : {}), ...(f.required ? { required: true } : {}), ...(f.options ? { options: f.options } : {}), ...(f.placeholder ? { placeholder: f.placeholder } : {}), ...(f.when ? { when: f.when } : {}) });
      return;
    }
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
    if ((m = /^(#{1,6})\s+(.*)$/.exec(l))) { out.push({ kind: 'h' + m[1].length, line: n, text: m[2].trim(), raw: l }); continue; }
    if ((m = /^(\s*)[-*]\s+(.*)$/.exec(raw))) { out.push({ kind: 'item', line: n, indent: m[1].replace(/\t/g, '  ').length, text: m[2].trim(), raw: l }); continue; }
    out.push({ kind: 'text', line: n, text: l, raw: l, indent: /^(\s*)/.exec(raw)[1].replace(/\t/g, '  ').length });
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
  // Données nommées, écrites en puces « nom | … » : groupe libre, ou données d'un schéma (variantes).
  const mapOf = k => (opts.maps && k in opts.maps ? opts.maps[k] : kinds[k]?.k === 'free' ? {} : kinds[k]?.k === 'group' ? { group: kinds[k].schema } : null);
  /** Les puces qui se suivent à partir du bloc i : un arbre par le retrait ; les lignes en retrait sans puce prolongent la puce. */
  const takeRun = i => {
    const root = { children: [], indent: -1 }, stack = [root]; let j = i, last = null, gap = false, first = blocks[i].line;
    for (; j < blocks.length; j++) {
      const x = blocks[j];
      if (x.kind === 'item') { while (stack.length > 1 && x.indent <= stack[stack.length - 1].indent) stack.pop(); last = { text: x.text, line: x.line, indent: x.indent, children: [], more: [] }; stack[stack.length - 1].children.push(last); stack.push(last); gap = false; }
      else if (x.kind === 'text' && x.indent >= 2 && last) { last.more.push({ text: x.text, gap }); gap = false; }
      else if (x.kind === 'blank' && (blocks[j + 1]?.kind === 'item' || (blocks[j + 1]?.kind === 'text' && blocks[j + 1].indent >= 2 && last))) gap = true;
      else break;
    }
    return { nodes: root.children, next: j, first };
  };
  const paragraphs = {}; // donnée → [[lignes]]
  let target = null, open = false; // donnée texte ou liste choisie par « Nom : » ; paragraphe en cours
  let verbatim = false; // un texte annoncé par « Nom : » se lit tel quel, jusqu'à l'annonce d'une autre donnée ou la fin du bloc
  const proseShown = () => (proseProp ? ([...labels.shown.entries()].filter(([l]) => labels.get(l) === proseProp).map(([, s]) => s).pop() || proseProp) : null);
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
    if (verbatim) {
      const an = b.kind === 'text' ? /^([^:]{1,48}?)\s*:$/.exec(b.text) : null, al = an ? labels.get(norm(an[1])) : null;
      if (!(al && ['list', 'text'].includes(kinds[al].k))) { say(target, b.line).push(b.raw); continue; }
    }
    if (/^h[13-6]$/.test(b.kind)) { fail(b.line, b.kind === 'h1' ? 'un seul « # » par document : c\'est son titre' : 'intertitre non lu : une section s\'ouvre par « ## composant : titre », une liste par « Nom : »', 'Dans un texte, annoncez-le d\'abord : « Texte : » seul sur sa ligne.'); continue; }
    if (b.kind === 'item' && target && mapOf(target)) {
      open = false;
      const run = takeRun(i); i = run.next - 1;
      if (target in props) { fail(run.first, `« ${target} » est déjà dit ligne ${where[target]}`); continue; }
      props[target] = readMap(run.nodes, mapOf(target), fail, where, target); where[target] = run.first;
      continue;
    }
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
      const taken = takeRun(i); i = taken.next - 1;
      const root = { children: taken.nodes }, run = [{ line: taken.first }];
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
        if (kind.k === 'list' || kind.k === 'text' || mapOf(label)) { target = label; verbatim = kind.k === 'text'; if (kind.k === 'text') { if (label in props || paragraphs[label]) fail(b.line, `« ${label} » est déjà dit ligne ${where[label]}`); } continue; }
        fail(b.line, `« ${m[1].trim()} : » attend une valeur sur la même ligne`); continue;
      }
      target = null;
      if (opts.maps && label in opts.maps) { fail(b.line, `« ${m[1].trim()} » s'écrit en dessous : « ${m[1].trim()} : » seul sur la ligne, puis une puce « nom | donnée : valeur | … » par nom`); continue; }
      const v = parseValue(kind, value);
      if (v.error) { fail(b.line, `${m[1].trim()} : ${v.error}`); continue; }
      set(label, v.value, b.line); continue;
    }
    if (m && !label && m[1].trim().split(/\s+/).length <= 3) {
      // Une ligne « nom : suite » d'un à trois mots est toujours une donnée : si le nom n'en est pas une, elle est refusée, jamais
      // rangée dans le texte. Le nom le plus proche est proposé (« Alignment », « Image côté » pour « côté de l'image »).
      const said = norm(m[1]), wordsOf = s => s.split(/[^a-z0-9]+/).filter(w => w.length >= 4);
      const close = [...labels.keys()].filter(l => l.length >= 5 && lev(l, said) === 1);
      const shared = [...labels.keys()].map(l => ({ l, n: wordsOf(l).filter(w => wordsOf(said).includes(w)).length })).filter(x => x.n).sort((x, y) => y.n - x.n || x.l.length - y.l.length);
      const cand = close[0] || shared[0]?.l, ps = proseShown();
      // Dans un texte long (mentions légales, description d'un poste), « Éditeur : Cabinet Garnier, 25 cours… » est une phrase du
      // texte : le mot ne ressemble à aucune donnée, et la suite n'a pas la forme d'un réglage (un seul mot, un nombre, un lien).
      const into = target && kinds[target]?.k === 'text' ? target : proseProp, suite = (m[2] || '').trim();
      const sentence = !cand && into && kinds[into]?.long && suite.split(/\s+/).length >= 2 && !parseLink(suite);
      if (!sentence) {
      fail(b.line, `« ${m[1].trim()} » n'est pas une donnée de ${what}${cand ? ` : vouliez-vous dire « ${labels.shown.get(cand) || cand} » ?` : ''}`, `Données : ${[...new Set(labels.shown.values())].filter(x => x !== 'variants').join(', ')}.${ps ? ` Si c'est une phrase du texte, annoncez le texte : « ${ps[0].toUpperCase() + ps.slice(1)} : » seul sur sa ligne, puis le texte, lu tel quel.` : ''}`);
      continue;
      }
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

const PAGE_HEAD = { open: true, properties: { description: { type: 'string' }, route: { type: 'string', pattern: '^/' }, source: { type: 'string', pattern: '^[a-z]' }, extends: { type: 'string', pattern: '^[a-z]' }, remove: { type: 'array', items: { type: 'string' } }, override: { type: 'object' }, variants: { type: 'object' } } };
/** Assemblage par segment d'une page : « Variantes : » puis « - segment | first : a, b | hide : c ». */
const PAGE_MAPS = { variants: { schema: { properties: { first: { type: 'array', items: { type: 'string' } }, hide: { type: 'array', items: { type: 'string' } } } } } };
/** Variantes d'une section : « Variantes : » puis « - segment | donnée : valeur | … », les données du composant lui-même. */
const sectionMaps = schema => ({ variants: { schema: { properties: Object.fromEntries(Object.entries(schema.properties || {}).filter(([k]) => !['id', 'keywords', 'variants'].includes(k))) } } });
const PAGE_LABELS = [['adresse', 'route'], ['description', 'description'], ['source', 'source'], ['dérive de', 'extends'], ['retire', 'remove'], ['remplace', 'override']];
/** Données nommées de l'en-tête d'une page. Une page dérivée remplace des sections de sa page de base : « Remplace : » puis
 *  « - ancre | donnée : valeur | … », lues d'après le composant de la section qui porte cette ancre. */
function pageMaps(base, schemas) {
  const maps = { ...PAGE_MAPS };
  if (base) maps.override = { unknown: 'aucune section de cette ancre dans la page de base', schemaFor: id => { const s = (Array.isArray(base.sections) ? base.sections : []).find(x => x && typeof x === 'object' && Object.values(x)[0]?.id === id); const sch = s ? schemas.get(Object.keys(s)[0]) : null; return sch ? { properties: Object.fromEntries(Object.entries(sch.properties || {}).filter(([k]) => !['id', 'variants'].includes(k))) } : null; } };
  return maps;
}
/** Page de base annoncée par le document (« Dérive de : accueil »), sans le lire en entier. */
export const baseOf = text => (/^(?:d[ée]rive de|extends)\s*:\s*([a-z][a-z0-9-]*)\s*$/im.exec(String(text)) || [])[1] || null;
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
export function readPageDocument(text, { schemas, pageOf = null }) {
  const blocks = splitBlocks(text), errors = [], where = {};
  const baseId = baseOf(text), base = baseId && pageOf ? pageOf(baseId) : null;
  const fail = (line, message, hint) => errors.push({ line, message, ...(hint ? { hint } : {}) });
  const firstSection = blocks.findIndex(b => b.kind === 'h2');
  const head = firstSection < 0 ? blocks : blocks.slice(0, firstSection);
  const data = {};
  // --- en-tête : « # titre », la description, « Adresse : /route »
  const h1 = head.findIndex(b => b.kind === 'h1');
  if (head.slice(0, Math.max(h1, 0)).some(b => b.kind !== 'blank') && h1 >= 0) fail(head[0].line, 'rien ne précède le titre de la page (« # Titre »)');
  if (head.filter(b => b.kind === 'h1').length > 1) fail(head.filter(b => b.kind === 'h1')[1].line, 'un seul « # » par page : c\'est son titre');
  const r = readBody(head.filter((b, i) => i !== h1), PAGE_HEAD, { title: null, prose: 'description', labels: PAGE_LABELS, what: 'la page', maps: pageMaps(base, schemas) });
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
      const rb = readBody(body, schema, { what: hit.name, maps: sectionMaps(schema) });
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
  // Une page dérivée n'a pas de sections propres : celles qu'elle écrit s'ajoutent après celles de sa page de base.
  if (sections.length && data.extends !== undefined) { if (data.append !== undefined) fail(where['sections[0]'], 'des sections sont déjà ajoutées par « append » dans le bloc yaml'); else data.append = sections; }
  else if (sections.length) data.sections = sections;
  else if (data.extends === undefined) fail(blocks.find(b => b.kind !== 'blank')?.line || 1, 'la page n\'a aucune section', 'Une section s\'ouvre par « ## composant : titre ».');
  const ordered = {}; for (const k of ['route', 'extends', 'source', 'seo', 'override', 'remove', 'sections', 'append']) if (k in data) ordered[k] = data[k]; for (const k of Object.keys(data)) if (!(k in ordered)) ordered[k] = data[k];
  return { data: ordered, yaml: HEADER('ce document') + YAML.stringify(ordered, { lineWidth: 0 }), errors: errors.sort((a, b) => (a.line || 0) - (b.line || 0)), where };
}

// ---------------------------------------------------------------------------------------------------------------------------
// Le document du site.

/** Données du site dites en lignes ; le reste (boutique, collections, constantes…) s'écrit dans un bloc ```yaml. */
function siteSchema(tokens) {
  const properties = {
    tagline: { type: 'string' }, locale: { type: 'string' }, preset: { type: 'string' },
    fonts: { type: 'array', items: { type: 'object', properties: { family: { type: 'string' }, file: { type: 'string' }, weight: { type: 'string' }, style: { type: 'string' } } } },
    background: { type: 'string' }, background_bottom: { type: 'string' }, background_fixed: { type: 'boolean' }, background_phone: { type: 'string' }, background_bottom_phone: { type: 'string' },
    ...Object.fromEntries(tokens.map(t => [t, { type: 'string' }])),
    nav: { type: 'array', items: { $ref: '#/$defs/link' } },
    footer_text: { type: 'string' }, footer_links: { type: 'array', items: { $ref: '#/$defs/link' } },
    email: { type: 'string' }, phone: { type: 'string' }, address: { type: 'string' },
    redirects: { type: 'array', items: { type: 'object', properties: { from: { type: 'string' }, to: { type: 'string' } } } },
    packages: { type: 'array', items: { type: 'string' } }, language: { type: 'integer' }, constants: { type: 'object' },
  };
  return { open: true, properties };
}
const SITE_LABELS = [['langue', 'locale'], ['thème', 'preset'], ['menu', 'nav'], ['pied de page', 'footer_text'], ['liens du pied de page', 'footer_links'], ['liens du pied', 'footer_links'], ['e-mail', 'email'], ['courriel', 'email'], ['téléphone', 'phone'], ['adresse', 'address'], ['paquets', 'packages'], ['langage', 'language'], ['redirections', 'redirects'], ['polices', 'fonts'], ['fond de page', 'background'], ['fond de bas de page', 'background_bottom'], ['fond fixe', 'background_fixed'], ['fond de page sur téléphone', 'background_phone'], ['fond de bas de page sur téléphone', 'background_bottom_phone']];

/** Noms français des réglages du site, chacun dans sa section : « ## Boutique », « ## Recherche »… */
export const GROUP_NAMES = { intent: 'recherche', agents: 'agents', personalization: 'personnalisation', static: 'statique', studio: 'atelier', images: 'images', offline: 'hors ligne', shop: 'boutique' };
/** Un réglage du site se lit à plat : un groupe dans le groupe prend un nom pointé (« shipping.flat »), comme un jeton de thème. */
const flatSchema = s => { const P = {}; for (const [k, v] of Object.entries(s.properties || {})) { if (v && v.type === 'object' && v.properties) for (const [k2, v2] of Object.entries(v.properties)) P[`${k}.${k2}`] = v2; else P[k] = v; } return { properties: P }; };
const flatData = (o, s) => { const out = {}; for (const [k, v] of Object.entries(o)) { const sub = s.properties?.[k]; if (sub && sub.type === 'object' && sub.properties && v && typeof v === 'object' && !Array.isArray(v)) for (const [k2, v2] of Object.entries(v)) out[`${k}.${k2}`] = v2; else out[k] = v; } return out; };
const unflat = o => { const out = {}; for (const [k, v] of Object.entries(o)) { const i = k.indexOf('.'); if (i < 0) out[k] = v; else (out[k.slice(0, i)] ||= {})[k.slice(i + 1)] = v; } return out; };
const groupLabel = k => (k.includes('.') ? k : null);
/** Une collection : « ## Collection realisations : Réalisations », puis « Tri : -date » et « Champs : » avec une puce « nom | type | oui » par champ. */
const COLLECTION = { properties: { label: { type: 'string' }, description: { type: 'string' }, sort: { type: 'string' }, title_field: { type: 'string' }, fields: { type: 'object' } } };
const COLLECTION_OPTS = { title: null, prose: 'description', what: 'la collection', maps: { fields: { short: 'type', schema: { properties: { type: { type: 'string' }, required: { type: 'boolean' }, label: { type: 'string' }, default: { type: 'string' }, description: { type: 'string' } } } } } };

/**
 * Lit le document du site. tokens : noms des jetons de thème (« color.primary : #123456 » se dit sur une ligne) ;
 * groups : schémas des réglages du site (boutique, agents…), chacun lu dans sa section « ## nom ».
 * Renvoie { data (comme lue de site.yaml), yaml, errors, where }.
 */
export function readSiteDocument(text, { tokens = [], groups = {} } = {}) {
  const all = splitBlocks(text), errors = [], where = {};
  const firstSection = all.findIndex(b => b.kind === 'h2');
  const blocks = firstSection < 0 ? all : all.slice(0, firstSection);
  const sections = [];
  if (firstSection >= 0) { const starts = all.map((b, i) => (b.kind === 'h2' ? i : -1)).filter(i => i >= 0); starts.forEach((s, n) => sections.push({ h: all[s], body: all.slice(s + 1, starts[n + 1] ?? all.length) })); }
  const fail = (line, message, hint) => errors.push({ line, message, ...(hint ? { hint } : {}) });
  const h1 = blocks.findIndex(b => b.kind === 'h1');
  if (h1 < 0) fail(1, 'le document du site commence par son nom : « # Nom du site »');
  for (const b of blocks) if (b.kind === 'h1' && b !== blocks[h1]) fail(b.line, 'le document du site n\'a qu\'un titre, son nom ; les pages s\'écrivent dans pages/<id>.md');
  const r = readBody(blocks.filter((b, i) => i !== h1 && b.kind !== 'h2' && b.kind !== 'h1'), siteSchema(tokens), { title: null, prose: 'tagline', labels: SITE_LABELS, what: 'ce site' });
  errors.push(...r.errors);
  const p = r.props, site = {};
  if (h1 >= 0) { site.name = blocks[h1].text; where['site.name'] = blocks[h1].line; }
  const put = (obj, k, v, path, from) => { if (v !== undefined) { obj[k] = v; where[path] = r.where[from]; } };
  put(site, 'tagline', p.tagline, 'site.tagline', 'tagline'); put(site, 'locale', p.locale, 'site.locale', 'locale');
  const theme = {}; put(theme, 'preset', p.preset, 'site.theme.preset', 'preset');
  const tk = {}; for (const t of tokens) put(tk, t, p[t], `site.theme.tokens.${t}`, t);
  if (Object.keys(tk).length) theme.tokens = tk;
  put(theme, 'fonts', p.fonts, 'site.theme.fonts', 'fonts');
  const bg = {}; put(bg, 'image', p.background, 'site.theme.background.image', 'background'); put(bg, 'bottom', p.background_bottom, 'site.theme.background.bottom', 'background_bottom'); put(bg, 'fixed', p.background_fixed, 'site.theme.background.fixed', 'background_fixed');
  const bgp = {}; put(bgp, 'image', p.background_phone, 'site.theme.background.phone.image', 'background_phone'); put(bgp, 'bottom', p.background_bottom_phone, 'site.theme.background.phone.bottom', 'background_bottom_phone');
  if (Object.keys(bgp).length) bg.phone = bgp;
  if (Object.keys(bg).length) theme.background = bg;
  if (Object.keys(theme).length) site.theme = theme;
  put(site, 'nav', p.nav, 'site.nav', 'nav');
  const footer = {}; put(footer, 'text', p.footer_text, 'site.footer.text', 'footer_text'); put(footer, 'links', p.footer_links, 'site.footer.links', 'footer_links');
  if (Object.keys(footer).length) site.footer = footer;
  const contact = {}; put(contact, 'email', p.email, 'site.contact.email', 'email'); put(contact, 'phone', p.phone, 'site.contact.phone', 'phone'); put(contact, 'address', p.address, 'site.contact.address', 'address');
  if (Object.keys(contact).length) site.contact = contact;
  put(site, 'redirects', p.redirects, 'site.redirects', 'redirects');
  const data = { language: p.language ?? 1 };
  if (p.packages !== undefined) { data.packages = p.packages; where.packages = r.where.packages; }
  const said = new Set(['tagline', 'locale', 'preset', 'fonts', 'background', 'background_bottom', 'background_fixed', 'background_phone', 'background_bottom_phone', ...tokens, 'nav', 'footer_text', 'footer_links', 'email', 'phone', 'address', 'packages', 'language', 'redirects']);
  if (p.collections !== undefined) { if (!p.collections || typeof p.collections !== 'object' || Array.isArray(p.collections)) fail(r.where.collections, 'collections: attend des collections nommées'); else data.collections = { ...p.collections }; said.add('collections'); }
  const merge = (into, from, path, line) => { for (const [k, v] of Object.entries(from)) { if (v && typeof v === 'object' && !Array.isArray(v) && into[k] && typeof into[k] === 'object' && !Array.isArray(into[k])) merge(into[k], v, `${path}${k}.`, line); else if (k in into) fail(line, `« ${path}${k} » est dit deux fois : en ligne et dans le bloc yaml`); else { into[k] = v; where[`${path}${k}`] = line; } } };
  for (const [k, v] of Object.entries(p)) {
    if (said.has(k)) continue;
    if (k === 'site') { if (!v || typeof v !== 'object' || Array.isArray(v)) fail(r.where[k], 'site: attend des données nommées'); else merge(site, v, 'site.', r.where[k]); continue; }
    if (k in data) { fail(r.where[k], `« ${k} » est dit deux fois`); continue; }
    data[k] = v; where[k] = r.where[k];
  }
  // Sections : un réglage du site (« ## Boutique ») ou une collection (« ## Collection realisations : Réalisations »).
  for (const { h, body } of sections) {
    const col = /^collection\s+([a-z][a-z0-9_]*)\s*(?::\s*(.*))?$/i.exec(h.text);
    if (col) {
      const r2 = readBody(body, COLLECTION, COLLECTION_OPTS); errors.push(...r2.errors);
      const spec = { ...(col[2] ? { label: col[2].trim() } : {}), ...r2.props };
      if (col[2] && 'label' in r2.props) fail(r2.where.label, `le libellé est déjà dans l'intitulé (ligne ${h.line})`);
      const ordered = {}; for (const k of ['label', 'description', 'fields', 'sort', 'title_field']) if (k in spec) ordered[k] = spec[k];
      if ((data.collections ||= {})[col[1]]) fail(h.line, `collection dite deux fois : ${col[1]}`); else { data.collections[col[1]] = ordered; where[`collections.${col[1]}`] = h.line; for (const [k, l] of Object.entries(r2.where)) where[`collections.${col[1]}.${k}`] = l; }
      continue;
    }
    const key = Object.keys(groups).find(k => norm(k) === norm(h.text) || (GROUP_NAMES[k] && norm(GROUP_NAMES[k]) === norm(h.text)));
    if (!key || !groups[key] || groups[key].type !== 'object' || !GROUP_NAMES[key]) { const names = Object.keys(GROUP_NAMES).filter(k => groups[k]).map(k => GROUP_NAMES[k]); fail(h.line, `« ${h.text} » n'est pas un réglage du site${near(h.text, names) ? ` : vouliez-vous dire « ${near(h.text, names)} » ?` : ''}`, `Sections de site.md : ${names.join(', ')}, ou « Collection <nom> : Libellé ». Les pages s'écrivent dans pages/<id>.md.`); continue; }
    if (key in site) { fail(h.line, `« ${h.text} » est dit deux fois`); continue; }
    const r2 = readBody(body, flatSchema(groups[key]), { title: null, prose: null, what: `la section ${GROUP_NAMES[key]}` }); errors.push(...r2.errors);
    site[key] = unflat(r2.props); where[`site.${key}`] = h.line; for (const [k, l] of Object.entries(r2.where)) where[`site.${key}.${k}`] = l;
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
      const m = src.documentText !== undefined ? readDocument(src.documentText, { name: src.name }).manifest : src.outlineText !== undefined ? parseComponentOutline(src.outlineText).value : YAML.parse(src.manifestText || '') || {};
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

const same = (a, b) => JSON.stringify(canon(a, true)) === JSON.stringify(canon(b, true));
/**
 * Forme de comparaison : clés triées, fins de texte ignorées (un bloc « | » de YAML finit par un saut de ligne).
 * loose : un nombre vaut son écriture (1999 et « 1999 »). Un document ne dit pas la différence, et elle n'existe que là où le
 * composant accepte les deux (une valeur affichée) : ailleurs la validation refuse l'un des deux.
 */
export function canon(v, loose = false) {
  if (typeof v === 'string') return v.replace(/\s+$/, '');
  if (typeof v === 'number' && loose) return String(v);
  if (Array.isArray(v)) return v.map(x => canon(x, loose));
  if (v && typeof v === 'object') return Object.fromEntries(Object.keys(v).sort().map(k => [k, canon(v[k], loose)]));
  return v;
}
const oneLine = v => typeof v === 'string' && v.trim() === v && v !== '' && !/\n/.test(v);
const scalarText = (kind, v) => {
  if (typeof v === 'string' && EXPR.test(v) && exprFor(kind)) return v;
  if (kind.k === 'link') return v && typeof v === 'object' && oneLine(v.label) && oneLine(v.to) && Object.keys(v).length === 2 ? `${v.label} → ${v.to}` : null;
  if (kind.k === 'bool') return typeof v === 'boolean' ? (v ? 'oui' : 'non') : null;
  if (kind.k === 'number') return typeof v === 'number' ? String(v) : null;
  if (kind.k === 'enum') return typeof v === 'string' || typeof v === 'number' ? String(v) : null;
  if (kind.k === 'list' && kind.item.k === 'number') return Array.isArray(v) && v.length && v.every(x => typeof x === 'number') ? v.join(', ') : null;
  if (kind.k === 'list') return Array.isArray(v) && v.length && v.every(x => oneLine(x) && !/[,|]/.test(x)) && ['text', 'free', 'image', 'field'].includes(kind.item.k) ? v.join(', ') : null;
  if (kind.k === 'text' || kind.k === 'image') { const s = typeof v === 'string' ? v.replace(/\s+$/, '') : v; return oneLine(s) ? s : typeof v === 'number' && kind.k === 'text' ? String(v) : null; }
  if (kind.k === 'group' || kind.k === 'free') {
    if (!v || typeof v !== 'object' || Array.isArray(v) || !Object.keys(v).length) return null;
    const GP = kind.k === 'group' ? kind.schema.properties || {} : null, parts = [];
    for (const [k, val] of Object.entries(v)) { if (GP && !(k in GP)) return null; if (!GP && !/^[\w.-]+$/.test(k)) return null; const x = GP ? scalarText(kindOf(GP[k]), val) : freeText(val); if (x === null || /,\s|\s=\s|=/.test(x)) return null; parts.push(`${GP ? labelFor(k, GP).toLowerCase() : k} = ${x}`); }
    return parts.join(', ');
  }
  return null;
};
const capital = s => s[0].toUpperCase() + s.slice(1);
const labelFor = (k, P) => { const fr = PROP_NAMES[k]; return capital(fr && !(fr in P) && !Object.keys(P).some(o => o !== k && PROP_NAMES[o] === fr) ? fr : k); };

/** Écrit un élément de liste sur une ligne, ou null s'il ne s'y écrit pas. */
function writeItem(item, kind) {
  if (kind.k === 'field') {
    if (typeof item === 'string') return /^[a-z][a-z0-9_]*$/.test(item) ? [item] : null;
    if (!item || typeof item !== 'object' || Array.isArray(item) || Object.keys(item).some(k => !['name', 'label', 'type', 'required', 'options', 'placeholder', 'when'].includes(k))) return null;
    if (!/^[a-z][a-z0-9_]*$/.test(item.name || '') || !oneLine(item.label) || /\s(—|–|--)\s|\(ex/.test(item.label) || item.type === 'text' || item.required === false) return null;
    const parts = [];
    if (item.type && item.type !== 'select') { if (!FIELD_WORDS[item.type]) return null; parts.push(FIELD_WORDS[item.type]); }
    if (item.required !== true) parts.push('facultatif');
    if (item.when !== undefined) { const ks = item.when && typeof item.when === 'object' ? Object.keys(item.when) : []; if (ks.length !== 1) return null; const v = item.when[ks[0]]; parts.push(`si ${ks[0]} vaut ${Array.isArray(v) ? v.join(' ou ') : v}`); }
    if (item.options !== undefined) { if (!Array.isArray(item.options) || !item.options.length || item.options.some(o => !oneLine(o) || /,/.test(o))) return null; parts.push(`un parmi ${item.options.join(', ')}`); }
    else if (item.type === 'select') return null;
    if (item.placeholder !== undefined && (!oneLine(item.placeholder) || /[()]/.test(item.placeholder))) return null;
    return [`${item.name} : ${parts.join(', ')}${parts.length ? ' ' : ''}— ${item.label}${item.placeholder ? ` (ex. ${item.placeholder})` : ''}`];
  }
  if (kind.k !== 'group') { const t = kind.k === 'link' ? scalarText(kind, item) : oneLine(item) ? item : null; return t === null || / \| /.test(t) ? null : [t]; }
  if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
  const P = kind.schema.properties || {}, keys = Object.keys(P);
  if (Object.keys(item).some(k => !(k in P))) return null;
  const sub = keys.filter(k => k in item && kindOf(P[k]).k === 'list' && scalarText(kindOf(P[k]), item[k]) === null);
  const flat = keys.filter(k => k in item && !sub.includes(k));
  const texts = {}; let tail = null;
  for (const k of flat) {
    let v = item[k];
    // Le dernier champ de la ligne, s'il est un texte de plusieurs lignes, se poursuit en retrait sous la puce.
    if (k === flat[flat.length - 1] && kindOf(P[k]).k === 'text' && typeof v === 'string' && /\n/.test(v.replace(/\s+$/, '')) && !sub.length) { const ls = v.replace(/\s+$/, '').split('\n'); if (ls.some((l, i) => i > 0 && l !== '' && l.trim() !== l) || ls[0].trim() !== ls[0] || ls[0] === '') return null; v = ls[0]; tail = ls.slice(1).map(l => (l === '' ? '' : '  ' + l)); }
    const t = scalarText(kindOf(P[k]), v); if (t === null || / \| /.test(t) || norm(t) === SKIP) return null; texts[k] = t;
  }
  // Essais, du plus court au plus sûr : valeurs à la suite ; puis les champs mal rangés dits par leur nom.
  const named = new Set();
  for (let round = 0; round <= flat.length; round++) {
    const line = flat.length ? flat.map(k => (named.has(k) ? `${labelFor(k, P).toLowerCase()} : ${texts[k]}` : texts[k])).join(' | ') : SKIP;
    const r = fitItem(line, kind.schema);
    const want = Object.fromEntries(flat.map(k => [k, item[k]]));
    if (!r.error && same(r.value, tail ? { ...want, [flat[flat.length - 1]]: texts[flat[flat.length - 1]] } : want)) {
      const lines = [line, ...(tail || [])];
      for (const k of sub) {
        if (sub.length > 1) return null;
        const ik = kindOf(P[k]).item;
        if (LOOPS && isLoop(item[k])) { const wl = writeLoop(item[k], ik); if (!wl) return null; lines.push(...wl.map(l => '  ' + l)); continue; }
        if (!Array.isArray(item[k])) return null;
        for (const child of item[k]) { const w = writeItem(child, ik); if (!w) return null; lines.push(...w.map((l, n) => (n === 0 ? '  - ' : '  ') + l)); }
      }
      return lines;
    }
    const bad = flat.find(k => !named.has(k) && (r.error || !same(r.value?.[k], tail && k === flat[flat.length - 1] ? texts[k] : item[k])));
    if (bad === undefined) return null;
    named.add(bad);
  }
  return null;
}

/** Écrit une liste produite par une boucle : « - pour chaque x de liste : » puis l'élément, écrit comme une puce. */
function writeLoop(v, kind) {
  if (!oneLine(v.for) || /:(\s|$)/.test(v.for) || typeof v.as !== 'string' || !/^[a-z][a-z0-9_]*$/.test(v.as)) return null;
  const w = writeItem(v.item, kind);
  return w ? [`- pour chaque ${v.as} de ${v.for} : ${w[0]}`, ...w.slice(1)] : null;
}

/** Écrit les lignes d'un bloc d'après son schéma. fenced : données à écrire dans le bloc yaml. Renvoie { lines, fence }. */
/** Écrit une donnée nommée en puces « nom | … », ou null si une valeur ne s'y écrit pas. */
function writeMap(v, map) {
  if (!v || typeof v !== 'object' || Array.isArray(v) || !Object.keys(v).length) return null;
  const lines = [];
  for (const [key, val] of Object.entries(v)) {
    if (!oneLine(key) || / \| /.test(key) || /^[-*]\s/.test(key)) return null;
    if (map.write) { const w = map.write(val); if (!w) return null; lines.push(`- ${key} | ${w[0]}`, ...w.slice(1).map(l => '  ' + l)); continue; }
    if (map.group) { const GP = map.group.properties || {}; if (!(key in GP)) return null; const t = scalarText(kindOf(GP[key]), val); if (t === null || / \| /.test(t)) return null; lines.push(`- ${labelFor(key, GP).toLowerCase()} | ${t}`); continue; }
    const schema = map.schemaFor ? map.schemaFor(key) : map.schema;
    if (map.schemaFor && !schema) return null;
    if (!schema) { const t = freeText(val); if (t === null) return null; lines.push(`- ${key} | ${t}`); continue; }
    const obj = map.short && typeof val === 'string' ? { [map.short]: val } : val;
    if (map.short && val && typeof val === 'object' && Object.keys(val).length === 1 && map.short in val) return null; // se relirait en écriture courte
    const w = writeItem(obj, { k: 'group', schema });
    if (!w || w.length !== 1) return null;
    lines.push(`- ${key} | ${w[0]}`);
  }
  return lines;
}

function writeBody(props, schema, opts, fenced, announced = new Set()) {
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
    if (k === proseProp && typeof v === 'string' && v.trim() !== '' && v.trim() === v.replace(/\s+$/, '')) { if (announced.has(k)) long.push(`${label(k)} :`, ...v.replace(/\s+$/, '').split('\n')); else prose.push(...v.replace(/\s+$/, '').split('\n')); continue; }
    const map = opts.maps && k in opts.maps ? opts.maps[k] : kind.k === 'free' ? {} : kind.k === 'group' ? { group: kind.schema } : null;
    if (map) { const one = !(opts.maps && k in opts.maps) ? scalarText(kind, v) : null; if (one !== null) { named.push(`${label(k)} : ${one}`); continue; } const ls = writeMap(v, map); if (ls) listed.push({ k, lines: [`${label(k)} :`, ...ls] }); else fence[k] = v; continue; }
    if (kind.k === 'link') { const t = scalarText(kind, v); if (t === null) { fence[k] = v; continue; } if (typeof v !== 'string' && links.slice(0, links.indexOf(k)).every(o => o in props && !fenced.has(o))) bare.push(t); else named.push(`${label(k)} : ${t}`); continue; }
    if (kind.k === 'list') {
      const t = scalarText(kind, v);
      if (t !== null && kind.item.k !== 'group' && kind.item.k !== 'link' && !(kind.item.k === 'field' && v.some(x => typeof x !== 'string'))) { named.push(`${label(k)} : ${t}`); continue; }
      if (LOOPS && isLoop(v)) { const wl = writeLoop(v, kind.item); if (wl) { listed.push({ k, lines: k === defaultList ? wl : [`${label(k)} :`, ...wl] }); continue; } }
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
  return { lines, fence, proseProp: typeof props[proseProp] === 'string' && !fenced.has(proseProp) ? proseProp : null };
}

/** Écrit un bloc et le relit jusqu'à ce que la lecture rende les données : ce qui diffère passe dans le bloc yaml. */
function writeChecked(props, schema, opts, read) {
  const fenced = new Set(), announced = new Set();
  for (let round = 0; round <= Object.keys(props).length + 2; round++) {
    const w = writeBody(props, schema, opts, fenced, announced);
    const back = read(w.lines);
    const bad = Object.keys(props).filter(k => !(opts.skip || []).includes(k) && !fenced.has(k) && !same(back.props[k], props[k]));
    const extra = Object.keys(back.props).filter(k => !(k in props));
    if (!back.errors.length && !bad.length && !extra.length) return w.lines;
    // Un texte libre qui ne se relit pas tel quel (une phrase « mot : suite », un lien seul) s'annonce : il est alors lu tel quel.
    if (w.proseProp && !announced.has(w.proseProp)) { announced.add(w.proseProp); continue; }
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
    const body = writeChecked(p, schema, { skip, what: name, maps: sectionMaps(schema) }, lines => readBody(splitBlocks(lines.join('\n')), schema, { what: name, maps: sectionMaps(schema) }));
    if (!body) continue;
    const back = readPageDocument(`Adresse : /x\n\n${[heading, ...body].join('\n')}\n`, { schemas });
    if (back.errors.length || !same(back.data.sections?.[0], { [name]: p })) continue;
    return { lines: [heading, ...body] };
  }
  return { error: `section ${name} qui ne se relit pas à l'identique` };
}

/** Écrit le document d'une page. Renvoie { text } ou { error }. */
export function writePageDocument(data, { schemas, pageOf = null }) {
  const out = [], d = data || {};
  const base = typeof d.extends === 'string' && pageOf ? pageOf(d.extends) : null, derived = d.extends !== undefined && d.sections === undefined;
  const title = d.seo && typeof d.seo === 'object' ? d.seo.title : undefined;
  if (title !== undefined && !oneLine(title)) return { error: 'titre de page sur plusieurs lignes' };
  if (title !== undefined) out.push(`# ${title}`, '');
  const headProps = { ...(d.seo && d.seo.description !== undefined ? { description: d.seo.description } : {}), ...(d.route !== undefined ? { route: d.route } : {}), ...(d.source !== undefined ? { source: d.source } : {}) };
  for (const k of Object.keys(d)) if (!['seo', 'route', 'source', 'sections', 'page'].includes(k) && !(derived && k === 'append')) headProps[k] = d[k];
  const seoRest = d.seo && typeof d.seo === 'object' ? Object.fromEntries(Object.entries(d.seo).filter(([k]) => !['title', 'description'].includes(k))) : {};
  if (Object.keys(seoRest).length) headProps.seo = seoRest;
  const headOpts = { title: null, prose: 'description', what: 'la page', maps: pageMaps(base, schemas), label: k => ({ route: 'Adresse', source: 'Source', extends: 'Dérive de', remove: 'Retire', override: 'Remplace', variants: 'Variantes' }[k] || null) };
  const head = writeChecked(headProps, PAGE_HEAD, headOpts, lines => readBody(splitBlocks(lines.join('\n')), PAGE_HEAD, { ...headOpts, labels: PAGE_LABELS }));
  if (!head) return { error: 'en-tête de page qui ne se relit pas' };
  // La description d'abord, sur son paragraphe ; puis les réglages.
  const descEnd = headProps.description !== undefined && head.length && !/^(Adresse|Source|Dérive de|Retire) : |^(Remplace|Variantes) :$|^```/.test(head[0]) ? String(headProps.description).replace(/\s+$/, '').split('\n').length : 0;
  out.push(...head.slice(0, descEnd), ...(descEnd ? [''] : []), ...head.slice(descEnd));
  for (const section of derived ? (Array.isArray(d.append) ? d.append : []) : Array.isArray(d.sections) ? d.sections : []) {
    const w = writeSectionDocument(section, { schemas });
    if (w.error) return { error: w.error };
    out.push('', ...w.lines);
  }
  const text = out.join('\n').replace(/\n{3,}/g, '\n\n').replace(/^\n+/, '') + '\n';
  const back = readPageDocument(text, { schemas, pageOf });
  const { page: _page, ...want } = d;
  if (back.errors.length) return { error: `le document écrit ne se relit pas : ligne ${back.errors[0].line}, ${back.errors[0].message}` };
  if (!same(back.data, want)) return { error: 'le document écrit ne rend pas la page d\'origine' };
  return { text };
}

/** Écrit le document du site. Renvoie { text } ou { error }. */
export function writeSiteDocument(data, { tokens = [], groups = {} } = {}) {
  const d = data || {}, site = d.site && typeof d.site === 'object' ? d.site : {};
  if (!oneLine(site.name)) return { error: 'site.name manquant ou sur plusieurs lignes' };
  const props = {}, rest = {};
  const take = (k, v) => { if (v !== undefined) props[k] = v; };
  take('tagline', site.tagline); take('locale', site.locale); take('redirects', site.redirects);
  const theme = site.theme && typeof site.theme === 'object' ? site.theme : {};
  take('preset', theme.preset);
  const tk = theme.tokens && typeof theme.tokens === 'object' ? theme.tokens : {};
  take('fonts', theme.fonts);
  const bg = theme.background && typeof theme.background === 'object' && !Array.isArray(theme.background) ? theme.background : null;
  const bgPhone = bg && bg.phone && typeof bg.phone === 'object' && !Array.isArray(bg.phone) && Object.keys(bg.phone).every(x => ['image', 'bottom'].includes(x)) ? bg.phone : null;
  if (bg) { take('background', bg.image); take('background_bottom', bg.bottom); take('background_fixed', bg.fixed); }
  if (bgPhone) { take('background_phone', bgPhone.image); take('background_bottom_phone', bgPhone.bottom); }
  const themeRest = {}; for (const [k, v] of Object.entries(theme)) if (!['preset', 'tokens', 'fonts', ...(bg && Object.keys(bg).every(x => ['image', 'bottom', 'fixed'].includes(x) || (x === 'phone' && bgPhone)) ? ['background'] : [])].includes(k)) themeRest[k] = v;
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
  // Réglages et collections : chacun dans sa section, s'il s'y écrit sans bloc yaml ; sinon il reste dans le bloc.
  const sections = [];
  for (const [k, v] of Object.entries(site)) {
    if (['name', 'tagline', 'locale', 'theme', 'nav', 'footer', 'contact', 'redirects'].includes(k)) continue;
    const g = GROUP_NAMES[k] && groups[k] && groups[k].type === 'object' && v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length ? flatSchema(groups[k]) : null;
    const gopts = { title: null, prose: null, what: `la section ${GROUP_NAMES[k]}`, label: groupLabel };
    const lines = g ? writeChecked(flatData(v, groups[k]), g, gopts, ls => readBody(splitBlocks(ls.join('\n')), g, gopts)) : null;
    if (lines && !lines.some(l => /^```/.test(l))) sections.push([`## ${capital(GROUP_NAMES[k])}`, ...lines]); else rest[k] = v;
  }
  let collections = d.collections;
  if (collections && typeof collections === 'object' && !Array.isArray(collections) && Object.keys(collections).length) {
    const cs = [];
    for (const [name, spec] of Object.entries(collections)) {
      if (!/^[a-z][a-z0-9_]*$/.test(name) || !spec || typeof spec !== 'object' || Array.isArray(spec)) { cs.length = 0; break; }
      const { label, ...others } = spec, inTitle = oneLine(label);
      const lines = writeChecked(inTitle ? others : spec, COLLECTION, COLLECTION_OPTS, ls => readBody(splitBlocks(ls.join('\n')), COLLECTION, COLLECTION_OPTS));
      if (!lines || lines.some(l => /^```/.test(l))) { cs.length = 0; break; }
      cs.push([`## Collection ${name}${inTitle ? ' : ' + label : ''}`, ...lines]);
    }
    if (cs.length === Object.keys(collections).length) { sections.push(...cs); collections = undefined; }
  }
  take('packages', d.packages);
  if (d.language !== undefined && d.language !== 1) props.language = d.language;
  for (const [k, v] of Object.entries(d)) if (!['site', 'packages', 'language', 'collections'].includes(k)) props[k] = v;
  if (collections !== undefined && d.collections !== undefined) props.collections = collections;
  if (Object.keys(rest).length) props.site = rest;
  const schema = siteSchema(tokens);
  const label = k => ({ locale: 'Langue', preset: 'Thème', nav: 'Menu', footer_text: 'Pied de page', footer_links: 'Liens du pied de page', email: 'E-mail', phone: 'Téléphone', address: 'Adresse', packages: 'Paquets', language: 'Langage', redirects: 'Redirections', fonts: 'Polices', background: 'Fond de page', background_bottom: 'Fond de bas de page', background_fixed: 'Fond fixe', background_phone: 'Fond de page sur téléphone', background_bottom_phone: 'Fond de bas de page sur téléphone' }[k] || (tokens.includes(k) ? k : null));
  const opts = { title: null, prose: 'tagline', what: 'ce site', label };
  const body = writeChecked(props, schema, opts, lines => readBody(splitBlocks(lines.join('\n')), schema, { ...opts, labels: SITE_LABELS }));
  if (!body) return { error: 'document du site qui ne se relit pas' };
  const tagEnd = props.tagline !== undefined && body[0] === String(props.tagline).split('\n')[0] ? String(props.tagline).replace(/\s+$/, '').split('\n').length : 0;
  const text = [`# ${site.name}`, '', ...body.slice(0, tagEnd), ...(tagEnd ? [''] : []), ...body.slice(tagEnd), ...sections.flatMap(s => ['', ...s])].join('\n').replace(/\n{3,}/g, '\n\n') + '\n';
  const back = readSiteDocument(text, { tokens, groups });
  if (back.errors.length) return { error: `le document écrit ne se relit pas : ligne ${back.errors[0].line}, ${back.errors[0].message}` };
  if (!same(back.data, { language: 1, ...d })) return { error: 'le document écrit ne rend pas le site d\'origine' };
  return { text };
}

// ---------------------------------------------------------------------------------------------------------------------------
// Les données : produits de la boutique et éléments d'une collection. Un document par fichier de données, une section par
// élément : « ## <id> : <titre> », puis ses champs lus comme les données d'un composant (texte libre, « Nom : valeur »).

/** Champs d'un produit (data/products) : le nom dans l'intitulé, la description en texte libre. */
export const PRODUCTS = { key: 'products', title: 'name', prose: 'description', what: 'un produit', schema: { properties: { name: { type: 'string' }, price: { type: 'number' }, unit: { type: 'string' }, category: { type: 'string' }, description: { type: 'string' }, image: { type: 'string', format: 'asset' }, stock: { type: 'integer' }, badge: { type: 'string' }, featured: { type: 'boolean' } } } };
const FIELD_SCHEMAS = { string: { type: 'string' }, text: { type: 'string' }, date: { type: 'string' }, number: { type: 'number' }, boolean: { type: 'boolean' }, asset: { type: 'string', format: 'asset' }, list: { type: 'array', items: { type: 'string' } }, link: { $ref: '#/$defs/link' } };
/** Champs d'une collection, d'après sa déclaration (site › collections) : le champ de titre dans l'intitulé, le premier champ « text » en texte libre. */
export function collectionData(name, spec) {
  const fields = spec && typeof spec === 'object' && spec.fields && typeof spec.fields === 'object' ? spec.fields : {};
  const type = k => (typeof fields[k] === 'string' ? fields[k] : fields[k]?.type || 'string');
  const keys = Object.keys(fields);
  const title = spec?.title_field && keys.includes(spec.title_field) ? spec.title_field : keys.includes('title') ? 'title' : keys.includes('name') ? 'name' : keys.find(k => type(k) === 'string') || null;
  const prose = keys.find(k => k !== title && type(k) === 'text') || null;
  return { key: name, title, prose, what: `un élément de ${name}`, schema: { properties: Object.fromEntries(keys.map(k => [k, { ...(FIELD_SCHEMAS[type(k)] || FIELD_SCHEMAS.string) }])) } };
}

/**
 * Lit un document de données. kind : PRODUCTS ou collectionData(nom, déclaration).
 * Renvoie { data: { <clé>: [éléments] }, yaml, errors, where }.
 */
export function readDataDocument(text, kind) {
  const blocks = splitBlocks(text), errors = [], where = {}, items = [];
  const fail = (line, message, hint) => errors.push({ line, message, ...(hint ? { hint } : {}) });
  const starts = blocks.map((b, i) => (b.kind === 'h2' ? i : -1)).filter(i => i >= 0);
  for (const b of blocks.slice(0, starts[0] ?? blocks.length)) if (b.kind !== 'blank' && b.kind !== 'h1') fail(b.line, 'ligne sans rôle : un document de données a un titre, puis une section « ## identifiant : titre » par élément');
  if (blocks.filter(b => b.kind === 'h1').length > 1) fail(blocks.filter(b => b.kind === 'h1')[1].line, 'un seul « # » par document : c\'est son titre');
  const seen = new Set();
  starts.forEach((s, n) => {
    const h = blocks[s], body = blocks.slice(s + 1, starts[n + 1] ?? blocks.length), base = `${kind.key}[${n}]`;
    where[base] = h.line;
    const m = /^([a-z0-9][a-z0-9-]*)\s*(?::\s*(.*))?$/.exec(h.text);
    if (!m) { fail(h.line, `« ${h.text} » : un élément s'ouvre par son identifiant (minuscules, chiffres, tirets), puis « : » et son titre`, 'Exemple : « ## savon-lavande : Savon à la lavande ».'); items.push({}); return; }
    if (seen.has(m[1])) fail(h.line, `identifiant dit deux fois : ${m[1]}`); seen.add(m[1]);
    const r = readBody(body, kind.schema, { title: null, prose: kind.prose, what: kind.what });
    errors.push(...r.errors);
    const title = (m[2] || '').trim();
    if (title && !kind.title) fail(h.line, 'ces éléments n\'ont pas de champ de titre : rien après « : » dans l\'intitulé');
    if (title && kind.title && kind.title in r.props) fail(r.where[kind.title], `le titre est déjà dans l'intitulé (ligne ${h.line})`);
    const all = { ...(title && kind.title ? { [kind.title]: title } : {}), ...r.props };
    const item = { id: m[1] }; for (const k of Object.keys(kind.schema.properties)) if (k in all) item[k] = all[k]; for (const k of Object.keys(all)) if (!(k in item)) item[k] = all[k];
    for (const [k, l] of Object.entries(r.where)) where[`${base}.${k}`] = l;
    items.push(item);
  });
  const data = { [kind.key]: items };
  return { data, yaml: HEADER('ce document') + YAML.stringify(data, { lineWidth: 0 }), errors: errors.sort((a, b) => (a.line || 0) - (b.line || 0)), where };
}

/** Écrit un document de données. Renvoie { text } ou { error }. */
export function writeDataDocument(items, kind, heading) {
  if (!Array.isArray(items)) return { error: 'une liste d\'éléments est attendue' };
  const out = [`# ${heading}`];
  for (const it of items) {
    if (!it || typeof it !== 'object' || Array.isArray(it) || !/^[a-z0-9][a-z0-9-]*$/.test(String(it.id ?? ''))) return { error: `élément sans identifiant lisible : ${JSON.stringify(it).slice(0, 60)}` };
    const { id, ...rest } = it, inTitle = kind.title && oneLine(rest[kind.title]);
    const opts = { title: null, prose: kind.prose, what: kind.what, skip: inTitle ? [kind.title] : [] };
    const body = writeChecked(rest, kind.schema, opts, lines => readBody(splitBlocks(lines.join('\n')), kind.schema, { title: null, prose: kind.prose, what: kind.what }));
    if (!body) return { error: `élément ${id} qui ne se relit pas` };
    out.push('', `## ${id}${inTitle ? ' : ' + rest[kind.title] : ''}`, ...body);
  }
  const text = out.join('\n') + '\n';
  const back = readDataDocument(text, kind);
  if (back.errors.length) return { error: `le document écrit ne se relit pas : ligne ${back.errors[0].line}, ${back.errors[0].message}` };
  if (!same(back.data[kind.key], items)) return { error: 'le document écrit ne rend pas les données d\'origine' };
  return { text };
}

// ---------------------------------------------------------------------------------------------------------------------------
// Les segments : segments.md. « Segments : » puis une puce « nom | condition » par segment ; « Objectifs : », « Expériences : ».
//   visites = 1 · visites >= 2 · sur mobile · sur ordinateur
//   form_start depuis 7d · section_view où section = services, au moins 2 fois
//   pas form_submit depuis 7d · tout (ou : un parmi), puis une puce en retrait par condition

const CMP = { '=': null, '>=': 'gte', '<=': 'lte', '>': 'gt', '<': 'lt' }, CMP_TEXT = { gte: '>=', lte: '<=', gt: '>', lt: '<', eq: '=' };
const TIMES = { 'au moins': 'gte', 'au plus': 'lte', 'plus de': 'gt', 'moins de': 'lt' }, TIMES_TEXT = { gte: 'au moins', lte: 'au plus', gt: 'plus de', lt: 'moins de' };
/** Lit une condition de segment. events : noms d'événements connus. */
function parseCondition(text, children, fail, line, events) {
  const s = String(text).trim(), n = norm(s);
  const kids = () => children.map(c => parseCondition(c.text, c.children, fail, c.line, events)).filter(x => x !== undefined);
  let m;
  if (n === 'tout' || n === 'un parmi') { if (!children.length) { fail(line, `« ${s} » attend ses conditions en dessous, une puce en retrait chacune`); return undefined; } return { [n === 'tout' ? 'all' : 'any']: kids() }; }
  if ((m = /^pas\s+(.+)$/i.exec(s))) { const inner = parseCondition(m[1], children, fail, line, events); return inner === undefined ? undefined : { not: inner }; }
  if (children.length) { fail(children[0].line, 'des puces en retrait : seuls « tout » et « un parmi » en ont'); return undefined; }
  if ((m = /^visites?\s*(>=|<=|=|>|<)\s*(\d+)$/i.exec(s))) return { visits: CMP[m[1]] ? { [CMP[m[1]]]: Number(m[2]) } : Number(m[2]) };
  if ((m = /^sur\s+(mobile|ordinateur)$/i.exec(s))) return { device: m[1].toLowerCase() === 'mobile' ? 'mobile' : 'desktop' };
  const ev = /^([a-z_]+)\b\s*(.*)$/.exec(s);
  if (!ev || !events.includes(ev[1])) { fail(line, `condition non comprise : « ${s} »`, `Conditions : « visites >= 2 », « sur mobile », « sur ordinateur », un événement (${events.join(', ')}) suivi de « où clé = valeur », « au moins 2 fois », « depuis 7d », « pas … », « tout » ou « un parmi » avec des puces en retrait.`); return undefined; }
  const out = { event: ev[1] }; let rest = ev[2];
  if ((m = /\bdepuis\s+(\d+[hdm])\b/i.exec(rest))) { out.within = m[1]; rest = rest.replace(m[0], ''); }
  if ((m = /(?:\b(au moins|au plus|plus de|moins de)\s+)?(\d+)\s+fois\b/i.exec(rest))) { out.count = m[1] ? { [TIMES[m[1].toLowerCase()]]: Number(m[2]) } : Number(m[2]); rest = rest.replace(m[0], ''); }
  if ((m = /(?:^|\s)où\s+([a-z_]+)\s*=\s*([^,]+?)\s*(?:,|$)/i.exec(rest))) { out.where = { [m[1]]: m[2].trim() }; rest = rest.replace(m[0], ''); }
  if (rest.replace(/[,\s]+/g, '') !== '') { fail(line, `condition non comprise après « ${ev[1]} » : « ${rest.trim()} »`, 'Après un événement : « où clé = valeur », « au moins 2 fois », « depuis 7d ».'); return undefined; }
  const ordered = { event: out.event }; for (const k of ['where', 'within', 'count']) if (k in out) ordered[k] = out[k];
  return ordered;
}
/** Écrit une condition : [ligne, ...puces en retrait], ou null si elle ne s'écrit pas ainsi. */
function writeCondition(c) {
  if (!c || typeof c !== 'object' || Array.isArray(c)) return null;
  const keys = Object.keys(c), cmp = v => (typeof v === 'number' ? ['eq', v] : v && typeof v === 'object' && Object.keys(v).length === 1 && Object.keys(v)[0] in CMP_TEXT && typeof Object.values(v)[0] === 'number' ? [Object.keys(v)[0], Object.values(v)[0]] : null);
  if (keys.length === 1 && (keys[0] === 'all' || keys[0] === 'any')) { if (!Array.isArray(c[keys[0]]) || !c[keys[0]].length) return null; const kids = c[keys[0]].map(writeCondition); if (kids.some(k => !k)) return null; return [keys[0] === 'all' ? 'tout' : 'un parmi', ...kids.flatMap(k => ['- ' + k[0], ...k.slice(1).map(l => '  ' + l)])]; }
  if (keys.length === 1 && keys[0] === 'not') { const k = writeCondition(c.not); return k ? ['pas ' + k[0], ...k.slice(1)] : null; }
  if (keys.length === 1 && keys[0] === 'visits') { const v = cmp(c.visits); return v && (typeof c.visits !== 'number' ? v[0] !== 'eq' : true) ? [`visites ${CMP_TEXT[v[0]]} ${v[1]}`] : null; }
  if (keys.length === 1 && keys[0] === 'device') return c.device === 'mobile' ? ['sur mobile'] : c.device === 'desktop' ? ['sur ordinateur'] : null;
  if (typeof c.event !== 'string' || keys.some(k => !['event', 'within', 'count', 'where'].includes(k))) return null;
  let s = c.event;
  if (c.where !== undefined) { const e = c.where && typeof c.where === 'object' ? Object.entries(c.where) : []; if (e.length !== 1 || typeof e[0][1] !== 'string' || /,/.test(e[0][1]) || !/^[a-z_]+$/.test(e[0][0])) return null; s += ` où ${e[0][0]} = ${e[0][1]}`; }
  if (c.count !== undefined) { const v = cmp(c.count); if (!v || (typeof c.count !== 'number' && v[0] === 'eq')) return null; s += `, ${v[0] === 'eq' ? '' : TIMES_TEXT[v[0]] + ' '}${v[1]} fois`; }
  if (c.within !== undefined) { if (!/^\d+[hdm]$/.test(String(c.within))) return null; s += ` depuis ${c.within}`; }
  return [s];
}
const segmentsKind = events => ({
  schema: { properties: { priority: { type: 'array', items: { type: 'string' } }, segments: { type: 'object' }, goals: { type: 'object' }, experiments: { type: 'object' } } },
  opts: { title: null, prose: null, what: 'ce document', maps: {
    segments: { parse: (text, children, fail, line) => parseCondition(text, children, fail, line, events), write: writeCondition },
    goals: { schema: { properties: { event: { type: 'string' }, where: { type: 'object' } } } },
    experiments: { schema: { properties: { goal: { type: 'string' }, arms: { type: 'array', items: { type: 'string' } }, segment: { type: 'string' }, holdout: { type: 'number' }, minimum: { type: 'integer' } } } },
  } },
});
/** Lit segments.md. events : noms d'événements connus du compilateur. Renvoie { data (comme lue de segments.yaml), yaml, errors, where }. */
export function readSegmentsDocument(text, { events }) {
  const blocks = splitBlocks(text), kind = segmentsKind(events), errors = [];
  for (const b of blocks) if (b.kind === 'h2') errors.push({ line: b.line, message: 'pas de section dans segments.md : « Segments : », « Objectifs : » et « Expériences : » annoncent leurs puces' });
  if (blocks.filter(b => b.kind === 'h1').length > 1) errors.push({ line: blocks.filter(b => b.kind === 'h1')[1].line, message: 'un seul « # » par document : c\'est son titre' });
  const h1 = blocks.findIndex(b => b.kind === 'h1');
  const r = readBody(blocks.filter((b, i) => i !== h1 && b.kind !== 'h2'), kind.schema, kind.opts);
  errors.push(...r.errors);
  const data = {}; for (const k of ['segments', 'priority', 'goals', 'experiments']) if (k in r.props) data[k] = r.props[k];
  return { data, yaml: HEADER('segments.md') + YAML.stringify(data, { lineWidth: 0 }), errors: errors.sort((a, b) => (a.line || 0) - (b.line || 0)), where: r.where };
}
/** Écrit segments.md. Renvoie { text } ou { error }. */
export function writeSegmentsDocument(data, { events }) {
  const kind = segmentsKind(events), d = data || {};
  if (Object.keys(d).some(k => !(k in kind.schema.properties))) return { error: 'clé inconnue dans les segments' };
  const body = writeChecked(d, kind.schema, kind.opts, lines => readBody(splitBlocks(lines.join('\n')), kind.schema, kind.opts));
  if (!body || body.some(l => /^```/.test(l))) return { error: 'une condition ou une expérience ne s\'écrit pas en lignes' };
  const text = ['# Segments', '', ...body].join('\n') + '\n';
  const back = readSegmentsDocument(text, { events });
  if (back.errors.length) return { error: `le document écrit ne se relit pas : ligne ${back.errors[0].line}, ${back.errors[0].message}` };
  if (!same(back.data, d)) return { error: 'le document écrit ne rend pas les segments d\'origine' };
  return { text };
}

// ---------------------------------------------------------------------------------------------------------------------------
// Petits documents : le paquet (package.md), l'hôte (hosts.md), un cas de test de composant (fixtures/<cas>.md).

const PACKAGE = { properties: { description: { type: 'string' }, version: { type: 'string' }, language: { type: 'integer' } } };
const PACKAGE_OPTS = { title: null, prose: 'description', what: 'le paquet', labels: [['version', 'version'], ['langage', 'language']], label: k => ({ version: 'Version', language: 'Langage' }[k] || null) };
/** Lit package.md : « # nom », la description, « Version : 1.0.0 », « Langage : 1 ». Renvoie { data, errors }. */
export function readPackageDocument(text) {
  const blocks = splitBlocks(text), h1 = blocks.findIndex(b => b.kind === 'h1'), errors = [];
  if (h1 < 0) errors.push({ line: 1, message: 'le document d\'un paquet commence par son nom : « # vitrine »' });
  for (const b of blocks) if (/^h[2-6]$/.test(b.kind) || (b.kind === 'h1' && b !== blocks[h1])) errors.push({ line: b.line, message: 'un paquet n\'a qu\'un titre : son nom' });
  const r = readBody(blocks.filter((b, i) => i !== h1 && !/^h\d$/.test(b.kind)), PACKAGE, PACKAGE_OPTS);
  const data = { ...(h1 >= 0 ? { name: blocks[h1].text } : {}) }; for (const k of ['description', 'version', 'language']) if (k in r.props) data[k] = r.props[k];
  return { data, errors: [...errors, ...r.errors].sort((a, b) => (a.line || 0) - (b.line || 0)) };
}
export function writePackageDocument(meta) {
  const { name, ...rest } = meta || {};
  if (!oneLine(name) || Object.keys(rest).some(k => !(k in PACKAGE.properties))) return { error: 'paquet illisible (name, description, version, language)' };
  const body = writeChecked(rest, PACKAGE, PACKAGE_OPTS, lines => readBody(splitBlocks(lines.join('\n')), PACKAGE, PACKAGE_OPTS));
  if (!body || body.some(l => /^```/.test(l))) return { error: 'une donnée du paquet ne s\'écrit pas sur une ligne' };
  const hasProse = typeof rest.description === 'string' && body[0] === rest.description;
  const text = [`# ${name}`, '', ...(hasProse ? [body[0], '', ...body.slice(1)] : body)].join('\n').replace(/\n{3,}/g, '\n\n') + '\n';
  const back = readPackageDocument(text);
  return back.errors.length || !same(back.data, meta) ? { error: 'le document écrit ne rend pas le paquet d\'origine' } : { text };
}

const HOSTS = { properties: { sites: { type: 'array', items: { type: 'object', properties: { domain: { type: 'string' }, aliases: { type: 'array', items: { type: 'string' } }, project: { type: 'string' }, name: { type: 'string' } } } } } };
const HOSTS_OPTS = { title: null, prose: null, what: 'l\'hébergement' };
/** Lit hosts.md : « # Hébergement », puis une puce « - domaine | alias, alias | ../dossier-du-site » par site. Renvoie { data, errors }. */
export function readHostsDocument(text) {
  const blocks = splitBlocks(text), r = readBody(blocks.filter(b => b.kind !== 'h1'), HOSTS, HOSTS_OPTS);
  return { data: { sites: r.props.sites || [] }, errors: r.errors };
}
export function writeHostsDocument(cfg) {
  if (!cfg || !Array.isArray(cfg.sites) || Object.keys(cfg).some(k => k !== 'sites')) return { error: 'hôte illisible (sites: [ { domain, aliases, project } ])' };
  const body = writeChecked(cfg, HOSTS, HOSTS_OPTS, lines => readBody(splitBlocks(lines.join('\n')), HOSTS, HOSTS_OPTS));
  if (!body || body.some(l => /^```/.test(l))) return { error: 'un site ne s\'écrit pas sur une ligne' };
  const text = ['# Hébergement', '', ...body].join('\n') + '\n';
  return same(readHostsDocument(text).data, cfg) ? { text } : { error: 'le document écrit ne rend pas l\'hôte d\'origine' };
}

const VISIT = /^à la visite\s*:\s*$/i;
/** Le schéma de ce qu'une lecture rend, tel que readBody le lit : une source qui rend une liste se lit comme la liste « items ». */
function readingShape(source) {
  const s = sourceSchema(source), list = s.type === 'array';
  return { list, schema: list ? { type: 'object', properties: { items: s } } : s };
}
const VISIT_OPTS = key => ({ title: null, prose: null, what: `la lecture ${key}`, label: k => k });

/**
 * Ce que les lectures d'un composant rendraient à la visite, écrit sous « À la visite : ». Une section « ### nom » par lecture ;
 * dessous, ce que la source rend, lu d'après les champs qu'elle annonce : une puce par élément quand elle rend une liste
 * (« - valeur | valeur | nom : valeur »), des lignes « nom : valeur » et les puces de sa liste quand elle rend un groupe.
 * Un bloc yaml reste lu à la place. sources : [{ key, source }], les lectures du composant. Renvoie { visit } ou { error }.
 */
function readVisit(tail, sources, offset) {
  const blocks = splitBlocks(tail), solid = blocks.filter(b => b.kind !== 'blank');
  if (solid.length === 1 && solid[0].kind === 'fence') {
    if (!solid[0].closed || !/^ya?ml$/.test(solid[0].lang)) return { error: `ligne ${offset + solid[0].line} : sous « À la visite : », un bloc se dit yaml et se ferme` };
    try { return { visit: YAML.parse(solid[0].text) }; } catch (e) { return { error: `bloc yaml illisible : ${String(e.message).split('\n')[0]}` }; }
  }
  const names = sources.map(x => x.key), visit = {};
  const how = `une lecture s'ouvre par « ### nom »${names.length ? ` (lectures du composant : ${names.join(', ')})` : ''}, puis ce qu'elle rend`;
  if (!solid.length) return { error: `ligne ${offset} : « À la visite : » n'est suivi de rien ; ${how}` };
  let cur = null, body = [];
  const flush = () => {
    if (!cur) return null;
    const src = sources.find(x => x.key === cur.key);
    if (!src) return `ligne ${offset + cur.line} : ${cur.key} n'est pas une lecture du composant (${names.join(', ') || 'il ne lit rien'})`;
    if (cur.key in visit) return `ligne ${offset + cur.line} : la lecture ${cur.key} est déjà dite`;
    const shape = readingShape(src.source), r = readBody(body, shape.schema, VISIT_OPTS(cur.key));
    if (r.errors.length) return `ligne ${offset + (r.errors[0].line || cur.line)} : ${r.errors[0].message}`;
    visit[cur.key] = shape.list ? r.props.items ?? [] : r.props;
    return null;
  };
  for (const b of blocks) {
    if (b.kind === 'h3') { const e = flush(); if (e) return { error: e }; cur = { key: b.text.trim(), line: b.line }; body = []; continue; }
    if (!cur) { if (b.kind === 'blank') continue; return { error: `ligne ${offset + b.line} : sous « À la visite : », ${how}` }; }
    body.push(b);
  }
  const e = flush();
  return e ? { error: e } : { visit };
}

/** Écrit ce que les lectures rendraient, une section « ### nom » par lecture ; null si une valeur ne s'écrit pas ainsi. */
function writeVisit(visit, sources) {
  if (!visit || typeof visit !== 'object' || Array.isArray(visit) || !Object.keys(visit).length) return null;
  const lines = [];
  for (const [key, value] of Object.entries(visit)) {
    const src = sources.find(x => x.key === key);
    if (!src || !/^[a-z][a-z0-9_]*$/i.test(key)) return null;
    const shape = readingShape(src.source);
    if (lines.length) lines.push('');
    lines.push(`### ${key}`);
    if (shape.list) { if (!Array.isArray(value)) return null; if (!value.length) continue; }
    else if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const props = shape.list ? { items: value } : value;
    const body = writeChecked(props, shape.schema, VISIT_OPTS(key), ls => readBody(splitBlocks(ls.join('\n')), shape.schema, VISIT_OPTS(key)));
    if (!body || body.some(l => /^\s*```/.test(l) || /^#{1,6}\s/.test(l))) return null;
    lines.push(...body);
  }
  return lines;
}

/**
 * Lit un cas de test de composant : le composant écrit comme une section de page (« ## composant : titre », puis ses données) ;
 * ce que ses lectures rendraient à la visite suit « À la visite : », une section « ### nom » par lecture (ou un bloc yaml).
 * Les lignes « > … » sont des notes. sources : les lectures du composant, [{ key, source }].
 * Renvoie { props (avec « à la visite » s'il est dit), error }.
 */
export function readFixtureDocument(text, { name, props, sources = [] }) {
  const all = String(text).replace(/\r\n/g, '\n').split('\n'), note = l => /^\s*>/.test(l);
  const visitAt = all.findIndex(l => !note(l) && VISIT.test(l.trim()));
  const head = (visitAt < 0 ? all : all.slice(0, visitAt)).filter(l => !note(l)).join('\n');
  const r = readPageDocument(`Adresse : /x\n\n${head}\n`, { schemas: new Map([[name, props]]) });
  if (r.errors.length) return { props: null, error: `ligne ${Math.max(1, r.errors[0].line - 2)} : ${r.errors[0].message}` };
  const sections = r.data.sections || [];
  if (sections.length !== 1 || Object.keys(sections[0])[0] !== name) return { props: null, error: `un cas de test est une section du composant : « ## ${name} »` };
  const out = { ...(sections[0][name] || {}) };
  if (visitAt >= 0) {
    // Les notes sont effacées sans décaler les lignes : une erreur cite la ligne du fichier.
    const v = readVisit(all.slice(visitAt + 1).map(l => (note(l) ? '' : l)).join('\n'), sources || [], visitAt + 1);
    if (v.error) return { props: null, error: v.error };
    out['à la visite'] = v.visit;
  }
  return { props: out, error: null };
}
/**
 * Écrit un cas de test en document. notes : lignes de commentaire reprises en « > … ». sources : les lectures du composant ;
 * ce qu'elles rendraient s'écrit en sections « ### nom », ou dans un bloc yaml si une valeur ne s'y écrit pas. Renvoie { text } ou { error }.
 */
export function writeFixtureDocument(data, { name, props, notes = [], sources = [] }) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return { error: 'cas de test illisible' };
  const { 'à la visite': visit, ...rest } = data;
  const w = writeSectionDocument({ [name]: rest }, { schemas: new Map([[name, props]]) });
  if (w.error) return { error: w.error };
  const head = [...notes.map(n => `> ${n}`), ...w.lines];
  const tails = visit === undefined ? [[]] : [writeVisit(visit, sources || []), ['```yaml', ...YAML.stringify(visit, { lineWidth: 0 }).trimEnd().split('\n'), '```']].filter(Boolean).map(t => ['', 'À la visite :', ...(t[0] === '```yaml' ? [] : ['']), ...t]);
  let error = null;
  for (const tail of tails) {
    const text = [...head, ...tail].join('\n') + '\n';
    const back = readFixtureDocument(text, { name, props, sources });
    if (!back.error && same(back.props, data)) return { text };
    error = back.error || 'le cas écrit ne rend pas le cas d\'origine';
  }
  return { error };
}

/** Ligne du document où se trouve un chemin de validation (« sections[2].hero.cta.to ») : le préfixe connu le plus long. */
export function lineOfPath(where, path) {
  let p = String(path || '');
  while (p) { if (where[p] !== undefined && typeof where[p] === 'number') return where[p]; const cut = Math.max(p.lastIndexOf('.'), p.lastIndexOf('[')); if (cut <= 0) break; p = p.slice(0, cut); }
  return null;
}
