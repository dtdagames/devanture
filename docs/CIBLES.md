# Cibles de compilation : le contrat d'un émetteur

Devanture est un langage sans cible : le YAML ne contient rien de PHP, et les bancs de vérification (`scripts/verify-*.mjs`) testent un site compilé par HTTP, sans regarder son code. Un émetteur est un module `src/emit/<cible>/index.js` qui exporte `emit(project, catalog, out)` et produit, dans `out/`, un site qui respecte ce contrat. La cible `php` est la référence ; ce document décrit ce qu'une seconde cible devrait fournir, par ordre d'importance.

Les noms de routes commençant par `_` sont techniques et réservés. Les cookies et préfixes `sl_` sont un héritage du nom de travail ; une autre cible les garde pour que le script client reste commun.

## 1. Pages et fichiers

| Élément | Comportement attendu |
|---|---|
| Routes | Chaque page statique répond sur sa `route` ; route inconnue → 404 avec le layout du site. |
| Routes dynamiques | `/produit/[id]` (source `products`), `/commande/[id]?t=<jeton>` (source `orders`) ; entité absente ou jeton faux → 404. |
| Sections | Chaque section est précédée d'une ancre `<span id="<id>" class="anchor">` ; `data-variant` quand une variante s'applique, `data-sl-fragment="<page>"` quand la section a des variantes. |
| Layout | En-tête (marque, navigation avec `aria-current="page"`, lien panier avec `.cart-count` si boutique, champ de recherche `.intent` pointant sur `/assets/intent-index.json`), pied (texte, liens, lien « Version texte »), `<script>window.SL = {spec, consent, segments}</script>`, bandeau de consentement `.consent`. |
| SEO | `<title>`, `<meta name="description">`, JSON-LD du type d'activité, `<link rel="alternate">` vers `/site.json` et la version texte. |
| Fichiers publics | Seuls `assets/`, `cache/`, `sw.js`, `manifest.webmanifest`, `offline.html` sont servis tels quels ; `data/`, `lib/`, `pages/`, `components/`, `custom/`, `.env`, `.release-*` et `manifest.sha256.json` jamais (403 ou 404). Sous Apache : `.htaccess` à la racine et dans chaque dossier privé, `assets/.htaccess` pour le cache navigateur (un an pour `site.css` et `site.js` versionnés par `?v=`, une semaine pour les images), types MIME `webp` et `webmanifest`, compression du texte. `scripts/verify-apache.mjs` rejoue tout cela dans l'image officielle `php:8.3-apache`. |
| Assets | `site.css` et `site.js` référencés avec `?v=<empreinte>` et attribut `integrity`. |
| Images | Chaque JPEG, PNG ou WebP de `assets/` est copié et décliné en variantes WebP aux largeurs de `site.images.widths` (jamais agrandi), nommées `<nom>.<largeur>.webp` à côté de l'original. Les `<img>` des composants portent `width`, `height`, `srcset`, `sizes` et `loading="lazy"` (sauf l'image principale d'une fiche produit, `fetchpriority="high"`) ; un fond de bandeau ou un lien d'agrandissement prend la variante la plus proche de 1600 px. Sans redimensionneur, les dimensions restent déclarées et l'original est servi. Le pipeline (`src/images/`) est indépendant de la cible, seul le rendu des balises lui appartient. |
| Version texte | `/lisible<route>` sert `lisible/<page>.html`, HTML simplifié compilé. |

## 1 bis. Gabarits, données compilées, collections

| Élément | Comportement attendu |
|---|---|
| Gabarits neutres | Un composant à `template.html` est compilé vers la cible par `src/lang/template.js` ; `{{ }}` est échappé sauf fonctions d'affichage ; les variables `p, site, page, item, product, order, form, loop` existent au rendu, et les fonctions `csrf()` (champ caché du jeton) et `event(nom, clé, valeur…)` (marque `data-sl-event`). Un émetteur fournit le runtime des expressions (`sl_get, sl_truthy, sl_f_*`, voir `EXPR_PHP` dans `src/lang/expr.js`) ou son équivalent, avec la même sémantique que l'évaluateur JavaScript (banc `verify-lang`). |
| Données compilées | `lib/data/products.json`, `lib/data/<collection>.json` : versionnées, dans le manifeste, déployées ; jamais servies. `data/` est réservé à l'exploitation (messages, commandes, réponses de formulaires, stock, événements). |
| Collections | Route `/…/[id]` avec `source: <collection>` : l'élément est chargé par id avant le rendu, exposé à `item`, 404 sinon ; les props de la page contenant `{{ item… }}` sont des expressions évaluées à la requête. `collection.list` reçoit ses éléments à la compilation (`_items`, `_route`, `_fields`) : page statique. |
| Comportements déclarés | Les composants qui déclarent `behaviors` reçoivent le code navigateur correspondant (`src/lang/behaviors.js`), inclus une fois dans `site.js`, avec sa CSS de base dans `site.css` ; rien n'est inclus pour un comportement qu'aucun composant utilisé ne déclare. Une seconde cible réutilise ce code tel quel : il ne dépend que des attributs `data-sl-…` du HTML. |
| Sources lues à la visite | Un composant qui déclare `fonctionnement: lit:` reçoit, avant son rendu, ce que chaque source rend, rangé sous `p._<nom>` : l'émetteur appelle `sl_source(props, nom, id, paramètres)`, qui délègue à `sl_src_<id>(paramètres)` et rend `null` quand le site n'a pas le service. Les sources, leurs paramètres et la forme exacte de ce qu'elles rendent sont décrits dans `src/lang/sources.js` (`sitec explain "<source>"`) : `products`, `product`, `related`, `cart`, `checkout`, `order` (boutique), `hours` (horaires), `recent` (mémoire du visiteur), `contact` (formulaire de contact, réservée à `contact.form`). Les libellés qu'elles rendent (`price_text`, `status_text`, `stock_text`) sont formatés par la cible, dans la langue et la devise du site. Une page qui contient un tel composant n'est jamais servie statique ; elle porte un jeton si le composant pose un formulaire d'action (`csrf()`). Sous `sitec test`, la constante `SL_FIXTURES` fait lire à la place les données fournies par le cas (`à la visite`). |
| Formulaires déclarés | Un composant à `effects.form` : `POST` sur la page avec `_form=<composant>`, `_csrf`, pot de miel ; validation des champs déclarés ; enregistrement dans la collection `store` (`id, at, form, ip, page, mail, …champs`) ; e-mail si `notify` ; état exposé au gabarit (`form.ok, failed, message, success, values, errors`) ; onglet « Formulaires » du back-office avec CSV. La page n'est jamais servie statique. |

