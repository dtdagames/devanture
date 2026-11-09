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

const slug = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// Primitives : nature (feuille, conteneur, collection, section), du plus long au plus court pour la reconnaissance.
export const PRIMITIVES = {
  'liste numérotée': 'collection', 'texte discret': 'leaf', 'grand titre': 'leaf', 'bouton discret': 'leaf', 'sous-titre': 'leaf',
  'en-tête': 'leaf', 'titre': 'leaf', 'texte': 'leaf', 'paragraphes': 'leaf', 'citation': 'leaf', 'icône': 'leaf', 'bouton': 'leaf', 'lien': 'leaf',
  'étoiles': 'leaf', 'signature': 'leaf', 'date': 'leaf', 'numéro': 'leaf', 'image': 'leaf', 'prix': 'leaf', 'badge': 'leaf', 'champ': 'leaf',
  'portrait': 'leaf', 'copier': 'leaf', 'repli': 'container', 'filtres': 'collection',
  'bloc': 'both', 'carte': 'container', 'témoignage': 'container', 'élément': 'container', 'si': 'container', 'formulaire': 'container',
  'grille': 'collection', 'liste': 'collection', 'rangée': 'collection', 'défilement': 'collection', 'onglets': 'collection', 'accordéon': 'collection',
};
const NAMES = Object.keys(PRIMITIVES).sort((a, b) => b.length - a.length);
export const PRIMITIVE_HELP = {
  'en-tête': 'titre (h2) et intro de la section : « en-tête: titre, intro »', titre: 'titre (h2 dans la section, h3 dans un élément de liste)', 'grand titre': 'titre h2', 'sous-titre': 'titre h3',
  texte: 'paragraphe', 'texte discret': 'paragraphe en couleur discrète', paragraphes: 'texte long : paragraphes, listes « - », **gras**', citation: 'citation entre guillemets « »',
  icône: 'pictogramme', bouton: 'lien en bouton', 'bouton discret': 'lien en bouton secondaire', lien: 'lien simple', étoiles: 'note en étoiles sur 5', signature: 'auteur en gras, puis précision discrète',
  date: 'date (option : en toutes lettres)', numéro: 'numéro de l\'élément dans la liste', image: 'image (srcset, chargement différé) : « image: photo, légende » (option : agrandissable, ouvre l\'image en plein écran au clic)',
  portrait: 'photo ronde, ou initiale du nom sans photo : « portrait: photo, nom »', copier: 'bouton qui copie une donnée dans le presse-papiers : « copier, libellé « Copier le code »: code »',
  repli: 'zone repliable : « repli, libellé « En savoir plus »: » puis les éléments (options : libellé <donnée> ou « texte », ouvert)',
  filtres: 'grille filtrable par boutons : « filtres de items, selon category, 3 colonnes » (option : tout « Toutes »)', prix: 'prix formaté', badge: 'étiquette', champ: 'champ du formulaire déclaré',
  bloc: 'boîte (avec une donnée : son texte ; avec des éléments en dessous : un regroupement)', carte: 'carte (fond, bordure, coins)', témoignage: 'carte de citation', élément: 'élément de liste', si: 'condition : « si lien: » puis les éléments',
  formulaire: 'formulaire déclaré dans fonctionnement (option : bouton Envoyer) ; sans éléments en dessous, tous les champs dans l\'ordre', grille: 'grille de cartes : « grille de items, 3 colonnes »', liste: 'liste à puces', 'liste numérotée': 'liste numérotée', rangée: 'rangée',
  défilement: 'carrousel : « défilement de avis, automatique » (option : sans flèches)', onglets: 'onglets : « onglets de formules, libellé nom »', accordéon: 'questions repliables : « accordéon de items, question q, réponse a »',
};

function nearest(w, list) { let best = null, bd = Infinity; for (const c of list) { const d = lev(w, c); if (d < bd) { bd = d; best = c; } } return bd <= Math.max(2, Math.floor(w.length / 3)) ? best : null; }
function lev(a, b) { const d = Array.from({ length: a.length + 1 }, (_, i) => [i]); for (let j = 1; j <= b.length; j++) d[0][j] = j; for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); return d[a.length][b.length]; }

