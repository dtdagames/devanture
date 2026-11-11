// Composant au format document (prototype) : components/<nom>/document.md, un texte en français, lu sans modèle.
//
// Le lecteur est tolérant sur la forme (accents, pluriels, mots de liaison, synonymes, ordre des mots, petite faute de frappe)
// et strict sur le sens, par trois garde-fous :
//   1. tout mot doit être expliqué : une phrase dont un mot n'a pas de rôle dans la tournure reconnue est refusée, pas tronquée ;
//   2. une lecture doit gagner seule : deux tournures qui expliquent la même phrase, c'est une erreur qui montre les deux ;
//   3. le lecteur redit ce qu'il a compris : la lecture est un manifeste au format langage (lecture.yaml), figé à côté du
//      document ; si elle change (document modifié, ou lecteur mis à jour), la compilation s'arrête jusqu'à ce qu'on l'accepte.
// Trois choses ne sont jamais devinées : un nombre (il doit être consommé par la tournure), une négation, un destinataire.
//
// Une phrase = une tournure (construction) : des notions obligatoires, des notions permises, des valeurs (nombre, champ,
// texte entre « », liste entre parenthèses). Le vocabulaire (LEXIQUE) dit quels mots portent quelle notion.
import YAML from 'yaml';
import { INTENT_NAMES } from './apparence.js';

// ---------------------------------------------------------------------------------------------------------------------------
// Mots : normalisation et racine. La même fonction sert au lexique et au texte : « rangées », « rangé », « ranger » se rejoignent
// par le lexique (formes listées), « places » et « place » par la racine.

