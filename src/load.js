import fs from 'node:fs/promises';
import path from 'node:path';
import YAML from 'yaml';
import { err } from './errors.js';

/**
 * Charge un projet : site.yaml, pages/*.page.yaml, liste des assets.
 * Les erreurs de lecture/parsing sont collectées dans project.loadErrors,
 * la validation continue sur ce qui a pu être lu.
 */
export async function loadProject(root) {
  const project = { root, site: null, siteFile: path.join(root, 'site.yaml'), pages: [], assets: new Set(), loadErrors: [] };

  const siteDoc = await readYaml(project.siteFile, project.loadErrors);
  if (siteDoc !== undefined) project.site = siteDoc;

  const pagesDir = path.join(root, 'pages');
  let pageFiles = [];
  try {
    pageFiles = (await fs.readdir(pagesDir)).filter(f => f.endsWith('.page.yaml')).sort();
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

  // Segments de personnalisation (optionnel).
  project.segmentsFile = path.join(root, 'segments.yaml');
  project.segmentsRaw = null;
  try { await fs.access(project.segmentsFile); project.segmentsRaw = await readYaml(project.segmentsFile, project.loadErrors) ?? null; } catch { /* pas de segments */ }

  // Tous les fichiers du projet (pour les blocs custom). Parcours manuel : dist/, node_modules/ et .git/ sont élagués avant d'y entrer
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
