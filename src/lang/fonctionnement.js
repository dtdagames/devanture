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
  // Règles du registre : appliquées par la cible sous verrou, au moment où l'envoi est enregistré.
  [/^places$/, 'places', 'places'],
  [/^si (c'est )?complet$/, 'full', 'si complet'],
  [/^liste d'attente$/, 'waitlist', 'liste d\'attente'],
  [/^une (seule )?fois par$/, 'unique', 'une fois par'],
  [/^si deja (inscrit|envoye|fait)$/, 'duplicate', 'si déjà inscrit'],
  [/^champs$/, 'fields', 'champs'],
];
export const FORM_SETTINGS = SETTINGS.map(s => s[2]);
export const RESERVED_STORES = ['orders', 'events', 'stock', 'products'], RESERVED_FIELDS = ['website'];
/** Champs que la cible ajoute à un envoi : un champ déclaré ne peut pas porter ces noms. */
export const RECORD_FIELDS = ['id', 'at', 'form', 'ip', 'page', 'mail', 'waiting', 'cancelled', 'cancelled_at'];
export const RULE_DEFAULTS = {
  full: 'Il n\'y a plus de place.',
  waitlist: 'Il n\'y a plus de place pour l\'instant : vous êtes sur la liste d\'attente, nous vous écrivons si une place se libère.',
  duplicate: 'Vous êtes déjà inscrit.',
};

/**
 * Vérifie des règles de registre contre les champs du formulaire. rules : { capacity: { max, by, qty, message, waitlist,
 * waitlist_message }, unique: { fields, message } }. Renvoie des messages d'erreur (liste vide si tout va bien).
 */
export function checkRules(rules, fields) {
  const out = [], by = n => (fields || []).find(x => (typeof x === 'string' ? x : x?.name) === n), names = (fields || []).map(x => (typeof x === 'string' ? x : x?.name)).filter(Boolean);
  const hint = n => { const s2 = nearest(n, names); return s2 ? ` ; vouliez-vous dire « ${s2} » ?` : ` (champs : ${names.join(', ')})`; };
  if (!rules || typeof rules !== 'object' || Array.isArray(rules)) return ['règles : attendu { capacity, unique }'];
  for (const k of Object.keys(rules)) if (!['capacity', 'unique'].includes(k)) out.push(`règle inconnue « ${k} » (capacity, unique)`);
  const c = rules.capacity;
  if (c !== undefined) {
    if (!c || !Number.isInteger(c.max) || c.max < 1 || c.max > 100000) out.push('places : un nombre entier, au moins 1');
    if (c?.by) { const fd = by(c.by); if (!fd) out.push(`places … par ${c.by} : ${c.by} n'est pas un champ du formulaire${hint(c.by)}`); else if (typeof fd === 'object' && (fd.required === false || fd.when)) out.push(`places … par ${c.by} : ce champ doit être obligatoire et toujours affiché (il dit à quel groupe l'envoi appartient)`); }
    if (c?.qty) { const fd = by(c.qty); if (!fd) out.push(`comptées par ${c.qty} : ${c.qty} n'est pas un champ du formulaire${hint(c.qty)}`); else if (typeof fd !== 'object' || fd.type !== 'number') out.push(`comptées par ${c.qty} : ce champ doit être un nombre (« ${c.qty}: nombre — Nombre de personnes »)`); else if (fd.required === false || fd.when) out.push(`comptées par ${c.qty} : ce champ doit être obligatoire et toujours affiché`); }
    if (c?.by && c.by === c.qty) out.push('places : le champ qui groupe et le champ qui compte sont le même');
  }
  const u = rules.unique;
  if (u !== undefined) {
    if (!u || !Array.isArray(u.fields) || !u.fields.length) out.push('une fois par : au moins un champ (« une fois par: email »)');
    else for (const n of u.fields) { const fd = by(n); if (!fd) out.push(`une fois par ${n} : ${n} n'est pas un champ du formulaire${hint(n)}`); else if (typeof fd === 'object' && (fd.required === false || fd.when)) out.push(`une fois par ${n} : ce champ doit être obligatoire et toujours affiché (sans lui, rien ne distingue deux envois)`); }
  }
  return out;
}

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
    const raw = {}; // réglages de règles, résolus quand tous les champs sont connus (l'ordre des lignes est libre)
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
      else if (['places', 'full', 'waitlist', 'unique', 'duplicate'].includes(key)) raw[key] = { value: sv, ref: sref, path: `${fp}.${sk}` };
      else if (key === 'fields') {
        if (!sv || typeof sv !== 'object' || Array.isArray(sv)) { fail(`${fp}.${sk}`, 'attendu : un champ par ligne, « nom: type, précisions — Libellé »', sref); continue; }
        for (const [fname, fspec] of Object.entries(sv)) {
          const fref = { in: sv, at: fname }, p = `${fp}.champs.${fname}`;
          if (!/^[a-z][a-z0-9_]*$/.test(fname)) { fail(p, `nom de champ « ${fname} » : minuscules sans accent, chiffres et _ (il sert dans la forme et dans le registre)`, fref); continue; }
          if (RESERVED_FIELDS.includes(fname) || RECORD_FIELDS.includes(fname)) { fail(p, `${fname} est un nom de champ réservé${RECORD_FIELDS.includes(fname) ? ' (la cible le pose sur chaque envoi)' : ''}`, fref); continue; }
          if (fspec !== null && typeof fspec !== 'string') { fail(p, 'attendu : un texte comme « texte long, facultatif — Précisions »', fref); continue; }
          if (form.fields.some(f => f.name === fname)) { fail(p, `champ déclaré deux fois : ${fname}`, fref); continue; }
          const r = parseFieldSpec(fname, fspec, form.fields);
          for (const m of r.errors) fail(p, m, fref);
          form.fields.push(r.field);
        }
      }
    }
    // --- règles du registre
    const rules = {}; const text = x => (typeof x.value === 'string' && x.value.trim() ? x.value.trim() : null);
    if (raw.places) {
      const v = raw.places.value, t = typeof v === 'number' ? String(v) : typeof v === 'string' ? v.trim() : '';
      const m = /^(\d+)(?:\s+par\s+([a-z][a-z0-9_]*))?(?:\s*,\s*compt[ée]e?s?\s+par\s+([a-z][a-z0-9_]*))?$/i.exec(t);
      if (!m) fail(raw.places.path, 'attendu : « 12 », « 12 par atelier » (un champ qui groupe) ou « 12 par atelier, comptées par personnes » (un champ nombre)', raw.places.ref);
      else rules.capacity = { max: Number(m[1]), ...(m[2] ? { by: m[2] } : {}), ...(m[3] ? { qty: m[3] } : {}) };
    }
    if (raw.full) { if (!rules.capacity && !raw.places) fail(raw.full.path, '« si complet » va avec « places: »', raw.full.ref); else if (!text(raw.full)) fail(raw.full.path, 'attendu : le message affiché quand il n\'y a plus de place', raw.full.ref); else if (rules.capacity) rules.capacity.message = text(raw.full); }
    if (raw.waitlist) {
      const v = raw.waitlist.value, low = typeof v === 'string' ? v.trim().toLowerCase() : v;
      if (!rules.capacity && !raw.places) fail(raw.waitlist.path, '« liste d\'attente » va avec « places: »', raw.waitlist.ref);
      else if (v === true || low === 'oui') { if (rules.capacity) rules.capacity.waitlist = true; }
      else if (v === false || low === 'non') { /* refus quand c'est complet */ }
      else if (text(raw.waitlist)) { if (rules.capacity) { rules.capacity.waitlist = true; rules.capacity.waitlist_message = text(raw.waitlist); } }
      else fail(raw.waitlist.path, 'attendu : oui, non, ou le message affiché à qui est mis en attente', raw.waitlist.ref);
    }
    if (raw.unique) {
      const t = text(raw.unique), list = t ? t.split(/\s*,\s*|\s+et\s+/).map(x => x.trim()).filter(Boolean) : [];
      if (!list.length || list.some(x => !/^[a-z][a-z0-9_]*$/.test(x))) fail(raw.unique.path, 'attendu : un ou plusieurs champs, « email » ou « email, atelier »', raw.unique.ref);
      else rules.unique = { fields: list };
    }
    if (raw.duplicate) { if (!rules.unique && !raw.unique) fail(raw.duplicate.path, '« si déjà inscrit » va avec « une fois par: »', raw.duplicate.ref); else if (!text(raw.duplicate)) fail(raw.duplicate.path, 'attendu : le message affiché à qui s\'inscrit deux fois', raw.duplicate.ref); else if (rules.unique) rules.unique.message = text(raw.duplicate); }
    if (Object.keys(rules).length) {
      for (const m of checkRules(rules, form.fields)) { const k = /^une fois|^si déjà/.test(m) ? raw.unique : raw.places; fail(k?.path || fp, m, k?.ref || ref); }
      form.rules = rules;
    }
    if (!form.store && !storeSeen) fail(fp, 'réglage manquant : « enregistre dans: <registre> » (où ranger les envois, ex. devis)', ref);
    if (!form.fields.length) fail(fp, 'un formulaire déclare ses champs : « champs: » puis « nom: type — Libellé » par ligne', ref);
    effects.form = form;
  }
  return { effects: Object.keys(effects).length ? effects : null, errors };
}