## 2. Formulaire de contact

- `POST` sur la route de la page, champ caché `_form=contact`, jeton `_csrf` lié à la session, pot de miel `site_web` (vide obligatoire).
- Destinataire, liste des champs, obligations et conditions `when` sont fixés côté serveur à la compilation, jamais lus depuis la requête.
- Validation : champ manquant → message « est obligatoire », e-mail invalide → « e-mail invalide » ; réponse 200 avec les erreurs par champ et les valeurs conservées. Succès → message `success` de la section.
- Enregistrement : collection `messages` (voir § 7), document `{ id, at, source: 'form', ip, page, mail: none | sent | failed, …champs }`.
- E-mail au destinataire (`to` de la section, sinon `site.contact.email`) : texte brut UTF-8, `From` à l'adresse du domaine (`no-reply@<domaine>`, ou `MAIL_FROM` de l'environnement) avec le nom du site, `Reply-To` sur l'e-mail du visiteur, sujet encodé RFC 2047 s'il n'est pas ASCII, jamais de retour à la ligne dans un en-tête. L'échec d'envoi n'empêche pas l'enregistrement. Mêmes règles pour les e-mails de commande (marchand et client).
- Préremplissage : `?q=` remplit le message et, si une option de `select` correspond, la sélectionne.

## 3. Jumeau pour agents

- `GET /site.json` : fichier compilé tel quel. `GET /llms.txt` : idem.
- `GET /api/contact` : description du formulaire (champs, obligations). `POST /api/contact` : JSON, en-tête `Authorization: Bearer <AGENT_API_TOKEN>`, mêmes règles de validation que le formulaire, 20 requêtes par heure et par adresse, réponses `{ ok: true, id }` ou `{ ok: false, error, errors }`. Sans jeton configuré → 503.

## 4. Personnalisation

- Profil dans le cookie `sl_p` (JSON : `n` visites, `e` événements `{nom: {n, t, w}}`, `r` historique), consentement `sl_c` (`1` ou `0`). Sans consentement, aucun profil n'est lu ni écrit.
- Segments évalués côté serveur à chaque rendu avec le même algorithme que le client (`visits`, `device` par agent utilisateur, `event` avec `within`, `count`, `where`, combinaisons `all` / `any` / `not`, ordre `priority`).
- Variantes : la première variante dont le segment est actif remplace les props de la section (`id`, `keywords`, `variants` exclus). Variantes de page : `first` réordonne, `hide` masque.
- `POST /_event` : JSON `{ name, data }`, nom `[a-z_]{1,32}`, enregistré dans `events` avec les segments du moment ; réponse 204.
- `GET /_fragment?page=<id>&section=<id>` : la section seule, rendue pour le profil courant, en-tête `X-SL-Segments`, `Cache-Control: no-store` ; 404 sinon.

## 5. Boutique

