// Réécriture des phrases refusées d'un document.md. Un modèle propose une phrase dans une tournure connue ; il ne décide de rien :
//   1. deux contrôles sans modèle arrêtent une réécriture qui invente (un nombre absent de la phrase d'origine, une valeur
//      de choix, un texte entre « » changé, ajouté ou perdu) ;
//   2. le lecteur à règles (document.js) relit le document avec la phrase récrite : il reste seul juge de ce qui se lit ;
//   3. rien n'est accepté ici : la lecture reste à relire et à figer (« sitec lire <dossier> --accepter »).
// Ce que ces contrôles ne voient pas : une réécriture lisible qui dit autre chose que la phrase d'origine. La consigne l'interdit,
// la supposition du modèle est affichée, et c'est la lecture redite, puis acceptée, qui tranche.
import { readDocument, TOURNURES, NOMBRES, norm } from './document.js';

export const CHAMPS_EXEMPLE = "Pour s'inscrire, le visiteur choisit sa séance (Matin ou Soir), indique le nombre de personnes (par exemple 2), son nom et son e-mail ; il peut laisser un message.";
/** Formes que le lecteur lit aussi et que la table des tournures ne montre pas (le banc relit chacune). */
export const FORMES_VOISINES = [
  ['un titre, sans introduction', 'La section commence par un titre, donné par la page.'],
  ['des places sans groupe', 'Il y a 8 places.'],
  ['liste d\'attente, avec le message', 'Quand une séance est complète, l\'inscription va en liste d\'attente et le visiteur lit : « Vous êtes en liste d\'attente. »'],
  ['un seul envoi, sans groupe', 'Une même adresse e-mail ne s\'inscrit qu\'une fois.'],
  ['pas d\'e-mail au site', 'Nous ne sommes pas prévenus par e-mail.'],
];

