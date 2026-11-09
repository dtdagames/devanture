// Collections génériques : déclarées dans site.yaml (collections: { nom: { label, fields } }), remplies dans data/<nom>.yaml,
// validées champ par champ, servies aux pages `source: <nom>` (route /xxx/[id]) et au composant collection.list.
import { err, nearest } from './errors.js';

export const FIELD_TYPES = ['string', 'text', 'number', 'boolean', 'date', 'asset', 'list', 'link'];
const SPEC_KEYS = ['label', 'description', 'fields', 'sort', 'title_field'];
const FIELD_KEYS = ['type', 'required', 'label', 'description', 'default'];
export const RESERVED = new Set(['products', 'orders', 'messages', 'events', 'stock']);

/** Normalise la déclaration d'une collection : { label, fields: { nom: { type, required, label, default } }, sort, title_field }. */
export function normalizeSpec(name, raw, file, errors) {
  const base = `collections.${name}`;
  if (!/^[a-z][a-z0-9_]*$/.test(name)) errors.push(err('E_FORMAT', { file, path: base, message: `Nom de collection mal formé : ${name}.`, hint: 'Minuscules, chiffres et _ ; commence par une lettre.' }));
  if (RESERVED.has(name)) errors.push(err('E_FORBIDDEN', { file, path: base, message: `${name} est un nom réservé (données d'exploitation ou boutique).` }));
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) { errors.push(err('E_TYPE', { file, path: base, message: 'Une collection se déclare { label, fields: { nom: type } }.' })); return null; }
  for (const k of Object.keys(raw)) if (!SPEC_KEYS.includes(k)) { const s = nearest(k, SPEC_KEYS); errors.push(err('E_UNKNOWN_PROP', { file, path: `${base}.${k}`, message: `Propriété inconnue : ${k}.`, expected: SPEC_KEYS, hint: s ? `Vouliez-vous dire ${s} ?` : undefined, fix: s ? { rename: { from: k, to: s } } : undefined })); }
  const fields = {};
  if (!raw.fields || typeof raw.fields !== 'object' || Array.isArray(raw.fields) || !Object.keys(raw.fields).length) {
    errors.push(err('E_MISSING_PROP', { file, path: `${base}.fields`, message: 'fields est obligatoire : { title: string, image: asset, … }.' }));
  } else {
    for (const [fname, fraw] of Object.entries(raw.fields)) {
      const fp = `${base}.fields.${fname}`;
      if (!/^[a-z][a-z0-9_]*$/.test(fname)) { errors.push(err('E_FORMAT', { file, path: fp, message: `Nom de champ mal formé : ${fname}.`, hint: 'Minuscules, chiffres et _.' })); continue; }
      if (fname === 'id') { errors.push(err('E_FORBIDDEN', { file, path: fp, message: 'id est implicite : chaque élément a un id unique (minuscules, chiffres, tirets).' })); continue; }
      const f = typeof fraw === 'string' ? { type: fraw } : (fraw && typeof fraw === 'object' && !Array.isArray(fraw) ? { ...fraw } : null);
      if (!f) { errors.push(err('E_TYPE', { file, path: fp, message: 'Un champ se déclare par son type (string) ou { type, required, label, default }.' })); continue; }
      for (const k of Object.keys(f)) if (!FIELD_KEYS.includes(k)) { const s = nearest(k, FIELD_KEYS); errors.push(err('E_UNKNOWN_PROP', { file, path: `${fp}.${k}`, message: `Propriété inconnue : ${k}.`, expected: FIELD_KEYS, hint: s ? `Vouliez-vous dire ${s} ?` : undefined })); }
      const type = f.type ?? 'string';
      if (!FIELD_TYPES.includes(type)) { const s = nearest(String(type), FIELD_TYPES); errors.push(err('E_ENUM', { file, path: `${fp}.type`, message: `Type de champ inconnu : ${JSON.stringify(type)}.`, expected: FIELD_TYPES, hint: s ? `Vouliez-vous dire ${s} ?` : undefined, fix: s ? { set: s } : undefined })); continue; }
      fields[fname] = { type, required: f.required === true, label: typeof f.label === 'string' ? f.label : fname, default: f.default ?? null, description: f.description || '' };
    }
  }
  const titleField = raw.title_field || (fields.title ? 'title' : fields.name ? 'name' : Object.keys(fields)[0] || null);
  if (raw.title_field && !fields[raw.title_field]) errors.push(err('E_UNKNOWN_FIELD', { file, path: `${base}.title_field`, message: `Champ inconnu : ${raw.title_field}.`, expected: Object.keys(fields) }));
  if (raw.sort !== undefined) { const k = String(raw.sort).replace(/^-/, ''); if (!fields[k] && k !== 'id') errors.push(err('E_UNKNOWN_FIELD', { file, path: `${base}.sort`, message: `sort cite un champ inconnu : ${raw.sort}.`, expected: Object.keys(fields) })); }
  return { name, label: raw.label || name, description: raw.description || '', fields, sort: raw.sort ?? null, title_field: titleField };
}

