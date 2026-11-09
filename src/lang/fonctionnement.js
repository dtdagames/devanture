// Bloc « fonctionnement » d'un composant : ce que le composant fait une fois envoyé au serveur, en français contrôlé,
// compilé vers les effets déclarés (effects.form) que le compilateur exécute : validation, CSRF, enregistrement, e-mail.
//
//   fonctionnement:
//     formulaire:
//       enregistre dans: devis
//       prévient par e-mail: oui
//       confirmation: Merci, nous vous rappelons dans la journée.
//       champs:
//         name:
//         phone: facultatif
//         type_travaux: choix, un parmi Fuite, Chauffe-eau, Autre — Type de travaux
//         precision: texte, si type_travaux vaut Autre — Précisez
//         details: texte long, facultatif — Précisions (ex. étage, accès)
//
// Un champ = « nom: type, précisions — Libellé (ex. exemple affiché dans le champ) ». Obligatoire sauf « facultatif », comme dans
// les données. Les noms name, email, phone, subject, message ont leur type et leur libellé habituels : on peut ne rien écrire après.
import { KNOWN_FIELDS } from '../forms.js';

const norm = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[\s_]+/g, ' ').trim();

// Types de champ, du plus long au plus court.
const FIELD_TYPES = [['texte long', 'textarea'], ['nombre entier', 'number'], ['téléphone', 'tel'], ['telephone', 'tel'], ['courriel', 'email'], ['e-mail', 'email'], ['email', 'email'], ['nombre', 'number'], ['texte', 'text'], ['choix', 'select'], ['date', 'date']];
export const FIELD_TYPE_WORDS = ['texte', 'texte long', 'e-mail', 'téléphone', 'nombre', 'date', 'choix'];
export const FIELD_MODIFIERS = ['facultatif', 'si <champ> vaut <valeur>', 'un parmi a, b, c'];
// Réglages du formulaire : formes acceptées (sans accent, minuscules) → clé de l'effet.
const SETTINGS = [
  [/^enregistre(e|es|r|ment)? dans$|^enregistrement$/, 'store', 'enregistre dans'],
  [/^previent par (e-?mail|courriel)$|^prevenir par (e-?mail|courriel)$/, 'notify', 'prévient par e-mail'],
  [/^destinataire$/, 'to', 'destinataire'],
  [/^(message de )?confirmation$/, 'success', 'confirmation'],
  [/^champs$/, 'fields', 'champs'],
];
export const FORM_SETTINGS = SETTINGS.map(s => s[2]);
const RESERVED_STORES = ['orders', 'events', 'stock', 'products'], RESERVED_FIELDS = ['website'];

function lev(a, b) { const d = Array.from({ length: a.length + 1 }, (_, i) => [i]); for (let j = 1; j <= b.length; j++) d[0][j] = j; for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); return d[a.length][b.length]; }
const nearest = (w, list) => { let best = null, bd = Infinity; for (const c of list) { const d = lev(norm(w), norm(c)); if (d < bd) { bd = d; best = c; } } return bd <= Math.max(2, Math.floor(String(w).length / 3)) ? best : null; };

