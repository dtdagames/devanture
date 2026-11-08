// Composants par composition : components.yaml déclare des assemblages nommés de composants existants, avec des paramètres typés.
//   components:
//     offre:
//       description: Offre tarifaire et ses points forts
//       params: { titre: { type: string, required: true }, prix: string, points: { type: list, default: [] } }
//       sections:
//         - pricelist: { title: "{{ p.titre }}", groups: [ { items: [ { name: Forfait, price: "{{ p.prix }}" } ] } ] }
//         - features: { items: { for: p.points, as: pt, item: { title: "{{ pt }}" } } }
// Une page l'utilise comme un composant natif : - offre: { titre: Dépannage, prix: 90 €, points: [Rapide, Garanti] }.
// L'expansion a lieu à la compilation ; les sections produites sont validées comme les autres.
import { err, nearest } from './errors.js';
import { interpolate, projectScope } from './lang/resolve.js';
import { parse, evaluate, ExprError } from './lang/expr.js';

export const PARAM_TYPES = ['string', 'text', 'number', 'boolean', 'list', 'object', 'link', 'asset'];
const PARAM_KEYS = ['type', 'required', 'default', 'description'];
const COMPOSITE_KEYS = ['description', 'params', 'sections', 'intents'];
const MAX_DEPTH = 6;

/** Lit et normalise components.yaml. Renvoie { nom: { name, description, params, sections, file } }. */
export function loadComposites(project, catalog, errors) {
  const out = {};
  for (const pkg of project.packages || []) if (pkg.prefix && pkg.compositesRaw) loadCompositesFrom(pkg.compositesRaw, pkg.compositesFile, catalog, errors, out, pkg.prefix);
  loadCompositesFrom(project.componentsRaw, project.componentsFile, catalog, errors, out, null);
  return out;
}

/** Lit un components.yaml (du projet, ou d'un paquet avec son préfixe) et ajoute ses composés à out. */
function loadCompositesFrom(raw, file, catalog, errors, out, prefix) {
  if (raw === null || raw === undefined) return out;
  if (!raw || typeof raw !== 'object' || !raw.components || typeof raw.components !== 'object' || Array.isArray(raw.components)) { errors.push(err('E_TYPE', { file, path: '', message: 'components.yaml attend components: { nom: { description, params, sections } }.' })); return out; }
  for (const [short, def] of Object.entries(raw.components)) {
    const name = prefix ? `${prefix}.${short}` : short;
    const base = `components.${short}`;
    if (!/^[a-z][a-z0-9-]*(\.[a-z][a-z0-9-]*)*$/.test(name)) { errors.push(err('E_FORMAT', { file, path: base, message: `Nom de composant mal formé : ${name}.`, hint: 'Minuscules, chiffres et tirets, points pour les familles (offre.pro).' })); continue; }
    if (catalog.has(name) || out[name]) { errors.push(err('E_COMPONENT_CONFLICT', { file, path: base, message: `${name} existe déjà (catalogue, paquet ou composant de projet).`, hint: 'Choisissez un autre nom.' })); continue; }
    if (!def || typeof def !== 'object' || Array.isArray(def)) { errors.push(err('E_TYPE', { file, path: base, message: 'Un composant composé se déclare { description, params, sections }.' })); continue; }
    for (const k of Object.keys(def)) if (!COMPOSITE_KEYS.includes(k)) { const s = nearest(k, COMPOSITE_KEYS); errors.push(err('E_UNKNOWN_PROP', { file, path: `${base}.${k}`, message: `Propriété inconnue : ${k}.`, expected: COMPOSITE_KEYS, hint: s ? `Vouliez-vous dire ${s} ?` : undefined })); }
    if (!Array.isArray(def.sections) || !def.sections.length) { errors.push(err('E_MISSING_PROP', { file, path: `${base}.sections`, message: 'sections est obligatoire : la liste des sections que le composant produit.' })); continue; }
    const params = {};
    for (const [pname, praw] of Object.entries(def.params || {})) {
      const pp = `${base}.params.${pname}`;
      if (!/^[a-z][a-z0-9_]*$/.test(pname)) { errors.push(err('E_FORMAT', { file, path: pp, message: `Nom de paramètre mal formé : ${pname}.` })); continue; }
      const p = typeof praw === 'string' ? { type: praw } : (praw && typeof praw === 'object' && !Array.isArray(praw) ? { ...praw } : null);
      if (!p) { errors.push(err('E_TYPE', { file, path: pp, message: 'Un paramètre se déclare par son type (string) ou { type, required, default, description }.' })); continue; }
      for (const k of Object.keys(p)) if (!PARAM_KEYS.includes(k)) errors.push(err('E_UNKNOWN_PROP', { file, path: `${pp}.${k}`, message: `Propriété inconnue : ${k}.`, expected: PARAM_KEYS }));
      const type = p.type ?? 'string';
      if (!PARAM_TYPES.includes(type)) { const s = nearest(String(type), PARAM_TYPES); errors.push(err('E_ENUM', { file, path: `${pp}.type`, message: `Type de paramètre inconnu : ${JSON.stringify(type)}.`, expected: PARAM_TYPES, hint: s ? `Vouliez-vous dire ${s} ?` : undefined })); continue; }
      params[pname] = { type, required: p.required === true, default: p.default ?? null, description: p.description || '' };
    }
    out[name] = { name, description: def.description || '', params, sections: def.sections, intents: Array.isArray(def.intents) ? def.intents : [], file, package: prefix };
  }
  return out;
}

