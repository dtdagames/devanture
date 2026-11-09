# Devanture, langage version 1

Ce document est la spécification du langage lu par le compilateur `sitec`. Il décrit ce qu'un site peut écrire, ce que le vérificateur garantit, et ce qui est laissé à la cible. Le compilateur et le langage ont des versions distinctes : un site déclare `language: 1` dans `site.yaml` (défaut 1) ; un compilateur refuse une version qu'il ne connaît pas (`E_LANGUAGE`) plutôt que de la deviner. Une nouvelle version du langage n'arrive qu'avec une commande de migration et une entrée dans `CHANGELOG.md`.

## 1. Modèle

Un site est un ensemble de documents YAML : `site.yaml` (identité, réglages, constantes, collections), `pages/<id>.page.yaml` (une page par fichier), `data/<nom>.yaml` (éléments des collections, produits), `components.yaml` (composants composés), `components/<nom>/` (composants de projet), `segments.yaml` (segments, objectifs, expériences), `brief.md` (source de vérité éditoriale).

Le langage est **déclaratif et sans effet** : il décrit des pages faites de sections, des données, des composants et des effets nommés (enregistrer, notifier, mesurer). Il n'a ni boucle libre, ni affectation, ni appel arbitraire. Tout ce qui peut être calculé à la compilation l'est ; ce qui dépend de la requête (élément d'une collection, produit, commande, formulaire) est traduit vers la cible par le compilateur, jamais écrit par l'auteur.

Quatre moyens d'abstraction :

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

Filtres : `upper` `lower` `capitalize` `trim` `default(x)` `join(sep)` `count` `length` `first` `last` `reverse` `sort(clé|-clé)` `map(clé)` `where(clé, valeur)` `limit(n)` `unique` `money(devise)` `price(devise)` `round(n)` `int` `slug` `truncate(n)` `split(sep)` `replace(a, b)` `date(format)` `nl2br` `url_encode` `repeat(n)`. `date` accepte `d j m n Y y F` (`F` = mois en lettres). Les valeurs vides, `0`, `false`, `null` et les listes vides sont fausses ; `"0"` est vrai.

Sémantique unique : le même évaluateur sert à la compilation (JavaScript) et à l'exécution (PHP produit par traduction de l'arbre) ; le banc `scripts/verify-lang.mjs` vérifie l'égalité des deux sur un jeu d'expressions.

## 3. Constantes

À la racine de `site.yaml` :

<!-- sitec: site.yaml (ajout) -->
```yaml
constants:
  delai_depannage: 1 h
  tarif_deplacement: 95 € TTC
```

`{{ const.tarif_deplacement }}` dans n'importe quelle valeur. Les constantes peuvent citer `site` ; `site` peut citer `const`.

## 4. Collections

La déclaration, à la racine de `site.yaml` :

<!-- sitec: site.yaml (ajout) -->
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

Les éléments, dans `data/realisations.yaml` :

<!-- sitec: data/realisations.yaml -->
```yaml
realisations:
  - id: cuisine-lyon-6
    title: Cuisine refaite, Lyon 6e
    date: "2026-09"
    category: cuisine
    text: Remplacement de l'évier et du mitigeur, raccordement du lave-vaisselle.
```

Une page par élément : `route: /realisations/[id]`, `source: realisations` ; ses sections et son `seo` lisent `item.*`.

<!-- sitec: pages/realisation.page.yaml -->
```yaml
page: realisation
route: /realisations/[id]
source: realisations
seo: { title: "{{ item.title }}" }
sections:
  - hero:
      title: "{{ item.title }}"
      subtitle: "{{ item.category | capitalize }} · {{ item.date | date('F Y') }}"
  - richtext: { text: "{{ item.text }}" }
```

