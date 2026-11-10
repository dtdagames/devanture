// sitec schema : schémas JSON du projet pour l'éditeur (extension YAML de VS Code et tout client du serveur de langage YAML).
// Complétion des composants (natifs, du projet, des paquets, composés) et de leurs props, documentation au survol, noms de fichiers
// d'assets et routes proposés, erreurs soulignées à la frappe. Les schémas suivent le catalogue réel du site : à régénérer quand un
// composant, une collection ou un paquet change (sitec init le fait après chaque npm install).
import fs from 'node:fs/promises';
import path from 'node:path';
import { SHARED_DEFS } from './catalog.js';
import { SITE_SCHEMA, PAGE_SCHEMA, LANGUAGE_VERSIONS } from './validate.js';
import { FIELD_TYPES } from './collections.js';
import { PARAM_TYPES } from './composition.js';
import { PRODUCT_KEYS } from './shop.js';
import { BEHAVIOR_NAMES } from './lang/behaviors.js';
import { TYPE_WORDS } from './lang/donnees.js';
import { PRIMITIVE_HELP } from './lang/forme.js';
import { wordUsage, WORD_KEYS } from './lang/vocabulaire.js';
import { SOURCES, PUBLIC_SOURCE_NAMES, sourceUsage } from './lang/sources.js';
import { INTENT_NAMES } from './lang/apparence.js';
import { FORM_SETTINGS, FIELD_TYPE_WORDS, FIELD_MODIFIERS } from './lang/fonctionnement.js';

const clone = v => JSON.parse(JSON.stringify(v));
const EXPR = { type: 'string', pattern: '\\{\\{', description: 'expression {{ … }} (sitec explain langage)' };
const FOR = { type: 'object', required: ['for', 'item'], additionalProperties: false, properties: { for: { type: 'string', description: 'expression qui donne une liste (p.points)' }, as: { type: 'string', description: 'nom de chaque élément (défaut it)' }, item: { description: 'gabarit de chaque élément' } }, description: 'liste construite à la compilation : { for: p.liste, as: x, item: { … } }' };

/**
 * Adapte un schéma de props à l'éditeur : formats du compilateur remplacés par des listes (assets, routes),
 * expressions {{ }} acceptées partout, { for } accepté à la place d'une liste dans les composés.
 */
