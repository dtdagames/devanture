# Journal des versions

Les dépôts de sites créés par `sitec init` épinglent une étiquette (`github:dtdagames/devanture#v0.1.3`). Pour qu'un site profite d'une version, changer l'étiquette dans son `package.json` puis `npm install`.

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
