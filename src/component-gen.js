// Générateur de composants : une description en langage naturel devient un composant de projet en formats neutres (manifeste,
// gabarit, feuille de style, cas de test), vérifié par le compilateur et réparé jusqu'à passer. Le résultat est figé dans le projet ;
// la compilation ne rappelle jamais le modèle. Trois modes, comme sitec keywords : appel direct (SDK Anthropic), export du prompt,
// import d'une réponse.
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

export const DEFAULT_MODEL = 'claude-opus-5-5';

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

/** Guide du langage des composants, construit depuis le code du compilateur (toujours à jour). */
export async function buildSystemPrompt() {
  const icons = (await readText(path.join(COMPONENTS_DIR, 'features', 'manifest.yaml')))?.match(/enum: \[([^\]]+)\]/)?.[1] || '';
  const tokens = Object.keys(THEME_PRESETS.clair).map(k => `var(--${k.replace(/\./g, '-')})`).join(', ');
  const ref = async (name) => {
    const dir = path.join(COMPONENTS_DIR, name);
    return `### Composant de référence : ${name}\nmanifest.yaml :\n\`\`\`yaml\n${(await readText(path.join(dir, 'manifest.yaml')) || '').trim()}\n\`\`\`\ntemplate.html :\n\`\`\`html\n${(await readText(path.join(dir, 'template.html')) || '').trim()}\n\`\`\`\nstyles.css :\n\`\`\`css\n${(await readText(path.join(dir, 'styles.css')) || '').trim()}\n\`\`\``;
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
const filesBlock = f => `manifest.yaml :\n${fence('yaml', f.manifest)}\ntemplate.html :\n${fence('html', f.template)}\nstyles.css :\n${fence('css', f.styles)}\nfixtures :\n${f.fixtures.map(x => `- ${x.name} :\n${fence('yaml', x.yaml)}`).join('\n')}`;

/** Message utilisateur : la demande, le contexte du site ; pour une modification, les fichiers actuels ; pour une réparation, les problèmes. */
export function buildUserPrompt({ name, description, project, previous = null, problems = [], target = null, current = null, request = null }) {
  const t = target || { name, manifestName: name, pkg: null };
  const site = project.site?.site || {};
  const theme = site.theme || {};
  const existing = project.catalog ? project.catalog.names().filter(n => n !== t.name) : [];
  const ctx = [
    `Site : ${site.name || '?'}${site.tagline ? ' — ' + site.tagline : ''}`,
    `Thème : ${theme.preset || 'clair'}${theme.tokens ? ' ; surcharges ' + JSON.stringify(theme.tokens) : ''}`,
    `Images disponibles dans assets/ (pour l'exemple et les cas de test) : ${[...project.assets].filter(a => /\.(jpe?g|png|webp|svg)$/i.test(a)).slice(0, 30).join(', ') || 'aucune'}`,
    `Composants déjà présents (ne pas réutiliser ces noms) : ${existing.join(', ')}`,
    `Préfixes de classe CSS à utiliser : ${cssPrefixes(t.name).map(p => '.' + p).join(' ou ')}`,
    t.pkg ? `Paquet : ${t.pkg}. Dans manifest.yaml, name: ${t.manifestName} (nom court) ; dans l'exemple et les pages, le composant s'écrit « - ${t.name}: ».` : `Dans manifest.yaml, name: ${t.manifestName}.`,
  ].join('\n');
  let msg = `Nom du composant : ${t.name}\n\nDescription :\n${String(description).trim()}\n\nContexte :\n${ctx}`;
  if (current && request) msg += `\n\n# Composant actuel\n${filesBlock(current)}\n\n# Modification demandée\n${request.trim()}\n\nApplique la modification en gardant ce qui n'est pas concerné (props existantes, classes, cas de test). Si la modification change les props, mets à jour l'exemple et les cas de test. Renvoie l'ensemble complet des fichiers.`;
  if (previous) msg += `\n\n# Ta proposition précédente ne passe pas la vérification.\nCorrige tous les problèmes ci-dessous et renvoie l'ensemble complet des fichiers.\n\n## Problèmes\n${problems.map(p => `- [${p.code}] ${p.file}${p.path ? ' › ' + p.path : ''} : ${p.message}${p.hint ? ' (' + p.hint + ')' : ''}`).join('\n')}\n\n## Fichiers précédents\n${filesBlock(previous)}`;
  return msg;
}

/** Appel au modèle : sortie structurée, effort élevé, repli serveur automatique en cas de refus. */
export async function askModel({ system, user, model = DEFAULT_MODEL, client = null }) {
  if (!client) { const { default: Anthropic } = await import('@anthropic-ai/sdk'); client = new Anthropic(); }
  const response = await client.beta.messages.stream({
    model,
    max_tokens: 32000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'high', format: { type: 'json_schema', schema: OUTPUT_SCHEMA } },
    system,
    messages: [{ role: 'user', content: user }],
  }).finalMessage();
  if (response.stop_reason === 'refusal') throw new Error(`Le modèle a refusé la demande (${response.stop_details?.category ?? 'sans catégorie'}).`);
  if (response.stop_reason === 'max_tokens') throw new Error('Réponse tronquée (limite de longueur atteinte) : simplifiez la description.');
  return response.content.filter(b => b.type === 'text').map(b => b.text).join('');
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
  for (const k of ['manifest', 'template', 'styles']) if (typeof j[k] !== 'string' || !j[k].trim()) throw new Error(`Réponse incomplète : ${k} manquant.`);
  const fixtures = (Array.isArray(j.fixtures) ? j.fixtures : []).filter(f => f && typeof f.name === 'string' && typeof f.yaml === 'string').map(f => ({ name: f.name.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '') || 'cas', yaml: f.yaml }));
  return { manifest: j.manifest, template: j.template, styles: j.styles, fixtures, notes: typeof j.notes === 'string' ? j.notes : '' };
}

