// Composant écrit comme un plan : components/<nom>/composant.md à la place de manifest.yaml.
//
// Ce sont les mêmes lignes en français que le format langage (données, forme, apparence, fonctionnement), sans YAML :
// un titre, une description, puis une section par bloc, en puces. Rien à mettre entre guillemets, pas de « | » de bloc.
//
//   # promo
//   Bandeau d'offre du moment : le texte de l'offre, un code et une date de fin.
//
//   Mots-clés : offre, promotion
//
//   ## Données
//   - text : texte — l'offre du moment
//   - code : texte, facultatif — code à donner
//
//   ## Forme
//   section, conteneur « promo-inner » :
//   - texte : **Offre du moment :** {{ text }}
//   - si code :
//     - texte « promo-code » : Code **{{ code }}**
//
//   ## Apparence
//   - promo-inner : fond d'accent, coins arrondis
//
//   ## Exemple
//   ```
//   ## promo
//   Text : -15 % sur l'entretien
//   ```
//
// Le lecteur rend la structure qu'aurait donnée le YAML (un objet manifeste) et la ligne de chaque clé, pour que les erreurs des
// blocs citent la ligne du plan. Une ligne sans rôle est une erreur, à sa ligne.
import YAML from 'yaml';

const norm = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
/** Sections d'un plan de composant → clé du manifeste. maps : sections lues comme des données nommées (« - nom : valeur »). */
const SECTIONS = { donnees: 'données', calcule: 'calculé', fonctionnement: 'fonctionnement', forme: 'forme', apparence: 'apparence', exemple: 'example', props: 'props' };
const MAPS = new Set(['données', 'calculé', 'fonctionnement', 'apparence']);
export const SECTION_TITLES = { 'données': 'Données', 'calculé': 'Calculé', fonctionnement: 'Fonctionnement', forme: 'Forme', apparence: 'Apparence', example: 'Exemple', props: 'Props' };
const HEAD = [[/^ordre$/, 'order'], [/^mots[- ]cles$/, 'intents'], [/^comportements$/, 'behaviors']];
/** Un nombre écrit sans détour est un nombre, comme en YAML ; tout le reste est le texte tel qu'écrit. */
const scalar = s => (/^-?\d+(\.\d+)?$/.test(s) && String(Number(s)) === s ? Number(s) : s);

/** Coupe « clé : valeur » au premier deux-points suivi d'une espace ou de la fin, hors « » et {{ }}. Renvoie [clé, valeur | null] ou null. */
export function splitKey(text) {
  let q = 0, b = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '«') q++; else if (c === '»') q = Math.max(0, q - 1);
    else if (c === '{' && text[i + 1] === '{') { b++; i++; } else if (c === '}' && text[i + 1] === '}') { b = Math.max(0, b - 1); i++; }
    else if (c === ':' && !q && !b && (i === text.length - 1 || /\s/.test(text[i + 1]))) { const v = text.slice(i + 1).trim(); return [text.slice(0, i).trim(), v === '' ? null : v]; }
  }
  return null;
}

