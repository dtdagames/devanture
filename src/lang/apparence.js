// Bloc « apparence » d'un composant : des intentions de design par partie, compilées vers une feuille encadrée aux jetons du thème.
//
//   apparence:
//     section: fond surface
//     cartes: compactes, coins arrondis, ombre légère
//     étoiles: couleur d'accent
//     sur téléphone:
//       flèches: masquées
//
// Une partie est une primitive de la forme (au singulier ou au pluriel) ou un nom donné entre « » ; « section » vise la section entière.
// Une intention a une traduction fixe vers les jetons du thème, ou porte une valeur : une mesure (« largeur 620px »), une couleur
// (« fond #012c4a »), un nombre (« interligne 1.4 »). La valeur est vérifiée ; rien d'autre que ces intentions n'entre dans la feuille.
// Le même bloc s'écrit dans un composant (ses parties), dans une section d'une page (cette section-là) et dans le site (toutes les
// sections d'un composant).

const M = '(-?[0-9]+(?:[.,][0-9]+)?(?:px|rem|em|%|vw|vh|ch)|0|auto)';
const C = '(#[0-9a-f]{3,8}|rgba?\\([0-9., %]+\\)|transparent|blanc|noir)';
const mes = v => String(v).replace(',', '.');
const col = v => ({ blanc: '#fff', noir: '#000' })[v] || v.replace(/\s+/g, '');
const re = src => new RegExp('^' + src + '$');
/** Intentions à valeur : [motif, nom affiché, traduction]. Les mesures : px, rem, em, %, vw, vh, ch ; les couleurs : #hex, rgb(), rgba(), transparent, blanc, noir. */
export const VALUED = [
  [re('largeur ' + M), 'largeur <mesure>', m => `max-width:${mes(m[1])}`],
  [re('largeur fixe ' + M), 'largeur fixe <mesure>', m => `width:${mes(m[1])}`],
  [re('hauteur ' + M), 'hauteur <mesure>', m => `height:${mes(m[1])}`],
  [re('hauteur minimale ' + M), 'hauteur minimale <mesure>', m => `min-height:${mes(m[1])}`],
  [re('taille ' + M), 'taille <mesure>', m => `font-size:${mes(m[1])}`],
  [re('interligne ([0-9](?:[.,][0-9]+)?)'), 'interligne <nombre>', m => `line-height:${mes(m[1])}`],
  [re('graisse ([1-9]00)'), 'graisse <100 à 900>', m => `font-weight:${m[1]}`],
  [re('espacement des lettres ' + M), 'espacement des lettres <mesure>', m => `letter-spacing:${mes(m[1])}`],
  [re('marge au-dessus ' + M), 'marge au-dessus <mesure>', m => `margin-top:${mes(m[1])}`],
  [re('marge en dessous ' + M), 'marge en dessous <mesure>', m => `margin-bottom:${mes(m[1])}`],
  [re('marge [àa] gauche ' + M), 'marge à gauche <mesure>', m => `margin-left:${mes(m[1])}`],
  [re('marge [àa] droite ' + M), 'marge à droite <mesure>', m => `margin-right:${mes(m[1])}`],
  [re('espace int[ée]rieur ' + M + '(?: ' + M + ')?(?: ' + M + ')?(?: ' + M + ')?'), 'espace intérieur <mesure> [… jusqu\'à quatre : haut, droite, bas, gauche]', m => `padding:${m.slice(1).filter(Boolean).map(mes).join(' ')}`],
  [re('espace entre ' + M), 'espace entre <mesure>', m => `gap:${mes(m[1])}`],
  [re('coins ' + M), 'coins <mesure>', m => `border-radius:${mes(m[1])}`],
  [re('fond ' + C), 'fond <couleur>', m => `background:${col(m[1])}`],
  [re('couleur ' + C), 'couleur <couleur>', m => `color:${col(m[1])}`],
  [re('bordure ' + C), 'bordure <couleur>', m => `border:1px solid ${col(m[1])}`],
  [re('bordure en dessous(?: ' + C + ')?'), 'bordure en dessous [<couleur>]', m => `border-bottom:1px solid ${m[1] ? col(m[1]) : 'var(--color-border)'}`],
  [re('bordure au-dessus(?: ' + C + ')?'), 'bordure au-dessus [<couleur>]', m => `border-top:1px solid ${m[1] ? col(m[1]) : 'var(--color-border)'}`],
  [re('opacit[ée] (0(?:[.,][0-9]+)?|1)'), 'opacité <0 à 1>', m => `opacity:${mes(m[1])}`],
  [re('([2-6]) colonnes'), '<2 à 6> colonnes', m => `display:grid;grid-template-columns:repeat(${m[1]},minmax(0,1fr));gap:24px;align-items:start`],
  [re('haut ' + M), 'haut <mesure>', m => `top:${mes(m[1])}`],
  [re('bas ' + M), 'bas <mesure>', m => `bottom:${mes(m[1])}`],
  [re('gauche ' + M), 'gauche <mesure>', m => `left:${mes(m[1])}`],
  [re('droite ' + M), 'droite <mesure>', m => `right:${mes(m[1])}`],
];

