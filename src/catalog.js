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

/** Garde-fou pour les auteurs de manifestes : une virgule non protégée dans une description crée des clés parasites. */
function lintManifest(name, schema, path = 'props') {
  if (!schema || typeof schema !== 'object') return;
  for (const [k, v] of Object.entries(schema)) {
    if (!SCHEMA_KEYS.has(k)) throw new Error(`Manifeste ${name} : clé inattendue « ${k} » dans ${path}. Une description contenant une virgule doit être entre guillemets.`);
    if (k === 'properties' || k === '$defs') for (const [pk, pv] of Object.entries(v)) lintManifest(name, pv, `${path}.${k}.${pk}`);
    if (k === 'items') lintManifest(name, v, `${path}.items`);
  }
}

export async function loadCatalog() {
  const entries = await fs.readdir(COMPONENTS_DIR, { withFileTypes: true });
  const components = new Map();
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const dir = path.join(COMPONENTS_DIR, e.name);
    const manifest = YAML.parse(await fs.readFile(path.join(dir, 'manifest.yaml'), 'utf8'));
    manifest.props.$defs = { ...SHARED_DEFS, ...(manifest.props.$defs || {}) };
    manifest.props.additionalProperties ??= false;
    // Prop commune à toutes les sections : ancre HTML.
    manifest.props.properties.id ??= { type: 'string', pattern: '^[a-z][a-z0-9-]*$', description: 'ancre : permet un lien vers /route#id ou #id (minuscules, chiffres, tirets)' };
    manifest.props.properties.keywords ??= { type: 'array', items: { type: 'string' }, description: 'mots ou questions que les visiteurs tapent pour trouver cette section (navigation par intention)' };
    manifest.props.properties.variants ??= { type: 'object', description: 'personnalisation : { nom_de_segment: { props surchargées } }, segments déclarés dans segments.yaml' };
    manifest.intents ??= [];
    lintManifest(e.name, manifest.props);
    const files = {};
    for (const f of ['template.php', 'styles.css', 'module.js']) {
      try { files[f] = await fs.readFile(path.join(dir, f), 'utf8'); } catch { /* optionnel */ }
    }
    components.set(manifest.name || e.name, { name: manifest.name || e.name, dir, manifest, files });
  }
  return {
    get: n => components.get(n),
    has: n => components.has(n),
    names: () => [...components.keys()].sort(),
    list: () => [...components.values()].sort((a, b) => (a.manifest.order ?? 50) - (b.manifest.order ?? 50) || a.name.localeCompare(b.name)),
    suggest: n => nearest(n, [...components.keys()]),
  };
}
