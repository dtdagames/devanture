// Segments de personnalisation : validation de segments.yaml et compilation en spécification
// évaluée à l'identique par le PHP (premier rendu) et le JavaScript (profil du visiteur).
import { err, nearest } from './errors.js';

export const EVENTS = ['page_view', 'section_view', 'click_cta', 'form_start', 'form_submit', 'search', 'cart_add', 'checkout_start', 'purchase', 'variant_shown'];
const OPS = ['eq', 'gte', 'lte', 'gt', 'lt'];
const DURATION = /^(\d+)(h|d|m)$/; // heures, jours, mois

function parseDuration(v, ctx) {
  const m = DURATION.exec(String(v));
  if (!m) { ctx.errors.push(err('E_FORMAT', { file: ctx.file, path: ctx.path + '.within', message: `Durée mal formée : ${JSON.stringify(v)}.`, hint: 'Exemples : 24h, 7d, 3m (heures, jours, mois).' })); return null; }
  const n = Number(m[1]);
  return m[2] === 'h' ? n * 3600 : m[2] === 'd' ? n * 86400 : n * 30 * 86400;
}

function parseCmp(v, ctx, what) {
  if (typeof v === 'number') return { op: 'eq', n: v };
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    const keys = Object.keys(v);
    if (keys.length === 1 && OPS.includes(keys[0]) && typeof v[keys[0]] === 'number') return { op: keys[0], n: v[keys[0]] };
  }
  ctx.errors.push(err('E_FORMAT', { file: ctx.file, path: ctx.path, message: `${what} attend un nombre ou { eq | gte | lte | gt | lt : nombre }.`, expected: OPS }));
  return null;
}

/** Compile une condition (récursif). Retourne un nœud normalisé ou null. */
function compileCond(c, ctx) {
  if (!c || typeof c !== 'object' || Array.isArray(c)) { ctx.errors.push(err('E_TYPE', { file: ctx.file, path: ctx.path, message: 'Une condition est un objet.' })); return null; }
  const keys = Object.keys(c);
  if (keys.includes('all') || keys.includes('any')) {
    const k = keys.includes('all') ? 'all' : 'any';
    if (!Array.isArray(c[k]) || !c[k].length) { ctx.errors.push(err('E_TYPE', { file: ctx.file, path: `${ctx.path}.${k}`, message: `${k} attend une liste non vide de conditions.` })); return null; }
    const items = c[k].map((x, i) => compileCond(x, { ...ctx, path: `${ctx.path}.${k}[${i}]` })).filter(Boolean);
    return { type: k, items };
  }
  if (keys.includes('not')) return { type: 'not', item: compileCond(c.not, { ...ctx, path: ctx.path + '.not' }) };
  if (keys.includes('visits')) {
    const cmp = parseCmp(c.visits, { ...ctx, path: ctx.path + '.visits' }, 'visits'); return cmp ? { type: 'visits', ...cmp } : null;
  }
  if (keys.includes('device')) {
    if (!['mobile', 'desktop'].includes(c.device)) { ctx.errors.push(err('E_ENUM', { file: ctx.file, path: ctx.path + '.device', message: `device : ${JSON.stringify(c.device)}.`, expected: ['mobile', 'desktop'] })); return null; }
    return { type: 'device', value: c.device };
  }
  if (keys.includes('event')) {
    const allowed = ['event', 'within', 'count', 'where'];
    for (const k of keys) if (!allowed.includes(k)) ctx.errors.push(err('E_UNKNOWN_PROP', { file: ctx.file, path: `${ctx.path}.${k}`, message: `Propriété inconnue : ${k}.`, expected: allowed }));
    if (!EVENTS.includes(c.event)) {
      const s = nearest(String(c.event), EVENTS);
      ctx.errors.push(err('E_ENUM', { file: ctx.file, path: ctx.path + '.event', message: `Événement inconnu : ${c.event}.`, expected: EVENTS, hint: s ? `Vouliez-vous dire ${s} ?` : undefined, fix: s ? { set: s } : undefined }));
      return null;
    }
    const node = { type: 'event', name: c.event, within: null, count: { op: 'gte', n: 1 }, where: null };
    if (c.within !== undefined) node.within = parseDuration(c.within, ctx);
    if (c.count !== undefined) { const cmp = parseCmp(c.count, { ...ctx, path: ctx.path + '.count' }, 'count'); if (cmp) node.count = cmp; }
    if (c.where !== undefined) {
      if (!c.where || typeof c.where !== 'object' || Array.isArray(c.where) || Object.keys(c.where).length !== 1) ctx.errors.push(err('E_TYPE', { file: ctx.file, path: ctx.path + '.where', message: 'where attend une seule clé : { section: id } ou { route: /page } ou { category: nom }.' }));
      else { const [[k, v]] = Object.entries(c.where); node.where = { key: String(k), value: String(v) }; }
    }
    return node;
  }
  const s = nearest(keys[0] || '', ['visits', 'device', 'event', 'all', 'any', 'not']);
  ctx.errors.push(err('E_UNKNOWN_PROP', { file: ctx.file, path: ctx.path, message: `Condition inconnue : ${keys.join(', ') || '(vide)'}.`, expected: ['visits', 'device', 'event', 'all', 'any', 'not'], hint: s ? `Vouliez-vous dire ${s} ?` : undefined }));
  return null;
}

