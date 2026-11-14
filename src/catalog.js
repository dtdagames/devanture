import YAML from 'yaml';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { nearest } from './errors.js';
import { compileDonnees } from './lang/donnees.js';
import { compileForme, shellKind } from './lang/forme.js';
import { compileApparence, wantedParts } from './lang/apparence.js';
import { compileFonctionnement } from './lang/fonctionnement.js';
import { parseWithLines } from './lang/lines.js';
import { compileVocabulaire } from './lang/vocabulaire.js';
import { compileLit, sourceSchema } from './lang/sources.js';
import { readDocument, readingDiff } from './lang/document.js';
import { parseComponentOutline } from './lang/outline.js';
import { readPageDocument } from './lang/site-document.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const COMPONENTS_DIR = path.join(ROOT, 'components');

// Définitions partagées, injectées dans chaque manifeste sous $defs.
export const SHARED_DEFS = {
  link: {
    type: 'object',
    additionalProperties: false,
    required: ['label', 'to'],
    properties: {
      label: { type: 'string', description: 'texte du lien' },
      to: { type: 'string', format: 'route', description: 'route interne (/contact), ancre (#x) ou URL' },
    },
  },
};

/**
 * Habillage (en-tête, pied de page) : un composant dont la forme s'ouvre par « en-tête de site » ou « pied de site ». Il n'a pas de
 * données à lui : il lit celles du site, sous ces noms, comme un autre composant lit les siennes.
 */
export const SHELL_DATA = {
  name: 'texte — nom du site',
  home: 'lien — le nom du site, en lien vers l\'accueil',
  tagline: 'texte, facultatif — slogan du site',
  phone: 'texte, facultatif — téléphone du site',
  phone_link: 'lien, facultatif — le téléphone, en lien d\'appel',
  email: 'texte, facultatif — e-mail du site',
  email_link: 'lien, facultatif — l\'e-mail, en lien',
  address: 'texte, facultatif — adresse du site',
  'nav (liste, facultatif)': { link: 'lien — entrée du menu', label: 'texte — son libellé', current: 'oui ou non, facultatif — c\'est la page affichée' },
  footer_text: 'texte, facultatif — texte du pied de page',
  footer_links: 'liste de liens, facultatif — liens du pied de page',
  readable_link: 'lien, facultatif — la version texte de la page affichée',
};
export const SHELL_NAMES = { header: 'en-tête de site', footer: 'pied de site' };

const SCHEMA_KEYS = new Set(['type', 'description', 'enum', 'items', 'properties', 'required', 'additionalProperties', 'minItems', 'maxItems', 'minimum', 'maximum', 'minLength', 'format', 'pattern', '$ref', '$defs', 'default', '$comment']);
const MANIFEST_KEYS = new Set(['name', 'order', 'description', 'props', 'données', 'forme', 'apparence', 'fonctionnement', 'example', 'intents', 'effects', 'behaviors', 'readable', 'calculé']);

/** Garde-fou pour les auteurs de manifestes : une virgule non protégée dans une description crée des clés parasites. */
function lintManifest(name, schema, errors, p = 'props') {
  if (!schema || typeof schema !== 'object') return;
  for (const [k, v] of Object.entries(schema)) {
    if (!SCHEMA_KEYS.has(k)) errors.push(`clé inattendue « ${k} » dans ${p} (une description contenant une virgule doit être entre guillemets)`);
    if (k === 'properties' || k === '$defs') for (const [pk, pv] of Object.entries(v || {})) lintManifest(name, pv, errors, `${p}.${k}.${pk}`);
    if (k === 'items') lintManifest(name, v, errors, `${p}.items`);
  }
}

/**
 * Construit l'entrée de catalogue d'un composant à partir de son manifeste et de ses fichiers.
 * files : { 'template.php', 'template.html', 'styles.css', 'module.js' } (textes). project : composant défini dans le site.
 * Renvoie { entry, errors, details } ; les erreurs sont des phrases (le catalogue natif les lève, un composant de projet les
 * rapporte), précédées de « ligne N : » quand la ligne du manifeste est connue ; details : [{ line, message }], même ordre.
 * words : mots du vocabulaire visibles depuis ce composant (Map), employés dans sa forme comme des primitives.
 */
