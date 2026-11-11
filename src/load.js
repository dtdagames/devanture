import fs from 'node:fs/promises';
import path from 'node:path';
import YAML from 'yaml';
import { err } from './errors.js';
import { readComponentDir, loadCatalog } from './catalog.js';
import { readSiteDocument, readPageDocument, componentSchemas, baseOf } from './lang/site-document.js';
import { readingDiff } from './lang/document.js';
import { THEME_PRESETS } from './emit/php/css.js';
import { SITE_SCHEMA } from './validate.js';

const LIRE = 'sitec lire <dossier> redit ce que le compilateur comprend et ce qui a changé ; --accepter fige cette lecture';
/** Erreurs d'un document (site.md, pages/<id>.md) et de sa lecture figée (lecture/…), au format des erreurs de chargement. */
function documentErrors(doc, errors) {
  for (const e of doc.errors) errors.push(err('E_DOCUMENT', { file: doc.file, path: e.line ? `ligne ${e.line}` : '', message: e.message + (/[.?!…»]$/.test(e.message) ? '' : '.'), ...(e.hint ? { hint: e.hint } : {}) }));
  if (doc.errors.length) return;
  if (doc.frozen === undefined) errors.push(err('E_READING', { file: doc.frozenFile, path: '', message: `Lecture absente : ${path.basename(doc.file)} n'a pas encore été relu.`, hint: LIRE }));
  else { const d = readingDiff(doc.frozen, doc.yaml); if (d) errors.push(err('E_READING', { file: doc.frozenFile, path: '', message: `La lecture de ${path.basename(doc.file)} a changé depuis qu'elle a été acceptée : « ${d.was} » est devenu « ${d.now} ».`, hint: LIRE })); }
}

/**
 * Charge un projet : site.yaml, pages/*.page.yaml, liste des assets.
 * Format document (prototype) : site.md à la place de site.yaml, pages/<id>.md à la place de pages/<id>.page.yaml ; leur lecture
 * rend les mêmes données, et elle est figée dans lecture/ (site.yaml, pages/<id>.page.yaml).
 * Les erreurs de lecture/parsing sont collectées dans project.loadErrors,
 * la validation continue sur ce qui a pu être lu.
 */
