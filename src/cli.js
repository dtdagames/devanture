import path from 'node:path';
import { loadCatalog } from './catalog.js';
import { loadProject } from './load.js';
import { validateProject, collectWarnings, SITE_SCHEMA } from './validate.js';
import { emit, TARGETS } from './emit/index.js';
import { formatErrors } from './errors.js';
import { THEME_PRESETS } from './emit/php/css.js';
import { describeComposite } from './composition.js';
import { TEMPLATE_VOCABULARY } from './lang/template.js';
import { BEHAVIORS } from './lang/behaviors.js';
import { TYPE_WORDS } from './lang/donnees.js';
import { PRIMITIVE_HELP, nearest } from './lang/forme.js';
import { wordUsage, WORD_KEYS } from './lang/vocabulaire.js';
import { readDocument, readingDiff, TOURNURES } from './lang/document.js';
import { lineDiff } from './reading.js';
import { writeSiteDocument, writePageDocument, writeSectionDocument, componentSchemas, readSiteDocument, readPageDocument, COMPONENT_NAMES, PROP_NAMES, GROUP_NAMES, writeDataDocument, readDataDocument, PRODUCTS, collectionData, writeSegmentsDocument, readSegmentsDocument, writeFixtureDocument, writePackageDocument, writeHostsDocument } from './lang/site-document.js';
import { SOURCES, SOURCE_NAMES, PUBLIC_SOURCE_NAMES, sourceUsage, sourceFields } from './lang/sources.js';
import YAML from 'yaml';
import { INTENT_NAMES } from './lang/apparence.js';
import { FIELD_TYPE_WORDS, FIELD_MODIFIERS, FORM_SETTINGS } from './lang/fonctionnement.js';
import { EVENTS, GOAL_EVENTS, CONTROL, DEFAULT_MINIMUM } from './segments.js';
import { DEFAULTS as IMAGE_DEFAULTS } from './images/index.js';
import fs from 'node:fs/promises';

const HELP = `sitec — compilateur Devanture (sites vitrines → PHP + JS)

Usage :
  sitec check   <dossier-projet>  [--json]   Valide sans générer
  sitec build   <dossier-projet>  [--out d] [--target php]
                                             Valide puis génère dist/ pour la cible (php, seule cible à ce jour)
  sitec catalog [dossier-projet]             Liste compacte des composants (natifs, puis ceux du projet : composés et gabarits)
  sitec explain <composant> [dossier-projet] [--document]
                                             Fiche détaillée d'un composant (ou : explain site, explain langage, explain document) ; --document ajoute son exemple écrit en document
  sitec component new <dossier> <nom>        Squelette d'un composant de projet : components/<nom>/composant.md (données, forme, apparence, exemple) ; --format html : manifest.yaml, template.html, styles.css
  sitec component new <dossier> <nom> --describe "texte" | --from f.md [--format langage|html] [--force] --export p.json
                                             Écrit la consigne qui fait écrire le composant par un modèle depuis une description ; --import r.json écrit sa réponse (composant.md et cas de test en documents) et la vérifie (--export p2.json : consigne de réparation). Le compilateur n'appelle aucun modèle
  sitec component edit <dossier> <nom> --ask "modification" [--package chemin] --export p.json | --import r.json
                                             Consigne pour modifier un composant existant par une demande en langage naturel, puis import de la réponse (même vérification)
  sitec component preview <dossier> <nom> [--package chemin]
                                             Page d'aperçu de tous les cas de test, avec le thème du site (.devanture/preview/<nom>.html)
  sitec component show <dossier> <nom> [--php] [--json] [--package chemin]
                                             Chaque bloc du manifeste (données, fonctionnement, forme, apparence) et ce qu'il devient : schéma, effets, gabarit, feuille (--php : le PHP exécuté)
  sitec lire <dossier> [composant] [--accepter] [--json] | sitec lire --tournures
                                             Composants au format document (document.md) : ce que le compilateur comprend de chaque phrase ; --accepter fige cette lecture (lecture.yaml)
  sitec lire <dossier> [--accepter] [--tout] Site au format document (site.md, pages/<id>.md) : ce que vaut chaque document, section par section, et ce qui a changé depuis la lecture acceptée (lecture/)
  sitec rediger <dossier> [--composants] [--dry-run]
                                             Récrit en documents ce qui est encore en YAML dans un site, un paquet ou un hôte (site.md, pages/<id>.md, data/<nom>.md, segments.md, vocabulaire.md,
                                             components/<nom>/composant.md et ses cas de test, package.md, hosts.md) ;
                                             chaque document est relu et doit rendre les données d'origine, sinon rien n'est écrit (--composants : les composants seulement ; --catalogue : les composants natifs)
  sitec lire <dossier> [composant] --recrire [--dry-run] --export p.json | --import r.json
                                             Consigne pour faire récrire par un modèle les phrases refusées d'un document.md, puis import de sa réponse ; le lecteur relit chaque réécriture et reste seul juge, la lecture reste à accepter
  sitec schema <dossier> [--no-vscode]       Schémas JSON du site pour l'éditeur (.devanture/schema) et réglages VS Code : complétion des composants, props, assets et routes
  sitec migrate <dossier> [--dry-run] [--to N]
                                             Fait passer le site à la dernière version du langage (texte modifié, commentaires conservés) et suggère ce qu'elle permet d'écrire mieux
  sitec test <dossier> [--update] [--catalog] [--only nom]
                                             Rend chaque cas components/*/fixtures/*.yaml (projet et paquets) par PHP et le compare à son instantané .html
  sitec review   <dossier-projet> [--export f.json] [--import f.json]
                                             Relecture éditoriale : textes à compléter, faits absents du brief (brief.md), engagements à valider
  sitec build … --draft                      Compile malgré des textes à compléter
  sitec keywords <dossier-projet> [--all] [--dry-run] --export f.json | --import f.json
                                             Consigne pour faire proposer par un modèle les mots-clés de recherche de chaque section, puis import de sa réponse, figée dans la source du site
  sitec init  <dossier> [--name "Nom du site"] [--yaml] [--repo github:compte/depot#tag | --local] [--no-git]
                                             Crée un dépôt de site sans PHP : squelette en documents (site.md, pages/<id>.md, lecture figée ; --yaml : squelette YAML), brief, README, CLAUDE.md, .gitignore, flux GitHub Actions (vérifier, déployer), premier commit (--no-git : sans dépôt ni commit)
  sitec host  <dossier-hôte> [--draft]        Compile les sites listés dans hosts.yaml en un seul dist/ routé par domaine
  sitec deploy <dossier-projet> [--to https://domaine | SITE_URL] [--secret s | DEVANTURE_DEPLOY_SECRET]
                                             Pousse dist/ vers /_deploy du site (envois signés, intégrité vérifiée, données conservées)
  sitec help

Code de sortie : 0 = OK, 1 = erreurs de validation, 2 = usage.`;