/** Valide et normalise les éléments d'une collection (data/<nom>.yaml : liste sous la clé <nom> ou items). */
export function normalizeItems(spec, raw, file, assets, errors) {
  if (raw === null || raw === undefined) { errors.push(err('E_MISSING_FILE', { file, path: '', message: `data/${spec.name}.yaml est absent alors que la collection ${spec.name} est déclarée.`, hint: `Créez-le avec « ${spec.name}: » suivi d'une liste d'éléments { id, ${Object.keys(spec.fields).slice(0, 3).join(', ')} }.` })); return []; }
  const list = Array.isArray(raw) ? raw : (raw && typeof raw === 'object' ? (raw[spec.name] ?? raw.items) : undefined);
  if (!Array.isArray(list)) { errors.push(err('E_TYPE', { file, path: '', message: `data/${spec.name}.yaml doit contenir une liste sous la clé ${spec.name} (ou items).` })); return []; }
  const items = []; const ids = new Set(); const names = ['id', ...Object.keys(spec.fields)];
  list.forEach((it, i) => {
    const base = `${spec.name}[${i}]`;
    if (!it || typeof it !== 'object' || Array.isArray(it)) { errors.push(err('E_TYPE', { file, path: base, message: 'Un élément est un objet { id, … }.' })); return; }
    if (typeof it.id !== 'string' || !/^[a-z0-9][a-z0-9-]*$/.test(it.id)) { errors.push(err('E_FORMAT', { file, path: `${base}.id`, message: `id obligatoire, en minuscules, chiffres et tirets (reçu ${JSON.stringify(it.id)}).`, fix: typeof it.id === 'string' ? { set: it.id.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-') } : undefined })); return; }
    if (ids.has(it.id)) errors.push(err('E_DUPLICATE', { file, path: `${base}.id`, message: `id en double : ${it.id}.` }));
    ids.add(it.id);
    for (const k of Object.keys(it)) if (!names.includes(k)) { const s = nearest(k, names); errors.push(err('E_UNKNOWN_PROP', { file, path: `${base}.${k}`, message: `Champ inconnu : ${k}.`, expected: names, hint: s ? `Vouliez-vous dire ${s} ?` : `Déclarez-le dans site.yaml › collections.${spec.name}.fields.`, fix: s ? { rename: { from: k, to: s } } : undefined })); }
    const out = { id: it.id };
    for (const [fname, f] of Object.entries(spec.fields)) {
      let v = it[fname];
      if (v === undefined || v === null || v === '') { if (f.required) errors.push(err('E_MISSING_PROP', { file, path: `${base}.${fname}`, message: `Champ obligatoire manquant : ${fname}.` })); out[fname] = f.default; continue; }
      const p = `${base}.${fname}`;
      switch (f.type) {
        case 'string': case 'text': if (typeof v !== 'string') { if (typeof v === 'number' || typeof v === 'boolean') v = String(v); else { errors.push(err('E_TYPE', { file, path: p, message: `Texte attendu, reçu ${Array.isArray(v) ? 'liste' : typeof v}.` })); continue; } } break;
        case 'number': if (typeof v !== 'number') { const n = Number(String(v).replace(',', '.')); if (Number.isNaN(n)) { errors.push(err('E_TYPE', { file, path: p, message: `Nombre attendu, reçu ${JSON.stringify(v)}.` })); continue; } v = n; } break;
        case 'boolean': if (typeof v !== 'boolean') { errors.push(err('E_TYPE', { file, path: p, message: 'true ou false attendu.', fix: { set: Boolean(v) } })); continue; } break;
        case 'date': { const s = v instanceof Date ? v.toISOString().slice(0, 10) : String(v); if (!/^\d{4}(-\d{2}(-\d{2})?)?$/.test(s)) { errors.push(err('E_FORMAT', { file, path: p, message: `Date attendue (AAAA-MM-JJ, AAAA-MM ou AAAA), reçu ${JSON.stringify(v)}.`, hint: 'Entre guillemets si la valeur n\'a que des chiffres : "2024".' })); continue; } v = s; break; }
        case 'asset': if (typeof v !== 'string' || !assets.has(v)) { const s = nearest(String(v), [...assets]); errors.push(err('E_MISSING_ASSET', { file, path: p, message: `Fichier introuvable dans assets/ : ${v}.`, hint: s ? `Vouliez-vous dire ${s} ?` : undefined, fix: s ? { set: s } : undefined })); continue; } break;
        case 'list': if (!Array.isArray(v)) { errors.push(err('E_TYPE', { file, path: p, message: 'Liste attendue (tirets YAML).' })); continue; } v = v.map(x => (typeof x === 'object' && x !== null ? x : String(x))); break;
        case 'link': if (!v || typeof v !== 'object' || typeof v.label !== 'string' || typeof v.to !== 'string') { errors.push(err('E_TYPE', { file, path: p, message: 'Lien attendu : { label, to }.' })); continue; } break;
      }
      out[fname] = v;
    }
    items.push(out);
  });
  if (spec.sort) { const desc = String(spec.sort).startsWith('-'); const k = String(spec.sort).replace(/^-/, ''); items.sort((a, b) => { const x = a[k], y = b[k]; const c = typeof x === 'number' && typeof y === 'number' ? x - y : String(x ?? '').localeCompare(String(y ?? ''), 'fr'); return desc ? -c : c; }); }
  return items;
}
