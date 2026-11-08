// Interpolation {{ … }} dans les valeurs du projet, résolue à la compilation.
// Racines connues à la compilation : site, const, page, collections (et p dans un composant composé).
// Racines connues à la requête : item, product, order, form, loop — leurs expressions sont laissées en place et compilées en PHP plus tard.
import { parse, evaluate, roots, paths, ExprError, truthy } from './expr.js';
import { err } from '../errors.js';

export const RUNTIME_ROOTS = new Set(['item', 'product', 'order', 'form', 'loop', 'cart']);
const RE = /\{\{\s*([\s\S]+?)\s*\}\}/g;

/** Découpe une chaîne en segments texte / expression. Renvoie null si la chaîne ne contient aucune expression. */
export function segments(s) {
  if (typeof s !== 'string' || !s.includes('{{')) return null;
  const out = []; let last = 0; let m; RE.lastIndex = 0;
  while ((m = RE.exec(s))) { if (m.index > last) out.push({ text: s.slice(last, m.index) }); out.push({ src: m[1], raw: m[0] }); last = m.index + m[0].length; }
  if (!out.length) return null;
  if (last < s.length) out.push({ text: s.slice(last) });
  return out;
}

/** Vrai si une expression lit une racine connue seulement à la requête. */
export function isRuntime(src) {
  try { for (const r of roots(parse(src))) if (RUNTIME_ROOTS.has(r)) return true; } catch { /* erreur signalée ailleurs */ }
  return false;
}

/**
 * Remplace les expressions de compilation dans une valeur (récursif). Une chaîne réduite à une seule expression garde le type de sa valeur
 * (liste, nombre, objet). Les expressions d'exécution sont conservées telles quelles. Les erreurs sont rapportées via report(message, path).
 */
export function interpolate(value, scope, { report, path = '', functions = {}, allowRuntime = true, known = null } = {}) {
  if (typeof value === 'string') {
    const segs = segments(value); if (!segs) return value;
    const hasExpr = segs.some(x => x.src !== undefined);
    if (!hasExpr) return value;
    if (segs.length === 1 && segs[0].src !== undefined) {
      const r = one(segs[0], scope, { report, path, functions, allowRuntime, known });
      return r.keep ? value : r.value;
    }
    let s = '';
    for (const seg of segs) {
      if (seg.src === undefined) { s += seg.text; continue; }
      const r = one(seg, scope, { report, path, functions, allowRuntime, known });
      s += r.keep ? seg.raw : toText(r.value);
    }
    return s;
  }
  if (Array.isArray(value)) return value.map((v, i) => interpolate(v, scope, { report, path: `${path}[${i}]`, functions, allowRuntime, known }));
  if (value && typeof value === 'object') { const o = {}; for (const [k, v] of Object.entries(value)) o[k] = interpolate(v, scope, { report, path: path ? `${path}.${k}` : k, functions, allowRuntime, known }); return o; }
  return value;
}

function one(seg, scope, { report, path, functions, allowRuntime, known }) {
  let ast;
  try { ast = parse(seg.src); } catch (e) { report(`expression invalide « ${seg.src} » : ${e.message}.`, path, 'E_EXPR'); return { keep: true }; }
  const rs = roots(ast);
  const runtime = [...rs].filter(r => RUNTIME_ROOTS.has(r));
  if (runtime.length) {
    if (!allowRuntime) report(`« ${runtime[0]} » n'est connu qu'à l'affichage : utilisable seulement sur une page de collection ou dans un gabarit.`, path, 'E_EXPR');
    return { keep: true };
  }
  for (const r of rs) if (!(r in scope)) { const expected = Object.keys(scope); report(`variable inconnue « ${r} » dans « ${seg.src} ».`, path, 'E_UNKNOWN_REF', expected); return { keep: true }; }
  // Vérification statique des chemins sous les racines connues : une clé absente est une erreur (sauf | default).
  if (known !== false) for (const p of paths(ast)) {
    if (p.length < 2 || !(p[0] in scope)) continue;
    let cur = scope[p[0]]; let ok = true; const walked = [p[0]];
    for (const k of p.slice(1)) { if (cur && typeof cur === 'object' && k in cur) { cur = cur[k]; walked.push(k); } else { ok = false; break; } }
    if (!ok && !/\|\s*default/.test(seg.src)) {
      const parent = walked.reduce((o, k, i) => (i === 0 ? scope[k] : o?.[k]), null);
      const expected = parent && typeof parent === 'object' ? Object.keys(parent).slice(0, 30) : [];
      report(`« ${p.join('.')} » n'existe pas (${walked.join('.')} n'a pas de clé « ${p[walked.length]} »).`, path, 'E_UNKNOWN_REF', expected);
      return { keep: true };
    }
  }
  try { return { keep: false, value: evaluate(ast, scope, { functions }) }; }
  catch (e) { report(`« ${seg.src} » : ${e.message}.`, path, 'E_EXPR'); return { keep: true }; }
}

function toText(v) { if (v === null || v === undefined) return ''; if (Array.isArray(v)) return v.map(toText).join(', '); if (typeof v === 'object') return JSON.stringify(v); return String(v); }

