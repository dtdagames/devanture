import path from 'node:path';
import { loadCatalog } from './catalog.js';
import { loadProject } from './load.js';
import { validateProject, collectWarnings } from './validate.js';
import { emit, TARGETS } from './emit/index.js';
import { formatErrors } from './errors.js';
import { THEME_PRESETS } from './emit/php/css.js';
import { describeComposite } from './composition.js';
import { TEMPLATE_VOCABULARY } from './lang/template.js';
import fs from 'node:fs/promises';

const HELP = `sitec — compilateur Devanture (sites vitrines → PHP + JS)

Usage :
  sitec check   <dossier-projet>  [--json]   Valide sans générer
  sitec build   <dossier-projet>  [--out d] [--target php]
                                             Valide puis génère dist/ pour la cible (php, seule cible à ce jour)
  sitec catalog [dossier-projet]             Liste compacte des composants (natifs, puis ceux du projet : composés et gabarits)
  sitec explain <composant> [dossier-projet] Fiche détaillée d'un composant (ou : explain site, explain langage)
  sitec component new <dossier> <nom>        Squelette d'un composant de projet : components/<nom>/ (manifest.yaml, template.html, styles.css)
  sitec migrate <dossier> [--dry-run] [--to N]
                                             Fait passer le site à la dernière version du langage (texte modifié, commentaires conservés) et suggère ce qu'elle permet d'écrire mieux
  sitec test <dossier> [--update] [--catalog] [--only nom]
                                             Rend chaque cas components/*/fixtures/*.yaml (projet et paquets) par PHP et le compare à son instantané .html
  sitec review   <dossier-projet> [--llm] [--export f.json] [--import f.json]
                                             Relecture éditoriale : textes à compléter, faits absents du brief (brief.md), engagements à valider
  sitec build … --draft                      Compile malgré des textes à compléter
  sitec keywords <dossier-projet> [--all] [--dry-run] [--export f.json] [--import f.json] [--model id]
                                             Fait proposer par un LLM les mots-clés de recherche de chaque section et les fige dans le YAML
  sitec init  <dossier> [--name "Nom du site"] [--repo github:compte/depot#tag | --local]
                                             Crée un dépôt de site sans PHP : squelette YAML, brief, README, CLAUDE.md, .gitignore, flux GitHub Actions (vérifier, déployer), premier commit
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
      const proj = args[1] ? await projectCatalog(args[1], catalog) : null;
      if (proj?.project.composites?.[name]) { printComposite(proj.project.composites[name]); return 0; }
      return explain(proj?.catalog || catalog, name);
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
      if (sub !== 'new' || !dir || !name) { console.error('Usage : sitec component new <dossier-projet> <nom>'); return 2; }
      if (!/^[a-z][a-z0-9-]*(\.[a-z][a-z0-9-]*)*$/.test(name)) { console.error(`Nom de composant mal formé : ${name} (minuscules, chiffres, tirets ; points pour une famille).`); return 2; }
      if (catalog.has(name)) { console.error(`${name} existe déjà dans le catalogue natif : choisissez un autre nom.`); return 2; }
      const cdir = path.join(path.resolve(dir), 'components', name);
      try { await fs.access(cdir); console.error(`${cdir} existe déjà.`); return 2; } catch { /* libre */ }
      await fs.mkdir(cdir, { recursive: true });
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
      if (!dir) { console.error('Usage : sitec review <dossier-projet> [--llm] [--export f.json] [--import f.json] [--model id]'); return 2; }
      const root = path.resolve(dir);
      const project = await loadProject(root);
      const errors = validateProject(project, catalog);
      if (errors.length) { process.stdout.write(formatErrors(errors, { json: true, root })); return 1; }
      const { reviewProject, REVIEW_SYSTEM, buildReviewPrompt } = await import('./review.js');
      const findings = reviewProject(project, project.brief);
      const rel = f => ({ ...f, file: path.relative(root, f.file).replaceAll('\\', '/') });
      const opt = name => { const i = rest.indexOf(name); return i >= 0 ? rest[i + 1] : null; };
      let verdicts = null;
      if (flags.has('--llm') || opt('--export') || opt('--import')) {
        const toReview = findings.filter(f => f.code !== 'E_PLACEHOLDER');
        const user = buildReviewPrompt(project.brief, toReview);
        const fsp = await import('node:fs/promises');
        if (opt('--export')) { await fsp.writeFile(path.resolve(opt('--export')), JSON.stringify({ system: REVIEW_SYSTEM, user, count: toReview.length }, null, 2)); console.log(JSON.stringify({ ok: true, exported: opt('--export'), passages: toReview.length })); return 0; }
        let text;
        if (opt('--import')) text = await fsp.readFile(path.resolve(opt('--import')), 'utf8');
        else { const { askModel, DEFAULT_MODEL } = await import('./keywords.js'); console.error(`Relecture par ${opt('--model') || DEFAULT_MODEL} de ${toReview.length} passages…`); text = await askModel({ system: REVIEW_SYSTEM, user, model: opt('--model') || DEFAULT_MODEL }); }
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
      if (!dir) { console.error('Usage : sitec keywords <dossier-projet> [--all] [--dry-run] [--export fichier.json] [--import fichier.json] [--model id]'); return 2; }
      const root = path.resolve(dir);
      const project = await loadProject(root);
      const errors = validateProject(project, catalog);
      if (errors.length) { process.stdout.write(formatErrors(errors, { json: true, root })); return 1; }
      const { collectSections, buildUserPrompt, askModel, parseProposals, applyProposals, DEFAULT_MODEL } = await import('./keywords.js');
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
      let text;
      if (opt('--import')) text = await (await import('node:fs/promises')).readFile(path.resolve(opt('--import')), 'utf8');
      else {
        const model = opt('--model') || DEFAULT_MODEL;
        console.error(`Appel du modèle ${model} pour ${sections.length} sections…`);
        text = await askModel({ system: SYSTEM_PROMPT, user, model });
      }
      const { result, report } = parseProposals(text, sections);
      if (flags.has('--dry-run')) {
        for (const [key, list] of result) console.log(`${key}: ${list.join(' | ')}`);
        console.log(JSON.stringify({ ok: true, dry_run: true, sections: result.size, ...report }));
        return 0;
      }
      const touched = await applyProposals(project, sections, result);
      console.log(JSON.stringify({ ok: true, sections: result.size, keywords: report.accepted, dropped: report.dropped, unknown: report.unknown, files: touched }));
      return 0;
    }

    case 'init': {
      const dir = args[0];
      if (!dir) { console.error('Usage : sitec init <dossier> [--name "Nom du site"] [--repo github:compte/depot#tag | --local]'); return 2; }
      const nameIdx = rest.indexOf('--name'), repoIdx = rest.indexOf('--repo');
      const { initProject } = await import('./init.js');
      try {
        const r = await initProject(dir, { name: nameIdx >= 0 ? rest[nameIdx + 1] : undefined, repo: repoIdx >= 0 ? rest[repoIdx + 1] : undefined, local: flags.has('--local'), git: !flags.has('--no-git') });
        console.log(`OK  ${r.name} → ${path.relative(process.cwd(), r.root) || '.'} : ${r.files.length} fichiers${r.committed ? ', dépôt git initialisé (branche main, premier commit)' : ''}`);
        console.log(`    compilateur : ${r.dependency}${r.dependency.startsWith('file:') ? '  (chemin local, pour travailler sur le compilateur ; sans --local, la dépendance est le dépôt GitHub étiqueté)' : ''}`);
        console.log('    ensuite : cd ' + dir + ' && npm install && npx sitec check .   (remplir brief.md et les [à compléter])');
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
Composants de projet : components/<nom>/manifest.yaml + template.html (+ styles.css, module.js) ; sitec component new <dossier> <nom>.
  gabarit : {{ expr }} échappé ; balises ${TEMPLATE_VOCABULARY.tags.join(', ')} ; variables ${TEMPLATE_VOCABULARY.variables.join(', ')} ; fonctions ${TEMPLATE_VOCABULARY.functions.join(', ')} (HTML sûr : ${TEMPLATE_VOCABULARY.safe.join(', ')})
  effets déclarés : manifest.yaml › effects.form { store, fields, notify, to, success } → {% form %} … {% endform %}, {{ field('nom') }}, form.ok, form.failed, form.message, form.success.
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
  console.log(`\nFichiers attendus : site.yaml, pages/*.page.yaml, assets/ (images). Voir CLAUDE.md.\nConfiguration du site (nav, thème, tokens, pied, coordonnées) : sitec explain site`);
}

function explainSite() {
  console.log(`# site.yaml
Clé racine : site. Props :
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
  personalization: objet — segments et variantes (voir segments.yaml)
  static: objet — { enabled: true } cache statique des pages sans état pour les visiteurs sans cookie (servi par Apache sans PHP) ; défaut : activé
  studio: objet — { enabled: false } embarque l'atelier (compilateur navigateur + source du site) sur /_studio, derrière ADMIN_TOKEN ; défaut : désactivé
  offline: objet — { enabled: false, short_name, theme_color } service worker : assets et versions texte consultables hors ligne ; défaut : désactivé
  language (racine, hors site) : 1 — version du langage ; constants (racine) : { nom: valeur } lues par {{ const.nom }} ; collections (racine) : voir sitec explain langage
  images: objet — { enabled: true, widths: [480, 960, 1600], quality: 80 } variantes WebP redimensionnées à la compilation pour les JPEG, PNG et WebP de assets/ (srcset, width/height, chargement différé) ; défaut : activé si sharp est installé
Exploitation (hors DSL) : back-office /_admin (ADMIN_TOKEN dans .env), stockage SQLite ou fichiers (STORE), déploiement signé /_deploy (DEPLOY_SECRET, commande sitec deploy), multi-sites : sitec host
      .enabled: boolean (défaut true)   .requires_consent: boolean (défaut true)   .consent_text: string
  shop: objet — boutique (data/products.yaml + composants products.grid, product.hero, cart.page, checkout.page, order.confirmation)
      .currency: string (défaut €)   .payment: manual | stripe (défaut manual ; clé STRIPE_SECRET_KEY dans .env)
      .manual_instructions: string   .shipping: { flat: nombre, free_from: nombre }   .order_email: email

# segments.yaml (optionnel, à la racine du site)
  segments: { nom: condition, … }   priority: [noms, du plus prioritaire au moins]
  Conditions : visits: N | { gte: N } · device: mobile | desktop · event: nom (+ within: 7d, count: { gte: 2 }, where: { section: id | route: /p | category: x })
               all: [c1, c2] · any: [c1, c2] · not: c
  Événements : page_view, section_view, click_cta, form_start, form_submit, search, cart_add, checkout_start, purchase
  Sur une section : variants: { nom_de_segment: { props surchargées } } — la première variante dont le segment est actif s'applique.
  Sur une page : variants: { nom_de_segment: { first: [ids], hide: [ids] } } — ordre et présence des sections (ids explicites).

# Page dérivée (micro-site) : extends: <id de page>, override: { id: { props } }, remove: [ids], prepend/append: [sections], route et seo propres.
# Relecture : brief.md à la racine ; sitec review <dossier> ; [à compléter] bloque build (sauf --draft).
  Exemple :
    segments:
      nouveau: { visits: 1 }
      recurrent: { visits: { gte: 2 } }
      devis_abandonne: { all: [ { event: form_start, within: 7d }, { not: { event: form_submit, within: 7d } } ] }
      fan_services: { event: section_view, where: { section: services }, count: { gte: 2 } }
    priority: [devis_abandonne, fan_services, recurrent, nouveau]

Exemple :
  site:
    name: Maison Dubois
    tagline: Savonnerie artisanale à Marseille
    theme: { preset: chaleureux, tokens: { color.primary: "#6b2d5c", font.heading: "Georgia, serif" } }
    nav: [ { label: Accueil, to: / }, { label: Contact, to: /contact } ]
    footer: { text: SIRET 123 456 789 00012, links: [ { label: Mentions légales, to: /mentions-legales } ] }
    contact: { email: bonjour@exemple.fr, phone: 04 00 00 00 00, address: 1 rue des Lilas, 13001 Marseille }`);
  return 0;
}

function explain(catalog, name) {
  if (name === 'site' || name === 'theme' || name === 'site.yaml') return explainSite();
  const c = catalog.get(name);
  if (!c) {
    const hint = catalog.suggest(name);
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
  if (m.example) console.log(`\nExemple :\n${m.example.split('\n').map(l => '  ' + l).join('\n')}`);
  return 0;
}

function describeSchema(s) {
  if (s.$ref === '#/$defs/link') return 'lien { label*, to* }';
  if (s.enum) return s.enum.join(' | ');
  if (Array.isArray(s.type)) return s.type.join(' ou ');
  if (s.type === 'array' && s.items?.enum) return `liste parmi : ${s.items.enum.join(' | ')}`;
  if (s.type === 'array' && s.items && !Object.keys(s.items).length) return 'liste (voir description)';
  if (s.type === 'array') return `liste de ${s.items?.type === 'object' ? 'objets' : (s.items?.type || 'valeurs')}${s.minItems ? ` (min ${s.minItems})` : ''}`;
  if (s.type === 'object') return 'objet';
  if (s.format === 'email') return 'email';
  if (s.format === 'route') return 'route (/page) ou URL';
  if (s.format === 'asset') return 'fichier dans assets/';
  return s.type || 'valeur';
}