export function buildComponent({ name, shortName = null, pkg = null, dir, manifestText, files, project = false, words = null, documentText, lectureText, outlineText }) {
  const details = [];
  // Format plan : composant.md, les lignes du format langage en puces. Le lecteur rend le manifeste et la ligne de chaque clé.
  let outline = null;
  if (outlineText !== undefined) {
    if (manifestText !== undefined || documentText !== undefined) { details.push({ line: null, file: 'composant.md', message: 'composant.md et ' + (manifestText !== undefined ? 'manifest.yaml' : 'document.md') + ' à la fois : un composant n\'a qu\'une source' }); return { entry: null, errors: [details[0].message], details }; }
    outline = parseComponentOutline(outlineText);
    for (const e of outline.errors) details.push({ line: e.line, file: 'composant.md', message: e.message });
    if (outline.errors.length) return { entry: null, errors: details.map(d => `ligne ${d.line} : ${d.message}`), details };
  }
  // Format document (prototype) : document.md est la source ; sa lecture est un manifeste au format langage, figé dans lecture.yaml.
  let document = null;
  if (documentText !== undefined) {
    if (manifestText !== undefined) { details.push({ line: null, file: 'document.md', code: 'E_DOCUMENT', message: 'document.md et manifest.yaml à la fois : un composant n\'a qu\'une source' }); return { entry: null, errors: [details[0].message], details }; }
    const r = readDocument(documentText, { name: shortName || name });
    document = { text: documentText, trace: r.trace, yaml: r.yaml, errors: r.errors, frozen: lectureText ?? null };
    for (const e of r.errors) details.push({ line: e.line, file: 'document.md', code: 'E_DOCUMENT', message: e.message, hint: e.hint });
    if (r.errors.length) return { entry: null, errors: details.map(d => `ligne ${d.line} : ${d.message}`), details, document };
    // Garde-fou n° 3 : ce que le compilateur comprend aujourd'hui doit être ce qui a été relu et accepté.
    const fix = 'sitec lire <dossier> montre ce qui est compris phrase par phrase ; --accepter fige cette lecture';
    if (lectureText === undefined) details.push({ line: null, file: 'lecture.yaml', code: 'E_READING', message: 'lecture absente : le document n\'a pas encore été relu', hint: fix });
    else { const d = readingDiff(lectureText, r.yaml); if (d) details.push({ line: null, file: 'lecture.yaml', code: 'E_READING', message: `la lecture du document a changé depuis qu'elle a été acceptée : « ${d.was} » est maintenant lu « ${d.now} »`, hint: fix }); }
    document.stale = details.some(d => d.code === 'E_READING');
    manifestText = r.yaml;
  }
  let manifest, lineOf = () => null;
  // Une erreur garde la ligne du manifeste quand on la connaît (ref : objet lu, ou { in: conteneur, at: clé ou indice }).
  const errors = { push: (message, ref, fallback) => details.push({ line: (ref ? lineOf(ref) : null) ?? (fallback ? lineOf(fallback) : null), message, ...(document ? { file: 'lecture.yaml' } : outline ? { file: 'composant.md' } : {}) }) };
  const done = entry => ({ entry, errors: details.map(d => (d.line ? `ligne ${d.line} : ${d.message}` : d.message)), details });
  if (outline) ({ value: manifest, lineOf } = outline);
  else try { ({ value: manifest, lineOf } = parseWithLines(manifestText)); } catch (e) { errors.push(`manifest.yaml illisible : ${e.message.split('\n')[0]}`); return done(null); }
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) { errors.push('manifest.yaml doit décrire un objet (name, description, données, forme)'); return done(null); }
  const at = k => ({ in: manifest, at: k });
  for (const k of Object.keys(manifest)) if (!MANIFEST_KEYS.has(k)) { const s = nearest(k, [...MANIFEST_KEYS]); errors.push(`clé inconnue « ${k} » dans manifest.yaml${s ? ` (vouliez-vous dire ${s} ?)` : ''}`, at(k)); }
  if (manifest.name !== undefined && manifest.name !== name && manifest.name !== shortName) errors.push(`name: ${manifest.name} ne correspond pas au dossier ${shortName || name}`, at('name'));
  manifest.name = name;
  const shell = shellKind(manifest.forme);
  if (shell) {
    manifest.shell = shell;
    for (const k of ['données', 'props', 'fonctionnement', 'effects', 'calculé']) if (manifest[k] !== undefined) { errors.push(`${k} dans un habillage : un « ${SHELL_NAMES[shell]} » n'a ni données ni fonctionnement à lui, il lit celles du site (${Object.keys(SHELL_DATA).map(x => x.replace(/ \(.*$/, '')).join(', ')})`, at(k)); delete manifest[k]; }
  }
  // Bloc données (français contrôlé) : compilé vers le schéma JSON des props ; les deux ensemble sont refusés.
  if (manifest['données'] !== undefined) {
    if (manifest.props !== undefined) errors.push('props et données à la fois : gardez données (ou props, en schéma JSON), pas les deux', at('props'));
    const r = compileDonnees(manifest['données']);
    for (const e of r.errors) errors.push(`${e.path} : ${e.message}`, e.ref, at('données'));
    manifest.props = r.schema;
  }
  manifest.props ??= { type: 'object', properties: {} };
  if (typeof manifest.props !== 'object' || Array.isArray(manifest.props)) { errors.push('props doit être un schéma objet { type: object, properties: { … } }'); manifest.props = { type: 'object', properties: {} }; }
  manifest.props.type ??= 'object';
  manifest.props.properties ??= {};
  manifest.props.$defs = { ...SHARED_DEFS, ...(manifest.props.$defs || {}) };
  manifest.props.additionalProperties ??= false;
  // Props communes à toutes les sections : ancre, mots-clés d'intention, variantes de personnalisation.
  manifest.props.properties.id ??= { type: 'string', pattern: '^[a-z][a-z0-9-]*$', description: 'ancre : permet un lien vers /route#id ou #id (minuscules, chiffres, tirets)' };
  manifest.props.properties.keywords ??= { type: 'array', items: { type: 'string' }, description: 'mots ou questions que les visiteurs tapent pour trouver cette section (navigation par intention)' };
  manifest.props.properties.variants ??= { type: 'object', description: 'personnalisation : { nom_de_segment: { props surchargées } }, segments déclarés dans segments.yaml' };
  manifest.intents ??= [];
  manifest.description ??= '';
  lintManifest(name, manifest.props, errors);
  // Fonctionnement (français contrôlé) : compilé vers les effets déclarés, avant la forme qui en lit les champs.
  const generated = {}, produced = {};
  let failedReads = [];
  let wordsCss = [];
  if (manifest.fonctionnement !== undefined) {
    if (manifest.effects !== undefined) errors.push('effects et fonctionnement à la fois : gardez fonctionnement (ou effects, en format machine), pas les deux', at('effects'));
    // « lit: » : ce que le composant lit à la visite (sources de la cible) ; le reste du bloc décrit ce qu'il fait d'une saisie.
    const fb = manifest.fonctionnement, isObj = fb && typeof fb === 'object' && !Array.isArray(fb);
    const litKey = isObj ? Object.keys(fb).find(k => k.trim().toLowerCase() === 'lit') : undefined;
    if (litKey !== undefined) {
      const r = compileLit(fb[litKey], { props: manifest.props, component: name });
      for (const e of r.errors) errors.push(`${e.path} : ${e.message}`, e.ref || { in: fb, at: litKey }, at('fonctionnement'));
      if (r.sources.length) manifest.sources = r.sources;
      failedReads = r.failed;
      generated.sources = r.errors.length ? 'invalid' : true;
    }
    if (litKey === undefined || Object.keys(fb).length > 1) {
      const rest = litKey === undefined ? fb : Object.fromEntries(Object.entries(fb).filter(([k]) => k !== litKey));
      const r = compileFonctionnement(rest);
      // Les références gardent l'objet d'origine quand la clé y est : la ligne du manifeste reste retrouvable.
      for (const e of r.errors) errors.push(`${e.path} : ${e.message}`, e.ref && e.ref.in === rest ? { in: fb, at: e.ref.at } : e.ref, at('fonctionnement'));
      if (r.effects) manifest.effects = r.effects; else delete manifest.effects;
      generated.effects = r.errors.length ? 'invalid' : true;
    }
  }
  // « état du registre » sans nom de registre : celui du formulaire de ce composant.
  for (const src of manifest.sources || []) if (src.id === 'register' && !src.args.store) {
    const own = manifest.effects?.form?.store;
    if (typeof own === 'string' && own) src.args.store = "'" + own.replace(/[^a-z0-9_]/g, '') + "'";
    else errors.push(`fonctionnement.lit.${src.key} : « état du registre » sans formulaire dans ce composant : nommez le registre lu (« ${src.source}, registre inscriptions »)`, at('fonctionnement'));
  }
  // Forme et apparence (français contrôlé) : compilées vers le gabarit neutre et la feuille encadrée ; le reste de la chaîne est inchangé.
  if (manifest.forme !== undefined) {
    if (files['template.html'] !== undefined || files['template.php'] !== undefined) errors.push('forme et template.html à la fois : la forme produit le gabarit, retirez template.html (ou retirez forme)', at('forme'));
    // « calculé » (natifs) : données que le compilateur fournit à la section (éléments d'une collection, par exemple), lues comme les autres.
    let computed = null;
    if (manifest['calculé'] !== undefined) {
      if (project) errors.push('calculé est réservé aux composants natifs : ces données viennent du compilateur', at('calculé'));
      const r = compileDonnees(manifest['calculé'], 'calculé');
      for (const e of r.errors) errors.push(`${e.path} : ${e.message}`, e.ref, at('calculé'));
      computed = new Map(Object.entries(r.schema.properties).map(([k, schema]) => [k, { expr: `p._${k}`, required: (r.schema.required || []).includes(k), schema, simple: true }]));
    }
    // Lectures à la visite : un nom de plus dans la forme, lu comme une donnée ; sa valeur vient de la cible (p._nom).
    if (manifest.sources?.length) { computed ||= new Map(); for (const src of manifest.sources) computed.set(src.key, { expr: `p._${src.key}`, required: false, schema: sourceSchema(src.source), simple: true }); }
    // Lecture en erreur (dite à sa ligne) : son nom existe pour la forme, sans valeur ; ce qui en dépend n'est pas jugé.
    if (failedReads.length) { computed ||= new Map(); for (const k of failedReads) computed.set(k, { expr: 'null', required: false, schema: null, absent: true }); }
    // Habillage : les données du site, fournies par la mise en page à chaque rendu.
    if (shell) {
      const r = compileDonnees(SHELL_DATA, 'site');
      computed = new Map(Object.entries(r.schema.properties).map(([k, schema]) => [k, { expr: `p._${k}`, required: (r.schema.required || []).includes(k), schema, simple: true }]));
    }
    const r = compileForme(manifest.forme, { name, props: manifest.props, want: wantedParts(manifest.apparence), effects: manifest.effects || null, words, computed });
    if (failedReads.length) r.incomplete = true;
    for (const e of r.errors) errors.push(`${e.path} : ${e.message}`, e.ref, at('forme'));
    files = { ...files, 'template.html': r.template };
    if (r.behaviors.size) manifest.behaviors = [...new Set([...(Array.isArray(manifest.behaviors) ? manifest.behaviors : []), ...r.behaviors])];
    if (r.css) files['styles.css'] = [files['styles.css'], r.css].filter(Boolean).join('\n');
    Object.assign(produced, { template: r.template, formeCss: r.css || '', parts: [...r.parts.keys()], formeLine: lineOf(at('forme')), words: [...r.usedWords] });
    // Feuilles des mots employés : émises une fois par site, pas une fois par composant.
    wordsCss = [...r.wordsCss].map(([id, w]) => ({ id, ...w }));
    if (manifest.apparence !== undefined) {
      const a = compileApparence(manifest.apparence, { parts: r.parts, sectionClass: r.sectionClass });
      // Forme incomplète (un mot du vocabulaire en erreur) : ses parties manquent, l'apparence ne peut pas être jugée dessus.
      for (const e of a.errors) if (!(r.incomplete && /^partie inconnue/.test(e.message))) errors.push(`${e.path} : ${e.message}`, e.ref, at('apparence'));
      files['styles.css'] = [files['styles.css'], a.css].filter(Boolean).join('\n');
      produced.apparenceCss = a.css;
    }
    Object.assign(generated, { template: true, styles: manifest.apparence !== undefined });
  } else if (manifest.apparence !== undefined) errors.push('apparence sans forme : l\'apparence vise les parties de la forme', at('apparence'));
  if (Object.keys(generated).length) manifest._generated = generated;
  if (project) {
    if (files['template.php'] !== undefined) errors.push('template.php interdit dans un composant de projet : écrivez template.html (gabarit neutre, sans PHP)');
    if (files['template.html'] === undefined) errors.push('template.html manquant (gabarit du composant) : écrivez une forme dans manifest.yaml, ou template.html');
  }
  if (!/^[a-z][a-z0-9-]*(\.[a-z][a-z0-9-]*)*$/.test(name)) errors.push(`nom de composant mal formé : ${name} (minuscules, chiffres et tirets, points pour les familles : produit.carte)`);
  // Exemple d'un plan : écrit comme une section de page, lu avec les données du composant, gardé comme les autres en YAML.
  if (manifest.example && typeof manifest.example === 'object' && typeof manifest.example.document === 'string') {
    const ex = manifest.example, r = readPageDocument(`Adresse : /x\n\n${ex.document}\n`, { schemas: new Map([[name, manifest.props]]) });
    for (const e of r.errors) details.push({ line: ex.line + Math.max(1, e.line - 2), file: 'composant.md', message: `exemple : ${e.message}` });
    manifest.example = YAML.stringify(r.data.sections || [], { lineWidth: 0 });
  }
  // produced : ce que chaque bloc du langage a donné (gabarit, feuille de la forme, feuille de l'apparence), pour sitec component show.
  return done({ name, dir, manifest, files, project, package: pkg, produced, wordsCss, ...(document ? { document } : {}), ...(outline ? { outline: true } : {}) });
}