const fnv = s => { let h = 0x811c9dc5; for (const c of String(s)) { h ^= c.codePointAt(0); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(16).padStart(8, '0').slice(0, 4); };
const oneLine = s => String(s).replace(/\s+/g, ' ').trim();

/** Les phrases que le lecteur refuse dans un document : [{ id, doc, line, phrase, message, hint, champs }]. L'identifiant porte la ligne et une empreinte de la phrase : une réponse faite pour un autre état du document ne s'applique pas. */
export function refusedSentences(text, name) {
  const r = readDocument(text, { name }), used = new Set(), out = [];
  for (const t of r.trace) {
    if (!t.error) continue;
    const at = r.errors.map((e, i) => [e, i]).filter(([e, i]) => !used.has(i) && e.line === t.line && !e.whole);
    const hit = at.find(([e]) => e.message.includes(t.text)) || at[0];
    if (hit) used.add(hit[1]);
    const message = hit ? hit[0].message : t.error;
    out.push({ id: `${name}:${t.line}:${fnv(t.text)}`, doc: name, line: t.line, phrase: t.text, message, hint: hit?.[0].hint || null, champs: /^phrase des champs/.test(message) });
  }
  return out;
}

export function buildSystemPrompt() {
  const tournures = [`- champs du formulaire : « ${CHAMPS_EXEMPLE} »`, ...TOURNURES.filter(t => t.id !== 'message_seul').map(t => `- ${t.label} : « ${t.exemple} »`)].join('\n');
  return `# Récrire des phrases pour un lecteur strict

Un compilateur lit des documents en français qui décrivent une section de site web avec un formulaire d'inscription. Il ne lit pas librement : il reconnaît un petit nombre de tournures, et il refuse toute phrase dont un mot n'a pas de rôle dans la tournure. Ta tâche : récrire des phrases qu'il a refusées pour qu'il les lise, **sans en changer le sens**.

## Ce que le lecteur sait lire

Une phrase par tournure (deux tournures peuvent être jointes par « et » ou « ; », ou faire deux phrases).

${tournures}

Il lit aussi ces formes voisines :

${FORMES_VOISINES.map(([l, e]) => `- ${l} : « ${e} »`).join('\n')}

## Ses règles

- Le plus sûr est de rester très près des phrases d'exemple : mêmes mots, mêmes constructions. Les synonymes courants passent souvent, les tours inhabituels non.
- Un nombre s'écrit en chiffres et doit avoir un rôle (le nombre de places). Aucun autre nombre dans la phrase, et jamais un nombre que la phrase d'origine ne donne pas.
- Un texte affiché au visiteur se donne entre « », tel quel, sans en changer un mot.
- Un champ du formulaire se désigne par les mots de son libellé dans la phrase des champs du document (« par séance », « comptées par personnes », « adresse e-mail »). Si un mot désigne deux champs, dis le libellé entier.
- Celui qui est prévenu par e-mail est le site : « nous ». Le lecteur ne connaît pas le nom du commerce.
- Les seules négations lues : « Il n'y a pas de liste d'attente. », « Il n'y a pas de limite de places. », « Nous ne sommes pas prévenus par e-mail. », « un titre, sans introduction », et « ne … qu'une fois ».
- Un nom de registre : minuscules sans accent, chiffres et _ , sans espace.

## Ce que tu ne dois jamais faire

Le lecteur ne sait dire que ce que disent ses tournures. Si la phrase d'origine dit **autre chose ou davantage** (une exception, une condition, une période, un prix, une mise en page, un autre destinataire, une règle que les tournures n'ont pas), tu ne dois pas la récrire en laissant tomber ce qu'elle dit : réponds \`null\` et dis en une phrase ce qui ne peut pas être dit. Une réécriture qui perd une partie du sens est pire qu'un refus.

Si ta réécriture repose sur une supposition (par exemple « le musée » désigne bien le site qui reçoit les e-mails), fais-la et dis la supposition dans \`hypothese\`.

## Ta réponse

Un tableau JSON, un objet par phrase, avec son identifiant recopié tel quel, et rien d'autre :

\`\`\`
[ { "id": "atelier:7:1a2b", "reecriture": "La phrase récrite. (ou deux phrases)", "hypothese": null, "raison": null },
  { "id": "atelier:9:3c4d", "reecriture": null, "hypothese": null, "raison": "ce qui ne peut pas être dit" } ]
\`\`\`
`;
}

/** docs : [{ name, text }] ; items : phrases refusées, avec attempt et refusal au tour de réparation. */
export function buildUserPrompt(docs, items) {
  const names = new Set(items.map(x => x.doc));
  const repair = items.some(x => x.attempt);
  return `## Les documents

${docs.filter(d => names.has(d.name)).map(d => `### Document « ${d.name} »\n\n\`\`\`\n${d.text.replace(/\r\n/g, '\n').trim()}\n\`\`\``).join('\n\n')}

## Les phrases à récrire
${repair ? '\nLe lecteur a relu une première réécriture et l\'a refusée : son message est cité. Reprends la phrase d\'origine, pas la réécriture, et réponds `null` si ce message montre qu\'elle ne peut pas être dite.\n' : ''}
${items.map(x => `- [${x.id}] ${x.phrase}${x.attempt ? `\n    réécriture refusée : ${x.attempt}\n    refus du lecteur : ${x.refusal}` : ''}`).join('\n')}

Réponds par le tableau JSON de ${items.length} objet${items.length > 1 ? 's' : ''}.
`;
}

/** La réponse du modèle : Map id → { rewrite, hypothese, raison }. */
export function parseAnswer(text) {
  const s = String(text), a = s.indexOf('['), b = s.lastIndexOf(']');
  if (a < 0 || b < a) throw new Error('réponse sans tableau JSON');
  let raw; try { raw = JSON.parse(s.slice(a, b + 1)); } catch (e) { throw new Error('tableau JSON illisible : ' + e.message); }
  if (!Array.isArray(raw)) throw new Error('réponse sans tableau JSON');
  const out = new Map(), str = v => typeof v === 'string' && v.trim() ? oneLine(v) : null;
  for (const x of raw) if (x && typeof x.id === 'string') out.set(x.id.trim(), { rewrite: str(x.reecriture), hypothese: str(x.hypothese), raison: str(x.raison) });
  return out;
}

// --- contrôles sans modèle : ce qu'une réécriture n'a pas le droit d'inventer
const CITE = /«\s*([^»]*?)\s*»|"([^"]*)"|“([^”]*)”/g;
const cites = s => [...String(s).matchAll(CITE)].map(m => oneLine(m[1] ?? m[2] ?? m[3] ?? ''));
const sansCites = s => String(s).replace(CITE, ' ');
const bare = s => s.replace(/[.!?…\s]+$/, '');
const loose = s => norm(bare(s)).replace(/[\s_\-]+/g, ' ').trim();
const mots = s => norm(s).match(/[\p{L}\p{N}]+/gu) || [];
const nombres = s => new Set(mots(sansCites(s)).map(w => /^\d+$/.test(w) ? Number(w) : NOMBRES[w]).filter(v => v !== undefined));
const LIAISON_CHOIX = new Set(['ou', 'et', 'par', 'exemple', 'choix', 'au', 'ex']);

/** null si la réécriture n'invente rien de vérifiable, sinon ce qu'elle invente ou perd. */
export function invented(origin, rewrite) {
  const a = cites(origin), b = cites(rewrite), left = [...a];
  for (const c of b) {
    let i = left.findIndex(x => bare(x) === bare(c));
    // Un nom de registre se normalise (« visites guidees » → « visites_guidees ») : seul cas où le texte cité peut changer.
    if (i < 0 && /^[a-z][a-z0-9_]*$/.test(c) && new RegExp('registre\\s*«\\s*' + c + '\\s*»').test(rewrite)) i = left.findIndex(x => loose(x) === loose(c));
    if (i < 0) return a.some(x => loose(x) === loose(c)) ? `le texte entre « » a changé : « ${c} » (un texte affiché se recopie tel quel)` : `le texte « ${c} » n'est pas dans la phrase d'origine`;
    left.splice(i, 1);
  }
  if (left.length) return `le texte « ${left[0]} » de la phrase d'origine a disparu`;
  const na = nombres(origin), plus = [...nombres(rewrite)].filter(v => !na.has(v));
  if (plus.length) return `le nombre ${plus.join(', ')} n'est pas dans la phrase d'origine`;
  // Les valeurs d'un choix, entre parenthèses : chaque mot doit venir de la phrase d'origine.
  const known = new Set(mots(origin));
  const news = [...sansCites(rewrite).matchAll(/\(([^)]*)\)/g)].flatMap(m => mots(m[1])).filter(w => !known.has(w) && !LIAISON_CHOIX.has(w));
  if (news.length) return `entre parenthèses, « ${[...new Set(news)].join(', ')} » n'est pas dans la phrase d'origine`;
  return null;
}

