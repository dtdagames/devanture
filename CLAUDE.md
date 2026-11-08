# Devanture — mode d'emploi pour l'agent

Tu écris des sites vitrines dans un DSL YAML. Tu n'écris jamais de PHP, JS ou CSS : le compilateur `sitec` les génère.

## Commandes (depuis la racine du dépôt)

```
node bin/sitec.js catalog              # liste des composants (1 ligne chacun)
node bin/sitec.js explain <composant>  # props détaillées + exemple
node bin/sitec.js check <dossier>      # valide, erreurs en JSON (1 par ligne), code 1 si erreurs
node bin/sitec.js build <dossier>      # valide puis génère <dossier>/dist (PHP + JS + CSS)
```

## Structure d'un site

```
<dossier>/
  site.yaml              # identité, nav, thème, coordonnées
  pages/<id>.page.yaml   # une page par fichier
  assets/                # images référencées par les composants (chemin relatif à assets/)
```

### site.yaml

```yaml
site:
  name: Plomberie Martin               # obligatoire
  tagline: Dépannage 7j/7 à Lyon
  locale: fr-FR
  theme: { preset: clair }             # clair | sombre | chaleureux ; tokens: { color.primary: "#123456" } pour surcharger
  nav:
    - { label: Accueil, to: / }
    - { label: Services, to: /services }
  footer: { text: SIRET 123 456 789, links: [ { label: Mentions légales, to: /mentions-legales } ] }
  contact: { email: contact@exemple.fr, phone: 04 00 00 00 00, address: 12 rue des Lilas, 69003 Lyon }
```

### pages/<id>.page.yaml

```yaml
page: accueil
route: /                               # obligatoire, unique ; la page d'accueil a route: /
seo: { title: Plomberie Martin, description: Plombier à Lyon, dépannage 7j/7 }
sections:                              # liste de sections ; chaque section = UNE clé (le composant) avec ses props
  - hero: { title: Plombier à Lyon, cta: { label: Appeler, to: tel:0400000000 } }
  - features:
      items:
        - { icon: clock, title: Intervention en 1 h }
        - { icon: shield, title: Devis gratuit }
```

## Règles

- Une section = un objet avec une seule clé, le nom du composant. Les props sont dessous.
- **Piège YAML n° 1** : en notation `{ a: x, b: y }`, une virgule ou un deux-points dans un texte coupe la valeur. Pour tout texte long (phrases, listes dans une phrase, « 4,9/5 »), utilisez la notation bloc ou des guillemets :
  ```yaml
  - { q: Livrez-vous partout ?, a: "Oui, sous 48 h, en France métropolitaine." }
  - q: Livrez-vous partout ?
    a: Oui, sous 48 h, en France métropolitaine.
  ```
