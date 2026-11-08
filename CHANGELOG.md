# Journal des versions

Les dépôts de sites créés par `sitec init` épinglent une étiquette (`github:dtdagames/devanture#v0.1.1`). Pour qu'un site profite d'une version, changer l'étiquette dans son `package.json` puis `npm install`.

## v0.1.1 — 2026-11-08

- **Images optimisées à la compilation** : chaque JPEG, PNG ou WebP de `assets/` est décliné en variantes WebP redimensionnées (480, 960, 1600 px par défaut, jamais agrandies) ; les composants émettent `width`, `height`, `srcset`, `sizes` et `loading="lazy"` (image principale d'une fiche produit en `fetchpriority="high"`). Réglage `site.images: { enabled, widths, quality }`. Redimensionnement par `sharp` sous Node (dépendance optionnelle : sans elle, dimensions déclarées mais pas de variantes) et par canvas dans l'atelier navigateur. Dimensions lues dans les en-têtes sans dépendance ; orientation EXIF respectée.
- **Cible nommée** : `sitec build … --target php` ; émetteur PHP sous `src/emit/php/`, dispatcher `src/emit/index.js`, contrat des émetteurs dans `docs/CIBLES.md`.
- **Intégration continue du compilateur** (`.github/workflows/ci.yml`) : exemples, syntaxe PHP, bancs boutique et site, `sitec init`, compilation dans l'atelier. Les sorties d'une étape en échec remontent en annotations lisibles sans jeton.
- Correctifs : parcours de projet sans suivre les liens symboliques ni `node_modules` (boucle avec `npx sitec check` dans un dépôt de site) ; `isSymbolicLink` dans le système de fichiers en mémoire de l'atelier ; bancs indépendants du stockage (SQLite ou JSONL) ; fin de processus propre après `sitec deploy`.

## v0.1.0 — 2026-11-08

Première étiquette : DSL, compilateur `sitec` (check, build, catalog, explain, review, keywords, init, deploy, host), 22 composants, couche d'exploitation (back-office `/_admin`, stockage SQLite ou JSONL, statique d'abord, fragments, hors ligne, intégrité, déploiement signé, multi-sites), atelier navigateur et atelier servi par le site.