/**
 * Valide et compile segments.yaml. Retourne { spec, errors }.
 * spec = { segments: { nom: condition }, priority: [...], tracked: { events: [...], where: [...] } }
 */
export function compileSegments(raw, file) {
  const errors = [];
  const ctx = { file, errors, path: '' };
  if (raw === null || raw === undefined) return { spec: null, errors };
  if (typeof raw !== 'object' || !raw.segments || typeof raw.segments !== 'object') {
    errors.push(err('E_SCHEMA', { file, path: 'segments', message: 'segments.yaml attend une clé segments: { nom: condition, … } et une clé priority optionnelle.' }));
    return { spec: null, errors };
  }
  for (const k of Object.keys(raw)) if (!['segments', 'priority'].includes(k)) errors.push(err('E_UNKNOWN_PROP', { file, path: k, message: `Clé inconnue : ${k}.`, expected: ['segments', 'priority'] }));
  const segments = {};
  for (const [name, cond] of Object.entries(raw.segments)) {
    if (!/^[a-z][a-z0-9_]*$/.test(name)) errors.push(err('E_FORMAT', { file, path: `segments.${name}`, message: `Nom de segment mal formé : ${name}.`, hint: 'Minuscules, chiffres et _ (ex. panier_abandonne).' }));
    const node = compileCond(cond, { ...ctx, path: `segments.${name}` });
    if (node) segments[name] = node;
  }
  const names = Object.keys(segments);
  let priority = names;
  if (raw.priority !== undefined) {
    if (!Array.isArray(raw.priority)) errors.push(err('E_TYPE', { file, path: 'priority', message: 'priority attend une liste de noms de segments.' }));
    else {
      raw.priority.forEach((n, i) => { if (!names.includes(n)) { const s = nearest(String(n), names); errors.push(err('E_UNKNOWN_SEGMENT', { file, path: `priority[${i}]`, message: `Segment inconnu dans priority : ${n}.`, expected: names, hint: s ? `Vouliez-vous dire ${s} ?` : undefined, fix: s ? { set: s } : undefined })); } });
      priority = [...raw.priority.filter(n => names.includes(n)), ...names.filter(n => !raw.priority.includes(n))];
    }
  }
  const tracked = { events: new Set(['page_view']), where: new Set() };
  const walk = n => { if (!n) return; if (n.type === 'event') { tracked.events.add(n.name); if (n.where) tracked.where.add(n.where.key); } (n.items || []).forEach(walk); if (n.item) walk(n.item); };
  Object.values(segments).forEach(walk);
  return { spec: { segments, priority, tracked: { events: [...tracked.events], where: [...tracked.where] } }, errors };
}