- Les valeurs qui ressemblent à des nombres mais sont du texte (années, « 6 », « 0 ») : entre guillemets quand la prop attend un string.
- Un lien (`cta`, `secondary`, `button`, `link`, entrées de `nav`) est toujours `{ label: Texte, to: cible }`, les deux obligatoires. `to` est une route déclarée par une page (`/contact`), une ancre (`#contact`), ou `https://…`, `mailto:…`, `tel:+33472001122` (format international conseillé).
- `site.yaml` accepte : `name*`, `tagline`, `locale`, `theme { preset, tokens }`, `nav [liens]`, `footer { text, links [liens] }`, `contact { email, phone, address }`. Rien d'autre (pas d'horaires structurés, pas de sous-menus en v0). Détail et liste des tokens de thème (`color.primary`, `color.accent`, `font.heading`, …) : `node bin/sitec.js explain site`. Un token inconnu est une erreur.
- Les images sont des fichiers existants dans `assets/`. Si tu n'as pas d'image, n'en référence pas. Dépose les photos en JPEG, PNG ou WebP à leur taille d'origine : le compilateur produit les variantes WebP redimensionnées (480, 960, 1600 px par défaut), le `srcset`, les attributs `width`/`height` et le chargement différé. Réglage : `site.images: { widths: [...], quality: 80 }` ou `{ enabled: false }`. Les SVG sont copiés tels quels.
- **Formulaire** : `fields` mélange noms connus (`name`, `email`, `phone`, `subject`, `message`) et champs libres `{ name: company, label: Entreprise, type: text }` (types : text, email, tel, number, date, select avec `options`, textarea ; `required: true` possible). Voir `explain contact.form`.
- **Ancre** : toute section accepte `id: mon-ancre` ; on y pointe avec `to: /page#mon-ancre` ou `to: "#mon-ancre"`. **Piège YAML n° 2** : un `#` précédé d'un espace commence un commentaire, donc une ancre seule s'écrit toujours entre guillemets (`"#contact"`), de même qu'une couleur (`"#6b2d5c"`).
- **Champ conditionnel** : un champ libre accepte `when: { autre_champ: valeur }` ou `when: { autre_champ: [v1, v2] }` ; il n'est affiché et validé que si la condition est vraie. Le champ conditionnant doit être déclaré avant (typiquement un `select`).
- **Navigation par intention** : le compilateur indexe chaque section (titre, textes, questions de FAQ) et l'en-tête reçoit un champ « Que cherchez-vous ? » qui renvoie à la section exacte. Ajoutez `keywords: [mots, questions]` sur une section pour l'aider (ex. `keywords: [urgence, fuite, nuit]`). Réglage : `site.intent: { enabled: true, placeholder: … }`. Pour faire proposer les mots-clés par un modèle et les figer dans le YAML : `node bin/sitec.js keywords <dossier>` (clé d'API Anthropic requise ; sinon `--export f.json`, réponse d'un modèle, puis `--import f.json`).
- **Jumeau pour agents** : le site compilé expose `/site.json` (données structurées : pages, horaires, tarifs, formulaires et leur protocole) et `/llms.txt` (instructions lisibles), plus un JSON-LD dans chaque page. Réglage : `site.agents: { enabled: true, summary: une phrase, business_type: LocalBusiness | Bakery | LegalService | Plumber | Restaurant | … }`.
- **Personnalisation** : `segments.yaml` à la racine déclare des segments (`visits`, `device`, `event` avec `within`, `count`, `where`, combinés par `all` / `any` / `not`) et une `priority`. Toute section accepte `variants: { nom_de_segment: { props surchargées } }` ; la première variante dont le segment est actif s'applique au rendu serveur. Le profil du visiteur reste dans son navigateur (cookie first-party), avec un bandeau de consentement par défaut. Détail : `explain site`. Les variantes ne changent jamais `id`, `keywords` ni `variants`.
- **Boutique** : `data/products.yaml` (`products: [ { id, name, price (nombre), category, image, description, stock, badge, featured, unit } ]`) ; composants `products.grid` (grille filtrée), page dynamique `route: /produit/[id]` avec `source: products` et `product.hero` (+ `products.related`), `cart.page` (une seule), `checkout.page` (une seule), page `route: /commande/[id]` avec `source: orders` et `order.confirmation`. Réglages : `site.shop: { currency, payment: manual | stripe, manual_instructions, shipping: { flat, free_from }, order_email }`. `check` vérifie que panier, commande et confirmation sont tous présents. Les clés (Stripe, jeton d'API) vont dans `.env`, jamais dans le YAML : `STRIPE_SECRET_KEY` pour créer les paiements, `STRIPE_WEBHOOK_SECRET` pour le webhook `/_stripe/webhook` qui confirme (payée) ou annule (session expirée, stock libéré) les commandes. Le stock se décrémente à la commande ; un réapprovisionnement se fait dans `products.yaml`.
- **Assemblage par segment** : au niveau d'une page, `variants: { segment: { first: [ids de sections], hide: [ids] } }` réordonne ou masque des sections (qui doivent avoir un `id`) pour le premier segment actif.
- **Mémoire du visiteur** : le composant `recent` affiche les produits et sections consultés récemment (profil navigateur, consentement requis) et n'affiche rien sans historique.
- **Version texte** : chaque page statique existe aussi en `/lisible<route>`, texte simplifié avec lecture à voix haute ; lien « Version texte » dans le pied de page, généré automatiquement.
- **Page dérivée (micro-site)** : `extends: <id de page>` puis `override: { id_section: { props } }`, `remove: [ids]`, `prepend: [sections]`, `append: [sections]` ; `route` et `seo` propres. Une page dérivée n'a pas de `sections`.
- **Relecture éditoriale** : mettez le brief du client dans `brief.md` à la racine du site. `node bin/sitec.js review <dossier>` liste les faits chiffrés absents du brief, les engagements (délais, garanties, gratuité, certifications) à faire valider et les textes « à compléter ». Un texte `[à compléter]` fait échouer `build` (sauf `--draft`). N'invente ni prix, ni délai, ni distinction : si le brief ne le dit pas, écris `[à compléter]`.
- **Icônes** (`features`) : 32 pictogrammes SVG, liste exacte dans `explain features` (dont scale, bread, croissant, cake, drop, flame, wrench, users, euro, pin, calendar). Un nom hors liste est une erreur.
- **Balisage léger** dans `richtext`, les réponses de `faq`, `access` de `map` : `**gras**`, `*italique*`, `[texte](/lien)`, et une ligne vide puis des lignes `- ` pour une liste. Rien d'autre (pas de HTML).
- **Composants d'accès et de récit** : `map` (adresse, itinéraire, carte OpenStreetMap chargée au clic si `lat`/`lon`), `steps` (étapes numérotées), `timeline` (dates clés).
- **Recherche qui répond** : la carte de réponse en tête des résultats vient des données compilées (horaires calculés à la visite, prix, coordonnées, réponses de FAQ). Un résultat « contact » envoie vers le formulaire prérempli avec la question (`?q=`).
- **Exploitation (hors DSL, rien à écrire dans le YAML)** : le site compilé embarque un back-office sur `/_admin` (messages, commandes et statuts, stock restant, mesures, intégrité, cache), activé par `ADMIN_TOKEN` dans `.env`. Il ne modifie jamais le contenu : un texte, un prix ou un horaire se change dans le YAML puis se recompile. Les données d'exploitation vont en SQLite si PDO SQLite existe, en fichiers JSONL sinon (`STORE=jsonl` pour forcer) ; `data/` et `.env` survivent aux recompilations et aux déploiements.
- **Statique d'abord** : une page sans formulaire, panier, horaires, bloc libre ni variante dépendant de l'appareil est servie depuis `cache/` aux visiteurs sans cookie, par Apache directement (`.htaccess` généré) ; les autres passent par PHP. Désactivable par `site.static: { enabled: false }`. Le `.htaccess` généré est vérifié sous un vrai Apache (`node scripts/verify-apache.mjs <dist> <port>`, Docker requis). Les sections à `variants` se rafraîchissent côté client via `/_fragment` quand le profil du visiteur change, sans recharger la page.
- **Hors ligne** : `site.offline: { enabled: true, short_name, theme_color }` émet un service worker (assets et versions texte consultables hors connexion, jamais les pages elles-mêmes), `offline.html` et `manifest.webmanifest`. Les assets sont versionnés par empreinte avec attribut `integrity`.
- **Déploiement signé** : `node bin/sitec.js deploy <dossier> --to https://domaine --secret s` pousse `dist/` vers `/_deploy` (HMAC, horodatage, vérification de chaque fichier contre `manifest.sha256.json`, fichiers obsolètes supprimés, données conservées). Le même secret est `DEPLOY_SECRET` dans le `.env` du serveur. Vérification d'intégrité à tout moment : onglet du back-office ou `php lib/integrity.php`.
- **Atelier navigateur** : `studio/index.html` (après `node scripts/build-studio.mjs`) fait tourner le même compilateur dans le navigateur : ouvrir un dossier de projet ou un exemple, éditer le YAML, vérifier, compiler en mémoire, télécharger `dist.zip`, et déployer vers `/_deploy` d'un site par envoi signé. Même sortie que la ligne de commande. Avec `site.studio: { enabled: true }`, le site compilé embarque cet atelier et sa propre source sur `/_studio` (derrière `ADMIN_TOKEN`) : le client édite et redéploie depuis son site, qui emporte alors la nouvelle source.
- **Dépôt de site sans PHP** : `node bin/sitec.js init <dossier> [--name "Nom"] [--repo github:compte/depot#tag | --local]` crée un dépôt git prêt : squelette YAML avec `[à compléter]`, `brief.md`, `README.md`, `CLAUDE.md` adapté (`npx sitec …`), `.gitignore` (dist/, .env), `package.json` (compilateur en dépendance : `github:dtdagames/devanture#v0.1.2` par défaut) et un flux GitHub Actions qui refuse tout fichier PHP, vérifie à chaque push, relit contre le brief et déploie par envoi signé sur `main` (variable `SITE_URL`, secret `DEPLOY_SECRET`). Le bloc `custom` y est interdit.
- **Plusieurs sites sur un hébergement** : un dossier avec `hosts.yaml` (`sites: [ { domain, aliases: [www…], project: ../chemin } ]`) et `node bin/sitec.js host <dossier>` compile tout dans un seul `dist/` routé par domaine, chaque site gardant ses données et son `.env` sous `sites/<nom>/`.
- **Porte de sortie** : `- custom: { php: custom/bloc.php, css: custom/bloc.css, props: { … } }` inclut un fichier PHP du projet (il reçoit `$p` et les helpers `e()`, `asset()`, `url()`, `paragraphs()`). `check` l'accepte avec un avertissement `W_CUSTOM` : son contenu n'est pas validé. À n'utiliser que si aucun composant ne convient, et le signaler dans ton rapport.
- `check` renvoie des erreurs JSON avec `path`, `expected`, `hint` et parfois `fix`. Applique-les puis relance `check`.
- Ne lis pas le code source du compilateur ni des composants : `catalog` et `explain` suffisent.
