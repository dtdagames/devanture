// Composants composés écrits en document : components.md à la place de components.yaml.
//
//   # Composants composés
//
//   ## offre
//   Une offre tarifaire : son prix, puis ses points forts, et un bouton.
//
//   Mots-clés : offre, tarif
//
//   ### Paramètres
//   - titre : texte — nom de l'offre
//   - detail : texte, par défaut vide — phrase sous le prix
//   - points : liste, par défaut vide — points forts
//   - cta : lien, par défaut Nous contacter → /contact — bouton sous les points
//
//   ### Sections
//   ```
//   ## Tarifs : {{ p.titre }}
//   ...
//   ## Points forts
//   - pour chaque pt de p.points : check | {{ pt }}
//   ```
//
// Les paramètres se lisent ligne à ligne. Les sections s'écrivent comme celles d'une page, et se lisent comme elles, d'après les
// données que chaque composant déclare : c'est une seconde passe, une fois ces données connues. « pour chaque x de liste : »
// en tête d'une puce produit un élément par valeur de la liste.
import YAML from 'yaml';
import { readPageDocument, writeSectionDocument, withLoops, parseLink, canon } from './site-document.js';

const HEADER = '# Lecture de components.md par sitec : le YAML que ce document vaut.\n# Ne modifiez pas ce fichier : corrigez le document, relisez « sitec lire <dossier> », puis acceptez (« --accepter »).\n';
const norm = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[’`]/g, "'").replace(/\s+/g, ' ').trim();
const oneLine = v => typeof v === 'string' && v.trim() === v && v !== '' && !/\n/.test(v);
const DASH = /\s(?:—|–|--)\s/;

/** Types d'un paramètre, dits en français. */
export const PARAM_WORDS = { string: 'texte', text: 'texte long', number: 'nombre', boolean: 'oui ou non', list: 'liste', object: 'groupe', link: 'lien', asset: 'image' };
const PARAM_OF = Object.fromEntries(Object.entries(PARAM_WORDS).map(([k, v]) => [norm(v), k]));
const EMPTY = 'vide';
const emptyOf = type => (type === 'string' || type === 'text' ? '' : type === 'list' ? [] : type === 'object' ? {} : undefined);

/** Valeur par défaut d'un paramètre, d'après son type. Renvoie { value } ou { error }. */
function readDefault(type, s) {
  if (norm(s) === EMPTY) { const e = emptyOf(type); return e === undefined ? { error: `« par défaut vide » ne se dit que d'un texte, d'une liste ou d'un groupe` } : { value: e }; }
  switch (type) {
    case 'number': return /^-?\d+(?:[.,]\d+)?$/.test(s) ? { value: Number(s.replace(',', '.')) } : { error: `un nombre est attendu après « par défaut » (lu : « ${s} »)` };
    case 'boolean': { const r = norm(s); return r === 'oui' ? { value: true } : r === 'non' ? { value: false } : { error: `oui ou non est attendu après « par défaut » (lu : « ${s} »)` }; }
    case 'link': { const l = parseLink(s); return l ? { value: l } : { error: 'un lien par défaut s\'écrit « Libellé → /cible »' }; }
    case 'list': return { value: s.split(/\s*,\s*/).filter(Boolean) };
    case 'object': return { error: 'un groupe n\'a pour valeur par défaut que « vide »' };
    default: return { value: s };
  }
}

/** Lit « nom : type, précisions — description ». Renvoie { name, param } ou { error }. */
function readParam(text) {
  const m = /^([a-z][a-z0-9_]*)\s*:\s*(.*)$/.exec(text);
  if (!m) return { error: 'un paramètre s\'écrit « nom : type, précisions — description » (nom en minuscules, chiffres et _)' };
  let spec = m[2].trim(), description = '';
  const d = spec.search(DASH);
  if (d >= 0) { description = spec.slice(d).replace(/^\s(?:—|–|--)\s/, '').trim(); spec = spec.slice(0, d).trim(); }
  let def = null;
  const dm = /^(.*?),\s*par d[ée]faut\s+(.+)$/i.exec(spec);
  if (dm) { spec = dm[1].trim(); def = dm[2].trim(); }
  const parts = spec.split(/\s*,\s*/).filter(Boolean);
  const type = PARAM_OF[norm(parts[0] || '')];
  if (!type) return { error: `type de paramètre inconnu : « ${parts[0] || ''} » (types : ${Object.values(PARAM_WORDS).join(', ')})` };
  let optional = false;
  for (const p of parts.slice(1)) { if (norm(p) === 'facultatif') optional = true; else return { error: `précision inconnue : « ${p} » (précisions : facultatif, par défaut …, celle-ci en dernier)` }; }
  const param = { type };
  if (def !== null) { const v = readDefault(type, def); if (v.error) return { error: v.error }; param.default = v.value; }
  else if (!optional) param.required = true;
  if (description) param.description = description;
  return { name: m[1], param };
}