/** Lignes d'un plan : titres, puces (avec leur retrait), notes, blocs ```, texte. */
function scan(text) {
  const lines = String(text).replace(/\r\n/g, '\n').replace(/^﻿/, '').split('\n'), out = [];
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i], l = raw.trim(), n = i + 1;
    // Un bloc s'ouvre par trois accents graves ou plus et se ferme par le même nombre : un bloc peut ainsi en contenir un autre.
    const open = /^(`{3,})(.*)$/.exec(l);
    if (open) { const lang = open[2].trim().toLowerCase(), body = []; let j = i + 1; for (; j < lines.length && lines[j].trim() !== open[1]; j++) body.push(lines[j]); out.push({ kind: 'fence', line: n, lang, text: body.join('\n'), closed: j < lines.length }); i = j; continue; }
    if (!l) continue;
    if (/^>/.test(l)) { out.push({ kind: 'note', line: n, text: l.replace(/^>\s?/, '') }); continue; }
    let m;
    if ((m = /^(#{1,6})\s+(.*)$/.exec(l))) { out.push({ kind: 'h' + m[1].length, line: n, text: m[2].trim() }); continue; }
    if ((m = /^(\s*)-\s+(.*)$/.exec(raw))) { out.push({ kind: 'item', line: n, indent: m[1].replace(/\t/g, '  ').length, text: m[2].trim() }); continue; }
    out.push({ kind: 'text', line: n, text: l });
  }
  return out;
}
/** Puces qui se suivent → arbre par le retrait. */
function tree(items) {
  const root = { children: [], indent: -1 }, stack = [root];
  for (const it of items) { while (stack.length > 1 && it.indent <= stack[stack.length - 1].indent) stack.pop(); const node = { text: it.text, line: it.line, indent: it.indent, children: [] }; stack[stack.length - 1].children.push(node); stack.push(node); }
  return root.children;
}

/** Lecteurs de puces : données nommées (« - nom : valeur », retrait pour ce qui est dessous) et éléments d'une forme. */
function builders(fail, own, members) {
  const toMap = (nodes, at) => {
    const obj = {}, m = new Map(); own.set(obj, at); members.set(obj, m);
    for (const n of nodes) {
      const kv = splitKey(n.text) || [n.text, null], key = kv[0];
      if (!key) { fail(n.line, 'nom manquant avant « : »'); continue; }
      if (key in obj) { fail(n.line, `« ${key} » est dit deux fois`); continue; }
      if (n.children.length && kv[1] !== null) { fail(n.line, `« ${key} » a une valeur sur sa ligne et des puces en dessous : l'un ou l'autre`); continue; }
      m.set(key, n.line);
      obj[key] = n.children.length ? toMap(n.children, n.line) : kv[1] === null ? null : scalar(kv[1]);
    }
    return obj;
  };
  const toList = (nodes, at) => {
    const list = [], m = new Map(); own.set(list, at); members.set(list, m);
    nodes.forEach((n, i) => {
      m.set(String(i), n.line);
      const kv = splitKey(n.text);
      if (!kv) { if (n.children.length) fail(n.children[0].line, `des puces en retrait sous « ${n.text} », qui n'a pas de « : »`); list.push(n.text); return; }
      if (n.children.length && kv[1] !== null) { fail(n.line, `« ${kv[0]} » a une valeur sur sa ligne et des puces en dessous : l'un ou l'autre`); return; }
      const node = { [kv[0]]: n.children.length ? toList(n.children, n.line) : kv[1] === null ? null : scalar(kv[1]) };
      own.set(node, n.line); members.set(node, new Map([[kv[0], n.line]]));
      list.push(node);
    });
    return list;
  };
  return { toMap, toList };
}
/** Forme lue de ses blocs : une ligne d'ouverture facultative (« section, conteneur « x » : »), puis les éléments en puces. */
function readForme(body, at, toList, fail, own, members) {
  const items = body.filter(b => b.kind === 'item'), opening = body.filter(b => b.kind === 'text');
  if (opening.length > 1 || (opening.length && items.length && opening[0].line > items[0].line)) fail(opening[opening.length - 1].line, 'la forme a au plus une ligne d\'ouverture, avant ses puces');
  const list = toList(tree(items), at);
  if (!opening.length) return list;
  const kv = splitKey(opening[0].text);
  if (!kv || kv[1] !== null) { fail(opening[0].line, 'la ligne d\'ouverture de la forme finit par « : » (ex. « section, conteneur « x » : »)'); return list; }
  const root = { [kv[0]]: list }; own.set(root, opening[0].line); members.set(root, new Map([[kv[0], opening[0].line]]));
  return root;
}

/**
 * Lit le plan d'un composant. Renvoie { value (le manifeste, comme lu d'un manifest.yaml), lineOf (ligne d'un objet lu ou d'un
 * membre { in, at }), errors: [{ line, message }] }. value.example est { document: texte, line } : l'exemple écrit comme une
 * section de page, que le catalogue convertit quand il connaît les données du composant.
 */
