import path from 'node:path';
import { loadCatalog } from './catalog.js';
import { loadProject } from './load.js';
import { validateProject, collectWarnings } from './validate.js';
import { emit } from './emit/index.js';
import { formatErrors } from './errors.js';
import { THEME_PRESETS } from './emit/css.js';

const HELP = `sitec — compilateur Devanture (sites vitrines → PHP + JS)

Usage :
  sitec check   <dossier-projet>  [--json]   Valide sans générer
  sitec build   <dossier-projet>  [--out d]  Valide puis génère dist/
  sitec catalog                              Liste compacte des composants
  sitec explain <composant>                  Fiche détaillée d'un composant (ou : explain site)
  sitec review   <dossier-projet> [--llm] [--export f.json] [--import f.json]
                                             Relecture éditoriale : textes à compléter, faits absents du brief (brief.md), engagements à valider
  sitec build … --draft                      Compile malgré des textes à compléter
  sitec keywords <dossier-projet> [--all] [--dry-run] [--export f.json] [--import f.json] [--model id]
                                             Fait proposer par un LLM les mots-clés de recherche de chaque section et les fige dans le YAML
  sitec init  <dossier> [--name "Nom du site"] [--repo github:compte/devanture]
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
    case 'catalog':
      printCatalog(catalog);
      return 0;

    case 'explain': {
      const name = args[0];
      if (!name) { console.error('Usage : sitec explain <composant>'); return 2; }
      return explain(catalog, name);
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
        console.log(JSON.stringify({ ok: true, pages: project.pages.length, sections: countSections(project), warnings: warnings.length + placeholders.length, review: 'sitec review ' + dir }));
        return 0;
      }
      const outIdx = rest.indexOf('--out');
      const out = outIdx >= 0 ? path.resolve(rest[outIdx + 1]) : path.join(root, 'dist');
      const report = await emit(project, catalog, out);
      console.log(`OK  ${report.pages} pages, ${report.components} composants → ${path.relative(process.cwd(), out) || '.'}`);
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
      if (!dir) { console.error('Usage : sitec init <dossier> [--name "Nom du site"] [--repo github:compte/devanture]'); return 2; }
      const nameIdx = rest.indexOf('--name'), repoIdx = rest.indexOf('--repo');
      const { initProject } = await import('./init.js');
      try {
        const r = await initProject(dir, { name: nameIdx >= 0 ? rest[nameIdx + 1] : undefined, repo: repoIdx >= 0 ? rest[repoIdx + 1] : undefined, git: !flags.has('--no-git') });
        console.log(`OK  ${r.name} → ${path.relative(process.cwd(), r.root) || '.'} : ${r.files.length} fichiers${r.committed ? ', dépôt git initialisé (branche main, premier commit)' : ''}`);
        console.log(`    compilateur : ${r.dependency}${r.dependency.startsWith('file:') ? '  (chemin local ; pour l’intégration continue, publier le compilateur et passer --repo github:compte/devanture)' : ''}`);
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

function printCatalog(catalog) {
  console.log('Composants disponibles (sections). Props : * = obligatoire. Détail : sitec explain <nom>\n');
  for (const c of catalog.list()) {
    const props = Object.entries(c.manifest.props.properties || {})
      .map(([k]) => (c.manifest.props.required || []).includes(k) ? `${k}*` : k)
      .join(', ');
    console.log(`${c.name.padEnd(14)} ${c.manifest.description}\n${''.padEnd(14)} props: ${props}`);
  }
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