export async function run(argv) {
  const [cmd, ...rest] = argv;
  const flags = new Set(rest.filter(a => a.startsWith('--')));
  const args = rest.filter(a => !a.startsWith('--'));
  const catalog = await loadCatalog();

  switch (cmd) {
    case 'catalog': {
      const proj = args[0] ? await projectCatalog(args[0], catalog) : null;
      printCatalog(proj?.catalog || catalog, proj);
      return 0;
    }

    case 'explain': {
      const name = args[0];
      if (!name) { console.error('Usage : sitec explain <composant> [dossier-projet]'); return 2; }
      if (name === 'langage' || name === 'language' || name === 'expressions') { explainLanguage(); return 0; }
      if (name === 'document' || name === 'documents') { explainDocument(); return 0; }
      const proj = args[1] ? await projectCatalog(args[1], catalog) : null;
      if (proj?.project.composites?.[name]) { printComposite(proj.project.composites[name]); return 0; }
      // Un mot du vocabulaire (natif, du site ou d'un paquet) s'explique comme un composant : « sitec explain "carte de visite" <dossier> ».
      const words = proj?.project.words || catalog.words;
      const word = words.get(name.trim().toLowerCase().replace(/\s+/g, ' '));
      if (word && !(proj?.catalog || catalog).has(name)) { printWord(word); return 0; }
      // Une source (ce qu'un composant lit à la visite) s'explique de la même façon : « sitec explain "panier du visiteur" ».
      const srcName = SOURCE_NAMES.find(n => n === name.trim().toLowerCase().replace(/\s+/g, ' '));
      if (srcName) { printSource(srcName); return 0; }
      return explain(proj?.catalog || catalog, name, words, flags.has('--document') || !!(proj?.project.documents?.site || proj?.project.documents?.pages.length));
    }

    case 'lire': {
      // Garde-fou n° 3 du format document : le compilateur redit ce qu'il a compris, et rien ne compile tant que ce n'est pas accepté.
      const dir = args[0];
      if (flags.has('--tournures')) {
        // Ce que le lecteur sait lire, tiré de sa table : une ligne par tournure, avec la phrase qui la montre.
        console.log('Tournures comprises dans un document.md (une phrase chacune ; les mots, l\'ordre et les synonymes sont libres) :\n');
        console.log('  champs du formulaire\n      Pour s\'inscrire, le visiteur choisit sa séance (Matin ou Soir), indique son nom et son e-mail ; il peut laisser un message.');
        for (const t of TOURNURES.filter(t => t.id !== 'message_seul')) console.log(`  ${t.label}\n      ${t.exemple}`);
        console.log('\nJamais devinés : un nombre, une négation, un destinataire. Une phrase dont un mot n\'a pas de rôle est refusée.');
        return 0;
      }
      if (!dir) { console.error('Usage : sitec lire <dossier-projet> [composant] [--accepter] [--json] | sitec lire <dossier-projet> [composant] --recrire [--dry-run] --export p.json | --import r.json | sitec lire --tournures'); return 2; }
      const opt = k => { const i = rest.indexOf(k); return i >= 0 ? rest[i + 1] : null; };
      const valued = new Set(['--export', '--import'].map(k => rest.indexOf(k)).filter(i => i >= 0).map(i => i + 1));
      const positional = rest.filter((a, i) => !a.startsWith('--') && !valued.has(i));
      const root = path.resolve(dir), only = positional[1] || null, accept = flags.has('--accepter'), json = flags.has('--json');
      const project = await loadProject(root);
      const sources = [...(project.componentSources || []), ...(project.packages || []).flatMap(p => p.componentSources || [])].filter(x => x.documentText !== undefined && (!only || x.name === only));
      const siteDocs = only ? [] : [project.documents?.site, ...(project.documents?.pages || []), ...(project.documents?.data || [])].filter(Boolean);
      if (!sources.length && !siteDocs.length) { console.error(only ? `Aucun composant au format document nommé ${only} (components/${only}/document.md).` : 'Aucun document dans ce site (site.md, pages/<id>.md, components/<nom>/document.md).'); return only ? 1 : 0; }
      // Documents du site et des pages : ce que vaut chaque document (section par section), ce qui a changé depuis la lecture acceptée.
      let siteBad = 0; const siteReport = [];
      if (siteDocs.length && !flags.has('--recrire')) {
        for (const doc of siteDocs) {
          const rel = path.relative(root, doc.file).replaceAll('\\', '/');
          const diff = doc.errors.length ? null : doc.frozen === undefined ? { absent: true } : readingDiff(doc.frozen, doc.yaml);
          const status = doc.errors.length ? 'erreurs' : diff ? (accept ? 'acceptée' : 'à accepter') : 'à jour';
          if (status === 'acceptée') { await fs.mkdir(path.dirname(doc.frozenFile), { recursive: true }); await fs.writeFile(doc.frozenFile, doc.yaml); }
          if (status === 'erreurs' || status === 'à accepter') siteBad++;
          const changes = diff && !diff.absent ? lineDiff(doc.frozen, doc.yaml) : [];
          siteReport.push({ file: rel, status, errors: doc.errors, ...(changes.length ? { changes } : {}) });
          if (json) continue;
          if (status === 'à jour' && !flags.has('--tout')) continue;
          console.log(`# ${rel} : ${status === 'erreurs' ? `${doc.errors.length} ligne${doc.errors.length > 1 ? 's' : ''} à reprendre` : status === 'à jour' ? 'lecture à jour' : diff.absent ? (accept ? 'lecture acceptée' : 'pas encore acceptée') : (accept ? 'changement accepté' : 'la lecture a changé')}`);
          for (const e of doc.errors) console.log(`  ERREUR ligne ${e.line} : ${e.message}${e.hint ? '\n            ' + e.hint : ''}`);
          if (doc.errors.length) continue;
          if (flags.has('--tout')) console.log(doc.yaml.split('\n').filter(l => l && !l.startsWith('#')).map(l => '  ' + l).join('\n'));
          else if (diff.absent) for (const l of summarize(doc)) console.log('  ' + l);
          else for (const c of changes) console.log(`  ${c}`);
        }
        if (!json) {
          const same = siteReport.filter(r => r.status === 'à jour').map(r => r.file);
          if (same.length && !flags.has('--tout')) console.log(`Lecture à jour : ${same.join(', ')}`);
          if (siteBad && !accept && siteReport.some(r => r.status === 'à accepter')) console.log('\nSi c\'est bien ce que vous voulez dire : sitec lire <dossier> --accepter (--tout montre le YAML entier que vaut chaque document).');
          if (sources.length) console.log('');
        }
      }
      if (!sources.length) { if (json) console.log(JSON.stringify({ ok: !siteBad, site: siteReport, documents: [] })); return siteBad ? 1 : 0; }
      if (flags.has('--recrire')) {
        // Un modèle propose une réécriture des phrases refusées ; le lecteur à règles la relit et reste seul juge. Rien n'est accepté ici.
        if (accept) { console.error('--recrire et --accepter ne vont pas ensemble : relisez d\'abord ce que le lecteur comprend des phrases récrites (sitec lire <dossier>), puis acceptez.'); return 2; }
        const dry = flags.has('--dry-run'), exp = opt('--export'), imp = opt('--import');
        if (dry && exp && imp) { console.error('--export avec --import écrit la consigne du tour de réparation d\'après le document récrit : sans --dry-run.'); return 2; }
        const rw = await import('./lang/rewrite.js');
        const files = new Map();
        for (const s of sources) files.set(s.name, { file: path.join(s.dir, 'document.md'), text: await fs.readFile(path.join(s.dir, 'document.md'), 'utf8') });
        const docs = sources.map(s => ({ name: s.name, text: files.get(s.name).text }));
        const todo = docs.flatMap(d => rw.refusedSentences(d.text, d.name));
        if (!todo.length) { console.log(json ? JSON.stringify({ ok: true, sentences: 0 }) : 'Aucune phrase refusée : rien à récrire.'); return 0; }
        if (exp && !imp) {
          await fs.writeFile(path.resolve(exp), JSON.stringify(rw.exportPrompt(docs), null, 2));
          console.log(JSON.stringify({ ok: true, exported: exp, sentences: todo.length, hint: `Soumettez system + user à un modèle, enregistrez sa réponse (le tableau JSON), puis : sitec lire ${dir}${only ? ' ' + only : ''} --recrire --import reponse.json` }));
          return 0;
        }
        if (!imp) { console.error('sitec lire <dossier> --recrire --export p.json écrit la consigne à soumettre à un modèle ; --recrire --import r.json applique sa réponse, que le lecteur relit (le compilateur n\'appelle aucun modèle).'); return 2; }
        let run;
        try { run = await rw.rewriteRun({ docs, answerText: await fs.readFile(path.resolve(imp), 'utf8') }); }
        catch (e) { console.error('Erreur : ' + e.message); return 1; }
        const done = run.results.filter(r => r.status === 'récrite'), left = run.results.length - done.length;
        const out = [];
        for (const s of sources) {
          const f = files.get(s.name), rs = run.results.filter(r => r.doc === s.name); if (!rs.length) continue;
          const changed = run.texts[s.name] !== f.text, rel = path.relative(process.cwd(), f.file).replaceAll('\\', '/');
          if (changed && !dry) await fs.writeFile(f.file, run.texts[s.name]);
          const after = readDocument(run.texts[s.name], { name: s.name });
          out.push({ component: s.name, file: rel, written: changed && !dry, sentences: rs, errors: after.errors });
          if (json) continue;
          console.log(`# ${s.name} (${rel})`);
          for (const r of rs) {
            console.log(`  ligne ${String(r.line).padStart(2)}  ${r.phrase}`);
            if (r.status === 'récrite') console.log(`            récrit  : ${r.rewrite}\n            lu      : ${r.said.join(' ; ')}${r.hypothese ? '\n            suppose : ' + r.hypothese : ''}`);
            else if (r.status === 'laissée') console.log(`            laissée : ${r.raison}`);
            else if (r.status === 'refusée') console.log(`            réécriture refusée : ${r.rewrite}\n            ${r.why}`);
            else console.log('            sans réponse du modèle');
          }
          const n = rs.filter(r => r.status === 'récrite').length;
          console.log(`  ${n} phrase${n > 1 ? 's' : ''} récrite${n > 1 ? 's' : ''} sur ${rs.length}${!changed ? '' : dry ? ' (--dry-run : document.md n\'est pas modifié)' : ' : document.md est modifié'}.${after.errors.length ? ` Il reste ${after.errors.length} erreur${after.errors.length > 1 ? 's' : ''} dans le document.` : ' Le document se lit en entier.'}\n`);
        }
        if (imp && exp && left) {
          const rep = rw.exportPrompt(sources.map(s => ({ name: s.name, text: run.texts[s.name] })), run.results);
          if (rep.sentences.length) { await fs.writeFile(path.resolve(exp), JSON.stringify(rep, null, 2)); if (!json) console.log(`Consigne du tour de réparation écrite : ${exp} (${rep.sentences.length} phrase${rep.sentences.length > 1 ? 's' : ''}, avec le refus du lecteur).`); }
        }
        if (json) console.log(JSON.stringify({ ok: !left, dry_run: dry, rewritten: done.length, left, unknown: run.unknown, documents: out }));
        else {
          if (run.unknown.length) console.log(`Réponses ignorées, pour des phrases que le document n'a pas ou n'a plus : ${run.unknown.join(', ')}.`);
          if (done.length) console.log(`Une réécriture est une proposition : le lecteur garantit qu'elle se lit, pas qu'elle dit ce que vous vouliez dire. Relisez chaque « lu » et chaque « suppose », puis${dry ? ' relancez sans --dry-run, puis' : ''} : sitec lire ${dir} --accepter`);
          if (left) console.log(`${left} phrase${left > 1 ? 's' : ''} à reprendre à la main (sitec lire ${dir} cite la tournure la plus proche).`);
        }
        return left ? 1 : 0;
      }
      let bad = 0; const report = [];
      for (const src of sources) {
        const r = readDocument(src.documentText, { name: src.name });
        const rel = path.relative(process.cwd(), path.join(src.dir, 'document.md')).replaceAll('\\', '/');
        const diff = r.errors.length ? null : src.lectureText === undefined ? { absent: true } : readingDiff(src.lectureText, r.yaml);
        let status = r.errors.length ? 'erreurs' : diff ? (accept ? 'acceptée' : 'à accepter') : 'à jour';
        if (status === 'acceptée') await fs.writeFile(path.join(src.dir, 'lecture.yaml'), r.yaml);
        if (status === 'erreurs' || status === 'à accepter') bad++;
        report.push({ component: src.name, file: rel, status, sentences: r.trace, errors: r.errors, ...(diff && !diff.absent ? { changed: diff } : {}) });
        if (json) continue;
        console.log(`# ${src.name} (${rel})`);
        for (const t of r.trace) console.log(`  ligne ${String(t.line).padStart(2)}  ${t.text}\n            ${t.error ? 'REFUS : ' + t.error : '→ ' + t.said}${t.corrected ? '\n            (' + t.corrected.join(' ; ') + ')' : ''}`);
        for (const e of r.errors) console.log(`  ERREUR ligne ${e.line} : ${e.message}${e.hint ? '\n            ' + e.hint : ''}`);
        if (status === 'à jour') console.log('  Lecture à jour : c\'est celle de lecture.yaml.');
        else if (status === 'acceptée') console.log('  Lecture acceptée : lecture.yaml écrit. Relisez-le, puis suivez-le dans git avec document.md.');
        else if (status === 'à accepter') console.log(diff.absent ? '  Lecture pas encore acceptée. Si c\'est bien ce que vous voulez dire : sitec lire <dossier> --accepter' : `  La lecture a changé : « ${diff.was} » est maintenant lu « ${diff.now} ». Si c'est voulu : sitec lire <dossier> --accepter`);
        else console.log(`  ${r.errors.length} phrase${r.errors.length > 1 ? 's' : ''} à reprendre : rien n'est écrit tant qu'une phrase est refusée.`);
        console.log('');
      }
      if (json) console.log(JSON.stringify({ ok: !bad && !siteBad, ...(siteReport.length ? { site: siteReport } : {}), documents: report }));
      else if (bad) console.log(`Tournures comprises : ${TOURNURES.filter(t => t.id !== 'message_seul').map(t => t.label).join(' ; ')}.`);
      return bad || siteBad ? 1 : 0;
    }
    case 'rediger': {
      // Du YAML aux documents : tout ce qui est encore en YAML est récrit, relu, et doit rendre les données d'origine.
      //   site     : site.md, pages/<id>.md, data/<nom>.md, segments.md (lecture figée dans lecture/), components/<nom>/composant.md
      //   paquet   : components/<nom>/composant.md
      //   --catalogue : les composants natifs du compilateur
      const dir = args[0], dry = flags.has('--dry-run'), natives = flags.has('--catalogue'), only = flags.has('--composants');
      if (!dir && !natives) { console.error('Usage : sitec rediger <dossier-projet | dossier-paquet | dossier-hôte> [--composants] [--dry-run] | sitec rediger --catalogue [--dry-run]'); return 2; }
      const cat = await import('./catalog.js');
      const { outlineOf, vocabularyOutlineOf } = await import('./component-rediger.js');
      const root = natives ? cat.COMPONENTS_DIR : path.resolve(dir);
      const out = [], failed = [];
      const exists = p => fs.access(p).then(() => true, () => false);
      const component = async (cdir, name, props) => {
        const from = path.join(cdir, 'manifest.yaml');
        if (!await exists(from)) return;
        if (!props) { failed.push(`${path.relative(root, from).replaceAll('\\', '/')} : composant refusé par check, corrigez-le d'abord`); return; }
        const r = outlineOf(await fs.readFile(from, 'utf8'), { name, props });
        if (r.error) failed.push(`${path.relative(root, from).replaceAll('\\', '/')} : ${r.error}`);
        else out.push({ from, to: path.join(cdir, 'composant.md'), text: r.text, note: r.comments.lost ? `${r.comments.lost} ligne(s) de commentaire non reprise(s)` : '' });
      };
      // Cas de test d'un composant : fixtures/<cas>.yaml devient fixtures/<cas>.md, le composant écrit comme une section de page.
      const fixtures = async (cdir, name, props) => {
        const fdir = path.join(cdir, 'fixtures');
        for (const file of (await fs.readdir(fdir).catch(() => [])).filter(x => /\.ya?ml$/.test(x)).sort()) {
          const from = path.join(fdir, file), rel = path.relative(root, from).replaceAll('\\', '/');
          if (!props) { failed.push(`${rel} : composant refusé par check, corrigez-le d'abord`); continue; }
          let doc; try { doc = YAML.parseDocument(await fs.readFile(from, 'utf8')); } catch (e) { failed.push(`${rel} : ${e.message.split('\n')[0]}`); continue; }
          const lines = c => String(c || '').split('\n').map(l => l.replace(/^\s?/, '').trimEnd()).filter(Boolean);
          const notes = [...lines(doc.commentBefore), ...lines(doc.contents?.commentBefore), ...lines(doc.contents?.items?.[0]?.key?.commentBefore)];
          const r = writeFixtureDocument(doc.toJS() ?? {}, { name, props, notes });
          if (r.error) failed.push(`${rel} : ${r.error}`); else out.push({ from, to: from.replace(/\.ya?ml$/, '.md'), text: r.text });
        }
      };
      const plain = async (file, to, write) => {
        const from = path.join(root, file);
        if (!await exists(from)) return;
        const r = write(YAML.parse(await fs.readFile(from, 'utf8')));
        if (r.error) failed.push(`${file} : ${r.error}`); else out.push({ from, to: path.join(root, to), text: r.text });
      };
      const vocabulary = async vdir => {
        const from = path.join(vdir, 'vocabulaire.yaml');
        if (!await exists(from)) return;
        const r = vocabularyOutlineOf(await fs.readFile(from, 'utf8'));
        if (r.error) failed.push(`${path.relative(root, from).replaceAll('\\', '/')} : ${r.error}`);
        else out.push({ from, to: path.join(vdir, 'vocabulaire.md'), text: r.text, note: r.comments.lost ? `${r.comments.lost} ligne(s) de commentaire non reprise(s)` : '' });
      };
      const isSite = !natives && (await exists(path.join(root, 'site.yaml')) || await exists(path.join(root, 'site.md')));
      const isPackage = !natives && !isSite && (await exists(path.join(root, 'package.yaml')) || await exists(path.join(root, 'package.md')));
      const isHost = !natives && !isSite && !isPackage && await exists(path.join(root, 'hosts.yaml'));
      if (natives) {
        for (const c of catalog.list()) await component(c.dir, c.name, c.manifest.props);
        await vocabulary(root);
      } else if (isHost) {
        await plain('hosts.yaml', 'hosts.md', writeHostsDocument);
      } else if (isPackage) {
        const meta = await exists(path.join(root, 'package.yaml')) ? YAML.parse(await fs.readFile(path.join(root, 'package.yaml'), 'utf8')) || {} : (await import('./lang/site-document.js')).readPackageDocument(await fs.readFile(path.join(root, 'package.md'), 'utf8')).data;
        await plain('package.yaml', 'package.md', writePackageDocument);
        const dirs = await fs.readdir(path.join(root, 'components'), { withFileTypes: true }).catch(() => []);
        for (const d of dirs) {
          if (!d.isDirectory() || d.name.startsWith('.')) continue;
          const src = await cat.readComponentDir(path.join(root, 'components', d.name));
          if (!src) continue;
          const name = `${meta.name}.${src.name}`, props = cat.buildComponent({ ...src, name, shortName: src.name, pkg: meta.name, project: true, words: catalog.words }).entry?.manifest.props;
          if (src.manifestText !== undefined) await component(src.dir, name, props);
          await fixtures(src.dir, name, props);
        }
        await vocabulary(root);
      } else {
        const project = await loadProject(root, { catalog });
        if (project.loadErrors.length) { for (const e of project.loadErrors) console.log(JSON.stringify(e)); console.error('Corrigez d\'abord le site (sitec check).'); return 1; }
        const tokens = Object.keys(THEME_PRESETS.clair), groups = SITE_SCHEMA.properties.site.properties, schemas = componentSchemas(project, catalog);
        if (!project.documents.site && !only) {
          const s = writeSiteDocument(project.site, { tokens, groups });
          if (s.error) failed.push(`site.yaml : ${s.error}`); else out.push({ from: project.siteFile, to: path.join(root, 'site.md'), text: s.text, frozen: path.join(root, 'lecture', 'site.yaml'), yaml: readSiteDocument(s.text, { tokens, groups }).yaml });
        }
        const pageOf = id => project.pages.find(x => x.id === id)?.data || null;
        for (const p of project.pages.filter(x => !x.document && !only)) {
          const r = writePageDocument(p.data, { schemas, pageOf });
          if (r.error) failed.push(`pages/${path.basename(p.file)} : ${r.error}`);
          else out.push({ from: p.file, to: path.join(root, 'pages', p.id + '.md'), text: r.text, frozen: path.join(root, 'lecture', 'pages', p.id + '.page.yaml'), yaml: readPageDocument(r.text, { schemas, pageOf }).yaml });
        }
        // Données : les produits de la boutique et les éléments de chaque collection.
        const datas = [];
        if (!only && project.productsRaw && /\.yaml$/.test(project.productsFile)) datas.push({ name: 'products', file: project.productsFile, items: Array.isArray(project.productsRaw) ? project.productsRaw : project.productsRaw.products, kind: PRODUCTS, heading: 'Produits' });
        for (const [name, col] of Object.entries(project.collections || {})) if (!only && col.raw && /\.yaml$/.test(col.file)) datas.push({ name, file: col.file, items: Array.isArray(col.raw) ? col.raw : col.raw[name], kind: collectionData(name, project.site.collections?.[name]), heading: project.site.collections?.[name]?.label || name });
        for (const d of datas) {
          const w = writeDataDocument(d.items, d.kind, d.heading);
          if (w.error) failed.push(`data/${d.name}.yaml : ${w.error}`);
          else out.push({ from: d.file, to: path.join(root, 'data', d.name + '.md'), text: w.text, frozen: path.join(root, 'lecture', 'data', d.name + '.yaml'), yaml: readDataDocument(w.text, d.kind).yaml });
        }
        if (!only && project.segmentsRaw && /\.yaml$/.test(project.segmentsFile)) {
          const w = writeSegmentsDocument(project.segmentsRaw, { events: EVENTS });
          if (w.error) failed.push(`segments.yaml : ${w.error}`);
          else out.push({ from: project.segmentsFile, to: path.join(root, 'segments.md'), text: w.text, frozen: path.join(root, 'lecture', 'segments.yaml'), yaml: readSegmentsDocument(w.text, { events: EVENTS }).yaml });
        }
        // Composants du site encore écrits en manifeste : leur plan, composant.md.
        validateProject(project, catalog);
        for (const src of project.componentSources || []) { const props = project.catalog?.get(src.name)?.manifest.props; if (src.manifestText !== undefined) await component(src.dir, src.name, props); await fixtures(src.dir, src.name, props); }
        await vocabulary(root);
      }
      if (failed.length) { for (const m of failed) console.error('Ne s\'écrit pas en document : ' + m); console.error('Rien n\'est écrit.'); return 1; }
      if (!out.length) { console.log('Rien à convertir : plus aucun fichier YAML d\'auteur ici.'); return 0; }
      for (const o of out) {
        const blocks = (o.text.match(/^```yaml/gm) || []).length;
        console.log(`${path.relative(root, o.from).replaceAll('\\', '/')} → ${path.relative(root, o.to).replaceAll('\\', '/')}${blocks ? ` (${blocks} bloc${blocks > 1 ? 's' : ''} yaml gardé${blocks > 1 ? 's' : ''})` : ''}${o.note ? ` ; ${o.note}` : ''}`);
        if (dry) continue;
        if (o.frozen) { await fs.mkdir(path.dirname(o.frozen), { recursive: true }); await fs.writeFile(o.frozen, o.yaml); }
        await fs.writeFile(o.to, o.text); await fs.rm(o.from);
      }
      console.log(dry ? `${out.length} documents s'écriraient (--dry-run : rien n'est modifié).` : `${out.length} documents écrits et relus : chacun rend les données de son YAML. La lecture du site, des pages et des données est figée dans lecture/. Les fichiers YAML d'origine sont supprimés.`);
      return 0;
    }
    case 'schema': {
      const dir = args[0];
      if (!dir) { console.error('Usage : sitec schema <dossier-projet> [--no-vscode]'); return 2; }
      const root = path.resolve(dir);
      const project = await loadProject(root);
      // Au mieux même si le site a des erreurs : l'éditeur doit justement aider à les corriger (npm install ne doit pas échouer pour ça).
      const errors = validateProject(project, catalog);
      const { writeSchemas } = await import('./schema.js');
      const r = await writeSchemas(project, catalog, { vscode: !flags.has('--no-vscode') });
      console.log(JSON.stringify({ ok: true, schemas: r.files.length, files: r.files, vscode: !flags.has('--no-vscode'), errors: errors.length, hint: errors.length ? 'le site a des erreurs : sitec check pour les voir' : undefined }));
      return 0;
    }

    case 'migrate': {
      const dir = args[0];
      if (!dir) { console.error('Usage : sitec migrate <dossier-projet> [--dry-run] [--to N]'); return 2; }
      const root = path.resolve(dir);
      const toIdx = rest.indexOf('--to');
      const { migrate, LATEST } = await import('./migrate.js');
      let r;
      try { r = await migrate(root, { to: toIdx >= 0 ? Number(rest[toIdx + 1]) : LATEST, dryRun: flags.has('--dry-run') }); }
      catch (e) { console.error(e.message); return 1; }
      if (!r.steps.length) console.log(`Déjà en version ${r.to} : rien à migrer.`);
      for (const st of r.steps) { console.log(`${flags.has('--dry-run') ? 'PRÉVU' : 'FAIT '} ${st.title}`); for (const c of st.changes) console.log(`      ${c.file} : ${c.change}`); }
      for (const sg of r.suggestions) console.log(`IDÉE  ${sg}`);
      // Le site migré doit rester valide.
      if (!flags.has('--dry-run') && r.steps.length) {
        const project = await loadProject(root);
        const errors = validateProject(project, catalog);
        if (errors.length) { console.log('Le site migré ne passe pas check :'); process.stdout.write(formatErrors(errors, { json: true, root })); return 1; }
      }
      console.log(JSON.stringify({ ok: true, from: r.from, to: r.to, steps: r.steps.length, suggestions: r.suggestions.length, written: r.written }));
      return 0;
    }

    case 'test': {
      const dir = args[0];
      if (!dir) { console.error('Usage : sitec test <dossier-projet> [--update] [--catalog] [--only nom]'); return 2; }
      const root = path.resolve(dir);
      const project = await loadProject(root);
      const errors = validateProject(project, catalog);
      if (errors.length) { process.stdout.write(formatErrors(errors, { json: true, root })); return 1; }
      const onlyIdx = rest.indexOf('--only');
      const { testComponents } = await import('./component-test.js');
      let r;
      try { r = await testComponents(project, { update: flags.has('--update'), catalog: flags.has('--catalog'), only: onlyIdx >= 0 ? rest[onlyIdx + 1] : null }); }
      catch (e) { console.error(e.message); return 2; }
      const label = { ok: 'OK  ', created: 'NEW ', updated: 'MAJ ', changed: 'DIFF', invalid: 'CAS ', error: 'ERR ' };
      for (const x of r.results) console.log(`${label[x.status]} ${x.component} › ${x.name}${x.detail ? ' — ' + x.detail : ''}`);
      const failed = r.results.filter(x => ['changed', 'invalid', 'error'].includes(x.status)).length;
      console.log(JSON.stringify({ ok: !failed, components: r.targets, cases: r.results.length, failed, created: r.results.filter(x => x.status === 'created').length, updated: r.results.filter(x => x.status === 'updated').length }));
      return failed ? 1 : 0;
    }

    case 'component': {
      const [sub, dir, name] = args;
      const usage = 'Usage : sitec component new|edit|preview|show <dossier-projet> <nom> [--describe "…" | --from f.md | --ask "…"] [--package chemin] [--export p.json] [--import r.json] [--force] [--php] [--json]';
      if (!['new', 'edit', 'preview', 'show'].includes(sub) || !dir || !name) { console.error(usage); return 2; }
      if (!/^[a-z][a-z0-9-]*(\.[a-z][a-z0-9-]*)*$/.test(name)) { console.error(`Nom de composant mal formé : ${name} (minuscules, chiffres, tirets ; points pour une famille).`); return 2; }
      const opt = k => { const i = rest.indexOf(k); return i >= 0 ? rest[i + 1] : null; };
      const root = path.resolve(dir);
      const gen = await import('./component-gen.js');
      const project = await loadProject(root); validateProject(project, catalog);
      let target;
      try { target = gen.resolveTarget(project, name, opt('--package')); } catch (e) { console.error(e.message); return 2; }
      const cdir = target.dir;
      const relDir = path.relative(process.cwd(), cdir).replaceAll('\\', '/');
      const preview = async () => {
        try { const p = await loadProject(root); validateProject(p, catalog); const { previewComponent } = await import('./component-preview.js'); const r = await previewComponent(p, target.name); console.log(`      aperçu : ${path.relative(process.cwd(), r.file).replaceAll('\\', '/')} (${r.cases} cas${r.errors ? `, ${r.errors} en erreur` : ''}) — à ouvrir dans un navigateur pour la relecture visuelle`); return r; }
        catch (e) { console.log(`      aperçu indisponible : ${e.message}`); return null; }
      };
      if (sub === 'preview') { const r = await preview(); return r && !r.errors ? 0 : 1; }
      if (sub === 'show') {
        // Le lien entre ce qui est écrit et ce qui est exécuté : chaque bloc du manifeste, puis ce qu'il devient.
        const entry = (project.catalog || catalog).get(target.name);
        if (!entry) {
          if (project.composites?.[target.name]) { console.error(`${target.name} est un composant composé (components.yaml) : sitec explain ${target.name} ${dir}.`); return 2; }
          console.error(`Composant introuvable ou en erreur : ${target.name}. sitec check ${dir} donne le détail ; sitec catalog ${dir} liste les composants.`); return 1;
        }
        const { describeComponent, formatDescription } = await import('./component-show.js');
        const d = await describeComponent(entry, { php: flags.has('--php') });
        console.log(flags.has('--json') ? JSON.stringify({ ...d, file: path.relative(process.cwd(), d.file).replaceAll('\\', '/') }) : formatDescription(d));
        return 0;
      }
      if (sub === 'new' && catalog.has(target.name)) { console.error(`${target.name} existe déjà dans le catalogue natif : choisissez un autre nom.`); return 2; }
      const show = ({ round, problems, warnings, notes }) => { console.log(`TOUR ${round} : ${problems.length} problème(s), ${warnings.length} avertissement(s)`); for (const p of [...problems, ...warnings]) console.log(`      [${p.code}] ${p.file}${p.path ? ' › ' + p.path : ''} : ${p.message}`); if (notes) console.log(`      notes du modèle : ${notes}`); };
      const generative = sub === 'edit' || opt('--describe') || opt('--from') || opt('--import');
      if (generative) {
        let exists = false; for (const f of ['composant.md', 'manifest.yaml']) try { await fs.access(path.join(cdir, f)); exists = true; } catch { /* libre */ }
        const existing = exists ? await gen.readComponent(cdir) : null;
        // Un composant au format langage encore écrit en manifeste est montré en plan au modèle : sa réponse l'écrira ainsi.
        if (existing?.format === 'langage') existing.files = await gen.asPlan(existing.files, { name: target.name, props: (project.catalog || catalog).get(target.name)?.manifest.props });
        if (sub === 'new' && exists && !flags.has('--force') && !opt('--import')) { console.error(`${relDir} existe déjà : --force pour le régénérer depuis sa description, ou sitec component edit … --ask "…" pour le modifier.`); return 2; }
        if (sub === 'edit' && !existing) { console.error(`Composant introuvable : ${relDir}.`); return 2; }
        const request = sub === 'edit' ? opt('--ask') : null;
        if (sub === 'edit' && !request && !opt('--import')) { console.error('sitec component edit … --ask "la modification voulue"'); return 2; }
        let description = opt('--describe') || (opt('--from') ? await fs.readFile(path.resolve(opt('--from')), 'utf8') : null) || existing?.description || null;
        if (!description && opt('--import')) description = '[à compléter] description du composant (importé sans --describe).';
        if (!description) { console.error('Description manquante : --describe "…" ou --from description.md.'); return 2; }
        const history = existing?.history || [];
        const promptArgs = extra => ({ name: target.name, description, project, target, current: request ? existing.files : null, request, format: request ? existing.format : (opt('--format') || 'langage'), ...extra });
        if (opt('--format') && !['langage', 'html'].includes(opt('--format'))) { console.error('--format langage (données, forme, apparence ; défaut) ou --format html (gabarit et feuille)'); return 2; }
        if (opt('--export') && !opt('--import')) {
          const fmt = request ? existing.format : (opt('--format') || 'langage');
          await fs.writeFile(path.resolve(opt('--export')), JSON.stringify({ name: target.name, description, request, format: fmt, system: await gen.buildSystemPrompt(fmt), user: gen.buildUserPrompt(promptArgs({})), output_schema: gen.schemaFor(fmt) }, null, 2));
          console.log(JSON.stringify({ ok: true, exported: opt('--export'), hint: `Soumettez system + user à un modèle (sortie JSON conforme à output_schema), enregistrez la réponse, puis : sitec component ${sub} ${dir} ${name}${request ? ' --ask "…"' : ''} --import reponse.json [--export reparation.json]` }));
          return 0;
        }
        if (opt('--import')) {
          let files;
          try { files = gen.parseResponse(await fs.readFile(path.resolve(opt('--import')), 'utf8')); } catch (e) { console.error('Réponse illisible : ' + e.message); return 1; }
          await gen.writeComponent(cdir, target.name, files, description, request ? [...history, request.trim()] : history);
          const v = await gen.verifyComponent(root, target, catalog);
          show({ round: 1, ...v, notes: files.notes });
          if ((v.problems.length || v.warnings.length) && opt('--export')) {
            const fmt = files.template ? 'html' : 'langage';
            await fs.writeFile(path.resolve(opt('--export')), JSON.stringify({ name: target.name, description, request, format: fmt, system: await gen.buildSystemPrompt(fmt), user: gen.buildUserPrompt(promptArgs({ previous: files, problems: [...v.problems, ...v.warnings], format: fmt })), output_schema: gen.schemaFor(fmt) }, null, 2));
            console.log(`      prompt de réparation écrit : ${opt('--export')}`);
          }
          if (!v.problems.length) await preview();
          console.log(JSON.stringify({ ok: !v.problems.length, component: target.name, problems: v.problems.length, warnings: v.warnings.length, cases: v.tests?.length ?? null }));
          return v.problems.length ? 1 : 0;
        }
        console.error(`sitec component ${sub} … --export p.json écrit la consigne à soumettre à un modèle ; --import r.json écrit et vérifie sa réponse (le compilateur n\'appelle aucun modèle).`);
        return 2;
      }
      if (sub !== 'new') { console.error(usage); return 2; }
      try { await fs.access(cdir); console.error(`${cdir} existe déjà.`); return 2; } catch { /* libre */ }
      await fs.mkdir(path.join(cdir, 'fixtures'), { recursive: true });
      // Squelette au format langage (défaut) : un seul manifeste, données, forme, apparence.
      if ((opt('--format') || 'langage') !== 'html') {
        await fs.writeFile(path.join(cdir, 'composant.md'), `# ${target.manifestName}

[à compléter] une phrase : ce que montre ce composant et quand l'utiliser

Mots-clés : mots, que, tapent, les, visiteurs

## Données
> Ce que le composant accepte : une puce par champ, « nom : type, précisions — description ».
- title : texte, facultatif — titre de la section
- intro : texte, facultatif — phrase sous le titre
- items (liste, au moins 1) :
  - title : texte
  - text : texte, facultatif
  - image : image, facultatif
- cta : lien, facultatif — bouton sous la liste

## Forme
> La structure : primitives (sitec explain langage). Un nom entre « » donne une classe.
- en-tête : title, intro
- grille de items, 3 colonnes :
  - carte :
    - image : image, title
    - titre : title
    - texte discret : text
- bouton : cta

## Apparence
> L'allure, par partie : intentions liées au thème.
- cartes : compactes, coins arrondis

> Ce que le composant fait d'une saisie (facultatif) : ajoutez une section « ## Fonctionnement » avec
> « - formulaire : » puis, en retrait, « - enregistre dans : demandes », « - prévient par e-mail : oui »,
> « - confirmation : Merci. », « - champs : » et une puce par champ (« - name », « - sujet : choix, un parmi Devis, Question — Votre demande ») ;
> et « - formulaire, bouton Envoyer » dans la forme.

## Exemple
\`\`\`
## ${target.name} : Un titre
- Premier point | Une phrase.
\`\`\`
`);
        console.log(`OK  ${relDir} : composant.md (données, forme, apparence ; fonctionnement en commentaire) et un cas de test. Ensuite : décrire, ajuster, puis sitec check ${dir}, sitec component show ${dir} ${name} (ce que chaque bloc produit) et sitec component preview ${dir} ${name}.`);
        return 0;
      }
      const cls = name.replace(/\./g, '-');
      await fs.writeFile(path.join(cdir, 'manifest.yaml'), `name: ${name}
description: "[à compléter] une phrase : ce que montre ce composant et quand l'utiliser"
props:
  type: object
  required: [title]
  properties:
    title: { type: string, description: titre de la section }
    text: { type: string, description: texte sous le titre }
    items:
      type: array
      items:
        type: object
        additionalProperties: false
        required: [title]
        properties:
          title: { type: string }
          text: { type: string }
    cta: { $ref: "#/$defs/link", description: bouton optionnel }
# Formulaire déclaré (optionnel) : décommentez pour enregistrer des réponses dans une collection d'exploitation et prévenir par e-mail.
# effects:
#   form:
#     store: demandes
#     notify: true
#     success: Merci, nous revenons vers vous.
#     fields: [ name, email, { name: objet, label: Objet, type: select, options: [Question, Devis] }, message ]
example: |
  - ${name}:
      title: Un titre
      items:
        - { title: Premier point, text: Une phrase. }
intents: [mots, que, tapent, les, visiteurs]
`);
      await fs.writeFile(path.join(cdir, 'template.html'), `<section class="section ${cls}">
  <div class="container">
    <h2>{{ p.title }}</h2>
    {% if p.text %}<p>{{ p.text }}</p>{% endif %}
    {% if p.items %}
    <ul class="${cls}-list">
      {% for it in p.items %}
      <li><strong>{{ it.title }}</strong>{% if it.text %} <span class="muted">{{ it.text }}</span>{% endif %}</li>
      {% endfor %}
    </ul>
    {% endif %}
    {% if p.cta %}{{ link(p.cta, 'btn') }}{% endif %}
    {# Avec effects.form : {% form %} {{ field('name') }} … <button class="btn">Envoyer</button> {% endform %}, et form.ok / form.success / form.message #}
  </div>
</section>
`);
      await fs.writeFile(path.join(cdir, 'styles.css'), `.${cls}-list{list-style:none;padding:0;display:grid;gap:10px}\n.${cls}-list li{padding:12px 16px;background:var(--color-surface);border-radius:var(--radius)}\n`);
      console.log(`OK  ${path.relative(process.cwd(), cdir)} : manifest.yaml, template.html, styles.css. Ensuite : décrire les props, écrire le gabarit, puis sitec check ${dir}.`);
      return 0;
    }

    case 'check':
    case 'build': {
      const dir = args[0];
      if (!dir) { console.error(`Usage : sitec ${cmd} <dossier-projet>`); return 2; }
      const root = path.resolve(dir);
      const project = await loadProject(root);
      const errors = validateProject(project, catalog);
      const asJson = flags.has('--json') || cmd === 'check';
      if (errors.length) {
        process.stdout.write(formatErrors(errors, { json: asJson, root }));
        return 1;
      }
      const warnings = collectWarnings(project);
      // Relecture éditoriale minimale intégrée : les textes à compléter bloquent la compilation (sauf --draft).
      const { reviewProject } = await import('./review.js');
      const placeholders = reviewProject(project, project.brief).filter(f => f.code === 'E_PLACEHOLDER');
      for (const w of warnings) console.log(JSON.stringify({ ...w, file: path.relative(root, w.file).replaceAll('\\', '/') }));
      if (placeholders.length && !flags.has('--draft')) {
        if (cmd === 'check') for (const f of placeholders) console.log(JSON.stringify({ ...f, level: 'warning', code: 'W_PLACEHOLDER', file: path.relative(root, f.file).replaceAll('\\', '/'), message: f.message + ' (build refusera sans --draft)' }));
        else { for (const f of placeholders) console.log(JSON.stringify({ ...f, file: path.relative(root, f.file).replaceAll('\\', '/') })); return 1; }
      }
      if (cmd === 'check') {
        console.log(JSON.stringify({ ok: true, language: project.language ?? 1, pages: project.pages.length, sections: countSections(project), collections: Object.keys(project.collections || {}).length, components: { composites: Object.keys(project.composites || {}).length, project: (project.componentSources || []).length, packages: (project.packages || []).filter(p => p.prefix).map(p => p.prefix) }, warnings: warnings.length + placeholders.length, review: 'sitec review ' + dir }));
        return 0;
      }
      const outIdx = rest.indexOf('--out');
      const out = outIdx >= 0 ? path.resolve(rest[outIdx + 1]) : path.join(root, 'dist');
      const targetIdx = rest.indexOf('--target');
      const target = targetIdx >= 0 ? rest[targetIdx + 1] : 'php';
      if (!TARGETS[target]) { console.error(`Cible inconnue : ${target}. Cibles : ${Object.entries(TARGETS).map(([k, v]) => k + ' (' + v.description + ')').join(' ; ')}`); return 2; }
      const report = await emit(project, catalog, out, { target });
      const im = report.images;
      const imgInfo = im?.images ? `, ${im.images} image${im.images > 1 ? 's' : ''} (${im.resizer ? im.variants + ' variantes WebP' : im.disabled ? 'variantes désactivées' : 'sans variantes : npm install sharp'})` : '';
      console.log(`OK  ${report.pages} pages, ${report.components} composants${imgInfo} → ${path.relative(process.cwd(), out) || '.'}`);
      return 0;
    }

    case 'review': {
      const dir = args[0];
      if (!dir) { console.error('Usage : sitec review <dossier-projet> [--export f.json] [--import f.json]'); return 2; }
      if (flags.has('--llm')) { console.error('--llm n\'existe plus : le compilateur n\'appelle aucun modèle. sitec review <dossier> --export f.json écrit la consigne, --import r.json applique la réponse d\'un modèle.'); return 2; }
      const root = path.resolve(dir);
      const project = await loadProject(root);
      const errors = validateProject(project, catalog);
      if (errors.length) { process.stdout.write(formatErrors(errors, { json: true, root })); return 1; }
      const { reviewProject, REVIEW_SYSTEM, buildReviewPrompt } = await import('./review.js');
      const findings = reviewProject(project, project.brief);
      const rel = f => ({ ...f, file: path.relative(root, f.file).replaceAll('\\', '/') });
      const opt = name => { const i = rest.indexOf(name); return i >= 0 ? rest[i + 1] : null; };
      let verdicts = null;
      if (opt('--export') || opt('--import')) {
        const toReview = findings.filter(f => f.code !== 'E_PLACEHOLDER');
        const user = buildReviewPrompt(project.brief, toReview);
        const fsp = await import('node:fs/promises');
        if (opt('--export')) { await fsp.writeFile(path.resolve(opt('--export')), JSON.stringify({ system: REVIEW_SYSTEM, user, count: toReview.length }, null, 2)); console.log(JSON.stringify({ ok: true, exported: opt('--export'), passages: toReview.length })); return 0; }
        const text = await fsp.readFile(path.resolve(opt('--import')), 'utf8');
        const m = /\{[\s\S]*\}/.exec(text); verdicts = m ? JSON.parse(m[0]) : {};
        toReview.forEach((f, i) => { const v = verdicts[String(i + 1)]; if (v) { f.llm = v.verdict; f.reason = v.raison; } });
      }
      for (const f of findings) console.log(JSON.stringify(rel(f)));
      const counts = findings.reduce((a, f) => { a[f.code] = (a[f.code] || 0) + 1; return a; }, {});
      const llmCounts = verdicts ? findings.reduce((a, f) => { if (f.llm) a[f.llm] = (a[f.llm] || 0) + 1; return a; }, {}) : undefined;
      console.log(JSON.stringify({ ok: !counts.E_PLACEHOLDER, brief: project.brief ? path.basename(project.briefFile) : null, findings: findings.length, ...counts, ...(llmCounts ? { llm: llmCounts } : {}) }));
      return counts.E_PLACEHOLDER ? 1 : 0;
    }

    case 'keywords': {
      const dir = args[0];
      if (!dir) { console.error('Usage : sitec keywords <dossier-projet> [--all] [--dry-run] --export fichier.json | --import fichier.json'); return 2; }
      if (!rest.includes('--export') && !rest.includes('--import')) { console.error('sitec keywords <dossier> --export f.json écrit la consigne à soumettre à un modèle ; --import r.json applique sa réponse (le compilateur n\'appelle aucun modèle).'); return 2; }
      const root = path.resolve(dir);
      const project = await loadProject(root);
      const errors = validateProject(project, catalog);
      if (errors.length) { process.stdout.write(formatErrors(errors, { json: true, root })); return 1; }
      const { collectSections, buildUserPrompt, parseProposals, applyProposals } = await import('./keywords.js');
      const { SYSTEM_PROMPT } = await import('./keywords-system.js');
      const sections = collectSections(project, catalog, { all: flags.has('--all') });
      if (!sections.length) { console.log(JSON.stringify({ ok: true, message: 'Toutes les sections ont déjà des keywords (utilisez --all pour régénérer).' })); return 0; }
      const site = project.site.site;
      const user = buildUserPrompt(site, sections);
      const opt = name => { const i = rest.indexOf(name); return i >= 0 ? rest[i + 1] : null; };
      if (opt('--export')) {
        await (await import('node:fs/promises')).writeFile(path.resolve(opt('--export')), JSON.stringify({ system: SYSTEM_PROMPT, user, sections: sections.map(s => s.key) }, null, 2));
        console.log(JSON.stringify({ ok: true, exported: opt('--export'), sections: sections.length, hint: 'Soumettez system + user à un modèle, enregistrez sa réponse JSON, puis sitec keywords <dossier> --import reponse.json' }));
        return 0;
      }
      const text = await (await import('node:fs/promises')).readFile(path.resolve(opt('--import')), 'utf8');
      const { result, report } = parseProposals(text, sections);
      if (flags.has('--dry-run')) {
        for (const [key, list] of result) console.log(`${key}: ${list.join(' | ')}`);
        console.log(JSON.stringify({ ok: true, dry_run: true, sections: result.size, ...report }));
        return 0;
      }
      const applied = await applyProposals(project, sections, result);
      console.log(JSON.stringify({ ok: !applied.failed.length, sections: result.size, keywords: report.accepted, dropped: report.dropped + applied.dropped, unknown: report.unknown, files: applied.files, ...(applied.skipped.length ? { skipped: applied.skipped } : {}), ...(applied.failed.length ? { failed: applied.failed, hint: 'ces documents, relus avec leurs mots-clés, ne valaient plus leur lecture d\'avant : ils sont remis en l\'état' } : {}) }));
      return applied.failed.length ? 1 : 0;
    }

    case 'init': {
      const dir = args[0];
      if (!dir) { console.error('Usage : sitec init <dossier> [--name "Nom du site"] [--yaml] [--repo github:compte/depot#tag | --local] [--no-git]'); return 2; }
      const nameIdx = rest.indexOf('--name'), repoIdx = rest.indexOf('--repo');
      const { initProject } = await import('./init.js');
      try {
        const r = await initProject(dir, { name: nameIdx >= 0 ? rest[nameIdx + 1] : undefined, repo: repoIdx >= 0 ? rest[repoIdx + 1] : undefined, local: flags.has('--local'), git: !flags.has('--no-git'), yaml: flags.has('--yaml') });
        console.log(`OK  ${r.name} → ${path.relative(process.cwd(), r.root) || '.'} : ${r.files.length} fichiers, site écrit en ${r.format === 'yaml' ? 'YAML' : 'documents (site.md, pages/<id>.md ; lecture figée dans lecture/)'}${r.committed ? ', dépôt git initialisé (branche main, premier commit)' : ''}`);
        console.log(`    compilateur : ${r.dependency}${r.dependency.startsWith('file:') ? '  (chemin local, pour travailler sur le compilateur ; sans --local, la dépendance est le dépôt GitHub étiqueté)' : ''}`);
        // Schémas de l'éditeur tout de suite (npm install les régénère ensuite, avec la version épinglée du compilateur).
        if (r.format === 'yaml') try { const project = await loadProject(r.root); validateProject(project, catalog); const { writeSchemas } = await import('./schema.js'); await writeSchemas(project, catalog); console.log('    éditeur : .devanture/schema + .vscode (extension YAML de Red Hat) : complétion des composants, props, images et routes'); } catch { /* facultatif */ }
        console.log('    ensuite : cd ' + dir + ' && npm install && npx sitec check .   (remplir brief.md et les [à compléter]' + (r.format === 'yaml' ? ')' : ' ; après chaque modification d\'un document : npx sitec lire . --accepter)'));
        return 0;
      } catch (e) { console.error('Erreur : ' + e.message); return 1; }
    }

    case 'host': {
      const dir = args[0];
      if (!dir) { console.error('Usage : sitec host <dossier-hôte>  (contient hosts.yaml)'); return 2; }
      const { buildHost } = await import('./host.js');
      try {
        const r = await buildHost(dir, catalog, { draft: flags.has('--draft') });
        for (const st of r.sites) console.log(`OK  ${[st.domain, ...st.aliases].join(', ')} → sites/${st.name} (${st.pages} pages, ${st.staticRoutes.length} statiques)`);
        console.log(`→ ${path.relative(process.cwd(), r.out) || '.'}`);
        return 0;
      } catch (e) { console.error('Erreur : ' + e.message); return 1; }
    }

    case 'deploy': {
      const dir = args[0];
      const toIdx = rest.indexOf('--to'), secIdx = rest.indexOf('--secret');
      const to = toIdx >= 0 ? rest[toIdx + 1] : process.env.SITE_URL;
      const secret = secIdx >= 0 ? rest[secIdx + 1] : process.env.DEVANTURE_DEPLOY_SECRET;
      if (!dir || !to) { console.error('Usage : sitec deploy <dossier-projet> --to https://domaine [--secret s]   (ou variables SITE_URL et DEVANTURE_DEPLOY_SECRET)'); return 2; }
      if (!secret) { console.error('Secret manquant : --secret ou variable DEVANTURE_DEPLOY_SECRET (même valeur que DEPLOY_SECRET dans le .env du site).'); return 2; }
      const { deploy } = await import('./host.js');
      const dist = flags.has('--dist') ? path.resolve(dir) : path.join(path.resolve(dir), 'dist');
      try {
        const r = await deploy(dist, { to, secret, log: m => console.log(m) });
        console.log(`OK  version ${r.release} : ${r.files} fichiers en ${r.batches} envoi(s)${r.removed.length ? ', ' + r.removed.length + ' supprimé(s)' : ''}`);
        return 0;
      } catch (e) { console.error('Échec du déploiement : ' + e.message); return 1; }
    }

    case 'help':
    case undefined:
    case '--help':
      console.log(HELP);
      return cmd ? 0 : 2;

    default:
      console.error(`Commande inconnue : ${cmd}\n\n${HELP}`);
      return 2;
  }
}

function countSections(project) {
  return project.pages.reduce((n, p) => n + (Array.isArray(p.data?.sections) ? p.data.sections.length : 0), 0);
}

/** Charge un projet pour en lire les composants (catalogue étendu, composés), sans arrêter sur les erreurs de validation. */
async function projectCatalog(dir, catalog) {
  const project = await loadProject(path.resolve(dir));
  validateProject(project, catalog);
  return { project, catalog: project.catalog || catalog };
}

function printComposite(def) {
  const d = describeComposite(def);
  console.log(`# ${d.name} (composant composé du projet, components.yaml)\n${d.description}\n\nParamètres :`);
  for (const p of d.props) console.log(`  ${p.name}${p.required ? ' (obligatoire)' : ''}: ${p.type}${p.default !== null && p.default !== undefined ? ` (défaut ${JSON.stringify(p.default)})` : ''}${p.description ? ` — ${p.description}` : ''}`);
  console.log(`\nProduit les sections : ${d.produces.join(', ')}`);
}

function explainLanguage() {
  console.log(`# Langage Devanture, version 1 (site.yaml : language: 1)

Expressions {{ … }} dans toute valeur texte (pages, site.yaml, données) :
  racines à la compilation : site.*, const.* (site.yaml › constants), page.{id,route,title}, collections.<nom> (liste des éléments)
  racines à l'affichage    : item.* (page route: /…/[id] avec source: <collection>), product.* (source: products), order.* (source: orders)
  opérateurs : + - * / %  ~ (concaténation)  == != < <= > >=  and or not  in  ( )  listes [a, b]
  filtres (| nom(args), prioritaires sur les opérateurs : mettez des parenthèses) : ${TEMPLATE_VOCABULARY.filters.join(', ')}
  une valeur réduite à une seule expression garde son type (liste, nombre, objet) ; une clé inconnue sous site ou const est une erreur (sauf | default(x))

Constantes : site.yaml › constants: { delai: 1 h, zone: Lyon } → {{ const.delai }}.
Collections : site.yaml › collections: { nom: { label, fields: { champ: type }, sort } } ; data/<nom>.yaml ; page route: /chemin/[id] + source: nom ; composant collection.list.
  types de champ : string, text, number, boolean, date, asset, list, link.
Composants composés : components.yaml › components: { nom: { params, sections } } ; dans sections, {{ p.param }} et { for: p.liste, as: x, item: {…} }.
Composants de projet, format langage (défaut) : un seul fichier avec données, forme, apparence, fonctionnement (docs/LANGAGE.md, section 6) :
  composant.md (un plan : « # nom », la description, puis « ## Données », « ## Forme »… avec une puce « - nom : valeur » par ligne), ou manifest.yaml.
  données : nom: ${TYPE_WORDS.join(' | ')}, puis facultatif, au moins N, au plus N, de A à B, un parmi a, b — description ; « items (liste): » puis les champs.
  forme : ${Object.keys(PRIMITIVE_HELP).join(', ')}.
    comportements posés par la forme, sans rien déclarer : défilement, onglets, accordéon, repli, filtres de x selon champ, image agrandissable, copier.
  vocabulaire (des mots en plus des primitives, sans toucher au compilateur) : vocabulaire.md (une section « ## mot » par mot) ou vocabulaire.yaml à la racine du site ou d'un paquet ; « mots: » puis, par mot,
    ${WORD_KEYS.join(', ')}. Un mot se définit par une forme (primitives, autres mots, « contenu » pour ce que l'appelant place dedans)
    ou par un fragment de gabarit, avec « feuille » pour son CSS. Emploi : « - mot: a, b » ou « - mot, a, b: » puis des éléments ; un mot de paquet : « - paquet.mot: a ».
    Liste des mots : sitec catalog <dossier> ; fiche : sitec explain "<mot>" <dossier>.
  apparence : partie: ${INTENT_NAMES.join(', ')} ; « sur téléphone: ».
  fonctionnement : « lit: » puis une ligne par lecture à la visite, « nom: source, paramètre donnée » ; le nom se lit dans la forme comme une donnée.
    sources (services de la cible) : ${PUBLIC_SOURCE_NAMES.join(', ')} ; fiche : sitec explain "<source>".
    « section, seulement si nom: » n'affiche la section que si la lecture rend quelque chose ; cas de test : « à la visite: { nom: … } ».
  fonctionnement : « formulaire: » puis ${FORM_SETTINGS.join(', ')} ; un champ par ligne « nom: type, précisions — Libellé (ex. exemple) ».
    types de champ : ${FIELD_TYPE_WORDS.join(', ')} ; précisions : ${FIELD_MODIFIERS.join(' ; ')} ; name, email, phone, subject, message sont connus (rien à écrire après).
    dans la forme : « - formulaire, bouton Envoyer » (tous les champs), ou « - formulaire: » puis « - champ: nom » pour les placer.
    règles du registre, appliquées par le serveur à l'enregistrement, un envoi à la fois : « places: 12 », « places: 12 par atelier » (un champ qui groupe),
      « places: 12 par atelier, comptées par personnes » (un champ nombre) ; « si complet: message » ou « liste d'attente: oui | message » ;
      « une fois par: email » ou « email, atelier » ; « si déjà inscrit: message ». Lire où en est le registre : « lit: places: état du registre ».
      Le back-office annule un envoi (la place est rendue), le rétablit, ou donne la place à un envoi en attente.
  ce que chaque bloc produit (schéma, effets, gabarit, feuille) : sitec component show <dossier> <nom> [--php]. Toute erreur renvoie à une ligne du plan ou du manifeste.
Format html (porte de sortie) : components/<nom>/manifest.yaml + template.html (+ styles.css) ; sitec component new <dossier> <nom> [--describe "texte"] [--format html].
  CSS : sélecteurs préfixés du nom du composant, jetons du thème (var(--color-…), var(--font-…)), rien d'externe.
  comportements : behaviors: [${Object.keys(BEHAVIORS).join(', ')}] et attributs data-sl-… dans le gabarit (docs/LANGAGE.md).
  gabarit : {{ expr }} échappé ; balises ${TEMPLATE_VOCABULARY.tags.join(', ')} ; variables ${TEMPLATE_VOCABULARY.variables.join(', ')} ; fonctions ${TEMPLATE_VOCABULARY.functions.join(', ')} (HTML sûr : ${TEMPLATE_VOCABULARY.safe.join(', ')})
  effets déclarés (format machine, ce que fonctionnement produit) : manifest.yaml › effects.form { store, fields, notify, to, success } → {% form %} … {% endform %}, {{ field('nom') }}, form.ok, form.failed, form.message, form.success.
Spécification complète : docs/LANGAGE.md.`);
}

function printCatalog(catalog, proj = null) {
  console.log('Composants disponibles (sections). Props : * = obligatoire. Détail : sitec explain <nom>\n');
  for (const c of catalog.list()) {
    const props = Object.entries(c.manifest.props.properties || {})
      .map(([k]) => (c.manifest.props.required || []).includes(k) ? `${k}*` : k)
      .join(', ');
    console.log(`${c.name.padEnd(14)} ${c.manifest.description}${c.package ? `   [paquet ${c.package}]` : c.project ? '   [composant du projet]' : ''}\n${''.padEnd(14)} props: ${props}`);
  }
  for (const def of Object.values(proj?.project?.composites || {})) console.log(`${def.name.padEnd(14)} ${def.description}   [composé ${def.package ? `du paquet ${def.package}` : 'du projet'} → ${def.sections.map(s => Object.keys(s)[0]).join(' + ')}]\n${''.padEnd(14)} params: ${Object.entries(def.params).map(([k, v]) => v.required ? k + '*' : k).join(', ')}`);
  const words = proj?.project?.words || catalog.words;
  if (words?.size) {
    console.log('\nMots du vocabulaire (forme des composants, en plus des primitives). Détail : sitec explain "<mot>"' + (proj ? ' <dossier>' : '') + '\n');
    for (const w of words.values()) console.log(`${wordUsage(w).padEnd(34)} ${w.description}   [${wordOrigin(w)}]`);
  }
  console.log('\nSources (ce qu\'un composant lit à la visite : « fonctionnement: lit: nom: source, paramètre donnée »). Détail : sitec explain "<source>"\n');
  for (const n of PUBLIC_SOURCE_NAMES) console.log(`${n.padEnd(34)} ${SOURCES[n].description}   [${SOURCES[n].service}]`);
  console.log(`\nFichiers attendus : site.yaml, pages/*.page.yaml, assets/ (images). Voir CLAUDE.md. En documents (site.md, pages/<id>.md) : sitec explain document.\nConfiguration du site (nav, thème, tokens, pied, coordonnées) : sitec explain site`);
}

function explainSite() {
  const goalEvents = Object.entries(GOAL_EVENTS).map(([k, w]) => k + (w.length ? ' (' + w.join(', ') + ')' : '')).join(', ');
  console.log(`# site.yaml
Clés racines : language (version du langage, 1), site (obligatoire), constants ({ nom: valeur } lues par {{ const.nom }}), collections et packages (voir sitec explain langage).
Props de site :
  name (obligatoire): string — nom du site (en-tête, pied, titres par défaut)
  tagline: string — accroche, sert de meta description par défaut
  locale: string — ex. fr-FR
  theme: objet
      .preset: ${Object.keys(THEME_PRESETS).join(' | ')} — thème de base
      .tokens: objet { nom: valeur } — surcharges du preset. Noms acceptés :
${Object.entries(THEME_PRESETS.clair).map(([k, v]) => `          ${k.padEnd(18)} ex. ${v}`).join('\n')}
  nav: liste de liens { label*, to* } — menu principal, dans l'ordre
  footer: objet
      .text: string — mention courte (SIRET, slogan…)
      .links: liste de liens { label*, to* }
  contact: objet
      .email: email   .phone: string   .address: string — affichés dans le pied et à côté du formulaire
  intent: objet — champ « Que cherchez-vous ? » de l'en-tête (navigation par intention)
      .enabled: boolean (défaut true)   .placeholder: string
  agents: objet — jumeau pour agents (/site.json, /llms.txt, JSON-LD)
      .enabled: boolean (défaut true)   .summary: string (une phrase)   .business_type: string (type schema.org, défaut LocalBusiness)
  personalization: objet — segments, variantes et expériences (voir segments.yaml plus bas)
      .enabled: boolean (défaut true)   .requires_consent: boolean (défaut true)   .consent_text: string
  images: objet — { enabled: true, widths: [${IMAGE_DEFAULTS.widths.join(', ')}], quality: ${IMAGE_DEFAULTS.quality} } variantes WebP redimensionnées à la compilation pour les JPEG, PNG et WebP de assets/ (srcset, width/height, chargement différé) ; défaut : activé si sharp est installé
  static: objet — { enabled: true } cache statique des pages sans état pour les visiteurs sans cookie (servi par Apache sans PHP) ; défaut : activé
  offline: objet — { enabled: false, short_name, theme_color } service worker : assets et versions texte consultables hors ligne ; défaut : désactivé
  studio: objet — { enabled: false } embarque l'atelier (compilateur navigateur + source du site) sur /_studio, derrière ADMIN_TOKEN ; défaut : désactivé
  shop: objet — boutique (data/products.yaml + composants products.grid, product.hero, cart.page, checkout.page, order.confirmation)
      .currency: string (défaut €)   .payment: manual | stripe (défaut manual ; clé STRIPE_SECRET_KEY dans .env)
      .manual_instructions: string   .shipping: { flat: nombre, free_from: nombre }   .order_email: email

Exemple (site.yaml) :
  language: 1
  site:
    name: Maison Dubois
    tagline: Savonnerie artisanale à Marseille
    theme: { preset: chaleureux, tokens: { color.primary: "#6b2d5c", font.heading: "Georgia, serif" } }
    nav: [ { label: Accueil, to: / }, { label: Contact, to: /contact } ]
    footer: { text: SIRET 123 456 789 00012, links: [ { label: Mentions légales, to: /mentions-legales } ] }
    contact: { email: bonjour@exemple.fr, phone: 04 00 00 00 00, address: "1 rue des Lilas, 13001 Marseille" }

# segments.yaml (optionnel, à la racine du site)
  segments: { nom: condition, … }   priority: [noms, du plus prioritaire au moins]
  Conditions : visits: N | { gte: N } · device: mobile | desktop · event: nom (+ within: 7d, count: { gte: 2 }, where: { section: id | route: /p | category: x })
               all: [c1, c2] · any: [c1, c2] · not: c
  Événements : ${EVENTS.join(', ')}
  Sur une section : variants: { nom_de_segment: { props surchargées } } — la première variante dont le segment est actif s'applique.
  Sur une page : variants: { nom_de_segment: { first: [ids], hide: [ids] } } — ordre et présence des sections (ids explicites).

  Mesurer si une variante sert (toujours contre un groupe témoin tiré au sort, nommé « ${CONTROL} », qui voit le contenu de base) :
  goals: { nom: { event, where: { clé: valeur } } } — ce qu'on cherche à obtenir. Événements et précisions permises :
      ${goalEvents}
      form_sent = formulaire accepté par le serveur (form_submit = bouton pressé).
  experiments: { nom: { goal, arms: [noms] | { nom: % }, minimum } } — A/B : chaque bras est un nom neuf (pas un segment), utilisé dans les variants des pages.
      arms en liste : parts égales, témoin compris ; arms en objet : % par bras, le reste au témoin (total ≤ 99).
  experiments: { nom: { goal, segment, holdout: %, minimum } } — variante d'un segment : holdout % des visiteurs du segment gardent le contenu de base (1 à 99, défaut 50).
      minimum : visiteurs exposés par groupe avant tout verdict (défaut ${DEFAULT_MINIMUM}, au moins 20).
  Un bras sans variante dans les pages est une erreur (E_EXPERIMENT_UNUSED). Un bras passe avant les segments, sauf s'il est placé dans priority.
  Résultats : back-office /_admin, onglet « Expériences » (visiteurs exposés, objectifs atteints, écart au témoin, intervalle à 95 %, verdict).
  Changer le contenu comparé ou la définition ouvre une nouvelle mesure. Seuls les visiteurs ayant accepté la personnalisation sont tirés et mesurés.

Exemple (segments.yaml) :
  segments:
    nouveau: { visits: 1 }
    recurrent: { visits: { gte: 2 } }
    devis_abandonne: { all: [ { event: form_start, within: 7d }, { not: { event: form_submit, within: 7d } } ] }
    fan_services: { event: section_view, where: { section: services }, count: { gte: 2 } }
  priority: [devis_abandonne, fan_services, recurrent, nouveau]
  goals:
    appel: { event: click_cta, where: { to: "tel:+33400000000" } }
    devis: { event: form_sent, where: { form: contact } }
  experiments:
    accroche: { goal: appel, arms: [question] }
    relance: { goal: devis, segment: devis_abandonne, holdout: 20 }

Exemple (pages/accueil.page.yaml) :
  page: accueil
  route: /
  seo: { title: Maison Dubois }
  sections:
    - hero:
        title: Savons faits main à Marseille
        cta: { label: Appeler, to: "tel:+33400000000" }
        variants:
          question: { title: Et si votre savon venait de Marseille ? }
          devis_abandonne: { title: Votre demande de devis vous attend }
    - features:
        id: services
        title: Nos services
        items:
          - { icon: drop, title: Saponification à froid }
          - { icon: gift, title: Coffrets sur mesure }

# Page dérivée (micro-site) : extends: <id de page>, override: { id: { props } }, remove: [ids], prepend/append: [sections], route et seo propres.
# Relecture : brief.md à la racine ; sitec review <dossier> ; [à compléter] bloque build (sauf --draft).
# Exploitation (hors DSL) : back-office /_admin (ADMIN_TOKEN dans .env), stockage SQLite ou fichiers (STORE), déploiement signé /_deploy (DEPLOY_SECRET, commande sitec deploy), multi-sites : sitec host.`);
  return 0;
}

function wordOrigin(w) {
  const scope = w.id.split(':')[0];
  return scope === 'natif' ? 'mot natif' : scope === 'site' ? 'mot du site, vocabulaire.yaml' : `mot du paquet ${scope}`;
}

function printWord(w) {
  console.log(`# ${w.name} (${wordOrigin(w)})\n${w.description}\n\nDans une forme :\n  - ${wordUsage(w)}${w.container ? '\n      - … (les éléments placés dedans)' : ''}\n`);
  if (w.params.length) {
    console.log('Données, dans l\'ordre où elles se passent :');
    for (const p of w.params) console.log(`  ${p.name}${p.required ? ' (obligatoire)' : ''}: ${describeSchema(p.schema)}${p.schema.description ? ` — ${p.schema.description}` : ''}`);
    console.log('  Une donnée s\'écrit comme pour une primitive : un nom de donnée du composant, « un texte », un nombre, oui, non, rien.');
  } else console.log('Aucune donnée.');
  // La définition elle-même : ce qui est écrit dans le vocabulaire est ce qui entre dans la page, rien n'est déduit.
  const ind = t => String(t).trimEnd().split('\n').map(l => '    ' + l).join('\n');
  const where = w.line ? ` (ligne ${w.line} du vocabulaire)` : '';
  if (w.kind === 'forme') console.log(`\nDéfini par une forme, faite de primitives et d'autres mots${where} :\n${ind(YAML.stringify(w.forme, { lineWidth: 0 }))}`);
  else console.log(`\nDéfini par un fragment de gabarit${where} :\n${ind(w.gabarit)}`);
  if (w.apparence) console.log(`\nSon apparence :\n${ind(YAML.stringify(w.apparence, { lineWidth: 0 }))}`);
  if (w.feuille) console.log(`\nSa feuille (ajoutée une fois à la feuille du site quand le mot sert) :\n${ind(w.feuille)}`);
}

function printSource(name) {
  const d = SOURCES[name], g = sourceFields(name);
  console.log(`# ${name} (source : service « ${d.service} » de la cible)\n${d.description.charAt(0).toUpperCase() + d.description.slice(1)}.${d.only ? ` Réservée au composant ${d.only}.` : ''}\n`);
  console.log(`Dans le manifeste d'un composant :\n  fonctionnement:\n    lit:\n      nom: ${sourceUsage(name)}\n`);
  const params = Object.keys(d.params);
  console.log(d.names?.length ? `Paramètre (facultatif) : ${params.join(', ')}, le nom d'un registre (celui d'un « enregistre dans: »). Sans lui : le registre du formulaire du même composant.` : params.length ? `Paramètres (facultatifs ; valeur : une donnée du composant, un nombre, oui, non ou « un texte ») : ${params.join(', ')}.` : 'Aucun paramètre.');
  console.log(`\nElle rend ${g.list ? 'une liste ; chaque élément' : 'un groupe'} :`);
  const show = (fs0, ind) => { for (const x of fs0) { console.log(`${ind}${x.name}: ${x.spec}`); if (x.children) show(x.children, ind + '  '); } };
  show(g.fields, '  ');
  console.log(`\nDans la forme, « nom » se lit comme une donnée${g.list ? ' (« - grille de nom: » puis les champs de l\'élément)' : ' (« - texte: nom.champ », « - si nom.champ: »)'} ; « section, seulement si nom: » n'affiche la section que si la lecture rend quelque chose.`);
  console.log('Un cas de test fournit la valeur lue : clé « à la visite: { nom: … } » dans fixtures/<cas>.yaml.');
}

function explain(catalog, name, words = null, asDocument = false) {
  if (name === 'site' || name === 'theme' || name === 'site.yaml') return explainSite();
  const c = catalog.get(name);
  if (!c) {
    const hint = catalog.suggest(name) || (words?.size ? nearest(name, [...words.keys()]) : null) || nearest(name, SOURCE_NAMES);
    console.error(`Composant inconnu : ${name}.${hint ? ` Vouliez-vous dire ${hint} ?` : ''} (sitec catalog pour la liste)`);
    return 1;
  }
  const m = c.manifest;
  console.log(`# ${c.name}\n${m.description}\n`);
  console.log('Props :');
  for (const [k, s] of Object.entries(m.props.properties || {})) {
    const req = (m.props.required || []).includes(k) ? ' (obligatoire)' : '';
    console.log(`  ${k}${req}: ${describeSchema(s)}${s.description ? ` — ${s.description}` : ''}`);
    if (s.type === 'array' && s.items?.properties) {
      for (const [ik, is] of Object.entries(s.items.properties)) {
        const ireq = (s.items.required || []).includes(ik) ? '*' : '';
        console.log(`      .${ik}${ireq}: ${describeSchema(is)}${is.description ? ` — ${is.description}` : ''}`);
      }
    }
    if (s.type === 'object' && s.properties) {
      for (const [ik, is] of Object.entries(s.properties)) {
        const ireq = (s.required || []).includes(ik) ? '*' : '';
        console.log(`      .${ik}${ireq}: ${describeSchema(is)}${is.description ? ` — ${is.description}` : ''}`);
      }
    }
  }
  let shown = false;
  if (m.example && asDocument) {
    // Le même exemple, écrit comme dans une page au format document (pages/<id>.md) : produit par le rédacteur, relu par le lecteur.
    let sections = null; try { sections = YAML.parse(m.example); } catch { /* exemple illisible : dit par le banc du catalogue */ }
    const schemas = new Map(catalog.list().map(x => [x.name, x.manifest.props || { properties: {} }]));
    const out = [];
    for (const s of Array.isArray(sections) ? sections : []) { const w = writeSectionDocument(s, { schemas }); if (w.lines) out.push(...w.lines, ''); }
    if (out.length) { console.log(`\nExemple, en document (pages/<id>.md) :\n${out.map(l => '  ' + l).join('\n').trimEnd()}`); shown = true; }
  }
  if (m.example && !shown) console.log(`\nExemple :\n${m.example.split('\n').map(l => '  ' + l).join('\n')}`);
  return 0;
}

/** Le format document du site, en une page : ce que lit le lecteur, tiré de ses tables. */
function explainDocument() {
  const fr = Object.entries(COMPONENT_NAMES).map(([k, v]) => `${v[0].toUpperCase() + v.slice(1)} = ${k}`).join(', ');
  const props = Object.entries(PROP_NAMES).map(([k, v]) => `${v} = ${k}`).join(', ');
  console.log(`Site au format document (prototype) : du texte à la place du YAML, lu sans modèle, d'après les données que chaque composant déclare.

Fichiers : site.md (à la place de site.yaml), pages/<id>.md (à la place de pages/<id>.page.yaml), assets/.
Après toute modification : sitec lire <dossier> --accepter (dit ce qui est refusé, ce que vaut chaque document nouveau, ce qui a changé dans les autres ; fige la lecture dans lecture/), puis build.

site.md
  # Nom du site
  Slogan du site, sur une ligne.
  Langue : fr-FR
  Thème : clair                        clair | sombre | chaleureux
  color.primary : #6b2d5c              un jeton de thème par ligne (liste : sitec explain site)
  Pied de page : SIRET 123 456 789
  E-mail : contact@exemple.fr
  Téléphone : 04 00 00 00 00
  Adresse : 12 rue des Lilas, 69003 Lyon
  Menu :
  - Accueil → /
  - Contact → /contact
  Liens du pied de page :
  - Mentions légales → /mentions-legales
  Paquets : ./paquets/vitrine          s'il y en a
  Constantes :                         puis une puce « nom | valeur » par constante
  - delai | 48 h

  ## Boutique                          un réglage du site par section : ${Object.values(GROUP_NAMES).join(', ')} ; ses données en « Nom : valeur »
  Devise : €                           (sitec explain site les liste ; un groupe dans le groupe prend un nom pointé : shipping.flat : 4.9)
  ## Collection realisations : Réalisations
  Tri : -date
  Champs :                             une puce « nom | type » par champ, « | oui » s'il est obligatoire
  - title | string | oui

pages/<id>.md
  # Titre de la page                   la balise title
  Description de la page, sur une ligne.
  Adresse : /contact                   obligatoire ; « / » pour l'accueil

  ## composant : Titre de la section   le composant par son nom du catalogue ou son nom français ; « ## composant #ancre : Titre » pose une ancre
  Un paragraphe.                       le texte libre du composant (sous-titre, introduction, texte) ; paragraphes séparés par une ligne vide
  Nom : valeur                         une donnée par son nom ou son nom français ; oui / non ; un nombre ; « a, b, c » pour une liste de mots
  Libellé → /cible                     un lien seul sur sa ligne remplit le premier lien libre du composant ; cible : /route, #ancre, https://…, mailto:…, tel:…
  - valeur | valeur | valeur           un élément de la liste du composant : les valeurs remplissent ses champs dans l'ordre de la fiche (sitec explain <composant>)
    - valeur | valeur                  puces en retrait : la liste d'un élément (les lignes d'un groupe de tarifs)
  Nom :                                seul sur sa ligne, annonce la liste qui suit (si le composant en a plusieurs), ou un texte, lu alors tel quel jusqu'à la fin de la section
  Champs :                             les champs d'un formulaire, une puce chacun : un nom connu (name, email, phone, subject, message),
  - societe : facultatif — Entreprise  ou « nom : type, précisions — Libellé (ex. exemple) » ; types texte, texte long, e-mail, téléphone, nombre, date ;
                                       précisions facultatif, si champ vaut valeur, un parmi a, b, c (en dernier)
  Filtre : category = savons           un groupe de données sur une ligne, « nom = valeur, nom = valeur » ; ou « Filtre : » puis une puce « nom | valeur » par donnée
  Variantes :                          les variantes de la section : une puce « segment | donnée : valeur | … », avec les données du composant
  - mobile | titre : Appelez-nous | Appeler → tel:+33400000000
    suite d'une puce                   des lignes en retrait sous une puce prolongent son dernier texte (une ligne vide fait un paragraphe)
  Dérive de : accueil                  page dérivée : « Retire : ancre, ancre », « Remplace : » puis « - ancre | donnée : valeur | … » ; ses sections s'ajoutent à la fin
  \`\`\`yaml … \`\`\`                      en dernier recours, pour une donnée trop imbriquée pour une ligne

data/products.md, data/<collection>.md    (à la place de data/<nom>.yaml)
  # Produits
  ## savon-lavande : Savon à la lavande   un élément par section : son identifiant, puis son nom (ou le champ de titre de la collection)
  Savon surgras à 8 %.                 sa description (le premier champ « text » d'une collection), en texte libre
  Prix : 6.5                           ses autres champs : Prix, Catégorie, Image, Stock, Mention, Vedette, Unité ; ou les champs de la collection

segments.md                            (à la place de segments.yaml)
  Priorité : devis_abandonne, recurrent
  Segments :
  - recurrent | visites >= 2           conditions : visites = 1, visites >= 2, sur mobile, sur ordinateur,
  - fan | section_view où section = services, au moins 2 fois      un événement suivi de « où clé = valeur », « au moins 2 fois », « depuis 7d »,
  - devis_abandonne | tout             « pas … », et « tout » ou « un parmi » avec une puce en retrait par condition
    - form_start depuis 7d
    - pas form_submit depuis 7d
  Objectifs :
  - appel | click_cta | to = tel:+33400000000
  Expériences :
  - accroche | appel | prix_annonce    objectif, puis les bras ; ou « - relance | devis | segment : devis_abandonne | témoin : 20 »

Dans une puce, un champ dont le type ne convient pas à la valeur est sauté : un nom d'icône va au champ icône, un fichier image au champ image,
un « Libellé → /cible » au champ lien. « rien » saute un champ ; « nom : valeur » vise un champ par son nom.
Rien à protéger : « : », « , », « # », « {{ … }} » et les nombres s'écrivent tels quels, sans guillemets ni indentation.
Une ligne qui ne trouve pas sa place est refusée (E_DOCUMENT, à sa ligne) ; un document modifié sans relecture arrête check et build (E_READING).
Une ligne « nom : suite » d'un à trois mots avant les deux-points est toujours une donnée : un nom inconnu est refusé, jamais rangé dans le texte.
Un texte dont une phrase commence ainsi (« Téléphone : 05 56… ») s'annonce : « Texte : » seul sur sa ligne, puis le texte.

Noms français des composants : ${fr}.
Noms français des données : ${props}.

L'exemple de chaque composant en document : sitec explain <composant> --document. Depuis un site en YAML : sitec rediger <dossier>.`);
}

function describeSchema(s) {
  if (s.$ref === '#/$defs/link') return 'lien { label*, to* }';
  if (s.enum) return s.enum.join(' | ');
  if (Array.isArray(s.type)) return s.type.join(' ou ');
  if (s.type === 'array' && s.items?.enum) return `liste parmi : ${s.items.enum.join(' | ')}`;
  if (s.type === 'array' && s.items && (!Object.keys(s.items).length || s.items.$comment)) return 'liste (voir description)';
  if (s.type === 'array') return `liste de ${s.items?.type === 'object' ? 'objets' : (s.items?.type || 'valeurs')}${s.minItems ? ` (min ${s.minItems})` : ''}`;
  if (s.type === 'object') return 'objet';
  if (s.format === 'email') return 'email';
  if (s.format === 'route') return 'route (/page) ou URL';
  if (s.format === 'asset') return 'fichier dans assets/';
  return s.type || 'valeur';
}

/** Ce que vaut un document jamais accepté, sans redire son contenu : chaque section, ses données, la taille de ses listes. */
function summarize(doc) {
  const data = YAML.parse(doc.yaml) || {}, out = [];
  const shape = v => (Array.isArray(v) ? ` (${v.length}${v[0] && typeof v[0] === 'object' ? ' : ' + [...new Set(v.flatMap(x => Object.keys(x || {})))].join(', ') : ''})` : '');
  if (data.site) {
    const s = data.site;
    out.push(`site : ${Object.keys(s).map(k => (s[k] && typeof s[k] === 'object' && !Array.isArray(s[k]) ? `${k} { ${Object.keys(s[k]).join(', ')} }` : k + shape(s[k]))).join(', ')}`);
    for (const k of Object.keys(data)) if (k !== 'site' && k !== 'language') out.push(`${k}${shape(data[k])}`);
    return out;
  }
  out.push(`page ${data.route ?? '(sans adresse)'} : ${Object.keys(data).filter(k => k !== 'sections').map(k => (k === 'seo' ? `seo { ${Object.keys(data.seo || {}).join(', ')} }` : k)).join(', ')}`);
  (data.sections || []).forEach((sec, n) => {
    const name = Object.keys(sec)[0], p = sec[name] || {};
    out.push(`ligne ${String(doc.where?.[`sections[${n}]`] ?? '?').padStart(3)}  ${name} : ${Object.keys(p).map(k => k + shape(p[k])).join(', ') || '(rien)'}`);
  });
  return out;
}