export const norm = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[’`]/g, "'");
export const stem = w => { if (w.length <= 3) return w; const r = w.replace(/(ees|ee|es|e|s|x)$/, ''); return r.length >= 3 ? r : w; };
const key = w => stem(norm(w));
const slug = s => norm(s).replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
const cap = s => { const t = String(s).trim(); return t.charAt(0).toUpperCase() + t.slice(1); };

/** Mots de liaison : ils n'ont pas de sens à eux seuls, on les ignore (jamais une négation, jamais un nombre). */
const LIAISON = new Set(['le', 'la', 'les', 'l', 'un', 'une', 'des', 'du', 'de', 'd', 'a', 'au', 'aux', 'en', 'et', 'ou', 'par', 'pour', 'dans', 'sur', 'avec', 'ce', 'cet', 'cette', 'ces', 'son', 'sa', 'ses', 'leur', 'leurs', 'il', 'elle', 'ils', 'elles', 'on', 'y', 'est', 'sont', 'sommes', 'etre', 'ete', 'qui', 'que', 'qu', 'se', 's', 'c', 'lui', 'alors', 'donc', 'puis', 'aussi', 'ici', 'tout', 'tous', 'toute', 'toutes', 'chaque', 'chacun', 'chacune', 'meme', 'memes', 'peu', 'bien', 'tres', 'deja', 'ainsi', 'cela', 'ca', 'dont', 'ou', 'comme', 'choisi', 'choisie', 'concerne', 'concernee', 'nouveau', 'nouvelle', 'nouvelles', 'particulier', 'particuliere', 'propre', 'simple', 'simplement', 'bien', 'desormais', 'ensuite', 'enfin', 'avant', 'autre', 'autres', 'quelqu', 'tandis', 'donc', 'indique', 'indiquee', 'saisi', 'saisie', 'renseigne', 'renseignee', 'declare', 'declaree', 'arrive', 'arrivent'].map(key));
/** Négations : jamais ignorées. Une tournure doit les prendre en charge, sinon la phrase est refusée. */
const NEGATIONS = ['ne', 'n', 'pas', 'sans', 'aucun', 'aucune', 'jamais', 'sauf', 'ni', 'personne', 'excepte', 'hormis'];
export const NOMBRES = { deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7, huit: 8, neuf: 9, dix: 10, onze: 11, douze: 12, quinze: 15, vingt: 20, trente: 30, cinquante: 50, cent: 100 };

/**
 * Lexique : notion → mots ou expressions qui la portent. Une expression de plusieurs mots est reconnue avant ses mots.
 * Un mot peut porter plusieurs notions (« e-mail » est un moyen de prévenir et un champ) : la tournure choisit.
 */
export const LEXIQUE = {
  SECTION: ['section', 'bloc', 'composant', 'partie', 'encart'],
  TITRE: ['titre', 'intitule'],
  INTRO: ['introduction', "phrase d'introduction", 'accroche', 'chapeau', 'sous-titre', "texte d'introduction", 'phrase d accroche'],
  OUVRE: ['commence', 'debute', "s'ouvre", 'ouvre', 'comporte', 'porte', 'presente', 'a'],
  UTILISE: ['utilise', 'utilisent', 'emploie', 'emploient', 'integre', 'qui utilise', "qui l'utilise", 'appelante'],
  HAUT: ['en haut', 'au-dessus', 'en tete', 'precede', 'precedent', 'qui le precedent', 'qui le precede', 'au debut', 'avant le formulaire', 'au-dessus du formulaire'],
  FORMULAIRE: ['formulaire', 'fiche', 'bulletin'],
  COMBIEN: ['nombre', 'le nombre', 'combien', 'decompte', 'compteur'],
  TOTAL: ['en tout', 'au total', 'en tout et pour tout', 'sans groupe', 'sans groupes', 'sans distinction', 'tous confondus', 'toutes confondues'],
  PREND: ['reserve', 'en reserve', 'prend', 'en prend', 'occupe', 'en occupe', 'vaut', 'consomme', 'retire', 'en retire', 'compte pour', 'utilise'],
  SANSMSG: ['sans message', 'sans message particulier', 'sans autre message', 'sans texte particulier', 'sans rien afficher de plus'],
  OBLIGATOIRE: ['obligatoire', 'obligatoires', 'requis', 'requise', 'requises', 'exige', 'exiges', 'necessaire', 'necessaires'],
  FACULTATIF: ['facultatif', 'facultative', 'facultatifs', 'facultatives', 'optionnel', 'optionnelle', 'optionnels', 'optionnelles', 'pas obligatoire', 'pas obligatoires', 'non obligatoire', 'non obligatoires'],
  BORNE: ['limite', 'limitee', 'limites', 'limite de places', 'plafond', 'plafonne', 'plafonnee', 'maximum de places'],
  DEJA: ['deja inscrit', 'deja inscrite', 'deja inscrits', 'deja signe', 'deja reserve', 'deja enregistre', 'deja enregistree', 'une seconde fois', 'une deuxieme fois', 'doublon', 'un doublon', 'en cas de doublon', 'signe de nouveau', "s'inscrit de nouveau", 'reserve de nouveau'],
  COMPTER: ['comptent', 'se comptent', 'se decomptent', 'se calculent'],
  FOURNI: ['fournit', 'fournissent', 'transmet', 'passe', 'donnes', 'donne', 'fournis', 'fourni', 'choisis', 'choisi', 'ecrits', 'ecrit', 'vient', 'viennent', 'venus', 'definis', 'defini', 'indiques'],
  PAGE: ['page'],
  PLACE: ['place', 'siege', 'couvert'],
  // Unité qui ne dit pas si l'on compte les envois ou les personnes : claire sans champ nombre, à préciser sinon.
  UNITE: ['participant', 'participante', 'inscrit', 'inscrite', 'personne', 'convive', 'eleve', 'stagiaire', 'invite'],
  RESTE: ['restant', 'restante', 'reste', 'restent', 'disponible', 'libre', 'encore libre', 'qui restent'],
  AFFICHE: ['affiche', 'affichee', 'affichees', 'affiches', 'affichent', 'montre', 'montree', 'montrees', 'visible', 'visibles', 'indique', 'indiquee', 'indiquees', 'apparait', 'apparaissent', 'figure', 'figurent'],
  LIGNE: ['ligne', 'lignes', 'une ligne', 'ces lignes'],
  PRESENTE: ['presentee', 'presentees', 'presentes', 'disposee', 'disposees', 'disposes', 'placee', 'placees', 'mise', 'mises', 'rangees en'],
  VISITEUR: ['visiteur', 'visiteuse', 'internaute', 'client', 'cliente', 'participant', 'personne inscrite', 'inscrit', 'utilisateur'],
  MARCHAND: ['nous', 'equipe', "l'equipe", 'site', 'equipe du site', "l'equipe du site", 'commercant', 'boutique', 'organisateur', 'responsable', 'gerant', 'proprietaire', 'on nous'],
  BUT: ["pour s'inscrire", 'pour reserver', 'pour participer', 'pour envoyer', 'pour demander', "pour s'enregistrer"],
  SAISIT: ['choisit', 'selectionne', 'indique', 'precise', 'donne', 'saisit', 'renseigne', 'ecrit', 'laisse', 'laisser', 'ajoute', 'ajouter', 'entre', 'fournit', 'note', 'remplit', 'complete', 'demande'],
  PEUT: ['peut', 'facultatif', 'facultative', 'facultativement', 'optionnellement', "s'il le souhaite", 'eventuellement', 'au besoin', 'si besoin', 'optionnel', 'optionnelle', 'peut aussi'],
  BOUTON: ['bouton'],
  NOMME: ["s'appelle", 'appelle', 'nomme', "s'intitule", 'intitule', 'dit', 'libelle', 'porte le texte', 'texte', 'marque'],
  APRES: ['apres', 'une fois', 'suite', 'a la suite', 'des que'],
  INSCRIPTION: ['inscription', 'inscriptions', 'envoi', 'envois', 'reservation', 'reservations', 'demande', 'demandes', 'reponse', 'reponses', 'formulaire envoye', 'signature', 'signatures', 'participation', 'participations', 'candidature', 'candidatures', 'vote', 'votes', 'precommande', 'precommandes'],
  CONFIRME: ['confirmation', 'message de confirmation', 'confirme', 'validee', 'valide', 'enregistree', 'faite', 'envoyee', 'envoye', 'reussie', 'acceptee', 'accepte', 'acceptees', 'prise en compte', 'pris en compte', 'reussit', 'aboutit', 'terminee'],
  LIT: ['lit', 'voit', 'lira', 'verra', "s'affiche", 'message', 'le message', 'on lui dit', 'lui dit', 'recoit le message', 'texte affiche', 'on lui repond', 'repond'],
  SINON: ['sinon', 'autrement', 'dans ce cas', 'le cas echeant', 'a defaut'],
  LIMITE: ['au plus', 'pas plus de', 'maximum', 'au maximum', 'max', 'limite a', 'limitee a', 'limitees a', 'limites a', 'il y a', 'accueille', 'accueillent', 'contient', 'compte', 'jusqu a', "jusqu'a", 'dispose de', 'offre', 'propose'],
  COMPTE: ['comptees par', 'comptes par', 'comptee par', 'selon le nombre de', "selon le nombre d'", 'en fonction du nombre de', "en fonction du nombre d'", 'decomptees par', 'decomptees selon le nombre de', "decomptees selon le nombre d'", 'comptees selon le nombre de', "comptees selon le nombre d'", "autant qu'il y a de", "autant qu'il y a d'", 'autant que de', "d'apres le nombre de", 'par le nombre de'],
  COMPLET: ['complet', 'complete', 'completes', 'plein', 'pleine', 'pleines', 'plus de place', "n'y a plus de place", 'il ne reste plus de place', 'ne reste plus de place', 'rempli', 'remplie', 'ne reste pas assez de places', "il ne reste pas assez de places", 'pas assez de places', 'plus assez de places', "n'y a plus assez de places", 'ne reste plus assez de places'],
  QUAND: ['quand', 'lorsque', 'lorsqu', 'si', 'des lors que', 'une fois que', 'des que'],
  ATTENTE: ["liste d'attente", 'file d attente', "file d'attente", 'en attente', "mise en attente"],
  VA: ['va', 'vont', 'passe', 'passent', 'part', 'bascule', 'est mise', 'est placee', 'est ajoutee', 'rejoint', 'entre'],
  REFUS: ['refusee', 'refusees', 'refuse', 'refuser', 'impossible', 'fermee', 'fermees', 'closes', 'close', "n'est plus possible", 'rejetee', 'bloquee'],
  UNEFOIS: ['une seule fois', "qu'une fois", 'une fois', 'pas deux fois', 'une seule inscription', 'une inscription unique', 'unique', 'qu une seule fois'],
  SINSCRIT: ['signe', 'signer', 'peut signer', 'vote', 'voter', 'peut voter', 'postule', 'postuler', "s'inscrit", "s'inscrire", 'inscrit', 'inscrire', 'reserve', 'reserver', 'participe', 'participer', "s'enregistre", "peut s'inscrire", 'peut reserver', 'peut participer'],
  RANGE: ['range', 'rangee', 'rangees', 'ranges', 'enregistre', 'enregistree', 'enregistrees', 'enregistres', 'conserve', 'conservee', 'conservees', 'note', 'notee', 'notees', 'stockee', 'stockees', 'garde', 'gardee', 'gardees', 'vont', 'consignees'],
  REGISTRE: ['registre', 'carnet', 'cahier'],
  PREVENU: ['prevenu', 'prevenus', 'prevenue', 'prevenues', 'averti', 'avertis', 'avertie', 'informe', 'informes', 'informee', 'notifie', 'notifies', 'recevons', 'recoit', 'recoivent', 'envoie', 'envoient', 'est envoye', 'part'],
  // Un seul mot : « e-mail » est à la fois un moyen de prévenir et, s'il est déclaré, un champ ; c'est la tournure qui tranche.
  COURRIEL: ['e-mail', 'email', 'mail', 'courriel'],
};
/** Intentions d'apparence dites en clair → nom d'intention du bloc apparence. */
const ALLURES = { 'en ligne': ['cote a cote', 'en ligne', 'sur une seule ligne', 'sur la meme ligne', "l'une a cote de l'autre", 'alignes', 'alignees'], 'espace au-dessus': ['espace au-dessus', 'un espace au-dessus', 'de l espace au-dessus', "de l'air au-dessus", 'marge au-dessus'], centré: ['centre', 'centres', 'centrees', 'au centre'], compactes: ['compactes', 'compacts', 'serrees', 'serres'] };
/** Noms de champ que tout le monde écrit pareil : le lecteur sait leur type et leur libellé. */
const CHAMPS_CONNUS = [['email', ['e-mail', 'email', 'mail', 'courriel', 'adresse', 'adresse e-mail', 'adresse mail', 'adresse email', 'adresse de courriel', 'adresse electronique']], ['phone', ['telephone', 'numero de telephone', 'numero', 'portable', 'mobile']], ['name', ['nom', 'nom et prenom', 'prenom et nom', 'nom complet']], ['subject', ['sujet', 'objet']], ['message', ['message', 'message libre']]];

// Lexique préparé : expressions triées de la plus longue à la plus courte, par suite de racines.
const words = s => norm(s).replace(/'/g, "' ").split(/[\s']+/).filter(Boolean);
const PHRASES = [];
for (const [notion, list] of Object.entries(LEXIQUE)) for (const p of list) PHRASES.push({ notion, keys: words(p).map(stem), text: p });
for (const p of ['tous deux', 'toutes deux', 'tous les deux', 'toutes les deux', 'l un et l autre', 'de nouveau', 'a nouveau']) PHRASES.push({ notion: 'LIAISON', keys: words(p).map(stem), text: p });
for (const [intent, list] of Object.entries(ALLURES)) for (const p of list) PHRASES.push({ notion: 'ALLURE:' + intent, keys: words(p).map(stem), text: p });
for (const [field, list] of CHAMPS_CONNUS) for (const p of list) PHRASES.push({ notion: 'CONNU:' + field, keys: words(p).map(stem), text: p });
PHRASES.sort((a, b) => b.keys.length - a.keys.length);
const SINGLE_WORDS = new Map(); for (const p of PHRASES) if (p.keys.length === 1) (SINGLE_WORDS.get(p.keys[0]) || SINGLE_WORDS.set(p.keys[0], new Set()).get(p.keys[0])).add(p.notion);

function lev(a, b) { const d = Array.from({ length: a.length + 1 }, (_, i) => [i]); for (let j = 1; j <= b.length; j++) d[0][j] = j; for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); return d[a.length][b.length]; }

// ---------------------------------------------------------------------------------------------------------------------------
// Du texte aux phrases, des phrases aux jetons.

/** Découpe un document : titre (#), description (premier paragraphe), lignes à libellé (« Mots-clés : »), phrases avec leur ligne. */
export function splitDocument(text) {
  const lines = String(text).replace(/\r\n/g, '\n').split('\n');
  const out = { title: null, titleLine: null, description: null, labels: [], sentences: [] };
  let para = [], paraLine = 0, paragraphs = [];
  const flush = () => { if (para.length) paragraphs.push({ line: paraLine, lines: para }); para = []; };
  lines.forEach((raw, i) => {
    const l = raw.trim(), n = i + 1;
    if (!l) return flush();
    if (/^#\s+/.test(l) && out.title === null) { flush(); out.title = l.replace(/^#\s+/, '').trim(); out.titleLine = n; return; }
    if (/^#{1,6}\s+/.test(l)) return flush(); // intertitre : il organise le document pour qui le lit, il ne dit rien au lecteur
    const lab = /^(mots[- ]cl[ée]s|mots cles)\s*:\s*(.+)$/i.exec(l);
    if (lab) { flush(); out.labels.push({ line: n, name: 'intents', value: lab[2] }); return; }
    if (!para.length) paraLine = n;
    para.push({ text: l, line: n });
  });
  flush();
  // La description est la première ligne de texte après le titre (elle peut contenir plusieurs phrases) : elle n'est pas lue,
  // elle est recopiée. Tout ce qui suit est lu phrase par phrase, qu'une ligne vide les sépare ou non.
  if (paragraphs.length) {
    const first = paragraphs[0].lines[0];
    out.description = first.text; out.descriptionLine = first.line;
    paragraphs[0] = { line: paragraphs[0].lines[1]?.line, lines: paragraphs[0].lines.slice(1) };
    if (!paragraphs[0].lines.length) paragraphs = paragraphs.slice(1);
  }
  // Une phrase finit au point, hors des « » et des parenthèses ; elle peut courir sur plusieurs lignes d'un paragraphe.
  for (const p of paragraphs) {
    let cur = '', curLine = null, q = 0, par = 0;
    const push = () => { const t = cur.trim(); if (t) out.sentences.push({ text: t, line: curLine }); cur = ''; curLine = null; };
    for (const { text: t, line } of p.lines) {
      for (let k = 0; k < t.length; k++) {
        const ch = t[k];
        if (curLine === null && ch.trim()) curLine = line;
        if (ch === '«') q++; else if (ch === '»') q = Math.max(0, q - 1); else if (ch === '(') par++; else if (ch === ')') par = Math.max(0, par - 1);
        if ((ch === '.' || ch === '!' || ch === '?') && !q && !par && (k === t.length - 1 || /\s/.test(t[k + 1]))) { push(); continue; }
        cur += ch;
        // Un message cité qui finit par un point finit aussi la phrase qui le cite : « … et le visiteur lit : « Complet. » »
        if (ch === '»' && !q && !par && /[.!?]\s*»$/.test(cur) && (k === t.length - 1 || /^\s+\p{Lu}/u.test(t.slice(k + 1)))) push();
      }
      cur += ' ';
    }
    push();
  }
  return out;
}

/**
 * Jetons d'une phrase. Chaque jeton porte ses lectures possibles (notions, champ, nombre, texte cité, liste entre parenthèses,
 * séparateur, liaison, négation). fields : champs déjà déclarés par le document ({ name, label, type }).
 */
export function tokenize(sentence, fields = [], { subject = null } = {}) {
  const raw = [];
  const re = /«\s*([^»]*?)\s*»|\(([^)]*)\)|([;,:])|([\p{L}\p{N}][\p{L}\p{N}'’\-]*)/gu;
  let m;
  while ((m = re.exec(sentence))) {
    if (m[1] !== undefined) raw.push({ t: 'cite', text: m[1].trim() });
    else if (m[2] !== undefined) raw.push({ t: 'paren', text: m[2].trim() });
    else if (m[3] !== undefined) raw.push({ t: 'sep', text: m[3] });
    else for (const part of m[4].replace(/’/g, "'").split(/(?<=')/)) { const w = part.replace(/'$/, ''); if (w) raw.push({ t: 'mot', text: w, key: key(w) }); }
  }
  // Noms des champs déclarés : par leur nom et par leur libellé, à la racine près.
  const fieldWords = new Map();
  for (const f of fields) for (const k of [key(f.name), ...words(f.label || '').map(stem)]) if (k && !LIAISON.has(k)) (fieldWords.get(k) || fieldWords.set(k, new Set()).get(k)).add(f.name);
  const isNumber = n => fields.find(x => x.name === n)?.type === 'number';
  // Le champ que désigne le mot i : un nom, { many } si le mot désigne plusieurs champs et que rien ne tranche, null sinon.
  const fieldAt = i => {
    const r = raw[i]; if (!r || r.t !== 'mot') return null;
    const skip = (j, dir) => { while (raw[j] && raw[j].t === 'mot' && LIAISON.has(raw[j].key)) j += dir; return raw[j] && raw[j].t === 'mot' ? j : -1; };
    // « le nombre de personnes » : « nombre » appartient au champ nombre qui suit.
    if (r.key === key('nombre') && !fieldWords.has(r.key)) { const j = skip(i + 1, 1); const o = j >= 0 && fieldWords.get(raw[j].key); const nums = o ? [...o].filter(isNumber) : []; return nums.length === 1 ? nums[0] : null; }
    const set = fieldWords.get(r.key); if (!set) return null;
    if (set.size === 1) return [...set][0];
    for (const dir of [-1, 1]) { const j = skip(i + dir, dir); const o = j >= 0 && fieldWords.get(raw[j].key); if (o) { const both = [...set].filter(x => o.has(x)); if (both.length === 1) return both[0]; } }
    { const j = skip(i - 1, -1); if (j >= 0 && raw[j].key === key('nombre')) { const nums = [...set].filter(isNumber); if (nums.length === 1) return nums[0]; } }
    return { many: [...set] };
  };
  // Un nom de champ que tout le monde écrit pareil (« adresse e-mail », « téléphone ») désigne ce champ s'il est déclaré.
  const declared = new Set(fields.map(x => x.name));
  const known = classes => { if ([...classes].some(c => c.startsWith('CHAMP:'))) return; for (const c of [...classes]) if (c.startsWith('CONNU:') && declared.has(c.slice(6))) classes.add('CHAMP:' + c.slice(6)); };
  const toks = [];
  for (let i = 0; i < raw.length; i++) {
    const r = raw[i];
    if (r.t !== 'mot') { toks.push({ ...r, classes: new Set([r.t === 'cite' ? 'CITE' : r.t === 'paren' ? 'PAREN' : 'SEP']) }); continue; }
    // Expression du lexique, la plus longue d'abord.
    let hit = null;
    for (const p of PHRASES) {
      if (p.keys.length < 2 || i + p.keys.length > raw.length) continue;
      let ok = true; for (let k = 0; k < p.keys.length && ok; k++) ok = raw[i + k].t === 'mot' && raw[i + k].key === p.keys[k];
      if (ok && (!hit || p.keys.length > hit.keys.length)) hit = p; else if (ok && hit && p.keys.length === hit.keys.length && p.notion !== hit.notion) (hit.more ||= new Set()).add(p.notion);
    }
    let fixed = null;
    if (!hit) {
      const near = [];
      for (const p of PHRASES) {
        if (p.keys.length < 2 || i + p.keys.length > raw.length) continue;
        let off = 0, bad = null, ok = true;
        for (let k = 0; k < p.keys.length && ok; k++) { const w = raw[i + k]; if (w.t !== 'mot') ok = false; else if (w.key !== p.keys[k]) { off++; bad = k; if (off > 1 || w.key.length < 5 || lev(w.key, p.keys[k]) !== 1) ok = false; } }
        if (ok && off === 1) near.push({ p, bad });
      }
      const sameKeys = near.length && near.every(x => x.p.keys.join(' ') === near[0].p.keys.join(' '));
      if (near.length && sameKeys) { hit = near[0].p; fixed = `« ${raw[i + near[0].bad].text} » lu comme « ${near[0].p.text} »`; }
    }
    if (hit) {
      const text = raw.slice(i, i + hit.keys.length).map(x => x.text).join(' ');
      const classes = new Set([hit.notion, ...(hit.more || [])]);
      for (const p of PHRASES) if (p.keys.length === hit.keys.length && p.keys.every((k, j) => k === hit.keys[j])) classes.add(p.notion);
      const inside = [...new Set(hit.keys.map((_, j) => fieldAt(i + j)).filter(x => typeof x === 'string'))];
      if (inside.length === 1) classes.add('CHAMP:' + inside[0]);
      known(classes);
      toks.push({ t: 'mot', text, classes, ...(fixed ? { corrected: hit.text, note: fixed } : {}) }); i += hit.keys.length - 1; continue;
    }
    const classes = new Set(SINGLE_WORDS.get(r.key) || []);
    const fr = fieldAt(i);
    if (typeof fr === 'string') classes.add('CHAMP:' + fr); else if (fr) for (const n of fr.many) classes.add('CHAMP:' + n);
    known(classes);
    const n = norm(r.text);
    if (/^\d+$/.test(n)) classes.add('NOMBRE'); else if (n in NOMBRES) classes.add('NOMBRE');
    if (NEGATIONS.includes(n)) classes.add('NEG');
    if (LIAISON.has(r.key) && !classes.has('NEG')) classes.add('LIAISON');
    if (n === 'une') classes.add('UNE');
    // Les mots du titre désignent le composant lui-même (« le stage », « la dégustation ») : un sujet connu, sans autre effet.
    if (subject?.has(r.key)) classes.add('SUJET');
    // « demande » est un verbe de saisie après un sujet (« le formulaire demande »), un nom sinon (« chaque demande »).
    if (classes.has('SAISIT') && n === 'demande') { const prev = raw.slice(0, i).reverse().find(x => x.t === 'mot'); if (!prev || !/^(formulaire|visiteur|il|elle|on|fiche|composant)$/.test(norm(prev.text))) classes.delete('SAISIT'); }
    const tok = { t: 'mot', text: r.text, classes, ...(fr && typeof fr !== 'string' ? { many: fr.many } : {}) };
    if (classes.has('NOMBRE')) tok.value = /^\d+$/.test(n) ? Number(n) : NOMBRES[n];
    // Petite faute de frappe : un mot inconnu à une lettre d'un seul mot du lexique ou d'un seul champ est lu comme lui, et c'est dit.
    if (!classes.size && r.key.length >= 5) {
      const near = [...SINGLE_WORDS.keys(), ...fieldWords.keys()].filter(k => k.length >= 4 && lev(k, r.key) === 1);
      if (near.length === 1) { for (const c of SINGLE_WORDS.get(near[0]) || []) classes.add(c); if (fieldWords.get(near[0])?.size === 1) classes.add('CHAMP:' + [...fieldWords.get(near[0])][0]); tok.corrected = near[0]; }
    }
    toks.push(tok);
  }
  // « ne … que » restreint, il ne nie pas : « ne s'inscrit qu'une fois ».
  const que = toks.findIndex(t => t.t === 'mot' && /^(qu|que)$/.test(norm(t.text)));
  if (toks.some(t => t.classes.has('UNEFOIS'))) for (const t of toks) if (t.classes.has('NEG') && /^(ne|n)$/.test(norm(t.text))) { t.classes.delete('NEG'); t.classes.add('LIAISON'); }
  if (que >= 0) for (let i = 0; i < que; i++) if (toks[i].classes.has('NEG') && /^(ne|n)$/.test(norm(toks[i].text))) { toks[i].classes.delete('NEG'); toks[i].classes.add('LIAISON'); }
  return toks;
}

// ---------------------------------------------------------------------------------------------------------------------------
// Tournures. need : notions obligatoires (toutes) ; may : notions permises ; chaque tournure extrait ses valeurs et peut refuser.

const has = (toks, c) => toks.some(t => t.classes.has(c));
const ACTEURS = ['VISITEUR', 'MARCHAND'], VERBES = ['LIT', 'SAISIT', 'SINSCRIT', 'PREVENU', 'AFFICHE'];
/** Jetons qui désignent un champ. Un mot à double rôle est départagé par ses voisins ; renvoie aussi les mots indécis. */
function fieldTokens(toks) {
  const fields = [], undecided = [];
  toks.forEach((t, i) => {
    const c = [...t.classes].find(x => x.startsWith('CHAMP:')); if (!c) return;
    if (t.many) { undecided.push({ t, many: t.many }); return; }
    if (!ACTEURS.some(a => t.classes.has(a))) { fields.push({ t, name: c.slice(6) }); return; }
    const next = toks.slice(i + 1).find(x => !x.classes.has('LIAISON')), prev = toks.slice(0, i).reverse().find(x => !x.classes.has('LIAISON'));
    if (prev && (prev.classes.has('COMPTE') || prev.classes.has('COMBIEN'))) { fields.push({ t, name: c.slice(6) }); return; }
    if (next && VERBES.some(v => next.classes.has(v))) return; // sujet d'un verbe : l'acteur
    undecided.push({ t, name: c.slice(6) });
  });
  return { fields, undecided };
}
const fieldsOf = toks => fieldTokens(toks).fields.map(x => x.name);
const undecided = toks => { const u = fieldTokens(toks).undecided; return u.length && u[0].many ? `« ${u[0].t.text} » désigne ${u[0].many.length} champs du formulaire (${u[0].many.join(', ')}) : dites le libellé entier du champ voulu` : u.length ? `« ${u[0].t.text} » : la personne, ou le champ « ${u[0].name} » ? Dites « le champ ${u[0].name} » ou tournez la phrase autrement` : null; };
const cites = toks => toks.filter(t => t.classes.has('CITE')).map(t => t.text);
const numbers = toks => toks.filter(t => t.classes.has('NOMBRE'));
const MSG = ['VISITEUR', 'LIT', 'SINON', 'AFFICHE'];

export const TOURNURES = [
  { id: 'titre', label: 'titre et introduction de la section', exemple: 'La section commence par un titre et une introduction, donnés par la page.',
    need: ['TITRE'], may: ['INTRO', 'SECTION', 'OUVRE', 'FOURNI', 'PAGE', 'AFFICHE', 'UTILISE', 'HAUT', 'FORMULAIRE', 'NEG'],
    // « il n'y a pas d'introduction » : une négation qui a un sens ici ; sans introduction citée, elle n'en a pas.
    read: toks => { if (has(toks, 'NEG')) return has(toks, 'INTRO') ? { intro: false } : { error: 'une négation, mais sur quoi ? « un titre, sans introduction »' }; return { intro: has(toks, 'INTRO') }; },
    say: r => `données : title${r.intro ? ', intro' : ''} ; forme : en-tête` },
  { id: 'places_affichees', label: 'affichage des places restantes', exemple: 'Les places restantes de chaque séance sont affichées, une ligne par séance.',
    need: ['PLACE', 'RESTE', 'AFFICHE'], may: ['LIGNE', 'SECTION', 'CHAMP', 'COMBIEN'],
    read: toks => { const u = undecided(toks); if (u) return { error: u }; const f = [...new Set(fieldsOf(toks))]; if (f.length > 1) return { error: `les places restantes s'affichent pour un seul champ (lus : ${f.join(', ')})` }; return { by: f[0] || null }; },
    say: r => `lit : places = état du registre ; forme : ${r.by ? `une ligne par ${r.by} (valeur, places restantes)` : 'places restantes'}` },
  { id: 'allure', label: 'présentation des lignes de places', exemple: 'Ces lignes sont présentées côte à côte, avec un espace au-dessus.',
    need: ['LIGNE', 'ALLURE'], may: ['PRESENTE', 'AFFICHE', 'PLACE'],
    read: toks => ({ intents: [...new Set(toks.flatMap(t => [...t.classes].filter(c => c.startsWith('ALLURE:')).map(c => c.slice(7))))] }),
    say: r => `apparence : ${r.intents.join(', ')}` },
  { id: 'bouton', label: 'texte du bouton du formulaire', exemple: 'Le bouton s\'appelle « Réserver ».',
    need: ['BOUTON', 'CITE'], may: ['NOMME', 'AFFICHE', 'FORMULAIRE', 'OUVRE', 'INSCRIPTION', 'CONFIRME'],
    read: toks => { const c = cites(toks); return c.length === 1 ? { label: c[0] } : { error: 'un seul texte entre « » pour le bouton' }; },
    say: r => `forme : formulaire, bouton ${r.label}` },
  { id: 'confirmation', label: 'message après un envoi réussi', exemple: 'Après l\'inscription, le visiteur lit : « Votre place est réservée. »',
    need: ['CITE'], anyOf: [['APRES', 'INSCRIPTION'], ['CONFIRME']], may: ['APRES', 'INSCRIPTION', 'CONFIRME', 'QUAND', ...MSG],
    read: toks => { const c = cites(toks); return c.length === 1 ? { message: c[0] } : { error: 'un seul message entre « »' }; },
    say: r => `formulaire : confirmation = « ${r.message} »` },
  { id: 'places', label: 'nombre de places du registre', exemple: 'Il y a 8 places par séance, comptées par personnes.',
    need: ['NOMBRE'], anyOf: [['PLACE'], ['INSCRIPTION'], ['CHAMP'], ['UNITE']], may: ['PLACE', 'INSCRIPTION', 'CHAMP', 'UNITE', 'LIMITE', 'COMPTE', 'TOTAL', 'COMPTER'],
    read: (toks, ctx) => {
      const u = undecided(toks); if (u) return { error: u };
      const n = numbers(toks); if (n.length !== 1) return { error: `un seul nombre attendu (lus : ${n.map(t => t.text).join(', ')})` };
      // Ce qu'on compte : le mot qui suit le nombre. Un champ nombre (« 8 personnes ») compte les places par sa valeur.
      const i = toks.indexOf(n[0]); const unit = toks.slice(i + 1).find(t => !t.classes.has('LIAISON'));
      const fname = t => { const c = t && [...t.classes].find(x => x.startsWith('CHAMP:')); return c ? c.slice(6) : null; };
      const numeric = name => ctx.fields.find(f => f.name === name)?.type === 'number';
      let qty = null; const after = toks.findIndex(t => t.classes.has('COMPTE'));
      if (after >= 0) { qty = fname(toks.slice(after + 1).find(t => fname(t))); if (!qty) return { error: '« comptées par » doit être suivi d\'un champ nombre du formulaire' }; }
      const unitField = fname(unit);
      // « 8 participants » : huit envois, ou huit personnes en comptant le champ nombre ? Deux lectures : on ne choisit pas.
      const numericFields = ctx.fields.filter(x => x.type === 'number').map(x => x.name);
      if (unit && unit.classes.has('UNITE') && !(unitField && numeric(unitField)) && !qty && numericFields.length) return { ambiguous: [`${n[0].value} inscriptions (un envoi compte pour un) : « Il y a ${n[0].value} inscriptions… »`, `${n[0].value} places comptées par ${numericFields[0]} : « Il y a ${n[0].value} places…, comptées par ${numericFields[0]}. »`] };
      if (unit && !unit.classes.has('PLACE') && !unit.classes.has('INSCRIPTION') && !unit.classes.has('UNITE') && !(unitField && numeric(unitField))) return { error: `après le nombre, dites ce qui est compté : places, inscriptions, ou un champ nombre du formulaire (lu : « ${unit.text} »)` };
      if (unitField && numeric(unitField)) { if (qty && qty !== unitField) return { error: `deux façons de compter : ${unitField} et ${qty}` }; qty = unitField; }
      const groups = [...new Set(fieldsOf(toks).filter(f => f !== qty))];
      if (groups.length > 1) return { error: `les places se comptent par un seul champ (lus : ${groups.join(', ')})` };
      return { max: n[0].value, by: groups[0] || null, qty };
    },
    say: r => `formulaire : places = ${r.max}${r.by ? ' par ' + r.by : ''}${r.qty ? ', comptées par ' + r.qty : ''}` },
  { id: 'liste_attente', label: 'liste d\'attente quand c\'est complet', exemple: 'Quand une séance est complète, l\'inscription va en liste d\'attente.',
    need: ['ATTENTE'], may: ['COMPLET', 'QUAND', 'CHAMP', 'INSCRIPTION', 'VA', 'CITE', 'PLACE', 'SANSMSG', ...MSG],
    read: toks => { const c = cites(toks); if (c.length > 1) return { error: 'un seul message entre « »' }; if (c.length && has(toks, 'SANSMSG')) return { error: '« sans message » et un message entre « » : lequel ?' }; return { message: c[0] || null }; },
    say: r => `formulaire : liste d'attente = ${r.message ? `« ${r.message} »` : 'oui'}` },
  { id: 'sans_liste_attente', label: 'pas de liste d\'attente', exemple: 'Il n\'y a pas de liste d\'attente.',
    need: ['ATTENTE', 'NEG'], may: ['COMPLET', 'QUAND', 'CHAMP', 'INSCRIPTION'], read: () => ({}), say: () => 'formulaire : liste d\'attente = non' },
  { id: 'refus_complet', label: 'refus quand c\'est complet', exemple: 'Quand une séance est complète, l\'inscription est refusée et le visiteur lit : « Cette séance est complète. »',
    need: ['COMPLET'], anyOf: [['REFUS'], ['CITE']], may: ['REFUS', 'QUAND', 'CHAMP', 'INSCRIPTION', 'CITE', 'PLACE', ...MSG],
    read: toks => { const c = cites(toks); return c.length > 1 ? { error: 'un seul message entre « »' } : { message: c[0] || null }; },
    say: r => `formulaire : si complet = ${r.message ? `« ${r.message} »` : '(message par défaut)'}` },
  { id: 'une_fois', label: 'un seul envoi par personne', exemple: 'Une même adresse e-mail ne s\'inscrit qu\'une fois par séance.',
    need: ['UNEFOIS', 'CHAMP'], may: ['SINSCRIT', 'INSCRIPTION', 'CITE', 'DEJA', ...MSG],
    read: toks => { const u = undecided(toks); if (u) return { error: u }; const c = cites(toks); if (c.length > 1) return { error: 'un seul message entre « »' }; const f = [...new Set(fieldsOf(toks))]; if (!f.length) return { error: 'une fois par quoi ? Citez un champ du formulaire : « une fois par adresse e-mail »' }; return { fields: f, message: c[0] || null }; },
    say: r => `formulaire : une fois par = ${r.fields.join(', ')}${r.message ? ` ; si déjà inscrit = « ${r.message} »` : ''}` },
  { id: 'compte_par', label: 'ce que compte un envoi', exemple: 'Les places sont comptées par personnes.',
    need: ['COMPTE', 'CHAMP'], may: ['INSCRIPTION', 'PLACE', 'PREND', 'COMPTER'],
    read: toks => { const u = undecided(toks); if (u) return { error: u }; const f = [...new Set(fieldsOf(toks))]; return f.length === 1 ? { qty: f[0] } : { error: `un seul champ compte les places (lus : ${f.join(', ')})` }; },
    say: r => `formulaire : places comptées par ${r.qty}` },
  { id: 'une_par_envoi', label: 'un envoi compte pour une place', exemple: 'Chaque inscription réserve une place.',
    need: ['INSCRIPTION', 'PREND'], anyOf: [['UNE'], ['NOMBRE']], may: ['PLACE', 'UNE', 'NOMBRE'],
    read: toks => { const n = numbers(toks); return n.length && (n.length > 1 || n[0].value !== 1) ? { error: 'un envoi compte pour une place, ou pour la valeur d\'un champ nombre (« comptées par personnes ») ; pas pour un nombre fixe' } : {}; },
    say: () => 'formulaire : un envoi compte pour une place' },
  { id: 'sans_limite', label: 'pas de limite de places', exemple: 'Il n\'y a pas de limite de places.',
    need: ['BORNE', 'NEG'], may: ['PLACE', 'COMBIEN', 'INSCRIPTION', 'UNITE'], read: () => ({}), say: () => 'formulaire : pas de règle de places' },
  { id: 'obligation', label: 'champs obligatoires et facultatifs', exemple: 'Le nom et l\'e-mail sont obligatoires, la ville est facultative.',
    need: ['CHAMP'], anyOf: [['OBLIGATOIRE'], ['FACULTATIF']], may: ['OBLIGATOIRE', 'FACULTATIF', 'PEUT'],
    // Chaque champ prend la mention qui le suit : « A et B sont obligatoires, C est facultatif ».
    read: toks => { const u = toks.find(t => t.many); if (u) return { error: `« ${u.text} » désigne ${u.many.length} champs du formulaire (${u.many.join(', ')}) : dites le libellé entier du champ voulu` }; const out = { required: [], optional: [] }; let wait = []; for (const t of toks) { const c = [...t.classes].find(x => x.startsWith('CHAMP:')); if (c) wait.push(c.slice(6)); else if (t.classes.has('OBLIGATOIRE') && !t.classes.has('FACULTATIF')) { out.required.push(...wait); wait = []; } else if (t.classes.has('FACULTATIF')) { out.optional.push(...wait); wait = []; } } out.required = [...new Set(out.required)]; out.optional = [...new Set(out.optional)]; const both = out.required.filter(n => out.optional.includes(n)); return wait.length ? { error: `obligatoire ou facultatif : ${[...new Set(wait)].join(', ')} ?` } : both.length ? { error: `obligatoire et facultatif à la fois : ${both.join(', ')}` } : out; },
    say: r => `formulaire : obligatoires = ${r.required.join(', ') || 'aucun'} ; facultatifs = ${r.optional.join(', ') || 'aucun'}` },
  { id: 'message_doublon', label: 'message au second envoi', exemple: 'Si la même adresse s\'inscrit de nouveau, le visiteur lit : « Vous êtes déjà inscrit. »',
    need: ['DEJA', 'CITE'], may: ['QUAND', 'CHAMP', 'SINSCRIT', 'INSCRIPTION', ...MSG],
    read: toks => { const c = cites(toks); return c.length === 1 ? { message: c[0] } : { error: 'un seul message entre « »' }; },
    say: r => `formulaire : si déjà inscrit = « ${r.message} »` },
  { id: 'registre', label: 'registre où ranger les envois', exemple: 'Les inscriptions sont rangées dans le registre « ateliers ».',
    need: ['REGISTRE', 'CITE'], may: ['RANGE', 'INSCRIPTION'],
    read: toks => { const c = cites(toks); if (c.length !== 1) return { error: 'le nom du registre, une fois, entre « »' }; if (!/^[a-z][a-z0-9_]*$/.test(c[0])) return { error: `nom de registre « ${c[0]} » : minuscules sans accent, chiffres et _ (ex. « ateliers »)` }; return { store: c[0] }; },
    say: r => `formulaire : enregistre dans = ${r.store}` },
  { id: 'prevenir', label: 'e-mail à chaque envoi', exemple: 'Nous sommes prévenus par e-mail.',
    need: ['PREVENU', 'COURRIEL'], may: ['MARCHAND', 'VISITEUR', 'INSCRIPTION', 'NEG', 'QUAND'],
    read: toks => {
      // Le destinataire n'est jamais deviné : le visiteur ne reçoit pas d'e-mail dans cette version, et « qui » doit être dit.
      if (has(toks, 'VISITEUR')) return { error: 'le visiteur ne reçoit pas d\'e-mail dans cette version : seul le site est prévenu (« Nous sommes prévenus par e-mail. »)' };
      if (has(toks, 'NEG')) return { notify: false };
      if (!has(toks, 'MARCHAND')) return { error: 'qui est prévenu ? Écrivez-le : « Nous sommes prévenus par e-mail. »' };
      return { notify: true };
    },
    say: r => `formulaire : prévient par e-mail = ${r.notify ? 'oui' : 'non'}` },
  { id: 'message_seul', label: 'message affiché au visiteur', exemple: 'Le visiteur lit alors : « … »',
    need: ['CITE'], anyOf: [['LIT'], ['VISITEUR']], may: MSG,
    read: toks => { const c = cites(toks); return c.length === 1 ? { message: c[0] } : { error: 'un seul message entre « »' }; },
    say: r => `message « ${r.message} »` },
];
const T = Object.fromEntries(TOURNURES.map(t => [t.id, t]));
const classOf = c => (c.startsWith('CHAMP:') ? 'CHAMP' : c.startsWith('ALLURE:') ? 'ALLURE' : c);