/** Un paramètre tel que le compilateur le retient : { type, required, default, description }. */
function normalParam(raw) {
  const p = typeof raw === 'string' ? { type: raw } : raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : null;
  if (!p) return null;
  return { type: p.type ?? 'string', required: p.required === true, default: p.default ?? null, description: p.description || '' };
}
/** Ce que vaut un fichier de composés, pour comparer deux écritures. */
function normal(raw) {
  const out = {};
  for (const [name, def] of Object.entries(raw?.components || {})) {
    const d = def && typeof def === 'object' ? def : {};
    out[name] = { description: d.description || '', intents: Array.isArray(d.intents) ? d.intents : [], params: Object.fromEntries(Object.entries(d.params || {}).map(([k, v]) => [k, normalParam(v)])), sections: d.sections ?? null };
  }
  return out;
}
const same = (a, b) => JSON.stringify(canon(a, true)) === JSON.stringify(canon(b, true));

/** Écrit la ligne d'un paramètre, ou null s'il ne s'écrit pas ainsi. */
function writeParam(name, raw) {
  const p = normalParam(raw);
  if (!p || !PARAM_WORDS[p.type] || !/^[a-z][a-z0-9_]*$/.test(name)) return null;
  if (typeof raw === 'object' && Object.keys(raw).some(k => !['type', 'required', 'default', 'description'].includes(k))) return null;
  if (p.description && (!oneLine(p.description) || DASH.test(p.description))) return null;
  let tail = '';
  if (p.required) { if (p.default !== null) return null; }
  else if (p.default === null) tail = ', facultatif';
  else {
    const v = p.default, e = emptyOf(p.type);
    let t = null;
    if (e !== undefined && JSON.stringify(v) === JSON.stringify(e)) t = EMPTY;
    else if (p.type === 'number') t = typeof v === 'number' ? String(v) : null;
    else if (p.type === 'boolean') t = typeof v === 'boolean' ? (v ? 'oui' : 'non') : null;
    else if (p.type === 'link') t = v && typeof v === 'object' && Object.keys(v).length === 2 && oneLine(v.label) && oneLine(v.to) ? `${v.label} → ${v.to}` : null;
    else if (p.type === 'list') t = Array.isArray(v) && v.every(x => oneLine(x) && !/,/.test(x)) ? v.join(', ') : null;
    else if (p.type !== 'object') t = oneLine(v) ? v : null;
    if (t === null || DASH.test(t) || (t !== EMPTY && norm(t) === EMPTY)) return null;
    tail = `, par défaut ${t}`;
  }
  const line = `${name} : ${PARAM_WORDS[p.type]}${tail}${p.description ? ' — ' + p.description : ''}`;
  const back = readParam(line);
  return !back.error && back.name === name && same(normalParam(back.param), p) ? line : null;
}

/**
 * Première passe : la structure de components.md, les paramètres, et le bloc de sections de chaque composé (non lu encore).
 * Renvoie { raw: { components }, blocks: Map(nom → { text, line }), where, errors } ; raw sert tout de suite à connaître
 * les données de chaque composé.
 */
