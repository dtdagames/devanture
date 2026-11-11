// Générateur de composants : une description en langage naturel devient un composant de projet en formats neutres (manifeste,
// gabarit, feuille de style, cas de test), vérifié par le compilateur et réparé jusqu'à passer. Le résultat est figé dans le projet ;
// la compilation ne rappelle jamais le modèle. Comme sitec keywords, le compilateur n'appelle rien : il écrit la consigne (--export)
// et applique une réponse (--import).
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import YAML from 'yaml';
import { COMPONENTS_DIR } from './catalog.js';
import { loadProject } from './load.js';
import { validateProject, collectWarnings } from './validate.js';
import { THEME_PRESETS } from './emit/php/css.js';
import { TEMPLATE_VOCABULARY } from './lang/template.js';
import { BEHAVIORS } from './lang/behaviors.js';
import { cssPrefixes } from './lang/css-lint.js';
import { wordUsage } from './lang/vocabulaire.js';
import { SOURCES, PUBLIC_SOURCE_NAMES, sourceUsage, sourceFields } from './lang/sources.js';


/** Réponse attendue du modèle (sortie structurée). */
export const OUTPUT_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['manifest', 'template', 'styles', 'fixtures', 'notes'],
  properties: {
    manifest: { type: 'string', description: 'contenu complet de manifest.yaml' },
    template: { type: 'string', description: 'contenu complet de template.html' },
    styles: { type: 'string', description: 'contenu complet de styles.css' },
    fixtures: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['name', 'yaml'], properties: { name: { type: 'string', description: 'nom du cas, minuscules et tirets' }, yaml: { type: 'string', description: 'props du cas, en YAML' } } } },
    notes: { type: 'string', description: 'une ou deux phrases : choix faits, limites' },
  },
};

async function readText(p) { try { return await fs.readFile(p, 'utf8'); } catch { return null; } }

/** Réponses attendues selon le format : « langage » (données, forme, apparence dans le manifeste) ou « html » (gabarit et feuille). */
export const OUTPUT_SCHEMA_LANG = {
  type: 'object', additionalProperties: false,
  required: ['manifest', 'fixtures', 'notes'],
  properties: {
    manifest: { type: 'string', description: 'contenu complet de manifest.yaml, avec données, forme et apparence' },
    fixtures: OUTPUT_SCHEMA.properties.fixtures,
    notes: OUTPUT_SCHEMA.properties.notes,
  },
};
export const FORMATS = ['langage', 'html'];
export const schemaFor = format => (format === 'html' ? OUTPUT_SCHEMA : OUTPUT_SCHEMA_LANG);

/** Composant de référence au nouveau format, écrit dans le langage (carrousel d'avis, formulaire). */
const EXAMPLE_LANG = `name: avis-defilants
description: "Carrousel d'avis clients : note en étoiles, texte, prénom et date."
données:
  title: texte, facultatif — titre de la section
  items (liste, au moins 1):
    rating: nombre entier, de 1 à 5, facultatif — note sur 5
    text: texte — texte de l'avis
    author: texte — prénom
    date: date, facultatif — date de l'avis (AAAA-MM-JJ)
  link: lien, facultatif — lien vers tous les avis
forme:
  - en-tête: title
  - défilement de items, automatique:
      - témoignage:
          - étoiles: rating
          - citation: text
          - signature: author, date, en toutes lettres
  - bouton discret: link
apparence:
  étoiles: couleur d'accent
  sur téléphone:
    flèches: masquées
example: |
  - avis-defilants:
      title: Ils parlent de nous
      items:
        - { rating: 5, text: "Le meilleur pain du quartier.", author: Claire, date: "2026-10-02" }
intents: [avis, témoignages, note]`;
const EXAMPLE_FORM = `données:
  title: texte
  delai: texte, facultatif — délai de réponse annoncé
forme:
  section, conteneur « devis-inner »:
    - bloc:
        - titre: title
        - texte discret: "Réponse sous {{ delai }}. Ou appelez le [{{ site.contact.phone }}](tel:{{ site.contact.phone | replace(' ', '') }})."
    - formulaire, bouton Demander un devis
apparence:
  devis-inner: deux colonnes
  sur téléphone:
    devis-inner: une colonne
fonctionnement:
  formulaire:
    enregistre dans: devis
    prévient par e-mail: oui
    confirmation: Merci, nous vous rappelons.
    champs:
      name:
      phone: facultatif
      type_travaux: choix, un parmi Fuite, Chauffe-eau, Autre — Type de travaux
      precision: texte, si type_travaux vaut Autre — Précisez
      details: texte long, facultatif — Précisions (ex. étage, accès)`;