const COMPONENT_FILES = ['template.php', 'template.html', 'styles.css', 'module.js'];

/** Lit un dossier de composant (manifest + fichiers) ; renvoie { name, dir, manifestText, files } ou null sans manifeste. */
export async function readComponentDir(dir) {
  let manifestText, documentText, lectureText, outlineText;
  try { manifestText = await fs.readFile(path.join(dir, 'manifest.yaml'), 'utf8'); } catch { /* peut-être un document */ }
  // Format plan : composant.md, le format langage écrit en puces.
  try { outlineText = await fs.readFile(path.join(dir, 'composant.md'), 'utf8'); } catch { /* manifeste ou document */ }
  // Format document : document.md (la source) et lecture.yaml (ce que le compilateur en a compris, relu et accepté).
  try { documentText = await fs.readFile(path.join(dir, 'document.md'), 'utf8'); } catch { /* format langage ou html */ }
  if (manifestText === undefined && documentText === undefined && outlineText === undefined) return null;
  if (documentText !== undefined) { try { lectureText = await fs.readFile(path.join(dir, 'lecture.yaml'), 'utf8'); } catch { /* pas encore relu */ } }
  const files = {};
  for (const f of COMPONENT_FILES) { try { files[f] = await fs.readFile(path.join(dir, f), 'utf8'); } catch { /* optionnel */ } }
  return { name: path.basename(dir), dir, manifestText, files, ...(documentText !== undefined ? { documentText, lectureText } : {}), ...(outlineText !== undefined ? { outlineText } : {}) };
}