/** Écrit les fichiers du composant (dossier remplacé : anciens instantanés compris). history : modifications demandées, gardées dans description.md. */
export async function writeComponent(dir, name, files, description, history = []) {
  await fs.rm(dir, { recursive: true, force: true });
  await fs.mkdir(path.join(dir, 'fixtures'), { recursive: true });
  await fs.writeFile(path.join(dir, 'manifest.yaml'), files.manifest.trim() + '\n');
  await fs.writeFile(path.join(dir, 'template.html'), files.template.trim() + '\n');
  await fs.writeFile(path.join(dir, 'styles.css'), files.styles.trim() + '\n');
  for (const f of files.fixtures) await fs.writeFile(path.join(dir, 'fixtures', f.name + '.yaml'), f.yaml.trim() + '\n');
  const mods = history.length ? `\n## Modifications\n\n${history.map(h => `- ${h}`).join('\n')}\n` : '';
  await fs.writeFile(path.join(dir, 'description.md'), `# ${name}\n\n${String(description).trim()}\n${mods}\n<!-- Source lisible du composant : sitec component new … --from cette description --force le régénère ; sitec component edit … --ask "…" le modifie. Les autres fichiers en ont été produits puis vérifiés. -->\n`);
  return dir;
}

/** Lit un composant existant : fichiers, description et historique des modifications. */
export async function readComponent(dir) {
  const read = f => fs.readFile(path.join(dir, f), 'utf8').catch(() => null);
  const manifest = await read('manifest.yaml'), template = await read('template.html');
  if (manifest === null || template === null) return null;
  const fixtures = [];
  for (const f of (await fs.readdir(path.join(dir, 'fixtures')).catch(() => [])).filter(x => /\.ya?ml$/.test(x)).sort()) fixtures.push({ name: f.replace(/\.ya?ml$/, ''), yaml: await read('fixtures/' + f) });
  const md = (await read('description.md')) || '';
  const body = md.replace(/^# .*\n+/, '').replace(/<!--[\s\S]*?-->/g, '');
  const [desc, hist = ''] = body.split(/\n## Modifications\n/);
  return { files: { manifest, template, styles: (await read('styles.css')) || '', fixtures, notes: '' }, description: desc.trim(), history: hist.split('\n').map(l => l.replace(/^- /, '').trim()).filter(Boolean) };
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
export async function generateComponent({ root, name, description, catalog, model = DEFAULT_MODEL, client = null, rounds = 3, onRound = () => {}, ask = null, pkg = null, request = null, current = null, history = [] }) {
  const system = await buildSystemPrompt();
  const project = await loadProject(root); validateProject(project, catalog);
  const target = resolveTarget(project, name, pkg);
  let previous = null, problems = [], warnings = [], files = null;
  for (let r = 1; r <= rounds; r++) {
    const user = buildUserPrompt({ name: target.name, description, project, previous, problems: [...problems, ...warnings], target, current, request });
    const text = ask ? await ask(system, user, r) : await askModel({ system, user, model, client });
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
    const r = await generateComponent({ root, name, description: existing.description || name, catalog, pkg, request, current: existing.files, history: existing.history, ...opts });
    if (!r.ok) { await fs.rm(target.dir, { recursive: true, force: true }); await fs.cp(backup, target.dir, { recursive: true }); r.restored = true; }
    return r;
  } finally { await fs.rm(backup, { recursive: true, force: true }); }
}