Une liste : composant `collection.list` (`source`, `filter`, `sort`, `limit`, champs d'affichage). À la compilation : `{{ collections.realisations | count }}`, `{{ collections.realisations | where('category', 'cuisine') | map('title') | join(', ') }}`.

Les noms `products`, `orders`, `messages`, `events`, `stock` sont réservés. La boutique (`data/products.yaml`) garde sa sémantique propre (prix, stock, panier).

## 5. Composants composés

Dans `components.yaml`, à la racine du site :

<!-- sitec: components.yaml -->
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

Dans une page, l'assemblage s'emploie comme un composant natif :

<!-- sitec: fragment sections -->
```yaml
- offre: { titre: Dépannage, prix: 95 € TTC, points: [Rapide, Garanti] }
```

Types de paramètre : `string`, `text`, `number`, `boolean`, `list`, `object`, `link`, `asset`. L'usage est remplacé à la compilation par les sections produites, qui sont ensuite validées comme les autres ; une erreur dans une section produite nomme l'assemblage et l'usage. `{ for: liste, as: x, item: gabarit }` construit une liste. L'`id` de l'usage va à la première section produite (les suivantes reçoivent `id-2`, `id-3`), `keywords` à la première ; `variants` est refusé sur un assemblage. La composition est récursive, profondeur limitée.

## 5 bis. Segments, variantes et expériences

`segments.yaml`, à la racine du site, dit qui voit quoi, ce qu'on cherche à obtenir, et ce qu'on mesure.

<!-- sitec: segments.yaml -->
```yaml
segments:
  recurrent: { visits: { gte: 2 } }
  devis_abandonne:
    all:
      - { event: form_start, within: 7d }
      - { not: { event: form_submit, within: 7d } }
priority: [devis_abandonne, recurrent]

goals:
  appel: { event: click_cta, where: { to: "tel:+33472001122" } }
  devis: { event: form_sent, where: { form: contact } }

experiments:
  accroche: { goal: appel, arms: [urgence] }
  relance: { goal: devis, segment: devis_abandonne, holdout: 20 }
```

Dans une page, une section porte ses variantes ; la première dont le nom est actif pour le visiteur remplace les props citées :

<!-- sitec: fragment sections -->
```yaml
- hero:
    title: Plombier à Lyon
    cta: { label: Appeler, to: "tel:+33472001122" }
    variants:
      urgence: { title: Une fuite ? Un plombier arrive }
      devis_abandonne: { title: Votre demande de devis vous attend }
      recurrent: { title: Heureux de vous revoir }
```

**Segments.** Une condition est `visits: N` ou `{ gte: N }` (aussi `eq`, `lte`, `gt`, `lt`), `device: mobile | desktop`, `event: nom` avec `within` (`24h`, `7d`, `3m`), `count` et `where`, ou une combinaison `all`, `any`, `not`. `priority` ordonne les segments quand plusieurs sont actifs. Le profil du visiteur (visites, événements récents) reste dans son navigateur, sous consentement ; la même spécification compilée est évaluée par le serveur au premier rendu et par le navigateur ensuite.

Événements : `page_view`, `section_view`, `click_cta`, `form_start`, `form_submit`, `form_sent`, `search`, `cart_add`, `checkout_start`, `purchase`, `variant_shown`. `form_submit` est le bouton pressé, `form_sent` le formulaire accepté par le serveur ; `variant_shown` est émis quand une variante s'affiche.

**Variantes.** Sur une section, `variants: { nom: { props surchargées } }` ; jamais `id`, `keywords` ni `variants`. Sur une page, `variants: { nom: { first: [ids], hide: [ids] } }` réordonne ou masque des sections.

**Objectifs.** `goals: { nom: { event, where: { clé: valeur } } }` nomme ce qu'on cherche à obtenir. `where` est facultatif, porte une seule clé, limitée à ce que l'événement transporte :

| Événement | Précisions permises |
|---|---|
| `page_view` | `route` |
| `section_view` | `section`, `route` |
| `click_cta` | `to`, `route` |
| `form_start`, `form_submit`, `form_sent` | `form`, `route` |
| `cart_add` | `category`, `route` |
| `search`, `checkout_start`, `purchase` | aucune |

**Expériences.** Une expérience compare une variante à un groupe témoin tiré au sort, nommé `temoin`, qui voit le contenu de base. Deux formes :

| Écrit | Signifie |
|---|---|
| `{ goal, arms: [a, b] }` | A/B : parts égales entre le témoin et chaque bras |
| `{ goal, arms: { a: 30, b: 30 } }` | pourcentage par bras, le reste au témoin (total de 99 au plus) |
| `{ goal, segment: s, holdout: 20 }` | 20 % des visiteurs du segment `s` gardent le contenu de base (de 1 à 99, 50 par défaut) |
| `minimum: 200` | visiteurs exposés par groupe avant tout verdict (200 par défaut, 20 au moins) |

Un bras est un nom neuf (pas un segment, pas `temoin`) employé dans les `variants` des pages comme un nom de segment ; il passe avant les segments, sauf s'il est placé dans `priority`. Le vérificateur refuse un objectif inconnu (`E_UNKNOWN_GOAL`), un bras ou un segment mesuré qu'aucune variante n'emploie (`E_EXPERIMENT_UNUSED`), `arms` et `segment` ensemble, des parts qui ne laissent pas de témoin.

Mesure : un visiteur compte une fois comme exposé, à la première page où l'expérience agit, puis une fois s'il atteint l'objectif ensuite. Le back-office (`/_admin`, onglet « Expériences ») donne par groupe les visiteurs exposés, les objectifs atteints et le taux, puis par bras l'écart au témoin, son intervalle de confiance à 95 % et un verdict : pas assez de données, fait mieux, fait moins bien, pas de différence mesurable. Le verdict n'apparaît qu'une fois le minimum atteint dans chaque groupe. Chaque expérience porte une empreinte de sa définition et du contenu comparé : les changer ouvre une nouvelle mesure, l'ancienne est ignorée.

Limites, à connaître avant de lire un résultat :

- seuls les visiteurs ayant accepté la personnalisation sont tirés au sort et mesurés ; le résultat vaut pour eux ;
- le témoin voit « ce qu'il aurait vu sinon », c'est-à-dire le contenu de base ou la variante d'un autre segment actif ;
- deux expériences sur la même section se partagent l'affichage selon `priority` : la comparaison reste juste, l'effet mesuré est dilué ;
- un nouveau visiteur tiré dans un bras voit d'abord le contenu de base, remplacé au chargement (un changement visible, une seule fois) ; une variante de page ne s'applique qu'à partir de la page suivante ;
- le compte « une fois par visiteur » est tenu par le navigateur : il n'est pas à l'épreuve d'un visiteur qui falsifie son cookie ;
- le banc `scripts/verify-experiments.mjs` vérifie le tirage, l'exposition, la conversion et les verdicts avec des visiteurs simulés ; rien n'a encore tourné sur du trafic réel.

## 6. Composants de projet

Un composant s'écrit de deux façons.

**Format langage (par défaut)** : un seul fichier, `manifest.yaml`, en français contrôlé. Quatre blocs : `données` (ce que le composant accepte), `forme` (sa structure), `apparence` (son allure), `fonctionnement` (ce qu'il fait d'une saisie). Le compilateur en tire le schéma des props, le gabarit, la feuille de style, les comportements et les effets serveur ; l'auteur ne voit ni HTML, ni CSS, ni JavaScript. La correspondance est fixe : une même configuration donne toujours le même rendu, toute erreur renvoie à une ligne du manifeste (`"path":"ligne 21"`), et `sitec component show <dossier> <nom>` affiche chaque bloc à côté de ce qu'il produit.

```
components/<nom>/
  manifest.yaml    description, données, forme, apparence, fonctionnement, example, intents
  description.md   la demande en français libre (facultatif, écrit par sitec component new)
  fixtures/        cas de test et rendus attendus
```

**Format html (porte de sortie)** : pour un design que les primitives n'expriment pas.

```
components/<nom>/
  manifest.yaml    description, props (schéma JSON) ou données, behaviors, example, intents, effects
  template.html    gabarit neutre
  styles.css       design, avec les jetons du thème
  module.js        comportement navigateur (optionnel, signalé)
```

Le nom ne peut pas être celui d'un composant natif. `template.php` est interdit : un composant de projet ne contient pas de code de la cible. `sitec component new <dossier> <nom>` crée le squelette.

### Données

Ce que le composant accepte, une ligne par champ : « nom: type, précisions — description ». Le bloc se compile vers le schéma JSON des props, vérifié comme avant (`scripts/compare-props.mjs` montre que les props des sept composants natifs réécrits ainsi sont identiques à leur schéma d'origine).

| Écrit | Signifie |
|---|---|
| `texte`, `texte long`, `texte ou nombre`, `nombre`, `nombre entier` (ou `entier`), `oui ou non`, `date` | types simples |
| `lien`, `image`, `icône` | lien `{ label, to }`, fichier d'`assets/`, pictogramme du catalogue |
| `liste de textes` (ou `liste`), `liste de liens`, `liste d'images` | listes simples |
| `items (liste, au moins 1):` puis des champs en dessous | liste d'éléments ; `nom (groupe):` puis des champs pour un objet (`groupe`) |
| `facultatif` | champ non obligatoire (tout champ est obligatoire sinon) |
| `au moins N`, `au plus N`, `de A à B` | bornes (éléments d'une liste, longueur d'un texte, valeur d'un nombre) |
| `un parmi a, b, c` | valeurs permises, toujours en dernier |
| `par défaut X` | valeur par défaut |
| `— texte` | description, libre (entre guillemets simples si la ligne contient « : ») |

### Forme

La structure de la section, en primitives dont le balisage est fixe (classes maison, accessibilité, comportements). Une donnée facultative rend son élément conditionnel ; un nom entre « » donne une classe à l'élément ; dans une liste, les noms désignent d'abord les champs de l'élément.

| Primitive | Rendu |
|---|---|
| `en-tête: title, intro` | titre h2 et introduction de la section |
| `titre`, `grand titre`, `sous-titre` | h2 dans la section, h3 dans un élément de liste ; forcés h2 ou h3 |
| `texte`, `texte discret`, `paragraphes`, `citation` | paragraphe, paragraphe discret, texte long avec balisage léger, citation « » |
| `image`, `icône`, `étoiles`, `prix`, `badge`, `date` (option : en toutes lettres) | médias et valeurs formatées |
| `image, agrandissable: photo, légende` | image qui s'ouvre en grand au clic |
| `portrait: photo, nom` | photo ronde, ou l'initiale du nom quand il n'y a pas de photo |
| `bouton`, `bouton discret`, `lien` | liens |
| `signature: author, role` (option : en toutes lettres) | auteur en gras, précision discrète |
| `numéro` | numéro de l'élément dans sa liste |
| `bloc`, `carte`, `témoignage`, `élément`, `si x:` | regroupements, carte, carte de citation, élément de liste, condition |
| `grille de x, 3 colonnes`, `liste de x`, `liste numérotée de x`, `rangée de x` | listes d'éléments |
| `défilement de x` (options : automatique, sans flèches), `onglets de x, libellé y`, `accordéon de x, question q, réponse r` | carrousel, onglets, questions repliables : comportements inclus |
| `filtres de x, selon champ, 3 colonnes` (option : tout « Toutes ») | grille précédée de boutons qui la filtrent ; un bouton par valeur du champ |
| `repli, libellé « En savoir plus »:` puis des éléments (option : ouvert) | zone repliable |
| `copier, libellé « Copier le code »: donnée` | bouton qui copie la donnée dans le presse-papiers |
| `formulaire, bouton Envoyer` ; ou `formulaire:` puis `champ: nom` pour placer les champs | formulaire déclaré dans `fonctionnement` |

Les primitives à comportement (défilement, onglets, accordéon, filtres, repli, image agrandissable, copier) posent elles-mêmes les attributs et déclarent le comportement : rien à écrire dans `behaviors`.

En tête : `section, conteneur « nom », variante style par défaut primary:` puis la liste. Un texte littéral peut porter des données et du balisage léger : `texte: "Réponse sous {{ delai }}. [Appeler]({{ lien_appel }})"` ; une valeur `"{{ … }}"` est une expression du langage, aux noms courts (`{{ title | default(label) }}`).

### Apparence

L'allure, par partie (primitive au singulier ou au pluriel, nom donné entre « », ou `section`), en intentions fixes traduites vers les jetons du thème : `compactes`, `aérées`, `coins arrondis`, `ombre légère`, `bordure`, `trait à gauche`, `fond surface`, `fond principal`, `fond d'accent`, `couleur d'accent`, `couleur discrète`, `couleur de succès`, `centré`, `grand`, `petit`, `gras`, `italique`, `majuscules`, `en ligne`, `empilés`, `deux colonnes`, `une colonne`, `étroit`, `largeur moyenne`, `masqués`, `espace au-dessus`… (liste complète : `sitec explain langage`). `sur téléphone:` regroupe les règles des petits écrans. Aucune valeur libre : pas de couleur, taille ni police écrite en dur.

Un composant entier, `components/avis/manifest.yaml` :

<!-- sitec: components/avis/manifest.yaml -->
```yaml
description: Avis de clients, en défilement.
données:
  title: texte, facultatif
  items (liste, au moins 1):
    rating: nombre entier, de 1 à 5, facultatif
    text: texte
    author: texte
forme:
  - en-tête: title
  - défilement de items, automatique:
      - témoignage:
          - étoiles: rating
          - citation: text
          - signature: author
apparence:
  étoiles: couleur d'accent
  sur téléphone:
    flèches: masquées
```

Et son usage dans une page :

<!-- sitec: fragment sections -->
```yaml
- avis:
    title: Ils nous ont fait confiance
    items:
      - { rating: 5, text: Intervention rapide et soignée., author: Claire D. }
      - { text: Devis clair et tenu., author: Marc L. }
```

### Fonctionnement

Ce que le composant fait d'une saisie, une fois envoyée au serveur. Un seul fonctionnement en version 1 : le formulaire. Exemple complet, `components/demande-devis/manifest.yaml` :

<!-- sitec: components/demande-devis/manifest.yaml -->
```yaml
description: Demande de devis, enregistrée et transmise par e-mail.
données:
  title: texte
forme:
  - titre: title
  - formulaire, bouton Demander un devis
fonctionnement:
  formulaire:
    enregistre dans: devis
    prévient par e-mail: oui
    confirmation: Merci, nous vous rappelons dans la journée.
    champs:
      name:
      phone: facultatif
      type_travaux: choix, un parmi Fuite, Chauffe-eau, Autre — Type de travaux
      precision: texte, si type_travaux vaut Autre — Précisez
      details: texte long, facultatif — Précisions (ex. étage, accès)
```

<!-- sitec: fragment sections -->
```yaml
- demande-devis: { title: Un devis en quelques minutes }
```

| Écrit | Signifie |
|---|---|
| `enregistre dans: devis` | registre des envois (back-office › Formulaires, export CSV) ; obligatoire ; `orders`, `events`, `stock`, `products` sont réservés |
| `prévient par e-mail: oui` | `oui` : e-mail au contact du site ; une adresse ; `non` |
| `destinataire: adresse` | autre destinataire que le contact du site |
| `confirmation: texte` | message affiché après l'envoi |
| `champs:` puis une ligne par champ | « nom: type, précisions — Libellé (ex. exemple affiché dans le champ) » |
| `texte`, `texte long`, `e-mail`, `téléphone`, `nombre`, `date`, `choix` | types de champ (`texte` par défaut) |
| `facultatif` | champ non obligatoire (tout champ est obligatoire sinon) |
| `choix, un parmi a, b, c` | liste déroulante ; toujours en dernier avant « — » |
| `si champ vaut valeur` | champ affiché et validé seulement dans ce cas ; le champ cité est déclaré plus haut, la valeur est l'une des siennes |

Les noms `name`, `email`, `phone`, `subject`, `message` ont leur type et leur libellé habituels : rien à écrire après les deux-points. La forme place le formulaire (`- formulaire, bouton Demander un devis`) ; un formulaire déclaré que la forme n'affiche pas est une erreur, comme un `champ:` que le fonctionnement ne déclare pas. Le bloc se compile vers les effets déclarés décrits plus bas : le compilateur fournit validation serveur, jeton CSRF, pot de miel, enregistrement et e-mail. `effects` (format machine) et `fonctionnement` ensemble sont refusés.

### Voir ce qu'un composant produit

`sitec component show <dossier> <nom>` affiche, bloc par bloc, les lignes du manifeste puis ce que le compilateur en tire : schéma JSON des props, effets, gabarit neutre, comportements ajoutés, parties que l'apparence peut viser, feuille de base des primitives et feuille de l'apparence. `--php` ajoute le PHP exécuté par le serveur, `--json` donne la même chose en données (`blocks[].source.from`, `.to`, `.output`). Rien n'y est recalculé : c'est l'entrée de catalogue que `check` et `build` utilisent.

Mesure (`scripts/measure-format.mjs`) : sur sept composants natifs et trois composants de projet, ce que l'auteur écrit passe de 3 696 à 1 372 tokens (−63 %) et de 481 à 145 lignes, formulaire du devis écrit en `fonctionnement` compris. Les sept natifs réécrits en forme en v0.7.0 produisent les 36 pages des exemples identiques au caractère près (`scripts/snapshot-pages.mjs --compare`) ; `team`, réécrit en v0.8.0, garde ses props mais change de rendu (portrait rond ou initiale), sur trois pages.

### Gabarit

| Construction | Sens |
|---|---|
| `{{ expr }}` | sortie échappée ; HTML sûr seulement pour `link`, `img`, `icon`, `paragraphs`, `markup`, `field`, `lines` en tête d'expression |
| `{% if e %} … {% elif e %} … {% else %} … {% endif %}` | condition |
| `{% for x in e %} … {% endfor %}`, `{% for k, x in e %}` | boucle ; `loop.index`, `loop.index0`, `loop.first`, `loop.last`, `loop.count` |
| `{% set x = e %}` | valeur locale |
| `{% form %} … {% endform %}` | formulaire déclaré par `fonctionnement` (ou `effects.form`) : méthode, nom, jeton, pot de miel |
| `{# … #}` | commentaire |

Variables : `p` (props, vérifiées contre le manifeste), `site`, `page`, `item`, `product`, `order`, `form`, `loop`, `cart`, `shop`. Fonctions : `link(lien, classe)`, `img(chemin, alt, sizes, eager)`, `img_src(chemin, largeur)`, `asset(chemin)`, `url(cible)`, `icon(nom)`, `paragraphs(texte)`, `markup(texte)`, `lines(texte)` (retours à la ligne conservés), `money(n)`, `field(nom)`.

La vérification refuse, avec le numéro de ligne : PHP ou tout code de cible, variable inconnue, prop absente du manifeste, clé inconnue d'un élément de liste typé, balise déséquilibrée, filtre ou fonction inconnus, `form` sans formulaire déclaré. Pour un composant au format langage, ces erreurs portent sur `manifest.yaml`, à la ligne de la forme (`E_COMPONENT`) ; pour un gabarit écrit à la main, sur `template.html` (`E_TEMPLATE`). Le balisage ne contient pas de code navigateur : `<script>`, attributs `on…=`, liens `javascript:`, `<iframe>`, `<object>`, `<embed>`, `<link>`, `<meta>`, `<base>` sont refusés.

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

Le format machine que `fonctionnement` produit, et qu'un composant au format html écrit directement. Exemple complet, `components/rappel/manifest.yaml` puis son gabarit :

<!-- sitec: components/rappel/manifest.yaml -->
```yaml
description: Demande de rappel, enregistrée et transmise par e-mail.
props:
  type: object
  required: [title]
  properties:
    title: { type: string, description: titre du bloc }
effects:
  form:
    store: rappels               # registre des envois (back-office › Formulaires, CSV)
    notify: true                 # true : e-mail au contact du site ; adresse ; false
    success: Merci, nous vous rappelons.
    fields: [ name, phone, { name: type, label: Type, type: select, options: [A, B], required: true }, message ]
```

<!-- sitec: components/rappel/template.html -->
```html
<section class="section rappel">
  <div class="container">
    <h2>{{ p.title }}</h2>
    {% if form.ok %}
      <p>{{ form.success }}</p>
    {% else %}
      {% if form.failed %}<p>{{ form.message }}</p>{% endif %}
      {% form %}
        {{ field('name') }} {{ field('phone') }} {{ field('type') }} {{ field('message') }}
        <button class="btn">Être rappelé</button>
      {% endform %}
    {% endif %}
  </div>
</section>
```

<!-- sitec: fragment sections -->
```yaml
- rappel: { title: On vous rappelle }
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

`sitec component new <dossier> <nom> --describe "…"` (ou `--from description.md`) fait écrire le composant par un modèle (Claude Opus 5.5 par défaut, `--model`). Par défaut, le modèle écrit le format langage (données, forme, apparence et cas de test : aucun HTML ni CSS) ; `--format html` lui fait écrire gabarit et feuille. `scripts/measure-gen.mjs` compare les deux formats sur une série fixe de descriptions (composants valides, tours de réparation, tokens), avec une clé d'API. Le guide donné au modèle est construit depuis le compilateur (vocabulaire du gabarit, filtres, comportements, jetons, pictogrammes, deux composants natifs de référence) et le contexte du site (thème, images, noms déjà pris). La proposition est écrite dans `components/<nom>/`, puis vérifiée comme tout composant (`check`, règles CSS, comportements, cas de test rendus) ; les erreurs et avertissements sont renvoyés au modèle, jusqu'à trois tours (`--rounds`). La description reste dans `components/<nom>/description.md`, source lisible ; le reste est figé et versionné. La compilation n'appelle jamais le modèle.

Sans clé d'API : `--export prompt.json` écrit le prompt et le schéma de sortie ; la réponse d'un modèle (ou d'un agent) s'importe par `--import reponse.json`, vérifiée, avec `--export reparation.json` pour le tour suivant si elle ne passe pas.

`sitec component edit <dossier> <nom> --ask "…"` modifie un composant existant : le modèle reçoit les fichiers actuels et la demande, la même vérification s'applique, la demande s'ajoute à l'historique de `description.md`, et la version précédente est restaurée si aucun tour ne passe. `--package chemin` écrit dans un paquet déclaré par le site (nom court dans le manifeste, nom préfixé dans les pages).

`sitec component preview <dossier> <nom>` écrit `.devanture/preview/<nom>.html` : tous les cas de test rendus avec la feuille du site et ses comportements, des boutons pour essayer les trois thèmes et une largeur de téléphone. `new` et `edit` la produisent après chaque succès : c'est l'outil de la relecture visuelle, que la vérification ne remplace pas.

## 6 ter. Éditeur

`sitec schema <dossier>` produit des schémas JSON dérivés du catalogue réel du site (`.devanture/schema/` : site, pages, composés, manifestes, paquet, cas de test, chaque collection, produits) et les déclare à l'extension YAML de VS Code (`.vscode/settings.json`, extension recommandée `redhat.vscode-yaml`). L'éditeur propose alors les composants et leurs props avec leur description et leur exemple, les fichiers d'`assets/`, les routes et les sources ; il souligne une prop, un composant, une image ou une route inconnus. Les expressions `{{ … }}` sont acceptées partout, `{ for, as, item }` dans les composés. Les schémas aident à la frappe, `sitec check` reste l'autorité (expressions, références croisées, gabarits).

## 7. Ce que garantit le vérificateur

Avant toute génération : structure et types de chaque document, routes et ancres existantes, fichiers d'`assets/` présents, segments déclarés, champs de collections, paramètres des assemblages, gabarits compilables, expressions résolubles, textes `[à compléter]` absents (sauf `--draft`). Après : les pages produites sont identiques quel que soit l'ordre des fichiers ; aucune donnée de la requête n'atteint un gabarit sans échappement.

## 8. Ce qui appartient à la cible

Le rendu des gabarits, le protocole des formulaires, le stockage, le cache statique, le déploiement : `docs/CIBLES.md`. Le langage n'y fait pas référence.

Composants natifs écrits sans code de la cible (format langage ou gabarit neutre) : `hero`, `richtext`, `gallery`, `pricelist`, `map`, `collection.list`, `features`, `stats`, `steps`, `cta`, `timeline`, `testimonials`, `faq`, `team`. Composants natifs écrits pour la cible, les **primitives à effets ou à état** : `contact.form` (formulaire de contact), `products.grid`, `product.hero`, `products.related`, `cart.page`, `checkout.page`, `order.confirmation` (boutique), `hours` (horaires calculés à l'heure de la visite), `recent` (mémoire du visiteur), `custom` (bloc libre). Leur contrat est décrit dans `CIBLES.md` ; c'est ce qu'une seconde cible devrait réécrire, le reste vient du gabarit.

## 9. Versions et migration

`sitec migrate <dossier>` fait passer un site à la dernière version, étape par étape, en modifiant le texte des fichiers (commentaires et mise en forme conservés), puis vérifie que le site migré passe `check`. `--dry-run` montre les changements sans écrire. Chaque migration propose aussi des suggestions non appliquées : ce que la nouvelle version permet d'écrire mieux (coordonnées recopiées en dur, valeurs répétées à mettre en constantes). Un site sans `language` est lu comme version 1 avec l'avertissement `W_LANGUAGE`.

- **0** : sites écrits avant la déclaration de version (compilateur ≤ 0.1.3). Migration vers 1 : ajout de `language: 1`, aucune construction ne change.
- **1** (2026-11-08) : première version écrite. Expressions, constantes, collections, composants composés, composants de projet avec gabarit neutre et effet `form`, paquets de composants, tests de composants, feuille de style encadrée, comportements déclarés. Ajouts compatibles, sans changement de version : composants en français contrôlé (compilateur 0.7.0 et 0.8.0), objectifs et expériences dans `segments.yaml` (0.9.0).