export function parseComponentOutline(text) {
  const blocks = scan(text), errors = [], own = new WeakMap(), members = new WeakMap();
  const fail = (line, message) => errors.push({ line, message });
  const value = {}, top = new Map(); members.set(value, top); own.set(value, 1);
  const { toMap, toList } = builders(fail, own, members);
  // --- en-tête : « # nom », description, « Ordre : », « Mots-clés : », « Comportements : »
  const firstSection = blocks.findIndex(b => b.kind === 'h2'), head = firstSection < 0 ? blocks : blocks.slice(0, firstSection);
  const h1 = head.find(b => b.kind === 'h1');
  if (!h1) fail(1, 'un plan de composant commence par son nom : « # nom »'); else { value.name = h1.text; top.set('name', h1.line); }
  const description = [];
  for (const b of head) {
    if (b === h1 || b.kind === 'note') continue;
    if (b.kind !== 'text') { fail(b.line, b.kind === 'h1' ? 'un seul « # » par plan : c\'est le nom du composant' : 'avant la première section, seuls le nom, la description et « Ordre », « Mots-clés », « Comportements » sont lus'); continue; }
    const kv = splitKey(b.text), hk = kv ? HEAD.find(([re]) => re.test(norm(kv[0]))) : null;
    if (!hk) { if (!description.length) top.set('description', b.line); description.push(b.text); continue; }
    if (hk[1] in value) { fail(b.line, `« ${kv[0]} » est dit deux fois`); continue; }
    top.set(hk[1], b.line);
    if (hk[1] === 'order') { if (!/^\d+$/.test(kv[1] || '')) fail(b.line, 'Ordre attend un nombre entier'); else value.order = Number(kv[1]); }
    else value[hk[1]] = (kv[1] || '').split(/\s*,\s*/).filter(Boolean);
  }
  if (description.length) value.description = description.join(' ');
  // --- sections
  const starts = blocks.map((b, i) => (b.kind === 'h2' ? i : -1)).filter(i => i >= 0);
  const sections = {};
  starts.forEach((s, n) => {
    const h = blocks[s], key = SECTIONS[norm(h.text)], body = blocks.slice(s + 1, starts[n + 1] ?? blocks.length).filter(b => b.kind !== 'note');
    if (!key) { fail(h.line, `section inconnue : « ${h.text} » (sections : ${Object.values(SECTION_TITLES).join(', ')})`); return; }
    if (key in sections) { fail(h.line, `la section « ${h.text} » est dite deux fois`); return; }
    top.set(key, h.line);
    if (key === 'example' || key === 'props') {
      const fence = body.find(b => b.kind === 'fence');
      for (const b of body) if (b !== fence) fail(b.line, `sous « ## ${h.text} », un seul bloc entre \`\`\` est lu`);
      if (!fence) { fail(h.line, `« ## ${h.text} » attend un bloc entre \`\`\``); return; }
      if (!fence.closed) { fail(fence.line, 'bloc ``` non fermé'); return; }
      if (key === 'example') sections.example = { document: fence.text, line: fence.line };
      else { try { sections.props = YAML.parse(fence.text); } catch (e) { fail(fence.line, `bloc yaml illisible : ${String(e.message).split('\n')[0]}`); } }
      return;
    }
    for (const b of body) if (b.kind !== 'item' && !(key === 'forme' && b.kind === 'text')) fail(b.line, b.kind === 'fence' ? 'pas de bloc ``` ici' : `ligne sans rôle sous « ## ${h.text} » : chaque ligne est une puce « - nom : valeur »`);
    const items = body.filter(b => b.kind === 'item');
    if (MAPS.has(key)) { sections[key] = toMap(tree(items), h.line); return; }
    sections.forme = readForme(body, h.line, toList, fail, own, members);
  });
  // Ordre des clés : celui d'un manifeste.
  for (const k of ['order']) if (k in value) { const v = value[k]; delete value[k]; value[k] = v; }
  const ordered = {}; for (const k of ['name', 'order', 'description']) if (k in value) ordered[k] = value[k];
  for (const k of ['props', 'données', 'calculé', 'fonctionnement', 'forme', 'apparence', 'example']) if (k in sections) ordered[k] = sections[k];
  for (const k of ['intents', 'behaviors']) if (k in value) ordered[k] = value[k];
  members.set(ordered, top); own.set(ordered, 1);
  const lineOf = ref => {
    if (!ref || typeof ref !== 'object') return null;
    if ('in' in ref && 'at' in ref && ref.in && typeof ref.in === 'object') return members.get(ref.in)?.get(String(ref.at)) ?? own.get(ref.in) ?? null;
    return own.get(ref) ?? null;
  };
  return { value: ordered, lineOf, errors: errors.sort((a, b) => a.line - b.line) };
}

