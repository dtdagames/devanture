// Bloc « données » d'un composant : ce que le composant accepte, écrit en français contrôlé, compilé vers le schéma JSON des props.
//
//   données:
//     titre: texte, facultatif — titre de la section
//     colonnes: nombre entier, un parmi 2, 3, 4, facultatif
//     avis (liste, au moins 1):
//       note: nombre entier, de 1 à 5, facultatif
//       texte: texte
//     lien: lien, facultatif
//
// Une ligne = un champ : son type, puis des précisions séparées par des virgules, puis « — » et une description libre.
// Un champ est obligatoire sauf « facultatif ». Une liste ou un groupe porte ses champs en dessous : « nom (liste, au moins 1): ».

export const ICON_NAMES = ['leaf', 'truck', 'star', 'heart', 'shield', 'clock', 'phone', 'tools', 'wrench', 'home', 'check', 'sun', 'gift', 'scale', 'bread', 'croissant', 'cake', 'drop', 'flame', 'car', 'calendar', 'pin', 'scissors', 'brush', 'camera', 'book', 'coffee', 'euro', 'users', 'lock', 'mail', 'globe'];

// Types, du plus long au plus court (le premier qui correspond au début de la précision l'emporte).
const TYPES = [
  ['texte ou nombre', () => ({ type: ['string', 'number'] })],
  ['nombre entier', () => ({ type: 'integer' })],
  ['oui ou non', () => ({ type: 'boolean' })],
  ['liste de textes', () => ({ type: 'array', items: { type: 'string' } })],
  ['liste de liens', () => ({ type: 'array', items: { $ref: '#/$defs/link' } })],
  ['liste d\'images', () => ({ type: 'array', items: { type: 'string', format: 'asset' } })],
  ['texte long', () => ({ type: 'string' })],
  ['texte', () => ({ type: 'string' })],
  ['nombre', () => ({ type: 'number' })],
  ['entier', () => ({ type: 'integer' })],
  ['lien', () => ({ $ref: '#/$defs/link' })],
  ['image', () => ({ type: 'string', format: 'asset' })],
  ['icône', () => ({ type: 'string', enum: [...ICON_NAMES] })],
  ['date', () => ({ type: 'string' })],
  ['liste', () => ({ type: 'array' })],
  ['groupe', () => ({ type: 'object' })],
];
export const TYPE_WORDS = TYPES.map(([w]) => w);
const MODIFIERS = ['facultatif', 'au moins N', 'au plus N', 'de A à B', 'un parmi a, b, c', 'par défaut X'];

const num = s => { const n = Number(String(s).trim().replace(',', '.')); return Number.isNaN(n) ? null : n; };

/** Découpe « nom (précision) » en nom et précision. */
function splitKey(key) {
  const m = /^\s*([^\s(]+)\s*(?:\((.*)\))?\s*$/.exec(key);
  return m ? { name: m[1], spec: m[2] ?? null } : { name: key, spec: null };
}

/** Lit une précision : « type, précision, … — description ». Renvoie { schema, required, errors }. */
export function parseSpec(spec, { hasChildren = false } = {}) {
  const errors = [];
  let text = String(spec ?? '').trim(), description = '';
  const dash = text.search(/\s[—–]\s|\s--\s/);
  if (dash >= 0) { description = text.slice(dash).replace(/^\s*(—|–|--)\s*/, '').trim(); text = text.slice(0, dash).trim(); }
  let schema = null, required = true;
  // « un parmi » consomme le reste : ses valeurs contiennent des virgules.
  let enumPart = null;
  const ip = text.search(/(^|,\s*)un parmi\s/i);
  if (ip >= 0) { enumPart = text.slice(ip).replace(/^,?\s*un parmi\s+/i, ''); text = text.slice(0, ip); }
  const parts = text.split(',').map(s => s.trim()).filter(Boolean);
  for (const part of parts) {
    const low = part.toLowerCase();
    const t = TYPES.find(([w]) => low === w);
    if (t) { if (schema) errors.push(`deux types pour un même champ (« ${part} »)`); else schema = t[1](); continue; }
    if (/^facultati(f|ve)$/.test(low)) { required = false; continue; }
    if (/^obligatoire$/.test(low)) { required = true; continue; }
    let m;
    if ((m = /^au moins (\d+)$/.exec(low))) { (schema ||= { type: 'string' })._min = Number(m[1]); continue; }
    if ((m = /^au plus (\d+)$/.exec(low))) { (schema ||= { type: 'string' })._max = Number(m[1]); continue; }
    if ((m = /^de (-?[\d.,]+) à (-?[\d.,]+)$/.exec(low))) { (schema ||= { type: 'number' }).minimum = num(m[1]); schema.maximum = num(m[2]); continue; }
    if ((m = /^par défaut (.+)$/.exec(part))) { (schema ||= { type: 'string' })._default = m[1].trim(); continue; }
    const words = [...TYPE_WORDS, 'facultatif', 'au moins', 'au plus', 'de … à …', 'un parmi', 'par défaut'];
    errors.push(`« ${part} » n'est ni un type (${TYPE_WORDS.join(', ')}) ni une précision (${MODIFIERS.join(', ')})${nearestWord(low, words) ? ` ; vouliez-vous dire « ${nearestWord(low, words)} » ?` : ''}`);
  }
  if (!schema) schema = hasChildren ? { type: 'object' } : { type: 'string' };
  if (enumPart !== null) {
    const values = enumPart.split(',').map(s => s.trim()).filter(Boolean);
    const isNum = schema.type === 'integer' || schema.type === 'number';
    schema.enum = values.map(v => (isNum ? num(v) : v));
    if (isNum && schema.enum.some(v => v === null)) errors.push(`« un parmi » : valeurs non numériques pour un nombre (${enumPart})`);
  }
  // au moins / au plus : éléments d'une liste, longueur d'un texte, valeur d'un nombre.
  const isArr = schema.type === 'array', isStr = schema.type === 'string';
  if (schema._min !== undefined) { if (isArr) schema.minItems = schema._min; else if (isStr) schema.minLength = schema._min; else schema.minimum = schema._min; delete schema._min; }
  if (schema._max !== undefined) { if (isArr) schema.maxItems = schema._max; else if (isStr) schema.maxLength = schema._max; else schema.maximum = schema._max; delete schema._max; }
  if (schema._default !== undefined) { const d = schema._default; schema.default = (schema.type === 'integer' || schema.type === 'number') && num(d) !== null ? num(d) : (/^oui$/i.test(d) ? true : /^non$/i.test(d) ? false : d); delete schema._default; }
  if (description) schema.description = description;
  return { schema, required, errors };
}

function nearestWord(w, list) {
  let best = null, bd = Infinity;
  for (const c of list) { const d = lev(w, c); if (d < bd) { bd = d; best = c; } }
  return bd <= Math.max(2, Math.floor(w.length / 4)) ? best : null;
}
function lev(a, b) { const d = Array.from({ length: a.length + 1 }, (_, i) => [i]); for (let j = 1; j <= b.length; j++) d[0][j] = j; for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); return d[a.length][b.length]; }