/** Guide du langage des composants au format « langage » : données, forme, apparence, fonctionnement, depuis le code du compilateur. */
export async function buildSystemPromptLang() {
  const { TYPE_WORDS, ICON_NAMES } = await import('./lang/donnees.js');
  const { PRIMITIVE_HELP } = await import('./lang/forme.js');
  const { INTENT_NAMES } = await import('./lang/apparence.js');
  const { FIELD_TYPE_WORDS, FIELD_MODIFIERS, FORM_SETTINGS } = await import('./lang/fonctionnement.js');
  const manifestOf = async n => (await readText(path.join(COMPONENTS_DIR, n, 'manifest.yaml')) || '').trim();
  return `Tu écris des composants pour Devanture, un langage déclaratif de sites vitrines. Un composant se décrit dans un seul fichier, manifest.yaml, en français contrôlé : ce qu'il accepte (données), sa structure (forme), son allure (apparence) et, s'il recueille une saisie, ce qu'il en fait (fonctionnement). Le compilateur en tire le HTML, la CSS et le PHP ; tu n'écris jamais de HTML, de CSS, de JavaScript ni de PHP.

# Ce que tu produis
Un objet JSON : manifest (le contenu complet de manifest.yaml), fixtures (2 à 4 cas de test { name, yaml }, yaml = des props valides), notes.

# manifest.yaml
Clés autorisées : name, description, données, forme, apparence, fonctionnement, example, intents. Rien d'autre (ni props, ni behaviors, ni effects : les blocs les produisent).
- name : le nom demandé, exactement. description : une phrase entre guillemets.
- example : un bloc YAML (|) d'usage dans une page, « - <nom d'usage>: » puis des props réalistes ; textes avec virgule ou deux-points entre guillemets.
- intents : 3 à 6 mots que les visiteurs tapent pour trouver ce contenu.

# données
Une ligne par champ : « nom: type, précisions — description ». Noms en minuscules sans accent (anglais court conseillé : title, text, items, image, link).
- Types : ${TYPE_WORDS.join(', ')}.
- Précisions : facultatif (sinon obligatoire), au moins N, au plus N, de A à B, un parmi a, b, c (toujours en dernier), par défaut X.
- Liste d'éléments : « items (liste, au moins 1): » puis les champs de chaque élément en dessous. Groupe : « nom (groupe): ».
- Description après « — ». Si la ligne contient « : » ailleurs, mets-la entre guillemets simples.
- icône : un pictogramme parmi ${ICON_NAMES.join(', ')}.

# forme
Une liste d'éléments ; chaque élément est « primitive: données » ou « primitive: » suivi d'éléments en dessous. Dans une liste (grille, défilement…), les noms désignent d'abord les champs de l'élément, puis les données du composant.
${Object.entries(PRIMITIVE_HELP).map(([k, v]) => `- ${k} : ${v}`).join('\n')}
- Un nom entre « » donne une classe à l'élément (« carte « offre » ») : utile pour l'apparence.
- Mots du vocabulaire : quand la demande en liste, ils s'emploient comme des primitives, « mot: donnée, donnée » dans l'ordre indiqué (« mot, donnée: » puis des éléments pour un mot qui en contient). N'en invente aucun : un mot absent de la liste est une erreur.
- Texte littéral avec données : texte: "Réponse sous {{ delai }}." (balisage léger accepté : **gras**, [texte](lien)). Expression : "{{ title | default(label) }}".
- Option de section en tête : « section, conteneur « nom-interne »: » puis la liste ; « section, variante style par défaut primary: » ajoute une classe selon une donnée.
- Une donnée facultative rend son élément conditionnel automatiquement.
- Aucun texte inventé présenté comme un fait (prix, délais, labels) : tout vient des données ou de site.

# apparence (facultative)
« partie: intention, intention ». Une partie est une primitive de la forme (singulier ou pluriel : cartes, étoiles, titres), un nom donné entre « », ou section ; « sur téléphone: » regroupe des règles pour les petits écrans.
Intentions : ${INTENT_NAMES.join(', ')}.
Rien d'autre : pas de couleur, de taille ni de police libre. N'ajoute une apparence que si la mise en page de base ne suffit pas.

# fonctionnement › lit (seulement si le composant montre un état qui change d'une visite à l'autre : boutique, horaires, mémoire du visiteur)
« lit: » puis une ligne par lecture, « nom: source, paramètre donnée ». Le nom s'emploie dans la forme comme une donnée ; « section, seulement si nom: » n'affiche la section que si la lecture rend quelque chose.
${PUBLIC_SOURCE_NAMES.map(n => { const g = sourceFields(n); return `- ${sourceUsage(n)} : ${SOURCES[n].description} ; rend ${g.list ? 'une liste, chaque élément' : 'un groupe'} { ${g.fields.map(x => x.name).join(', ')} }`; }).join('\n')}
N'invente ni source ni champ. Quand le composant lit quelque chose, chaque cas de test fournit la valeur lue : clé « à la visite: { nom: … } » à côté des props.

# fonctionnement › formulaire (seulement si le composant recueille une saisie)
« formulaire: » puis ses réglages : ${FORM_SETTINGS.join(', ')}.
- enregistre dans : le registre où ranger les envois (minuscules, chiffres, _ ; ex. devis, reservations). prévient par e-mail : oui, non ou une adresse. confirmation : la phrase affichée après l'envoi.
- champs : un champ par ligne, « nom: type, précisions — Libellé (ex. exemple affiché dans le champ) ». Noms en minuscules sans accent.
- Règles du registre, seulement si la demande parle de places limitées, d'inscription unique ou de liste d'attente (le serveur les applique à l'enregistrement, un envoi à la fois) : « places: 12 », « places: 12 par atelier » (atelier : un champ obligatoire, de préférence à choix), « places: 12 par atelier, comptées par personnes » (personnes : un champ nombre obligatoire) ; « si complet: message de refus » ou « liste d'attente: message à qui est mis en attente » ; « une fois par: email » ou « une fois par: email, atelier » ; « si déjà inscrit: message ». Pour afficher les places restantes, ajoute « lit: places: état du registre » et lis places.left_text, ou places.groups (value, left_text) quand les places se comptent par groupe. N'invente aucun nombre de places : prends celui de la demande.
- Types : ${FIELD_TYPE_WORDS.join(', ')}. Précisions : ${FIELD_MODIFIERS.join(' ; ')} (« un parmi » toujours en dernier, avant « — »). Un champ est obligatoire sauf « facultatif ».
- name, email, phone, subject, message ont déjà leur type et leur libellé : « name: » suffit.
- Dans la forme : « - formulaire, bouton Envoyer » affiche tous les champs dans l'ordre (ou « formulaire: » puis « - champ: nom » pour les placer soi-même).
- Le compilateur fournit validation, protection, enregistrement et e-mail : n'écris rien d'autre.

# Cas de test (fixtures)
2 à 4 cas : complet, minimal (seulement l'obligatoire), cas limite. Chaque yaml contient seulement des props valides.

# Exemple complet
\`\`\`yaml
${EXAMPLE_LANG}
\`\`\`

# Exemple de formulaire (extrait)
\`\`\`yaml
${EXAMPLE_FORM}
\`\`\`

# Composants natifs écrits ainsi
\`\`\`yaml
${await manifestOf('features')}
\`\`\`
\`\`\`yaml
${await manifestOf('testimonials')}
\`\`\`

Réponds uniquement par l'objet JSON demandé.`;
}

