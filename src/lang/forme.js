// Bloc « forme » d'un composant : la structure de la section en primitives françaises, compilée vers le gabarit neutre.
//
//   forme:
//     - en-tête: titre, intro
//     - grille de avis, 3 colonnes:
//         - carte « avis-carte »:
//             - étoiles: note
//             - citation: texte
//             - signature: auteur, ville
//
// Chaque primitive a un balisage fixe (accessibilité et classes maison comprises) ; une donnée facultative entoure son élément
// d'une condition ; un nom entre « » devient la classe de l'élément. Les noms sans préfixe se cherchent d'abord dans l'élément
// courant d'une liste, puis dans les données du composant. Une valeur « {{ … }} » est une expression du langage, telle quelle.
import { cssPrefixes } from './css-lint.js';
import { tokenize } from './expr.js';
import { lex } from './template.js';
import { behaviorsUsedIn } from './behaviors.js';
import { compileApparence } from './apparence.js';

export const slug = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// Primitives : nature (feuille, conteneur, collection, section), du plus long au plus court pour la reconnaissance.
export const PRIMITIVES = {
  'liste numérotée': 'collection', 'titre principal': 'leaf', 'texte discret': 'leaf', 'grand titre': 'leaf', 'bouton discret': 'leaf', 'sous-titre': 'leaf',
  'en-tête': 'leaf', 'légende': 'leaf', 'figure': 'container', 'sinon': 'container', 'titre': 'leaf', 'texte': 'leaf', 'paragraphes': 'leaf', 'citation': 'leaf', 'icône': 'leaf', 'bouton': 'leaf', 'lien': 'leaf',
  'étoiles': 'leaf', 'signature': 'leaf', 'date': 'leaf', 'numéro': 'leaf', 'image': 'leaf', 'prix': 'leaf', 'badge': 'leaf', 'champ': 'leaf',
  'portrait': 'leaf', 'copier': 'leaf', 'repli': 'container', 'filtres': 'collection',
  'bloc': 'both', 'carte': 'container', 'témoignage': 'container', 'élément': 'container', 'si': 'container', 'formulaire': 'container',
  'grille': 'collection', 'liste': 'collection', 'rangée': 'collection', 'défilement': 'collection', 'onglets': 'collection', 'accordéon': 'collection',
};
const NAMES = Object.keys(PRIMITIVES).sort((a, b) => b.length - a.length);
/** Mots réservés par la forme : ni primitive ni mot de vocabulaire ne peut les porter. */
export const RESERVED_WORDS = ['section', 'bandeau', 'contenu', 'valeur', 'rien', 'oui', 'non'];
export const COLLECTION_PRIMITIVES = Object.keys(PRIMITIVES).filter(k => PRIMITIVES[k] === 'collection');
export const PRIMITIVE_HELP = {
  'en-tête': 'titre (h2) et intro de la section : « en-tête: titre, intro »', titre: 'titre (h2 dans la section, h3 dans un élément de liste)', 'titre principal': 'titre h1, un seul par page (bandeau d\'ouverture)', 'grand titre': 'titre h2', 'sous-titre': 'titre h3',
  figure: 'figure : une image et sa légende, « figure « vignette »: » puis les éléments', légende: 'légende d\'une figure', sinon: 'l\'autre branche, juste après un « si … : »',
  texte: 'paragraphe', 'texte discret': 'paragraphe en couleur discrète', paragraphes: 'texte long : paragraphes, listes « - », **gras**', citation: 'citation entre guillemets « »',
  icône: 'pictogramme', bouton: 'lien en bouton', 'bouton discret': 'lien en bouton secondaire', lien: 'lien simple', étoiles: 'note en étoiles sur 5', signature: 'auteur en gras, puis précision discrète',
  date: 'date (option : en toutes lettres)', numéro: 'numéro de l\'élément dans la liste', image: 'image (srcset, chargement différé) : « image: photo, légende » (option : agrandissable, ouvre l\'image en plein écran au clic)',
  portrait: 'photo ronde, ou initiale du nom sans photo : « portrait: photo, nom »', copier: 'bouton qui copie une donnée dans le presse-papiers : « copier, libellé « Copier le code »: code »',
  repli: 'zone repliable : « repli, libellé « En savoir plus »: » puis les éléments (options : libellé <donnée> ou « texte », ouvert)',
  filtres: 'grille filtrable par boutons : « filtres de items, selon category, 3 colonnes » (option : tout « Toutes »)', prix: 'prix formaté', badge: 'étiquette', champ: 'champ du formulaire déclaré',
  bloc: 'boîte (avec une donnée : son texte ; avec des éléments en dessous : un regroupement)', carte: 'carte (fond, bordure, coins)', témoignage: 'carte de citation', élément: 'élément de liste', si: 'condition : « si lien: » puis les éléments (« si a ou b: », « si a et b: »)',
  formulaire: 'formulaire déclaré dans fonctionnement (option : bouton Envoyer) ; sans éléments en dessous, tous les champs dans l\'ordre', grille: 'grille de cartes : « grille de items, 3 colonnes »', liste: 'liste à puces', 'liste numérotée': 'liste numérotée', rangée: 'rangée',
  défilement: 'carrousel : « défilement de avis, automatique » (option : sans flèches)', onglets: 'onglets : « onglets de formules, libellé nom »', accordéon: 'questions repliables : « accordéon de items, question q, réponse a »',
};

export function nearest(w, list) { let best = null, bd = Infinity; for (const c of list) { const d = lev(w, c); if (d < bd) { bd = d; best = c; } } return bd <= Math.max(2, Math.floor(w.length / 3)) ? best : null; }
function lev(a, b) { const d = Array.from({ length: a.length + 1 }, (_, i) => [i]); for (let j = 1; j <= b.length; j++) d[0][j] = j; for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); return d[a.length][b.length]; }

/** Découpe aux virgules, sauf dans un texte entre « » et dans une expression {{ … }}. */
export function splitOutside(text) {
  const out = [], s = String(text); let cur = '', depth = 0, expr = 0;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === '«') depth++; else if (ch === '»') depth = Math.max(0, depth - 1);
    else if (ch === '{' && s[i + 1] === '{') expr++; else if (ch === '}' && s[i + 1] === '}') expr = Math.max(0, expr - 1);
    if (ch === ',' && !depth && !expr) { out.push(cur); cur = ''; } else cur += ch;
  }
  out.push(cur);
  return out.map(x => x.trim()).filter(Boolean);
}

const namesCache = new WeakMap();
/** Primitives et mots du vocabulaire, du plus long au plus court : « carte de visite » se lit avant « carte ». */
function namesWith(words) {
  if (!words || !words.size) return NAMES;
  if (!namesCache.has(words)) namesCache.set(words, [...NAMES, ...words.keys()].sort((a, b) => b.length - a.length));
  return namesCache.get(words);
}

/** Analyse « primitive [« classe »] [de liaison | liaison] [, options…] » ; words : mots du vocabulaire (Map), reconnus comme des primitives. */
export function parseHeader(text, words = null) {
  const s = String(text).trim();
  const low = s.toLowerCase();
  const prim = namesWith(words).find(n => low === n || low.startsWith(n + ' ') || low.startsWith(n + ',') || low.startsWith(n + '«') || low.startsWith(n + ' «'));
  if (!prim) return { prim: null, word: low.split(/[\s,«]/)[0] };
  let rest = s.slice(prim.length).trim();
  let cls = null;
  const m = /^«\s*([^»]+?)\s*»/.exec(rest);
  if (m) { cls = m[1].trim(); rest = rest.slice(m[0].length).trim(); }
  let of = null;
  const parts = splitOutside(rest);
  if (!(prim in PRIMITIVES)) return { prim, isWord: true, cls, of: null, options: parts };
  if (parts.length && /^de\s+/i.test(parts[0])) of = parts.shift().replace(/^de\s+/i, '').trim();
  else if ((prim === 'si') && parts.length) of = parts.shift();
  return { prim, cls, of, options: parts };
}

