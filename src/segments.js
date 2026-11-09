// Segments de personnalisation : validation de segments.yaml et compilation en spécification
// évaluée à l'identique par le PHP (premier rendu) et le JavaScript (profil du visiteur).
import { err, nearest } from './errors.js';

export const EVENTS = ['page_view', 'section_view', 'click_cta', 'form_start', 'form_submit', 'form_sent', 'search', 'cart_add', 'checkout_start', 'purchase', 'variant_shown'];
const OPS = ['eq', 'gte', 'lte', 'gt', 'lt'];
/** Événements qui peuvent servir d'objectif à une expérience, et les précisions (where) que chacun transporte. */
export const GOAL_EVENTS = { page_view: ['route'], section_view: ['section', 'route'], click_cta: ['to', 'route'], form_start: ['form', 'route'], form_submit: ['form', 'route'], form_sent: ['form', 'route'], search: [], cart_add: ['category', 'route'], checkout_start: [], purchase: [] };
/** Nom du groupe qui garde le contenu de base. */
export const CONTROL = 'temoin';
export const DEFAULT_MINIMUM = 200;
const NAME = /^[a-z][a-z0-9_]*$/;
const isMap = v => !!v && typeof v === 'object' && !Array.isArray(v);
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
  const ROOT_KEYS = ['segments', 'priority', 'goals', 'experiments'];
  if (!isMap(raw) || (raw.segments !== undefined && !isMap(raw.segments)) || (!isMap(raw.segments) && !isMap(raw.experiments))) {
    errors.push(err('E_SCHEMA', { file, path: 'segments', message: 'segments.yaml attend segments: { nom: condition, … } et, en option, priority, goals et experiments.', hint: 'sitec explain site' }));
    return { spec: null, errors };
  }
  for (const k of Object.keys(raw)) if (!ROOT_KEYS.includes(k)) { const s = nearest(k, ROOT_KEYS); errors.push(err('E_UNKNOWN_PROP', { file, path: k, message: `Clé inconnue : ${k}.`, expected: ROOT_KEYS, hint: s ? `Vouliez-vous dire ${s} ?` : undefined })); }
  const segments = {};
  for (const [name, cond] of Object.entries(raw.segments || {})) {
    if (!NAME.test(name)) errors.push(err('E_FORMAT', { file, path: `segments.${name}`, message: `Nom de segment mal formé : ${name}.`, hint: 'Minuscules, chiffres et _ (ex. panier_abandonne).' }));
    if (name === CONTROL) { errors.push(err('E_FORBIDDEN', { file, path: `segments.${name}`, message: `« ${CONTROL} » est réservé : c'est le groupe d'une expérience qui garde le contenu de base.` })); continue; }
    const node = compileCond(cond, { ...ctx, path: `segments.${name}` });
    if (node) segments[name] = node;
  }
  const { goals, experiments, arms } = compileExperiments(raw, segments, ctx);
  const names = Object.keys(segments);
  // Un bras d'expérience passe avant les segments, sauf place explicite dans priority.
  let priority = [...arms, ...names.filter(n => !arms.includes(n))];
  if (raw.priority !== undefined) {
    if (!Array.isArray(raw.priority)) errors.push(err('E_TYPE', { file, path: 'priority', message: 'priority attend une liste de noms de segments.' }));
    else {
      raw.priority.forEach((n, i) => { if (!names.includes(n)) { const s = nearest(String(n), names); errors.push(err('E_UNKNOWN_SEGMENT', { file, path: `priority[${i}]`, message: `Segment inconnu dans priority : ${n}.`, expected: names, hint: s ? `Vouliez-vous dire ${s} ?` : undefined, fix: s ? { set: s } : undefined })); } });
      priority = [...arms.filter(n => !raw.priority.includes(n)), ...raw.priority.filter(n => names.includes(n)), ...names.filter(n => !raw.priority.includes(n) && !arms.includes(n))];
    }
  }
  const tracked = { events: new Set(['page_view']), where: new Set() };
  const walk = n => { if (!n) return; if (n.type === 'event') { tracked.events.add(n.name); if (n.where) tracked.where.add(n.where.key); } (n.items || []).forEach(walk); if (n.item) walk(n.item); };
  Object.values(segments).forEach(walk);
  const spec = { segments, priority, tracked: { events: [...tracked.events], where: [...tracked.where] } };
  // Clés absentes quand rien n'est déclaré : un site sans expérience garde la spécification qu'il avait.
  if (Object.keys(experiments).length) { spec.goals = goals; spec.experiments = experiments; }
  return { spec, errors };
}