export async function loadProject(root, { catalog = null } = {}) {
  const project = { root, site: null, siteFile: path.join(root, 'site.yaml'), pages: [], assets: new Set(), loadErrors: [] };

  const text = f => fs.readFile(f, 'utf8').then(t => t, () => undefined);
  project.documents = { site: null, pages: [] };
  const siteMd = await text(path.join(root, 'site.md'));
  if (siteMd !== undefined) {
    // Le site écrit comme un document : sa lecture vaut un site.yaml.
    const yamlFile = project.siteFile;
    project.siteFile = path.join(root, 'site.md');
    if (await text(yamlFile) !== undefined) project.loadErrors.push(err('E_DOCUMENT', { file: project.siteFile, path: '', message: 'site.md et site.yaml à la fois : un site n\'a qu\'une source.', hint: 'Gardez le document, supprimez site.yaml.' }));
    const r = readSiteDocument(siteMd, { tokens: Object.keys(THEME_PRESETS.clair), groups: SITE_SCHEMA.properties.site.properties });
    const frozenFile = path.join(root, 'lecture', 'site.yaml');
    project.documents.site = { file: project.siteFile, text: siteMd, yaml: r.yaml, errors: r.errors, where: r.where, frozenFile, frozen: await text(frozenFile) };
    documentErrors(project.documents.site, project.loadErrors);
    project.site = r.data;
  } else {
    const siteDoc = await readYaml(project.siteFile, project.loadErrors);
    if (siteDoc !== undefined) project.site = siteDoc;
  }

  const pagesDir = path.join(root, 'pages');
  let pageFiles = [], pageDocs = [];
  try {
    const all = await fs.readdir(pagesDir);
    pageFiles = all.filter(f => f.endsWith('.page.yaml')).sort();
    pageDocs = all.filter(f => f.endsWith('.md')).sort();
  } catch {
    project.loadErrors.push(err('E_NO_PAGES', { file: pagesDir, message: 'Dossier pages/ introuvable.', hint: 'Créez pages/accueil.page.yaml avec page, route et sections.' }));
  }
  for (const f of pageFiles) {
    const file = path.join(pagesDir, f);
    const data = await readYaml(file, project.loadErrors);
    if (data !== undefined) project.pages.push({ file, id: f.replace(/\.page\.yaml$/, ''), data });
  }

  try {
    for (const a of await fs.readdir(path.join(root, 'assets'), { recursive: true })) {
      project.assets.add(String(a).replaceAll('\\', '/'));
    }
  } catch { /* pas d'assets, pas grave */ }

  // Brief du client (optionnel) : brief.md, source de vérité pour la relecture éditoriale.
  project.brief = null;
  for (const name of ['brief.md', 'brief.txt']) { try { project.brief = await fs.readFile(path.join(root, name), 'utf8'); project.briefFile = path.join(root, name); break; } catch { /* absent */ } }

  // Produits (optionnel) : data/products.yaml.
  project.productsFile = path.join(root, 'data', 'products.yaml');
  project.productsRaw = null;
  try { await fs.access(project.productsFile); project.productsRaw = await readYaml(project.productsFile, project.loadErrors) ?? null; } catch { /* pas de boutique */ }

  // Collections génériques (déclarées dans site.yaml, remplies dans data/<nom>.yaml) : lues ici, validées plus tard.
  project.collections = {};
  const declared = project.site && typeof project.site === 'object' && project.site.collections && typeof project.site.collections === 'object' ? Object.keys(project.site.collections) : [];
  for (const name of declared) {
    if (!/^[a-z][a-z0-9_]*$/.test(name)) continue;
    const file = path.join(root, 'data', name + '.yaml');
    let raw = null;
    try { await fs.access(file); raw = await readYaml(file, project.loadErrors) ?? null; } catch { /* absent : signalé par la validation */ }
    project.collections[name] = { file, raw, items: [], spec: null };
  }

  // Composants composés du projet (optionnel) : components.yaml.
  project.componentsFile = path.join(root, 'components.yaml');
  project.componentsRaw = null;
  try { await fs.access(project.componentsFile); project.componentsRaw = await readYaml(project.componentsFile, project.loadErrors) ?? null; } catch { /* pas de composants composés */ }

  // Vocabulaire du projet (optionnel) : vocabulaire.yaml, des mots nouveaux pour la forme des composants. Lu en texte : ses erreurs renvoient à la ligne.
  project.vocabFile = path.join(root, 'vocabulaire.yaml');
  project.vocabText = await fs.readFile(project.vocabFile, 'utf8').catch(() => null);

  // Composants de projet (gabarit neutre) : components/<nom>/manifest.yaml + template.html (+ styles.css, module.js).
  project.componentSources = [];
  try { for (const d of await fs.readdir(path.join(root, 'components'), { withFileTypes: true })) if (d.isDirectory() && !d.name.startsWith('.')) { const src = await readComponentDir(path.join(root, 'components', d.name)); if (src) project.componentSources.push(src); } } catch { /* pas de composants de projet */ }

  // Paquets de composants (site.yaml › packages) : un chemin (./paquets/x, ../bibliotheque) ou un nom de paquet installé (node_modules/<nom>).
  // Chaque paquet : package.yaml { name, description, version }, components/<nom>/ (gabarit neutre), components.yaml (composés). Noms exposés : <name>.<composant>.
  project.packages = [];
  const declaredPkgs = project.site && typeof project.site === 'object' && Array.isArray(project.site.packages) ? project.site.packages : [];
  for (const spec of declaredPkgs) {
    if (typeof spec !== 'string' || !spec) continue;
    const local = /^(\.{1,2}[\\/]|[\\/]|[A-Za-z]:)/.test(spec);
    const dir = local ? path.resolve(root, spec) : path.join(root, 'node_modules', spec);
    const pkg = { spec, dir, local, file: path.join(dir, 'package.yaml'), meta: null, componentSources: [], compositesRaw: null, compositesFile: path.join(dir, 'components.yaml'), vocabFile: path.join(dir, 'vocabulaire.yaml'), vocabText: null, missing: false };
    try { await fs.access(pkg.file); } catch { pkg.missing = true; project.packages.push(pkg); continue; }
    pkg.meta = await readYaml(pkg.file, project.loadErrors) ?? null;
    try { for (const d of await fs.readdir(path.join(dir, 'components'), { withFileTypes: true })) if (d.isDirectory() && !d.name.startsWith('.')) { const src = await readComponentDir(path.join(dir, 'components', d.name)); if (src) pkg.componentSources.push(src); } } catch { /* pas de composants à gabarit */ }
    pkg.vocabText = await fs.readFile(pkg.vocabFile, 'utf8').catch(() => null);
    try { await fs.access(pkg.compositesFile); pkg.compositesRaw = await readYaml(pkg.compositesFile, project.loadErrors) ?? null; } catch { /* pas de composés */ }
    project.packages.push(pkg);
  }

  // Segments de personnalisation (optionnel).
  project.segmentsFile = path.join(root, 'segments.yaml');
  project.segmentsRaw = null;
  try { await fs.access(project.segmentsFile); project.segmentsRaw = await readYaml(project.segmentsFile, project.loadErrors) ?? null; } catch { /* pas de segments */ }

  // Pages écrites comme des documents (pages/<id>.md) : lues d'après les données que chaque composant déclare, donc après
  // les composants du site et des paquets. Elles prennent le rang qu'aurait leur .page.yaml.
  if (pageDocs.length) {
    const schemas = componentSchemas(project, catalog || await loadCatalog());
    // Une page dérivée (« Dérive de : accueil ») se lit après sa page de base, dont elle remplace des sections.
    const sources = []; for (const f of pageDocs) sources.push({ f, source: await text(path.join(pagesDir, f)) ?? '' });
    const pageOf = id => project.pages.find(p => p.id === id)?.data || null;
    for (const { f, source } of [...sources.filter(s => !baseOf(s.source)), ...sources.filter(s => baseOf(s.source))]) {
      const file = path.join(pagesDir, f), id = f.replace(/\.md$/, '');
      if (project.pages.some(p => p.id === id)) { project.loadErrors.push(err('E_DOCUMENT', { file, path: '', message: `${f} et ${id}.page.yaml à la fois : une page n'a qu'une source.` })); continue; }
      const r = readPageDocument(source, { schemas, pageOf });
      const frozenFile = path.join(root, 'lecture', 'pages', id + '.page.yaml');
      const doc = { id, file, text: source, yaml: r.yaml, errors: r.errors, where: r.where, frozenFile, frozen: await text(frozenFile) };
      project.documents.pages.push(doc);
      documentErrors(doc, project.loadErrors);
      project.pages.push({ file, id, data: r.data, document: doc });
    }
    const rank = p => (p.document ? p.id + '.page.yaml' : path.basename(p.file));
    project.pages.sort((a, b) => (rank(a) < rank(b) ? -1 : rank(a) > rank(b) ? 1 : 0));
  }

  // Tous les fichiers du projet (pour l'atelier embarqué et les contrôles de chemins). Parcours manuel : dist/, node_modules/ et .git/ sont élagués avant d'y entrer
  // et les liens symboliques ne sont pas suivis (un dépôt de site installe le compilateur sous node_modules/, parfois par lien vers un dossier qui contient le site : boucle).
  project.files = new Set();
  const SKIP = new Set(['dist', 'node_modules', '.git']);
  const walk = async (dir, rel) => {
    let entries = [];
    try { entries = await fs.readdir(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (e.isSymbolicLink() || (rel === '' && SKIP.has(e.name))) continue;
      const r = rel ? rel + '/' + e.name : e.name;
      if (e.isDirectory()) { project.files.add(r); await walk(path.join(dir, e.name), r); }
      else project.files.add(r);
    }
  };
  await walk(root, '');

  return project;
}

async function readYaml(file, errors) {
  let text;
  try { text = await fs.readFile(file, 'utf8'); }
  catch {
    errors.push(err('E_MISSING_FILE', { file, message: `Fichier introuvable : ${path.basename(file)}.` }));
    return undefined;
  }
  try {
    const doc = YAML.parseDocument(text, { prettyErrors: true });
    if (doc.errors.length) {
      for (const e of doc.errors) {
        const lines = text.split('\n');
        let line = e.linePos?.[0]?.line;
        // Le parseur pointe souvent la fin du fichier ou la ligne suivante : remonter à la dernière ligne non vide.
        while (line > 1 && !(lines[line - 1] || '').trim()) line--;
        const snippet = line ? (lines[line - 1] || '').trim().slice(0, 90) : '';
        // Diagnostic par le contenu de la ligne plutôt que par le code du parseur.
        const hashPitfall = /\{[^}]*:\s*#/.test(snippet) || /:\s*#\S/.test(snippet);
        const flowPitfall = hashPitfall || /\{[^}]*[,:]/.test(snippet) || ['BLOCK_AS_IMPLICIT_KEY', 'BLOCK_IN_FLOW', 'MULTILINE_IMPLICIT_KEY', 'MISSING_CHAR', 'UNEXPECTED_TOKEN'].includes(e.code);
        const tail = ' Le reste de ce fichier n\'a pas pu être vérifié : d\'autres erreurs peuvent apparaître après correction.';
        errors.push(err('E_YAML_PARSE', {
          file,
          path: line ? `ligne ${line}` : '',
          message: `YAML invalide${line ? ` ligne ${line}` : ''} : ${e.message.split('\n')[0].replace(/ at line.*$/, '')}.${snippet ? ` Contenu : ${snippet}` : ''}`,
          hint: hashPitfall
            ? 'Un « # » non protégé commence un commentaire YAML : tout ce qui suit est ignoré. Écrivez l\'ancre entre guillemets, par exemple to: "#formulaire".' + tail
            : flowPitfall
              ? 'Probablement un deux-points, une virgule ou un # dans un texte en notation { }. Mettez le texte entre guillemets ("…") ou passez en notation bloc (une prop par ligne).' + tail
              : 'Vérifiez l\'indentation (2 espaces) et les deux-points.' + tail,
        }));
      }
      return undefined;
    }
    return doc.toJS();
  } catch (e) {
    errors.push(err('E_YAML_PARSE', { file, message: e.message }));
    return undefined;
  }
}