/** Une tournure explique-t-elle tous les jetons ? Renvoie { ok, missing, unexplained }. */
function explain(t, toks) {
  const allowed = new Set([...t.need, ...(t.anyOf || []).flat(), ...t.may, 'LIAISON', 'SEP', 'SUJET']);
  const present = c => toks.some(k => [...k.classes].some(x => classOf(x) === c));
  const missing = t.need.filter(c => !present(c));
  if (t.anyOf && !t.anyOf.some(g => g.every(present))) missing.push(t.anyOf.map(g => g.join('+')).join(' ou '));
  const unexplained = toks.filter(k => {
    if (![...k.classes].length) return true;
    if (k.classes.has('NEG')) return !allowed.has('NEG');           // une négation n'est jamais couverte par une autre lecture du mot
    if (k.classes.has('NOMBRE')) return !allowed.has('NOMBRE');     // un nombre non plus
    return ![...k.classes].some(x => !x.startsWith('CONNU:') && allowed.has(classOf(x)));
  });
  return { ok: !missing.length && !unexplained.length, missing, unexplained };
}

/** Lit une phrase (hors phrase de champs). Renvoie { readings: [{ tournure, value }] } ou { error, hint }. */
function readSentence(toks, ctx) {
  const tryAll = part => {
    const out = [];
    for (const t of TOURNURES) { if (!explain(t, part).ok) continue; const v = t.read(part, ctx); out.push({ t, v }); }
    // Une tournure plus précise l'emporte sur une tournure qu'elle contient (« pas de liste d'attente » sur « liste d'attente »).
    const ids = out.map(o => o.t.id);
    return out.filter(o => !(o.t.id === 'liste_attente' && ids.includes('sans_liste_attente')) && !(o.t.id === 'message_seul' && out.length > 1) && !(o.t.id === 'une_fois' && ids.includes('message_doublon') && !o.v.fields?.length));
  };
  const one = part => { const c = tryAll(part); if (c.length === 1) return c[0].v.ambiguous ? { twoWays: c[0] } : c[0].v.error ? { error: c[0].v.error, t: c[0].t } : { reading: c[0] }; if (c.length > 1) return { ambiguous: c }; return { none: true }; };
  const whole = one(toks);
  if (whole.reading) return { readings: [whole.reading] };
  if (whole.ambiguous) return { ambiguous: whole.ambiguous };
  if (whole.twoWays) return { twoWays: whole.twoWays };
  if (whole.error) return { error: whole.error, tournure: whole.t };
  // Deux tournures dans une phrase, liées par « et », « ; » ou une virgule : chaque moitié doit être lue seule.
  const cuts = [];
  toks.forEach((k, i) => { if (i > 0 && i < toks.length - 1 && (k.classes.has('SEP') || (k.t === 'mot' && norm(k.text) === 'et'))) cuts.push(i); });
  const splits = [];
  for (const i of cuts) { const a = one(toks.slice(0, i)), b = one(toks.slice(i + 1)); if (a.reading && b.reading) splits.push([a.reading, b.reading]); }
  const sig = s => s.map(r => r.t.id).join('+');
  if (splits.length && splits.every(s => sig(s) === sig(splits[0]))) return { readings: splits[0] };
  if (splits.length > 1) return { ambiguousSplit: splits };
  // Rien ne lit la phrase : la tournure la plus proche, et les mots qu'elle n'explique pas.
  let best = null;
  for (const t of TOURNURES) { if (t.id === 'message_seul') continue; const e = explain(t, toks); const cost = e.missing.length * 2 + e.unexplained.length; const hits = [...t.need, ...(t.anyOf || []).flat()].filter(c => toks.some(k => [...k.classes].some(x => classOf(x) === c))).length; if (!hits) continue; if (!best || cost < best.cost) best = { t, e, cost }; }
  return { none: true, best };
}

