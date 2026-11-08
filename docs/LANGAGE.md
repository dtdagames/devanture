# Devanture, langage version 1

Ce document est la spécification du langage lu par le compilateur `sitec`. Il décrit ce qu'un site peut écrire, ce que le vérificateur garantit, et ce qui est laissé à la cible. Le compilateur et le langage ont des versions distinctes : un site déclare `language: 1` dans `site.yaml` (défaut 1) ; un compilateur refuse une version qu'il ne connaît pas (`E_LANGUAGE`) plutôt que de la deviner. Une nouvelle version du langage n'arrive qu'avec une commande de migration et une entrée dans `CHANGELOG.md`.

## 1. Modèle

Un site est un ensemble de documents YAML : `site.yaml` (identité, réglages, constantes, collections), `pages/<id>.page.yaml` (une page par fichier), `data/<nom>.yaml` (éléments des collections, produits), `components.yaml` (composants composés), `components/<nom>/` (composants de projet), `segments.yaml` (personnalisation), `brief.md` (source de vérité éditoriale).

Le langage est **déclaratif et sans effet** : il décrit des pages faites de sections, des données, des composants et des effets nommés (enregistrer, notifier, mesurer). Il n'a ni boucle libre, ni affectation, ni appel arbitraire. Tout ce qui peut être calculé à la compilation l'est ; ce qui dépend de la requête (élément d'une collection, produit, commande, formulaire) est traduit vers la cible par le compilateur, jamais écrit par l'auteur.

Trois moyens d'abstraction :

| Moyen | Où | Ce qu'il nomme |
|---|---|---|
| Constantes et expressions | `site.yaml › constants`, `{{ … }}` partout | une valeur |
| Collections | `site.yaml › collections`, `data/<nom>.yaml`, pages `source:` | un type de contenu et ses éléments |
| Composants composés et de projet | `components.yaml`, `components/<nom>/` | un assemblage, ou un composant nouveau avec son gabarit |
| Paquets | `site.yaml › packages`, `package.yaml` | une bibliothèque de composants partagée entre sites, sous un préfixe |

## 2. Expressions

Une expression s'écrit `{{ … }}` dans toute valeur texte (pages, `site.yaml`, données, paramètres de composants, gabarits). Une chaîne réduite à une seule expression garde le type de sa valeur (liste, nombre, objet) ; sinon la valeur est insérée comme texte.

Grammaire (par priorité croissante) : `or` · `and` · `not` · comparaisons `== != < <= > >= in` · `~` (concaténation) · `+ -` · `* / %` · unaire `-` · accès `a.b`, `a[expr]`, filtre `a | f(args)`, appel `f(args)` · littéraux (nombres, `"texte"`, `true`, `false`, `null`, `[a, b]`), parenthèses. Les filtres se lient avant les opérateurs : `(a * 1.2) | money`.

Racines :

| Racine | Disponible | Contenu |
|---|---|---|
| `site` | compilation | le bloc `site` de `site.yaml` |
| `const` | compilation | `constants` de `site.yaml` |
| `page` | compilation | `{ id, route, title }` de la page courante |
| `collections` | compilation | `collections.<nom>` : la liste des éléments |
| `p` | composition et gabarits | paramètres ou props du composant |
| `item` | affichage, page `source: <collection>` | l'élément courant |
| `product`, `order` | affichage, pages `source: products` / `orders` | le produit, la commande |
| `form`, `loop` | gabarits | état du formulaire déclaré, compteur de boucle |

Vérification statique : une racine inconnue, une clé absente sous `site` ou `const` (sauf `| default(x)`), un filtre ou une fonction inconnus, une racine d'affichage hors de sa page sont des erreurs (`E_UNKNOWN_REF`, `E_EXPR`).

Filtres : `upper lower capitalize trim default(x) join(sep) count length first last reverse sort(clé|-clé) map(clé) where(clé, valeur) limit(n) money(devise) price(devise) round(n) int slug truncate(n) split(sep) replace(a, b) date(format) repeat(n)`. `date` accepte `d j m n Y y F` (`F` = mois en lettres). Les valeurs vides, `0`, `false`, `null` et les listes vides sont fausses ; `"0"` est vrai.

Sémantique unique : le même évaluateur sert à la compilation (JavaScript) et à l'exécution (PHP produit par traduction de l'arbre) ; le banc `scripts/verify-lang.mjs` vérifie l'égalité des deux sur un jeu d'expressions.

## 3. Constantes

```yaml
constants:
  delai_depannage: 1 h
  tarif_deplacement: 95 € TTC
```