/**
 * Compile un bloc forme. opts : { name, props (schéma JSON), want (Set de primitives ou classes que l'apparence vise), effects }.
 * Renvoie { template, behaviors, parts (Map nom → sélecteur), errors: [{ path, message, ref }], sectionClass, css }.
 */
export function compileForme(forme, { name, props, want: want0 = new Set(), effects = null, words: words0 = null, computed = null }) {
  const errors = [], behaviors = new Set(), baseCss = new Set(), wordsCss = new Map(), usedWords = new Set();
  let incomplete = false; // un mot employé est en erreur dans son vocabulaire : la forme n'est pas entière
  // parts, want, base, frames et words changent le temps d'un mot du vocabulaire (portée lexicale), puis reviennent.
  let parts = new Map(), want = want0, words = words0 || new Map();
  let base = cssPrefixes(name)[0];
  let secCls = name.includes('.') ? cssPrefixes(name)[0] : name;
  const secClsOf = () => secCls;
  // Chaque erreur garde l'élément de forme en cours (ref), pour retrouver sa ligne dans le manifeste ; dans un mot, ref reste
  // l'appel (ligne du manifeste) et inner désigne l'élément fautif de la définition (ligne du vocabulaire).
  let curRef = forme, innerRef = null;
  const wordStack = []; let wordSeq = 0;
  const fail = (path, message) => { const top = wordStack[wordStack.length - 1]; errors.push({ path, message: top ? `dans le mot « ${top.word.name} » : ${message}` : message, raw: message, ref: curRef, inner: top ? innerRef : null }); };
  const NO_FORM = 'exige un formulaire déclaré : bloc « fonctionnement: formulaire: » dans le manifeste';
  const fieldNames = () => (effects?.form?.fields || []).map(x => (typeof x === 'string' ? x : x?.name)).filter(Boolean);
  let iterDepth = 0;
  // Cadres de noms : { v, schema } (données du composant, élément d'une liste) ou { alias: Map } (données reçues par un mot).
  let frames = [{ v: 'p', schema: props }];
  if (computed) frames.unshift({ alias: computed });
  const gridStack = [];
  const q = x => "'" + String(x).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
  const ABSENT = schema => ({ expr: 'null', required: false, schema, absent: true });
  /** Cherche un nom court : l'élément courant d'abord, puis les données ; dans un mot, ses seules données. */
  const lookup = (n) => {
    for (let i = frames.length - 1; i >= 0; i--) {
      const f = frames[i];
      if (f.alias) { if (f.alias.has(n)) return f.alias.get(n); continue; }
      const s = f.schema?.properties?.[n];
      if (s) return s._absent ? ABSENT(s) : { expr: `${f.v}.${n}`, required: (f.schema.required || []).includes(n), schema: s, simple: true };
    }
    return null;
  };
  const knownNames = () => [...new Set(frames.flatMap(f => (f.alias ? [...f.alias.keys()] : Object.keys(f.schema?.properties || {}))))];
  const inLoop = () => !!frames[frames.length - 1].loop;

  const GLOBALS = new Set(['p', 'site', 'page', 'loop', 'form', 'item', 'product', 'order', 'true', 'false', 'null', 'and', 'or', 'not', 'in']);
  /** Réécrit les noms courts d'une expression ({{ title | default(label) }}) vers l'élément courant ou les données. */
  const rewrite = (src, path) => {
    let toks; try { toks = tokenize(src); } catch (e) { fail(path, `expression invalide « ${src} » : ${e.message}`); return src; }
    let out = '', last = 0;
    toks.forEach((t, i) => {
      if (t.type !== 'id') return;
      const prev = toks[i - 1], next = toks[i + 1];
      if (prev && prev.type === 'op' && (prev.value === '.' || prev.value === '|')) return;
      if (next && next.type === 'op' && next.value === '(') return;
      if (t.value === 'p' && wordStack.length) { fail(path, `« p » dans « ${src} » : un mot ne lit pas les données du composant, déclarez une donnée du mot`); return; }
      if (GLOBALS.has(t.value) || /^it\d+$/.test(t.value)) return;
      const b = lookup(t.value);
      if (b) { out += src.slice(last, t.pos) + b.expr; last = t.pos + t.value.length; return; }
      fail(path, `« ${t.value} » dans « ${src} » n'est pas une donnée`);
    });
    return out + src.slice(last);
  };
  /** Texte littéral avec des données : « Réponse sous {{ delai }}. » ; facultatives → condition sur l'ensemble. */
  // Le texte devient une seule expression passée à markup() : échappement, puis balisage léger (**gras**, *italique*, [texte](lien)).
  const literal = (text, path) => {
    const conds = [], pieces = []; let last = 0; const re = /\{\{([\s\S]+?)\}\}/g; let m;
    while ((m = re.exec(text))) {
      if (m.index > last) pieces.push(q(text.slice(last, m.index)));
      const inner = m[1].trim();
      if (/^[a-z_][a-z0-9_]*$/.test(inner)) { const r = resolve(inner, path); if (!r) return null; if (!r.required) conds.push(r.expr); pieces.push(`(${r.expr})`); }
      else pieces.push(`(${rewrite(inner, path)})`);
      last = m.index + m[0].length;
    }
    if (last < text.length) pieces.push(q(text.slice(last)));
    return { html: `{{ markup(${pieces.join(' ~ ') || "''"}) }}`, cond: conds.length ? conds.join(' and ') : null };
  };
  const resolve = (name0, path) => {
    const t = String(name0).trim();
    if (/^\{\{[\s\S]*\}\}$/.test(t)) { const inner = t.slice(2, -2).trim(); if (/^[a-z_][a-z0-9_]*$/.test(inner)) return resolve(inner, path); return { expr: rewrite(inner, path), required: false, schema: null }; }
    if (t === 'valeur' && inLoop()) return { expr: frames[frames.length - 1].v, required: true, schema: frames[frames.length - 1].self, simple: true };
    const path0 = t.split('.');
    if (!/^[a-z_][a-z0-9_]*(\.[a-z_][a-z0-9_]*)*$/.test(t)) { fail(path, `« ${t} » n'est pas un nom de donnée`); return null; }
    const b = lookup(path0[0]);
    if (b) {
      if (path0.length === 1) return { ...b };
      if (b.absent) return ABSENT(null);
      if (!b.simple) { fail(path, `« ${t} » : « ${path0[0]} » est ici un texte ou une expression, on n'y lit pas « ${path0.slice(1).join('.')} »`); return null; }
      let sch = b.schema, req = b.required;
      for (const k of path0.slice(1)) {
        const parent = sch;
        // Un lien se lit par ses deux champs.
        sch = /\/link$/.test(parent?.$ref || '') && (k === 'label' || k === 'to') ? { type: 'string' } : parent?.properties?.[k];
        req = req && (/\/link$/.test(parent?.$ref || '') || (parent?.required || []).includes(k));
        if (!sch) { fail(path, `« ${t} » : ${k} n'existe pas dans ${path0[0]}`); return null; }
        if (sch._absent) return ABSENT(sch);
      }
      return { expr: `${b.expr}.${path0.slice(1).join('.')}`, required: req, schema: sch, simple: true };
    }
    const known = knownNames();
    const s2 = nearest(t, known);
    const where = wordStack.length ? ` du mot « ${wordStack[wordStack.length - 1].word.name} »` : inLoop() ? ' de l\'élément ni du composant' : ' du composant';
    fail(path, `« ${t} » n'est pas une donnée${where} (connues : ${known.join(', ')})${s2 ? ` ; vouliez-vous dire « ${s2} » ?` : ''}`);
    return null;
  };
  const classOf = (h, fallback = null) => {
    const own = h.cls || ((want.has(h.prim) || want.has(slug(h.prim))) ? `${base}-${slug(h.prim)}` : fallback);
    if (own) { parts.set(h.cls || h.prim, '.' + own); if (h.cls) parts.set(slug(h.prim), parts.get(slug(h.prim)) || '.' + own); }
    return own;
  };
  const attr = (...cl) => { const c = cl.filter(Boolean).join(' '); return c ? ` class="${c}"` : ''; };
  // Une donnée facultative entoure son élément d'une condition ; une donnée qu'un mot n'a pas reçue ne produit rien.
  const iff = (r, html) => (r && r.absent ? '' : r && !r.required ? `{% if ${r.expr} %}${html}{% endif %}` : html);
  const out = e => `{{ ${e} }}`;
  /** « variante X par défaut V » sur un élément nommé : une classe de plus, « classe-valeur ». Retire l'option de l'en-tête. */
  const variantOf = (h, p) => {
    let found = null;
    h.options = (h.options || []).filter(o => { const m = /^variante\s+([a-z_][a-z0-9_.]*)\s+par défaut\s+([a-z0-9-]+)$/i.exec(o); if (m && !found) { found = m; return false; } return true; });
    if (!found) return c => c;
    if (!h.cls) { fail(p, `« variante ${found[1]} » exige un nom : « ${h.prim} « nom », variante ${found[1]} par défaut ${found[2]} »`); return c => c; }
    const r = resolve(found[1], p);
    return c => (r && !r.absent ? `${c} ${c}-{{ ${r.expr} | default(${/^\d+$/.test(found[2]) ? found[2] : q(found[2])}) }}` : `${c} ${c}-${found[2]}`);
  };

  const leaf = (h, value, path) => {
    const sv = typeof value === 'string' ? value.trim() : null;
    // « champ » nomme un champ du formulaire déclaré, pas une donnée du composant.
    if (h.prim === 'champ') {
      const f = String(value || '').trim();
      if (!effects?.form) { fail(path, `« champ » ${NO_FORM}`); return ''; }
      const names = fieldNames();
      if (!names.includes(f)) { const s = nearest(f, names); fail(path, `champ inconnu « ${f} » (déclarés : ${names.join(', ')})${s ? ` ; vouliez-vous dire « ${s} » ?` : ''}`); return ''; }
      return out(`field('${f}')`);
    }
    const TEXT_PRIMS = { 'texte': 'p', 'texte discret': 'p', 'titre': null, 'titre principal': 'h1', 'grand titre': 'h2', 'sous-titre': 'h3', 'citation': 'p', 'bloc': 'div', 'légende': 'figcaption' };
    if (sv !== null && h.prim in TEXT_PRIMS && (/^«[\s\S]*»$/.test(sv) || (sv.includes('{{') && !/^\{\{[^{}]*\}\}$/.test(sv)))) {
      const lit = literal(/^«[\s\S]*»$/.test(sv) ? sv.slice(1, -1).trim() : sv, path);
      if (!lit) return '';
      const c = classOf(h);
      const tag = TEXT_PRIMS[h.prim] || (iterDepth ? 'h3' : 'h2');
      const cls = h.prim === 'texte discret' ? attr('muted', c) : attr(c);
      const inner = h.prim === 'citation' ? `« ${lit.html} »` : lit.html;
      const html = `<${tag}${cls}>${inner}</${tag}>`;
      return lit.cond ? `{% if ${lit.cond} %}${html}{% endif %}` : html;
    }
    const items = typeof value === 'string' || typeof value === 'number' ? splitOutside(value) : [];
    const binds = [], opts = [...(h.options || [])];
    for (const it of items) {
      if (/^\{\{/.test(it) || /^[a-z_][a-z0-9_.]*$/.test(it)) { const known = !!lookup(it.split('.')[0]) || /^\{\{/.test(it) || (it === 'valeur' && inLoop()); if (known || !binds.length) { binds.push(it); continue; } }
      opts.push(it);
    }
    const r = binds.map((b, i) => resolve(b, `${path}[${i}]`));
    if (r.some(x => x === null)) return '';
    // Seule « date » a des options ; ailleurs, un mot non reconnu est une erreur, jamais une option ignorée.
    const LEAF_OPTS = { date: [/^en toutes lettres$/i, /^mois et ann[ée]e$/i], signature: [/^en toutes lettres$/i], image: [/^agrandissable$/i], copier: [/^libellé\s+«[^«»]+»$/i] };
    for (const o of opts) if (!(LEAF_OPTS[h.prim] || []).some(re => re.test(o))) { const s = nearest(o, knownNames()); fail(path, `« ${o} » n'est ni une donnée${wordStack.length ? ' du mot' : inLoop() ? ' de l\'élément ou du composant' : ' du composant'} ni une option de « ${h.prim} »${s ? ` ; vouliez-vous dire « ${s} » ?` : ''}`); return ''; }
    const need = (n) => { if (r.length < n) { fail(path, `« ${h.prim} » attend ${n === 1 ? 'une donnée' : `${n} données`} : ${PRIMITIVE_HELP[h.prim] || ''}`); return false; } return true; };
    const c = classOf(h);
    switch (h.prim) {
      case 'en-tête': {
        if (!need(1)) return '';
        const [t, i] = r; const cc = classOf(h);
        const inner = iff(t, `<h2>${out(t.expr)}</h2>`) + (i ? iff(i, `<p>${out(i.expr)}</p>`) : '');
        const wrap = `<div${attr('section-head', cc)}>${inner}</div>`;
        const allOpt = r.every(x => !x.required);
        return allOpt ? `{% if ${r.map(x => x.expr).join(' or ')} %}${r.length === 1 ? `<div${attr('section-head', cc)}><h2>${out(t.expr)}</h2></div>` : wrap}{% endif %}` : wrap;
      }
      case 'titre': case 'titre principal': case 'grand titre': case 'sous-titre': { if (!need(1)) return ''; const tag = h.prim === 'titre principal' ? 'h1' : h.prim === 'grand titre' ? 'h2' : h.prim === 'sous-titre' ? 'h3' : (iterDepth ? 'h3' : 'h2'); return iff(r[0], `<${tag}${attr(c)}>${out(r[0].expr)}</${tag}>`); }
      case 'légende': if (!need(1)) return ''; return iff(r[0], `<figcaption${attr(c)}>${out(r[0].expr)}</figcaption>`);
      case 'texte': if (!need(1)) return ''; return iff(r[0], `<p${attr(c)}>${out(r[0].expr)}</p>`);
      case 'texte discret': if (!need(1)) return ''; return iff(r[0], `<p${attr('muted', c)}>${out(r[0].expr)}</p>`);
      case 'paragraphes': if (!need(1)) return ''; return iff(r[0], c ? `<div${attr(c)}>${out(`paragraphs(${r[0].expr})`)}</div>` : out(`paragraphs(${r[0].expr})`));
      case 'citation': if (!need(1)) return ''; return iff(r[0], `<p${attr(c)}>« ${out(r[0].expr)} »</p>`);
      case 'icône': if (!need(1)) return ''; return iff(r[0], `<div${attr(c)}>${out(`icon(${r[0].expr})`)}</div>`);
      case 'bouton': if (!need(1)) return ''; return iff(r[0], out(`link(${r[0].expr}, '${['btn', c].filter(Boolean).join(' ')}')`));
      case 'bouton discret': if (!need(1)) return ''; return iff(r[0], out(`link(${r[0].expr}, '${['btn btn-outline', c].filter(Boolean).join(' ')}')`));
      case 'lien': if (!need(1)) return ''; return iff(r[0], out(`link(${r[0].expr}, '${c || ''}')`));
      case 'étoiles': { if (!need(1)) return ''; const x = r[0].expr; return iff(r[0], `<div${attr('stars', c)} aria-label="${out(`${x} | int`)} sur 5">${out(`'★' | repeat(${x} | int)`)}${out(`'☆' | repeat(5 - (${x} | int))`)}</div>`); }
      case 'signature': { if (!need(1)) return ''; const [a, b] = r; const be = b && opts.some(o => /toutes lettres/i.test(o)) ? `${b.expr} | date('j F Y')` : b?.expr; return iff(a, `<footer${attr(c)}><strong>${out(a.expr)}</strong>${b ? iff(b, ` <span class="muted">· ${out(be)}</span>`) : ''}</footer>`); }
      case 'date': { if (!need(1)) return ''; const lettres = opts.some(o => /toutes lettres/i.test(o)), moisAn = opts.some(o => /mois et ann[ée]e/i.test(o)); const e = lettres ? `${r[0].expr} | date('j F Y')` : moisAn ? `${r[0].expr} | date('F Y') | capitalize` : r[0].expr; return iff(r[0], `<time${attr(c)}>${out(e)}</time>`); }
      case 'numéro': return `<span${attr(c)} aria-hidden="true">${out('loop.index')}</span>`;
      case 'image': { if (!need(1)) return ''; const alt = r[1] && !r[1].absent ? r[1].expr : "''";
        // Largeur annoncée au navigateur : celle d'une colonne de la grille qui contient l'image (un tiers par défaut dans une liste, la moitié sinon).
        const g = gridStack[gridStack.length - 1];
        const sizes = g && g.expr ? `'(max-width: 700px) 100vw, ' ~ ((100 / (${g.expr})) | round) ~ 'vw'` : `'(max-width: 700px) 100vw, ${g ? Math.round(100 / g.n) : iterDepth ? 33 : 50}vw'`;
        let im = out(`img(${r[0].expr}, ${alt}, ${sizes})`);
        // « agrandissable » : l'image devient un lien vers sa grande version, ouvert en plein écran par le comportement lightbox.
        if (opts.some(o => /^agrandissable$/i.test(o))) { behaviors.add('lightbox'); baseCss.add(`.${secClsOf()} a[data-sl-lightbox]{display:block;cursor:zoom-in;margin-bottom:12px}`); im = `<a href="${out(`img_src(${r[0].expr}, 1600)`)}" data-sl-lightbox>${im}</a>`; }
        return iff(r[0], c ? `<div${attr(c)}>${im}</div>` : im);
      }
      case 'portrait': {
        if (!need(2)) return '';
        const [ph, nm] = r; const w = c || `${base}-portrait`; parts.set('portrait', '.' + w);
        // La photo remplit un rond ; sans photo, le même rond porte l'initiale du nom sur la couleur principale.
        baseCss.add(`.${secClsOf()} .${w}{width:120px;height:120px;border-radius:50%;overflow:hidden;margin:0 auto 14px}
.${secClsOf()} .${w} img{width:100%;height:100%;object-fit:cover}
.${secClsOf()} .${w}-initiale{display:flex;align-items:center;justify-content:center;background:var(--color-primary);color:var(--color-primary-fg);font-size:2.5rem;font-family:var(--font-heading)}`);
        const photo = `<div class="${w}">${out(`img(${ph.expr}, ${nm.expr}, '120px')`)}</div>`;
        const initial = `<div class="${w} ${w}-initiale" aria-hidden="true">${out(`${nm.expr} | trim | first | upper`)}</div>`;
        return ph.required ? photo : `{% if ${ph.expr} %}${photo}{% else %}${initial}{% endif %}`;
      }
      case 'copier': {
        if (!need(1)) return '';
        behaviors.add('copy');
        const lo = opts.map(o => /^libellé\s+«\s*([^«»]+?)\s*»$/i.exec(o)).find(Boolean);
        const label = (lo ? lo[1] : 'Copier').replace(/[<>{}]/g, '');
        return iff(r[0], `<button type="button"${attr('btn btn-outline', c)} data-sl-copy="${out(r[0].expr)}">${label}</button>`);
      }
      case 'prix': if (!need(1)) return ''; return iff(r[0], `<span${attr(c || `${base}-prix`)}>${out(`${r[0].expr} | price`)}</span>`);
      case 'badge': if (!need(1)) return ''; return iff(r[0], `<span${attr('badge', c)}>${out(r[0].expr)}</span>`);
      case 'bloc': if (!need(1)) return ''; return iff(r[0], `<div${attr(c)}>${out(r[0].expr)}</div>`);
    }
    return '';
  };

  const nodes = (list, path) => {
    if (!Array.isArray(list)) { fail(path, 'attendu : une liste d\'éléments (« - primitive: … »)'); return ''; }
    const saved = curRef, savedInner = innerRef;
    const keyOf = n => (typeof n === 'string' ? n : n && typeof n === 'object' && !Array.isArray(n) ? Object.keys(n)[0] || '' : '').trim();
    const html = [];
    list.forEach((n, i) => {
      // Dans la définition d'un mot, l'erreur garde l'appel comme repère et l'élément fautif à part.
      if (wordStack.length) innerRef = { in: list, at: i }; else curRef = { in: list, at: i };
      if (/^sinon$/i.test(keyOf(n)) && n && typeof n === 'object') {
        // « sinon: » complète le « si … : » qui le précède : même condition, l'autre branche.
        const p = `${path}[${i}] sinon`;
        if (i === 0 || !/^si\s/i.test(keyOf(list[i - 1]))) { fail(p, '« sinon: » suit immédiatement un « si … : »'); return; }
        const body = nodes(n[Object.keys(n)[0]], p);
        const k = html.length - 1;
        if (k >= 0 && html[k].endsWith('{% endif %}')) html[k] = `${html[k].slice(0, -'{% endif %}'.length)}{% else %}${body}{% endif %}`;
        return;
      }
      html.push(node(n, `${path}[${i}]`));
    });
    curRef = saved; innerRef = savedInner;
    return html.join('\n');
  };

  // ——— Mots du vocabulaire : un mot s'emploie comme une primitive, ses données lui sont passées dans l'ordre de sa définition.
  const catOf = s => (!s ? null : s.type === 'array' ? 'liste' : /\/link$/.test(s.$ref || '') ? 'lien' : s.type === 'object' ? 'groupe' : 'valeur');
  const CAT = { liste: 'une liste', lien: 'un lien', groupe: 'un groupe', valeur: 'une valeur simple (texte, nombre, image…)' };
  /** Compare ce qu'un mot déclare et ce qu'il reçoit ; renvoie le schéma vu dans le mot (structure déclarée, obligation de l'appelant), ou null. */
  const conform = (decl, actual, label, p) => {
    if (!actual || !decl) return decl || actual || {};
    const cd = catOf(decl), ca = catOf(actual);
    if (cd !== ca) { fail(p, `${label} : attendu ${CAT[cd]}, reçu ${CAT[ca]}`); return null; }
    if (cd === 'liste') { if (!decl.items) return actual; if (!actual.items) return decl; const it = conform(decl.items, actual.items, `${label}, élément`, p); return it ? { ...actual, items: it } : null; }
    if (cd !== 'groupe' || !decl.properties) return actual;
    const properties = {};
    for (const [k, s] of Object.entries(decl.properties)) {
      const a = actual.properties?.[k];
      if (!a) {
        if ((decl.required || []).includes(k)) { fail(p, `${label} : le champ « ${k} » manque (champs reçus : ${Object.keys(actual.properties || {}).join(', ') || 'aucun'})`); return null; }
        properties[k] = { ...s, _absent: true }; continue;
      }
      const sub = conform(s, a, `${label}, champ « ${k} »`, p); if (!sub) return null;
      properties[k] = sub;
    }
    return { type: 'object', properties, required: (actual.required || []).filter(k => k in properties) };
  };
  const callWord = (h, value, p) => {
    const w = words.get(h.prim);
    usedWords.add(h.prim);
    // Mot dont la définition est en erreur : dite une fois, à sa ligne dans le vocabulaire ; ici on passe.
    if (w.broken) { incomplete = true; return ''; }
    const isList = Array.isArray(value), none = value === null || value === undefined;
    const sig = `« ${h.prim}${w.params.length ? (w.container ? ', ' : ': ') + w.params.map(x => x.name).join(', ') : ''}${w.container ? ':' : ''} »`;
    if (h.cls) { fail(p, `le mot « ${h.prim} » ne prend pas de nom entre « » : ses classes viennent de sa définition`); return ''; }
    if (wordStack.some(s => s.word === w)) { fail(p, `le mot « ${h.prim} » s'emploie lui-même`); return ''; }
    if (w.container && !isList && !none) { fail(p, `« ${h.prim} » contient des éléments : ${sig} puis la liste en dessous`); return ''; }
    if (!w.container && isList) { fail(p, `« ${h.prim} » ne contient pas d'éléments (sa définition n'emploie pas « contenu ») : ${sig}`); return ''; }
    const args = [...h.options, ...(w.container || none ? [] : splitOutside(String(value)))];
    if (args.length > w.params.length) { fail(p, `« ${h.prim} » reçoit ${args.length} données pour ${w.params.length} déclarée${w.params.length > 1 ? 's' : ''} : ${sig}`); return ''; }
    const bindings = new Map(), guards = [];
    let ok = true, skip = false;
    w.params.forEach((prm, i) => {
      const a = args[i], label = `« ${h.prim} », donnée « ${prm.name} »`;
      const absent = () => { bindings.set(prm.name, ABSENT(prm.schema)); };
      if (a === undefined || /^rien$/i.test(a)) { if (prm.required) { fail(p, `« ${h.prim} » : la donnée « ${prm.name} » est obligatoire (${sig})`); ok = false; } return absent(); }
      let b;
      if (/^«[\s\S]*»$/.test(a)) b = { expr: q(a.slice(1, -1).trim()), required: true, schema: { type: 'string' } };
      else if (/^-?\d+(\.\d+)?$/.test(a)) b = { expr: a, required: true, schema: { type: 'number' } };
      else if (/^(oui|non)$/i.test(a) && !lookup(a.toLowerCase())) b = { expr: /^oui$/i.test(a) ? 'true' : 'false', required: true, schema: { type: 'boolean' } };
      else {
        const r = resolve(a, p);
        if (!r) { ok = false; return absent(); }
        if (r.absent) { if (prm.required) skip = true; return absent(); }
        // Une expression est mise entre parenthèses une fois, pour se combiner sans surprise dans la définition du mot.
        b = r.simple || /^\(/.test(r.expr) || /^('([^'\\]|\\.)*'|-?[\d.]+|true|false)$/.test(r.expr) ? r : { ...r, expr: `(${r.expr})` };
      }
      const sch = conform(prm.schema, b.schema, label, p);
      if (!sch) { ok = false; return absent(); }
      b = { ...b, schema: sch };
      // Obligatoire pour le mot, facultative chez l'appelant : le mot entier n'apparaît que si la donnée est là.
      if (prm.required && !b.required) { guards.push(b.expr); b.required = true; }
      bindings.set(prm.name, b);
    });
    if (!ok || skip) return '';
    if (w.feuille) wordsCss.set(w.id, { name: w.name, css: String(w.feuille).trim() });
    const html = w.kind === 'gabarit' ? expandGabarit(w, bindings, w.container ? nodes(value || [], p) : '', p) : expandForme(w, bindings, value || [], p);
    return guards.length ? `{% if ${guards.join(' and ')} %}${html}{% endif %}` : html;
  };
  /** Mot défini par une forme : ses éléments sont compilés avec ses seules données, puis rendus à l'appelant. */
  const expandForme = (w, bindings, children, p) => {
    const ctx = { frames, words, parts, want, base };
    wordStack.push({ word: w, children, ctx, path: p });
    frames = [{ alias: bindings }]; words = w.scope || new Map(); parts = new Map(); want = w.want || new Set(); base = slug(w.shortName || w.name);
    const html = nodes(w.forme, `mot « ${w.name} »`);
    const local = parts;
    if (w.apparence) {
      const r = compileApparence(w.apparence, { parts: local, sectionClass: secCls });
      for (const e of r.errors) fail(p, `apparence : ${e.message}`);
      if (r.css) baseCss.add(r.css.trim());
    }
    wordStack.pop();
    ({ frames, words, parts, want, base } = ctx);
    for (const [k, v] of local) if (!parts.has(k)) parts.set(k, v);
    return html;
  };
  /** « contenu », dans la forme d'un mot : les éléments écrits sous l'appel, compilés avec les données de l'appelant. */
  const contenu = (path) => {
    const top = wordStack[wordStack.length - 1];
    if (!top) { fail(path, '« contenu » ne s\'emploie que dans la définition d\'un mot du vocabulaire'); return ''; }
    const here = { frames, words, parts, want, base };
    wordStack.pop();
    ({ frames, words, parts, want, base } = top.ctx);
    const html = nodes(top.children, top.path);
    ({ frames, words, parts, want, base } = here);
    wordStack.push(top);
    return html;
  };
  const WORD_GLOBALS = new Set(['site', 'page', 'loop', 'true', 'false', 'null', 'and', 'or', 'not', 'in']);
  /** Mot défini par un fragment de gabarit neutre : ses données y sont remplacées par ce que l'appelant passe, ses variables renommées. */
  const expandGabarit = (w, bindings, inner, p) => {
    const n = ++wordSeq;
    const scopes = [new Map()];
    const local = nm => { for (let i = scopes.length - 1; i >= 0; i--) if (scopes[i].has(nm)) return scopes[i].get(nm); return null; };
    const bad = (line, message) => { const top = { word: w }; wordStack.push(top); innerRef = { in: w.def, at: 'gabarit' }; fail(p, `gabarit, ligne ${line} : ${message}`); wordStack.pop(); };
    const declare = (nm, line) => { if (bindings.has(nm) || WORD_GLOBALS.has(nm) || nm === 'p' || nm === 'contenu') { bad(line, `la variable « ${nm} » porte le nom d'une donnée du mot ou un nom réservé`); return nm; } const r = `w${n}_${nm}`; scopes[scopes.length - 1].set(nm, r); return r; };
    const rw = (src, line) => {
      let toks; try { toks = tokenize(src); } catch (e) { bad(line, `expression invalide « ${src} » : ${e.message}`); return src; }
      let out = '', last = 0;
      toks.forEach((t, i) => {
        if (t.type !== 'id') return;
        const prev = toks[i - 1], next = toks[i + 1];
        if (prev && prev.type === 'op' && (prev.value === '.' || prev.value === '|')) return;
        if (next && next.type === 'op' && next.value === '(') return;
        const l = local(t.value), b = l ? null : bindings.get(t.value);
        if (l || b) { out += src.slice(last, t.pos) + (l || b.expr); last = t.pos + t.value.length; return; }
        if (WORD_GLOBALS.has(t.value)) return;
        if (t.value === 'p') return bad(line, 'un mot ne lit pas les données du composant (p) : déclarez une donnée du mot');
        bad(line, `« ${t.value} » n'est ni une donnée du mot (${[...bindings.keys()].join(', ') || 'aucune'}) ni une variable du gabarit`);
      });
      return out + src.slice(last);
    };
    let html = '';
    for (const t of lex(w.gabarit)) {
      if (t.k === 'text') { html += t.v; continue; }
      if (t.k === 'out') { html += t.v === 'contenu' ? inner : `{{ ${rw(t.v, t.line)} }}`; continue; }
      const m = /^([a-z]+)\s*([\s\S]*)$/i.exec(t.v) || [];
      const kw = (m[1] || '').toLowerCase(), rest = (m[2] || '').trim();
      if (kw === 'if' || kw === 'elif' || kw === 'elseif') html += `{% ${kw} ${rw(rest, t.line)} %}`;
      else if (kw === 'else' || kw === 'endif') html += `{% ${kw} %}`;
      else if (kw === 'for') {
        const fm = /^([a-z_][a-z0-9_]*)\s*(?:,\s*([a-z_][a-z0-9_]*))?\s+in\s+([\s\S]+)$/i.exec(rest);
        if (!fm) { bad(t.line, `« {% ${t.v} %} » : attendu {% for x in liste %}`); continue; }
        const e = rw(fm[3], t.line);
        scopes.push(new Map());
        html += `{% for ${[fm[1], fm[2]].filter(Boolean).map(x => declare(x, t.line)).join(', ')} in ${e} %}`;
      } else if (kw === 'endfor') { if (scopes.length > 1) scopes.pop(); html += '{% endfor %}'; }
      else if (kw === 'set') {
        const sm = /^([a-z_][a-z0-9_]*)\s*=\s*([\s\S]+)$/i.exec(rest);
        if (!sm) { bad(t.line, `« {% ${t.v} %} » : attendu {% set nom = expression %}`); continue; }
        const e = rw(sm[2], t.line);
        html += `{% set ${declare(sm[1], t.line)} = ${e} %}`;
      } else bad(t.line, `balise « {% ${kw} %} » : un gabarit de mot accepte if, elif, else, endif, for, endfor, set`);
    }
    for (const b of behaviorsUsedIn(w.gabarit)) behaviors.add(b);
    return html.trim();
  };

  const node = (n, path) => {
    let header, value = null;
    if (typeof n === 'string') header = n;
    else if (n && typeof n === 'object' && !Array.isArray(n) && Object.keys(n).length === 1) { header = Object.keys(n)[0]; value = n[header]; }
    else { fail(path, 'un élément de forme est « primitive » ou « primitive: valeur » (une seule clé)'); return ''; }
    if (/^contenu$/i.test(header.trim()) && (value === null || value === undefined)) return contenu(path);
    const h = parseHeader(header, words);
    const p = `${path} ${header}`.trim();
    if (!h.prim) {
      const whole = header.toLowerCase().split(/[,«:]/)[0].trim().replace(/\s+/g, ' ');
      // Un vocabulaire illisible, ou un mot dont la définition est en erreur : l'erreur est déjà dite à sa ligne, dans le vocabulaire.
      if (words.unreadable || (words.broken && [...words.broken].some(b => whole === b || whole.startsWith(b + ' ')))) { incomplete = true; return ''; }
      // Un mot de paquet s'écrit avec son préfixe depuis le site : « vitrine.mention ».
      const pk = [...words.keys()].find(k => k.includes('.') && k.slice(k.indexOf('.') + 1) === whole);
      if (pk) { fail(p, `mot inconnu « ${whole} » ; un mot de paquet s'écrit avec son préfixe : « ${pk} »`); return ''; }
      const s = nearest(whole, [...words.keys()]) || nearest(h.word, Object.keys(PRIMITIVES));
      fail(p, `primitive inconnue « ${whole.includes(' ') && nearest(whole, [...words.keys()]) ? whole : h.word} »${s ? ` ; vouliez-vous dire « ${s} » ?` : ` (primitives : ${Object.keys(PRIMITIVES).join(', ')}${words.size ? ` ; mots du vocabulaire : ${[...words.keys()].join(', ')}` : ''})`}`);
      return '';
    }
    if (h.isWord) return callWord(h, value, p);
    // « carte de visit » se lit « carte » suivi d'options : si un mot du vocabulaire est tout proche, c'est lui qu'on voulait.
    if (words.size && !COLLECTION_PRIMITIVES.includes(h.prim) && h.prim !== 'si') {
      const whole = header.toLowerCase().split(/[,«:]/)[0].trim().replace(/\s+/g, ' ');
      const s = whole !== h.prim ? nearest(whole, [...words.keys()]) : null;
      if (s) { fail(p, `mot inconnu « ${whole} » ; vouliez-vous dire « ${s} » ?`); return ''; }
    }
    if (h.cls && !/^[a-z][a-z0-9-]*$/.test(h.cls)) { fail(p, `nom de classe « ${h.cls} » : minuscules, chiffres et tirets`); return ''; }
    const kind = PRIMITIVES[h.prim];
    const isList = Array.isArray(value);
    if (h.prim === 'sinon') { fail(p, '« sinon: » suit immédiatement un « si … : », avec ses éléments en dessous'); return ''; }
    if (kind === 'leaf' || (kind === 'both' && !isList)) { if (isList) { fail(p, `« ${h.prim} » ne contient pas d'éléments`); return ''; } return leaf(h, value, p); }
    // « variante X par défaut V » : sur les éléments simples qui portent un nom.
    const VARIANT_OK = ['bloc', 'carte', 'témoignage', 'élément', 'figure', 'grille', 'liste', 'liste numérotée', 'rangée'];
    const withVariant = VARIANT_OK.includes(h.prim) ? variantOf(h, p) : c => c;
    if (kind === 'collection') {
      if (!h.of) { fail(p, `« ${h.prim} » parcourt une liste : « ${h.prim} de <données> »`); return ''; }
      const r = resolve(h.of, p); if (!r) return '';
      if (r.absent) return '';
      if (r.schema && r.schema.type && r.schema.type !== 'array') { fail(p, `« ${h.of} » n'est pas une liste`); return ''; }
      const itemSchema = r.schema?.items?.type === 'object' ? r.schema.items : { properties: {} };
      const v = `it${iterDepth + 1}`;
      const enter = (fn) => { frames.push({ v, schema: itemSchema, self: r.schema?.items, loop: true }); iterDepth++; const res = fn(); iterDepth--; frames.pop(); return res; };
      const inGrid = (g, fn) => { gridStack.push(g); const res = fn(); gridStack.pop(); return res; };
      const loop = body => `{% for ${v} in ${r.expr} %}${body}{% endfor %}`;
      const c0 = classOf(h), c = c0 ? withVariant(c0) : c0;
      switch (h.prim) {
        case 'grille': {
          let cols = '3', g = { n: 3 }; for (const o of h.options) { let m; if ((m = /^(\d)\s+colonnes?$/i.exec(o))) { cols = m[1]; g = { n: Number(m[1]) || 3 }; } else if ((m = /^colonnes\s+([a-z_][a-z0-9_]*)\s+par défaut\s+(\d)$/i.exec(o))) { const cr = resolve(m[1], p); if (cr && !cr.absent) { cols = `{{ ${cr.expr} | default(${m[2]}) }}`; g = { expr: `${cr.expr} | default(${m[2]})` }; } else if (cr) { cols = m[2]; g = { n: Number(m[2]) }; } } else fail(p, `option de grille inconnue « ${o} » (« 3 colonnes » ou « colonnes columns par défaut 3 »)`); }
          return `<div${attr('grid', `grid-${cols}`, c)}>${loop(enter(() => inGrid(g, () => nodes(value || [], p))))}</div>`;
        }
        case 'filtres': {
          behaviors.add('filter');
          let cols = '3', by = null, all = 'Tout', g = { n: 3 };
          for (const o of h.options) { let m; if ((m = /^(\d)\s+colonnes?$/i.exec(o))) { cols = m[1]; g = { n: Number(m[1]) || 3 }; } else if ((m = /^selon\s+([a-z_][a-z0-9_]*)$/i.exec(o))) by = m[1]; else if ((m = /^tout\s+«\s*([^«»]+?)\s*»$/i.exec(o))) all = m[1].replace(/[<>{}]/g, ''); else fail(p, `option de filtres inconnue « ${o} » (selon <donnée>, 3 colonnes, tout « Toutes »)`); }
          if (!by) { fail(p, '« filtres de items, selon category » : quelle donnée de chaque élément sert de filtre ?'); return ''; }
          const bs = itemSchema.properties?.[by];
          if (!bs) { const s = nearest(by, Object.keys(itemSchema.properties || {})); fail(p, `« selon ${by} » : ${by} n'est pas une donnée des éléments de ${h.of} (${Object.keys(itemSchema.properties || {}).join(', ')})${s ? ` ; vouliez-vous dire « ${s} » ?` : ''}`); return ''; }
          if (bs.type && bs.type !== 'string') { fail(p, `« selon ${by} » : ${by} doit être un texte (une catégorie par élément)`); return ''; }
          const bar = `${base}-filtres`, btn = `${base}-filtre`, cell = `${base}-filtre-element`, grid = `${base}-filtre-grille`, min = { 1: 600, 2: 280, 3: 240, 4: 200 }[cols] || 180;
          parts.set('filtres', '.' + bar); parts.set('filtre', '.' + btn);
          baseCss.add(`.${secClsOf()} .${bar}{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:24px}\n.${secClsOf()} .${btn}{background:var(--color-surface);border:1px solid var(--color-border);border-radius:999px;padding:6px 16px;font:inherit;cursor:pointer;color:var(--color-fg)}\n.${secClsOf()} .${btn}[aria-pressed=true]{background:var(--color-primary);color:var(--color-primary-fg);border-color:var(--color-primary)}\n.${secClsOf()} .${cell}:not([hidden]){display:grid}
.${secClsOf()} .${grid}{grid-template-columns:repeat(auto-fill,minmax(${min}px,1fr))}`);
          const buttons = `<div class="${bar}" data-sl-filters><button type="button" class="${btn}" data-sl-filter="*">${all}</button>{% for ${v} in ${r.expr} | map('${by}') | unique %}<button type="button" class="${btn}" data-sl-filter="${out(`${v} | slug`)}">${out(v)}</button>{% endfor %}</div>`;
          return `${buttons}\n<div${attr('grid', `grid-${cols}`, grid, c)}>${loop(`<div class="${cell}" data-sl-filter-item="${out(`${v}.${by} | slug`)}">${enter(() => inGrid(g, () => nodes(value || [], p)))}</div>`)}</div>`;
        }
        case 'liste numérotée': return `<ol${attr(c)}>${loop(enter(() => nodes(value || [], p)))}</ol>`;
        case 'liste': return `<ul${attr(c)}>${loop(enter(() => nodes(value || [], p)))}</ul>`;
        case 'rangée': return `<div${attr(c)}>${loop(enter(() => nodes(value || [], p)))}</div>`;
        case 'accordéon': {
          let q = null, a = null; for (const o of h.options) { let m; if ((m = /^question\s+(\S+)$/i.exec(o))) q = m[1]; else if ((m = /^réponse\s+(\S+)$/i.exec(o))) a = m[1]; else fail(p, `option d'accordéon inconnue « ${o} »`); }
          if (!q || !a) { fail(p, '« accordéon de items, question q, réponse a »'); return ''; }
          return enter(() => { const rq = resolve(q, p), ra = resolve(a, p); if (!rq || !ra) return ''; return loop(`<details class="faq-item" id="{{ (p.id | default('${base}')) ~ '-q' ~ loop.index }}"{% if loop.first %} open{% endif %}><summary>${out(rq.expr)}</summary><div class="faq-answer">${out(`paragraphs(${ra.expr})`)}</div></details>`); });
        }
        case 'défilement': {
          behaviors.add('carousel');
          let auto = null, fleches = true; for (const o of h.options) { let m; if (/^automatique$/i.test(o)) auto = 7000; else if ((m = /^automatique toutes les (\d+) secondes$/i.exec(o))) auto = Number(m[1]) * 1000; else if (/^sans flèches$/i.test(o)) fleches = false; else fail(p, `option de défilement inconnue « ${o} » (automatique, automatique toutes les N secondes, sans flèches)`); }
          const w = c || `${base}-defilement`; parts.set('défilement', '.' + w); parts.set('flèches', `.${base}-fleche`); parts.set('piste', `.${base}-piste`);
          baseCss.add(`.${secClsOf()} .${w}{display:flex;align-items:center;gap:12px}\n.${secClsOf()} .${base}-piste{flex:1;min-width:0}\n.${secClsOf()} .${base}-piste>*{width:min(340px,80vw);margin:0}`);
          const btn = (k, sym, lab) => fleches ? `<button type="button" class="${base}-fleche" data-sl-${k} aria-label="${lab}">${sym}</button>` : '';
          return `<div class="${w}" data-sl-carousel${auto ? ` data-sl-autoplay="${auto}"` : ''}>${btn('prev', '‹', 'Précédent')}<div class="${base}-piste" data-sl-track>${loop(enter(() => nodes(value || [], p)))}</div>${btn('next', '›', 'Suivant')}</div>`;
        }
        case 'onglets': {
          behaviors.add('tabs');
          let lab = null; for (const o of h.options) { const m = /^libellé\s+(\S+)$/i.exec(o); if (m) lab = m[1]; else fail(p, `option d'onglets inconnue « ${o} » (libellé <donnée>)`); }
          if (!lab) { fail(p, '« onglets de items, libellé nom » : quelle donnée écrire sur chaque onglet ?'); return ''; }
          const w = c || `${base}-onglets`; parts.set('onglets', '.' + w); parts.set('onglet', `.${base}-onglet`); parts.set('panneau', `.${base}-panneau`);
          baseCss.add(`.${secClsOf()} .${base}-onglets-liste{display:flex;gap:6px;flex-wrap:wrap;border-bottom:1px solid var(--color-border);margin-bottom:18px}\n.${secClsOf()} .${base}-onglet{background:none;border:0;border-bottom:3px solid transparent;padding:10px 16px;font:inherit;font-weight:600;color:var(--color-muted);cursor:pointer}\n.${secClsOf()} .${base}-onglet[aria-selected=true]{color:var(--color-primary);border-bottom-color:var(--color-primary)}\n.${secClsOf()} .${base}-panneau h3{margin-top:0}`);
          const tabs = enter(() => { const rl = resolve(lab, p); return rl ? loop(`<button type="button" class="${base}-onglet" data-sl-tab="o{{ loop.index }}">${out(rl.expr)}</button>`) : ''; });
          const panels = enter(() => loop(`<div class="${base}-panneau" data-sl-panel="o{{ loop.index }}">${nodes(value || [], p)}</div>`));
          return `<div class="${w}" data-sl-tabs><div class="${base}-onglets-liste">${tabs}</div>${panels}</div>`;
        }
      }
    }
    // Conteneurs.
    const bare = h.prim === 'formulaire' && (value === null || value === undefined);
    if (!isList && !bare) { fail(p, `« ${h.prim} » contient des éléments : « ${h.prim}: » puis la liste en dessous`); return ''; }
    const c0 = classOf(h), c = c0 ? withVariant(c0) : c0;
    if (VARIANT_OK.includes(h.prim) && h.options.length) { fail(p, `option inconnue « ${h.options[0]} » sur « ${h.prim} » (variante <donnée> par défaut <valeur>)`); return ''; }
    switch (h.prim) {
      case 'bloc': return `<div${attr(c)}>${nodes(value, p)}</div>`;
      case 'carte': return `<div${attr('card', c)}>${nodes(value, p)}</div>`;
      case 'témoignage': return `<blockquote${attr('card', c)}>${nodes(value, p)}</blockquote>`;
      case 'élément': return `<li${attr(c)}>${nodes(value, p)}</li>`;
      case 'figure': return `<figure${attr(c)}>${nodes(value, p)}</figure>`;
      case 'si': {
        // « si a: », « si a ou b: », « si a et b: » (un seul connecteur par condition).
        const terms = String(h.of || '').split(/\s+(ou|et)\s+/i);
        const ops = new Set(terms.filter((_, i) => i % 2).map(x => x.toLowerCase()));
        if (ops.size > 1) { fail(p, `« si ${h.of} » mêle « ou » et « et » : une seule sorte par condition (imbriquez deux « si »)`); return ''; }
        if (h.options.length) { fail(p, `« si ${h.of}, ${h.options.join(', ')} » : pour plusieurs données, « si a ou b: » ou « si a et b: »`); return ''; }
        const rs = terms.filter((_, i) => !(i % 2)).map(t => resolve(t, p));
        if (rs.some(x => !x)) return '';
        return `{% if ${rs.map(x => (x.absent ? 'null' : x.expr)).join(ops.has('et') ? ' and ' : ' or ')} %}${nodes(value, p)}{% endif %}`;
      }
      case 'repli': {
        let lab = null, open = false;
        for (const o of h.options) { let m; if (/^ouvert$/i.test(o)) open = true; else if ((m = /^libellé\s+«\s*([^«»]+?)\s*»$/i.exec(o))) lab = { text: m[1] }; else if ((m = /^libellé\s+(\S+)$/i.exec(o))) lab = { data: m[1] }; else fail(p, `option de repli inconnue « ${o} » (libellé <donnée>, libellé « texte », ouvert)`); }
        if (!lab) { fail(p, '« repli, libellé « En savoir plus »: » : quel texte écrire sur la ligne qui ouvre la zone ?'); return ''; }
        const rl = lab.data ? resolve(lab.data, p) : null;
        if (lab.data && !rl) return '';
        const w = c || `${base}-repli`; parts.set('repli', '.' + w);
        baseCss.add(`.${secClsOf()} .${w}{border:1px solid var(--color-border);border-radius:var(--radius);padding:0 20px;margin-bottom:10px;background:var(--color-surface)}\n.${secClsOf()} .${w}>summary{cursor:pointer;padding:16px 0;font-weight:600;list-style:none;display:flex;justify-content:space-between;align-items:center}\n.${secClsOf()} .${w}>summary::-webkit-details-marker{display:none}\n.${secClsOf()} .${w}>summary::after{content:"+";font-size:1.4rem;color:var(--color-primary)}\n.${secClsOf()} .${w}[open]>summary::after{content:"−"}\n.${secClsOf()} .${w}-contenu{padding:0 0 16px}`);
        const summary = rl ? out(rl.expr) : lab.text.replace(/[<>{}]/g, '');
        return iff(rl, `<details class="${w}"${open ? ' open' : ''}><summary>${summary}</summary><div class="${w}-contenu">${nodes(value, p)}</div></details>`);
      }
      case 'formulaire': {
        if (!effects?.form) { fail(p, `« formulaire » ${NO_FORM}`); return ''; }
        let label = 'Envoyer'; for (const o of h.options) { const m = /^bouton\s+(.+)$/i.exec(o); if (m) label = m[1].replace(/[<>{}]/g, ''); else fail(p, `option de formulaire inconnue « ${o} » (bouton <texte>)`); }
        const w = c || `${base}-formulaire`; parts.set('formulaire', '.' + w);
        return `{% if form.ok %}<div class="card contact-success" role="status"><strong>✔</strong> ${out('form.success')}</div>{% else %}<div class="${w}">{% form %}{% if form.failed %}<div class="form-error" role="alert">${out('form.message')}</div>{% endif %}${bare ? fieldNames().map(f => out(`field('${f}')`)).join('\n') : nodes(value, p)}<button class="btn" type="submit">${label}</button>{% endform %}</div>{% endif %}`;
      }
    }
    return '';
  };

  // Racine : liste d'éléments, ou « section [« classe »][, variante X par défaut V][, conteneur « classe »] » puis la liste.
  // « bandeau » : une section sans les marges d'une section ordinaire (ouverture de page) ; mêmes options.
  let variant = '', inner = '', body = '', bandeau = false, bgClass = '', bgStyle = '';
  const rootKey = forme && typeof forme === 'object' && !Array.isArray(forme) && Object.keys(forme).length === 1 ? Object.keys(forme)[0] : null;
  const rootM = rootKey ? /^(section|bandeau)(?![a-zà-ÿ-])\s*/i.exec(rootKey) : null;
  if (Array.isArray(forme)) body = nodes(forme, 'forme');
  else if (rootM) {
    const key = rootKey;
    curRef = { in: forme, at: key };
    bandeau = /^bandeau/i.test(rootM[1]);
    const rest = key.slice(rootM[0].length);
    const m = /^«\s*([^»]+?)\s*»/.exec(rest);
    if (m) secCls = m[1];
    if (m && !/^[a-z][a-z0-9-]*$/.test(secCls)) fail('forme', `nom de classe « ${secCls} » : minuscules, chiffres et tirets`);
    for (const o of splitOutside(rest.replace(/^«[^»]*»/, ''))) {
      let mm;
      if ((mm = /^variante\s+([a-z_][a-z0-9_]*)\s+par défaut\s+([a-z0-9-]+)$/i.exec(o))) { const r = resolve(mm[1], 'forme'); if (r) variant = r.absent ? ` ${secCls}-${mm[2]}` : ` ${secCls}-{{ ${r.expr} | default('${mm[2]}') }}`; }
      else if ((mm = /^image de fond\s+([a-z_][a-z0-9_]*)$/i.exec(o))) {
        // L'image passe par une variable CSS de la section : la feuille décide du voile et du cadrage.
        const r = resolve(mm[1], 'forme');
        if (r && !r.absent) { const cl = ` ${secCls}-img`, st = ` style="--${secCls}-bg:url({{ img_src(${r.expr}, 1600) }})"`; bgClass = r.required ? cl : `{% if ${r.expr} %}${cl}{% endif %}`; bgStyle = r.required ? st : `{% if ${r.expr} %}${st}{% endif %}`; parts.set('image de fond', `.${secCls}-img`); }
      } else if ((mm = /^conteneur\s+«\s*([a-z][a-z0-9-]*)\s*»(?:\s+(si|sans)\s+([a-z_][a-z0-9_]*))?$/i.exec(o))) {
        // Plusieurs conteneurs possibles, dont certains selon une donnée : « conteneur « deux-colonnes » si image, conteneur « étroit » sans image ».
        let cl = ' ' + mm[1];
        if (mm[2]) { const r = resolve(mm[3], 'forme'); if (!r) continue; const neg = /^sans$/i.test(mm[2]); if (r.absent) { if (!neg) continue; } else cl = `{% if ${neg ? 'not ' : ''}${r.expr} %}${cl}{% endif %}`; }
        inner += cl; parts.set(mm[1], '.' + mm[1]); if (!parts.has('conteneur')) parts.set('conteneur', '.' + mm[1]);
      } else fail('forme', `option de ${bandeau ? 'bandeau' : 'section'} inconnue « ${o} » (variante X par défaut V, conteneur « classe » [si X | sans X], image de fond X)`);
    }
    body = nodes(forme[key], 'forme');
  } else fail('forme', 'attendu : une liste d\'éléments, ou « section, options: » (ou « bandeau « classe », options: ») puis la liste');
  parts.set('section', '.' + secCls);
  const template = `<section class="${bandeau ? '' : 'section '}${secCls}${bgClass}${variant}"${bgStyle}>\n  <div class="container${inner}">\n${body}\n  </div>\n</section>\n`;
  return { template, behaviors, parts, errors, sectionClass: secCls, css: [...baseCss].join('\n') + (baseCss.size ? '\n' : ''), wordsCss, usedWords, incomplete };
}