/**
 * Écrit le plan d'un composant depuis son manifeste. example : lignes de l'exemple écrit comme une section de page ;
 * notes : { clé du manifeste → [lignes de commentaire] }, reprises en « > … » en tête de section.
 * Renvoie { text } ou { error } ; le plan écrit est relu et doit rendre le manifeste.
 */
export function writeComponentOutline(manifest, { example = null, notes = {} } = {}) {
  const m = manifest || {}, out = [];
  const known = ['name', 'order', 'description', 'props', 'données', 'calculé', 'fonctionnement', 'forme', 'apparence', 'example', 'intents', 'behaviors'];
  const extra = Object.keys(m).filter(k => !known.includes(k));
  if (extra.length) return { error: `clé qui ne s'écrit pas en plan : ${extra.join(', ')}` };
  const line1 = v => typeof v === 'string' && v !== '' && v.trim() === v && !/\n/.test(v);
  if (!line1(m.name)) return { error: 'name manquant' };
  out.push(`# ${m.name}`);
  for (const n of notes.name || []) out.push(`> ${n}`);
  if (m.description !== undefined) { if (!line1(m.description)) return { error: 'description sur plusieurs lignes' }; out.push('', m.description); }
  const headLines = [];
  if (m.order !== undefined) headLines.push(`Ordre : ${m.order}`);
  if (m.intents !== undefined) { if (!Array.isArray(m.intents) || m.intents.some(x => !line1(x) || /,/.test(x))) return { error: 'intents illisibles en ligne' }; if (m.intents.length) headLines.push(`Mots-clés : ${m.intents.join(', ')}`); }
  if (m.behaviors !== undefined) { if (!Array.isArray(m.behaviors) || m.behaviors.some(x => !line1(x) || /,/.test(x))) return { error: 'behaviors illisibles en ligne' }; if (m.behaviors.length) headLines.push(`Comportements : ${m.behaviors.join(', ')}`); }
  if (headLines.length) out.push('', ...headLines);
  const val = v => (typeof v === 'number' ? String(v) : line1(v) ? v : undefined);
  const mapLines = (obj, depth) => {
    const ls = [];
    for (const [k, v] of Object.entries(obj)) {
      if (!line1(k)) return null;
      if (v === null) ls.push(`${'  '.repeat(depth)}- ${k}`);
      else if (typeof v === 'object' && !Array.isArray(v)) { const sub = mapLines(v, depth + 1); if (!sub) return null; ls.push(`${'  '.repeat(depth)}- ${k} :`, ...sub); }
      else { const t = val(v); if (t === undefined) return null; ls.push(`${'  '.repeat(depth)}- ${k} : ${t}`); }
    }
    return ls;
  };
  const listLines = (list, depth) => {
    const ls = [];
    for (const n of list) {
      if (typeof n === 'string') { if (!line1(n)) return null; ls.push(`${'  '.repeat(depth)}- ${n}`); continue; }
      if (!n || typeof n !== 'object' || Array.isArray(n) || Object.keys(n).length !== 1) return null;
      const [[k, v]] = Object.entries(n);
      if (Array.isArray(v)) { const sub = listLines(v, depth + 1); if (!sub) return null; ls.push(`${'  '.repeat(depth)}- ${k} :`, ...sub); }
      else if (v === null) ls.push(`${'  '.repeat(depth)}- ${k} :`);
      else { const t = val(v); if (t === undefined) return null; ls.push(`${'  '.repeat(depth)}- ${k} : ${t}`); }
    }
    return ls;
  };
  const section = (key, lines) => { out.push('', `## ${SECTION_TITLES[key]}`); for (const n of notes[key] || []) out.push(`> ${n}`); out.push(...lines); };
  for (const key of ['props', 'données', 'calculé', 'fonctionnement', 'forme', 'apparence', 'example']) {
    if (m[key] === undefined) continue;
    if (key === 'props') { section(key, ['```yaml', ...YAML.stringify(m.props, { lineWidth: 0 }).trimEnd().split('\n'), '```']); continue; }
    if (key === 'example') { if (!example) return { error: 'exemple qui ne s\'écrit pas comme une section de page' }; const bar = example.some(l => /^\s*```/.test(l)) ? '````' : '```'; section(key, [bar, ...example, bar]); continue; }
    if (MAPS.has(key)) { if (!m[key] || typeof m[key] !== 'object' || Array.isArray(m[key])) return { error: `${key} n'est pas un bloc de données nommées` }; const ls = mapLines(m[key], 0); if (!ls) return { error: `${key} : une valeur ne s'écrit pas sur une ligne` }; section(key, ls); continue; }
    const f = m.forme, rooted = f && typeof f === 'object' && !Array.isArray(f);
    if (rooted && (Object.keys(f).length !== 1 || !Array.isArray(Object.values(f)[0]))) return { error: 'forme : une seule ouverture, suivie de ses éléments' };
    const ls = listLines(rooted ? Object.values(f)[0] : f, 0);
    if (!Array.isArray(rooted ? Object.values(f)[0] : f) || !ls) return { error: 'forme : un élément ne s\'écrit pas sur une ligne' };
    section(key, [...(rooted ? [`${Object.keys(f)[0]} :`] : []), ...ls]);
  }
  const text = out.join('\n') + '\n';
  const back = parseComponentOutline(text);
  if (back.errors.length) return { error: `le plan écrit ne se relit pas : ligne ${back.errors[0].line}, ${back.errors[0].message}` };
  const strip = v => { const { example: _e, ...rest } = v; return rest; };
  if (JSON.stringify(strip(back.value)) !== JSON.stringify(strip(Object.fromEntries(Object.keys(back.value).filter(k => k in m).map(k => [k, m[k]]))))) return { error: 'le plan écrit ne rend pas le manifeste d\'origine' };
  if (Object.keys(m).some(k => !(k in back.value) && !(Array.isArray(m[k]) && !m[k].length))) return { error: 'une clé du manifeste manque dans le plan écrit' };
  return { text };
}

// ---------------------------------------------------------------------------------------------------------------------------
// Le vocabulaire en document : vocabulaire.md à la place de vocabulaire.yaml. Une section « ## mot » par mot, sa description,
// puis « ### Données », « ### Forme », « ### Apparence » en puces, « ### Gabarit » et « ### Feuille » en blocs ```.

const WORD_SECTIONS = { donnees: 'données', forme: 'forme', apparence: 'apparence', gabarit: 'gabarit', feuille: 'feuille' };
const WORD_TITLES = { 'données': 'Données', forme: 'Forme', apparence: 'Apparence', gabarit: 'Gabarit', feuille: 'Feuille' };

/** Lit un vocabulaire écrit en document. Renvoie { value: { mots: { nom: définition } }, lineOf, errors }. */
export function parseVocabularyOutline(text) {
  const blocks = scan(text), errors = [], own = new WeakMap(), members = new WeakMap();
  const fail = (line, message) => errors.push({ line, message });
  const { toMap, toList } = builders(fail, own, members);
  const mots = {}, names = new Map(); own.set(mots, 1); members.set(mots, names);
  const starts = blocks.map((b, i) => (b.kind === 'h2' ? i : -1)).filter(i => i >= 0);
  for (const b of blocks.slice(0, starts[0] ?? blocks.length)) if (b.kind !== 'note' && b.kind !== 'h1') fail(b.line, 'avant le premier mot, seuls le titre du document et des notes (« > … ») sont lus');
  if (blocks.filter(b => b.kind === 'h1').length > 1) fail(blocks.filter(b => b.kind === 'h1')[1].line, 'un seul « # » par document');
  starts.forEach((s, n) => {
    const h = blocks[s], body = blocks.slice(s + 1, starts[n + 1] ?? blocks.length).filter(b => b.kind !== 'note');
    if (h.text in mots) { fail(h.line, `mot dit deux fois : ${h.text}`); return; }
    const def = {}, m = new Map(); own.set(def, h.line); members.set(def, m); names.set(h.text, h.line);
    const subs = body.map((b, i) => (b.kind === 'h3' ? i : -1)).filter(i => i >= 0), description = [];
    for (const b of body.slice(0, subs[0] ?? body.length)) { if (b.kind !== 'text') { fail(b.line, 'sous un mot, la description vient d\'abord, en texte ; puis « ### Données », « ### Forme » ou « ### Gabarit »'); continue; } if (!description.length) m.set('description', b.line); description.push(b.text); }
    if (description.length) def.description = description.join(' ');
    subs.forEach((x, k) => {
      const sh = body[x], key = WORD_SECTIONS[norm(sh.text)], part = body.slice(x + 1, subs[k + 1] ?? body.length);
      if (!key) { fail(sh.line, `partie inconnue : « ${sh.text} » (parties d'un mot : ${Object.values(WORD_TITLES).join(', ')})`); return; }
      if (key in def) { fail(sh.line, `« ${sh.text} » est dit deux fois pour ce mot`); return; }
      m.set(key, sh.line);
      if (key === 'gabarit' || key === 'feuille') {
        const fence = part.find(b => b.kind === 'fence');
        for (const b of part) if (b !== fence) fail(b.line, `sous « ### ${sh.text} », un seul bloc entre \`\`\` est lu`);
        if (!fence || !fence.closed) { fail((fence || sh).line, `« ### ${sh.text} » attend un bloc entre \`\`\`, fermé`); return; }
        m.set(key, fence.line); def[key] = fence.text + '\n'; return;
      }
      for (const b of part) if (b.kind !== 'item' && !(key === 'forme' && b.kind === 'text')) fail(b.line, `ligne sans rôle sous « ### ${sh.text} » : chaque ligne est une puce « - nom : valeur »`);
      def[key] = key === 'forme' ? readForme(part, sh.line, toList, fail, own, members) : toMap(tree(part.filter(b => b.kind === 'item')), sh.line);
    });
    const ordered = {}; for (const k of ['description', 'données', 'forme', 'apparence', 'gabarit', 'feuille']) if (k in def) ordered[k] = def[k];
    own.set(ordered, h.line); members.set(ordered, m);
    mots[h.text] = ordered;
  });
  const value = { mots }; own.set(value, 1); members.set(value, new Map([['mots', 1]]));
  const lineOf = ref => {
    if (!ref || typeof ref !== 'object') return null;
    if ('in' in ref && 'at' in ref && ref.in && typeof ref.in === 'object') return members.get(ref.in)?.get(String(ref.at)) ?? own.get(ref.in) ?? null;
    return own.get(ref) ?? null;
  };
  return { value, lineOf, errors: errors.sort((a, b) => a.line - b.line) };
}

/** Écrit un vocabulaire en document. notes : lignes de commentaire reprises en tête. Renvoie { text } ou { error } ; le document écrit est relu. */
export function writeVocabularyOutline(doc, { notes = [], wordNotes = {}, title = 'Vocabulaire' } = {}) {
  if (!doc || typeof doc !== 'object' || !doc.mots || typeof doc.mots !== 'object' || Array.isArray(doc.mots) || Object.keys(doc).some(k => k !== 'mots')) return { error: 'un vocabulaire ne contient que « mots: »' };
  const line1 = v => typeof v === 'string' && v !== '' && v.trim() === v && !/\n/.test(v);
  const val = v => (typeof v === 'number' ? String(v) : line1(v) ? v : undefined);
  const mapLines = (obj, depth) => { const ls = []; for (const [k, v] of Object.entries(obj)) { if (!line1(k)) return null; if (v === null) ls.push(`${'  '.repeat(depth)}- ${k}`); else if (typeof v === 'object' && !Array.isArray(v)) { const sub = mapLines(v, depth + 1); if (!sub) return null; ls.push(`${'  '.repeat(depth)}- ${k} :`, ...sub); } else { const x = val(v); if (x === undefined) return null; ls.push(`${'  '.repeat(depth)}- ${k} : ${x}`); } } return ls; };
  const listLines = (list, depth) => { const ls = []; for (const n of list) { if (typeof n === 'string') { if (!line1(n)) return null; ls.push(`${'  '.repeat(depth)}- ${n}`); continue; } if (!n || typeof n !== 'object' || Array.isArray(n) || Object.keys(n).length !== 1) return null; const [[k, v]] = Object.entries(n); if (Array.isArray(v)) { const sub = listLines(v, depth + 1); if (!sub) return null; ls.push(`${'  '.repeat(depth)}- ${k} :`, ...sub); } else if (v === null) ls.push(`${'  '.repeat(depth)}- ${k} :`); else { const x = val(v); if (x === undefined) return null; ls.push(`${'  '.repeat(depth)}- ${k} : ${x}`); } } return ls; };
  const out = [`# ${title}`, ...notes.map(n => `> ${n}`)];
  for (const [name, def] of Object.entries(doc.mots)) {
    if (!line1(name) || !def || typeof def !== 'object' || Array.isArray(def)) return { error: `mot illisible : ${name}` };
    const extra = Object.keys(def).filter(k => !(k in WORD_TITLES) && k !== 'description');
    if (extra.length) return { error: `mot « ${name} » : clé qui ne s'écrit pas en document (${extra.join(', ')})` };
    out.push('', ...(wordNotes[name] || []).map(n => `> ${n}`), `## ${name}`);
    if (def.description !== undefined) { if (!line1(def.description)) return { error: `mot « ${name} » : description sur plusieurs lignes` }; out.push(def.description); }
    for (const key of ['données', 'forme', 'apparence', 'gabarit', 'feuille']) {
      if (def[key] === undefined) continue;
      out.push('', `### ${WORD_TITLES[key]}`);
      if (key === 'gabarit' || key === 'feuille') { const s = def[key]; if (typeof s !== 'string' || !s.endsWith('\n') || /^\s*```/m.test(s)) return { error: `mot « ${name} » : ${key} qui ne s'écrit pas dans un bloc` }; out.push('```' + (key === 'gabarit' ? 'html' : 'css'), ...s.slice(0, -1).split('\n'), '```'); continue; }
      if (key === 'forme') { const fo = def.forme, rooted = fo && typeof fo === 'object' && !Array.isArray(fo); const list = rooted ? Object.values(fo)[0] : fo; if ((rooted && Object.keys(fo).length !== 1) || !Array.isArray(list)) return { error: `mot « ${name} » : forme illisible` }; const ls = listLines(list, 0); if (!ls) return { error: `mot « ${name} » : un élément de la forme ne s'écrit pas sur une ligne` }; out.push(...(rooted ? [`${Object.keys(fo)[0]} :`] : []), ...ls); continue; }
      if (!def[key] || typeof def[key] !== 'object' || Array.isArray(def[key])) return { error: `mot « ${name} » : ${key} illisible` };
      const ls = mapLines(def[key], 0); if (!ls) return { error: `mot « ${name} » : une valeur de ${key} ne s'écrit pas sur une ligne` }; out.push(...ls);
    }
  }
  const text = out.join('\n') + '\n';
  const back = parseVocabularyOutline(text);
  if (back.errors.length) return { error: `le document écrit ne se relit pas : ligne ${back.errors[0].line}, ${back.errors[0].message}` };
  const sortTop = v => ({ mots: Object.fromEntries(Object.entries(v.mots).map(([k, d]) => [k, Object.fromEntries(Object.keys(d).sort().map(x => [x, d[x]]))])) });
  if (JSON.stringify(sortTop(back.value)) !== JSON.stringify(sortTop(doc))) return { error: 'le document écrit ne rend pas le vocabulaire d\'origine' };
  return { text };
}