// ---------------------------------------------------------------------------------------------------------------------------
// La phrase des champs : « le visiteur choisit sa séance (A ou B), indique le nombre de personnes (par exemple 2), son nom… »

/** Lit la phrase qui énumère les champs. Renvoie { fields: [...] } ou { error }. */
function readFields(sentence) {
  // Les « ; » et les « , » séparent ; « et » aussi, hors parenthèses. « il peut… », « facultativement » rendent facultatif ce qui suit
  // dans la proposition ; « un message facultatif » ne rend facultatif que ce champ.
  const raw = [];
  const re = /\(([^)]*)\)|([;,])|([\p{L}\p{N}][\p{L}\p{N}'’\-]*)/gu; let m;
  while ((m = re.exec(sentence))) { if (m[1] !== undefined) raw.push({ t: 'paren', text: m[1].trim() }); else if (m[2]) raw.push({ t: 'sep', text: m[2] }); else for (const part of m[3].replace(/’/g, "'").split(/(?<=')/)) { const w = part.replace(/'$/, ''); if (w) raw.push({ t: 'mot', text: w, key: key(w), apos: part.endsWith("'") }); } }
  if (/«/.test(sentence)) return { error: 'pas de texte entre « » dans la phrase des champs : les valeurs d\'un choix se donnent entre parenthèses' };
  const SAISIT = new Set(LEXIQUE.SAISIT.flatMap(p => words(p).map(stem))), SUJETS = new Set([...LEXIQUE.VISITEUR, ...LEXIQUE.FORMULAIRE, 'composant', 'section'].map(key));
  const OPTION = ['peut', 'facultatif', 'facultative', 'facultativement', 'eventuellement', 'optionnel', 'optionnelle', 'optionnellement'];
  const DET = new Set(['le', 'la', 'l', 'les', 'un', 'une', 'des', 'son', 'sa', 'ses', 'leur', 'leurs', 'du']);
  const FORMS = new Set(LEXIQUE.FORMULAIRE.map(key)), HEAD = new Set(['compose', 'composee', 'constitue', 'constituee', 'avec', 'comprenant', 'contenant', 'comportant', 'reunissant', 'qui', 'demande', 'demandant', 'comprend', 'contient', 'comporte', 'de', 'd'].map(key));
  const items = []; let cur = [], optional = false, own = false;
  const flush = () => { if (cur.length) items.push({ toks: cur, optional: optional || own }); cur = []; own = false; };
  // « pour s'inscrire » en tête : le but, sans effet.
  let start = 0; for (const p of LEXIQUE.BUT) { const ks = words(p).map(stem); if (ks.every((k, j) => raw[j]?.key === k)) { start = ks.length; break; } }
  for (let i = start; i < raw.length; i++) {
    const r = raw[i];
    if (r.t === 'sep') { flush(); if (r.text === ';') optional = false; continue; }
    if (r.t === 'mot' && norm(r.text) === 'et') { flush(); continue; }
    if (r.t === 'mot' && OPTION.includes(norm(r.text))) { if (cur.some(x => x.t === 'mot' && !LIAISON.has(x.key))) own = true; else optional = true; continue; }
    cur.push(r);
  }
  flush();
  // « un formulaire avec les champs nom, e-mail et ville » : après « les champs », les noms se donnent sans article.
  const bare = raw.some(x => x.t === 'mot' && x.key === key('champs'));
  if (bare) { const first = items.findIndex(x => x.toks.some(y => y.t === 'mot' && y.key === key('champs'))); const it0 = items[first]; const at = it0.toks.findIndex(y => y.t === 'mot' && y.key === key('champs')); it0.toks = it0.toks.slice(at + 1); items.splice(0, first); if (!it0.toks.length) items.shift(); }
  const fields = [];
  for (const it of items) {
    const paren = it.toks.filter(x => x.t === 'paren'); if (paren.length > 1) return { error: 'une seule parenthèse par champ' };
    const neg = it.toks.find(x => x.t === 'mot' && NEGATIONS.includes(norm(x.text)));
    if (neg) return { error: `négation « ${neg.text} » dans la phrase des champs : dites seulement ce que le visiteur saisit (« il peut laisser un message » pour un champ facultatif)` };
    // En tête d'un élément : le sujet et le verbe (« le visiteur indique », « le formulaire demande »), sans effet.
    let mots = it.toks.filter(x => x.t === 'mot'), k = 0;
    const verb = mots.findIndex(x => SAISIT.has(x.key));
    if (verb >= 0 && mots.slice(0, verb).every(x => SUJETS.has(x.key) || LIAISON.has(x.key))) k = verb + 1;
    mots = mots.slice(k);
    // « un formulaire composé de l'horaire » : le formulaire n'est pas un champ, ce qui le suit en est un.
    if (mots.length > 2 && DET.has(norm(mots[0].text)) && FORMS.has(mots[1].key)) { let j = 2; while (j < mots.length && HEAD.has(mots[j].key)) j++; if (j > 2 && j < mots.length) mots = mots.slice(mots[j - 1].key === key('de') || mots[j - 1].key === key('d') ? j - 1 : j); }
    // « de l'e-mail », « d'un message » : l'article contracté d'une énumération.
    if (mots.length > 1 && ['de', 'd'].includes(norm(mots[0].text)) && DET.has(norm(mots[1].text))) mots = mots.slice(1);
    if (!mots.length) { if (paren.length) return { error: `parenthèse sans champ : « (${paren[0].text}) »` }; continue; }
    const said = mots.map(x => x.text + (x.apos ? "'" : ' ')).join('').trim();
    // Un champ commence par un article ou un possessif (« son nom », « le créneau », « un message »). Sinon c'est une précision :
    // on ne fabrique pas un champ avec.
    {
      const last = fields[fields.length - 1];
      // « …, par exemple 1 » : l'exemple du champ qui précède, dit sans parenthèses.
      const ex = /^(?:par exemple|exemple)\s+(.+)$/i.exec(said);
      if (ex && last && !paren.length) { if (last.placeholder || last.type === 'select') return { error: `« ${said} » : le champ qui précède a déjà ses valeurs entre parenthèses` }; last.placeholder = ex[1].trim(); continue; }
      // « …, ce dernier étant facultatif » : le champ qui précède, et lui seul.
      if (it.optional && last && !paren.length && /^(?:ce dernier|cette derniere|celui-ci|celle-ci|ce champ|ce dernier champ)(?: etant| est| reste)?$/.test(norm(said))) { last.required = false; continue; }
    }
    if (bare && !DET.has(norm(mots[0].text))) mots = [{ t: 'mot', text: 'le', key: 'le' }, ...mots];
    if (!DET.has(norm(mots[0].text))) {
      const last = fields[fields.length - 1];
      if (/^(sous forme de |en )?(nombre entier|chiffres?|nombre)$/.test(norm(said)) && last?.type === 'number') continue;
      return { error: `« ${said} » n'est pas un champ : un champ se dit avec son article (« son nom », « le créneau », « un message »)` };
    }
    const core = mots.slice(1), np = core.filter(x => !LIAISON.has(x.key));
    if (!np.length) return { error: `« ${said} » : quel champ ?` };
    const from = core.indexOf(np[0]), to = core.indexOf(np[np.length - 1]);
    const text = core.slice(from, to + 1).map(x => x.text + (x.apos ? "'" : ' ')).join('').trim(), keys = np.map(x => x.key);
    const f = { required: !it.optional };
    const known = CHAMPS_CONNUS.find(([, list]) => list.some(p => { const ks = words(p).map(stem).filter(x => !LIAISON.has(x)); return ks.length === keys.length && ks.every((x, j) => x === keys[j]); }));
    if (known) { f.name = known[0]; f.known = true; }
    else if (keys[0] === key('nombre')) { const rest = np.slice(1); f.type = 'number'; f.name = rest.length ? slug(rest.map(x => x.text).join(' ')) : 'nombre'; f.label = cap(text); }
    else if (keys[0] === key('date')) { f.type = 'date'; f.name = slug(np.map(x => x.text).join(' ')); f.label = cap(text); }
    else { f.type = 'text'; f.name = slug(np.map(x => x.text).join(' ')); f.label = cap(text); }
    if (paren.length) {
      const p = paren[0].text.replace(/^(?:au\s+)?choix\s*:?\s*|^(?:parmi|soit)\s*:?\s*/i, ''), ex = /^(?:par exemple|exemple|ex\.?)\s*:?\s*(.+)$/i.exec(p);
      if (ex) f.placeholder = ex[1].trim();
      else { if (f.known || f.type === 'number') return { error: `des valeurs au choix pour « ${text} » : un choix est un champ à lui (« sa séance (Matin ou Soir) »)` }; f.type = 'select'; f.options = p.split(/\s*,\s*|\s+ou\s+/).map(x => x.trim()).filter(Boolean); if (f.options.length < 2) return { error: `un choix donne au moins deux valeurs entre parenthèses (lu : « ${p} ») ; pour un exemple : « (par exemple ${p}) »` }; }
    }
    if (!/^[a-z][a-z0-9_]*$/.test(f.name)) return { error: `nom de champ illisible pour « ${text} »` };
    if (fields.some(x => x.name === f.name)) return { error: `champ dit deux fois : ${text}` };
    fields.push(f);
  }
  if (!fields.length) return { error: 'aucun champ lu : « le visiteur indique son nom et son e-mail »' };
  return { fields };
}

/** Écriture canonique d'un champ, celle du bloc fonctionnement. */
function fieldSpec(f) {
  if (f.known) return f.required ? null : 'facultatif';
  const type = { number: 'nombre', date: 'date', select: 'choix', text: 'texte' }[f.type];
  return `${type}${f.required ? '' : ', facultatif'}${f.options ? ', un parmi ' + f.options.join(', ') : ''} — ${f.label}${f.placeholder ? ` (ex. ${f.placeholder})` : ''}`;
}

// ---------------------------------------------------------------------------------------------------------------------------
// Du document au manifeste.

/**
 * Lit un document de composant. name : nom du composant (celui du dossier).
 * Renvoie { manifest (objet au format langage), yaml (la lecture, texte), trace: [{ line, text, readings, said, corrected }],
 * errors: [{ line, message, hint }] }. Sans erreur, yaml est ce que la compilation utilise.
 */
export function readDocument(text, { name }) {
  const doc = splitDocument(text), errors = [], trace = [];
  // whole : l'erreur vient de la cohérence entre phrases (jugée quand tout est lu), pas d'une phrase refusée.
  let whole = false;
  const fail = (line, message, hint = null) => errors.push({ line, message, ...(hint ? { hint } : {}), ...(whole ? { whole: true } : {}) });
  if (!doc.title) fail(1, 'un document commence par son titre : « # Atelier »');
  if (!doc.description) fail(doc.titleLine || 1, 'après le titre, un paragraphe dit ce que montre le composant (c\'est sa description)');

  // Première passe : la phrase des champs, pour connaître les noms que les autres phrases citent.
  let fields = [], fieldsLine = null;
  const pending = [];
  for (const s of doc.sentences) {
    const quick = tokenize(s.text, []);
    const verbs = quick.filter(t => t.classes.has('SAISIT'));
    const looksLikeFields = (verbs.length > 0 || quick.some(t => t.t === 'mot' && key(t.text) === key('champs'))) && !has(quick, 'OBLIGATOIRE') && !quick.some(t => t.classes.has('FACULTATIF') && quick.some(u => u.classes.has('OBLIGATOIRE'))) && !['CITE', 'BOUTON', 'PLACE', 'TITRE', 'REGISTRE', 'PREVENU', 'UNEFOIS', 'COMPLET', 'ATTENTE', 'COMPTE'].some(c => has(quick, c));
    if (!looksLikeFields) { pending.push(s); continue; }
    const r = readFields(s.text);
    if (r.error) { fail(s.line, `phrase des champs : ${r.error}`, 'Tournure : « Pour s\'inscrire, le visiteur choisit sa séance (Matin ou Soir), indique son nom et son e-mail ; il peut laisser un message. »'); trace.push({ line: s.line, text: s.text, error: r.error }); continue; }
    if (fieldsLine !== null) { fail(s.line, `les champs sont déjà dits ligne ${fieldsLine} : une seule phrase les énumère`); continue; }
    fields = r.fields; fieldsLine = s.line;
    trace.push({ line: s.line, text: s.text, tournure: 'champs', label: 'champs du formulaire', said: `formulaire : champs = ${fields.map(f => f.name + (f.required ? '' : ' (facultatif)')).join(', ')}` });
  }
  const fieldInfo = fields.map(f => ({ name: f.name, label: f.known ? { email: 'e-mail', phone: 'téléphone', name: 'nom', subject: 'sujet', message: 'message' }[f.name] : f.label.replace(/^Nombre d['e]\s*/, ''), type: f.known ? null : f.type }));
  const subject = new Set(words(doc.title || '').map(stem).filter(k => !LIAISON.has(k)));
  const ctx = { fields: fieldInfo };

  // Seconde passe : toutes les autres phrases.
  const got = {};
  const set = (id, value, line) => { if (got[id]) { fail(line, `déjà dit ligne ${got[id].line} : ${T[id].label}`); return false; } got[id] = { ...value, line }; return true; };
  let last = null;
  for (const s of pending) {
    const toks = tokenize(s.text, fieldInfo, { subject });
    const corrected = toks.filter(t => t.corrected).map(t => t.note || `« ${t.text} » lu comme « ${t.corrected} »`);
    const r = readSentence(toks, ctx);
    if (r.ambiguous) { fail(s.line, `phrase ambiguë : « ${s.text} » peut se lire de ${r.ambiguous.length} façons : ${r.ambiguous.map(c => `${c.t.label} (${c.v.error ? c.t.exemple : c.t.say(c.v)})`).join(' ; ')}`, 'Précisez la phrase pour qu\'une seule lecture reste.'); trace.push({ line: s.line, text: s.text, error: 'ambiguë' }); continue; }
    if (r.twoWays) { fail(s.line, `phrase ambiguë : « ${s.text} » peut se lire de deux façons : ${r.twoWays.v.ambiguous.join(' ; ou ')}`, 'Reprenez la phrase sous l\'une des deux formes.'); trace.push({ line: s.line, text: s.text, error: 'ambiguë' }); continue; }
    if (r.ambiguousSplit) { fail(s.line, `phrase ambiguë : « ${s.text} » se coupe de plusieurs façons`, 'Écrivez deux phrases.'); trace.push({ line: s.line, text: s.text, error: 'ambiguë' }); continue; }
    if (r.error) { fail(s.line, `${r.tournure.label} : ${r.error}`, `Tournure : « ${r.tournure.exemple} »`); trace.push({ line: s.line, text: s.text, error: r.error }); continue; }
    if (r.none) {
      const b = r.best;
      const words0 = b ? b.e.unexplained.filter(k => k.t === 'mot').map(k => k.text) : toks.filter(k => k.t === 'mot' && ![...k.classes].length).map(k => k.text);
      const negs = (b ? b.e.unexplained : []).filter(k => k.classes.has('NEG')).map(k => k.text);
      const nums = (b ? b.e.unexplained : []).filter(k => k.classes.has('NOMBRE')).map(k => k.text);
      const ghost = (b ? b.e.unexplained : toks).filter(k => [...k.classes].some(c => c.startsWith('CONNU:')) && ![...k.classes].some(c => c.startsWith('CHAMP:'))).map(k => k.text);
      toks.forEach((k, i) => { const prev = toks[i - 1]; if (k.t === 'mot' && ![...k.classes].length && prev && /^(par|chaque)$/.test(norm(prev.text))) ghost.push(k.text); });
      const why = ghost.length ? `« ${ghost.join(' », « ')} » n'est pas un champ du formulaire (champs : ${ctx.fields.map(x => x.name).join(', ') || 'aucun'})` : negs.length ? `la négation « ${negs.join(' ') } » n'a pas de sens connu ici` : nums.length ? `le nombre « ${nums.join(', ')} » n'a pas de rôle ici` : words0.length ? `mot${words0.length > 1 ? 's' : ''} non compris : ${[...new Set(words0)].join(', ')}` : b && b.e.missing.length ? 'il manque de quoi la reconnaître' : 'aucune tournure connue';
      fail(s.line, `phrase non comprise : « ${s.text} » (${why})`, b ? `Tournure la plus proche, ${b.t.label} : « ${b.t.exemple} »` : `Tournures connues : ${TOURNURES.filter(t => t.id !== 'message_seul').map(t => t.label).join(' ; ')}.`);
      trace.push({ line: s.line, text: s.text, error: why }); continue;
    }
    const said = [];
    for (const { t, v } of r.readings) {
      if (t.id === 'message_seul') {
        // Un message seul complète la phrase qui précède, si elle attend un message ; sinon on ne devine pas à quoi il sert.
        const target = last && ['liste_attente', 'refus_complet', 'une_fois'].includes(last) && got[last] && !got[last].message ? last : null;
        if (!target) { fail(s.line, `phrase ambiguë : « ${s.text} » : à quel moment le visiteur lit-il ce message ?`, 'Trois lectures possibles, dites laquelle : « Après l\'inscription, le visiteur lit : « … » » (confirmation) ; « Quand c\'est complet, l\'inscription est refusée et le visiteur lit : « … » » ; « … ne s\'inscrit qu\'une fois ; sinon le visiteur lit : « … » ».'); continue; }
        got[target].message = v.message; said.push(`${T[target].label} : message = « ${v.message} »`); continue;
      }
      if (set(t.id, v, s.line)) { said.push(t.say(v)); last = t.id; }
    }
    trace.push({ line: s.line, text: s.text, tournure: r.readings.map(x => x.t.id).join(' + '), label: r.readings.map(x => x.t.label).join(' + '), said: said.join(' ; '), ...(corrected.length ? { corrected } : {}) });
  }

  // --- cohérence entre phrases : ce qu'une phrase cite doit exister ailleurs dans le document.
  // Jugée seulement quand toutes les phrases sont lues : une phrase refusée ferait dire à tort qu'il manque quelque chose.
  const P = got.places, hasForm = fields.length > 0, complete = !errors.length;
  const cohere = () => {
  if (got.compte_par) { if (!P) fail(got.compte_par.line, 'ce que compte un envoi : le document ne dit pas combien il y a de places', 'Ajoutez : « Il y a 8 places. »'); else if (P.qty && P.qty !== got.compte_par.qty) fail(got.compte_par.line, `contradiction avec la ligne ${P.line} : places comptées par ${P.qty}, ou par ${got.compte_par.qty} ?`); else if (fields.find(x => x.name === got.compte_par.qty)?.type !== 'number') fail(got.compte_par.line, `« ${got.compte_par.qty} » ne compte pas des places : ce n'est pas un champ nombre du formulaire`); else P.qty = got.compte_par.qty; }
  if (got.sans_limite && P) fail(got.sans_limite.line, `contradiction avec la ligne ${P.line} : des places, ou pas de limite ?`);
  if (got.message_doublon) { if (!got.une_fois) fail(got.message_doublon.line, 'message au second envoi : le document ne dit pas ce qui rend un envoi unique', 'Ajoutez : « Une même adresse e-mail ne s\'inscrit qu\'une fois. »'); else if (got.une_fois.message && got.une_fois.message !== got.message_doublon.message) fail(got.message_doublon.line, `deux messages pour le second envoi (ligne ${got.une_fois.line})`); else got.une_fois.message = got.message_doublon.message; }
  if (got.obligation) for (const [list, req] of [[got.obligation.required, true], [got.obligation.optional, false]]) for (const n of list) { const fd = fields.find(x => x.name === n); if (fd) fd.required = req; }
  if (got.une_par_envoi && P?.qty) fail(got.une_par_envoi.line, `contradiction avec la ligne ${P.line} : un envoi compte pour une place, ou pour la valeur de ${P.qty} ?`);
  const formOnly = ['sans_limite', 'obligation', 'message_doublon', 'compte_par', 'une_par_envoi', 'bouton', 'confirmation', 'places', 'liste_attente', 'sans_liste_attente', 'refus_complet', 'une_fois', 'registre', 'prevenir'];
  if (!hasForm) for (const id of formOnly) if (got[id]) fail(got[id].line, `${T[id].label} : le document ne dit pas quels champs le visiteur remplit`, 'Ajoutez la phrase des champs : « Le visiteur indique son nom et son e-mail. »');
  if (hasForm && !got.registre) fail(fieldsLine, 'le document ne dit pas où ranger les envois', 'Ajoutez : « Les inscriptions sont rangées dans le registre « inscriptions ». »');
  if (got.liste_attente && got.sans_liste_attente) fail(got.sans_liste_attente.line, `contradiction avec la ligne ${got.liste_attente.line} : liste d'attente, ou pas ?`);
  if (got.liste_attente && got.refus_complet) fail(got.refus_complet.line, `contradiction avec la ligne ${got.liste_attente.line} : quand c'est complet, liste d'attente ou refus ?`);
  for (const id of ['liste_attente', 'sans_liste_attente', 'refus_complet']) if (got[id] && !P) fail(got[id].line, `${T[id].label} : le document ne dit pas combien il y a de places`, 'Ajoutez : « Il y a 8 places par séance. »');
  if (got.places_affichees) {
    if (!P) fail(got.places_affichees.line, 'des places restantes sont affichées, mais le document ne dit pas combien il y en a', 'Ajoutez : « Il y a 8 places par séance. »');
    else if ((got.places_affichees.by || null) !== (P.by || null)) fail(got.places_affichees.line, P.by ? `les places se comptent par ${P.by} (ligne ${P.line}) : affichez-les « une ligne par ${P.by} »` : `les places ne se comptent pas par ${got.places_affichees.by} (ligne ${P.line}) : affichez « les places restantes », sans groupe`);
  }
  if (got.allure && !(got.places_affichees && got.places_affichees.by)) fail(got.allure.line, 'ces lignes : le document n\'affiche pas de lignes de places (« Les places restantes de chaque séance sont affichées, une ligne par séance. »)');
  if (got.allure) for (const i of got.allure.intents) if (!INTENT_NAMES.includes(i)) fail(got.allure.line, `présentation inconnue : ${i}`);
  };
  whole = true;
  if (complete) cohere();

  // --- la lecture : un manifeste au format langage, dans un ordre fixe
  const manifest = { name, description: doc.description || '' };
  if (got.titre) manifest['données'] = { title: 'texte, facultatif — titre de la section', ...(got.titre.intro ? { intro: 'texte, facultatif — phrase sous le titre' } : {}) };
  const fonctionnement = {};
  if (got.places_affichees) fonctionnement.lit = { places: 'état du registre' };
  if (hasForm) {
    const form = {};
    if (got.registre) form['enregistre dans'] = got.registre.store;
    if (got.prevenir) form['prévient par e-mail'] = got.prevenir.notify ? 'oui' : 'non';
    if (got.confirmation) form.confirmation = got.confirmation.message;
    if (P) form.places = `${P.max}${P.by ? ' par ' + P.by : ''}${P.qty ? ', comptées par ' + P.qty : ''}`;
    if (got.refus_complet?.message) form['si complet'] = got.refus_complet.message;
    if (got.liste_attente) form["liste d'attente"] = got.liste_attente.message || 'oui';
    if (got.sans_liste_attente) form["liste d'attente"] = 'non';
    if (got.une_fois) { form['une fois par'] = got.une_fois.fields.join(', '); if (got.une_fois.message) form['si déjà inscrit'] = got.une_fois.message; }
    form.champs = Object.fromEntries(fields.map(f => [f.name, fieldSpec(f)]));
    fonctionnement.formulaire = form;
  }
  if (Object.keys(fonctionnement).length) manifest.fonctionnement = fonctionnement;
  // La forme suit l'ordre des phrases qui affichent quelque chose.
  const parts = [];
  if (got.titre) parts.push({ line: got.titre.line, node: { 'en-tête': got.titre.intro ? 'title, intro' : 'title' } });
  if (got.places_affichees) parts.push({ line: got.places_affichees.line, node: got.places_affichees.by ? { [`liste « ${name}-places » de places.groups`]: [{ 'élément': [{ texte: 'value' }, { badge: 'left_text' }] }] } : { [`badge « ${name}-places »`]: 'places.left_text' } });
  if (hasForm) parts.push({ line: fieldsLine, node: `formulaire, bouton ${got.bouton ? got.bouton.label : 'Envoyer'}` });
  manifest.forme = parts.sort((a, b) => a.line - b.line).map(p => p.node);
  if (!manifest.forme.length && complete) fail(doc.titleLine || 1, 'le document n\'affiche rien : dites au moins un titre, des places restantes ou des champs');
  if (got.allure) manifest.apparence = { [`${name}-places`]: got.allure.intents.join(', ') };
  manifest.example = `- ${name}:${got.titre ? `\n    title: ${doc.title || cap(name)}` : ' {}'}\n`;
  const intents = doc.labels.find(l => l.name === 'intents');
  if (intents) manifest.intents = intents.value.split(',').map(x => x.trim()).filter(Boolean);

  const header = `# Lecture de document.md par sitec : ce que le compilateur a compris, au format langage.\n# Ne modifiez pas ce fichier : corrigez document.md, relisez « sitec lire », puis acceptez (« sitec lire <dossier> --accepter »).\n`;
  return { manifest, yaml: header + YAML.stringify(manifest, { lineWidth: 0 }), trace: trace.sort((a, b) => a.line - b.line), errors: errors.sort((a, b) => (a.line || 0) - (b.line || 0)), fields };
}

/** Compare la lecture figée (lecture.yaml) à la lecture d'aujourd'hui. Renvoie null si elles sont identiques, sinon la première ligne qui diffère. */
export function readingDiff(frozen, current) {
  const lines = t => String(t).replace(/\r\n/g, '\n').split('\n').map(l => l.trimEnd()).filter(l => l && !l.startsWith('#'));
  const a = lines(frozen), b = lines(current);
  for (let i = 0; i < Math.max(a.length, b.length); i++) if (a[i] !== b[i]) return { was: (a[i] ?? '(rien)').trim(), now: (b[i] ?? '(rien)').trim() };
  return null;
}
