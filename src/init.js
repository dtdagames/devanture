// sitec init : un dépôt de site sans PHP. Source versionnée (documents par défaut, YAML avec --yaml), dist/ ignoré, vérification et
// déploiement signé par l'intégration continue.
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { loadProject } from './load.js';
import { readings, acceptReadings } from './reading.js';

const run = promisify(execFile);
const SITEC_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function slug(s) { return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'site'; }

/** Le squelette écrit en documents : site.md, pages/<id>.md. Sa lecture est figée par le compilateur à la création (lecture/). */
const documents = siteName => ({
  'site.md': `# ${siteName}

[à compléter] une phrase qui dit ce que vous faites et où

Langue : fr-FR
Thème : clair
Pied de page : [à compléter] raison sociale, SIRET
E-mail : contact@exemple.fr
Menu :
- Accueil → /
- Contact → /contact
Liens du pied de page :
- Mentions légales → /mentions-legales

## Agents
Résumé : [à compléter] une phrase pour les assistants qui lisent le site
Type d'activité : LocalBusiness
`,
  'pages/accueil.md': `# ${siteName}

[à compléter] description de 150 caractères pour les moteurs de recherche

Adresse : /

## Bandeau #accueil : [à compléter] la promesse en une ligne
[à compléter] pour qui, où, et pourquoi vous
Nous contacter → /contact

## Points forts #points-forts : Pourquoi nous
- check | [à compléter] | [à compléter]
- clock | [à compléter] | [à compléter]
- shield | [à compléter] | [à compléter]
`,
  'pages/contact.md': `# Contact · ${siteName}

[à compléter] comment et quand vous répondez

Adresse : /contact

## Formulaire de contact #contact : Contactez-nous
Destinataire : contact@exemple.fr
Champs : name, email, phone, message
Obligatoires : name, email, message
Confirmation : Merci, nous revenons vers vous rapidement.
`,
  'pages/mentions-legales.md': `# Mentions légales · ${siteName}

Mentions légales du site

Adresse : /mentions-legales

## Texte : Mentions légales
Texte :
**Éditeur** : [à compléter] raison sociale, adresse, SIRET.

**Hébergement** : [à compléter] nom et adresse de l'hébergeur.

**Données personnelles** : les messages envoyés par le formulaire servent uniquement à vous répondre.
`,
});

/** Le même squelette en YAML (--yaml). */
const yamlFiles = siteName => ({
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
});

/** Dans le mode d'emploi d'un dépôt en documents : ce que l'agent écrit, à la place de la structure YAML. */
const STRUCTURE_DOCUMENTS = `## Structure du site

\`\`\`
site.md                # nom, slogan, thème, menu, coordonnées, réglages
pages/<id>.md          # une page par fichier
assets/                # images référencées par les composants (chemin relatif à assets/)
lecture/               # ce que le compilateur comprend de chaque document : écrit par lui, jamais à la main
\`\`\`

Ce dépôt est écrit en documents : du texte lu sans modèle, d'après les données que chaque composant déclare. N'y ajoute pas de \`site.yaml\` ni de \`pages/<id>.page.yaml\`.

### site.md

\`\`\`
# Plomberie Martin

Dépannage 7j/7 à Lyon

Langue : fr-FR
Thème : clair
color.primary : #123456
Pied de page : SIRET 123 456 789
E-mail : contact@exemple.fr
Téléphone : 04 00 00 00 00
Adresse : 12 rue des Lilas, 69003 Lyon
Menu :
- Accueil → /
- Services → /services
Liens du pied de page :
- Mentions légales → /mentions-legales
\`\`\`

### pages/<id>.md

\`\`\`
# Plomberie Martin

Plombier à Lyon, dépannage 7j/7

Adresse : /

## Bandeau : Plombier à Lyon
Appeler → tel:+33400000000

## Points forts
- clock | Intervention en 1 h
- shield | Devis gratuit
\`\`\`

- \`# Titre\` est le titre de la page, le paragraphe qui suit sa description, \`Adresse : /route\` sa route (obligatoire, unique ; \`/\` pour l'accueil).
- Une section par \`## composant : Titre\` (nom du catalogue ou nom français : Bandeau, Points forts, Texte, Questions, Appel…) ; \`## composant #ancre : Titre\` pose une ancre.
- Sous l'intitulé : un paragraphe est le texte libre du composant ; \`Nom : valeur\` une donnée ; \`Libellé → /cible\` seul sur sa ligne un lien ; \`- valeur | valeur\` un élément de liste, dont les valeurs suivent l'ordre des champs de la fiche (\`npx sitec explain <composant> --document\` montre l'exemple du composant écrit ainsi).
- Dans \`site.md\`, un jeton de thème s'écrit sur sa ligne, « nom : valeur » (\`color.primary : #123456\` ; liste des jetons : \`npx sitec explain site\`).
- Rien à protéger : ni guillemets ni indentation. Une ligne qui ne trouve pas sa place est refusée, à sa ligne. Une ligne « nom : suite » d'un à trois mots avant les deux-points est une donnée : si le nom n'en est pas une, elle est refusée. Exception : dans le texte d'un composant Texte, une phrase comme « Éditeur : Cabinet Martin, 12 rue… » se lit comme du texte quand sa suite fait plusieurs mots ; ailleurs (un slogan, un sous-titre), ou pour une suite d'un seul mot, annonce le texte par \`Texte :\` seul sur sa ligne.
- **Après toute modification d'un document** : \`npx sitec check . --accepter\` relit, fige la lecture dans \`lecture/\` et vérifie, en une commande ; elle dit ce qui a changé dans chaque document (lignes \`I_READING\`) et ce qui est refusé. Sans relecture, \`check\` s'arrête (\`E_READING\`). Relis ce qu'elle affiche avant de committer, et committe \`lecture/\` avec le document. \`npx sitec lire .\` montre la même chose sans rien figer.
- Le format en une page : \`npx sitec explain document\`.

`;