/**
 * Compile un bloc données (objet YAML) en schéma JSON { type: object, required, properties }.
 * errors : liste de { path, message }.
 */
export function compileDonnees(block, path = 'données') {
  const errors = [];
  const compileFields = (obj, p) => {
    const properties = {}, required = [];
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) { errors.push({ path: p, message: 'attendu : une liste de champs « nom: type, précisions »' }); return { properties, required }; }
    for (const [rawKey, value] of Object.entries(obj)) {
      const { name, spec: keySpec } = splitKey(rawKey);
      const fp = `${p}.${name}`;
      if (!/^[a-z][a-z0-9_]*$/.test(name)) { errors.push({ path: fp, message: `nom de champ « ${name} » : minuscules sans accent, chiffres et _ (il sert dans la forme et dans les pages)` }); continue; }
      const children = value && typeof value === 'object' && !Array.isArray(value) ? value : null;
      if (properties[name]) { errors.push({ path: fp, message: `champ déclaré deux fois : ${name}` }); continue; }
      let spec = keySpec;
      if (children === null) {
        if (keySpec !== null) { errors.push({ path: fp, message: `« ${rawKey} » annonce des champs (parenthèses) mais n'en a pas en dessous` }); }
        if (typeof value !== 'string' && value !== null) { errors.push({ path: fp, message: 'attendu : un texte comme « texte, facultatif »' }); continue; }
        spec = value ?? 'texte';
      }
      const r = parseSpec(spec, { hasChildren: !!children });
      for (const m of r.errors) errors.push({ path: fp, message: m });
      let s = r.schema;
      if (children) {
        const sub = compileFields(children, fp);
        const obj = { type: 'object', additionalProperties: false, ...(sub.required.length ? { required: sub.required } : {}), properties: sub.properties };
        if (s.type === 'array') s = { ...s, items: obj };
        else if (s.type === 'object') s = { ...s, ...obj };
        else errors.push({ path: fp, message: `un champ avec des champs en dessous est une liste ou un groupe, pas « ${spec} »` });
      } else if (s.type === 'array' && !s.items) errors.push({ path: fp, message: 'une liste décrit ses éléments : « nom (liste): » avec leurs champs en dessous, ou « liste de textes »' });
      else if (s.type === 'object' && !s.properties) errors.push({ path: fp, message: 'un groupe décrit ses champs en dessous : « nom (groupe): »' });
      // Ordre des clés stable : type, contraintes, description, puis le reste.
      properties[name] = s;
      if (r.required) required.push(name);
    }
    return { properties, required };
  };
  const { properties, required } = compileFields(block, path);
  return { schema: { type: 'object', ...(required.length ? { required } : {}), properties }, errors };
}
