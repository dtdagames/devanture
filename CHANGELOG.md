# Journal des versions

Les dépôts de sites créés par `sitec init` épinglent une étiquette (`github:dtdagames/devanture#v0.8.0`). Pour qu'un site profite d'une version, changer l'étiquette dans son `package.json` puis `npm install`.

## v0.8.0 — 2026-11-09 — le fonctionnement en français, et le lien visible entre le manifeste et le code

- **Fonctionnement** : quatrième bloc du manifeste. « formulaire: » avec « enregistre dans », « prévient par e-mail », « destinataire », « confirmation », puis « champs: », un par ligne : « type_travaux: choix, un parmi Fuite, Autre — Type de travaux », « precision: texte, si type_travaux vaut Autre — Précisez », « details: texte long, facultatif — Précisions (ex. étage, accès) ». Compilé vers les effets déclarés (validation, CSRF, pot de miel, registre, e-mail) ; `effects` reste le format machine du format html. La forme place le formulaire par « - formulaire, bouton Envoyer » (tous les champs) ou champ par champ.
- **Comportements dans la forme** : « filtres de items, selon category » (grille filtrée par boutons), « image, agrandissable », « repli, libellé « En savoir plus » », « copier, libellé « Copier le numéro » », et « portrait: photo, nom » (photo ronde ou initiale). La primitive pose les attributs et déclare le comportement : plus de `behaviors` à écrire.
- **Erreurs à la ligne du manifeste** : toute erreur d'un composant au format langage porte `"file":"components/x/manifest.yaml","path":"ligne N"`, y compris celles du gabarit produit (formulaire déclaré mais non affiché, champ inconnu), avec suggestion du mot proche.
- **`sitec component show <dossier> <nom>`** : chaque bloc du manifeste (avec ses lignes) à côté de ce que le compilateur en tire : schéma des props, effets, gabarit neutre, comportements, parties visables, feuilles ; `--php` pour le PHP exécuté, `--json` pour un outil.
- Natif `team` réécrit dans le langage (props identiques à la v0.7.0 ; le rendu change : portrait rond ou initiale). Exemples : `devis-express` (plomberie) passe à `fonctionnement`, nouveau composant `comptoir` (fournil) avec filtres, agrandissement, repli et copie.
- Générateur, squelette de `component new`, schémas d'éditeur et `explain langage` enseignent les quatre blocs.
- Restent au format html ou PHP dans le catalogue natif : hero, gallery, richtext, pricelist, hours, map, contact.form, collection.list, recent et les composants de boutique.
- Bancs : 81 contrôles d'outillage.

## v0.7.0 — 2026-11-09 — des composants sans HTML ni CSS

- **Données** : « title: texte, facultatif — description », « items (liste, au moins 1): » ; compilées vers le schéma JSON des props. Preuve : les sept composants natifs réécrits ainsi donnent des schémas identiques à leur version précédente (`scripts/compare-props.mjs v0.6.0 …`).
- **Forme** : une trentaine de primitives françaises au balisage fixe (en-tête, titre, texte, carte, témoignage, étoiles, signature, grille, liste numérotée, défilement, onglets, accordéon, formulaire…), compilées vers le gabarit neutre ; données facultatives rendues conditionnelles automatiquement ; textes littéraux avec données et balisage léger ; expressions aux noms courts. Preuve : sept natifs réécrits (features, stats, steps, testimonials, faq, timeline, cta) sans gabarit HTML, 36 pages des quatre exemples identiques au caractère près à la v0.6.0.
- **Apparence** : intentions par partie (compactes, coins arrondis, fond surface, couleur d'accent, deux colonnes, masqués, « sur téléphone »…) traduites vers les jetons du thème ; aucune valeur libre. Les primitives à comportement (défilement, onglets) portent leur mise en page de base.
- Trois composants de projet réécrits au nouveau format (carrousel d'avis, onglets du paquet, demande de devis avec formulaire), vérifiés au navigateur ; l'encart du paquet reste au format html, porte de sortie.
- **Générateur** : écrit le format langage par défaut (`--format html` pour l'ancien) ; guide construit depuis les vocabulaires du compilateur. `scripts/measure-gen.mjs` mesure tours de réparation et tokens dans les deux formats (clé d'API requise, non exécuté ici).
- **Mesure** (`scripts/measure-format.mjs`) : ce qu'un auteur écrit passe de 3 696 à 1 399 tokens (−62 %) sur dix composants.
- Éditeur : schémas des manifestes étendus aux trois blocs ; banc de rendu muni des champs de formulaire déclarés (aperçus et instantanés montrent le vrai formulaire).

## v0.6.0 — 2026-11-09 — faire évoluer et relire un composant

- **`sitec component edit <dossier> <nom> --ask "…"`** : modification d'un composant existant par une demande en langage naturel (fichiers actuels + demande envoyés au modèle, même vérification et réparation), historique des demandes dans `description.md`, version précédente restaurée si aucun tour ne passe. Export/import sans clé comme pour `new`.
- **`sitec component preview`** : page autonome `.devanture/preview/<nom>.html` avec tous les cas de test rendus, la feuille du site, ses comportements, les trois thèmes et une largeur de téléphone ; produite automatiquement après `new` et `edit`.
- **`--package chemin`** : générer, modifier ou prévisualiser un composant d'un paquet (nom court dans le manifeste, nom préfixé dans les pages).
- Carrousel : le pas de défilement compte l'espace entre les cartes (une carte n'est plus coupée après le défilement automatique). Le chargement ignore les dossiers cachés de `components/`.
- Bancs : 56 contrôles d'outillage.

## v0.5.0 — 2026-11-08 — composants décrits en langage naturel

- **CSS encadré** des composants de projet et de paquet : sélecteurs préfixés du nom du composant, ni global ni externe (`E_CSS`) ; couleurs, polices et `!important` signalés (`W_CSS`). Nouveaux jetons `color.success`, `color.warning`, `color.danger` dans les trois thèmes ; les erreurs de formulaire utilisent `danger`.
- **Comportements déclarés** : `behaviors: [toggle, tabs, carousel, lightbox, filter, copy]`, posés par des attributs `data-sl-…`, code navigateur fourni par le compilateur (ARIA, clavier, mouvement réduit) et inclus seulement s'il sert. Attributs sans déclaration refusés (`E_BEHAVIOR`), `module.js` libre signalé (`W_MODULE_JS`). Exemple : `vitrine.onglets` sur la page des honoraires du cabinet.
- **Gabarit** : `<script>`, attributs `on…=`, `javascript:`, `<iframe>`, `<object>`, `<embed>`, `<link>`, `<meta>`, `<base>` refusés.
- **`sitec component new <dossier> <nom> --describe "…"`** : Claude Opus 5.5 écrit le composant en formats neutres (sortie structurée, effort élevé, repli serveur automatique en cas de refus), le compilateur le vérifie (check, CSS, comportements, cas de test rendus) et renvoie erreurs et avertissements jusqu'à trois tours. La description reste dans `description.md`. Sans clé : `--export` / `--import`, avec prompt de réparation. Exemple : `avis-defilants` (carrousel d'avis) sur l'accueil du fournil, produit par ce chemin en deux tours.
- Bancs : 48 contrôles d'outillage (dont la boucle de réparation avec un modèle simulé), CSS de devis et d'encart mis en conformité.

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