`{{ const.tarif_deplacement }}` dans n'importe quelle valeur. Les constantes peuvent citer `site` ; `site` peut citer `const`.

## 4. Collections

```yaml
collections:
  realisations:
    label: Réalisations
    fields:
      title: { type: string, required: true }
      image: asset
      date: date
      category: string
      text: text
    sort: -date
    title_field: title
```

Types de champ : `string`, `text` (long, balisage léger), `number`, `boolean`, `date` (`AAAA-MM-JJ`, `AAAA-MM`, `AAAA`), `asset` (fichier de `assets/`), `list`, `link`. Chaque élément a un `id` unique (minuscules, chiffres, tirets). Les éléments vivent dans `data/<nom>.yaml` sous la clé `<nom>` (ou `items`). Un champ inconnu, un type faux, un fichier absent sont des erreurs.

Une page par élément : `route: /realisations/[id]`, `source: realisations` ; ses sections et son `seo` lisent `item.*`. Une liste : composant `collection.list` (`source`, `filter`, `sort`, `limit`, champs d'affichage). À la compilation : `{{ collections.realisations | count }}`, `{{ collections.realisations | where('category', 'cuisine') | map('title') | join(', ') }}`.

Les noms `products`, `orders`, `messages`, `events`, `stock` sont réservés. La boutique (`data/products.yaml`) garde sa sémantique propre (prix, stock, panier).

## 5. Composants composés

```yaml
components:
  offre:
    description: Une offre tarifaire et ses points forts
    params:
      titre: { type: string, required: true }
      prix: { type: string, required: true }
      points: { type: list, default: [] }
      cta: { type: link, default: { label: Nous contacter, to: /contact } }
    sections:
      - pricelist: { title: "{{ p.titre }}", groups: [ { items: [ { name: "{{ p.titre }}", price: "{{ p.prix }}" } ] } ] }
      - features: { items: { for: p.points, as: pt, item: { icon: check, title: "{{ pt }}" } } }
      - cta: { title: "{{ p.titre }} : parlons-en", button: "{{ p.cta }}" }
```

Types de paramètre : `string text number boolean list object link asset`. L'usage `- offre: { titre: …, prix: … }` est remplacé à la compilation par les sections produites, qui sont ensuite validées comme les autres ; une erreur dans une section produite nomme l'assemblage et l'usage. `{ for: liste, as: x, item: gabarit }` construit une liste. L'`id` de l'usage va à la première section produite (les suivantes reçoivent `id-2`, `id-3`), `keywords` à la première ; `variants` est refusé sur un assemblage. La composition est récursive, profondeur limitée.

## 6. Composants de projet

```
components/<nom>/
  manifest.yaml    name, description, props (schéma), example, intents, effects
  template.html    gabarit neutre
  styles.css       design, avec les jetons du thème
  module.js        comportement navigateur (optionnel)
```

Le nom ne peut pas être celui d'un composant natif. Le manifeste a le format du catalogue. `template.php` est interdit : un composant de projet ne contient pas de code de la cible. `sitec component new <dossier> <nom>` crée le squelette.

### Gabarit

| Construction | Sens |
|---|---|
| `{{ expr }}` | sortie échappée ; HTML sûr seulement pour `link`, `img`, `icon`, `paragraphs`, `markup`, `field` en tête d'expression |
| `{% if e %} … {% elif e %} … {% else %} … {% endif %}` | condition |
| `{% for x in e %} … {% endfor %}`, `{% for k, x in e %}` | boucle ; `loop.index`, `loop.index0`, `loop.first`, `loop.last`, `loop.count` |
| `{% set x = e %}` | valeur locale |
| `{% form %} … {% endform %}` | formulaire déclaré par `effects.form` : méthode, nom, jeton, pot de miel |
| `{# … #}` | commentaire |

Variables : `p` (props, vérifiées contre le manifeste), `site`, `page`, `item`, `product`, `order`, `form`, `loop`, `shop`. Fonctions : `link(lien, classe)`, `img(chemin, alt, sizes, eager)`, `img_src(chemin, largeur)`, `asset(chemin)`, `url(cible)`, `icon(nom)`, `paragraphs(texte)`, `markup(texte)`, `lines(texte)` (retours à la ligne conservés), `money(n)`, `field(nom)`.

La vérification refuse, avec le numéro de ligne : PHP ou tout code de cible, variable inconnue, prop absente du manifeste, clé inconnue d'un élément de liste typé, balise déséquilibrée, filtre ou fonction inconnus, `form` sans `effects.form`. Le balisage ne contient pas de code navigateur : `<script>`, attributs `on…=`, liens `javascript:`, `<iframe>`, `<object>`, `<embed>`, `<link>`, `<meta>`, `<base>` sont refusés.

### Feuille de style encadrée

La feuille d'un composant de projet ou de paquet ne touche que ce composant et prend son design au thème :

| Règle | Niveau |
|---|---|
| Chaque sélecteur commence par une classe préfixée du nom du composant (`.avis-defilants`, `.avis-defilants-carte`, `.avis-defilants h3` ; pour `vitrine.encart`, `.encart…` ou `.vitrine-encart…`) | erreur `E_CSS` |
| Pas de sélecteur global (`:root`, `html`, `body`, `*`, élément seul) | erreur |
| Pas de `@import`, `@font-face`, ni de ressource externe (`url(https://…)`, `url(//…)`) ; `@keyframes` préfixés | erreur |
| Couleurs et polices par les jetons du thème (`var(--color-primary)`, `var(--color-success)`, `var(--font-heading)`…) ; pas de `!important` | avertissement `W_CSS` |

Jetons de couleur : `bg`, `surface`, `fg`, `muted`, `primary`, `primary-fg`, `accent`, `border`, `success`, `warning`, `danger`.

### Comportements déclarés

Le côté navigateur d'un composant passe par des comportements fournis par le compilateur, déclarés dans le manifeste et posés par des attributs dans le gabarit. Le code n'est inclus que si un composant utilisé le déclare ; il pose les rôles ARIA, gère le clavier et respecte `prefers-reduced-motion`. Sans JavaScript, le contenu reste lisible.

| Comportement | Attributs |
|---|---|
| `toggle` | bouton `data-sl-toggle="id"` qui montre ou cache l'élément `id` |
| `tabs` | conteneur `data-sl-tabs`, boutons `data-sl-tab="clé"`, panneaux `data-sl-panel="clé"` |
| `carousel` | conteneur `data-sl-carousel` (`data-sl-autoplay="ms"` facultatif), rangée `data-sl-track`, boutons `data-sl-prev` / `data-sl-next` |
| `lightbox` | lien `data-sl-lightbox` vers une image |
| `filter` | barre `data-sl-filters`, boutons `data-sl-filter="valeur"` (`*` pour tout), éléments `data-sl-filter-item="a b"` |
| `copy` | bouton `data-sl-copy="texte"` |

Attributs posés sans déclaration : erreur `E_BEHAVIOR` ; comportement déclaré mais absent du gabarit : avertissement. Un `module.js` reste possible pour un besoin hors de cette liste, avec l'avertissement `W_MODULE_JS` : son code n'est pas vérifié.

### Effets déclarés

```yaml
effects:
  form:
    store: devis                 # collection d'exploitation (back-office › Formulaires, CSV)
    notify: true                 # true : e-mail au contact du site ; adresse ; false
    success: Merci, nous vous rappelons.
    fields: [ name, phone, { name: type, label: Type, type: select, options: [A, B], required: true }, message ]
```

Le compilateur produit la validation serveur, le jeton CSRF, le pot de miel, l'enregistrement (`id, at, form, ip, page, mail, …champs`), l'e-mail et l'onglet du back-office. Le gabarit lit `form.ok`, `form.failed`, `form.message`, `form.success`, `form.values.x`, `form.errors.x` et rend un champ par `{{ field('x') }}`. Aucun autre effet serveur n'est exprimable : un besoin inédit devient une primitive du langage s'il se répète, sinon il reste une extension du catalogue.

### Tests

Un cas de test est un fichier `components/<nom>/fixtures/<cas>.yaml` contenant des props. `sitec test <dossier>` valide chaque cas contre le manifeste, le rend par le runtime de la cible et le compare à l'instantané `<cas>.html` (créé au premier passage, mis à jour par `--update`). Un composant sans cas est rendu avec l'exemple de son manifeste, pour vérifier l'absence d'erreur. `--catalog` étend le test aux composants natifs à gabarit. Le rendu se fait sans variantes d'images et sans session réelle (jeton constant), pour des instantanés stables.

## 6 bis. Paquets de composants

Un paquet regroupe des composants à gabarit et des composés, partagés par plusieurs sites :

```
<paquet>/
  package.yaml      name: vitrine (préfixe), description, version, language
  components/<nom>/ composants à gabarit neutre (même format qu'un composant de projet, fixtures/ comprises)
  components.yaml   composés du paquet
```

Un site les déclare à la racine de `site.yaml` : `packages: [ ./paquets/vitrine, @acme/devanture-composants ]`. Un chemin commençant par `.` ou `/` est relatif au site ; un nom est cherché dans `node_modules/` (paquet npm ou dépôt git installé). Les composants sont exposés préfixés : `vitrine.encart`, `vitrine.contact-rapide` ; un composé du paquet cite les composants du paquet par leur nom complet. Le préfixe est unique, ne peut pas être une famille du catalogue natif (`products`, `order`…), et un paquet écrit pour une version de langage inconnue est refusé. L'atelier navigateur ne voit que les fichiers du site : pour un site qui l'embarque, le paquet se range sous le site (`./paquets/…`), sinon `check` avertit (`W_PACKAGE_STUDIO`).

## 6 quater. Composants décrits en langage naturel

`sitec component new <dossier> <nom> --describe "…"` (ou `--from description.md`) fait écrire le composant par un modèle (Claude Opus 5.5 par défaut, `--model`), en formats neutres seulement : manifeste, gabarit, feuille de style, cas de test. Le guide donné au modèle est construit depuis le compilateur (vocabulaire du gabarit, filtres, comportements, jetons, pictogrammes, deux composants natifs de référence) et le contexte du site (thème, images, noms déjà pris). La proposition est écrite dans `components/<nom>/`, puis vérifiée comme tout composant (`check`, règles CSS, comportements, cas de test rendus) ; les erreurs et avertissements sont renvoyés au modèle, jusqu'à trois tours (`--rounds`). La description reste dans `components/<nom>/description.md`, source lisible ; le reste est figé et versionné. La compilation n'appelle jamais le modèle.

Sans clé d'API : `--export prompt.json` écrit le prompt et le schéma de sortie ; la réponse d'un modèle (ou d'un agent) s'importe par `--import reponse.json`, vérifiée, avec `--export reparation.json` pour le tour suivant si elle ne passe pas.

## 6 ter. Éditeur

`sitec schema <dossier>` produit des schémas JSON dérivés du catalogue réel du site (`.devanture/schema/` : site, pages, composés, manifestes, paquet, cas de test, chaque collection, produits) et les déclare à l'extension YAML de VS Code (`.vscode/settings.json`, extension recommandée `redhat.vscode-yaml`). L'éditeur propose alors les composants et leurs props avec leur description et leur exemple, les fichiers d'`assets/`, les routes et les sources ; il souligne une prop, un composant, une image ou une route inconnus. Les expressions `{{ … }}` sont acceptées partout, `{ for, as, item }` dans les composés. Les schémas aident à la frappe, `sitec check` reste l'autorité (expressions, références croisées, gabarits).

## 7. Ce que garantit le vérificateur

Avant toute génération : structure et types de chaque document, routes et ancres existantes, fichiers d'`assets/` présents, segments déclarés, champs de collections, paramètres des assemblages, gabarits compilables, expressions résolubles, textes `[à compléter]` absents (sauf `--draft`). Après : les pages produites sont identiques quel que soit l'ordre des fichiers ; aucune donnée de la requête n'atteint un gabarit sans échappement.

## 8. Ce qui appartient à la cible

Le rendu des gabarits, le protocole des formulaires, le stockage, le cache statique, le déploiement : `docs/CIBLES.md`. Le langage n'y fait pas référence.

Treize composants natifs sont écrits dans le gabarit neutre : bandeau, texte, galerie, équipe, tarifs, carte, points forts, chiffres, étapes, appel, chronologie, témoignages, FAQ, plus la liste de collection. Restent écrits pour la cible les **primitives à effets ou à état** : formulaire de contact, boutique (grille, fiche, produits liés, panier, commande, confirmation), horaires calculés à l'heure de la visite, mémoire du visiteur (`recent`), bloc libre (`custom`). Leur contrat est décrit dans `CIBLES.md` ; c'est ce qu'une seconde cible devrait réécrire, le reste vient du gabarit.

## 9. Versions et migration

`sitec migrate <dossier>` fait passer un site à la dernière version, étape par étape, en modifiant le texte des fichiers (commentaires et mise en forme conservés), puis vérifie que le site migré passe `check`. `--dry-run` montre les changements sans écrire. Chaque migration propose aussi des suggestions non appliquées : ce que la nouvelle version permet d'écrire mieux (coordonnées recopiées en dur, valeurs répétées à mettre en constantes). Un site sans `language` est lu comme version 1 avec l'avertissement `W_LANGUAGE`.

- **0** : sites écrits avant la déclaration de version (compilateur ≤ 0.1.3). Migration vers 1 : ajout de `language: 1`, aucune construction ne change.
- **1** (2026-11-08) : première version écrite. Expressions, constantes, collections, composants composés, composants de projet avec gabarit neutre et effet `form`, paquets de composants, tests de composants, feuille de style encadrée, comportements déclarés.