function makeCatalog(components, words = new Map()) {
  return {
    /** Mots du vocabulaire natif (Map nom → mot), visibles de tous les composants. */
    words,
    get: n => components.get(n),
    has: n => components.has(n),
    names: () => [...components.keys()].sort(),
    list: () => [...components.values()].sort((a, b) => (a.manifest.order ?? 50) - (b.manifest.order ?? 50) || a.name.localeCompare(b.name)),
    suggest: n => nearest(n, [...components.keys()]),
    /** Catalogue étendu de composants de projet (entrées déjà construites), sans modifier celui-ci. */
    extend: (entries) => { const m = new Map(components); for (const e of entries) m.set(e.name, e); return makeCatalog(m, words); },
    size: components.size,
  };
}

/** Catalogue natif : components/ du compilateur. Un manifeste invalide est une erreur de programmation, donc une exception. */
export async function loadCatalog() {
  const entries = await fs.readdir(COMPONENTS_DIR, { withFileTypes: true });
  const components = new Map();
  // Vocabulaire natif : les mots que les composants natifs partagent, écrits dans le langage comme ceux d'un site.
  let words = new Map();
  try {
    // Le vocabulaire natif est écrit en document (vocabulaire.md) ; l'ancienne écriture, vocabulaire.yaml, reste lue.
    const md = await fs.readFile(path.join(COMPONENTS_DIR, 'vocabulaire.md'), 'utf8').catch(() => null);
    const v = compileVocabulaire(md ?? await fs.readFile(path.join(COMPONENTS_DIR, 'vocabulaire.yaml'), 'utf8'), { scope: 'natif', lint: false, outline: md !== null });
    if (v.errors.length) throw new Error(`Vocabulaire natif : ${v.errors.map(e => (e.line ? `ligne ${e.line} : ` : '') + e.message).join(' ; ')}`);
    words = v.words;
  } catch (e) { if (e.code !== 'ENOENT') throw e; }
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const src = await readComponentDir(path.join(COMPONENTS_DIR, e.name));
    if (!src) continue;
    const { entry, errors } = buildComponent({ ...src, words });
    if (errors.length) throw new Error(`Manifeste ${e.name} : ${errors.join(' ; ')}`);
    components.set(entry.name, entry);
  }
  return makeCatalog(components, words);
}