function checkArg(v, type) {
  switch (type) {
    case 'string': case 'text': return typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean';
    case 'number': return typeof v === 'number';
    case 'boolean': return typeof v === 'boolean';
    case 'list': return Array.isArray(v);
    case 'object': return v && typeof v === 'object' && !Array.isArray(v);
    case 'link': return v && typeof v === 'object' && typeof v.label === 'string' && typeof v.to === 'string';
    case 'asset': return typeof v === 'string';
  }
  return true;
}

/** Développe { for: expr, as: nom, item: gabarit } en liste, puis interpole le reste avec la portée donnée. */
function expandValue(value, scope, report, path) {
  if (Array.isArray(value)) return value.map((v, i) => expandValue(v, scope, report, `${path}[${i}]`));
  if (value && typeof value === 'object') {
    const keys = Object.keys(value);
    if (keys.includes('for') && keys.includes('item') && keys.every(k => ['for', 'as', 'item'].includes(k))) {
      let list;
      try { list = evaluate(parse(String(value.for)), scope); } catch (e) { report(`for : « ${value.for} » : ${e.message}.`, path); return []; }
      if (!Array.isArray(list)) { report(`for : « ${value.for} » n'est pas une liste.`, path); return []; }
      const as = typeof value.as === 'string' && /^[a-z][a-z0-9_]*$/.test(value.as) ? value.as : 'it';
      return list.map((el, i) => expandValue(value.item, { ...scope, [as]: el, [as + '_index']: i + 1 }, report, `${path}.item`));
    }
    const o = {}; for (const [k, v] of Object.entries(value)) o[k] = expandValue(v, scope, report, path ? `${path}.${k}` : k); return o;
  }
  if (typeof value === 'string') return interpolate(value, scope, { report: (m, p, code) => report(m, p || path, code), path, allowRuntime: true });
  return value;
}

/**
 * Remplace, dans la liste de sections d'une page, chaque usage d'un composant composé par les sections qu'il produit.
 * Renvoie origins : pour chaque section finale, { via, usage } quand elle vient d'une expansion (pour les messages d'erreur).
 */