/** Guide du langage des composants, construit depuis le code du compilateur (toujours à jour). */
export async function buildSystemPrompt(format = 'langage') {
  if (format !== 'html') return buildSystemPromptLang();
  const icons = (await readText(path.join(COMPONENTS_DIR, 'features', 'manifest.yaml')))?.match(/enum: \[([^\]]+)\]/)?.[1] || '';
  const tokens = Object.keys(THEME_PRESETS.clair).map(k => `var(--${k.replace(/\./g, '-')})`).join(', ');
  const { loadCatalog } = await import('./catalog.js');
  const cat = await loadCatalog();
  const ref = async (name) => {
    const c = cat.get(name); const dir = path.join(COMPONENTS_DIR, name);
    return `### Composant de référence : ${name}\ntemplate.html :\n\`\`\`html\n${(c?.files['template.html'] || '').trim()}\n\`\`\`\nstyles.css :\n\`\`\`css\n${(await readText(path.join(dir, 'styles.css')) || '').trim()}\n\`\`\``;
  };
  return `Tu écris des composants pour Devanture, un langage déclaratif de sites vitrines compilé en PHP. Un composant de projet se compose de fichiers en formats neutres ; tu n'écris jamais de PHP, ni de JavaScript.

# Ce que tu produis
Un objet JSON avec : manifest (manifest.yaml), template (template.html), styles (styles.css), fixtures (2 à 4 cas de test, chacun { name, yaml } où yaml contient des props valides), notes.

# manifest.yaml
- Clés autorisées : name, description, props, example, intents, behaviors, effects. Rien d'autre.
- name : le nom demandé, exactement.
- description : une phrase, entre guillemets (elle contient souvent une virgule).
- props : schéma JSON : { type: object, required: [...], properties: { … } }. Types : string, integer, number, boolean, array (items), object (properties, additionalProperties: false). Un lien s'écrit { $ref: "#/$defs/link" } et vaut { label, to }. Une image : { type: string, format: asset }. enum pour une liste fermée. Mets une description courte sur chaque prop ; toute description contenant une virgule va entre guillemets. Les éléments de liste sont des objets avec additionalProperties: false et required.
- Ne déclare pas id, keywords ni variants : le compilateur les ajoute.
- example : un bloc YAML (avec |) montrant l'usage dans une page : « - <nom>: » puis des props réalistes. Les textes qui contiennent une virgule ou un deux-points vont entre guillemets.
- intents : 3 à 6 mots ou expressions que les visiteurs tapent pour trouver ce contenu.
- behaviors : liste des comportements navigateur utilisés par le gabarit (voir plus bas), sinon omis.
- effects.form (seulement si le composant recueille une saisie à enregistrer) : { store: nom_collection, notify: true, success: phrase, fields: [ name, email, phone, subject, message, ou { name, label, type: text|email|tel|number|date|select|textarea, options: [...], required: true } ] }.

# template.html (gabarit neutre)
- {{ expr }} affiche une valeur échappée. Fonctions qui produisent du HTML sûr, à mettre en tête d'expression : ${TEMPLATE_VOCABULARY.safe.join(', ')}. Autres fonctions : ${TEMPLATE_VOCABULARY.functions.filter(f => !TEMPLATE_VOCABULARY.safe.includes(f)).join(', ')}.
  link(p.cta, 'btn') ; img(p.image, p.title, '(max-width: 700px) 100vw, 50vw') ; img_src(p.image, 1600) donne l'URL ; icon(nom) ; paragraphs(texte) pour un texte long (paragraphes, listes « - », **gras**) ; markup(texte) pour une ligne ; lines(texte) garde les retours à la ligne.
- Balises : {% if e %} {% elif e %} {% else %} {% endif %} ; {% for x in liste %} … {% endfor %} avec loop.index, loop.first, loop.last, loop.count ; {% set x = e %} ; {# commentaire #}.
- Expressions : chemins (p.items, it.title), littéraux, + - * / %, ~ (concaténation), == != < > <= >=, and or not, in. Filtres (prioritaires sur les opérateurs, mets des parenthèses) : ${TEMPLATE_VOCABULARY.filters.join(', ')}. Pas de ternaire, pas de littéral objet.
- Variables : p (les props, seulement celles déclarées dans le manifeste), site (site.name, site.contact.phone, site.contact.email, site.contact.address), page, loop, et form si effects.form.
- Formulaire déclaré : {% form %} … {{ field('nom') }} … <button class="btn" type="submit">Envoyer</button> {% endform %} ; avant : {% if form.ok %}…{{ form.success }}…{% else %} … {% endif %} ; form.failed et form.message pour l'erreur générale.
- Interdits : PHP, <script>, attributs onclick=…, javascript:, <iframe>, <link>, <meta>, style=… sauf variables CSS. Pas de texte inventé présenté comme un fait (prix, délais, labels) : tout texte vient des props.
- Structure : <section class="section NOM"> puis <div class="container">…</div>. Un titre de section : <div class="section-head"><h2>…</h2><p>intro</p></div>. Classes utilitaires disponibles : btn, btn btn-outline, card, muted, grid grid-2|grid-3|grid-4, badge.
- Accessibilité : alt sur les images (img() le gère), boutons type="button", hiérarchie de titres h2 puis h3.

# styles.css (CSS encadré, vérifié)
- Chaque sélecteur commence par une classe préfixée du nom du composant : pour le composant « exemple-nom », .exemple-nom, .exemple-nom-carte, .exemple-nom h3… Jamais de sélecteur global (h2, a, body, :root, *).
- Couleurs, polices et rayons viennent du thème : ${tokens}. Aucune couleur ni police écrite en dur, pas de !important.
- Aucune ressource externe, pas de @import, @font-face ni url(http…). @keyframes préfixés du nom du composant. Responsive avec @media (max-width: 760px).
- Reste court : la mise en page de base (sections, conteneur, grilles, cartes, boutons) existe déjà.

# Comportements navigateur (behaviors), fournis par le compilateur
${Object.entries(BEHAVIORS).map(([k, b]) => `- ${k} : ${b.description}. Usage : ${b.usage}`).join('\n')}
Déclare dans behaviors chaque comportement dont tu poses les attributs. Sans JavaScript, le contenu doit rester lisible.

# Pictogrammes pour icon()
${icons}

# Cas de test (fixtures)
2 à 4 cas : un complet, un minimal (seulement les props obligatoires), et un cas limite (liste longue, texte long, prop facultative absente). Chaque yaml contient seulement les props, valides contre le schéma.

${await ref('features')}

${await ref('testimonials')}

Réponds uniquement par l'objet JSON demandé.`;
}