function relax(node, ctx, { composite = false } = {}) {
  if (!node || typeof node !== 'object') return node;
  if (Array.isArray(node)) return node.map(n => relax(n, ctx, { composite }));
  const n = { ...node };
  if (n.properties) n.properties = Object.fromEntries(Object.entries(n.properties).map(([k, v]) => [k, relax(v, ctx, { composite })]));
  if (n.items) n.items = relax(n.items, ctx, { composite });
  if (n.additionalProperties && typeof n.additionalProperties === 'object') n.additionalProperties = relax(n.additionalProperties, ctx, { composite });
  if (n.format === 'asset') { delete n.format; return { description: n.description, anyOf: [{ type: 'string', enum: ctx.assets }, EXPR] }; }
  if (n.format === 'route') { delete n.format; return { description: n.description, anyOf: [{ type: 'string', enum: ctx.routes }, { type: 'string', pattern: '^(https?://|mailto:|tel:|#)' }, { type: 'string', pattern: '^/[a-z0-9\\-/]*#[a-z][a-z0-9-]*$' }, ...ctx.dynamic.map(p => ({ type: 'string', pattern: '^' + p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[a-z0-9-]+$' })), EXPR] }; }
  if (n.format === 'file') { delete n.format; }
  if (n.$ref || n.type === 'string' || n.type === undefined) return n;
  const alts = [n, EXPR];
  if (composite && n.type === 'array') alts.push(FOR);
  return { description: n.description, anyOf: alts };
}

const md = (desc, example) => [desc, example ? '\n\n```yaml\n' + example.trim() + '\n```' : ''].join('');

/** Branche d'une section : { <nom>: props }. */
function sectionBranch(name, propsSchema, description, example) {
  return { type: 'object', additionalProperties: false, required: [name], properties: { [name]: { ...propsSchema, markdownDescription: md(description, example) } }, markdownDescription: md(`**${name}** — ${description}`, example) };
}

function compositeProps(def, ctx) {
  const map = { string: { type: 'string' }, text: { type: 'string' }, number: { type: 'number' }, boolean: { type: 'boolean' }, list: { type: 'array' }, object: { type: 'object' }, link: { $ref: '#/$defs/link' }, asset: { type: 'string', format: 'asset' } };
  const properties = { id: { type: 'string', pattern: '^[a-z][a-z0-9-]*$', description: 'ancre de la première section produite' }, keywords: { type: 'array', items: { type: 'string' } } };
  for (const [k, p] of Object.entries(def.params)) properties[k] = relax({ ...map[p.type], description: [p.description, p.default !== null && p.default !== undefined ? `(défaut ${JSON.stringify(p.default)})` : ''].filter(Boolean).join(' ') }, ctx);
  return { type: 'object', additionalProperties: false, required: Object.entries(def.params).filter(([, p]) => p.required).map(([k]) => k), properties };
}

/** Schémas du projet. Renvoie { 'nom.schema.json': schéma }. */
export function buildSchemas(project, catalog) {
  const cat = project.catalog || catalog;
  const routes = [...new Set(project.pages.map(p => p.data?.route).filter(r => typeof r === 'string' && !r.includes('[id]')))].sort();
  const dynamic = project.pages.map(p => p.data?.route).filter(r => typeof r === 'string' && r.includes('[id]')).map(r => r.replace('[id]', ''));
  const ctx = { assets: [...project.assets].filter(a => !/\.(txt|md|json)$/i.test(a)).sort(), routes, dynamic };
  const defs = { link: relax(clone(SHARED_DEFS.link), ctx) };

  const branches = (composite) => [
    ...cat.list().map(c => { const p = clone(c.manifest.props); delete p.$defs; return sectionBranch(c.name, relax(p, ctx, { composite }), c.manifest.description + (c.package ? ` (paquet ${c.package})` : c.project ? ' (composant du projet)' : ''), c.manifest.example); }),
    ...Object.values(project.composites || {}).map(d => sectionBranch(d.name, compositeProps(d, ctx), d.description + ` (composé${d.package ? ' du paquet ' + d.package : ' du projet'} → ${d.sections.map(s => Object.keys(s)[0]).join(' + ')})`)),
  ];
  const sections = { type: 'array', items: { anyOf: branches(false) } };

  const page = clone(PAGE_SCHEMA);
  page.$schema = 'http://json-schema.org/draft-07/schema#';
  page.title = 'Page Devanture (pages/<id>.page.yaml)';
  page.$defs = defs;
  page.properties.route.description = 'adresse de la page, unique ; / pour l\'accueil ; /chemin/[id] pour une page par élément (avec source)';
  page.properties.source = { type: 'string', enum: ['products', 'orders', ...Object.keys(project.collections || {})], description: 'page par élément : collection dont chaque élément a sa page (item.* dans les props)' };
  page.properties.sections = { ...sections, minItems: 1, description: 'sections de la page, dans l\'ordre ; chaque section = une clé, le nom du composant' };
  page.properties.prepend = sections; page.properties.append = sections;
  page.properties.extends = { type: 'string', enum: project.pages.filter(p => p.data && !p.data.extends).map(p => p.id), description: 'page de base (micro-site) : override, remove, prepend, append' };
  delete page.required; page.anyOf = [{ required: ['route', 'sections'] }, { required: ['route', 'extends'] }];

  const site = clone(SITE_SCHEMA);
  site.$schema = 'http://json-schema.org/draft-07/schema#';
  site.title = 'Site Devanture (site.yaml)';
  site.$defs = defs;
  site.properties.language = { type: 'integer', enum: LANGUAGE_VERSIONS, description: 'version du langage (docs/LANGAGE.md)' };
  site.properties.constants = { type: 'object', description: 'valeurs nommées, lues par {{ const.nom }}' };
  site.properties.packages = { type: 'array', items: { type: 'string' }, description: 'paquets de composants : chemin (./paquets/x) ou nom installé dans node_modules' };
  site.properties.collections = { type: 'object', description: 'collections : { nom: { label, fields, sort } } ; éléments dans data/<nom>.yaml', additionalProperties: { type: 'object', additionalProperties: false, required: ['fields'], properties: { label: { type: 'string' }, description: { type: 'string' }, sort: { type: 'string', description: 'champ de tri, -champ pour décroissant' }, title_field: { type: 'string' }, fields: { type: 'object', additionalProperties: { anyOf: [{ type: 'string', enum: FIELD_TYPES }, { type: 'object', additionalProperties: false, properties: { type: { type: 'string', enum: FIELD_TYPES }, required: { type: 'boolean' }, label: { type: 'string' }, description: { type: 'string' }, default: {} } }] } } } } };
  const out = { 'site.schema.json': site, 'page.schema.json': page };

  out['components.schema.json'] = { $schema: 'http://json-schema.org/draft-07/schema#', title: 'Composants composés (components.yaml)', $defs: defs, type: 'object', additionalProperties: false, required: ['components'], properties: { components: { type: 'object', additionalProperties: { type: 'object', additionalProperties: false, required: ['sections'], properties: {
    description: { type: 'string' }, intents: { type: 'array', items: { type: 'string' } },
    params: { type: 'object', additionalProperties: { anyOf: [{ type: 'string', enum: PARAM_TYPES }, { type: 'object', additionalProperties: false, properties: { type: { type: 'string', enum: PARAM_TYPES }, required: { type: 'boolean' }, default: {}, description: { type: 'string' } } }] } },
    sections: { type: 'array', minItems: 1, items: { anyOf: branches(true) }, description: 'sections produites ; {{ p.param }} et { for: p.liste, as: x, item: {…} }' },
  } } } } };

  // Mots du vocabulaire visibles du site (natifs, des paquets, du site) : montrés au survol de « forme ».
  const wordList = [...(project.words || cat.words || new Map()).values()].filter(w => !w.broken);
  const fieldSpec = { anyOf: [{ type: 'string', description: `type (${TYPE_WORDS.join(', ')}), puis précisions : facultatif, au moins N, au plus N, de A à B, un parmi a, b — description` }, { type: 'object', description: 'champs d\'une liste ou d\'un groupe : « nom (liste, au moins 1): » puis les champs' }] };
  out['manifest.schema.json'] = { $schema: 'http://json-schema.org/draft-07/schema#', title: 'Manifeste de composant (components/<nom>/manifest.yaml)', type: 'object', additionalProperties: false, required: ['description'], properties: {
    name: { type: 'string' }, order: { type: 'number' }, description: { type: 'string', description: 'une phrase : ce que montre le composant et quand l\'utiliser' },
    props: { type: 'object', description: 'format html : schéma JSON des props ; au format langage, écrivez plutôt données' },
    'données': { type: 'object', additionalProperties: fieldSpec, markdownDescription: 'Ce que le composant accepte, une ligne par champ :\n\n```yaml\ntitle: texte, facultatif — titre de la section\nitems (liste, au moins 1):\n  text: texte\n  rating: nombre entier, de 1 à 5, facultatif\n```' },
    forme: { anyOf: [{ type: 'array' }, { type: 'object' }], markdownDescription: `La structure, en primitives : ${Object.keys(PRIMITIVE_HELP).join(', ')}.\n\n\`\`\`yaml\n- en-tête: title, intro\n- grille de items, 3 colonnes:\n    - carte:\n        - titre: title\n        - texte discret: text\n\`\`\`${wordList.length ? `\n\nMots du vocabulaire, employés comme des primitives :\n\n${wordList.map(w => `- \`${wordUsage(w)}\` : ${w.description}`).join('\n')}` : ''}` },
    apparence: { type: 'object', markdownDescription: `L'allure, par partie (primitive ou nom « ») : ${INTENT_NAMES.join(', ')} ; « sur téléphone: » pour les petits écrans.` },
    fonctionnement: { type: 'object', additionalProperties: false, properties: { lit: { type: 'object', additionalProperties: { type: 'string' }, markdownDescription: `Ce que le composant lit à chaque visite, une ligne par lecture : « nom: source, paramètre donnée ». Le nom se lit ensuite dans la forme comme une donnée.\n\n${PUBLIC_SOURCE_NAMES.map(n => `- \`${sourceUsage(n)}\` : ${SOURCES[n].description}`).join('\n')}` }, formulaire: { type: 'object', description: `réglages : ${FORM_SETTINGS.join(', ')}`, properties: {
      'enregistre dans': { type: 'string', pattern: '^[a-z][a-z0-9_]*$', description: 'registre où ranger les envois (onglet « Formulaires » du back-office), ex. devis' },
      'prévient par e-mail': { anyOf: [{ type: 'boolean' }, { type: 'string' }], description: 'oui, non, ou une adresse e-mail' },
      destinataire: { type: 'string', description: 'adresse e-mail qui reçoit les envois (par défaut : celle du site)' },
      confirmation: { type: 'string', description: 'message affiché après l\'envoi' },
      champs: { type: 'object', additionalProperties: { type: ['string', 'null'] }, description: `un champ par ligne : « nom: type, précisions — Libellé (ex. exemple) » ; types : ${FIELD_TYPE_WORDS.join(', ')} ; précisions : ${FIELD_MODIFIERS.join(' ; ')}` },
    } } }, markdownDescription: 'Ce que le composant fait une fois envoyé au serveur :\n\n```yaml\nformulaire:\n  enregistre dans: devis\n  prévient par e-mail: oui\n  confirmation: Merci, nous vous rappelons.\n  champs:\n    name:\n    phone: facultatif\n    type: choix, un parmi Fuite, Chauffe-eau, Autre — Type de travaux\n    details: texte long, facultatif — Précisions\n```' },
    example: { type: 'string', description: 'exemple YAML d\'usage, montré par sitec explain et rendu par sitec test' },
    intents: { type: 'array', items: { type: 'string' } },
    behaviors: { type: 'array', items: { type: 'string', enum: BEHAVIOR_NAMES }, description: 'comportements navigateur fournis par le compilateur, posés par des attributs data-sl-… dans le gabarit' },
    effects: { type: 'object', additionalProperties: false, properties: { form: { type: 'object', additionalProperties: false, required: ['store'], properties: { store: { type: 'string', pattern: '^[a-z][a-z0-9_]*$', description: 'collection d\'exploitation des réponses' }, notify: { anyOf: [{ type: 'boolean' }, { type: 'string', format: 'email' }] }, to: { type: 'string', format: 'email' }, success: { type: 'string' }, required: { type: 'array', items: { type: 'string' } }, fields: { type: 'array', items: { anyOf: [{ type: 'string', enum: ['name', 'email', 'phone', 'subject', 'message'] }, { type: 'object', required: ['name', 'label'], additionalProperties: false, properties: { name: { type: 'string', pattern: '^[a-z][a-z0-9_]*$' }, label: { type: 'string' }, type: { type: 'string', enum: ['text', 'email', 'tel', 'number', 'date', 'select', 'textarea'] }, required: { type: 'boolean' }, options: { type: 'array', items: { type: 'string' } }, placeholder: { type: 'string' }, when: { type: 'object' } } }] } } } } } },
  } };
  out['vocabulaire.schema.json'] = { $schema: 'http://json-schema.org/draft-07/schema#', title: 'Vocabulaire (vocabulaire.yaml) : des mots nouveaux pour la forme des composants', type: 'object', additionalProperties: false, required: ['mots'], properties: { mots: { type: 'object', description: 'un mot par clé, en minuscules (« carte de visite ») ; il s\'emploie dans une forme comme une primitive', additionalProperties: { type: 'object', additionalProperties: false, required: ['description'], properties: {
    description: { type: 'string', description: 'une phrase : ce que le mot affiche' },
    'données': { type: 'object', additionalProperties: fieldSpec, description: 'ce que le mot reçoit, dans l\'ordre où l\'appelant le passe ; les obligatoires d\'abord' },
    forme: { type: 'array', markdownDescription: `Le mot défini par des primitives et d'autres mots ; « contenu » marque la place des éléments écrits sous le mot.\n\n\`\`\`yaml\n- carte « fiche »:\n    - sous-titre: nom\n    - texte discret: role\n\`\`\`` },
    apparence: { type: 'object', description: `l'allure des parties de la forme du mot : ${INTENT_NAMES.join(', ')}` },
    gabarit: { type: 'string', description: 'à défaut de forme : un fragment de gabarit neutre ({{ donnée }}, {% if %}, {% for %}), sans script ; le mot ne voit que ses données' },
    feuille: { type: 'string', description: 'CSS du fragment : chaque sélecteur commence par la classe du mot (.carte-de-visite…), couleurs par les jetons du thème' },
  } } } } };
  if (Object.keys(out['vocabulaire.schema.json'].properties.mots.additionalProperties.properties).join() !== WORD_KEYS.join()) throw new Error('schéma du vocabulaire : clés désaccordées avec WORD_KEYS');
  out['package.schema.json'] = { $schema: 'http://json-schema.org/draft-07/schema#', title: 'Paquet de composants (package.yaml)', type: 'object', additionalProperties: false, required: ['name'], properties: { name: { type: 'string', pattern: '^[a-z][a-z0-9-]*$', description: 'préfixe des composants du paquet' }, description: { type: 'string' }, version: { type: 'string' }, language: { type: 'integer', enum: LANGUAGE_VERSIONS } } };

  // Props d'un composant de projet seules : pour ses cas de test (fixtures/*.yaml).
  for (const c of cat.list().filter(x => x.project && !x.package)) { const p = relax(clone(c.manifest.props), ctx); p.$defs = defs; p.$schema = 'http://json-schema.org/draft-07/schema#'; p.title = `Cas de test de ${c.name}`; out[`fixture.${c.name}.schema.json`] = p; }

  // Données : produits et collections.
  const typeOf = f => ({ string: { type: 'string' }, text: { type: 'string' }, number: { type: 'number' }, boolean: { type: 'boolean' }, date: { anyOf: [{ type: 'string', pattern: '^\\d{4}(-\\d{2}(-\\d{2})?)?$' }, EXPR] }, asset: { anyOf: [{ type: 'string', enum: ctx.assets }, EXPR] }, list: { type: 'array' }, link: { $ref: '#/$defs/link' } })[f.type];
  for (const [name, col] of Object.entries(project.collections || {})) {
    if (!col.spec) continue;
    const props = { id: { type: 'string', pattern: '^[a-z0-9][a-z0-9-]*$', description: 'identifiant unique : adresse de la page de l\'élément' } };
    for (const [k, f] of Object.entries(col.spec.fields)) props[k] = { ...typeOf(f), description: f.label !== k ? f.label : f.description || undefined };
    const item = { type: 'object', additionalProperties: false, required: ['id', ...Object.entries(col.spec.fields).filter(([, f]) => f.required).map(([k]) => k)], properties: props };
    out[`data.${name}.schema.json`] = { $schema: 'http://json-schema.org/draft-07/schema#', title: `Collection ${name} (data/${name}.yaml)`, $defs: defs, type: 'object', additionalProperties: false, properties: { [name]: { type: 'array', items: item }, items: { type: 'array', items: item } } };
  }
  if (project.productsRaw) out['data.products.schema.json'] = { $schema: 'http://json-schema.org/draft-07/schema#', title: 'Produits (data/products.yaml)', type: 'object', additionalProperties: false, required: ['products'], properties: { products: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['id', 'name', 'price'], properties: Object.fromEntries(PRODUCT_KEYS.map(k => [k, ({ id: { type: 'string', pattern: '^[a-z0-9][a-z0-9-]*$' }, price: { type: 'number' }, stock: { type: ['integer', 'null'] }, featured: { type: 'boolean' }, image: { type: 'string', enum: ctx.assets } })[k] || { type: 'string' }])) } } } };
  return out;
}

/** Correspondance fichiers ↔ schémas pour l'extension YAML de VS Code (chemins relatifs au dossier du site). */
export function schemaMap(schemas) {
  const map = { 'site.schema.json': ['site.yaml'], 'page.schema.json': ['pages/*.page.yaml'], 'components.schema.json': ['components.yaml'], 'manifest.schema.json': ['components/*/manifest.yaml', 'paquets/*/components/*/manifest.yaml'], 'package.schema.json': ['package.yaml', 'paquets/*/package.yaml'], 'vocabulaire.schema.json': ['vocabulaire.yaml', 'paquets/*/vocabulaire.yaml'] };
  for (const f of Object.keys(schemas)) {
    let m;
    if ((m = /^fixture\.(.+)\.schema\.json$/.exec(f))) map[f] = [`components/${m[1]}/fixtures/*.yaml`];
    if ((m = /^data\.(.+)\.schema\.json$/.exec(f))) map[f] = [`data/${m[1]}.yaml`];
  }
  return Object.fromEntries(Object.entries(map).filter(([f]) => schemas[f]).map(([f, globs]) => ['./.devanture/schema/' + f, globs]));
}

/** Écrit les schémas sous <site>/.devanture/schema et met à jour .vscode/settings.json et extensions.json sans écraser le reste. */
export async function writeSchemas(project, catalog, { vscode = true } = {}) {
  const schemas = buildSchemas(project, catalog);
  const dir = path.join(project.root, '.devanture', 'schema');
  await fs.rm(dir, { recursive: true, force: true });
  await fs.mkdir(dir, { recursive: true });
  for (const [f, s] of Object.entries(schemas)) await fs.writeFile(path.join(dir, f), JSON.stringify(s, null, 1));
  await fs.writeFile(path.join(project.root, '.devanture', 'README.txt'), 'Généré par « sitec schema » : schémas JSON du site pour l\'éditeur. Ne pas modifier, ne pas versionner ; régénéré après npm install.\n');
  const written = Object.keys(schemas);
  if (vscode) {
    const vdir = path.join(project.root, '.vscode'); await fs.mkdir(vdir, { recursive: true });
    const read = async f => { try { return JSON.parse(await fs.readFile(path.join(vdir, f), 'utf8')); } catch { return {}; } };
    const settings = await read('settings.json');
    const others = Object.fromEntries(Object.entries(settings['yaml.schemas'] || {}).filter(([k]) => !k.startsWith('./.devanture/')));
    settings['yaml.schemas'] = { ...others, ...schemaMap(schemas) };
    settings['yaml.customTags'] ??= [];
    await fs.writeFile(path.join(vdir, 'settings.json'), JSON.stringify(settings, null, 2) + '\n');
    const ext = await read('extensions.json');
    ext.recommendations = [...new Set([...(ext.recommendations || []), 'redhat.vscode-yaml'])];
    await fs.writeFile(path.join(vdir, 'extensions.json'), JSON.stringify(ext, null, 2) + '\n');
  }
  return { dir, files: written };
}