/** Lit « type, précisions — Libellé (ex. exemple) » pour le champ name. previous : champs déjà lus (pour « si … vaut … »). */
export function parseFieldSpec(name, spec, previous = []) {
  const errors = [];
  let text = String(spec ?? '').trim(), label = '', placeholder = null;
  const dash = text.search(/(^|\s)(—|–|--)\s/);
  if (dash >= 0) { label = text.slice(dash).replace(/^\s*(—|–|--)\s*/, '').trim(); text = text.slice(0, dash).trim(); }
  const ex = /\s*\((?:ex\.?|exemple)\s*:?\s*([^)]+)\)\s*$/i.exec(label);
  if (ex) { placeholder = ex[1].trim(); label = label.slice(0, ex.index).trim(); }
  let options = null;
  const ip = text.search(/(^|,\s*)(un|choix) parmi\s/i);
  if (ip >= 0) { options = text.slice(ip).replace(/^,?\s*(un|choix) parmi\s+/i, '').split(',').map(s => s.trim()).filter(Boolean); text = text.slice(0, ip); }
  const known = KNOWN_FIELDS[name] || null;
  let type = null, required = true, when = null;
  for (const part of text.split(',').map(s => s.trim()).filter(Boolean)) {
    const low = part.toLowerCase();
    const t = FIELD_TYPES.find(([w]) => low === w);
    if (t) { if (type) errors.push(`deux types pour le champ (« ${part} »)`); else type = t[1]; continue; }
    if (/^facultati(f|ve)$/.test(low)) { required = false; continue; }
    if (/^obligatoire$/.test(low)) { required = true; continue; }
    const m = /^si\s+([a-z][a-z0-9_]*)\s+vaut\s+(.+)$/i.exec(part);
    if (m) {
      const dep = previous.find(f => f.name === m[1]);
      if (!dep) { const s = nearest(m[1], previous.map(f => f.name)); errors.push(`« si ${m[1]} vaut … » : ${m[1]} n'est pas un champ déclaré plus haut${s ? ` ; vouliez-vous dire « ${s} » ?` : ''}`); continue; }
      // Une valeur peut contenir « ou » (« Fuite ou dépannage ») : l'option entière d'abord, sinon plusieurs valeurs séparées par « ou ».
      const whole = m[2].trim();
      const values = dep.options && !dep.options.includes(whole) ? whole.split(/\s+ou\s+/).map(s => s.trim()).filter(Boolean) : [whole];
      if (dep.options) for (const v of values) if (!dep.options.includes(v)) errors.push(`« si ${m[1]} vaut ${v} » : ${v} n'est pas une valeur de ${m[1]} (${dep.options.join(', ')})`);
      when = { [m[1]]: values.length === 1 ? values[0] : values };
      continue;
    }
    const words = [...FIELD_TYPE_WORDS, 'facultatif', 'un parmi', 'si … vaut …'];
    const s = nearest(low, words);
    errors.push(`« ${part} » n'est ni un type de champ (${FIELD_TYPE_WORDS.join(', ')}) ni une précision (${FIELD_MODIFIERS.join(' ; ')})${s ? ` ; vouliez-vous dire « ${s} » ?` : ''}`);
  }
  if (options && !type) type = 'select';
  if (options && type !== 'select') errors.push('« un parmi » décrit un champ à choix : retirez le type, ou écrivez « choix, un parmi … »');
  if (type === 'select' && !(options && options.length)) errors.push('un champ « choix » donne ses valeurs : « choix, un parmi A, B, C »');
  type ||= known ? known.type : 'text';
  if (!label) { if (known) label = known.label; else errors.push(`libellé manquant : « ${name}: ${String(spec ?? 'texte').trim() || 'texte'} — Libellé affiché »`); }
  const field = { name, label: label || name, type, required, ...(options ? { options } : {}), ...(placeholder ? { placeholder } : {}), ...(when ? { when } : {}) };
  return { field, errors };
}

/**
 * Compile le bloc fonctionnement en effets déclarés. Renvoie { effects, errors: [{ path, message, ref }] }.
 */