/**
 * Cible d'une génération : le dossier du composant, son nom d'usage dans les pages et son nom de manifeste.
 * Dans un paquet (pkg = chemin déclaré dans site.yaml › packages), le nom d'usage est préfixé (vitrine.carte) et le manifeste porte le nom court.
 */
export function resolveTarget(project, name, pkg = null) {
  if (!pkg) return { dir: path.join(project.root, 'components', name), name, manifestName: name, pkg: null };
  const p = (project.packages || []).find(x => x.spec === pkg || path.resolve(project.root, pkg) === x.dir);
  if (!p) throw new Error(`Paquet ${pkg} absent de site.yaml › packages (déclarés : ${(project.packages || []).map(x => x.spec).join(', ') || 'aucun'}).`);
  const prefix = p.prefix || p.meta?.name;
  if (!prefix) throw new Error(`Le paquet ${pkg} n'a pas de nom (package.yaml › name).`);
  const short = name.startsWith(prefix + '.') ? name.slice(prefix.length + 1) : name;
  return { dir: path.join(p.dir, 'components', short), name: prefix + '.' + short, manifestName: short, pkg: prefix };
}

const FENCE = '```';
const fence = (lang, t) => `${FENCE}${lang}\n${String(t).trim()}\n${FENCE}`;
const filesBlock = f => `manifest.yaml :\n${fence('yaml', f.manifest)}${f.template ? `\ntemplate.html :\n${fence('html', f.template)}` : ''}${f.styles ? `\nstyles.css :\n${fence('css', f.styles)}` : ''}\nfixtures :\n${f.fixtures.map(x => `- ${x.name} :\n${fence('yaml', x.yaml)}`).join('\n')}`;

