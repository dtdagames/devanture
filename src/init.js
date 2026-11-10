// sitec init : un dépôt de site sans PHP. Source YAML versionnée, dist/ ignoré, vérification et déploiement signé par l'intégration continue.
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const run = promisify(execFile);
const SITEC_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function slug(s) { return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'site'; }

export async function initProject(dir, { name, repo, local = false, git = true } = {}) {
  const root = path.resolve(dir);
  const siteName = name || path.basename(root).replace(/[-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const id = slug(path.basename(root));
  try { const existing = await fs.readdir(root); if (existing.length) throw new Error(`${root} n'est pas vide`); } catch (e) { if (e.code !== 'ENOENT') throw e; }
  await fs.mkdir(path.join(root, 'pages'), { recursive: true });
  await fs.mkdir(path.join(root, 'assets'), { recursive: true });
  await fs.mkdir(path.join(root, '.github', 'workflows'), { recursive: true });

  // Dépendance vers le compilateur : dépôt git public quand il existe, sinon le chemin local (fonctionne ici, pas en intégration continue).
  const rel = path.relative(root, SITEC_ROOT).replaceAll('\\', '/');
  const dep = repo || (local ? 'file:' + (rel.startsWith('.') ? rel : './' + rel) : 'github:dtdagames/devanture#v0.10.0');

  const files = {
    'site.yaml': `language: 1

site:
  name: ${siteName}
  tagline: "[à compléter] une phrase qui dit ce que vous faites et où"
  locale: fr-FR
  theme: { preset: clair }
  nav:
    - { label: Accueil, to: / }
    - { label: Contact, to: /contact }
  footer:
    text: "[à compléter] raison sociale, SIRET"
    links:
      - { label: Mentions légales, to: /mentions-legales }
  contact:
    email: contact@exemple.fr
  agents: { summary: "[à compléter] une phrase pour les assistants qui lisent le site", business_type: LocalBusiness }
`,
    'pages/accueil.page.yaml': `page: accueil
route: /
seo: { title: ${siteName}, description: "[à compléter] description de 150 caractères pour les moteurs de recherche" }
sections:
  - hero:
      id: accueil
      title: "[à compléter] la promesse en une ligne"
      subtitle: "[à compléter] pour qui, où, et pourquoi vous"
      cta: { label: Nous contacter, to: /contact }
  - features:
      id: points-forts
      title: Pourquoi nous
      items:
        - { icon: check, title: "[à compléter]", text: "[à compléter]" }
        - { icon: clock, title: "[à compléter]", text: "[à compléter]" }
        - { icon: shield, title: "[à compléter]", text: "[à compléter]" }
`,
    'pages/contact.page.yaml': `page: contact
route: /contact
seo: { title: Contact · ${siteName}, description: "[à compléter] comment et quand vous répondez" }
sections:
  - contact.form:
      id: contact
      title: Contactez-nous
      to: contact@exemple.fr
      fields: [ name, email, phone, message ]
      required: [ name, email, message ]
      success: Merci, nous revenons vers vous rapidement.
`,
    'pages/mentions-legales.page.yaml': `page: mentions-legales
route: /mentions-legales
seo: { title: Mentions légales · ${siteName}, description: Mentions légales du site }
sections:
  - richtext:
      title: Mentions légales
      text: |
        **Éditeur** : [à compléter] raison sociale, adresse, SIRET.

        **Hébergement** : [à compléter] nom et adresse de l'hébergeur.

        **Données personnelles** : les messages envoyés par le formulaire servent uniquement à vous répondre.
`,
    'brief.md': `# Brief client — ${siteName}

Ce fichier est la source de vérité : \`sitec review\` signale tout chiffre, délai, garantie ou distinction du site qui n'y figure pas.

## Activité
[à compléter]

## Coordonnées, horaires
[à compléter]

## Offres, tarifs, délais annoncés
[à compléter]

## Ce qu'il ne faut pas dire
[à compléter]
`,
    '.gitignore': `# Sortie compilée : reconstruite par sitec build, jamais versionnée.
dist/
# Secrets du serveur (ADMIN_TOKEN, DEPLOY_SECRET…) : jamais dans le dépôt.
.env
node_modules/
# Schémas de l'éditeur, régénérés après chaque npm install (sitec schema).
.devanture/
`,
    'package.json': JSON.stringify({
      name: id, private: true, type: 'module',
      description: `Site ${siteName} — source Devanture (YAML), compilée en PHP par sitec. Aucun PHP dans ce dépôt.`,
      scripts: { postinstall: 'sitec schema . || exit 0', schema: 'sitec schema .', test: 'sitec test .', check: 'sitec check .', build: 'sitec build .', review: 'sitec review .', keywords: 'sitec keywords .', deploy: 'sitec deploy .', 'no-php': "node -e \"const{execSync}=require('child_process');const f=execSync('git ls-files',{encoding:'utf8'}).split(/\\r?\\n/).filter(x=>/\\.php$/i.test(x));if(f.length){console.error('PHP interdit dans ce dépôt :',f.join(', '));process.exit(1)}console.log('aucun PHP versionné')\"" },
      dependencies: { devanture: dep },
    }, null, 2) + '\n',
    '.github/workflows/site.yml': `name: Site
on:
  push: { branches: [main] }
  pull_request:

jobs:
  verifier:
    name: Vérifier (aucun PHP, DSL valide, relecture)
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm install
      - run: npm run no-php
      - run: npx sitec check .
      - name: Relecture éditoriale (bloquante sur main : pas de [à compléter] en ligne)
        if: github.ref == 'refs/heads/main'
        run: npx sitec review .

  deployer:
    name: Compiler et déployer (envoi signé)
    needs: verifier
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm install
      - run: npx sitec build .
      - name: Déployer vers \${{ vars.SITE_URL }}
        env: { DEVANTURE_DEPLOY_SECRET: \${{ secrets.DEPLOY_SECRET }} }
        run: npx sitec deploy . --to "\${{ vars.SITE_URL }}"
`,
    '.gitattributes': `* text=auto eol=lf
`,
    'README.md': `# ${siteName}

Dépôt de site **sans PHP** : la source est le DSL Devanture (YAML), le compilateur \`sitec\` produit le PHP, le JS et le CSS dans \`dist/\`, qui n'est jamais versionné.

## Travailler

\`\`\`
npm install            # installe le compilateur (commitez ensuite package-lock.json : il fige sa version)
npx sitec check .      # valide (erreurs en JSON, une par ligne)
npx sitec build .      # compile dans dist/ (refusé tant qu'il reste des [à compléter], sauf --draft)
npx sitec review .     # ce qui manque au brief, ce qui est à faire valider
\`\`\`

Test local : \`php -S localhost:8080 -t dist dist/index.php\` (ou l'atelier : \`studio/index.html\` du compilateur, bouton « Ouvrir un dossier »).

## Déployer

1. Sur le serveur, une seule fois : déposer un premier \`dist/\` par FTP, puis créer \`.env\` à côté de \`index.php\` avec \`DEPLOY_SECRET\` (long, aléatoire) et \`ADMIN_TOKEN\`.
2. Dans le dépôt GitHub : variable \`SITE_URL\` (https://votre-domaine) et secret \`DEPLOY_SECRET\` (même valeur), environnement \`production\`.
3. Chaque push sur \`main\` vérifie, compile et déploie par envoi signé. Les données du site (messages, commandes, stock) et son \`.env\` sont conservés.

À la main : \`SITE_URL=https://votre-domaine DEVANTURE_DEPLOY_SECRET=… npm run deploy\`.

## Règles

- Aucun fichier PHP dans ce dépôt : la vérification \`no-php\` refuse le commit en intégration continue. Le bloc \`custom\` du DSL est donc exclu ici ; un besoin non couvert se traite par un composant dans le compilateur.
- \`brief.md\` est la source de vérité : n'inventez ni prix, ni délai, ni distinction ; écrivez \`[à compléter]\`.
- Le mode d'emploi complet du DSL pour un auteur, humain ou modèle : \`CLAUDE.md\`.

## Exploitation

Back-office du site compilé : \`/_admin\` (jeton \`ADMIN_TOKEN\`). Version texte : \`/lisible…\`. Jumeau pour agents : \`/site.json\`, \`/llms.txt\`. Atelier embarqué si \`site.studio: { enabled: true }\` : \`/_studio\`.
`,
  };
  // Mode d'emploi pour l'agent : celui du compilateur, avec les commandes du dépôt de site.
  let manual = await fs.readFile(path.join(SITEC_ROOT, 'CLAUDE.md'), 'utf8');
  manual = manual.replace(/```\nnode bin\/sitec\.js catalog[\s\S]*?```/, '```\nnpx sitec catalog              # liste des composants (1 ligne chacun)\nnpx sitec explain <composant>  # props détaillées + exemple\nnpx sitec check .              # valide, erreurs en JSON (1 par ligne), code 1 si erreurs\nnpx sitec build .              # valide puis génère dist/ (PHP + JS + CSS), jamais versionné\nnpx sitec review .             # relecture éditoriale contre brief.md\n```')
    .replaceAll('node bin/sitec.js', 'npx sitec')
    .replace('# Devanture — mode d\'emploi pour l\'agent', `# ${siteName} — mode d'emploi pour l'agent\n\nCe dépôt ne contient que la source du site (YAML, brief, images). **Aucun fichier PHP, JS ou CSS n'y est accepté** : le bloc \`custom\` est interdit ici. \`dist/\` est produit par \`npx sitec build .\` et n'est jamais versionné.`);
  files['CLAUDE.md'] = manual;
  files['assets/.gitkeep'] = '';

  for (const [f, content] of Object.entries(files)) { await fs.mkdir(path.dirname(path.join(root, f)), { recursive: true }); await fs.writeFile(path.join(root, f), content); }

  let committed = false;
  if (git) {
    try {
      await run('git', ['init', '-q', '-b', 'main'], { cwd: root });
      await run('git', ['add', '-A'], { cwd: root });
      await run('git', ['-c', 'user.name=sitec', '-c', 'user.email=sitec@localhost', 'commit', '-q', '-m', `Squelette du site ${siteName} (Devanture, sans PHP)`], { cwd: root });
      committed = true;
    } catch (e) { /* git absent : le dossier reste utilisable */ }
  }
  return { root, name: siteName, files: Object.keys(files), dependency: dep, committed };
}