/** Remplace une phrase du document (cherchée à partir de sa ligne, les blancs comptant pour un) par une réécriture d'une ligne. */
export function replaceSentence(text, phrase, by, line = 1) {
  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(phrase.trim().split(/\s+/).map(esc).join('\\s+') + '[.!?]?', 'g');
  let from = 0; for (let n = 1; n < line; n++) { const k = text.indexOf('\n', from); if (k < 0) break; from = k + 1; }
  re.lastIndex = from; let m = re.exec(text);
  if (!m) { re.lastIndex = 0; m = re.exec(text); }
  if (!m) return null;
  let put = oneLine(by);
  if (!/[.!?]$/.test(put) && !/[.!?]\s*»$/.test(put)) put += '.';
  return { text: text.slice(0, m.index) + put + text.slice(m.index + m[0].length), put, shift: -(m[0].match(/\n/g) || []).length };
}

const sentenceErrors = r => r.errors.filter(e => !e.whole);
const sameError = m => m.replace(/ligne \d+/g, 'ligne');

/** Juge une réécriture : contrôles sans modèle, puis le lecteur relit le document entier avec la phrase récrite. */
export function judge(text, name, item, rewrite, line = item.line) {
  const inv = invented(item.phrase, rewrite);
  if (inv) return { ok: false, why: inv };
  const rep = replaceSentence(text, item.phrase, rewrite, line);
  if (!rep) return { ok: false, why: 'phrase d\'origine introuvable dans le document' };
  const before = readDocument(text, { name }), after = readDocument(rep.text, { name });
  const pool = before.trace.map(t => t.text), fresh = [];
  for (const t of after.trace) { const i = pool.indexOf(t.text); if (i >= 0) pool.splice(i, 1); else fresh.push(t); }
  if (!fresh.length) return { ok: false, why: 'la réécriture ne dit rien de plus que la phrase d\'origine' };
  const eb = sentenceErrors(before), ea = sentenceErrors(after);
  const bad = fresh.find(t => t.error);
  if (bad) { const e = ea.find(x => x.line === bad.line && x.message.includes(bad.text)) || ea.find(x => x.line === bad.line); return { ok: false, why: (e ? e.message + (e.hint ? ' — ' + e.hint : '') : bad.error) }; }
  if (ea.length >= eb.length) {
    const known = eb.map(e => sameError(e.message)), added = ea.find(e => { const i = known.indexOf(sameError(e.message)); if (i >= 0) { known.splice(i, 1); return false; } return true; });
    return { ok: false, why: added ? added.message + (added.hint ? ' — ' + added.hint : '') : 'la réécriture ne lève pas le refus' };
  }
  return { ok: true, text: rep.text, put: rep.put, shift: rep.shift, said: fresh.map(t => t.said).filter(Boolean) };
}

