import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';
import { nearest } from './errors.js';

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
const MANIFEST_KEYS = new Set(['name', 'order', 'description', 'props', 'example', 'intents', 'effects', 'behaviors', 'readable']);

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
 * Renvoie { entry, errors } ; les erreurs sont des phrases (le catalogue natif les lève, un composant de projet les rapporte).
 */
export function buildComponent({ name, shortName = null, pkg = null, dir, manifestText, files, project = false }) {
  const errors = [];
  let manifest;
  try { manifest = YAML.parse(manifestText); } catch (e) { return { entry: null, errors: [`manifest.yaml illisible : ${e.message.split('\n')[0]}`] }; }
  if (!manifest || typeof manifest !== 'object') return { entry: null, errors: ['manifest.yaml doit décrire un objet (name, description, props)'] };
  for (const k of Object.keys(manifest)) if (!MANIFEST_KEYS.has(k)) { const s = nearest(k, [...MANIFEST_KEYS]); errors.push(`clé inconnue « ${k} » dans manifest.yaml${s ? ` (vouliez-vous dire ${s} ?)` : ''}`); }
  if (manifest.name !== undefined && manifest.name !== name && manifest.name !== shortName) errors.push(`name: ${manifest.name} ne correspond pas au dossier ${shortName || name}`);
  manifest.name = name;
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
  if (project) {
    if (files['template.php'] !== undefined) errors.push('template.php interdit dans un composant de projet : écrivez template.html (gabarit neutre, sans PHP)');
    if (files['template.html'] === undefined) errors.push('template.html manquant (gabarit du composant)');
  }
  if (!/^[a-z][a-z0-9-]*(\.[a-z][a-z0-9-]*)*$/.test(name)) errors.push(`nom de composant mal formé : ${name} (minuscules, chiffres et tirets, points pour les familles : produit.carte)`);
  return { entry: { name, dir, manifest, files, project, package: pkg }, errors };
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
