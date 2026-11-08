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

Variables : `p` (props, vérifiées contre le manifeste), `site`, `page`, `item`, `product`, `order`, `form`, `loop`, `shop`. Fonctions : `link(lien, classe)`, `img(chemin, alt, sizes, eager)`, `img_src(chemin, largeur)`, `asset(chemin)`, `url(cible)`, `icon(nom)`, `paragraphs(texte)`, `markup(texte)`, `money(n)`, `field(nom)`.

La vérification refuse, avec le numéro de ligne : PHP ou tout code de cible, variable inconnue, prop absente du manifeste, clé inconnue d'un élément de liste typé, balise déséquilibrée, filtre ou fonction inconnus, `form` sans `effects.form`.

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

## 7. Ce que garantit le vérificateur

Avant toute génération : structure et types de chaque document, routes et ancres existantes, fichiers d'`assets/` présents, segments déclarés, champs de collections, paramètres des assemblages, gabarits compilables, expressions résolubles, textes `[à compléter]` absents (sauf `--draft`). Après : les pages produites sont identiques quel que soit l'ordre des fichiers ; aucune donnée de la requête n'atteint un gabarit sans échappement.

## 8. Ce qui appartient à la cible

Le rendu des gabarits, le protocole des formulaires, le stockage, le cache statique, le déploiement : `docs/CIBLES.md`. Le langage n'y fait pas référence. Les composants natifs encore écrits en PHP (boutique, formulaire de contact, horaires, carte, galerie, bandeau, texte libre, équipe, tarifs, récents) sont les primitives à effets ou à état ; leur contrat est décrit dans `CIBLES.md` et c'est lui qu'une seconde cible devrait honorer.

## 9. Versions

- **1** (2026-11-08) : première version écrite. Expressions, constantes, collections, composants composés, composants de projet avec gabarit neutre et effet `form`.