/** Portée de compilation d'un projet : site, const, collections (listes d'éléments), plus page si fournie. */
export function projectScope(project, page = null) {
  const site = project.site?.site || {};
  const scope = { site, const: project.site?.constants || {}, collections: Object.fromEntries(Object.entries(project.collections || {}).map(([k, v]) => [k, v.items])) };
  if (page) scope.page = { id: page.id, route: page.data?.route, title: page.data?.seo?.title ?? null };
  return scope;
}

/** Résout les expressions de compilation : d'abord les données (site, constantes, produits, collections), puis les pages. */
export function resolveProject(project, errors) { resolveData(project, errors); resolvePages(project, errors); }

/** Phase 1 : site.yaml, produits, éléments bruts des collections. */
export function resolveData(project, errors) {
  const reporter = (file) => (message, path, code = 'E_EXPR', expected) => errors.push(err(code, { file, path, message, expected: expected && expected.length ? expected : undefined, hint: code === 'E_UNKNOWN_REF' ? 'Racines disponibles à la compilation : site, const, page, collections ; à l\'affichage : item (page de collection), product, order.' : 'Syntaxe : {{ site.name }}, {{ const.delai }}, {{ item.title | upper }}, {{ collections.realisations | count }}.' }));
  if (project.site && typeof project.site === 'object') {
    const scope0 = projectScope(project);
    // site.yaml : les expressions y lisent le site lui-même (tagline citant le téléphone, par exemple) ; constants résolues en premier.
    if (project.site.constants) project.site.constants = interpolate(project.site.constants, scope0, { report: reporter(project.siteFile), path: 'constants', allowRuntime: false });
    const scope1 = projectScope(project);
    if (project.site.site) project.site.site = interpolate(project.site.site, scope1, { report: reporter(project.siteFile), path: 'site', allowRuntime: false });
  }
  if (project.productsRaw && typeof project.productsRaw === 'object') project.productsRaw = interpolate(project.productsRaw, projectScope(project), { report: reporter(project.productsFile), path: '', allowRuntime: false });
  for (const [name, col] of Object.entries(project.collections || {})) {
    if (!col.raw) continue;
    col.raw = interpolate(col.raw, projectScope(project), { report: reporter(col.file), path: name, allowRuntime: false });
  }
}

/** Phase 2 : pages (seo, sections, dérivations), une fois les collections normalisées ({{ collections.x | count }}). */
export function resolvePages(project, errors) {
  const reporter = (file) => (message, path, code = 'E_EXPR', expected) => errors.push(err(code, { file, path, message, expected: expected && expected.length ? expected : undefined, hint: code === 'E_UNKNOWN_REF' ? 'Racines disponibles à la compilation : site, const, page, collections ; à l\'affichage : item (page de collection), product, order.' : 'Syntaxe : {{ site.name }}, {{ const.delai }}, {{ item.title | upper }}, {{ collections.realisations | count }}.' }));
  for (const page of project.pages) {
    if (!page.data || typeof page.data !== 'object') continue;
    const dynamic = typeof page.data.route === 'string' && page.data.route.includes('[id]');
    const rep = reporter(page.file);
    const scope = projectScope(project, page);
    if (page.data.seo) page.data.seo = interpolate(page.data.seo, scope, { report: rep, path: 'seo', allowRuntime: dynamic });
    if (Array.isArray(page.data.sections)) page.data.sections = interpolate(page.data.sections, scope, { report: rep, path: 'sections', allowRuntime: dynamic });
    for (const k of ['prepend', 'append', 'override']) if (page.data[k] !== undefined) page.data[k] = interpolate(page.data[k], scope, { report: rep, path: k, allowRuntime: dynamic });
  }
}

/** Les expressions d'affichage (item, product, order) ne sont permises que sur une page dynamique de la source correspondante. */
export function checkRuntimeExpressions(project, errors) {
  for (const page of project.pages) {
    if (!page.data || typeof page.data !== 'object') continue;
    const src = page.data.source;
    const allowed = src === 'products' ? ['product'] : src === 'orders' ? ['order'] : src ? ['item'] : [];
    const walk = (v, p) => {
      if (typeof v === 'string') {
        for (const seg of segments(v) || []) {
          if (seg.src === undefined) continue;
          let ast; try { ast = parse(seg.src); } catch { continue; }
          for (const r of roots(ast)) if (RUNTIME_ROOTS.has(r) && !allowed.includes(r)) errors.push(err('E_EXPR', { file: page.file, path: p, message: `« ${r} » n'est pas disponible ici${allowed.length ? ` (cette page expose ${allowed.join(', ')})` : ' (page sans source)'}.`, hint: r === 'item' ? 'item existe sur une page route: /…/[id] avec source: <collection>.' : r === 'product' ? 'product existe sur la page source: products.' : r === 'order' ? 'order existe sur la page source: orders.' : 'form et loop n\'existent que dans le gabarit d\'un composant.' }));
        }
        return;
      }
      if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${p}[${i}]`));
      else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, p ? `${p}.${k}` : k);
    };
    walk(page.data.sections, 'sections'); walk(page.data.seo, 'seo');
  }
}

export { truthy };