/** Message utilisateur : la demande, le contexte du site ; pour une modification, les fichiers actuels ; pour une réparation, les problèmes. */
/** Mots du vocabulaire visibles depuis le composant visé : natifs et du paquet (sans préfixe) pour un composant de paquet, tous pour un composant du site. */
export function visibleWords(project, target = null) {
  if (target?.pkg) { const p = (project.packages || []).find(x => x.prefix === target.pkg); return new Map([...(project.catalog?.words || []), ...(p?.words || [])]); }
  return project.words || project.catalog?.words || new Map();
}

export function buildUserPrompt({ name, description, project, previous = null, problems = [], target = null, current = null, request = null }) {
  const t = target || { name, manifestName: name, pkg: null };
  const site = project.site?.site || {};
  const theme = site.theme || {};
  const existing = project.catalog ? project.catalog.names().filter(n => n !== t.name) : [];
  const words = [...visibleWords(project, t).values()].filter(w => !w.broken);
  const ctx = [
    `Site : ${site.name || '?'}${site.tagline ? ' — ' + site.tagline : ''}`,
    `Thème : ${theme.preset || 'clair'}${theme.tokens ? ' ; surcharges ' + JSON.stringify(theme.tokens) : ''}`,
    `Images disponibles dans assets/ (pour l'exemple et les cas de test) : ${[...project.assets].filter(a => /\.(jpe?g|png|webp|svg)$/i.test(a)).slice(0, 30).join(', ') || 'aucune'}`,
    `Composants déjà présents (ne pas réutiliser ces noms) : ${existing.join(', ')}`,
    `Préfixes de classe CSS à utiliser : ${cssPrefixes(t.name).map(p => '.' + p).join(' ou ')}`,
    ...(words.length ? [`Mots du vocabulaire utilisables dans la forme, en plus des primitives :\n${words.map(w => `  - ${wordUsage(w)} — ${w.description}`).join('\n')}`] : []),
    t.pkg ? `Paquet : ${t.pkg}. Dans manifest.yaml, name: ${t.manifestName} (nom court) ; dans l'exemple et les pages, le composant s'écrit « - ${t.name}: ».` : `Dans manifest.yaml, name: ${t.manifestName}.`,
  ].join('\n');
  let msg = `Nom du composant : ${t.name}\n\nDescription :\n${String(description).trim()}\n\nContexte :\n${ctx}`;
  if (current && request) msg += `\n\n# Composant actuel\n${filesBlock(current)}\n\n# Modification demandée\n${request.trim()}\n\nApplique la modification en gardant ce qui n'est pas concerné (props existantes, classes, cas de test). Si la modification change les props, mets à jour l'exemple et les cas de test. Renvoie l'ensemble complet des fichiers.`;
  if (previous) msg += `\n\n# Ta proposition précédente ne passe pas la vérification.\nCorrige tous les problèmes ci-dessous et renvoie l'ensemble complet des fichiers.\n\n## Problèmes\n${problems.map(p => `- [${p.code}] ${p.file}${p.path ? ' › ' + p.path : ''} : ${p.message}${p.hint ? ' (' + p.hint + ')' : ''}`).join('\n')}\n\n## Fichiers précédents\n${filesBlock(previous)}`;
  return msg;
}

