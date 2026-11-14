# Devanture

[![Compilateur](https://github.com/dtdagames/devanture/actions/workflows/ci.yml/badge.svg)](https://github.com/dtdagames/devanture/actions/workflows/ci.yml)

Un langage déclaratif pour écrire des sites vitrines et de petites boutiques, et un compilateur, `sitec`, qui en produit un site complet pour une cible d'hébergement bon marché : aujourd'hui PHP + JS + CSS sans framework, déployable sur n'importe quel hébergement mutualisé. Un site s'écrit en documents, du texte que le compilateur lit sans modèle (`site.md`, `pages/<id>.md`) ; l'écriture d'origine, en YAML strict, reste lue partout. Conçu pour être écrit par un modèle de langage autant que par un humain : peu de tokens, un vérificateur qui explique ses erreurs à la ligne, aucun code à écrire.

Le langage ne contient rien de PHP ; PHP est la première cible parce qu'il est présent partout sans rien installer. Les bancs de vérification testent les sites produits par HTTP et valideraient une autre cible : ce qu'un émetteur doit fournir est décrit dans [docs/CIBLES.md](docs/CIBLES.md).

> Prototype v0 (novembre 2026). Les mesures, les choix et les limites sont documentés dans [docs/rapports](docs/rapports/).

## Installer

```
git clone https://github.com/dtdagames/devanture.git
cd devanture
npm install
node bin/sitec.js help
```

Node 20 ou plus. PHP n'est nécessaire que pour servir un site compilé (`php -S localhost:8080 -t dist dist/index.php`).

## En deux minutes

```
node bin/sitec.js init mon-site --name "Plomberie Martin"   # un dépôt de site écrit en documents, sans PHP
cd mon-site && npm install
npx sitec check . --accepter   # relit les documents modifiés, fige leur lecture, valide ; erreurs en JSON, une par ligne
npx sitec build . --draft      # dist/ : PHP + JS + CSS
```

Le mode d'emploi du langage, écrit pour un auteur humain ou modèle : [CLAUDE.md](CLAUDE.md). Le catalogue des composants : `node bin/sitec.js catalog`, le détail d'un composant : `node bin/sitec.js explain hero`.

## Ce que produit le compilateur

- Un site PHP sans framework ni extension optionnelle, un routeur, des pages, des composants, un CSS à jetons et un JS vanille.
- Des composants écrits en français contrôlé, sans HTML, CSS, JavaScript ni PHP : un seul fichier à quatre blocs (`composant.md`, un plan en puces ; ou `manifest.yaml`, l'ancienne écriture), `données` (ce qu'il accepte), `forme` (sa structure en primitives), `apparence` (son allure en intentions liées au thème), `fonctionnement` (formulaire enregistré et notifié), compilé vers le HTML, la CSS et le PHP. 63 % de tokens en moins à écrire que gabarit + feuille + schéma (`scripts/measure-format.mjs`). Chaque erreur renvoie à une ligne du plan, et `sitec component show <dossier> <nom>` affiche chaque bloc à côté de ce qu'il produit (schéma, effets, gabarit, feuille, PHP avec `--php`).
- Un prototype de composant écrit comme un document : `components/<nom>/document.md`, en phrases (« Il y a 8 places par séance, comptées par personnes. »), lu par le compilateur sans modèle de langage. Trois garde-fous : une phrase dont un mot reste sans rôle est refusée, une phrase à deux lectures aussi, et la lecture est figée dans `lecture.yaml` (tout changement arrête la compilation jusqu'à `sitec lire <dossier> --accepter`). Pour un texte libre, `sitec lire <dossier> --recrire` fait proposer par un modèle une réécriture des phrases refusées : le lecteur la relit et reste seul juge, et la lecture reste à accepter. Domaine étroit (une section à formulaire avec registre) et tolérance mesurée, limitée : voir `docs/LANGAGE.md`, section 6 quinquies. Exemple : `examples/le-fournil/components/atelier`.
- Un habillage écrit dans le même langage : l'en-tête et le pied de page sont deux composants du catalogue (`site.header`, `site.footer`) qu'un site remplace par les siens (`sitec explain habillage`), et la charte du site règle l'échelle par jetons, ses polices (fichiers de `assets/`) et un fond de page.
- Un site écrit comme des documents : `site.md` et `pages/<id>.md`, du texte lu sans modèle d'après les données que chaque composant déclare (« ## Bandeau : Titre », un paragraphe, « Image : hero.jpg », « Découvrir → /boutique », des puces « - valeur | valeur »). Les données, les segments, les composants composés, le vocabulaire, les cas de test, un paquet et un hôte s'écrivent de la même façon (`data/products.md`, `segments.md`, `components.md`, `vocabulaire.md`, `fixtures/<cas>.md`, `package.md`, `hosts.md`). Une ligne sans rôle est refusée à sa ligne, et la lecture de chaque document est figée dans `lecture/` : `sitec check <dossier> --accepter` relit, fige en disant ce qui change, puis vérifie. `sitec rediger` récrit en documents ce qui est encore en YAML, chaque document étant relu et tenu de rendre les mêmes données. Les exemples du dépôt sont écrits ainsi, sans aucun fichier YAML d'auteur (`node scripts/inventaire-yaml.mjs`). Mesuré : environ 20 % de tokens en moins à écrire pour le même site et pour les mêmes éditions (`scripts/measure-site-document.mjs`). Pour un agent, en revanche, aucun gain n'est démontré : après correction de deux causes de tours supplémentaires, sa dépense est au niveau du YAML, à trois essais par case ([mesure](docs/rapports/RAPPORT-MESURE-AGENTS-2.html), [après correction](docs/rapports/RAPPORT-MESURE-AGENTS-3.html)).
- Un vocabulaire ouvert : quand il manque un élément aux primitives de la forme, un site, un paquet ou le catalogue définit un mot dans `vocabulaire.md` (ou `vocabulaire.yaml` ; une description, ses données, puis une forme faite de primitives et d'autres mots, ou un fragment de gabarit neutre avec sa feuille encadrée). Le mot s'emploie ensuite comme une primitive (`- carte de visite: name, job`), sans toucher au compilateur ; `sitec explain "<mot>" <dossier>` montre sa définition. Les composants natifs sont écrits ainsi, sans aucun gabarit HTML ni PHP ; les mots natifs portent le balisage que les primitives n'écrivent pas.
- Des composants qui lisent un état à la visite, sans PHP : `fonctionnement: lit:` déclare ce que le composant demande à la cible (« produits: produits de la boutique, catégorie category, limite limit », panier du visiteur, commande de la page, horaires du moment, consultations récentes), la forme le lit comme une donnée typée, et des mots natifs posent les actions (« ajout au panier »). Toute la boutique, les horaires et le formulaire de contact du catalogue sont écrits ainsi, et un composant de site dispose des mêmes sources (exemple : `examples/savonnerie/components/selection`). Un cas de test fournit ce qui serait lu : « À la visite : », puis une section par lecture.
- Un état déclaré : le registre d'un formulaire peut porter des règles que le serveur applique à l'enregistrement, sous verrou, « places: 12 par seance, comptées par personnes », « liste d'attente: … », « une fois par: email, seance ». La source « état du registre » relit les places restantes, et le back-office annule un envoi, le rétablit ou donne la place à un envoi en attente. Exemple : `examples/le-fournil/components/atelier`, vérifié par douze inscriptions simultanées pour six places, sous php -S et sous Apache. Reste hors du langage : un état qui demande plus que compter, grouper et dédoublonner les envois d'un formulaire (date limite, paiement, règle entre deux registres) : il relève du compilateur, pas du site. Le bloc `custom`, ancienne porte de sortie en PHP, a été retiré.
- Des composants décrits en langage naturel : `sitec component new <dossier> <nom> --describe "…" --export p.json` écrit la consigne à soumettre à un modèle, `--import r.json` écrit sa réponse (un plan, `composant.md`, et des cas de test en documents) et la vérifie (cas de test rendus, erreurs à la ligne du plan) ; `component edit --ask "…"` les fait évoluer, `component preview` en montre tous les cas avec le thème du site.
- Un langage, pas seulement un catalogue : expressions `{{ const.delai }}`, constantes, collections génériques avec page par élément et liste, composants composés (`components.md`, ou `components.yaml`) et composants de projet avec gabarit neutre, design propre et effets déclarés (formulaire enregistré et notifié) sans une ligne de PHP. Spécification : [docs/LANGAGE.md](docs/LANGAGE.md).
- Images optimisées à la compilation : variantes WebP redimensionnées, `srcset`, dimensions déclarées, chargement différé (sharp sous Node, canvas dans l'atelier).
- Formulaires avec champs libres et conditionnels, navigation par intention (recherche qui répond), personnalisation par segments avec mesure de chaque variante contre un groupe témoin (objectifs et expériences déclarés dans `segments.md` ou `segments.yaml`, verdict dans le back-office), boutique (catalogue, panier, commande, stock, Stripe), version texte de chaque page, jumeau pour agents (`/site.json`, `/llms.txt`, JSON-LD, API).
- Une couche d'exploitation : back-office compilé (`/_admin`), stockage SQLite ou fichiers, cache statique servi sans PHP, fragments personnalisés, hors-ligne, intégrité par empreintes, déploiement signé (`/_deploy`), plusieurs sites par hébergement (`sitec host`).
- Un atelier dans le navigateur ([studio/](studio/), `npm run build:studio`) qui fait tourner le même compilateur : éditer, vérifier, compiler, déployer. Un site peut l'embarquer sur `/_studio`.

## Commandes

| Commande | Rôle |
|---|---|
| `check <dossier> [--accepter]` | Valide, erreurs JSON, code 1 si erreurs ; `--accepter` relit d'abord les documents modifiés et fige leur lecture, en disant ce qui change |
| `build <dossier> [--draft] [--target php]` | Compile dans `dist/` pour la cible (PHP, seule cible à ce jour) ; refusé tant qu'il reste des `[à compléter]` sauf `--draft` |
| `catalog`, `explain <composant>`, `explain site`, `explain langage` | Documentation du langage, tirée du compilateur |
| `component new <dossier> <nom> [--describe "…"]` | Squelette d'un composant de projet, ou composant écrit par un modèle depuis une description, vérifié et réparé |
| `component edit <dossier> <nom> --ask "…"` | Modification d'un composant par une demande en langage naturel |
| `component preview <dossier> <nom>` | Page d'aperçu de tous les cas de test avec le thème du site |
| `component show <dossier> <nom> [--php]` | Chaque bloc du composant à côté de ce qu'il produit |
| `lire <dossier> [composant] [--accepter]`, `lire --tournures` | Composants écrits en `document.md` (prototype) : ce que le compilateur comprend de chaque phrase ; `--accepter` fige cette lecture dans `lecture.yaml` |
| `lire <dossier> [--accepter] [--tout]` | Site écrit en documents (`site.md`, `pages/<id>.md`, données, segments, composés) : ce qui est refusé, ce que vaut un document nouveau, ce qui a changé dans les autres ; `--accepter` fige la lecture dans `lecture/` |
| `rediger <dossier> [--composants] [--dry-run]`, `rediger --catalogue` | Récrit en documents ce qui est encore en YAML, dans un site, un paquet ou un hôte (pages, données, segments, composants, composés, vocabulaire, cas de test) ; chaque document est relu et doit rendre les données de son YAML |
| `lire <dossier> [composant] --recrire [--dry-run] --export p.json`, puis `--import r.json` | Consigne pour faire récrire par un modèle les phrases refusées d'un `document.md` ; deux contrôles sans modèle puis le lecteur jugent chaque réécriture, la lecture reste à accepter |
| `test <dossier> [--update]` | Rend les cas de test des composants et les compare à leurs instantanés |
| `schema <dossier>` | Schémas JSON du site pour l'éditeur (complétion, erreurs à la frappe) |
| `migrate <dossier> [--dry-run]` | Passage à la dernière version du langage (site en YAML ou en documents) |
| `review <dossier>` | Relecture éditoriale contre `brief.md` |
| `keywords <dossier> --export f.json`, puis `--import r.json` | Mots-clés de recherche proposés par un modèle (consigne exportée, réponse importée), figés dans la source du site (YAML ou documents) |
| `init <dossier> [--yaml]` | Dépôt de site sans PHP, écrit en documents (`--yaml` : en YAML), avec intégration continue |
| `deploy <dossier> --to https://…` | Déploiement signé vers `/_deploy` |
| `host <dossier-hôte>` | Plusieurs sites, un hébergement, routage par domaine |
| `help` | Toutes les commandes et leurs options |

## Structure du dépôt

```
bin/            sitec
src/            compilateur : chargement, validation (ajv), lecture figée des documents (reading.js), revue, mots-clés, hôte, init
src/emit/php/   émetteur de la cible PHP (PHP, JS, CSS, back-office, déploiement) ; src/emit/index.js choisit la cible
src/lang/       le langage : expressions (expr.js, évaluateur JS et traduction PHP), interpolation (resolve.js), gabarit neutre (template.js),
                composants en français contrôlé (donnees.js, forme.js, apparence.js, fonctionnement.js), lectures à la visite (sources.js), mots du vocabulaire (vocabulaire.js), comportements (behaviors.js), règles CSS (css-lint.js),
                documents (site-document.js : site, pages, données, segments, cas de test ; outline.js : plans de composants et vocabulaire ; composites-document.js : composés ; document.js : composant écrit en phrases)
src/segments.js segments, objectifs et expériences (segments.md ou segments.yaml)
src/collections.js  collections génériques ; src/composition.js  composants composés (components.yaml, ou components.md lu par src/lang/composites-document.js)
src/images/     pipeline d'images : dimensions, variantes WebP (sharp sous Node, canvas dans l'atelier), manifeste
src/studio/     remplaçants Node pour l'atelier navigateur (fichiers en mémoire, chemins, sha256, canvas)
components/     un dossier par composant natif : composant.md (format langage, écrit en plan) et styles.css, aucun fichier PHP ni YAML ; vocabulaire.md : les mots natifs
studio/         atelier navigateur (index.html, app.js ; sitec-browser.js est produit par npm run build:studio)
examples/       sites de démonstration (plomberie, boutique savonnerie, cabinet, fournil, hôte multi-sites) et paquets/vitrine (paquet de composants partagé), écrits en documents
scripts/        bancs de vérification (sites produits, outillage, expériences, documentation) et scripts de mesure ; reference/exemples-yaml/ : les mêmes exemples dans leur écriture YAML d'origine, pour les bancs
docs/LANGAGE.md spécification du langage (version 1 : expressions, collections, segments et expériences, composants composés et de projet, effets)
docs/CIBLES.md  contrat que tout émetteur doit respecter (routes, formulaires, boutique, exploitation)
docs/rapports/  proposition initiale et rapports de test (création, baseline, maintenance, Haiku, variance, exploitation, site en documents, mesures avec des agents)
baseline/ maintenance/ variance/ haiku/   corpus des mesures : mêmes sites écrits à la main en PHP, pour comparaison
mesure-document/ mesure-document-2/ mesure-document-3/   sites laissés par les agents des mesures « YAML ou documents », avec leurs consignes et leurs relevés
```

## Vérifier

```
node bin/sitec.js build examples/savonnerie
node scripts/verify-shop.mjs examples/savonnerie/dist 8970        # parcours d'achat, stock, webhook
node scripts/verify-php-site.mjs examples/savonnerie/dist 8971    # routes, SEO, formulaires, sécurité
node scripts/verify-lang.mjs examples/plomberie-martin/dist 8973  # langage : expressions JS = PHP, gabarits, collections, composition, composant de projet
node scripts/verify-lang-tools.mjs                                # paquets de composants, vocabulaire, lectures à la visite, sitec test, sitec migrate, schémas de l'éditeur
node scripts/verify-experiments.mjs examples/plomberie-martin/dist 8974   # expériences : tirage, exposition, objectif, verdicts, avec des visiteurs simulés
node scripts/verify-registre.mjs examples/le-fournil/dist 8975    # registres à règles : places, unicité, liste d'attente, back-office, envois simultanés
node scripts/verify-document.mjs                                  # composant écrit en phrases (prototype) : même site qu'avec le manifeste, lecture figée, tolérance, refus, réécriture jugée par le lecteur
node scripts/compare-visuel.mjs <origine> <recréation>             # écart visuel entre un site d'origine et sa recréation : captures aux mêmes largeurs (Chrome), écart du premier écran, palette, hauteurs
node scripts/verify-site-document.mjs                             # site écrit en documents : même site que sa référence YAML, règles de lecture, refus, lecture figée, rediger, composés, cas de test, init, check --accepter
node scripts/inventaire-yaml.mjs                                  # ce qu'un auteur écrit encore en YAML ou en PHP dans les exemples et le catalogue
node scripts/ci-studio.mjs                                        # après npm run build:studio : le compilateur empaqueté pour le navigateur compile les exemples et accepte une lecture
node scripts/measure-site-document.mjs                            # tokens à écrire, YAML contre documents : création et éditions
node scripts/verify-docs.mjs                                      # documentation : exemples compilés, commandes, options et listes comparées au compilateur
node bin/sitec.js test examples/plomberie-martin --catalog        # rend les cas et exemples de tous les composants à gabarit
node scripts/verify-apache.mjs examples/savonnerie/dist 8085      # même site sous un vrai Apache (Docker, php:8.3-apache) : cache statique, .htaccess, déploiement
node scripts/verify-apache.mjs examples/hote/dist 8087 --host savonnerie-du-port.fr   # hôte multi-sites, un domaine à la fois
node scripts/linux-simultane.mjs examples/le-fournil/dist 8097 --fois 3   # le banc des registres contre six processus PHP sous Linux (Docker) : écritures réellement simultanées
```

Les bancs démarrent eux-mêmes un serveur PHP de développement ; indiquer le chemin de `php` dans `PHP_BIN` s'il n'est pas dans le `PATH`.

Sous Windows, ce serveur de développement n'a qu'un processus : des envois simultanés y passent l'un après l'autre, et un défaut d'écritures concurrentes y reste invisible. `scripts/linux-simultane.mjs` sert le site compilé dans un conteneur Linux par plusieurs processus PHP (stockage SQLite) et lance un banc contre lui ; c'est ce que fait l'intégration continue, reproduit sur le poste. À lancer avant de pousser tout changement qui touche au stockage, aux formulaires ou aux registres.

## Publier une version

Une étiquette publiée ne se déplace pas : les dépôts de sites l'épinglent. Elle se pose donc en dernier, quand l'intégration continue a dit oui.

1. Travailler sur une branche, pousser, ouvrir une pull request : le flux « Compilateur » tourne sur la PR (exemples compilés, bancs HTTP, Apache).
2. Dans la PR, monter la version partout où elle est écrite (`package.json`, `package-lock.json`, `src/init.js`, `CLAUDE.md`, `CHANGELOG.md` avec son entrée) ; `scripts/verify-docs.mjs` refuse un écart.
3. Fusionner la PR une fois le flux vert. Il tourne de nouveau sur `main`.
4. Depuis `main` à jour : `node scripts/release.mjs --attendre`. Le script vérifie l'état du dépôt, la version, l'absence de l'étiquette et le succès de l'intégration continue sur ce commit précis, puis pose et pousse l'étiquette. `--dry-run` fait les contrôles sans rien écrire. S'il refuse, il dit quel contrôle et pourquoi.

Une version dont l'intégration continue échoue n'a donc jamais d'étiquette : on corrige sur une branche et on recommence. La v0.12.0, étiquetée avant ce garde-fou, est restée publiée avec un défaut que seul Linux montrait ; la v0.12.1 la remplace.

Les variantes WebP des images demandent `sharp` (dépendance optionnelle, installée avec `npm install` quand un binaire existe pour la plateforme) ; sans lui, le compilateur déclare les dimensions et sert les originaux. Historique des versions : [CHANGELOG.md](CHANGELOG.md).

## État et limites

Ce que les mesures montrent : le langage réduit surtout le coût de maintenance, l'écart avec le PHP à la main grandit quand le modèle rétrécit, et la valeur tient à l'oracle de vérification et à l'homogénéité des sites, pas à la correction d'erreurs. Les règles Apache (`.htaccess` généré : cache statique servi sans PHP, dossiers interdits, types MIME, compression, cache navigateur) sont vérifiées à chaque push dans l'image officielle `php:8.3-apache`, site seul et hôte multi-sites. La documentation écrite à la main (ce fichier, `CLAUDE.md`, `docs/LANGAGE.md`, les fiches `explain`) est vérifiée contre le compilateur à chaque push : ses exemples sont compilés, ses commandes, options, chemins et listes de mots comparés à ce que le compilateur accepte ; les phrases qui décrivent un comportement sans le montrer par un exemple restent hors de portée de ce banc. Écrire en documents raccourcit la source d'un site d'environ 20 % ; cela ne réduit pas, à ce jour, la dépense d'un agent, qui est au niveau du YAML (trois essais par case, un brief, un modèle : la mesure reste étroite). Le compilateur n'appelle aucun modèle : `keywords`, `review` et le générateur de composants écrivent une consigne et appliquent une réponse. Non testé à ce jour : les expériences sur du trafic réel (le banc simule des visiteurs), un hébergeur mutualisé réel (variantes d'Apache, `AllowOverride` restreint), création réelle de sessions Stripe. Détail dans [docs/rapports/RAPPORT-EXPLOITATION.html](docs/rapports/RAPPORT-EXPLOITATION.html), [RAPPORT-VARIANCE.html](docs/rapports/RAPPORT-VARIANCE.html) et [RAPPORT-MESURE-AGENTS-3.html](docs/rapports/RAPPORT-MESURE-AGENTS-3.html).

## Licence

MIT, voir [LICENSE](LICENSE). Les sites produits par le compilateur (le contenu de `dist/`, y compris le PHP, le JS et le CSS copiés depuis `components/` et `src/emit/`) appartiennent entièrement à qui les a compilés, sans autre condition : un client reçoit un site libre de droits.