export function compileFonctionnement(block, path = 'fonctionnement') {
  const errors = [];
  const fail = (p, message, ref) => errors.push({ path: p, message, ref });
  if (!block || typeof block !== 'object' || Array.isArray(block)) { fail(path, 'attendu : « formulaire: » puis ses réglages et ses champs', block); return { effects: null, errors }; }
  const effects = {};
  for (const [k, v] of Object.entries(block)) {
    const ref = { in: block, at: k };
    if (norm(k) !== 'formulaire') { fail(`${path}.${k}`, `fonctionnement inconnu « ${k} » (connu : formulaire)`, ref); continue; }
    const fp = `${path}.formulaire`;
    if (!v || typeof v !== 'object' || Array.isArray(v)) { fail(fp, `attendu : ${FORM_SETTINGS.map(s => `« ${s}: »`).join(', ')}`, ref); continue; }
    const form = { fields: [], required: [] }; let storeSeen = false;
    for (const [sk, sv] of Object.entries(v)) {
      const sref = { in: v, at: sk };
      const hit = SETTINGS.find(([re]) => re.test(norm(sk)));
      if (!hit) { const s = nearest(sk, FORM_SETTINGS); fail(`${fp}.${sk}`, `réglage de formulaire inconnu « ${sk} »${s ? ` ; vouliez-vous dire « ${s} » ?` : ''} (réglages : ${FORM_SETTINGS.join(', ')})`, sref); continue; }
      const key = hit[1];
      if (key === 'store') { storeSeen = true; if (typeof sv !== 'string' || !/^[a-z][a-z0-9_]*$/.test(sv.trim())) fail(`${fp}.${sk}`, 'nom du registre où ranger les envois : minuscules, chiffres et _ (ex. devis, reservations)', sref); else if (RESERVED_STORES.includes(sv.trim())) fail(`${fp}.${sk}`, `${sv.trim()} est un registre réservé (${RESERVED_STORES.join(', ')}) : choisissez un autre nom`, sref); else form.store = sv.trim(); }
      else if (key === 'notify') {
        if (sv === true || sv === false) form.notify = sv;
        else if (typeof sv === 'string' && /^oui$/i.test(sv.trim())) form.notify = true;
        else if (typeof sv === 'string' && /^non$/i.test(sv.trim())) form.notify = false;
        else if (typeof sv === 'string' && /^[^@\s]+@[^@\s]+$/.test(sv.trim())) form.notify = sv.trim();
        else fail(`${fp}.${sk}`, 'attendu : oui, non ou une adresse e-mail', sref);
      }
      else if (key === 'to') { if (typeof sv === 'string' && /^[^@\s]+@[^@\s]+$/.test(sv.trim())) form.to = sv.trim(); else fail(`${fp}.${sk}`, 'attendu : une adresse e-mail', sref); }
      else if (key === 'success') { if (typeof sv === 'string' && sv.trim()) form.success = sv.trim(); else fail(`${fp}.${sk}`, 'attendu : le message affiché après l\'envoi', sref); }
      else if (key === 'fields') {
        if (!sv || typeof sv !== 'object' || Array.isArray(sv)) { fail(`${fp}.${sk}`, 'attendu : un champ par ligne, « nom: type, précisions — Libellé »', sref); continue; }
        for (const [fname, fspec] of Object.entries(sv)) {
          const fref = { in: sv, at: fname }, p = `${fp}.champs.${fname}`;
          if (!/^[a-z][a-z0-9_]*$/.test(fname)) { fail(p, `nom de champ « ${fname} » : minuscules sans accent, chiffres et _ (il sert dans la forme et dans le registre)`, fref); continue; }
          if (RESERVED_FIELDS.includes(fname)) { fail(p, `${fname} est un nom de champ réservé`, fref); continue; }
          if (fspec !== null && typeof fspec !== 'string') { fail(p, 'attendu : un texte comme « texte long, facultatif — Précisions »', fref); continue; }
          if (form.fields.some(f => f.name === fname)) { fail(p, `champ déclaré deux fois : ${fname}`, fref); continue; }
          const r = parseFieldSpec(fname, fspec, form.fields);
          for (const m of r.errors) fail(p, m, fref);
          form.fields.push(r.field);
        }
      }
    }
    if (!form.store && !storeSeen) fail(fp, 'réglage manquant : « enregistre dans: <registre> » (où ranger les envois, ex. devis)', ref);
    if (!form.fields.length) fail(fp, 'un formulaire déclare ses champs : « champs: » puis « nom: type — Libellé » par ligne', ref);
    effects.form = form;
  }
  return { effects: Object.keys(effects).length ? effects : null, errors };
}
