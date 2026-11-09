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
// Aucune valeur libre : chaque intention a une traduction fixe vers les jetons du thème.

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
];
export const INTENT_NAMES = INTENTS.map(i => i[1]);
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
  const visit = b => { if (!b || typeof b !== 'object' || Array.isArray(b)) return; for (const [k, v] of Object.entries(b)) { if (MEDIA[norm(k)]) visit(v); else for (const c of partCandidates(k)) want.add(c); } };
  visit(block);
  return want;
}

function lev(a, b) { const d = Array.from({ length: a.length + 1 }, (_, i) => [i]); for (let j = 1; j <= b.length; j++) d[0][j] = j; for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); return d[a.length][b.length]; }
const nearest = (w, list) => { let best = null, bd = Infinity; for (const c of list) { const d = lev(w, c); if (d < bd) { bd = d; best = c; } } return bd <= Math.max(2, Math.floor(w.length / 3)) ? best : null; };

/** Compile le bloc. parts : Map nom → sélecteur, produite par la forme. Renvoie { css, errors: [{ path, message, ref }] }. */
export function compileApparence(block, { parts, sectionClass }) {
  const rules = [], list = []; let cur = null;
  // Chaque erreur garde la clé en cours (ref), pour retrouver sa ligne dans le manifeste.
  const errors = { push: e => list.push({ ...e, ref: e.ref ?? cur }) };
  const sec = '.' + sectionClass;
  const selectorOf = (k, path) => {
    for (const c of partCandidates(k)) if (parts.has(c)) { const s = parts.get(c); return s === sec ? sec : `${sec} ${s}`; }
    if (['section'].includes(norm(k))) return sec;
    const known = [...parts.keys()].filter(x => x !== 'section');
    const s = nearest(norm(k), known);
    errors.push({ path, message: `partie inconnue « ${k} » : ni une primitive de la forme ni un nom « » (parties : section, ${known.join(', ')})${s ? ` ; vouliez-vous dire « ${s} » ?` : ''}` });
    return null;
  };
  const decls = (v, path) => {
    const out = [];
    for (const raw of String(v ?? '').split(',').map(x => x.trim()).filter(Boolean)) {
      const i = INTENTS.find(([re]) => re.test(norm(raw)));
      if (i) out.push(i[2]);
      else { const s = nearest(norm(raw), INTENT_NAMES); errors.push({ path, message: `intention inconnue « ${raw} »${s ? ` ; vouliez-vous dire « ${s} » ?` : ''} (intentions : ${INTENT_NAMES.join(', ')})` }); }
    }
    return out.join(';');
  };
  const visit = (b, path, media) => {
    if (!b || typeof b !== 'object' || Array.isArray(b)) { errors.push({ path, message: 'attendu : « partie: intention, intention » par ligne' }); return; }
    for (const [k, v] of Object.entries(b)) {
      const p = `${path}.${k}`; cur = { in: b, at: k };
      if (MEDIA[norm(k)]) { if (media) errors.push({ path: p, message: 'un bloc d\'écran ne se place pas dans un autre' }); else visit(v, p, MEDIA[norm(k)]); continue; }
      const sel = selectorOf(k, p); const d = decls(v, p);
      if (sel && d) rules.push(media ? `@media ${media}{${sel}{${d}}}` : `${sel}{${d}}`);
    }
  };
  visit(block, 'apparence', null);
  return { css: rules.join('\n') + (rules.length ? '\n' : ''), errors: list };
}