/** Lit une réponse (JSON brut, ou réponse d'API, ou texte contenant un objet JSON). */
export function parseResponse(text) {
  let raw = text;
  try { const j = JSON.parse(text); if (j && Array.isArray(j.content)) raw = j.content.filter(b => b.type === 'text').map(b => b.text).join(''); else if (j && j.manifest) return normalizeFiles(j); } catch { /* texte libre */ }
  const m = /\{[\s\S]*\}/.exec(String(raw));
  if (!m) throw new Error('Réponse sans objet JSON.');
  return normalizeFiles(JSON.parse(m[0]));
}
function normalizeFiles(j) {
  if (typeof j.manifest !== 'string' || !j.manifest.trim()) throw new Error('Réponse incomplète : manifest manquant.');
  const lang = /^(données|forme):/m.test(j.manifest);
  if (!lang) for (const k of ['template', 'styles']) if (typeof j[k] !== 'string' || !j[k].trim()) throw new Error(`Réponse incomplète : ${k} manquant (ou écrivez données et forme dans le manifeste).`);
  const fixtures = (Array.isArray(j.fixtures) ? j.fixtures : []).filter(f => f && typeof f.name === 'string' && typeof f.yaml === 'string').map(f => ({ name: f.name.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '') || 'cas', yaml: f.yaml }));
  return { manifest: j.manifest, template: typeof j.template === 'string' && j.template.trim() ? j.template : null, styles: typeof j.styles === 'string' && j.styles.trim() ? j.styles : null, fixtures, notes: typeof j.notes === 'string' ? j.notes : '' };
}