/**
 * Objectifs et expériences. Un objectif nomme l'événement qui compte comme une réussite. Une expérience mesure l'effet d'un contenu
 * sur un objectif, contre un groupe témoin tiré au sort :
 *   arms    : chaque bras est un segment attribué par tirage (A/B) ; les visiteurs restants gardent le contenu de base ;
 *   segment : une part (holdout) des visiteurs d'un segment garde le contenu de base, ce qui mesure l'effet de la personnalisation.
 * Un bras, comme le segment mesuré, s'emploie dans variants comme n'importe quel segment.
 * Modifie segments : ajoute les bras, et garde le segment mesuré derrière le tirage.
 */
function compileExperiments(raw, segments, ctx) {
  const { file, errors } = ctx;
  const goals = {}, experiments = {}, arms = [];
  const badName = (name, path, what) => { if (!NAME.test(name)) errors.push(err('E_FORMAT', { file, path, message: `Nom ${what} mal formé : ${name}.`, hint: 'Minuscules, chiffres et _ (ex. accroche_urgence).' })); };
  if (raw.goals !== undefined && !isMap(raw.goals)) errors.push(err('E_TYPE', { file, path: 'goals', message: 'goals attend { nom: { event: nom_d_événement } }.' }));
  for (const [name, g] of Object.entries(isMap(raw.goals) ? raw.goals : {})) {
    const path = `goals.${name}`;
    badName(name, path, "d'objectif");
    if (!isMap(g) || typeof g.event !== 'string') { errors.push(err('E_TYPE', { file, path, message: 'Un objectif est { event: nom_d_événement }, avec en option where: { clé: valeur }.', expected: Object.keys(GOAL_EVENTS) })); continue; }
    for (const k of Object.keys(g)) if (!['event', 'where'].includes(k)) errors.push(err('E_UNKNOWN_PROP', { file, path: `${path}.${k}`, message: `Propriété inconnue : ${k}.`, expected: ['event', 'where'] }));
    if (!(g.event in GOAL_EVENTS)) { const s = nearest(g.event, Object.keys(GOAL_EVENTS)); errors.push(err('E_ENUM', { file, path: `${path}.event`, message: `Événement inconnu pour un objectif : ${g.event}.`, expected: Object.keys(GOAL_EVENTS), hint: s ? `Vouliez-vous dire ${s} ?` : undefined, fix: s ? { set: s } : undefined })); continue; }
    const goal = { event: g.event, where: null };
    if (g.where !== undefined) {
      const allowed = GOAL_EVENTS[g.event];
      if (!isMap(g.where) || Object.keys(g.where).length !== 1) { errors.push(err('E_TYPE', { file, path: `${path}.where`, message: 'where attend une seule clé.', expected: allowed })); continue; }
      const [[k, v]] = Object.entries(g.where);
      if (!allowed.includes(k)) { errors.push(err('E_UNKNOWN_PROP', { file, path: `${path}.where.${k}`, message: allowed.length ? `${g.event} ne transporte pas « ${k} ».` : `${g.event} ne se précise pas par where.`, expected: allowed })); continue; }
      goal.where = { key: k, value: String(v) };
    }
    goals[name] = goal;
  }
  if (raw.experiments !== undefined && !isMap(raw.experiments)) errors.push(err('E_TYPE', { file, path: 'experiments', message: 'experiments attend { nom: { goal, arms } } ou { nom: { goal, segment, holdout } }.' }));
  const measured = new Set();
  const KEYS = ['goal', 'arms', 'segment', 'holdout', 'minimum'];
  for (const [name, x] of Object.entries(isMap(raw.experiments) ? raw.experiments : {})) {
    const path = `experiments.${name}`;
    badName(name, path, "d'expérience");
    if (!isMap(x)) { errors.push(err('E_TYPE', { file, path, message: "Une expérience est { goal, arms } (A/B) ou { goal, segment, holdout } (mesure d'un segment)." })); continue; }
    let bad = false;
    for (const k of Object.keys(x)) if (!KEYS.includes(k)) { const s = nearest(k, KEYS); errors.push(err('E_UNKNOWN_PROP', { file, path: `${path}.${k}`, message: `Propriété inconnue : ${k}.`, expected: KEYS, hint: s ? `Vouliez-vous dire ${s} ?` : undefined })); }
    if (typeof x.goal !== 'string' || !(x.goal in goals)) {
      bad = true;
      // Un objectif déclaré mais mal écrit a déjà son erreur plus haut : on ne la double pas.
      if (!(isMap(raw.goals) && typeof x.goal === 'string' && x.goal in raw.goals)) {
        const known = Object.keys(goals); const s = typeof x.goal === 'string' ? nearest(x.goal, known) : null;
        errors.push(err('E_UNKNOWN_GOAL', { file, path: `${path}.goal`, message: x.goal === undefined ? 'Une expérience nomme son objectif : goal.' : `Objectif inconnu : ${x.goal}.`, expected: known, hint: s ? `Vouliez-vous dire ${s} ?` : 'Déclarez-le sous goals: { nom: { event: form_submit } }.', fix: s ? { set: s } : undefined }));
      }
    }
    let minimum = DEFAULT_MINIMUM;
    if (x.minimum !== undefined) { if (!Number.isInteger(x.minimum) || x.minimum < 20) { errors.push(err('E_FORMAT', { file, path: `${path}.minimum`, message: "minimum attend un entier d'au moins 20 : le nombre de visiteurs exposés par groupe avant tout verdict." })); bad = true; } else minimum = x.minimum; }
    if ((x.arms === undefined) === (x.segment === undefined)) { errors.push(err('E_SCHEMA', { file, path, message: "Une expérience a soit arms (bras tirés au sort parmi tous les visiteurs), soit segment (mesure d'un segment contre un groupe témoin).", expected: ['arms', 'segment'] })); continue; }
    if (x.arms !== undefined) {
      if (x.holdout !== undefined) errors.push(err('E_UNKNOWN_PROP', { file, path: `${path}.holdout`, message: 'holdout va avec segment. Avec arms, le témoin est la part que les bras ne prennent pas.' }));
      // Liste : parts égales, témoin compris. Objet : pourcentage par bras, le reste au témoin.
      let shares = null;
      if (Array.isArray(x.arms) && x.arms.length && x.arms.every(a => typeof a === 'string')) shares = x.arms.map(a => [a, 100 / (x.arms.length + 1)]);
      else if (isMap(x.arms) && Object.keys(x.arms).length && Object.values(x.arms).every(n => typeof n === 'number' && n > 0)) shares = Object.entries(x.arms);
      if (!shares) { errors.push(err('E_TYPE', { file, path: `${path}.arms`, message: 'arms attend une liste de noms (parts égales, témoin compris) ou { nom: pourcentage }.', hint: 'arms: [urgence] donne la moitié des visiteurs au bras ; arms: { urgence: 30, prix: 30 } laisse 40 % au contenu de base.' })); continue; }
      if (new Set(shares.map(([a]) => a)).size !== shares.length) { errors.push(err('E_DUPLICATE', { file, path: `${path}.arms`, message: 'Un bras est nommé deux fois.' })); continue; }
      const total = shares.reduce((n, [, p]) => n + p, 0);
      if (total > 99) { errors.push(err('E_FORMAT', { file, path: `${path}.arms`, message: `Les bras prennent ${Math.round(total)} % des visiteurs : il ne reste pas de groupe témoin.`, hint: "Le témoin, qui garde le contenu de base, est ce qui reste après les bras : laissez-lui une part comparable à celle d'un bras." })); continue; }
      let acc = 0; const list = [];
      for (const [arm, pct] of shares) {
        const ap = `${path}.arms.${arm}`;
        badName(arm, ap, 'de bras');
        if (arm === CONTROL) { errors.push(err('E_FORBIDDEN', { file, path: ap, message: `« ${CONTROL} » désigne le groupe qui garde le contenu de base : ce n'est pas un nom de bras.` })); bad = true; continue; }
        if (arm in segments) { errors.push(err('E_DUPLICATE', { file, path: ap, message: segments[arm].type === 'arm' ? `Le bras ${arm} appartient déjà à l'expérience ${segments[arm].exp}.` : `${arm} est déjà un segment : un bras porte un nom à lui.`, hint: segments[arm].type === 'arm' ? undefined : `Pour mesurer ce segment : { goal: …, segment: ${arm}, holdout: 50 }.` })); bad = true; continue; }
        acc += pct; list.push({ name: arm, upto: Math.round(acc * 100) });
        segments[arm] = { type: 'arm', exp: name, index: list.length };
        arms.push(arm);
      }
      if (bad) { for (const a of list) { delete segments[a.name]; arms.splice(arms.indexOf(a.name), 1); } continue; }
      experiments[name] = { goal: x.goal, groups: [CONTROL, ...list.map(a => a.name)], arms: list, minimum };
      continue;
    }
    if (typeof x.segment !== 'string' || !(x.segment in segments) || segments[x.segment].type === 'arm') {
      const known = Object.keys(segments).filter(n => segments[n].type !== 'arm'); const s = typeof x.segment === 'string' ? nearest(x.segment, known) : null;
      errors.push(err('E_UNKNOWN_SEGMENT', { file, path: `${path}.segment`, message: `Segment inconnu : ${x.segment}.`, expected: known, hint: s ? `Vouliez-vous dire ${s} ?` : undefined, fix: s ? { set: s } : undefined })); continue;
    }
    if (measured.has(x.segment)) { errors.push(err('E_DUPLICATE', { file, path: `${path}.segment`, message: `Le segment ${x.segment} est déjà mesuré par une autre expérience.` })); continue; }
    const holdout = x.holdout === undefined ? 50 : x.holdout;
    if (typeof holdout !== 'number' || holdout < 1 || holdout > 99) { errors.push(err('E_FORMAT', { file, path: `${path}.holdout`, message: 'holdout attend un pourcentage de 1 à 99 : la part des visiteurs du segment qui garde le contenu de base.' })); continue; }
    if (bad) continue;
    measured.add(x.segment);
    const cond = segments[x.segment];
    experiments[name] = { goal: x.goal, groups: [CONTROL, x.segment], segment: x.segment, holdout: Math.round(holdout * 100), cond, minimum };
    segments[x.segment] = { type: 'all', items: [cond, { type: 'treated', exp: name }] };
  }
  return { goals, experiments, arms };
}