/**
 * Applique les réponses d'un tour. state : { texts: { doc: texte }, shifts: { doc: [{ line, by }] }, results: Map id → résultat }.
 * Un résultat : { id, doc, line, phrase, status: 'récrite' | 'laissée' | 'refusée' | 'sans réponse', rewrite, said, hypothese, raison, why }.
 * La phrase des champs passe d'abord : les autres phrases citent ses champs.
 */
export function applyAnswers(state, items, answers) {
  const order = [...items].sort((a, b) => (b.champs - a.champs) || a.doc.localeCompare(b.doc) || a.line - b.line);
  for (const it of order) {
    const a = answers.get(it.id), base = { id: it.id, doc: it.doc, line: it.line, phrase: it.phrase };
    if (!a) { state.results.set(it.id, { ...base, status: 'sans réponse' }); continue; }
    if (!a.rewrite) { state.results.set(it.id, { ...base, status: 'laissée', raison: a.raison || 'le modèle ne donne pas de raison' }); continue; }
    const shifts = (state.shifts[it.doc] ||= []), line = it.line + shifts.filter(s => s.line < it.line).reduce((n, s) => n + s.by, 0);
    const j = judge(state.texts[it.doc], it.doc, it, a.rewrite, line);
    if (!j.ok) { state.results.set(it.id, { ...base, status: 'refusée', rewrite: a.rewrite, hypothese: a.hypothese, why: j.why }); continue; }
    state.texts[it.doc] = j.text; if (j.shift) shifts.push({ line: it.line, by: j.shift });
    state.results.set(it.id, { ...base, status: 'récrite', rewrite: j.put, said: j.said, hypothese: a.hypothese });
  }
  return { unknown: [...answers.keys()].filter(id => !items.some(x => x.id === id)) };
}

/**
 * Un passage complet. docs : [{ name, text }]. answerText : la réponse d'un modèle déjà obtenue (un seul tour), sinon ask({ system, user })
 * est appelé jusqu'à rounds fois : au second tour, seules les réécritures refusées repartent, avec le message du lecteur.
 * Renvoie { items, results, texts, unknown, rounds }.
 */
export async function rewriteRun({ docs, ask = null, answerText = null, rounds = 2 }) {
  const items = docs.flatMap(d => refusedSentences(d.text, d.name));
  const state = { texts: Object.fromEntries(docs.map(d => [d.name, d.text])), shifts: {}, results: new Map() };
  let pending = items, unknown = [], done = 0;
  const system = buildSystemPrompt();
  while (pending.length && done < (answerText !== null ? 1 : rounds)) {
    const user = buildUserPrompt(docs.map(d => ({ name: d.name, text: state.texts[d.name] })), pending);
    const answers = parseAnswer(answerText !== null ? answerText : await ask({ system, user, round: done + 1, count: pending.length }));
    const r = applyAnswers(state, pending, answers); if (!done) unknown = r.unknown; done++;
    pending = pending.filter(it => state.results.get(it.id).status === 'refusée').map(it => ({ ...it, attempt: state.results.get(it.id).rewrite, refusal: state.results.get(it.id).why }));
  }
  return { items, results: items.map(it => state.results.get(it.id) || { id: it.id, doc: it.doc, line: it.line, phrase: it.phrase, status: 'sans réponse' }), texts: state.texts, unknown, rounds: done };
}

/** La consigne à soumettre à un modèle hors de sitec (--export). previous : résultats d'un passage, pour le tour de réparation. */
export function exportPrompt(docs, previous = []) {
  const tried = new Map(previous.filter(r => r.status === 'refusée').map(r => [oneLine(r.phrase), r]));
  const given = new Set(previous.filter(r => r.status === 'laissée').map(r => oneLine(r.phrase)));
  const items = docs.flatMap(d => refusedSentences(d.text, d.name)).filter(it => !given.has(oneLine(it.phrase)))
    .map(it => { const p = tried.get(oneLine(it.phrase)); return p ? { ...it, attempt: p.rewrite, refusal: p.why } : it; });
  return { system: buildSystemPrompt(), user: buildUserPrompt(docs, items), sentences: items.map(it => ({ id: it.id, phrase: it.phrase })) };
}