- Catalogue compilé dans `data/products.json` ; stock dans `data/stock.json` `{ id: { base, remaining } }`, réconcilié si le catalogue change, un seul verrou pour toute écriture.
- `POST /_cart` : `action` `add` | `set` | `remove`, `id`, `qty`, `_csrf` ; quantité plafonnée au stock restant avec message ; redirection 303 vers le panier. Panier en session.
- Commande : `POST` sur la route de la page `checkout.page`, champ `_form=checkout`, validation par champ ; succès → réservation atomique du stock, document `orders` `{ id (8 car.), token, at, status, payment, lines, total, shipping, customer }`, panier vidé, redirection 303 vers `/commande/<id>?t=<token>`.
- Paiement `manual` : statut `pending` et instructions. Paiement `stripe` : session Stripe Checkout avec `client_reference_id = id`, puis webhook.
- `POST /_stripe/webhook` : signature `STRIPE_WEBHOOK_SECRET`, `checkout.session.completed` → `paid`, `checkout.session.expired` → `cancelled` et stock libéré ; idempotent.
- Événements client déclarés par les composants : `product_view`, `cart_add`, `checkout_start`, `purchase`.
- Les composants de la boutique sont écrits dans le langage : ils lisent l'état par les sources ci-dessus et posent les formulaires d'action par des mots natifs (`ajout au panier`, `tableau du panier`, `formulaire de commande`). Ce que la cible doit tenir, ce sont ces sources et ces trois protocoles (`/_cart`, `_form=checkout`, webhook), pas des gabarits.

## 6. Statique d'abord et hors ligne

- Une page marquée `static` par le compilateur, demandée en `GET` sans aucun cookie, est servie depuis `cache/<page>.html` si le fichier existe (`X-SL-Static: php` ou l'équivalent), sinon rendue, marquée `<meta name="sl-static" content="1">`, écrite dans le cache et servie avec `X-SL-Static: miss`. Aucun cookie n'est posé sur ces réponses. Une règle du serveur web peut servir le fichier sans passer par le programme.
- La session n'est créée que lorsqu'un état est écrit (CSRF d'un formulaire, panier, back-office).
- Hors ligne (`site.offline.enabled`) : `sw.js`, `offline.html`, `manifest.webmanifest` compilés ; le service worker précache les assets et les versions texte, jamais les pages.

## 7. Données d'exploitation

Trois collections, `messages`, `orders`, `events`, avec quatre opérations : ajouter, tout lire dans l'ordre, lire par `id`, mettre à jour par `id` sous verrou. La cible `php` les implémente en SQLite si PDO SQLite existe, en JSONL sinon ; une autre cible peut choisir tout autre stockage à condition que `data/` reste le seul dossier à conserver entre deux versions, avec `.env` et `cache/`.

## 8. Back-office

`/_admin` et sous-routes `messages`, `orders`, `stock`, `events`, `integrity` ; 503 sans `ADMIN_TOKEN`, 401 avec formulaire de jeton, session ensuite, dix essais par quart d'heure, CSRF sur chaque action, actions journalisées comme événements `admin_*`. Le back-office ne modifie jamais le contenu du site. `/_studio/` si l'atelier est embarqué, derrière la même garde.

## 9. Déploiement signé et intégrité

- `manifest.sha256.json` : empreinte SHA-256 de chaque fichier compilé, hors `data/`, `cache/`, `.env` et lui-même ; écrit en dernier.
- `POST /_deploy` : corps `gzip(JSON)`, en-têtes `X-SL-Timestamp` (dix chiffres, tolérance cinq minutes) et `X-SL-Signature` = `HMAC-SHA256(ts + "\n" + sha256(corps), DEPLOY_SECRET)` en hexadécimal. Messages `{ release, files: { chemin: base64 } }` répétés, puis `{ release, commit: true, manifest }`. Au commit : chaque fichier préparé doit avoir l'empreinte annoncée, aucun ne doit manquer ni être en trop ; mise en place fichier à fichier, suppression de ce qui n'est plus dans la version, cache vidé. Chemins remontants, `data/`, `cache/`, `.env` refusés. `OPTIONS` répond aux en-têtes CORS. 503 sans secret, 403 signature ou horodatage, 400 charge utile.
- Vérification d'intégrité : comparaison du manifeste aux fichiers présents (modifiés, manquants, ajoutés), accessible au back-office et en ligne de commande avec code de sortie.

## 10. Variables d'environnement

`ADMIN_TOKEN`, `AGENT_API_TOKEN`, `DEPLOY_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STORE`. Lues depuis `.env` à côté du point d'entrée ; un `.env.example` est compilé.

## Valider une cible

```
node bin/sitec.js build examples/savonnerie --target <cible>
node scripts/verify-shop.mjs examples/savonnerie/dist 8970
node scripts/verify-php-site.mjs examples/savonnerie/dist 8971
```

Les bancs lancent aujourd'hui un serveur PHP de développement ; pour une autre cible, ils devront recevoir la commande qui sert `dist/`. Tout le reste de leurs contrôles est indépendant de la cible.

## Ce qu'une seconde cible coûte

Plus aucun composant n'est écrit dans la cible de référence, hormis `custom` (qui inclut un fichier du projet). Une seconde cible n'a donc pas de gabarit à réécrire : elle fournit le rendu du gabarit neutre et le runtime des expressions, les sources lues à la visite (une fonction par source, au format décrit dans `src/lang/sources.js`), les protocoles d'action (`/_cart`, commande, formulaires, webhook) et l'exploitation (stockage, back-office, déploiement). C'est un chantier borné et listé, mais aucune seconde cible n'est engagée tant qu'un besoin réel (hébergement sans PHP, plateforme statique à fonctions) ne se présente pas.