/** Empreinte courte et stable (FNV-1a) : sans dépendance, identique dans Node et dans le navigateur. */
function fnv(text) { let h = 0x811c9dc5; for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(16).padStart(8, '0'); }

/**
 * Où chaque expérience agit : les sections, et les règles de page, dont une variante porte un de ses bras ou son segment mesuré.
 * Retourne { expérience: [ { page, file, route, section, component, key, kind: section | page, base, over } ] }.
 */
export function experimentUsage(spec, pages) {
  const usage = {}; const owner = {};
  for (const [name, x] of Object.entries(spec?.experiments || {})) { usage[name] = []; for (const g of x.groups.slice(1)) owner[g] = name; }
  for (const page of pages || []) {
    const d = page.data; if (!isMap(d)) continue;
    (Array.isArray(d.sections) ? d.sections : []).forEach((sec, i) => {
      if (!isMap(sec)) return; const [component] = Object.keys(sec); const props = sec[component];
      if (!isMap(props) || !isMap(props.variants)) return;
      const { variants, ...base } = props;
      for (const [key, over] of Object.entries(variants)) if (owner[key]) usage[owner[key]].push({ page: page.id, file: page.file, route: d.route, section: props.id ?? `s${i + 1}`, component, key, kind: 'section', base, over });
    });
    if (isMap(d.variants)) for (const [key, rule] of Object.entries(d.variants)) if (owner[key]) usage[owner[key]].push({ page: page.id, file: page.file, route: d.route, section: null, component: null, key, kind: 'page', base: null, over: rule });
  }
  return usage;
}

/**
 * Lie chaque expérience au contenu qu'elle mesure. sig change dès que la définition, le contenu de base ou une variante change :
 * les mesures prises sous une autre empreinte ne sont plus comptées. where liste les endroits concernés, pour le back-office.
 */
export function stampExperiments(spec, pages) {
  if (!spec?.experiments) return spec;
  const usage = experimentUsage(spec, pages);
  for (const [name, x] of Object.entries(spec.experiments)) {
    const strip = b => { if (!b) return b; const { id, _route, ...rest } = b; return rest; };
    x.sig = fnv(JSON.stringify([x.goal, spec.goals[x.goal], x.arms || null, x.segment || null, x.holdout || null, x.cond || null, usage[name].map(u => [u.page, u.section, u.component, u.key, strip(u.base), u.over])]));
    x.where = [...new Set(usage[name].map(u => u.kind === 'page' ? `${u.route} (ordre des sections)` : `${u.route}#${u.section}`))];
  }
  return spec;
}