/** Découpe aux virgules, sauf dans un texte entre « ». */
export function splitOutside(text) {
  const out = []; let cur = '', depth = 0;
  for (const ch of String(text)) { if (ch === '«') depth++; else if (ch === '»') depth = Math.max(0, depth - 1); if (ch === ',' && !depth) { out.push(cur); cur = ''; } else cur += ch; }
  out.push(cur);
  return out.map(x => x.trim()).filter(Boolean);
}

/** Analyse « primitive [« classe »] [de liaison | liaison] [, options…] ». */
export function parseHeader(text) {
  const s = String(text).trim();
  const low = s.toLowerCase();
  const prim = NAMES.find(n => low === n || low.startsWith(n + ' ') || low.startsWith(n + ',') || low.startsWith(n + '«') || low.startsWith(n + ' «'));
  if (!prim) return { prim: null, word: low.split(/[\s,«]/)[0] };
  let rest = s.slice(prim.length).trim();
  let cls = null;
  const m = /^«\s*([^»]+?)\s*»/.exec(rest);
  if (m) { cls = m[1].trim(); rest = rest.slice(m[0].length).trim(); }
  let of = null;
  const parts = splitOutside(rest);
  if (parts.length && /^de\s+/i.test(parts[0])) of = parts.shift().replace(/^de\s+/i, '').trim();
  else if ((prim === 'si') && parts.length) of = parts.shift();
  return { prim, cls, of, options: parts };
}

/**
 * Compile un bloc forme. opts : { name, props (schéma JSON), want (Set de primitives ou classes que l'apparence vise), effects }.
 * Renvoie { template, behaviors, parts (Map nom → sélecteur), errors: [{ path, message, ref }], sectionClass, css }.
 */
