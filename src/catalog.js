import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { nearest } from './errors.js';
import { compileDonnees } from './lang/donnees.js';
import { compileForme } from './lang/forme.js';
import { compileApparence, wantedParts } from './lang/apparence.js';
import { compileFonctionnement } from './lang/fonctionnement.js';
import { parseWithLines } from './lang/lines.js';

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

const SCHEMA_KEYS = new Set(['type', 'description', 'enum', 'items', 'properties', 'required', 'additionalProperties', 'minItems', 'maxItems', 'minimum', 'maximum', 'minLength', 'format', 'pattern', '$ref', '$defs', 'default']);
const MANIFEST_KEYS = new Set(['name', 'order', 'description', 'props', 'données', 'forme', 'apparence', 'fonctionnement', 'example', 'intents', 'effects', 'behaviors', 'readable']);

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
 */
export function buildComponent({ name, shortName = null, pkg = null, dir, manifestText, files, project = false }) {
  const details = [];
  let manifest, lineOf = () => null;
  // Une erreur garde la ligne du manifeste quand on la connaît (ref : objet lu, ou { in: conteneur, at: clé ou indice }).
  const errors = { push: (message, ref, fallback) => details.push({ line: (ref ? lineOf(ref) : null) ?? (fallback ? lineOf(fallback) : null), message }) };
  const done = entry => ({ entry, errors: details.map(d => (d.line ? `ligne ${d.line} : ${d.message}` : d.message)), details });
  try { ({ value: manifest, lineOf } = parseWithLines(manifestText)); } catch (e) { errors.push(`manifest.yaml illisible : ${e.message.split('\n')[0]}`); return done(null); }
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) { errors.push('manifest.yaml doit décrire un objet (name, description, données, forme)'); return done(null); }
  const at = k => ({ in: manifest, at: k });
  for (const k of Object.keys(manifest)) if (!MANIFEST_KEYS.has(k)) { const s = nearest(k, [...MANIFEST_KEYS]); errors.push(`clé inconnue « ${k} » dans manifest.yaml${s ? ` (vouliez-vous dire ${s} ?)` : ''}`, at(k)); }
  if (manifest.name !== undefined && manifest.name !== name && manifest.name !== shortName) errors.push(`name: ${manifest.name} ne correspond pas au dossier ${shortName || name}`, at('name'));
  manifest.name = name;
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
  if (manifest.fonctionnement !== undefined) {
    if (manifest.effects !== undefined) errors.push('effects et fonctionnement à la fois : gardez fonctionnement (ou effects, en format machine), pas les deux', at('effects'));
    const r = compileFonctionnement(manifest.fonctionnement);
    for (const e of r.errors) errors.push(`${e.path} : ${e.message}`, e.ref, at('fonctionnement'));
    if (r.effects) manifest.effects = r.effects; else delete manifest.effects;
    generated.effects = r.errors.length ? 'invalid' : true;
  }
  // Forme et apparence (français contrôlé) : compilées vers le gabarit neutre et la feuille encadrée ; le reste de la chaîne est inchangé.
  if (manifest.forme !== undefined) {
    if (files['template.html'] !== undefined || files['template.php'] !== undefined) errors.push('forme et template.html à la fois : la forme produit le gabarit, retirez template.html (ou retirez forme)', at('forme'));
    const r = compileForme(manifest.forme, { name, props: manifest.props, want: wantedParts(manifest.apparence), effects: manifest.effects || null });
    for (const e of r.errors) errors.push(`${e.path} : ${e.message}`, e.ref, at('forme'));
    files = { ...files, 'template.html': r.template };
    if (r.behaviors.size) manifest.behaviors = [...new Set([...(Array.isArray(manifest.behaviors) ? manifest.behaviors : []), ...r.behaviors])];
    if (r.css) files['styles.css'] = [files['styles.css'], r.css].filter(Boolean).join('\n');
    Object.assign(produced, { template: r.template, formeCss: r.css || '', parts: [...r.parts.keys()], formeLine: lineOf(at('forme')) });
    if (manifest.apparence !== undefined) {
      const a = compileApparence(manifest.apparence, { parts: r.parts, sectionClass: r.sectionClass });
      for (const e of a.errors) errors.push(`${e.path} : ${e.message}`, e.ref, at('apparence'));
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
  // produced : ce que chaque bloc du langage a donné (gabarit, feuille de la forme, feuille de l'apparence), pour sitec component show.
  return done({ name, dir, manifest, files, project, package: pkg, produced });
}

const COMPONENT_FILES = ['template.php', 'template.html', 'styles.css', 'module.js'];

/** Lit un dossier de composant (manifest + fichiers) ; renvoie { name, dir, manifestText, files } ou null sans manifeste. */
export async function readComponentDir(dir) {
  let manifestText;
  try { manifestText = await fs.readFile(path.join(dir, 'manifest.yaml'), 'utf8'); } catch { return null; }
  const files = {};
  for (const f of COMPONENT_FILES) { try { files[f] = await fs.readFile(path.join(dir, f), 'utf8'); } catch { /* optionnel */ } }
  return { name: path.basename(dir), dir, manifestText, files };
}

function makeCatalog(components) {
  return {
    get: n => components.get(n),
    has: n => components.has(n),
    names: () => [...components.keys()].sort(),
    list: () => [...components.values()].sort((a, b) => (a.manifest.order ?? 50) - (b.manifest.order ?? 50) || a.name.localeCompare(b.name)),
    suggest: n => nearest(n, [...components.keys()]),
    /** Catalogue étendu de composants de projet (entrées déjà construites), sans modifier celui-ci. */
    extend: (entries) => { const m = new Map(components); for (const e of entries) m.set(e.name, e); return makeCatalog(m); },
    size: components.size,
  };
}

/** Catalogue natif : components/ du compilateur. Un manifeste invalide est une erreur de programmation, donc une exception. */
export async function loadCatalog() {
  const entries = await fs.readdir(COMPONENTS_DIR, { withFileTypes: true });
  const components = new Map();
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const src = await readComponentDir(path.join(COMPONENTS_DIR, e.name));
    if (!src) continue;
    const { entry, errors } = buildComponent(src);
    if (errors.length) throw new Error(`Manifeste ${e.name} : ${errors.join(' ; ')}`);
    components.set(entry.name, entry);
  }
  return makeCatalog(components);
}