export const INTENTS = [
  [/^compacte?s?$/, 'compactes', 'padding:12px 16px'],
  [/^a[ée]r[ée]e?s?$/, 'aérées', 'padding:28px 32px'],
  [/^coins arrondis$/, 'coins arrondis', 'border-radius:var(--radius)'],
  [/^coins droits$/, 'coins droits', 'border-radius:0'],
  [/^coins ronds$/, 'coins ronds', 'border-radius:999px'],
  [/^ombre l[ée]g[èe]re$/, 'ombre légère', 'box-shadow:0 2px 8px var(--color-border)'],
  [/^ombre marqu[ée]e$/, 'ombre marquée', 'box-shadow:0 8px 24px var(--color-border)'],
  [/^bordure$/, 'bordure', 'border:1px solid var(--color-border)'],
  [/^sans bordure$/, 'sans bordure', 'border:0'],
  [/^trait [àa] gauche$/, 'trait à gauche', 'border-left:4px solid var(--color-primary)'],
  [/^trait d'accent [àa] gauche$/, "trait d'accent à gauche", 'border-left:4px solid var(--color-accent)'],
  [/^fond (surface|neutre)$/, 'fond surface', 'background:var(--color-surface)'],
  [/^fond (principal|de couleur principale)$/, 'fond principal', 'background:var(--color-primary);color:var(--color-primary-fg)'],
  [/^fond (d'accent|accent)$/, "fond d'accent", 'background:var(--color-accent);color:var(--color-primary-fg)'],
  [/^fond (de page|clair)$/, 'fond de page', 'background:var(--color-bg)'],
  [/^sans fond$/, 'sans fond', 'background:transparent'],
  [/^couleur (d'accent|accent)$/, "couleur d'accent", 'color:var(--color-accent)'],
  [/^couleur principale$/, 'couleur principale', 'color:var(--color-primary)'],
  [/^couleur discr[èe]te$/, 'couleur discrète', 'color:var(--color-muted)'],
  [/^couleur (de succ[èe]s|succ[èe]s|verte)$/, 'couleur de succès', 'color:var(--color-success)'],
  [/^couleur (d'alerte|alerte)$/, "couleur d'alerte", 'color:var(--color-warning)'],
  [/^couleur (de danger|danger|d'erreur)$/, 'couleur de danger', 'color:var(--color-danger)'],
  [/^centr[ée]e?s?$/, 'centré', 'text-align:center'],
  [/^[àa] gauche$/, 'à gauche', 'text-align:left'],
  [/^[àa] droite$/, 'à droite', 'text-align:right'],
  [/^tr[èe]s grande?s?$/, 'très grand', 'font-size:2rem;line-height:1.2'],
  [/^grande?s?$/, 'grand', 'font-size:1.25rem'],
  [/^petite?s?$/, 'petit', 'font-size:.875rem'],
  [/^gras$/, 'gras', 'font-weight:700'],
  [/^italiques?$/, 'italique', 'font-style:italic'],
  [/^majuscules$/, 'majuscules', 'text-transform:uppercase;letter-spacing:.06em'],
  [/^police des titres$/, 'police des titres', 'font-family:var(--font-heading)'],
  [/^en ligne$/, 'en ligne', 'display:flex;flex-wrap:wrap;align-items:center;gap:12px'],
  [/^empil[ée]e?s?$/, 'empilés', 'display:flex;flex-direction:column;gap:12px'],
  [/^serr[ée]e?s?$/, 'serrés', 'gap:8px'],
  [/^espac[ée]e?s?$/, 'espacés', 'gap:32px'],
  [/^[ée]troite?s?$/, 'étroit', 'max-width:720px;margin-left:auto;margin-right:auto'],
  [/^largeur petite$/, 'largeur petite', 'width:min(260px,75vw)'],
  [/^largeur moyenne$/, 'largeur moyenne', 'width:min(340px,80vw)'],
  [/^largeur grande$/, 'largeur grande', 'width:min(460px,90vw)'],
  [/^masqu[ée]e?s?$/, 'masqués', 'display:none'],
  [/^deux colonnes$/, 'deux colonnes', 'display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:32px;align-items:start'],
  [/^trois colonnes$/, 'trois colonnes', 'display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px;align-items:start'],
  [/^une colonne$/, 'une colonne', 'grid-template-columns:1fr'],
  [/^espace au-dessus$/, 'espace au-dessus', 'margin-top:24px'],
  [/^espace en dessous$/, 'espace en dessous', 'margin-bottom:24px'],
  [/^sans marge$/, 'sans marge', 'margin:0'],
  // Placement : une partie posée sur une autre (un titre sur une photo), épinglée dans un coin, poussée d'un côté.
  [/^cadre$/, 'cadre', 'position:relative;overflow:hidden'],
  [/^rep[èe]re$/, 'repère', 'position:relative'],
  [/^pos[ée]e?s? en haut$/, 'posé en haut', 'position:absolute;left:0;right:0;top:0;margin:0'],
  [/^pos[ée]e?s? en bas$/, 'posé en bas', 'position:absolute;left:0;right:0;bottom:0;margin:0'],
  [/^[ée]pingl[ée]e?s? en haut [àa] droite$/, 'épinglé en haut à droite', 'position:absolute;top:0;right:0'],
  [/^[ée]pingl[ée]e?s? en haut [àa] gauche$/, 'épinglé en haut à gauche', 'position:absolute;top:0;left:0'],
  [/^[ée]pingl[ée]e?s? en bas [àa] droite$/, 'épinglé en bas à droite', 'position:absolute;bottom:0;right:0'],
  [/^[ée]pingl[ée]e?s? en bas [àa] gauche$/, 'épinglé en bas à gauche', 'position:absolute;bottom:0;left:0'],
  [/^collante?s?$/, 'collant', 'position:sticky;top:0'],
  [/^non collante?s?$/, 'non collant', 'position:relative;top:auto'],
  [/^[àa] sa place$/, 'à sa place', 'position:static'],
  [/^pouss[ée]e?s? [àa] droite$/, 'poussé à droite', 'margin-left:auto;margin-right:0'],
  [/^pouss[ée]e?s? [àa] gauche$/, 'poussé à gauche', 'margin-right:auto;margin-left:0'],
  [/^pleine largeur$/, 'pleine largeur', 'max-width:none;width:100%'],
  [/^contenu centr[ée]$/, 'contenu centré', 'justify-content:center'],
  [/^contenu [àa] droite$/, 'contenu à droite', 'justify-content:flex-end'],
  [/^contenu r[ée]parti$/, 'contenu réparti', 'justify-content:space-between'],
  [/^voile sombre$/, 'voile sombre', 'background:linear-gradient(transparent,rgba(0,0,0,.7));color:#fff'],
  [/^ombre du texte$/, 'ombre du texte', 'text-shadow:0 1px 4px rgba(0,0,0,.6)'],
  [/^sans ombre$/, 'sans ombre', 'box-shadow:none;text-shadow:none'],
  [/^image couvrante$/, 'image couvrante', 'width:100%;height:100%;object-fit:cover'],
  [/^soulign[ée]e?s?$/, 'souligné', 'text-decoration:underline'],
  [/^sans soulignement$/, 'sans soulignement', 'text-decoration:none'],
  [/^sans puces$/, 'sans puces', 'list-style:none;padding-left:0'],
  [/^graisse normale$/, 'graisse normale', 'font-weight:400'],
  [/^casse normale$/, 'casse normale', 'text-transform:none;letter-spacing:normal'],
  [/^police du texte$/, 'police du texte', 'font-family:var(--font-body)'],
  [/^couleur du texte$/, 'couleur du texte', 'color:var(--color-fg)'],
  [/^en bloc$/, 'en bloc', 'display:block'],
  [/^visibles?$/, 'visible', 'display:revert'],
];
export const INTENT_NAMES = INTENTS.map(i => i[1]);
export const VALUED_NAMES = VALUED.map(i => i[1]);
/** « cartes, sur téléphone » : la partie et l'écran sur une même ligne (l'écriture d'une page et du site, à plat). */
const FLAT_MEDIA = /^(.*?)\s*,\s*(sur t[ée]l[ée]phone|sur grand [ée]cran)$/i;
const MEDIA = { 'sur téléphone': '(max-width:760px)', 'sur grand écran': '(min-width:1024px)' };

const norm = s => String(s).trim().toLowerCase().replace(/\s+/g, ' ');
const slug = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
/** Formes d'un nom de partie à essayer : tel quel, au singulier, en version sans accent. */
export function partCandidates(k) {
  const n = norm(k); const out = new Set([n, n.replace(/s$/, ''), n.replace(/x$/, ''), n + 's']);
  for (const x of [...out]) out.add(slug(x));
  return [...out];
}
/** Parties que l'apparence vise : la forme leur donne une classe. */
export function wantedParts(block) {
  const want = new Set();
  const visit = b => { if (!b || typeof b !== 'object' || Array.isArray(b)) return; for (const [k, v] of Object.entries(b)) { if (MEDIA[norm(k)]) visit(v); else for (const c of partCandidates(k.replace(/\s*,\s*sur (t[ée]l[ée]phone|grand [ée]cran)$/i, ''))) want.add(c); } };
  visit(block);
  return want;
}

function lev(a, b) { const d = Array.from({ length: a.length + 1 }, (_, i) => [i]); for (let j = 1; j <= b.length; j++) d[0][j] = j; for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); return d[a.length][b.length]; }
const nearest = (w, list) => { let best = null, bd = Infinity; for (const c of list) { const d = lev(w, c); if (d < bd) { bd = d; best = c; } } return bd <= Math.max(2, Math.floor(w.length / 3)) ? best : null; };

const splitIntents = v => String(v ?? '').split(/,(?![^(]*\))(?!(?<=[0-9],)[0-9])/).map(x => x.trim()).filter(Boolean);
const mediaOf = k => MEDIA[norm(k).replace('telephone', 'téléphone').replace('ecran', 'écran')];
/** Traduction d'une intention du langage (fixe ou à valeur) ; null si ce n'en est pas une. */
function builtin(n) {
  const i = INTENTS.find(([re]) => re.test(n));
  if (i) return i[2];
  for (const [re, , css] of VALUED) { const m = re.exec(n); if (m) return css(m); }
  return null;
}
/**
 * Intentions nommées par le site (site › intentions) : { nom: 'intention, intention', 'nom, sur téléphone': '…' }. Chacune vaut une
 * liste d'intentions du langage ; elle ne porte pas le nom d'une intention existante et n'en emploie pas d'autre du site.
 * Renvoie { custom: Map nom → { base, media: { requête: intentions } }, errors: [{ key, message }] }.
 */
export function siteIntents(block) {
  const custom = new Map(), errors = [];
  if (block === undefined || block === null) return { custom, errors };
  if (typeof block !== 'object' || Array.isArray(block)) return { custom, errors: [{ key: null, message: 'intentions attend { nom: « intention, intention » }' }] };
  for (const [k, v] of Object.entries(block)) {
    const fm = FLAT_MEDIA.exec(k), name = norm(fm ? fm[1] : k);
    if (!/^[a-zà-öø-ÿœ][a-zà-öø-ÿœ0-9' -]*$/.test(name)) { errors.push({ key: k, message: `nom d'intention « ${name} » : des lettres, des chiffres, des espaces, des tirets` }); continue; }
    if (builtin(name) !== null || VALUED_NAMES.some(x => name === x.replace(/ [\[<].*$/, ''))) { errors.push({ key: k, message: `« ${name} » est déjà une intention du langage` }); continue; }
    if (typeof v !== 'string' || !v.trim()) { errors.push({ key: k, message: `« ${k} » : attendu des intentions sur une ligne` }); continue; }
    const bad = splitIntents(v).filter(x => builtin(norm(x)) === null);
    if (bad.length) { errors.push({ key: k, message: `« ${k} » : ${bad.map(x => `« ${x} »`).join(', ')} ${bad.length > 1 ? 'ne sont pas des intentions' : 'n\'est pas une intention'} du langage (une intention du site n'en emploie pas d'autre du site)` }); continue; }
    const e = custom.get(name) || { base: '', media: {} };
    if (fm) e.media[mediaOf(fm[2])] = v; else e.base = v;
    custom.set(name, e);
  }
  return { custom, errors };
}

/** Compile le bloc. parts : Map nom → sélecteur, produite par la forme. Renvoie { css, errors: [{ path, message, ref }] }. */
/**
 * opts.scope : sélecteur de la section visée quand ce n'est pas tout le composant (une section d'une page porte sa classe d'apparence).
 * opts.custom : intentions nommées par le site (siteIntents), employées comme celles du langage.
 */
/** Parties génériques, pour l'apparence dite hors du composant : une primitive que la forme n'a pas nommée se vise par sa balise. */
export const GENERIC_PARTS = { 'titre principal': 'h1', 'grand titre': 'h2', titre: 'h2,h3', 'sous-titre': 'h3', texte: 'p', lien: 'a', bouton: '.btn', image: 'img', carte: '.card', liste: 'ul,ol', 'élément': 'li', 'en-tête': '.section-head', citation: 'blockquote' };

export function compileApparence(block, { parts, sectionClass, scope = null, custom = null, outside = false }) {
  const rules = [], list = []; let cur = null;
  // Chaque erreur garde la clé en cours (ref), pour retrouver sa ligne dans le manifeste.
  const errors = { push: e => list.push({ ...e, ref: e.ref ?? cur }) };
  const own = '.' + sectionClass, sec = scope || own;
  const selectorOf = (k, path) => {
    for (const c of partCandidates(k)) if (parts.has(c)) { const s = parts.get(c); return s === own ? sec : s.split(',').map(x => `${sec} ${x.trim()}`).join(','); }
    if (['section'].includes(norm(k))) return sec;
    if (outside) for (const c of partCandidates(k)) if (GENERIC_PARTS[c]) return GENERIC_PARTS[c].split(',').map(x => `${sec} ${x}`).join(',');
    const known = [...new Set([...parts.keys(), ...(outside ? Object.keys(GENERIC_PARTS) : [])])].filter(x => x !== 'section');
    const s = nearest(norm(k), known);
    errors.push({ path, message: `partie inconnue « ${k} » : ni une primitive de la forme ni un nom « » (parties : section, ${known.join(', ')})${s ? ` ; vouliez-vous dire « ${s} » ?` : ''}` });
    return null;
  };
  // Intentions : celles du langage, celles à valeur, puis celles que le site nomme (une liste d'intentions du langage sous un nom).
  // extras : ce qu'une intention du site ajoute pour un écran étroit ou large, à poser sur la même partie.
  const decls = (v, path, extras = null) => {
    const out = [];
    for (const raw of splitIntents(v)) {
      const n = norm(raw), one = builtin(n);
      if (one !== null) { out.push(one); continue; }
      const mine = custom?.get(n);
      if (mine) {
        if (mine.base) out.push(decls(mine.base, path));
        for (const [mq, value] of Object.entries(mine.media)) { if (extras) extras.push([mq, decls(value, path)]); else errors.push({ path, message: `« ${raw} » règle aussi un écran (${Object.keys(mine.media).map(q => Object.keys(MEDIA).find(x => MEDIA[x] === q) || q).join(', ')}) : employez-la hors d'un bloc d'écran` }); }
        continue;
      }
      // Une intention à valeur mal écrite : dire la forme attendue plutôt que toute la liste.
      const head = VALUED_NAMES.filter(x => n.startsWith(x.replace(/ [\[<].*$/, '') + ' ') || n === x.replace(/ [\[<].*$/, '')).sort((x, y) => y.length - x.length)[0];
      const names = [...INTENT_NAMES, ...(custom ? custom.keys() : [])], near = nearest(n, names);
      if (head && !near) { errors.push({ path, message: `« ${raw} » : attendu « ${head} » (mesure : un nombre et px, rem, em, %, vw, vh ou ch ; couleur : #hex, rgb(), rgba(), transparent, blanc, noir)` }); continue; }
      errors.push({ path, message: `intention inconnue « ${raw} »${near ? ` ; vouliez-vous dire « ${near} » ?` : ''} (intentions : ${INTENT_NAMES.join(', ')} ; à valeur : ${VALUED_NAMES.join(', ')}${custom?.size ? ` ; du site : ${[...custom.keys()].join(', ')}` : ''})` });
    }
    return out.filter(Boolean).join(';');
  };
  const visit = (b, path, media) => {
    if (!b || typeof b !== 'object' || Array.isArray(b)) { errors.push({ path, message: 'attendu : « partie: intention, intention » par ligne' }); return; }
    for (const [k, v] of Object.entries(b)) {
      const p = `${path}.${k}`; cur = { in: b, at: k };
      if (MEDIA[norm(k)]) { if (media) errors.push({ path: p, message: 'un bloc d\'écran ne se place pas dans un autre' }); else visit(v, p, MEDIA[norm(k)]); continue; }
      const fm = FLAT_MEDIA.exec(k), part = fm ? fm[1] : k, med = fm ? mediaOf(fm[2]) : media;
      if (fm && media) { errors.push({ path: p, message: 'un bloc d\'écran ne se place pas dans un autre' }); continue; }
      if (v && typeof v === 'object') { errors.push({ path: p, message: `« ${k} » : attendu des intentions sur une ligne (« partie: intention, intention »)` }); continue; }
      const extras = med ? null : [];
      const sel = selectorOf(part, p); const d = decls(v, p, extras);
      if (sel && d) rules.push(med ? `@media ${med}{${sel}{${d}}}` : `${sel}{${d}}`);
      if (sel) for (const [mq, dd] of extras || []) if (dd) rules.push(`@media ${mq}{${sel}{${dd}}}`);
    }
  };
  visit(block, 'apparence', null);
  return { css: rules.join('\n') + (rules.length ? '\n' : ''), errors: list };
}