export function expandComposites(page, composites, project, errors, catalog) {
  const file = page.file;
  const expand = (sections, depth, scopeBase, originFn) => {
    const out = []; const origins = [];
    sections.forEach((section, i) => {
      if (!section || typeof section !== 'object' || Array.isArray(section) || Object.keys(section).length !== 1) { out.push(section); origins.push(originFn(i, null)); return; }
      const name = Object.keys(section)[0];
      const def = composites[name];
      if (!def) { out.push(section); origins.push(originFn(i, null)); return; }
      const usagePath = `sections[${i}].${name}`;
      if (depth >= MAX_DEPTH) { errors.push(err('E_COMPOSITE_LOOP', { file, path: usagePath, message: `Composition trop profonde autour de ${name} (boucle ?).` })); return; }
      const args = section[name] ?? {};
      if (typeof args !== 'object' || Array.isArray(args)) { errors.push(err('E_TYPE', { file, path: usagePath, message: `Les paramètres de ${name} doivent être un objet.` })); return; }
      const { id, keywords, variants, ...rest } = args;
      if (variants !== undefined) errors.push(err('E_FORBIDDEN', { file, path: `${usagePath}.variants`, message: `${name} est un composant composé : les variantes se posent sur ses sections, pas sur l'assemblage.` }));
      const scopeP = {};
      for (const [pname, pdef] of Object.entries(def.params)) {
        const v = rest[pname];
        if (v === undefined || v === null) { if (pdef.required) errors.push(err('E_MISSING_PROP', { file, path: `${usagePath}.${pname}`, message: `Paramètre obligatoire manquant : ${pname}.`, hint: `sitec explain ${name}` })); scopeP[pname] = pdef.default; continue; }
        if (!checkArg(v, pdef.type)) { errors.push(err('E_TYPE', { file, path: `${usagePath}.${pname}`, message: `${pname} attend ${pdef.type}, reçu ${Array.isArray(v) ? 'liste' : typeof v}.`, hint: pdef.type === 'string' && typeof v === 'object' ? 'Mettez une valeur texte.' : undefined })); scopeP[pname] = pdef.default; continue; }
        if (pdef.type === 'asset' && !project.assets.has(v)) errors.push(err('E_MISSING_ASSET', { file, path: `${usagePath}.${pname}`, message: `Fichier introuvable dans assets/ : ${v}.` }));
        scopeP[pname] = v;
      }
      for (const k of Object.keys(rest)) if (!(k in def.params)) { const s = nearest(k, Object.keys(def.params)); errors.push(err('E_UNKNOWN_PROP', { file, path: `${usagePath}.${k}`, message: `Paramètre inconnu : ${k}.`, expected: Object.keys(def.params), hint: s ? `Vouliez-vous dire ${s} ?` : `sitec explain ${name}`, fix: s ? { rename: { from: k, to: s } } : undefined })); }
      const scope = { ...scopeBase, p: scopeP };
      const report = (message, p, code = 'E_EXPR') => errors.push(err(code, { file: def.file, path: `components.${name}.${p}`, message: `${message} (usage : ${page.id}.page.yaml › ${usagePath})` }));
      const produced = expandValue(JSON.parse(JSON.stringify(def.sections)), scope, report, 'sections');
      const inner = expand(produced, depth + 1, scopeBase, (j, o) => o || { via: name, usage: usagePath });
      inner.sections.forEach((s, j) => {
        if (s && typeof s === 'object' && !Array.isArray(s) && Object.keys(s).length === 1) {
          const sn = Object.keys(s)[0]; const sp = s[sn] = (s[sn] && typeof s[sn] === 'object') ? s[sn] : {};
          if (id && j === 0 && !sp.id) sp.id = id; else if (id && !sp.id) sp.id = `${id}-${j + 1}`;
          if (keywords && j === 0) sp.keywords = [...(Array.isArray(sp.keywords) ? sp.keywords : []), ...(Array.isArray(keywords) ? keywords : [])];
        }
        out.push(s); origins.push(inner.origins[j] || { via: name, usage: usagePath });
      });
    });
    return { sections: out, origins };
  };
  const scopeBase = projectScope(project, page);
  const r = expand(page.data.sections, 0, scopeBase, () => null);
  page.data.sections = r.sections;
  return r.origins;
}

/** Fiche d'un composant composé, au format de sitec explain. */
export function describeComposite(def) {
  return { name: def.name, description: def.description, props: Object.entries(def.params).map(([k, v]) => ({ name: k, required: v.required, type: v.type, description: v.description, default: v.default })), produces: def.sections.map(s => Object.keys(s)[0]), composite: true };
}
