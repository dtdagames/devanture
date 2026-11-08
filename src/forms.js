// Normalisation des champs du formulaire de contact, partagée par la validation et l'émetteur.
import { err, nearest } from './errors.js';

export const KNOWN_FIELDS = {
  name: { label: 'Nom', type: 'text' },
  email: { label: 'E-mail', type: 'email' },
  phone: { label: 'Téléphone', type: 'tel' },
  subject: { label: 'Sujet', type: 'text' },
  message: { label: 'Message', type: 'textarea' },
};
export const FIELD_TYPES = ['text', 'email', 'tel', 'number', 'date', 'select', 'textarea'];
const FIELD_KEYS = ['name', 'label', 'type', 'required', 'options', 'placeholder', 'when'];
const RESERVED = ['_form', '_csrf', 'website'];
const DEFAULT_REQUIRED = ['name', 'email', 'message'];

/**
 * Valide et normalise props.fields / props.required.
 * Retourne { fields: [{name,label,type,required,options,placeholder}], errors: [] }.
 */
export function normalizeContactFields(props, { file, path }) {
  const errors = [];
  const raw = Array.isArray(props.fields) && props.fields.length ? props.fields : ['name', 'email', 'message'];
  const fields = [];
  const seen = new Set();

  raw.forEach((item, i) => {
    const p = `${path}.fields[${i}]`;
    let f;
    if (typeof item === 'string') {
      if (!KNOWN_FIELDS[item]) {
        const s = nearest(item, Object.keys(KNOWN_FIELDS));
        errors.push(err('E_ENUM', { file, path: p, message: `Champ inconnu : ${item}.`, expected: Object.keys(KNOWN_FIELDS), hint: s ? `Vouliez-vous dire ${s} ? Sinon, déclarez un champ libre : { name: ${item}, label: Libellé }` : `Pour un champ libre : { name: ${item}, label: Libellé, type: text }`, fix: s ? { set: s } : undefined }));
        return;
      }
      f = { name: item, ...KNOWN_FIELDS[item], required: false, options: null, placeholder: null, when: null };
    } else if (item && typeof item === 'object' && !Array.isArray(item)) {
      for (const k of Object.keys(item)) {
        if (!FIELD_KEYS.includes(k)) {
          const s = nearest(k, FIELD_KEYS);
          errors.push(err('E_UNKNOWN_PROP', { file, path: `${p}.${k}`, message: `Propriété inconnue : ${k}.`, expected: FIELD_KEYS, hint: s ? `Vouliez-vous dire ${s} ?` : undefined, fix: s ? { rename: { from: k, to: s } } : undefined }));
        }
      }
      for (const k of ['name', 'label']) if (typeof item[k] !== 'string' || !item[k]) errors.push(err('E_MISSING_PROP', { file, path: `${p}.${k}`, message: `Propriété obligatoire manquante : ${k}.`, hint: 'Un champ libre s\'écrit { name: identifiant, label: Libellé affiché }.' }));
      if (typeof item.name === 'string' && !/^[a-z][a-z0-9_]*$/.test(item.name)) errors.push(err('E_FORMAT', { file, path: `${p}.name`, message: `Nom de champ mal formé : ${item.name}.`, hint: 'Minuscules, chiffres et _ uniquement, commence par une lettre (ex. event_date).' }));
      const type = item.type ?? 'text';
      if (!FIELD_TYPES.includes(type)) {
        const s = nearest(String(type), FIELD_TYPES);
        errors.push(err('E_ENUM', { file, path: `${p}.type`, message: `Type de champ non autorisé : ${JSON.stringify(type)}.`, expected: FIELD_TYPES, hint: s ? `Vouliez-vous dire ${s} ?` : undefined, fix: s ? { set: s } : undefined }));
      }
      if (type === 'select' && (!Array.isArray(item.options) || !item.options.length)) errors.push(err('E_MISSING_PROP', { file, path: `${p}.options`, message: 'Un champ select exige une liste options non vide.' }));
      if (item.options !== undefined && (!Array.isArray(item.options) || item.options.some(o => typeof o !== 'string' && typeof o !== 'number'))) errors.push(err('E_TYPE', { file, path: `${p}.options`, message: 'options doit être une liste de textes.' }));
      if (item.required !== undefined && typeof item.required !== 'boolean') errors.push(err('E_TYPE', { file, path: `${p}.required`, message: 'required doit être true ou false.', fix: { set: Boolean(item.required) } }));
      if (typeof item.name !== 'string' || typeof item.label !== 'string') return;
      // when: { champ: valeur } ou { champ: [v1, v2] } — le champ n'est affiché (et validé) que si la condition est vraie.
      let when = null;
      if (item.when !== undefined) {
        if (!item.when || typeof item.when !== 'object' || Array.isArray(item.when) || Object.keys(item.when).length !== 1) {
          errors.push(err('E_TYPE', { file, path: `${p}.when`, message: 'when s\'écrit { champ: valeur } ou { champ: [valeur1, valeur2] }, une seule clé.' }));
        } else {
          const [[dep, val]] = Object.entries(item.when);
          const values = Array.isArray(val) ? val.map(String) : [String(val)];
          const depField = fields.find(x => x.name === dep);
          if (!depField) {
            const s = nearest(dep, fields.map(x => x.name));
            errors.push(err('E_UNKNOWN_FIELD', { file, path: `${p}.when`, message: `when cite un champ inconnu ou déclaré plus bas : ${dep}.`, expected: fields.map(x => x.name), hint: s ? `Vouliez-vous dire ${s} ?` : 'Le champ conditionnant doit être déclaré avant.', fix: s ? { rename: { from: dep, to: s } } : undefined }));
          } else if (depField.type === 'select' && depField.options) {
            for (const v of values) if (!depField.options.includes(v)) errors.push(err('E_ENUM', { file, path: `${p}.when.${dep}`, message: `Valeur absente des options de ${dep} : ${JSON.stringify(v)}.`, expected: depField.options }));
          }
          when = { field: dep, values };
        }
      }
      f = { name: item.name, label: item.label, type: FIELD_TYPES.includes(type) ? type : 'text', required: item.required === true, options: Array.isArray(item.options) ? item.options.map(String) : null, placeholder: typeof item.placeholder === 'string' ? item.placeholder : null, when };
    } else {
      errors.push(err('E_TYPE', { file, path: p, message: 'Un champ est un nom connu (texte) ou un objet { name, label, … }.' }));
      return;
    }
    if (RESERVED.includes(f.name)) errors.push(err('E_FORMAT', { file, path: `${p}.name`, message: `Nom réservé : ${f.name}.`, expected: [], hint: 'Choisissez un autre identifiant.' }));
    if (seen.has(f.name)) errors.push(err('E_DUPLICATE', { file, path: `${p}.name`, message: `Champ en double : ${f.name}.` }));
    seen.add(f.name);
    fields.push(f);
  });

  const names = fields.map(f => f.name);
  const reqList = Array.isArray(props.required) ? props.required : DEFAULT_REQUIRED.filter(n => names.includes(n));
  if (Array.isArray(props.required)) {
    props.required.forEach((n, i) => {
      if (!names.includes(n)) {
        const s = nearest(String(n), names);
        errors.push(err('E_UNKNOWN_FIELD', { file, path: `${path}.required[${i}]`, message: `required cite un champ absent de fields : ${n}.`, expected: names, hint: s ? `Vouliez-vous dire ${s} ?` : undefined, fix: s ? { set: s } : undefined }));
      }
    });
  }
  for (const f of fields) if (reqList.includes(f.name)) f.required = true;
  return { fields, errors };
}