/** Écrit les fichiers du composant (dossier remplacé : anciens instantanés compris). history : modifications demandées, gardées dans description.md. */
export async function writeComponent(dir, name, files, description, history = []) {
  await fs.rm(dir, { recursive: true, force: true });
  await fs.mkdir(path.join(dir, 'fixtures'), { recursive: true });
  await fs.writeFile(path.join(dir, 'manifest.yaml'), files.manifest.trim() + '\n');
  if (files.template) await fs.writeFile(path.join(dir, 'template.html'), files.template.trim() + '\n');
  if (files.styles) await fs.writeFile(path.join(dir, 'styles.css'), files.styles.trim() + '\n');
  for (const f of files.fixtures) await fs.writeFile(path.join(dir, 'fixtures', f.name + '.yaml'), f.yaml.trim() + '\n');
  const mods = history.length ? `\n## Modifications\n\n${history.map(h => `- ${h}`).join('\n')}\n` : '';
  await fs.writeFile(path.join(dir, 'description.md'), `# ${name}\n\n${String(description).trim()}\n${mods}\n<!-- Source lisible du composant : sitec component new … --from cette description --force le régénère ; sitec component edit … --ask "…" le modifie. Les autres fichiers en ont été produits puis vérifiés. -->\n`);
  return dir;
}