export function compileForme(forme, { name, props, want = new Set(), effects = null }) {
  const errors = [], behaviors = new Set(), parts = new Map(), baseCss = new Set();
  const base = cssPrefixes(name)[0];
  let secCls = name.includes('.') ? cssPrefixes(name)[0] : name;
  const secClsOf = () => secCls;
  // Chaque erreur garde l'élément de forme en cours (ref), pour retrouver sa ligne dans le manifeste.
  let curRef = forme;
  const fail = (path, message) => errors.push({ path, message, ref: curRef });
  const NO_FORM = 'exige un formulaire déclaré : bloc « fonctionnement: formulaire: » dans le manifeste';
  const fieldNames = () => (effects?.form?.fields || []).map(x => (typeof x === 'string' ? x : x?.name)).filter(Boolean);
  let iterDepth = 0;
  const frames = [{ v: 'p', schema: props }];

  const GLOBALS = new Set(['p', 'site', 'page', 'loop', 'form', 'item', 'product', 'order', 'true', 'false', 'null', 'and', 'or', 'not', 'in']);
  /** Réécrit les noms courts d'une expression ({{ title | default(label) }}) vers l'élément courant ou les données. */
  const rewrite = (src, path) => {
    let toks; try { toks = tokenize(src); } catch (e) { fail(path, `expression invalide « ${src} » : ${e.message}`); return src; }
    let out = '', last = 0;
    toks.forEach((t, i) => {
      if (t.type !== 'id' || GLOBALS.has(t.value) || /^it\d+$/.test(t.value)) return;
      const prev = toks[i - 1], next = toks[i + 1];
      if (prev && prev.type === 'op' && (prev.value === '.' || prev.value === '|')) return;
      if (next && next.type === 'op' && next.value === '(') return;
      for (let k = frames.length - 1; k >= 0; k--) if (frames[k].schema?.properties?.[t.value]) { out += src.slice(last, t.pos) + `${frames[k].v}.${t.value}`; last = t.pos + t.value.length; return; }
      fail(path, `« ${t.value} » dans « ${src} » n'est pas une donnée`);
    });
    return out + src.slice(last);
  };
  /** Texte littéral avec des données : « Réponse sous {{ delai }}. » ; facultatives → condition sur l'ensemble. */
  // Le texte devient une seule expression passée à markup() : échappement, puis balisage léger (**gras**, *italique*, [texte](lien)).
  const literal = (text, path) => {
    const conds = [], pieces = []; let last = 0; const re = /\{\{([\s\S]+?)\}\}/g; let m;
    const q = x => "'" + x.replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
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
  const resolve = (b, path) => {
    const t = String(b).trim();
    if (/^\{\{[\s\S]*\}\}$/.test(t)) { const inner = t.slice(2, -2).trim(); if (/^[a-z_][a-z0-9_]*$/.test(inner)) return resolve(inner, path); return { expr: rewrite(inner, path), required: false, schema: null }; }
    if (t === 'valeur' && frames.length > 1) return { expr: frames[frames.length - 1].v, required: true, schema: frames[frames.length - 1].self };
    const path0 = t.split('.');
    if (!/^[a-z_][a-z0-9_]*(\.[a-z_][a-z0-9_]*)*$/.test(t)) { fail(path, `« ${t} » n'est pas un nom de donnée`); return null; }
    for (let i = frames.length - 1; i >= 0; i--) {
      const f = frames[i]; const s = f.schema?.properties?.[path0[0]];
      if (!s) continue;
      let sch = s, req = (f.schema.required || []).includes(path0[0]);
      for (const k of path0.slice(1)) { const parent = sch; sch = sch?.properties?.[k]; req = req && (parent?.required || []).includes(k); if (!sch) { fail(path, `« ${t} » : ${k} n'existe pas dans ${path0[0]}`); return null; } }
      return { expr: `${f.v}.${t}`, required: req, schema: sch };
    }
    const known = [...new Set(frames.flatMap(f => Object.keys(f.schema?.properties || {})))];
    const s2 = nearest(t, known);
    fail(path, `« ${t} » n'est pas une donnée${frames.length > 1 ? ' de l\'élément ni du composant' : ' du composant'} (connues : ${known.join(', ')})${s2 ? ` ; vouliez-vous dire « ${s2} » ?` : ''}`);
    return null;
  };
  const classOf = (h, fallback = null) => {
    const own = h.cls || ((want.has(h.prim) || want.has(slug(h.prim))) ? `${base}-${slug(h.prim)}` : fallback);
    if (own) { parts.set(h.cls || h.prim, '.' + own); if (h.cls) parts.set(slug(h.prim), parts.get(slug(h.prim)) || '.' + own); }
    return own;
  };
  const attr = (...cl) => { const c = cl.filter(Boolean).join(' '); return c ? ` class="${c}"` : ''; };
  const iff = (r, html) => (r && !r.required ? `{% if ${r.expr} %}${html}{% endif %}` : html);
  const out = e => `{{ ${e} }}`;

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
    const TEXT_PRIMS = { 'texte': 'p', 'texte discret': 'p', 'titre': null, 'grand titre': 'h2', 'sous-titre': 'h3', 'citation': 'p', 'bloc': 'div' };
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
      if (/^\{\{/.test(it) || /^[a-z_][a-z0-9_.]*$/.test(it)) { const known = frames.some(f => f.schema?.properties?.[it.split('.')[0]]) || /^\{\{/.test(it) || (it === 'valeur' && frames.length > 1); if (known || !binds.length) { binds.push(it); continue; } }
      opts.push(it);
    }
    const r = binds.map((b, i) => resolve(b, `${path}[${i}]`));
    if (r.some(x => x === null)) return '';
    // Seule « date » a des options ; ailleurs, un mot non reconnu est une erreur, jamais une option ignorée.
    const LEAF_OPTS = { date: [/^en toutes lettres$/i, /^mois et ann[ée]e$/i], signature: [/^en toutes lettres$/i], image: [/^agrandissable$/i], copier: [/^libellé\s+«[^«»]+»$/i] };
    for (const o of opts) if (!(LEAF_OPTS[h.prim] || []).some(re => re.test(o))) { const known = [...new Set(frames.flatMap(f => Object.keys(f.schema?.properties || {})))]; const s = nearest(o, known); fail(path, `« ${o} » n'est ni une donnée${frames.length > 1 ? ' de l\'élément ou du composant' : ' du composant'} ni une option de « ${h.prim} »${s ? ` ; vouliez-vous dire « ${s} » ?` : ''}`); return ''; }
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
      case 'titre': case 'grand titre': case 'sous-titre': { if (!need(1)) return ''; const tag = h.prim === 'grand titre' ? 'h2' : h.prim === 'sous-titre' ? 'h3' : (iterDepth ? 'h3' : 'h2'); return iff(r[0], `<${tag}${attr(c)}>${out(r[0].expr)}</${tag}>`); }
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
      case 'image': { if (!need(1)) return ''; const alt = r[1] ? r[1].expr : "''"; const sizes = iterDepth ? "'(max-width: 700px) 100vw, 33vw'" : "'(max-width: 700px) 100vw, 50vw'"; let im = out(`img(${r[0].expr}, ${alt}, ${sizes})`);
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
    const saved = curRef;
    const html = list.map((n, i) => { curRef = { in: list, at: i }; return node(n, `${path}[${i}]`); }).join('\n');
    curRef = saved;
    return html;
  };
  const node = (n, path) => {
    let header, value = null;
    if (typeof n === 'string') header = n;
    else if (n && typeof n === 'object' && !Array.isArray(n) && Object.keys(n).length === 1) { header = Object.keys(n)[0]; value = n[header]; }
    else { fail(path, 'un élément de forme est « primitive » ou « primitive: valeur » (une seule clé)'); return ''; }
    const h = parseHeader(header);
    const p = `${path} ${header}`.trim();
    if (!h.prim) { const s = nearest(h.word, Object.keys(PRIMITIVES)); fail(p, `primitive inconnue « ${h.word} »${s ? ` ; vouliez-vous dire « ${s} » ?` : ''} (primitives : ${Object.keys(PRIMITIVES).join(', ')})`); return ''; }
    if (h.cls && !/^[a-z][a-z0-9-]*$/.test(h.cls)) { fail(p, `nom de classe « ${h.cls} » : minuscules, chiffres et tirets`); return ''; }
    const kind = PRIMITIVES[h.prim];
    const isList = Array.isArray(value);
    if (kind === 'leaf' || (kind === 'both' && !isList)) { if (isList) { fail(p, `« ${h.prim} » ne contient pas d'éléments`); return ''; } return leaf(h, value, p); }
    if (kind === 'collection') {
      if (!h.of) { fail(p, `« ${h.prim} » parcourt une liste : « ${h.prim} de <données> »`); return ''; }
      const r = resolve(h.of, p); if (!r) return '';
      if (r.schema && r.schema.type !== 'array') { fail(p, `« ${h.of} » n'est pas une liste`); return ''; }
      const itemSchema = r.schema?.items?.type === 'object' ? r.schema.items : { properties: {} };
      const v = `it${iterDepth + 1}`;
      const enter = (fn) => { frames.push({ v, schema: itemSchema, self: r.schema?.items }); iterDepth++; const res = fn(); iterDepth--; frames.pop(); return res; };
      const loop = body => `{% for ${v} in ${r.expr} %}${body}{% endfor %}`;
      const c = classOf(h);
      switch (h.prim) {
        case 'grille': {
          let cols = '3'; for (const o of h.options) { let m; if ((m = /^(\d)\s+colonnes?$/i.exec(o))) cols = m[1]; else if ((m = /^colonnes\s+([a-z_][a-z0-9_]*)\s+par défaut\s+(\d)$/i.exec(o))) { const cr = resolve(m[1], p); if (cr) cols = `{{ ${cr.expr} | default(${m[2]}) }}`; } else fail(p, `option de grille inconnue « ${o} » (« 3 colonnes » ou « colonnes columns par défaut 3 »)`); }
          return `<div${attr('grid', `grid-${cols}`, c)}>${loop(enter(() => nodes(value || [], p)))}</div>`;
        }
        case 'filtres': {
          behaviors.add('filter');
          let cols = '3', by = null, all = 'Tout';
          for (const o of h.options) { let m; if ((m = /^(\d)\s+colonnes?$/i.exec(o))) cols = m[1]; else if ((m = /^selon\s+([a-z_][a-z0-9_]*)$/i.exec(o))) by = m[1]; else if ((m = /^tout\s+«\s*([^«»]+?)\s*»$/i.exec(o))) all = m[1].replace(/[<>{}]/g, ''); else fail(p, `option de filtres inconnue « ${o} » (selon <donnée>, 3 colonnes, tout « Toutes »)`); }
          if (!by) { fail(p, '« filtres de items, selon category » : quelle donnée de chaque élément sert de filtre ?'); return ''; }
          const bs = itemSchema.properties?.[by];
          if (!bs) { const s = nearest(by, Object.keys(itemSchema.properties || {})); fail(p, `« selon ${by} » : ${by} n'est pas une donnée des éléments de ${h.of} (${Object.keys(itemSchema.properties || {}).join(', ')})${s ? ` ; vouliez-vous dire « ${s} » ?` : ''}`); return ''; }
          if (bs.type && bs.type !== 'string') { fail(p, `« selon ${by} » : ${by} doit être un texte (une catégorie par élément)`); return ''; }
          const bar = `${base}-filtres`, btn = `${base}-filtre`, cell = `${base}-filtre-element`, grid = `${base}-filtre-grille`, min = { 1: 600, 2: 280, 3: 240, 4: 200 }[cols] || 180;
          parts.set('filtres', '.' + bar); parts.set('filtre', '.' + btn);
          baseCss.add(`.${secClsOf()} .${bar}{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:24px}\n.${secClsOf()} .${btn}{background:var(--color-surface);border:1px solid var(--color-border);border-radius:999px;padding:6px 16px;font:inherit;cursor:pointer;color:var(--color-fg)}\n.${secClsOf()} .${btn}[aria-pressed=true]{background:var(--color-primary);color:var(--color-primary-fg);border-color:var(--color-primary)}\n.${secClsOf()} .${cell}:not([hidden]){display:grid}
.${secClsOf()} .${grid}{grid-template-columns:repeat(auto-fill,minmax(${min}px,1fr))}`);
          const buttons = `<div class="${bar}" data-sl-filters><button type="button" class="${btn}" data-sl-filter="*">${all}</button>{% for ${v} in ${r.expr} | map('${by}') | unique %}<button type="button" class="${btn}" data-sl-filter="${out(`${v} | slug`)}">${out(v)}</button>{% endfor %}</div>`;
          return `${buttons}\n<div${attr('grid', `grid-${cols}`, grid, c)}>${loop(`<div class="${cell}" data-sl-filter-item="${out(`${v}.${by} | slug`)}">${enter(() => nodes(value || [], p))}</div>`)}</div>`;
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
    const c = classOf(h);
    switch (h.prim) {
      case 'bloc': return `<div${attr(c)}>${nodes(value, p)}</div>`;
      case 'carte': return `<div${attr('card', c)}>${nodes(value, p)}</div>`;
      case 'témoignage': return `<blockquote${attr('card', c)}>${nodes(value, p)}</blockquote>`;
      case 'élément': return `<li${attr(c)}>${nodes(value, p)}</li>`;
      case 'si': { const r = resolve(h.of || '', p); return r ? `{% if ${r.expr} %}${nodes(value, p)}{% endif %}` : ''; }
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
  let variant = '', inner = '', body = '';
  if (forme && typeof forme === 'object' && !Array.isArray(forme) && Object.keys(forme).length === 1) { const mm = /^section\s*«\s*([^»]+?)\s*»/i.exec(Object.keys(forme)[0]); if (mm) secCls = mm[1]; }
  if (Array.isArray(forme)) body = nodes(forme, 'forme');
  else if (forme && typeof forme === 'object' && Object.keys(forme).length === 1 && /^section\b/i.test(Object.keys(forme)[0])) {
    const key = Object.keys(forme)[0];
    curRef = { in: forme, at: key };
    const rest = key.replace(/^section\s*/i, '');
    const m = /^«\s*([^»]+?)\s*»/.exec(rest);
    if (m) secCls = m[1];
    for (const o of splitOutside(rest.replace(/^«[^»]*»/, ''))) {
      let mm;
      if ((mm = /^variante\s+([a-z_][a-z0-9_]*)\s+par défaut\s+([a-z0-9-]+)$/i.exec(o))) { const r = resolve(mm[1], 'forme'); if (r) variant = ` ${secCls}-{{ ${r.expr} | default('${mm[2]}') }}`; }
      else if ((mm = /^conteneur\s+«\s*([a-z][a-z0-9-]*)\s*»$/i.exec(o))) { inner = ' ' + mm[1]; parts.set(mm[1], '.' + mm[1]); parts.set('conteneur', '.' + mm[1]); }
      else fail('forme', `option de section inconnue « ${o} » (variante X par défaut V, conteneur « classe »)`);
    }
    body = nodes(forme[key], 'forme');
  } else fail('forme', 'attendu : une liste d\'éléments, ou « section, options: » puis la liste');
  parts.set('section', '.' + secCls);
  const template = `<section class="section ${secCls}${variant}">\n  <div class="container${inner}">\n${body}\n  </div>\n</section>\n`;
  return { template, behaviors, parts, errors, sectionClass: secCls, css: [...baseCss].join('\n') + (baseCss.size ? '\n' : '') };
}