export function readCompositesDocument(text) {
  const lines = String(text).replace(/\r\n/g, '\n').replace(/^﻿/, '').split('\n');
  const errors = [], where = {}, components = {}, blocks = new Map();
  const fail = (line, message, hint) => errors.push({ line, message, ...(hint ? { hint } : {}) });
  let cur = null, part = null, titled = false;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].trim(), n = i + 1;
    let m;
    if ((m = /^(`{3,})/.exec(l))) {
      const close = new RegExp('^`{' + m[1].length + '}\\s*$'), body = []; let j = i + 1;
      for (; j < lines.length && !close.test(lines[j].trim()); j++) body.push(lines[j]);
      if (j >= lines.length) fail(n, 'bloc non fermé : il se ferme par une ligne faite des mêmes accents graves');
      if (cur && part === 'sections') { if (blocks.has(cur)) fail(n, `« ${cur} » a déjà son bloc de sections, ligne ${blocks.get(cur).line}`); else { blocks.set(cur, { text: body.join('\n'), line: n }); where[`components.${cur}.sections`] = n; } }
      else fail(n, 'un bloc n\'a sa place que sous « ### Sections »');
      i = j; continue;
    }
    if (!l || l.startsWith('>')) continue;
    if (/^#\s+/.test(l)) { if (titled || cur) fail(n, 'un seul « # » par document : c\'est son titre'); titled = true; continue; }
    if ((m = /^##\s+(.*)$/.exec(l))) {
      const name = m[1].trim();
      if (!/^[a-z][a-z0-9-]*(\.[a-z][a-z0-9-]*)*$/.test(name)) { fail(n, `nom de composant mal formé : « ${name} »`, 'Minuscules, chiffres et tirets, points pour les familles (offre.pro).'); cur = null; part = null; continue; }
      if (name in components) { fail(n, `« ${name} » est déjà décrit ligne ${where[`components.${name}`]}`); cur = null; part = null; continue; }
      cur = name; part = 'head'; components[cur] = {}; where[`components.${cur}`] = n; continue;
    }
    if ((m = /^###\s+(.*)$/.exec(l))) {
      if (!cur) { fail(n, 'intertitre hors d\'un composant : un composant s\'ouvre par « ## nom »'); continue; }
      const t = norm(m[1]);
      part = t === 'parametres' ? 'params' : t === 'sections' ? 'sections' : null;
      if (!part) fail(n, `intertitre inconnu : « ${m[1].trim()} »`, 'Un composé a deux parties : « ### Paramètres » et « ### Sections ».');
      else if (part === 'params') { components[cur].params ??= {}; where[`components.${cur}.params`] ??= n; }
      continue;
    }
    if (/^#{4,}\s/.test(l)) { fail(n, 'intertitre non lu'); continue; }
    if (!cur) { fail(n, 'ligne hors d\'un composant : un composant s\'ouvre par « ## nom »'); continue; }
    if (part === 'head') {
      const k = /^mots[- ]cl[ée]s\s*:\s*(.*)$/i.exec(l);
      if (k) { if (components[cur].intents) fail(n, '« Mots-clés » est déjà dit'); else { components[cur].intents = k[1].split(/\s*,\s*/).filter(Boolean); where[`components.${cur}.intents`] = n; } continue; }
      if (/^[-*]\s/.test(l)) { fail(n, 'une puce avant « ### Paramètres » : la description s\'écrit en phrases'); continue; }
      if (components[cur].intents) { fail(n, 'la description se place avant « Mots-clés »'); continue; }
      components[cur].description = components[cur].description ? `${components[cur].description} ${l}` : l; where[`components.${cur}.description`] ??= n;
      continue;
    }
    if (part === 'params') {
      const b = /^[-*]\s+(.*)$/.exec(l);
      if (!b) { fail(n, 'sous « ### Paramètres », une puce par paramètre', '« - nom : type, précisions — description » (types : ' + Object.values(PARAM_WORDS).join(', ') + ').'); continue; }
      const r = readParam(b[1].trim());
      if (r.error) { fail(n, r.error); continue; }
      if (r.name in components[cur].params) { fail(n, `« ${r.name} » est déjà dit ligne ${where[`components.${cur}.params.${r.name}`]}`); continue; }
      components[cur].params[r.name] = r.param; where[`components.${cur}.params.${r.name}`] = n;
      continue;
    }
    if (part === 'sections') { fail(n, 'sous « ### Sections », les sections s\'écrivent dans un bloc', 'Une ligne de trois accents graves, les sections écrites comme dans une page (« ## composant : titre »), puis une ligne de trois accents graves.'); continue; }
  }
  for (const name of Object.keys(components)) if (!blocks.has(name)) fail(where[`components.${name}`], `« ${name} » n'a pas de sections`, '« ### Sections », puis un bloc entre deux lignes d\'accents graves : les sections que le composé produit.');
  return { raw: { components }, blocks, where, errors };
}

/**
 * Seconde passe : les sections de chaque composé, lues comme celles d'une page d'après les données des composants (schemas).
 * Complète doc.raw, doc.where et doc.errors ; renvoie le YAML que vaut le document. prefix : nom du paquet, s'il y en a un.
 */
export function readCompositeSections(doc, { schemas, prefix = null }) {
  for (const [name, b] of doc.blocks) {
    const r = withLoops(() => readPageDocument(`Adresse : /x\n\n${b.text}\n`, { schemas }));
    // Le bloc commence à la ligne qui suit son ouverture ; la page lue lui ajoute deux lignes en tête.
    const at = line => (line || 3) - 2 + b.line;
    for (const e of r.errors) doc.errors.push({ ...e, line: at(e.line) });
    const sections = r.data?.sections || [];
    if (!sections.length && !r.errors.length) doc.errors.push({ line: b.line, message: `le bloc de sections de « ${name} » est vide`, hint: 'Une section s\'ouvre par « ## composant : titre ».' });
    doc.raw.components[name].sections = sections;
    for (const [k, v] of Object.entries(r.where || {})) if (k.startsWith('sections')) { doc.where[`components.${name}.${k}`] = at(v); if (prefix) doc.where[`components.${prefix}.${name}.${k}`] = at(v); }
  }
  doc.errors.sort((a, b) => (a.line || 0) - (b.line || 0));
  doc.yaml = HEADER + YAML.stringify(doc.raw, { lineWidth: 0 });
  return doc.yaml;
}

/** Lit components.md en entier, quand les données des composants sont déjà connues. Renvoie { raw, yaml, where, errors }. */
export function readComposites(text, { schemas, prefix = null }) {
  const doc = readCompositesDocument(text);
  readCompositeSections(doc, { schemas, prefix });
  return doc;
}

/**
 * Écrit components.md depuis le contenu de components.yaml. Le document écrit est relu et doit valoir le fichier d'origine.
 * Renvoie { text, yaml } ou { error }.
 */
export function writeCompositesDocument(raw, { schemas, prefix = null, notes = [] }) {
  if (!raw || typeof raw !== 'object' || !raw.components || typeof raw.components !== 'object' || Array.isArray(raw.components)) return { error: 'components.yaml attend components: { nom: { description, params, sections } }' };
  if (Object.keys(raw).some(k => k !== 'components')) return { error: `clé inconnue à la racine : ${Object.keys(raw).filter(k => k !== 'components').join(', ')}` };
  const lines = ['# Composants composés', ...notes.map(n => `> ${n}`)];
  for (const [name, def] of Object.entries(raw.components)) {
    if (!def || typeof def !== 'object' || Array.isArray(def)) return { error: `${name} : un composé se déclare { description, params, sections }` };
    const extra = Object.keys(def).filter(k => !['description', 'params', 'sections', 'intents'].includes(k));
    if (extra.length) return { error: `${name} : propriété inconnue (${extra.join(', ')})` };
    lines.push('', `## ${name}`);
    if (def.description !== undefined && def.description !== '') {
      if (!oneLine(def.description) || /^(#|>|[-*]\s|`{3}|mots[- ]cl[ée]s\s*:)/i.test(def.description)) return { error: `${name} : description qui ne s'écrit pas sur une ligne de texte` };
      lines.push(def.description);
    }
    if (def.intents !== undefined) {
      if (!Array.isArray(def.intents) || !def.intents.length || def.intents.some(x => !oneLine(x) || /,/.test(x))) return { error: `${name} : mots-clés qui ne s'écrivent pas sur une ligne` };
      lines.push('', `Mots-clés : ${def.intents.join(', ')}`);
    }
    if (def.params !== undefined) {
      if (!def.params || typeof def.params !== 'object' || Array.isArray(def.params)) return { error: `${name} : params attend { nom: type }` };
      lines.push('', '### Paramètres');
      for (const [k, v] of Object.entries(def.params)) { const l = writeParam(k, v); if (!l) return { error: `${name} : le paramètre ${k} ne s'écrit pas en une ligne (type, facultatif, par défaut …, description)` }; lines.push(`- ${l}`); }
    }
    if (!Array.isArray(def.sections) || !def.sections.length) return { error: `${name} : sections manquantes` };
    const body = [];
    for (const s of def.sections) {
      const w = withLoops(() => writeSectionDocument(s, { schemas }));
      if (w.error) return { error: `${name} : ${w.error}` };
      if (body.length) body.push('');
      body.push(...w.lines);
    }
    const fence = body.some(l => /^\s*```/.test(l)) ? '````' : '```';
    lines.push('', '### Sections', fence, ...body, fence);
  }
  const text = lines.join('\n') + '\n';
  const back = readComposites(text, { schemas, prefix });
  if (back.errors.length) return { error: `le document écrit ne se relit pas : ligne ${back.errors[0].line}, ${back.errors[0].message}` };
  if (!same(normal(back.raw), normal(raw))) return { error: 'le document écrit ne rend pas les composés d\'origine' };
  return { text, yaml: back.yaml };
}
