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

### Les mêmes composés, écrits en document

`components.md` à la place de `components.yaml` (l'un ou l'autre), à la racine du site ou d'un paquet. Un composé par section `## nom` : sa description, puis ses paramètres et ses sections.

<!-- banc : composés en document -->
````
# Composants composés

## offre
Une offre tarifaire et ses points forts

### Paramètres
- titre : texte — nom de l'offre
- prix : texte
- detail : texte, facultatif — phrase sous le prix
- points : liste, par défaut vide
- cta : lien, par défaut Nous contacter → /contact

### Sections
```
## Tarifs : {{ p.titre }}
- rien
  - {{ p.titre }} | {{ p.prix }} | {{ p.detail }}

## Points forts
- pour chaque pt de p.points : check | {{ pt }}

## Appel : {{ p.titre }} : parlons-en
Bouton : {{ p.cta }}
```
````

- **Paramètres** : une puce « nom : type, précisions — description ». Types : texte (`string`), texte long (`text`), nombre, oui ou non (`boolean`), liste, groupe (`object`), lien, image (`asset`). Sans précision, le paramètre est obligatoire ; « facultatif » le laisse sans valeur ; « par défaut … », en dernier, lui en donne une (« par défaut vide » pour un texte, une liste ou un groupe ; « Libellé → /cible » pour un lien ; oui ou non ; un nombre ; « a, b, c » pour une liste).
- **Sections** : dans un bloc entre deux lignes d'accents graves, les sections que le composé produit, écrites et lues comme celles d'une page (section 6 sexies), avec les paramètres en expressions. Une valeur faite d'une seule expression s'écrit par son nom là où un lien, un nombre ou un choix est attendu : « Bouton : {{ p.cta }} ».
- **Boucle** : « pour chaque pt de p.points : » en tête d'une puce vaut `{ for: p.points, as: pt, item: … }` : la puce produit un élément par valeur de la liste, et la liste tient en cette seule puce. Cette tournure n'existe que dans les sections d'un composé.
- « - rien » ouvre un élément qui n'a que sa liste en retrait (un groupe de tarifs sans titre).
- La lecture est figée dans `lecture/components.yaml` (celle d'un paquet dans son propre dossier `lecture/`), comme celle d'une page : `sitec lire <dossier> --accepter` après toute modification. Une erreur dans une section produite renvoie à la ligne de `components.md` et nomme la page qui emploie le composé.
- `sitec rediger` convertit `components.yaml` ; le document écrit est relu et doit valoir le fichier d'origine.

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

**Format langage (par défaut)** : un seul fichier, `manifest.yaml`, en français contrôlé. Quatre blocs : `données` (ce que le composant accepte), `forme` (sa structure), `apparence` (son allure), `fonctionnement` (ce qu'il fait d'une saisie). La forme s'écrit avec les primitives du langage et avec les mots d'un vocabulaire que le site, un paquet ou le catalogue natif définit hors du compilateur (`vocabulaire.yaml`, plus bas). Le compilateur en tire le schéma des props, le gabarit, la feuille de style, les comportements et les effets serveur ; l'auteur ne voit ni HTML, ni CSS, ni JavaScript. La correspondance est fixe : une même configuration donne toujours le même rendu, toute erreur renvoie à une ligne du manifeste (`"path":"ligne 21"`), et `sitec component show <dossier> <nom>` affiche chaque bloc à côté de ce qu'il produit.

```
components/<nom>/
  manifest.yaml    description, données, forme, apparence, fonctionnement, example, intents
  description.md   la demande en français libre (facultatif, écrit par sitec component new)
  fixtures/        cas de test et rendus attendus
```

**Format html (porte de sortie)** : pour un composant entier que ni les primitives ni un mot du vocabulaire n'expriment. Quand il ne manque qu'un élément (un balisage que les primitives ne savent pas écrire), définissez plutôt un mot : le reste du composant garde le format langage.

```
components/<nom>/
  manifest.yaml    description, props (schéma JSON) ou données, behaviors, example, intents, effects
  template.html    gabarit neutre
  styles.css       design, avec les jetons du thème
  module.js        comportement navigateur (optionnel, signalé)
```

### Le même composant, écrit en plan

Le format langage s'écrit aussi sans YAML, dans `components/<nom>/composant.md` à la place de `manifest.yaml` (l'un ou l'autre). Ce sont les mêmes lignes en français, en puces : un titre (le nom), la description, puis une section par bloc. Rien ne se met entre guillemets, et il n'y a pas de bloc « | ». C'est l'écriture du catalogue natif et celle du squelette que pose `sitec component new`.

<!-- sitec: components/annonce/composant.md -->
````markdown
# annonce

Bandeau d'annonce : un texte, un code à donner et une date de fin.

Mots-clés : annonce, offre, promotion

## Données
> Une note pour qui lit : les lignes qui commencent par « > » ne sont pas lues.
- text : texte — l'annonce
- code : texte, facultatif — code à donner au téléphone
- until : texte, facultatif — date de fin (ex. 30 novembre)

## Forme
section, conteneur « annonce-inner » :
- texte : **À noter :** {{ text }}
- si code :
  - texte « annonce-code » : Code **{{ code }}**
- si until :
  - texte discret : jusqu'au {{ until }}

## Apparence
- annonce-inner : fond d'accent, coins arrondis, en ligne, compactes
- annonce-code : gras
- sur téléphone :
  - annonce-inner : empilés

## Exemple
```
## annonce
-15 % sur l'entretien annuel de chaudière
Code : ENTRETIEN15
Until : 30 novembre
```
````

| Dans un plan | Ce que le lecteur en fait |
|---|---|
| `# nom`, puis un paragraphe | le nom du composant et sa description |
| `Ordre : 10`, `Mots-clés : a, b`, `Comportements : tabs` | `order`, `intents`, `behaviors` |
| `## Données`, `## Calculé`, `## Fonctionnement`, `## Apparence` | les blocs du même nom : une puce « nom : valeur » par ligne, des puces en retrait pour ce qui est dessous |
| `## Forme` | une ligne d'ouverture facultative qui finit par « : », puis les éléments en puces ; les éléments d'un élément en retrait |
| `## Exemple` | un bloc entre accents graves : le composant écrit comme une section de page (section 6 sexies), lu avec ses propres données |
| `> …` | une note, non lue |

Une ligne qui n'est pas une puce sous une section, une section inconnue, une clé dite deux fois sont des erreurs, à leur ligne ; les erreurs des blocs citent la ligne de `composant.md`. `sitec rediger <dossier> --composants` récrit en plans les composants d'un site, `sitec rediger <dossier-paquet>` ceux d'un paquet ; chaque plan est relu et doit rendre le manifeste d'origine, clé pour clé.

Le nom ne peut pas être celui d'un composant natif. `template.php` est interdit : un composant de projet ne contient pas de code de la cible. `sitec component new <dossier> <nom>` crée le squelette.

### Données

Ce que le composant accepte, une ligne par champ : « nom: type, précisions — description ». Le bloc se compile vers le schéma JSON des props, vérifié comme avant (`scripts/compare-props.mjs` montre que les props des sept composants natifs réécrits ainsi sont identiques à leur schéma d'origine).

| Écrit | Signifie |
|---|---|
| `texte`, `texte long`, `texte ou nombre`, `nombre`, `nombre entier` (ou `entier`), `oui ou non`, `date`, `e-mail` | types simples |
| `lien`, `image`, `icône` | lien `{ label, to }`, fichier d'`assets/`, pictogramme du catalogue |
| `liste de textes` (ou `liste`), `liste de liens`, `liste d'images`, `liste de champs`, `liste de plages horaires` | listes simples ; `liste de champs` reçoit les champs d'un formulaire, `liste de plages horaires` des plages `HH:MM-HH:MM` ; sur une `liste de textes`, « un parmi a, b » dit les valeurs permises |
| `items (liste, au moins 1):` puis des champs en dessous | liste d'éléments ; `nom (groupe):` puis des champs pour un objet (`groupe`) ; `groupe libre`, sans champs en dessous, pour un objet dont la page choisit les clés (un filtre `{ champ: valeur }`) |
| `facultatif` | champ non obligatoire (tout champ est obligatoire sinon) |
| `au moins N`, `au plus N`, `de A à B` | bornes (éléments d'une liste, longueur d'un texte, valeur d'un nombre) |
| `un parmi a, b, c` | valeurs permises, toujours en dernier |
| `par défaut X` | valeur par défaut, posée avant le rendu quand la page ne dit rien (`show_stock: oui ou non, par défaut oui`) |
| `— texte` | description, libre (entre guillemets simples si la ligne contient « : ») |

### Forme

La structure de la section, en primitives dont le balisage est fixe (classes maison, accessibilité, comportements). Une donnée facultative rend son élément conditionnel ; un nom entre « » donne une classe à l'élément ; dans une liste, les noms désignent d'abord les champs de l'élément.

| Primitive | Rendu |
|---|---|
| `en-tête: title, intro` | titre h2 et introduction de la section |
| `titre`, `grand titre`, `sous-titre` | h2 dans la section, h3 dans un élément de liste ; forcés h2 ou h3 |
| `titre principal` | h1, un seul par page (bandeau d'ouverture) |
| `texte`, `texte discret`, `paragraphes`, `citation` | paragraphe, paragraphe discret, texte long avec balisage léger, citation « » |
| `image`, `icône`, `étoiles`, `prix`, `badge`, `date` (option : en toutes lettres) | médias et valeurs formatées |
| `image, agrandissable: photo, légende` | image qui s'ouvre en grand au clic |
| `figure:` puis une image et une `légende` | figure et sa légende |
| `portrait: photo, nom` | photo ronde, ou l'initiale du nom quand il n'y a pas de photo |
| `bouton`, `bouton discret`, `lien` | liens |
| `signature: author, role` (option : en toutes lettres) | auteur en gras, précision discrète |
| `numéro` | numéro de l'élément dans sa liste |
| `bloc`, `carte`, `témoignage`, `élément` | regroupements, carte, carte de citation, élément de liste |
| `si x:`, suivi ou non de `sinon:` | condition (aussi « si a ou b: », « si a et b: ») et son autre branche |
| `grille de x, 3 colonnes`, `liste de x`, `liste numérotée de x`, `rangée de x` | listes d'éléments ; le nombre de colonnes peut venir d'une donnée (« grille de x, colonnes n par défaut 3 », « rangée de x, variante n par défaut 2 ») |
| `défilement de x` (options : automatique, sans flèches), `onglets de x, libellé y`, `accordéon de x, question q, réponse r` | carrousel, onglets, questions repliables : comportements inclus |
| `filtres de x, selon champ, 3 colonnes` (option : tout « Toutes ») | grille précédée de boutons qui la filtrent ; un bouton par valeur du champ |
| `repli, libellé « En savoir plus »:` puis des éléments (option : ouvert) | zone repliable |
| `copier, libellé « Copier le code »: donnée` | bouton qui copie la donnée dans le presse-papiers |
| `formulaire, bouton Envoyer` ; ou `formulaire:` puis `champ: nom` pour placer les champs | formulaire déclaré dans `fonctionnement` |

Les primitives à comportement (défilement, onglets, accordéon, filtres, repli, image agrandissable, copier) posent elles-mêmes les attributs et déclarent le comportement : rien à écrire dans `behaviors`.

En tête : `section, conteneur « nom », variante style par défaut primary:` puis la liste ; `section « classe »:` nomme la section autrement que le composant ; `bandeau, image de fond image:` ouvre une page (pas de marge de section, image en fond quand la donnée est présente). `conteneur « nom » si x` (ou `sans x`) ne pose la classe que dans ce cas ; `ancre « nom »` donne un identifiant fixe à la section ; `seulement si x` n'émet la section que si la donnée ou la lecture `x` rend quelque chose. Un texte littéral peut porter des données et du balisage léger : `texte: "Réponse sous {{ delai }}. [Appeler]({{ lien_appel }})"` ; une valeur `"{{ … }}"` est une expression du langage, aux noms courts (`{{ title | default(label) }}`).

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

### Vocabulaire

Les primitives viennent du compilateur ; les **mots** s'y ajoutent sans le modifier. Un mot est un élément de forme défini dans un fichier `vocabulaire.yaml` : à la racine du site (mots du site), à la racine d'un paquet (mots du paquet), ou dans le catalogue (`components/vocabulaire.yaml`, mots natifs). Il s'emploie dans une forme comme une primitive. Un vocabulaire ajoute des mots : il ne redéfinit ni une primitive, ni un mot déjà visible.

<!-- sitec: vocabulaire.yaml -->
```yaml
mots:
  carte de visite:
    description: Une personne, son rôle et un lien pour la joindre.
    données:
      nom: texte
      role: texte, facultatif
      lien: lien, facultatif
    forme:
      - carte « fiche »:
          - sous-titre: nom
          - texte discret: role
          - bouton discret: lien
    apparence:
      fiche: centré

  encadré:
    description: Un cadre avec un titre, autour de ce qu'on écrit dessous.
    données:
      titre: texte, facultatif
    forme:
      - bloc « cadre »:
          - titre: titre
          - contenu
    apparence:
      cadre: bordure, coins arrondis

  heure:
    description: Une heure, balisée pour les machines (<time>).
    données:
      moment: texte — au format 07:30
    gabarit: |
      <p class="heure">Ouvert dès <time datetime="{{ moment }}">{{ moment | replace(':', ' h ') }}</time></p>
    feuille: |
      .heure{font-weight:600;color:var(--color-primary)}
```

Un composant du site les emploie, `components/annuaire/manifest.yaml` :

<!-- sitec: components/annuaire/manifest.yaml -->
```yaml
description: L'équipe, une carte par personne, dans un cadre.
données:
  title: texte, facultatif
  open: texte, facultatif — heure d'ouverture (08:30)
  people (liste, au moins 1):
    name: texte
    job: texte, facultatif
    contact: lien, facultatif
forme:
  - encadré, title:
      - heure: open
      - grille de people, 3 colonnes:
          - carte de visite: name, job, contact
```

<!-- sitec: fragment sections -->
```yaml
- annuaire:
    title: L'équipe
    open: "08:30"
    people:
      - { name: Claire Martin, job: Gérante, contact: { label: Écrire, to: "mailto:claire@exemple.fr" } }
      - { name: Marc Leroy, job: Plombier }
```

| Dans la définition d'un mot | Signifie |
|---|---|
| `description` | obligatoire : une phrase qui dit ce que le mot affiche ; `sitec catalog` et `sitec explain` la montrent |
| `données` | ce que le mot reçoit, écrit comme le bloc `données` d'un composant ; l'ordre de déclaration est l'ordre d'appel, les obligatoires d'abord |
| `forme` | le mot défini par des primitives et par d'autres mots ; `contenu` marque la place des éléments que l'appelant écrit sous le mot |
| `apparence` | l'allure des parties de cette forme, avec les intentions d'un composant |
| `gabarit` | à la place de `forme`, quand aucune primitive ne produit le balisage voulu : un fragment de gabarit neutre (plus bas), sans script |
| `feuille` | la CSS du fragment, encadrée comme celle d'un composant : chaque sélecteur commence par la classe du mot (`.heure`, `.carte-de-visite-photo`), couleurs par les jetons |

Dans une forme, `- mot: a, b` passe les données dans l'ordre de la définition (un nom de donnée du composant, « un texte », un nombre, `oui`, `non`, ou `rien` pour sauter une donnée facultative). Un mot dont la définition emploie `contenu` reçoit des éléments : `- mot, a:` puis la liste en dessous. Une donnée obligatoire du mot liée à une donnée facultative du composant rend l'élément conditionnel, comme pour une primitive. Un mot ne prend pas de nom entre « » : ses classes viennent de sa définition, et ses parties nommées (`fiche`, `cadre`) s'ajoutent à celles que l'apparence du composant peut viser.

La portée est fermée : un mot ne lit que ses données, plus `site` et `page` dans un fragment de gabarit ; il ne voit ni les données du composant qui l'emploie, ni les variables d'une liste en cours. Ce qu'il produit entre dans le gabarit du composant à la compilation : `sitec component show` montre le mot développé, et rien n'est résolu à l'exécution. La feuille d'un mot est émise une seule fois dans la feuille du site, et seulement si un composant utilisé l'emploie.

Un mot de paquet s'écrit sans préfixe dans les composants du paquet et avec le préfixe depuis le site (`- vitrine.mention: note`). Mots natifs : `ligne de tarif`, `adresse`, `itinéraire`, `carte à la demande`, `carte de collection`, `état d'ouverture`, `tableau des horaires`, `consultation récente`, `événement d'achat`, `événement de vue de produit`, `événement de début de commande`, `aperçu de produit`, `reçu de commande`, `carte de produit`, `ajout au panier`, `fiche de produit`, `tableau du panier`, `totaux du panier`, `formulaire de commande`, `récapitulatif du panier`, `contact en colonnes`, `formulaire de contact`, `coordonnées du site` ; les natifs `pricelist`, `map`, `collection.list`, `hours`, `recent`, `contact.form`, `products.grid`, `product.hero`, `products.related`, `cart.page`, `checkout.page`, `order.confirmation` sont écrits avec eux. `sitec catalog <dossier>` liste les mots visibles avec leur origine, `sitec explain "<mot>" <dossier>` affiche la définition elle-même (forme ou fragment, apparence, feuille) et la ligne où elle se trouve.

Une erreur dans la définition d'un mot est rapportée une fois, à sa ligne dans `vocabulaire.yaml` (`E_WORD`) : nom d'une primitive, description manquante, donnée obligatoire après une facultative, donnée inconnue dans la forme, variable inconnue ou `<script>` dans un fragment, sélecteur hors du mot dans la feuille. Les composants qui emploient ce mot ne la répètent pas. Une erreur d'emploi (mot mal écrit, donnée en trop, éléments sous un mot qui n'en contient pas) est rapportée à la ligne du manifeste (`E_COMPONENT`), avec le mot le plus proche ou l'écriture attendue.

Ce que le vocabulaire ne fait pas : un mot n'a pas de fonctionnement à lui (il ne lit rien à la visite et ne déclare pas de formulaire : c'est le composant qui lit, et qui lui passe ce qu'il a lu) et ne déclare pas de comportement navigateur nouveau ; il peut poser les attributs d'un comportement existant (`data-sl-map`, `data-sl-copy`…) et, dans un fragment, le formulaire d'une action de la cible (`ajout au panier` poste vers `/_cart` avec `{{ csrf() }}`).

### Fonctionnement

Ce que le composant fait au-delà de l'affichage. Deux fonctionnements : `lit`, ce qu'il lit à chaque visite, et `formulaire`, ce qu'il fait d'une saisie. Un formulaire écrit dans un registre, et ce registre peut avoir des règles : c'est ainsi qu'un composant déclare un état que le serveur tient pour lui (des places, une liste d'attente).

#### Lire à la visite

Certaines choses ne se savent qu'au moment de la visite : le stock qui reste, le panier du visiteur, si la boutique est ouverte en ce moment. Le composant les demande à la cible par une **source**, une ligne par lecture, « nom: source, paramètre donnée » ; le nom se lit ensuite dans la forme comme une donnée. `components/a-saisir/manifest.yaml` :

<!-- sitec: components/a-saisir/manifest.yaml -->
```yaml
description: Quelques produits de la boutique, avec leur stock du moment et l'ajout au panier.
données:
  title: texte, facultatif
  category: texte, facultatif — ne montrer qu'une catégorie
  limit: nombre entier, facultatif, de 1 à 6, par défaut 3
fonctionnement:
  lit:
    produits: produits de la boutique, catégorie category, limite limit
forme:
  section, seulement si produits:
    - en-tête: title
    - grille de produits, 3 colonnes:
        - carte:
            - titre: name
            - texte: price_text
            - texte discret: stock_text
            - si in_stock:
                - ajout au panier: id, category
            - sinon:
                - texte discret: « Épuisé »
```

<!-- sitec: fragment sections -->
```yaml
- a-saisir: { title: À saisir cette semaine, limit: 3 }
```

| Source | Paramètres | Ce qu'elle rend |
|---|---|---|
| `produits de la boutique` | `catégorie`, `vedettes`, `tri`, `limite` | la liste des produits de `data/products.yaml`, avec le stock restant |
| `produit de la page` | aucun | le produit d'une page `source: products` |
| `produits voisins` | `limite` | les autres produits de la catégorie du produit de la page |
| `panier du visiteur` | aucun | les lignes du panier, ses totaux, les liens vers le panier et la commande |
| `saisie de la commande` | `précisions` | les champs du formulaire de commande, la saisie conservée, les erreurs, le mode de paiement |
| `commande de la page` | aucun | la commande d'une page `source: orders` : lignes, totaux, statut, où en est le paiement |
| `état du registre` | `registre` | où en est le registre d'un formulaire : envois comptés, places prises et restantes (par groupe), liste d'attente |
| `horaires du moment` | `jours`, `fuseau` | ouvert ou fermé en ce moment, prochaine ouverture, plages de chaque jour |
| `consultations récentes` | `limite`, `types` | ce que le visiteur a consulté, s'il a accepté la personnalisation |

`sitec explain "<source>"` donne ses champs un par un (`name`, `price_text`, `in_stock`, `stock_text`…) ; `sitec catalog` liste les sources. Une valeur de paramètre est une donnée du composant (`limit`, `filter.category`), un nombre, `oui`, `non` ou « un texte ». La forme connaît le type de chaque champ lu : un champ mal écrit est une erreur à la ligne du manifeste, avec le champ le plus proche. Une source mal écrite ou un paramètre inconnu sont signalés à la ligne de la lecture, une seule fois.

Une source est un **service de la cible** : la boutique, les horaires, la mémoire du visiteur. Le langage dit ce qu'on lui demande et connaît la forme de ce qu'elle rend ; il ne décrit pas comment elle le calcule (`docs/CIBLES.md`). Les **actions** suivent la même frontière : un composant ne modifie pas le panier, il affiche le formulaire d'une action que la cible exécute, par un mot natif (`ajout au panier`, `tableau du panier`, `formulaire de commande`). Tous les composants natifs à état sont écrits ainsi, et un composant de site ou de paquet dispose des mêmes sources et des mêmes mots. `sitec component show` montre l'appel produit pour chaque lecture.

Deux conséquences. Une page qui contient un composant qui lit n'est pas servie depuis le cache statique : ce qu'il lit change d'une visite à l'autre. Et un cas de test fournit lui-même ce qui serait lu, sous la clé `à la visite`, vérifié contre ce que la source annonce : le rendu ne dépend ni du stock ni de l'heure. `components/a-saisir/fixtures/un-produit.yaml` :

<!-- sitec: components/a-saisir/fixtures/un-produit.yaml -->
```yaml
title: À saisir
à la visite:
  produits:
    - { id: savon-miel, name: Savon miel et avoine, price: 6.9, price_text: "6,90 €", stock: 2, stock_text: Plus que 2 en stock, in_stock: true, max_qty: 2 }
```

Ce que `lit` ne fait pas : écrire. Une lecture ne change rien sur le serveur, et les sources sont celles que la cible fournit. L'écriture qu'un composant déclare lui-même est le formulaire, ci-dessous ; l'état qu'il déclare lui-même est le registre de ce formulaire et ses règles, plus bas, que la source `état du registre` permet de relire.

#### Recueillir une saisie

Ce que le composant fait d'une saisie, une fois envoyée au serveur. Exemple complet, `components/demande-devis/manifest.yaml` :

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
| `places: 12 par seance` | nombre de places du registre ; règle détaillée plus bas |
| `si complet: texte` | message de refus quand il n'y a plus de place |
| `liste d'attente: texte` | au lieu de refuser, l'envoi est mis en attente ; `oui`, `non`, ou le message affiché |
| `une fois par: email` | un seul envoi par valeur de ce champ, ou de ces champs (`email, seance`) |
| `si déjà inscrit: texte` | message affiché au second envoi |
| `champs:` puis une ligne par champ | « nom: type, précisions — Libellé (ex. exemple affiché dans le champ) » |
| `texte`, `texte long`, `e-mail`, `téléphone`, `nombre`, `date`, `choix` | types de champ (`texte` par défaut) |
| `facultatif` | champ non obligatoire (tout champ est obligatoire sinon) |
| `choix, un parmi a, b, c` | liste déroulante ; toujours en dernier avant « — » |
| `si champ vaut valeur` | champ affiché et validé seulement dans ce cas ; le champ cité est déclaré plus haut, la valeur est l'une des siennes |

Les noms `name`, `email`, `phone`, `subject`, `message` ont leur type et leur libellé habituels : rien à écrire après les deux-points. La forme place le formulaire (`- formulaire, bouton Demander un devis`) ; un formulaire déclaré que la forme n'affiche pas est une erreur, comme un `champ:` que le fonctionnement ne déclare pas. Le bloc se compile vers les effets déclarés décrits plus bas : le compilateur fournit validation serveur, jeton CSRF, pot de miel, enregistrement et e-mail. `effects` (format machine) et `fonctionnement` ensemble sont refusés.

#### Tenir un registre : places, liste d'attente, une fois par personne

Un formulaire range ses envois dans un registre. Des règles font de ce registre un état que le serveur tient : un nombre de places, une liste d'attente, un seul envoi par personne. `components/stage/manifest.yaml` :

<!-- sitec: components/stage/manifest.yaml -->
```yaml
description: Inscription à un stage, douze places par séance, liste d'attente quand la séance est complète.
données:
  title: texte, facultatif
fonctionnement:
  lit:
    places: état du registre
  formulaire:
    enregistre dans: stages
    confirmation: Votre place est réservée.
    places: 12 par seance, comptées par personnes
    liste d'attente: Cette séance est complète, vous êtes sur la liste d'attente.
    une fois par: email, seance
    si déjà inscrit: Cette adresse est déjà inscrite à cette séance.
    champs:
      seance: choix, un parmi Samedi matin, Samedi après-midi — Séance
      personnes: nombre — Nombre de personnes (ex. 2)
      name:
      email:
forme:
  - en-tête: title
  - liste de places.groups:
      - élément:
          - texte: value
          - badge: left_text
  - formulaire, bouton Réserver
```

<!-- sitec: fragment sections -->
```yaml
- stage: { title: Stage du samedi }
```

| Règle | Ce que le serveur fait |
|---|---|
| `places: 12` | au plus douze envois comptés dans le registre |
| `places: 12 par seance` | douze par valeur du champ `seance` ; ce champ est obligatoire, de préférence un `choix` (ses valeurs sont alors les seuls groupes possibles) |
| `places: 12 par seance, comptées par personnes` | chaque envoi compte pour la valeur de `personnes`, un champ `nombre` obligatoire : un entier d'au moins 1, au plus le nombre de places |
| `si complet: …` | l'envoi qui ne tient plus est refusé avec ce message, suivi de ce qui reste (« Il reste une place. ») |
| `liste d'attente: …` | il est enregistré en attente, ne prend aucune place, et le visiteur lit ce message |
| `une fois par: email, seance` | un envoi qui répète ces valeurs (casse et espaces ignorés) est refusé avec le message de `si déjà inscrit` |

Les règles sont appliquées au moment d'enregistrer, sous un verrou propre au registre : le contrôle et l'écriture ne font qu'un, deux envois simultanés ne peuvent pas prendre la même dernière place. Rien n'est lu depuis la requête : ni le nombre de places, ni la liste des groupes. Dans le formulaire, une valeur complète du champ qui groupe est marquée (« — complet », non sélectionnable, ou « — liste d'attente »).

La source `état du registre` relit cet état à la visite : `left_text` (« 3 places restantes », « Dernière place », « Complet »), `left`, `full`, `count`, `waiting`, et `groups` (`value`, `taken`, `left`, `left_text`) quand les places se comptent par groupe. Sans paramètre, elle lit le registre du formulaire du même composant ; un autre composant le lit par son nom (`places: état du registre, registre stages`), par exemple pour annoncer les places restantes sur la page d'accueil. Un registre sans règle se lit aussi : `count` compte ses envois (signatures, réponses).

Au back-office, onglet « Formulaires », chaque envoi porte son statut (inscrit, en attente, annulé) et le registre son décompte par groupe. Annuler un envoi rend sa place ; « Donner la place » fait passer un envoi en attente parmi les inscrits s'il tient dans les places libres ; rétablir un envoi annulé le remet inscrit, ou en attente s'il n'y a plus de place. Ces trois gestes recomptent les places sous le même verrou. Un envoi annulé reste dans le registre et dans l'export CSV.

Un registre n'a qu'une série de règles : deux composants qui écrivent dans le même registre avec des règles différentes sont refusés (`E_STORE_RULES`), comme la lecture d'un registre qu'aucun formulaire n'écrit (`E_UNKNOWN_STORE`). Une règle qui cite un champ inconnu, facultatif ou conditionnel est une erreur à sa ligne.

Ce que les règles ne font pas. Le passage de la liste d'attente aux inscrits n'est pas automatique : il se fait au back-office. Il n'y a ni date limite, ni paiement, ni règle entre deux registres, ni calcul libre : un état qui demande autre chose que compter, grouper et dédoublonner les envois d'un formulaire reste hors du langage, et `custom` reste la porte de sortie.

### Voir ce qu'un composant produit

`sitec component show <dossier> <nom>` affiche, bloc par bloc, les lignes du manifeste puis ce que le compilateur en tire : schéma JSON des props, effets, gabarit neutre, comportements ajoutés, parties que l'apparence peut viser, feuille de base des primitives et feuille de l'apparence. `--php` ajoute le PHP exécuté par le serveur, `--json` donne la même chose en données (`blocks[].source.from`, `.to`, `.output`). Rien n'y est recalculé : c'est l'entrée de catalogue que `check` et `build` utilisent.

Mesure (`scripts/measure-format.mjs`) : sur sept composants natifs et trois composants de projet, ce que l'auteur écrit passe de 3 696 à 1 372 tokens (−63 %) et de 481 à 145 lignes, formulaire du devis écrit en `fonctionnement` compris. Les sept natifs réécrits en forme en v0.7.0 produisent les 36 pages des exemples identiques au caractère près (`scripts/snapshot-pages.mjs --compare`) ; `team`, réécrit en v0.8.0, garde ses props mais change de rendu (portrait rond ou initiale), sur trois pages.

Les six natifs portés en v0.10.0 avec le vocabulaire (`hero`, `gallery`, `richtext`, `pricelist`, `map`, `collection.list`) gardent leurs props (`scripts/compare-props.mjs v0.9.0 …`) et leurs 36 pages, à cinq changements de balisage voulus près (classes de variante, attributs `data-sl-…`). Le gain d'écriture y est plus faible, et `scripts/measure-vocabulaire.mjs` le dit : 4 651 tokens avant, 3 790 après (19 % de moins), dont 1 800 pour le vocabulaire natif, compté en entier. Ce qui change est la nature du reste : 131 lignes de gabarit réparties dans six composants deviennent 32 lignes dans cinq mots, nommés, documentés et réutilisables par tout composant.

Les neuf natifs à état portés en v0.11.0 avec les lectures à la visite (`hours`, `recent`, `contact.form` et la boutique) gardent leurs props (quatre valeurs par défaut ajoutées) et leurs pages. Le volume écrit ne baisse presque pas (`scripts/measure-vocabulaire.mjs état` : 10 385 tokens avant, 9 480 après, dix-huit mots compris), et la logique n'a pas disparu : 308 lignes de gabarit PHP sont devenues 153 lignes de gabarit neutre dans des mots, plus 133 lignes de fonctions de source dans la cible. Le gain est ailleurs : aucun composant ne contient plus de code de la cible, chaque champ lu est typé et vérifié avant la compilation, et un composant de site dispose des mêmes sources et des mêmes actions que le catalogue.

### Gabarit

| Construction | Sens |
|---|---|
| `{{ expr }}` | sortie échappée ; HTML sûr seulement pour `link`, `img`, `icon`, `paragraphs`, `markup`, `field`, `lines`, `csrf`, `event` en tête d'expression |
| `{% if e %} … {% elif e %} … {% else %} … {% endif %}` | condition |
| `{% for x in e %} … {% endfor %}`, `{% for k, x in e %}` | boucle ; `loop.index`, `loop.index0`, `loop.first`, `loop.last`, `loop.count` |
| `{% set x = e %}` | valeur locale |
| `{% form %} … {% endform %}` | formulaire déclaré par `fonctionnement` (ou `effects.form`) : méthode, nom, jeton, pot de miel |
| `{# … #}` | commentaire |

Variables : `p` (props, vérifiées contre le manifeste), `site`, `page`, `item`, `product`, `order`, `form`, `loop`, `cart`, `shop`. Fonctions : `link(lien, classe)`, `img(chemin, alt, sizes, eager)`, `img_src(chemin, largeur)`, `asset(chemin)`, `url(cible)`, `icon(nom)`, `paragraphs(texte)`, `markup(texte)`, `lines(texte)` (retours à la ligne conservés), `money(n)`, `field(nom)`, `csrf()` (jeton d'un formulaire d'action de la cible), `event(nom, clé, valeur…)` (marque invisible d'un événement de mesure).

La vérification refuse, avec le numéro de ligne : PHP ou tout code de cible, variable inconnue, prop absente du manifeste, clé inconnue d'un élément de liste typé, balise déséquilibrée, filtre ou fonction inconnus, `form` sans formulaire déclaré. Pour un composant au format langage, ces erreurs portent sur `manifest.yaml`, à la ligne de la forme (`E_COMPONENT`) ; pour le fragment d'un mot, sur `vocabulaire.yaml`, à la ligne du fragment (`E_WORD`) ; pour un gabarit écrit à la main, sur `template.html` (`E_TEMPLATE`). Le balisage ne contient pas de code navigateur : `<script>`, attributs `on…=`, liens `javascript:`, `<iframe>`, `<object>`, `<embed>`, `<link>`, `<meta>`, `<base>` sont refusés.

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
| `map` | conteneur `data-sl-map="latitude,longitude,zoom"` et son bouton : la carte OpenStreetMap n'est chargée qu'au clic (aucun appel à un tiers avant) |
| `copy` | bouton `data-sl-copy="texte"` |

Au format langage, ces attributs ne s'écrivent pas : les primitives à comportement et le mot natif `carte à la demande` les posent. Attributs posés sans déclaration : erreur `E_BEHAVIOR` ; comportement déclaré mais absent du gabarit : avertissement. Un `module.js` reste possible pour un besoin hors de cette liste, avec l'avertissement `W_MODULE_JS` : son code n'est pas vérifié.

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

### Vocabulaire, cas de test, paquet et hôte en documents

Les autres fichiers d'un composant et de ce qui l'entoure s'écrivent de la même façon, sans YAML.

**Vocabulaire** : `vocabulaire.md` à la place de `vocabulaire.yaml` (site, paquet ; le vocabulaire natif est écrit ainsi). Une section `## mot` par mot, sa description, puis `### Données`, `### Forme` et `### Apparence` en puces, `### Gabarit` et `### Feuille` dans des blocs.

<!-- sitec: aucun — le site d'essai de ce document a déjà un vocabulaire.yaml ; scripts/verify-site-document.mjs lit cette écriture -->
```markdown
# Vocabulaire

## carte de visite
Une carte avec un nom et un rôle.

### Données
- nom : texte
- role : texte, facultatif

### Forme
- carte « fiche » :
  - sous-titre : nom
  - texte discret : role

### Apparence
- fiche : centré
```

**Cas de test** : `components/<nom>/fixtures/<cas>.md` à la place de `<cas>.yaml`. Le composant y est écrit comme une section de page ; pour un composant qui lit à la visite, « À la visite : » suivi d'un bloc `yaml` dit ce que chaque lecture rendrait. Les lignes « > … » sont des notes.

<!-- sitec: aucun — cas de test d'un composant, lu par sitec test ; scripts/verify-site-document.mjs lit cette écriture -->
```markdown
## annonce
-15 % sur l'entretien annuel de chaudière
Code : ENTRETIEN15
```

**Paquet** : `package.md` à la place de `package.yaml` (`# vitrine`, la description, `Version : 1.0.0`, `Langage : 1`). **Hôte** : `hosts.md` à la place de `hosts.yaml`, une puce « - domaine | alias, alias | ../dossier-du-site » par site.

`sitec rediger` convertit tous ces fichiers, dans un site, un paquet ou un hôte, ainsi que les composants composés (`components.md`, section 5). Reste en YAML, dans un cas de test, ce qu'une lecture rendrait « à la visite ».

## 6 bis. Paquets de composants

Un paquet regroupe des composants à gabarit et des composés, partagés par plusieurs sites :

```
<paquet>/
  package.yaml      name: vitrine (préfixe), description, version, language
  components/<nom>/ composants à gabarit neutre (même format qu'un composant de projet, fixtures/ comprises)
  components.yaml   composés du paquet (ou components.md)
  vocabulaire.yaml  mots du paquet (facultatif)
```

Un site les déclare à la racine de `site.yaml` : `packages: [ ./paquets/vitrine, @acme/devanture-composants ]`. Un chemin commençant par `.` ou `/` est relatif au site ; un nom est cherché dans `node_modules/` (paquet npm ou dépôt git installé). Les composants sont exposés préfixés : `vitrine.encart`, `vitrine.contact-rapide` ; un composé du paquet cite les composants du paquet par leur nom complet. Les mots du paquet suivent la même règle : sans préfixe dans les formes du paquet, `vitrine.mention` dans celles du site. Le préfixe est unique, ne peut pas être une famille du catalogue natif (`products`, `order`…), et un paquet écrit pour une version de langage inconnue est refusé. L'atelier navigateur ne voit que les fichiers du site : pour un site qui l'embarque, le paquet se range sous le site (`./paquets/…`), sinon `check` avertit (`W_PACKAGE_STUDIO`).

## 6 quater. Composants décrits en langage naturel

`sitec component new <dossier> <nom> --describe "…" --export consigne.json` (ou `--from description.md`) écrit la consigne et le schéma de sortie à soumettre à un modèle ; sa réponse s'importe par `--import reponse.json`. Le modèle rend un plan (`composant.md`) et des cas de test écrits comme des sections de page (`fixtures/<cas>.md`, avec « À la visite : » et un bloc yaml pour ce que ses lectures rendraient) : ni manifeste ni YAML d'auteur. Les erreurs de vérification citent la ligne du plan. `component edit` lit un composant écrit en plan ou en manifeste ; dans le second cas il le montre en plan au modèle, dont la réponse le récrit ainsi. Le compilateur n'appelle lui-même aucun modèle. Par défaut, la consigne demande le format langage (données, forme, apparence et cas de test : aucun HTML ni CSS) ; `--format html` demande gabarit et feuille. Le guide donné au modèle est construit depuis le compilateur (vocabulaire du gabarit, filtres, comportements, jetons, pictogrammes, deux composants natifs de référence) et le contexte du site (thème, images, noms déjà pris, mots du vocabulaire utilisables avec leurs données). La proposition est écrite dans `components/<nom>/`, puis vérifiée comme tout composant (`check`, règles CSS, comportements, cas de test rendus) ; si elle ne passe pas, `--import reponse.json --export reparation.json` écrit la consigne du tour suivant, avec les erreurs et les avertissements. La description reste dans `components/<nom>/description.md`, source lisible ; le reste est figé et versionné. La compilation n'appelle jamais le modèle.

`sitec component edit <dossier> <nom> --ask "…" --export consigne.json` prépare la modification d'un composant existant : la consigne porte les fichiers actuels et la demande ; à l'import, la même vérification s'applique et la demande s'ajoute à l'historique de `description.md`. `--package chemin` écrit dans un paquet déclaré par le site (nom court dans le manifeste, nom préfixé dans les pages).

`sitec component preview <dossier> <nom>` écrit `.devanture/preview/<nom>.html` : tous les cas de test rendus avec la feuille du site et ses comportements, des boutons pour essayer les trois thèmes et une largeur de téléphone. `new` et `edit` la produisent après chaque succès : c'est l'outil de la relecture visuelle, que la vérification ne remplace pas.

## 6 quinquies. Composant écrit comme un document (prototype)

Un composant peut s'écrire en phrases, dans `components/<nom>/document.md`, à la place de `manifest.yaml` (l'un ou l'autre, jamais les deux). Le compilateur lit ce document sans modèle de langage : un lexique, une table de tournures, et trois garde-fous. Ce qu'il en comprend est un manifeste au format langage, figé dans `components/<nom>/lecture.yaml` ; c'est cette lecture qui est compilée, par le chemin habituel.

C'est un prototype, et son domaine est étroit : une section à formulaire avec son registre (titre et introduction, champs, bouton, messages, places, liste d'attente, inscription unique, e-mail au site, affichage des places restantes). Tout le reste s'écrit au format langage.

<!-- sitec: components/degustation/document.md -->
```markdown
# Dégustation

Inscription à une dégustation, douze places par date.

La section commence par un titre, donné par la page.
Le visiteur choisit sa date (14 mars ou 11 avril), indique son nom et son e-mail.
Il y a 12 places par date.
Quand une date est complète, l'inscription est refusée et le visiteur lit : « Cette date est complète. »
Une même adresse e-mail ne s'inscrit qu'une fois par date.
Les inscriptions sont rangées dans le registre « degustations » et nous sommes prévenus par e-mail.
```

Le titre `#` nomme le document, la première ligne de texte est la description du composant, les intertitres `##` sont libres et ne sont pas lus, une ligne « Mots-clés : a, b » donne les intentions. Ensuite, une phrase dit une chose (deux, jointes par « et » ou « ; »). `sitec lire <dossier>` redit chaque phrase comme elle est comprise, et `sitec lire <dossier> --accepter` écrit la lecture :

<!-- sitec: components/degustation/lecture.yaml -->
```yaml
# Lecture de document.md par sitec : ce que le compilateur a compris, au format langage.
# Ne modifiez pas ce fichier : corrigez document.md, relisez « sitec lire », puis acceptez (« sitec lire <dossier> --accepter »).
name: degustation
description: Inscription à une dégustation, douze places par date.
données:
  title: texte, facultatif — titre de la section
fonctionnement:
  formulaire:
    enregistre dans: degustations
    prévient par e-mail: oui
    places: 12 par date
    si complet: Cette date est complète.
    une fois par: email, date
    champs:
      date: choix, un parmi 14 mars, 11 avril — Date
      name: null
      email: null
forme:
  - en-tête: title
  - formulaire, bouton Envoyer
example: |
  - degustation:
      title: Dégustation
```

Les deux fichiers se suivent dans git. `sitec component show <dossier> <nom>` commence alors par le document, phrase par phrase, puis montre la lecture bloc par bloc comme pour un manifeste.

### Ce que le lecteur tolère, et ses trois garde-fous

L'ordre des mots, les synonymes du lexique (« places », « participants » ; « s'appelle », « porte le texte » ; « rangées », « enregistrées »), les nombres en lettres, les mots de liaison et une faute de frappe d'une lettre sont tolérés ; une correction est dite dans la lecture (« lu comme … »).

1. **Tout mot doit avoir un rôle.** Une phrase est lue par une tournure seulement si chacun de ses mots est expliqué par elle. « Il y a 8 places par séance pendant les vacances » n'est pas lue « 8 places par séance » : elle est refusée (`E_DOCUMENT`, à la ligne de `document.md`), avec la tournure la plus proche et les mots restés sans rôle.
2. **Une seule lecture.** Si deux tournures expliquent la phrase, ou si elle se coupe de deux façons, elle est refusée et les deux lectures sont citées. Aucune n'est choisie.
3. **La lecture est figée.** Tant que `lecture.yaml` n'existe pas, ou dès que le document ou le lecteur donne une lecture différente, `check` et `build` s'arrêtent (`E_READING`) en citant ce qui a changé (« places: 8 par seance » est maintenant lu « places: 10 par seance »). Rien ne repart sans `sitec lire <dossier> --accepter`, qui n'écrit rien tant qu'une phrase est refusée. Une mise à jour du compilateur ne change donc jamais un site en silence.

Trois choses ne sont jamais devinées : un nombre (il doit être écrit, et un nombre sans rôle fait refuser la phrase), une négation (elle n'est lue que là où une tournure l'attend : « pas de liste d'attente », « n'est pas prévenu »), un destinataire (« nous », « l'équipe », « le site » ; le nom d'un commerce n'est pas reconnu, et un e-mail au visiteur n'existe pas dans cette version).

### Tournures

`sitec lire --tournures` donne la liste tenue par le lecteur. La première ligne est la phrase des champs ; les exemples suivants sont lus dans un document qui la contient.

| Ce que dit la phrase | Exemple | Ce qui est lu |
|---|---|---|
| champs du formulaire | Pour s'inscrire, le visiteur choisit sa séance (Matin ou Soir), indique le nombre de personnes (par exemple 2), son nom, son e-mail et sa ville. | formulaire : champs = seance, personnes, name, email, ville |
| titre et introduction de la section | La section commence par un titre et une introduction, donnés par la page. | données : title, intro ; forme : en-tête |
| affichage des places restantes | Les places restantes de chaque séance sont affichées, une ligne par séance. | lit : places = état du registre ; forme : une ligne par seance (valeur, places restantes) |
| présentation des lignes de places | Ces lignes sont présentées côte à côte, avec un espace au-dessus. | apparence : en ligne, espace au-dessus |
| texte du bouton du formulaire | Le bouton s'appelle « Réserver ». | forme : formulaire, bouton Réserver |
| message après un envoi réussi | Après l'inscription, le visiteur lit : « Votre place est réservée. » | formulaire : confirmation = « Votre place est réservée. » |
| nombre de places du registre | Il y a 8 places par séance, comptées par personnes. | formulaire : places = 8 par seance, comptées par personnes |
| liste d'attente quand c'est complet | Quand une séance est complète, l'inscription va en liste d'attente. | formulaire : liste d'attente = oui |
| pas de liste d'attente | Il n'y a pas de liste d'attente. | formulaire : liste d'attente = non |
| refus quand c'est complet | Quand une séance est complète, l'inscription est refusée et le visiteur lit : « Cette séance est complète. » | formulaire : si complet = « Cette séance est complète. » |
| un seul envoi par personne | Une même adresse e-mail ne s'inscrit qu'une fois par séance. | formulaire : une fois par = email, seance |
| ce que compte un envoi | Les places sont comptées par personnes. | formulaire : places comptées par personnes |
| un envoi compte pour une place | Chaque inscription réserve une place. | formulaire : un envoi compte pour une place |
| pas de limite de places | Il n'y a pas de limite de places. | formulaire : pas de règle de places |
| champs obligatoires et facultatifs | Le nom et l'e-mail sont obligatoires, la ville est facultative. | formulaire : obligatoires = name, email ; facultatifs = ville |
| message au second envoi | Si la même adresse s'inscrit de nouveau, le visiteur lit : « Vous êtes déjà inscrit. » | formulaire : si déjà inscrit = « Vous êtes déjà inscrit. » |
| registre où ranger les envois | Les inscriptions sont rangées dans le registre « ateliers ». | formulaire : enregistre dans = ateliers |
| e-mail à chaque envoi | Nous sommes prévenus par e-mail. | formulaire : prévient par e-mail = oui |

Dans la phrase des champs, un champ se dit avec son article (« son nom », « la séance », « un message ») ; `name`, `email`, `phone`, `subject` et `message` sont reconnus à leur nom courant, « le nombre de … » est un champ nombre, « la date … » un champ date, des valeurs entre parenthèses font un choix, « (par exemple 2) » donne l'exemple, et « il peut … » rend facultatif ce qui suit. Dans les autres phrases, un champ se désigne par les mots de son libellé (« par séance », « la taille du panier », « le nombre de paniers ») ; un mot qui désigne deux champs fait refuser la phrase, les deux champs cités, sauf si un mot voisin tranche (« paniers souhaités »). Après la lecture de chaque phrase, le lecteur vérifie leur accord : un message de liste d'attente sans places, deux nombres de places, des places « par salle » quand aucun champ ne s'appelle ainsi sont des erreurs.

### Faire récrire les phrases refusées

Un texte libre fait refuser une phrase sur deux. `sitec lire <dossier> --recrire --export p.json` écrit la consigne (`system`, `user`) qui soumet les phrases refusées à un modèle, et `--recrire --import r.json` applique sa réponse. Le modèle propose pour chacune une phrase dans une tournure connue, ou dit ce qui ne peut pas être dit. Le modèle ne décide de rien :

1. **Deux contrôles sans modèle.** Une réécriture est refusée si elle contient un nombre que la phrase d'origine ne donne pas, une valeur de choix qu'elle ne donne pas, ou si un texte entre « » est changé, ajouté ou perdu. Seul un nom de registre se normalise (« visites guidees » devient « visites_guidees »).
2. **Le lecteur relit.** Le document est relu avec la phrase récrite ; elle n'est gardée que si le lecteur la lit et qu'aucun autre refus n'apparaît. Pour une réécriture refusée, `--import r.json --export p2.json` écrit la consigne d'un second tour, avec le message du lecteur.
3. **Rien n'est accepté.** `document.md` est récrit (`--dry-run` pour seulement voir). Chaque phrase est montrée avec sa réécriture, ce que le lecteur en lit et la supposition du modèle (« La ferme » désigne le site). La lecture reste à relire, puis à figer par `sitec lire <dossier> --accepter` ; `--recrire --accepter` est refusé.

Ce que ces contrôles ne voient pas : une réécriture qui se lit et dit autre chose que la phrase d'origine. « Le tarif est de 35 euros par personne », récrit « Il y a 35 places. », passe les trois étapes. Seule la lecture redite le montre, et c'est pourquoi elle n'est jamais acceptée d'office : relisez chaque « lu » et chaque « suppose ».

L'identifiant de chaque phrase porte sa ligne et une empreinte de son texte : une réponse faite pour un autre état du document ne s'applique à aucune phrase.

### Ce qui est mesuré

- **Même site.** `examples/le-fournil/components/atelier` est écrit en document. Compilé, le site est identique, fichier par fichier, à celui que donne le manifeste écrit à la main qu'il remplace (`scripts/reference/atelier.manifest.yaml`), à l'horodatage de compilation près. `scripts/verify-document.mjs` le vérifie, avec les trois garde-fous.
- **Pas plus court.** Pour ce composant, le document pèse 301 tokens et le manifeste 307 : le gain n'est pas de volume, il est de lecture par quelqu'un qui ne connaît pas le format.
- **Tolérance limitée.** Neuf textes, rédigés par des modèles à qui l'on n'avait montré ni le lexique ni les tournures, ont été lus en trois lots, chaque lot par le lecteur tel qu'il était avant de le voir : 3 phrases lues sur 30, puis 13 sur 31, puis 10 sur 30. Le lecteur a été élargi d'après les deux premiers lots (28 sur 30 et 29 sur 31 aujourd'hui) et, pour le troisième, seulement sa phrase des champs (14 sur 30). Un texte libre demande donc encore qu'on reprenne une phrase sur deux, guidé par les refus. Aucune des 23 phrases lues au premier passage des lots 2 et 3 ne l'a été de travers ; pendant la mise au point, trois lectures fausses sont passées, que seule la lecture redite a montrées. Les textes sont dans `scripts/reference/redactions/`, la mesure du lecteur actuel dans `scripts/measure-document.mjs`.
- **Réécriture.** Les 20 phrases que le lecteur refuse dans ces neuf textes ont été soumises à `--recrire`, mêlées à 13 phrases qu'aucune tournure ne peut dire sans perdre quelque chose (un tarif, « sauf le dimanche », « une fois par mois »). Claude Opus, au premier tour : 19 phrases récrites, toutes lues comme le corrigé écrit d'avance, une laissée à juste titre (« une fois par semaine », une période), et les 13 autres laissées. Avant l'intégration, avec la même consigne à deux formes près : Claude Sonnet 18 sur 20 (un second tour pour une phrase), Claude Haiku 14 sur 20, aucune lue de travers, 13 sur 13 laissées. C'est une mesure, faite une fois par modèle, sur peu de phrases, avec des textes rédigés par des modèles et des pièges rédigés par l'auteur du lecteur : pas encore un texte de client. `scripts/verify-document.mjs` vérifie le mécanisme (contrôles, jugement du lecteur, lecture non acceptée) avec des réponses fixes, sans appeler de modèle.

## 6 sexies. Site écrit comme des documents (prototype)

Le site et ses pages peuvent s'écrire en texte : `site.md` à la place de `site.yaml`, `pages/<id>.md` à la place de `pages/<id>.page.yaml` (l'un ou l'autre pour chaque fichier, jamais les deux). Le compilateur lit ces documents sans modèle de langage, et sans règle propre à un composant : ce qu'une ligne veut dire, il le lit dans les données que le composant déclare (son bloc `données`), dans leur ordre. Un composant de site ou de paquet se lit donc comme un natif, sans rien ajouter au lecteur.

<!-- sitec: pages/equipe.md -->
```markdown
# L'équipe du cabinet

Trois avocats associés à Bordeaux.

Adresse : /equipe

## Bandeau : Le cabinet
Fondé en 2011, un cabinet indépendant : trois associés, trois spécialités.
Alignement : gauche
Prendre rendez-vous → /contact

## Équipe : Les associés
- Me Hélène Garnier | Avocate associée, droit du travail | helene.svg | Fondatrice du cabinet.
- Me Thomas Ruiz | Avocat associé, droit des affaires
- Me Inès Kaddour | bio : Elle assiste ses clients dans les séparations et les successions.

## Chiffres
- 2011 | fondation du cabinet
- 3 | avocats associés

## Questions #questions : Avant de venir
- La première consultation est-elle gratuite ? | Oui, trente minutes, sans engagement.
- Où se garer ? | Parking Tourny, à 200 m.
```

| Dans une page | Ce que le lecteur en fait |
|---|---|
| `# Titre`, puis une ligne | le titre de la page (`seo.title`) et sa description |
| `Adresse : /equipe` | la route ; obligatoire, « / » pour l'accueil |
| `## composant : Titre` | une section : le composant par son nom du catalogue ou son nom français, puis son titre ; `## composant #ancre : Titre` pose l'`id` |
| un paragraphe | le texte libre du composant : la première donnée texte déclarée après le titre (sous-titre, introduction, texte) |
| `Nom : valeur` | une donnée, par son nom ou son nom français ; « oui » / « non », un nombre, « a, b, c » pour une liste de mots |
| `Libellé → /cible` seul sur sa ligne | le premier lien libre du composant ; cible : route, `#ancre`, `https://…`, `mailto:…`, `tel:…` |
| `- valeur \| valeur \| valeur` | un élément de la liste du composant ; les valeurs remplissent ses champs dans l'ordre de leur déclaration |
| puces en retrait | la liste d'un élément (les lignes d'un groupe de tarifs) |
| `Nom :` seul sur sa ligne | annonce la liste qui suit, si le composant en a plusieurs, ou un texte, lu alors tel quel jusqu'à la fin de la section |
| `Champs :` puis des puces | les champs d'un formulaire : un nom connu, ou `societe : facultatif — Entreprise`, dans l'écriture du bloc `fonctionnement` (type, « facultatif », « si champ vaut valeur », « un parmi a, b ») |
| `Filtre : category = savons` | un groupe de données sur une ligne, « nom = valeur, nom = valeur » ; ou `Filtre :` puis une puce « nom \| valeur » par donnée (c'est aussi l'écriture d'un groupe libre : oui / non, un nombre, sinon le texte) |
| `Variantes :` puis des puces | les variantes de la section : `- segment \| donnée : valeur \| …`, lues avec les données du composant |
| lignes en retrait sous une puce | la suite du dernier texte de la puce ; une ligne vide fait un paragraphe |
| `Dérive de : accueil` | une page dérivée : `Retire : ancre, ancre`, `Remplace :` puis `- ancre \| donnée : valeur \| …` (lu d'après le composant de la section de base), et ses sections `##` s'ajoutent à la fin |
| un bloc `yaml` | en dernier recours, une donnée trop imbriquée pour une ligne |

Dans une puce, un champ dont le type ne convient pas à la valeur est sauté : un nom d'icône va au champ icône, un fichier image au champ image, un « Libellé → /cible » au champ lien. « rien » saute un champ, « nom : valeur » en vise un. Rien ne se protège : « : », « , », « # », `{{ … }}` et les nombres s'écrivent tels quels, sans guillemets ni indentation. Les trois pièges YAML du mode d'emploi n'existent pas dans un document.

`site.md` suit les mêmes règles, avec ses propres noms :

<!-- sitec: aucun — le site d'essai de ce document est écrit en YAML ; examples/garnier-associes porte un site.md compilé par le banc -->
```markdown
# Garnier & Associés

Avocats à Bordeaux depuis 2011

Langue : fr-FR
Thème : clair
color.primary : #6b2d5c
Pied de page : Cabinet Garnier & Associés, avocats au Barreau de Bordeaux
E-mail : contact@garnier-associes.fr
Téléphone : 05 56 00 00 00
Adresse : 25 cours de l'Intendance, 33000 Bordeaux
Menu :
- Accueil → /
- Contact → /contact
Liens du pied de page :
- Mentions légales → /mentions-legales
```

Le reste de `site.yaml` se dit de la même façon : `Constantes :` puis une puce `- delai | 48 h` par constante ; une section par réglage du site, `## Boutique`, `## Agents`, `## Recherche`, `## Images`, `## Hors ligne`, `## Atelier`, `## Personnalisation`, `## Statique`, avec ses données en « Nom : valeur » (un groupe dans le groupe prend un nom pointé, `shipping.flat : 4.9`, comme un jeton de thème) ; une section `## Collection realisations : Réalisations` par collection, avec `Tri : -date` et `Champs :` suivi d'une puce `- title | string | oui` par champ (nom, type, « oui » s'il est obligatoire).

### Données et segments

Les fichiers de données et les segments se lisent avec les mêmes règles. `data/products.md` remplace `data/products.yaml`, `data/<collection>.md` remplace `data/<collection>.yaml` : une section par élément, son identifiant puis son nom (ou le champ de titre de la collection) dans l'intitulé, sa description (ou le premier champ `text`) en texte libre, ses autres champs en « Nom : valeur ».

<!-- sitec: aucun — le site d'essai de ce document garde ses données en YAML ; scripts/verify-site-document.mjs lit ces écritures -->
```markdown
# Produits

## savon-lavande : Savon à la lavande
Savon surgras à 8 %, huile d'olive et lavande fine. Pain de 100 g.

Convient à tous les types de peau.
Prix : 6.5
Catégorie : savons
Image : savon-lavande.svg
Vedette : oui
```

`segments.md` remplace `segments.yaml`. Une condition se dit en clair : « visites = 1 », « visites >= 2 », « sur mobile », « sur ordinateur », un événement suivi de « où clé = valeur », « au moins 2 fois » (ou « au plus », « plus de », « moins de »), « depuis 7d » ; « pas … » la nie ; « tout » et « un parmi » prennent une puce en retrait par condition.

<!-- sitec: aucun — le site d'essai de ce document garde ses segments en YAML ; scripts/verify-site-document.mjs lit ces écritures -->
```markdown
# Segments

Priorité : devis_abandonne, recurrent, nouveau
Segments :
- nouveau | visites = 1
- recurrent | visites >= 2
- devis_abandonne | tout
  - form_start depuis 7d
  - pas form_submit depuis 7d
- fan_services | section_view où section = services, au moins 2 fois
Objectifs :
- appel | click_cta | to = tel:0472001122
Expériences :
- accroche | appel | prix_annonce
- relance | appel | segment : devis_abandonne | témoin : 20
```

La lecture de ces documents est figée comme les autres, dans `lecture/data/` et `lecture/segments.yaml`, et `sitec rediger` les écrit depuis le YAML.

### Les garde-fous

1. **Toute ligne a un rôle.** Une ligne qui ne trouve pas sa place est refusée, à sa ligne (`E_DOCUMENT`) : un texte sous un composant qui n'a pas de texte libre, une valeur de puce sans champ, un lien de trop, un intertitre. Une ligne « nom : suite » d'un à trois mots avant les deux-points est toujours une donnée : si le nom n'en est pas une, elle est refusée, avec le nom le plus proche (« Image côté : left » pour « Côté de l'image »), jamais rangée dans le texte. Un texte dont une phrase commence ainsi (« Téléphone : 05 56 00 00 00 ») s'annonce par « Texte : » seul sur sa ligne et se lit alors tel quel.
2. **Une seule lecture.** Les valeurs d'une puce suivent l'ordre des champs, et le type tranche. Il n'y a pas de seconde règle.
3. **La lecture est redite et figée.** Ce que vaut chaque document est un YAML, gardé dans `lecture/` (`lecture/site.yaml`, `lecture/pages/<id>.page.yaml`). Un document modifié ou nouveau arrête `check` et `build` (`E_READING`) jusqu'à `sitec lire <dossier> --accepter`, qui dit, pour un document changé, les lignes de lecture retirées et ajoutées, et pour un document nouveau, chaque section avec ses données.

Une erreur de validation (route inconnue, image absente, donnée obligatoire) renvoie à la ligne du document, puis au chemin de la donnée : `"path":"ligne 9 · sections[0].hero.secondary.to"`.

### Commandes

- `sitec lire <dossier> [--accepter] [--tout]` : l'état de chaque document ; `--tout` montre le YAML entier que vaut chacun.
- `sitec rediger <dossier> [--dry-run]` : récrit un site YAML en documents. Chaque document écrit est relu et doit rendre les données de son YAML, sinon rien n'est écrit ; ce qui ne se dit pas en lignes passe dans un bloc `yaml`.
- `sitec explain document` : le format en une page, avec les noms français des composants et des données. `sitec explain <composant> --document` : l'exemple du composant écrit en document.

Hors du format à ce jour : `sitec migrate`, `sitec keywords --import`, les schémas de l'éditeur et l'atelier navigateur ne lisent que le YAML.

### Ce qui est mesuré

- **Même site.** Les exemples du dépôt sont écrits en documents ; leur écriture YAML d'origine est gardée dans `scripts/reference/exemples-yaml/`. `examples/garnier-associes` vaut sa référence YAML : mêmes données, mêmes fichiers compilés à l'octet hors pages PHP (qui gardent l'ordre des données de leur source), même HTML rendu sur toutes les pages. `scripts/verify-site-document.mjs` le vérifie. Les quatre sites d'exemple (29 pages) s'écrivent en documents sans aucun bloc `yaml` et se relisent à l'identique, à ceci près qu'un nombre y devient son écriture (`1999` et « 1999 ») là où le composant accepte les deux.
- **Texte à écrire.** `scripts/measure-site-document.mjs` : la source des quatre sites d'exemple pèse 17 079 tokens en YAML (hors commentaires) et 13 686 en documents, soit 20 % de moins (de 18 à 23 % selon le site). Les quatre modifications du test de maintenance demandent 916 tokens écrits en YAML et 734 en documents, 20 % de moins.
- **Travail d'un agent.** Douze agents Sonnet sans contexte, trois par case, tous réussis (`mesure-document/`, `scripts/measure-site-document-agents.mjs`). Création d'un site depuis un brief : 58 % de tokens produits en moins et 52 % de tokens traités en moins en documents. Cet écart tient pour partie à un seuil : les trois sites YAML dépassaient la longueur d'une commande sous Windows, leur écriture groupée a échoué et ils ont été écrits deux fois ; les trois sites en documents tenaient dessous. Éditions (quatre modifications) : aucun gain, 31 % de tokens produits en plus et 25 % de tokens traités en plus en documents (10 % et 4 % sans l'essai où le script de l'agent n'avait rien écrit), parce que la relecture ajoute une commande et que le champ de formulaire libre retombe en YAML. Trois essais par case, un seul modèle, un seul site : des ordres de grandeur.
- **Une lecture fausse passée.** Sur les trois créations en documents, une portait une ligne de réglage mal nommée, lue comme du texte et affichée sur la page ; `check` et le banc ne la voyaient pas, l'agent l'a vue dans la lecture redite. Depuis la v0.15.0, le lecteur refuse toute ligne « nom : suite » courte dont le nom n'est pas une donnée ; cinq des six sites en documents laissés par les agents, écrits avant cette règle, ne passent plus `check` (leurs mentions légales commencent par « Éditeur du site : … ») et gardent leurs mesures d'alors.

## 6 ter. Éditeur

`sitec schema <dossier>` produit des schémas JSON dérivés du catalogue réel du site (`.devanture/schema/` : site, pages, composés, manifestes, vocabulaire, paquet, cas de test, chaque collection, produits) et les déclare à l'extension YAML de VS Code (`.vscode/settings.json`, extension recommandée `redhat.vscode-yaml`). L'éditeur propose alors les composants et leurs props avec leur description et leur exemple, les fichiers d'`assets/`, les routes et les sources ; il souligne une prop, un composant, une image ou une route inconnus. Les expressions `{{ … }}` sont acceptées partout, `{ for, as, item }` dans les composés. Les schémas aident à la frappe, `sitec check` reste l'autorité (expressions, références croisées, gabarits).

## 7. Ce que garantit le vérificateur

Avant toute génération : structure et types de chaque document, routes et ancres existantes, fichiers d'`assets/` présents, segments déclarés, champs de collections, paramètres des assemblages, gabarits compilables, expressions résolubles, textes `[à compléter]` absents (sauf `--draft`). Après : les pages produites sont identiques quel que soit l'ordre des fichiers ; aucune donnée de la requête n'atteint un gabarit sans échappement.

## 8. Ce qui appartient à la cible

Le rendu des gabarits, le protocole des formulaires, le stockage, le cache statique, le déploiement : `docs/CIBLES.md`. Le langage n'y fait pas référence.

Composants natifs écrits sans code de la cible, tous au format langage (aucun gabarit HTML ni PHP ne reste dans le catalogue ; les mots natifs portent le balisage que les primitives n'écrivent pas, et ceux qui ont un état le lisent par une source) : `hero`, `richtext`, `gallery`, `pricelist`, `map`, `collection.list`, `features`, `stats`, `steps`, `cta`, `timeline`, `testimonials`, `faq`, `team`, `contact.form`, `products.grid`, `product.hero`, `products.related`, `cart.page`, `checkout.page`, `order.confirmation`, `hours`, `recent`. Aucun composant natif n'est écrit pour la cible : la porte de sortie `custom` (un fichier PHP du projet) est retirée depuis la v0.15.0. Leur contrat est décrit dans `CIBLES.md`. Ce qu'une seconde cible devrait réécrire n'est plus un jeu de gabarits : ce sont les sources et les actions (boutique, formulaires, horaires, mémoire du visiteur), le reste vient du gabarit. Un natif au format langage peut recevoir des données que le compilateur calcule (les éléments d'une collection, filtrés et triés) : il les déclare dans un bloc `calculé`, écrit comme `données`, et sa forme les emploie par leur nom. Ce bloc est réservé au catalogue natif.

## 9. Versions et migration

`sitec migrate <dossier>` fait passer un site à la dernière version, étape par étape, en modifiant le texte des fichiers (commentaires et mise en forme conservés), puis vérifie que le site migré passe `check`. `--dry-run` montre les changements sans écrire. Un site écrit en documents est lu de la même façon (sa version est celle que vaut `site.md`, 1 par défaut ; les suggestions lisent `pages/<id>.md` et parlent leur écriture). Chaque migration propose aussi des suggestions non appliquées : ce que la nouvelle version permet d'écrire mieux (coordonnées recopiées en dur, valeurs répétées à mettre en constantes). Un site sans `language` est lu comme version 1 avec l'avertissement `W_LANGUAGE`.

- **0** : sites écrits avant la déclaration de version (compilateur ≤ 0.1.3). Migration vers 1 : ajout de `language: 1`, aucune construction ne change.
- **1** (2026-11-08) : première version écrite. Expressions, constantes, collections, composants composés, composants de projet avec gabarit neutre et effet `form`, paquets de composants, tests de composants, feuille de style encadrée, comportements déclarés. Ajouts compatibles, sans changement de version : composants en français contrôlé (compilateur 0.7.0 et 0.8.0), objectifs et expériences dans `segments.yaml` (0.9.0), vocabulaire ouvert (`vocabulaire.yaml`, 0.10.0), lectures à la visite (`fonctionnement: lit:`, 0.11.0), registres à règles (`places`, `liste d'attente`, `une fois par`, 0.12.0), composant et site écrits en documents (0.13.0 à 0.15.0), composant écrit en plan (`composant.md`, 0.16.0). Retrait, sans changement de version : le bloc `custom` (0.15.0), qui incluait un fichier PHP du projet hors de toute validation ; une page qui l'emploie encore reçoit `E_UNKNOWN_COMPONENT` avec la marche à suivre (un composant du site).