/** Lit un composant existant : fichiers, description et historique des modifications. */
export async function readComponent(dir) {
  const read = f => fs.readFile(path.join(dir, f), 'utf8').catch(() => null);
  const manifest = await read('manifest.yaml'), template = await read('template.html');
  if (manifest === null || (template === null && !/^forme:/m.test(manifest))) return null;
  const fixtures = [];
  for (const f of (await fs.readdir(path.join(dir, 'fixtures')).catch(() => [])).filter(x => /\.ya?ml$/.test(x)).sort()) fixtures.push({ name: f.replace(/\.ya?ml$/, ''), yaml: await read('fixtures/' + f) });
  const md = (await read('description.md')) || '';
  const body = md.replace(/^# .*\n+/, '').replace(/<!--[\s\S]*?-->/g, '');
  const [desc, hist = ''] = body.split(/\n## Modifications\n/);
  return { files: { manifest, template, styles: await read('styles.css'), fixtures, notes: '' }, description: desc.trim(), history: hist.split('\n').map(l => l.replace(/^- /, '').trim()).filter(Boolean), format: /^forme:/m.test(manifest) ? 'langage' : 'html' };
}

/** Vérifie le composant dans son projet : erreurs et avertissements qui le concernent, puis rendu de ses cas de test. */
export async function verifyComponent(root, target, catalog, { render = true } = {}) {
  const t = typeof target === 'string' ? { dir: path.join(root, 'components', target), name: target } : target;
  const dir = t.dir.replaceAll('\\', '/');
  const project = await loadProject(root);
  const errors = validateProject(project, catalog);
  const mine = e => (e.file || '').replaceAll('\\', '/').startsWith(dir + '/') || (e.message || '').includes(t.name);
  const rel = e => ({ ...e, file: path.relative(root, e.file || '').replaceAll('\\', '/') });
  const problems = errors.filter(mine).map(rel);
  // Avertissements remontés même avec des erreurs : un seul tour de réparation corrige tout.
  const warnings = collectWarnings(project).filter(mine).map(rel);
  let tests = null;
  if (render && !errors.length) {
    const { testComponents, findPhp } = await import('./component-test.js');
    if (findPhp()) {
      const r = await testComponents(project, { only: t.name });
      tests = r.results;
      for (const x of r.results) if (['invalid', 'error', 'changed'].includes(x.status)) problems.push({ code: x.status === 'invalid' ? 'E_FIXTURE' : 'E_RENDER', file: path.relative(root, path.join(t.dir, 'fixtures', x.name + '.yaml')).replaceAll('\\', '/'), path: '', message: x.detail });
    }
  }
  if (!errors.length && !project.catalog?.has(t.name)) problems.push({ code: 'E_COMPONENT', file: path.relative(root, path.join(t.dir, 'manifest.yaml')).replaceAll('\\', '/'), path: '', message: 'composant absent du catalogue après vérification' });
  return { problems, warnings, others: errors.filter(e => !mine(e)).length, tests, project };
}

/**
 * Génère (ou modifie, avec current + request), vérifie, répare. opts : { root, name, description, catalog, model, client, rounds, onRound, ask, pkg, request, current, history } ;
 * ask(system, user, round) peut remplacer l'appel au modèle (tests). Renvoie { ok, rounds, problems, warnings, files, notes, target }.
 */
export async function generateComponent({ root, name, description, catalog, rounds = 3, onRound = () => {}, ask = null, pkg = null, request = null, current = null, history = [], format = 'langage', onUsage = null }) {
  const system = await buildSystemPrompt(format);
  const project = await loadProject(root); validateProject(project, catalog);
  const target = resolveTarget(project, name, pkg);
  let previous = null, problems = [], warnings = [], files = null;
  for (let r = 1; r <= rounds; r++) {
    const user = buildUserPrompt({ name: target.name, description, project, previous, problems: [...problems, ...warnings], target, current, request });
    if (!ask) throw new Error('generateComponent attend ask(system, user, tour) : le compilateur n\'appelle aucun modèle (en ligne de commande : --export puis --import).');
    const text = await ask(system, user, r);
    try { files = parseResponse(text); }
    catch (e) { problems = [{ code: 'E_RESPONSE', file: '(réponse)', path: '', message: e.message + ' Renvoie uniquement l\'objet JSON demandé.' }]; warnings = []; onRound({ round: r, problems, warnings }); continue; }
    await writeComponent(target.dir, target.name, files, description, request ? [...history, request.trim()] : history);
    ({ problems, warnings } = await verifyComponent(root, target, catalog));
    onRound({ round: r, problems, warnings, notes: files.notes });
    if (!problems.length && !warnings.length) return { ok: true, rounds: r, problems, warnings, files, notes: files.notes, target };
    previous = files;
  }
  return { ok: !problems.length, rounds, problems, warnings, files, notes: files?.notes || '', target };
}

/** Modifie un composant existant selon une demande en langage naturel ; en cas d'échec final, l'ancienne version est restaurée. */
export async function editComponent({ root, name, request, catalog, pkg = null, ...opts }) {
  const project = await loadProject(root); validateProject(project, catalog);
  const target = resolveTarget(project, name, pkg);
  const existing = await readComponent(target.dir);
  if (!existing) throw new Error(`Composant introuvable : ${path.relative(root, target.dir)} (manifest.yaml et template.html attendus).`);
  const backup = await fs.mkdtemp(path.join(os.tmpdir(), 'sitec-sauvegarde-'));
  await fs.cp(target.dir, backup, { recursive: true });
  try {
    const r = await generateComponent({ root, name, description: existing.description || name, catalog, pkg, request, current: existing.files, history: existing.history, format: existing.format, ...opts });
    if (!r.ok) { await fs.rm(target.dir, { recursive: true, force: true }); await fs.cp(backup, target.dir, { recursive: true }); r.restored = true; }
    return r;
  } finally { await fs.rm(backup, { recursive: true, force: true }); }
}
