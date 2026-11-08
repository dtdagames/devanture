# Journal des versions

Les dépôts de sites créés par `sitec init` épinglent une étiquette (`github:dtdagames/devanture#v0.4.0`). Pour qu'un site profite d'une version, changer l'étiquette dans son `package.json` puis `npm install`.

## v0.4.0 — 2026-11-08 — l'éditeur connaît le langage

- **`sitec schema`** : schémas JSON du site produits depuis son catalogue réel (composants natifs, du projet, des paquets, composés ; collections ; produits ; cas de test ; manifestes ; paquet) dans `.devanture/schema/`, branchés sur l'extension YAML de VS Code (`.vscode/settings.json`, réglages existants conservés, extension recommandée). Complétion avec description et exemple, images d'`assets/` et routes proposées, prop, composant, image ou route inconnus soulignés à la frappe ; expressions et `{ for }` acceptés.
- `sitec init` produit les schémas à la création et les régénère après chaque `npm install` (`postinstall`, sans faire échouer l'installation) ; `.devanture/` ignoré par git ; scripts `npm run schema` et `npm test`.
- `scripts/check-schemas.mjs` valide tous les fichiers YAML d'un site contre ses schémas ; les quatre exemples passent (39 fichiers). Banc des outils : 28 contrôles.

## v0.3.0 — 2026-11-08 — outillage du langage

- **Gabarit neutre étendu** : bandeau, texte, galerie, équipe, tarifs et carte réécrits sans PHP (13 composants natifs sur 23, plus la liste de collection). Les 36 pages des quatre exemples sont identiques au caractère près avant et après (`scripts/snapshot-pages.mjs`). Restent écrits pour la cible les primitives à effets ou à état : contact, boutique, horaires calculés, mémoire du visiteur, bloc libre. Nouveaux : filtre `url_encode`, fonction `lines()`.
- **Paquets de composants** : `packages:` dans `site.yaml` (chemin ou paquet installé), `package.yaml` + `components/` + `components.yaml`, composants exposés préfixés (`vitrine.encart`), préfixe unique et distinct des familles natives, version de langage du paquet vérifiée, `W_PACKAGE_STUDIO` si l'atelier embarqué ne peut pas le voir. Exemple : `examples/paquets/vitrine`, utilisé par le cabinet d'avocats.
- **`sitec test`** : cas `fixtures/<cas>.yaml` validés contre le manifeste, rendus par le PHP de la cible, comparés à leur instantané `.html` (création, `--update`, `--only`, `--catalog`). A trouvé deux exemples de manifeste natifs invalides (virgule non protégée dans `gallery` et `faq`), corrigés : ce sont ceux que `sitec explain` montre aux agents.
- **`sitec migrate`** : étapes enregistrées entre versions du langage, texte modifié en conservant commentaires et mise en forme, `--dry-run`, vérification du site migré, suggestions (coordonnées recopiées, valeurs répétées à mettre en constantes) ; `W_LANGUAGE` quand la version n'est pas déclarée. Les exemples sont migrés.
- Bancs : `scripts/verify-lang-tools.mjs` (21 contrôles) dans l'intégration continue ; le cabinet d'avocats passe sous Apache en intégration continue.

## v0.2.0 — 2026-11-08 — langage version 1

Devanture devient un langage au sens plein : des moyens d'abstraction définis par l'auteur, une spécification versionnée (`docs/LANGAGE.md`), un noyau d'expressions unique évalué à la compilation et traduit vers la cible.

- **Expressions** `{{ … }}` dans toute valeur : racines `site`, `const`, `page`, `collections` à la compilation, `item`, `product`, `order` à l'affichage ; opérateurs, comparaisons, `and/or/not`, 30 filtres ; vérification statique des racines et des clés. Même sémantique en JavaScript et dans le PHP produit (`scripts/verify-lang.mjs`).
- **Constantes** (`site.yaml › constants`) et **version du langage** (`language: 1`, `E_LANGUAGE` si inconnue).
- **Collections génériques** : déclaration typée dans `site.yaml`, éléments dans `data/<nom>.yaml`, page par élément (`route: /…/[id]`, `source: <nom>`), composant `collection.list` (filtre, tri, limite, champs d'affichage), 404 pour un id inconnu.
- **Composants composés** (`components.yaml`) : assemblages nommés avec paramètres typés et valeurs par défaut, `{ for, as, item }`, expansion à la compilation, erreurs qui nomment l'assemblage et l'usage.
- **Composants de projet** (`components/<nom>/`) : manifeste au format du catalogue, **gabarit neutre** `template.html` compilé vers PHP (`{{ }}` échappé, `if/for/set`, fonctions d'affichage, variables vérifiées contre le manifeste, erreurs avec ligne), styles et module propres, PHP interdit. `sitec component new`.
- **Effets déclarés** : `effects.form` (store, fields, notify, success) → `{% form %}`, `{{ field('x') }}`, validation, CSRF, pot de miel, enregistrement, e-mail, onglet « Formulaires » du back-office avec CSV, collections d'exploitation créées à la demande.
- Sept composants natifs réécrits dans le gabarit neutre (features, stats, steps, cta, timeline, testimonials, faq), rendu identique.
- CLI : `catalog [dossier]`, `explain <nom> [dossier]`, `explain langage`, `component new` ; `check` renvoie la version du langage et le compte des collections et composants.
- **Correctif** : le catalogue produits compilé vivait dans `data/`, exclu du manifeste et du déploiement : une première mise en ligne d'une boutique partait sans produits. Les données compilées sont désormais sous `lib/data/`.
- Exemple plomberie-martin : constantes, collection `realisations` (liste, pages, filtres), composé `offre`, composant de projet `devis-express` avec formulaire déclaré.

## v0.1.3 — 2026-11-08

- **E-mails fiables** : une seule aide `sl_mail()` pour le formulaire de contact et les commandes : expéditeur `no-reply@<domaine du site>` (ou `MAIL_FROM` dans `.env`) avec le nom du site, `Reply-To` sur le visiteur ou le marchand, sujet encodé RFC 2047 s'il contient des accents, en-têtes MIME et UTF-8 explicites, aucun retour à la ligne injectable. Auparavant les messages partaient sans `From` (souvent rejetés ou classés indésirables) et avec un sujet brut.
- Statut d'envoi (`mail: sent | failed | none`) enregistré sur chaque message et chaque commande, colonne « E-mail » dans le back-office ; un échec d'envoi n'empêche jamais l'enregistrement.
- Banc Apache : un puits de courrier remplace sendmail dans le conteneur et vérifie les e-mails réellement produits par PHP (destinataire, réponse, expéditeur, MIME, accents, sujets ASCII, e-mails marchand et client d'une commande).
- Intégration continue : actions GitHub `checkout` et `setup-node` en v5.

## v0.1.2 — 2026-11-08

- **Correctif hôte multi-sites** : sous Apache, les assets d'un site de `sitec host` n'étaient pas servis (la condition `[OR]` du `.htaccess` liait le domaine à la mauvaise règle) ; `php -S` ne le montrait pas. Les sites compilés par `sitec host` doivent être recompilés et redéployés.
- **`.htaccess` plus complet** : `.env`, `.release-*` et `manifest.sha256.json` interdits ; types MIME `webp` et `webmanifest`, jeu de caractères UTF-8, compression du texte ; `assets/.htaccess` avec cache navigateur (un an pour CSS et JS versionnés, une semaine pour les images).
- **Banc Apache** (`scripts/verify-apache.mjs`) : le site compilé tourne dans l'image officielle `php:8.3-apache` avec `AllowOverride All` ; cache statique servi sans PHP puis par PHP dès qu'un cookie existe, dossiers interdits, routes réécrites, en-têtes, back-office, déploiement signé, puis les bancs site et boutique rejoués contre Apache ; mode `--host domaine` pour l'hôte multi-sites. Lancé à chaque push par l'intégration continue.
- Bancs : un argument `http://…` à la place du port vise un serveur déjà lancé ; le banc boutique conserve un `.env` existant.

## v0.1.1 — 2026-11-08

- **Images optimisées à la compilation** : chaque JPEG, PNG ou WebP de `assets/` est décliné en variantes WebP redimensionnées (480, 960, 1600 px par défaut, jamais agrandies) ; les composants émettent `width`, `height`, `srcset`, `sizes` et `loading="lazy"` (image principale d'une fiche produit en `fetchpriority="high"`). Réglage `site.images: { enabled, widths, quality }`. Redimensionnement par `sharp` sous Node (dépendance optionnelle : sans elle, dimensions déclarées mais pas de variantes) et par canvas dans l'atelier navigateur. Dimensions lues dans les en-têtes sans dépendance ; orientation EXIF respectée.
- **Cible nommée** : `sitec build … --target php` ; émetteur PHP sous `src/emit/php/`, dispatcher `src/emit/index.js`, contrat des émetteurs dans `docs/CIBLES.md`.
- **Intégration continue du compilateur** (`.github/workflows/ci.yml`) : exemples, syntaxe PHP, bancs boutique et site, `sitec init`, compilation dans l'atelier. Les sorties d'une étape en échec remontent en annotations lisibles sans jeton.
- Correctifs : parcours de projet sans suivre les liens symboliques ni `node_modules` (boucle avec `npx sitec check` dans un dépôt de site) ; `isSymbolicLink` dans le système de fichiers en mémoire de l'atelier ; bancs indépendants du stockage (SQLite ou JSONL) ; fin de processus propre après `sitec deploy`.

## v0.1.0 — 2026-11-08

Première étiquette : DSL, compilateur `sitec` (check, build, catalog, explain, review, keywords, init, deploy, host), 22 composants, couche d'exploitation (back-office `/_admin`, stockage SQLite ou JSONL, statique d'abord, fragments, hors ligne, intégrité, déploiement signé, multi-sites), atelier navigateur et atelier servi par le site.