export async function initProject(dir, { name, repo, local = false, git = true, yaml = false } = {}) {
  const root = path.resolve(dir);
  const siteName = name || path.basename(root).replace(/[-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const id = slug(path.basename(root));
  try { const existing = await fs.readdir(root); if (existing.length) throw new Error(`${root} n'est pas vide`); } catch (e) { if (e.code !== 'ENOENT') throw e; }
  await fs.mkdir(path.join(root, 'pages'), { recursive: true });
  await fs.mkdir(path.join(root, 'assets'), { recursive: true });
  await fs.mkdir(path.join(root, '.github', 'workflows'), { recursive: true });

  // Dépendance vers le compilateur : dépôt git public quand il existe, sinon le chemin local (fonctionne ici, pas en intégration continue).
  const rel = path.relative(root, SITEC_ROOT).replaceAll('\\', '/');
  const dep = repo || (local ? 'file:' + (rel.startsWith('.') ? rel : './' + rel) : 'github:dtdagames/devanture#v0.17.0');
  const source = yaml ? 'YAML' : 'documents';

  const files = {
    ...(yaml ? yamlFiles(siteName) : documents(siteName)),
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
# Schémas de l'éditeur, régénérés par sitec schema.
.devanture/
`,
    'package.json': JSON.stringify({
      name: id, private: true, type: 'module',
      description: `Site ${siteName} — source Devanture (${source}), compilée en PHP par sitec. Aucun PHP dans ce dépôt.`,
      scripts: { ...(yaml ? { postinstall: 'sitec schema . || exit 0', schema: 'sitec schema .' } : { lire: 'sitec lire .', accepter: 'sitec check . --accepter' }), test: 'sitec test .', check: 'sitec check .', build: 'sitec build .', review: 'sitec review .', keywords: 'sitec keywords .', deploy: 'sitec deploy .', 'no-php': "node -e \"const{execSync}=require('child_process');const f=execSync('git ls-files',{encoding:'utf8'}).split(/\\r?\\n/).filter(x=>/\\.php$/i.test(x));if(f.length){console.error('PHP interdit dans ce dépôt :',f.join(', '));process.exit(1)}console.log('aucun PHP versionné')\"" },
      dependencies: { devanture: dep },
    }, null, 2) + '\n',
    '.github/workflows/site.yml': `name: Site
on:
  push: { branches: [main] }
  pull_request:

jobs:
  verifier:
    name: Vérifier (aucun PHP, ${yaml ? 'DSL valide' : 'documents lus et lecture à jour'}, relecture)
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

Dépôt de site **sans PHP** : la source est écrite ${yaml ? 'dans le DSL Devanture (YAML)' : 'en documents Devanture (\`site.md\`, \`pages/<id>.md\`)'}, le compilateur \`sitec\` produit le PHP, le JS et le CSS dans \`dist/\`, qui n'est jamais versionné.

## Travailler

\`\`\`
npm install            # installe le compilateur (commitez ensuite package-lock.json : il fige sa version)
${yaml ? 'npx sitec check .      # valide (erreurs en JSON, une par ligne)' : 'npx sitec check . --accepter   # après toute modification : relit les documents, fige leur lecture dans lecture/, valide'}
npx sitec build .      # compile dans dist/ (refusé tant qu'il reste des [à compléter], sauf --draft)
npx sitec review .     # ce qui manque au brief, ce qui est à faire valider
\`\`\`
${yaml ? '' : '\nLe dossier \`lecture/\` contient ce que le compilateur comprend de chaque document. Il l\'écrit lui-même : on ne le modifie pas à la main, on le committe avec le document.\n'}
Test local : \`php -S localhost:8080 -t dist dist/index.php\` (ou l'atelier : \`studio/index.html\` du compilateur, bouton « Ouvrir un dossier »).

## Déployer

1. Sur le serveur, une seule fois : déposer un premier \`dist/\` par FTP, puis créer \`.env\` à côté de \`index.php\` avec \`DEPLOY_SECRET\` (long, aléatoire) et \`ADMIN_TOKEN\`.
2. Dans le dépôt GitHub : variable \`SITE_URL\` (https://votre-domaine) et secret \`DEPLOY_SECRET\` (même valeur), environnement \`production\`.
3. Chaque push sur \`main\` vérifie, compile et déploie par envoi signé. Les données du site (messages, commandes, stock) et son \`.env\` sont conservés.

À la main : \`SITE_URL=https://votre-domaine DEVANTURE_DEPLOY_SECRET=… npm run deploy\`.

## Règles

- Aucun fichier PHP dans ce dépôt : la vérification \`no-php\` refuse le commit en intégration continue. Un besoin non couvert se traite par un composant du site (components/<nom>/), ou dans le compilateur.
- \`brief.md\` est la source de vérité : n'inventez ni prix, ni délai, ni distinction ; écrivez \`[à compléter]\`.
- Le mode d'emploi complet pour un auteur, humain ou modèle : \`CLAUDE.md\`.

## Exploitation

Back-office du site compilé : \`/_admin\` (jeton \`ADMIN_TOKEN\`). Version texte : \`/lisible…\`. Jumeau pour agents : \`/site.json\`, \`/llms.txt\`. Atelier embarqué (réglage \`studio\` du site) : \`/_studio\`.
`,
  };
  // Mode d'emploi pour l'agent : celui du compilateur, avec les commandes du dépôt de site.
  let manual = await fs.readFile(path.join(SITEC_ROOT, 'CLAUDE.md'), 'utf8');
  manual = manual.replace(/\r\n/g, '\n');
  const commands = '```\nnpx sitec catalog              # liste des composants (1 ligne chacun)\nnpx sitec explain <composant>  # props détaillées + exemple\n' + (yaml ? 'npx sitec check .              # valide, erreurs en JSON (1 par ligne), code 1 si erreurs\n' : 'npx sitec check . --accepter   # après toute modification : relit les documents, fige leur lecture, valide (erreurs en JSON, 1 par ligne)\n') + 'npx sitec build .              # valide puis génère dist/ (PHP + JS + CSS), jamais versionné\nnpx sitec review .             # relecture éditoriale contre brief.md\n```';
  manual = manual.replace(/```\nnode bin\/sitec\.js catalog[\s\S]*?```/, () => commands)
    .replaceAll('node bin/sitec.js', 'npx sitec')
    .replace('# Devanture — mode d\'emploi pour l\'agent', () => `# ${siteName} — mode d'emploi pour l'agent\n\nCe dépôt ne contient que la source du site (${yaml ? 'YAML' : 'documents'}, brief, images). **Aucun fichier PHP, JS ou CSS n'y est accepté.** \`dist/\` est produit par \`npx sitec build .\` et n'est jamais versionné.`);
  if (!yaml) {
    // La structure YAML laisse la place à celle des documents ; les règles du langage restent, avec leur renvoi vers l'écriture en document.
    const a = manual.indexOf('## Structure d\'un site'), b = manual.indexOf('## Règles');
    if (a >= 0 && b > a) manual = manual.slice(0, a) + STRUCTURE_DOCUMENTS + '## Règles\n\nCe sont les règles du langage. Là où elles montrent du YAML, écris la même chose en document ; les trois pièges YAML ne concernent pas les documents.\n' + manual.slice(b + '## Règles'.length);
    manual = manual.replace('Tu écris des sites vitrines dans un DSL YAML.', () => 'Tu écris un site vitrine en documents : du texte, lu par le compilateur.');
  }
  files['CLAUDE.md'] = manual;
  files['assets/.gitkeep'] = '';

  for (const [f, content] of Object.entries(files)) { await fs.mkdir(path.dirname(path.join(root, f)), { recursive: true }); await fs.writeFile(path.join(root, f), content); }

  // Documents : leur lecture est figée par le compilateur lui-même, comme le ferait « sitec lire --accepter ».
  let frozen = [];
  if (!yaml) {
    const project = await loadProject(root);
    const refused = readings(project, root).filter(r => r.status === 'erreurs');
    if (refused.length) throw new Error(`squelette illisible : ${refused.map(r => `${r.file} ligne ${r.errors[0].line} (${r.errors[0].message})`).join(' ; ')}`);
    frozen = await acceptReadings(project, root);
  }

  let committed = false;
  if (git) {
    try {
      await run('git', ['init', '-q', '-b', 'main'], { cwd: root });
      await run('git', ['add', '-A'], { cwd: root });
      await run('git', ['-c', 'user.name=sitec', '-c', 'user.email=sitec@localhost', 'commit', '-q', '-m', `Squelette du site ${siteName} (Devanture, sans PHP)`], { cwd: root });
      committed = true;
    } catch (e) { /* git absent : le dossier reste utilisable */ }
  }
  return { root, name: siteName, files: [...Object.keys(files), ...frozen], dependency: dep, committed, format: yaml ? 'yaml' : 'documents' };
}
