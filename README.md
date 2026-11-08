# Sitelang

Un langage déclaratif (YAML strict) pour écrire des sites vitrines et de petites boutiques, et un compilateur, `sitec`, qui en produit un site PHP + JS + CSS déployable sur n'importe quel hébergement mutualisé. Conçu pour être écrit par un modèle de langage autant que par un humain : peu de tokens, un vérificateur qui explique ses erreurs, aucun PHP à écrire.

> Prototype v0 (novembre 2026). Les mesures, les choix et les limites sont documentés dans [docs/rapports](docs/rapports/).

## Installer

```
git clone <ce dépôt> sitelang
cd sitelang
npm install
node bin/sitec.js help
```

Node 20 ou plus. PHP n'est nécessaire que pour servir un site compilé (`php -S localhost:8080 -t dist dist/index.php`).

## En deux minutes

```
node bin/sitec.js init mon-site --name "Plomberie Martin"   # un dépôt de site, sans PHP
cd mon-site && npm install
npx sitec check .          # erreurs en JSON, une par ligne, avec le chemin et la correction suggérée
npx sitec build . --draft  # dist/ : PHP + JS + CSS
```

Le mode d'emploi du langage, écrit pour un auteur humain ou modèle : [CLAUDE.md](CLAUDE.md). Le catalogue des composants : `node bin/sitec.js catalog`, le détail d'un composant : `node bin/sitec.js explain hero`.

## Ce que produit le compilateur

- Un site PHP sans framework ni extension optionnelle, un routeur, des pages, des composants, un CSS à jetons et un JS vanille.
- Formulaires avec champs libres et conditionnels, navigation par intention (recherche qui répond), personnalisation par segments, boutique (catalogue, panier, commande, stock, Stripe), version texte de chaque page, jumeau pour agents (`/site.json`, `/llms.txt`, JSON-LD, API).
- Une couche d'exploitation : back-office compilé (`/_admin`), stockage SQLite ou fichiers, cache statique servi sans PHP, fragments personnalisés, hors-ligne, intégrité par empreintes, déploiement signé (`/_deploy`), plusieurs sites par hébergement (`sitec host`).
- Un atelier dans le navigateur ([studio/](studio/), `npm run build:studio`) qui fait tourner le même compilateur : éditer, vérifier, compiler, déployer. Un site peut l'embarquer sur `/_studio`.

## Commandes

| Commande | Rôle |
|---|---|
| `check <dossier>` | Valide, erreurs JSON, code 1 si erreurs |
| `build <dossier> [--draft]` | Compile dans `dist/` ; refusé tant qu'il reste des `[à compléter]` sauf `--draft` |
| `catalog`, `explain <composant>`, `explain site` | Documentation du langage |
| `review <dossier>` | Relecture éditoriale contre `brief.md` |
| `keywords <dossier>` | Mots-clés de recherche proposés par un modèle, figés dans le YAML |
| `init <dossier>` | Dépôt de site sans PHP, avec intégration continue |
| `deploy <dossier> --to https://…` | Déploiement signé vers `/_deploy` |
| `host <dossier-hôte>` | Plusieurs sites, un hébergement, routage par domaine |

## Structure du dépôt

```
bin/            sitec
src/            compilateur : chargement, validation (ajv), émetteurs PHP/JS/CSS, revue, mots-clés, hôte, init
src/studio/     remplaçants Node pour l'atelier navigateur (fichiers en mémoire, chemins, sha256)
components/     un dossier par composant : manifest.yaml (props), template.php, styles.css, module.js
studio/         atelier navigateur (index.html, app.js ; sitec-browser.js est produit par npm run build:studio)
examples/       sites de démonstration (plomberie, boutique savonnerie, cabinet, fournil, hôte multi-sites)
scripts/        bancs de vérification des sites produits et scripts de mesure
docs/rapports/  proposition initiale et rapports de test (création, baseline, maintenance, Haiku, variance, exploitation)
baseline/ maintenance/ variance/ haiku/   corpus des mesures : mêmes sites écrits à la main en PHP, pour comparaison
```

## Vérifier

```
node bin/sitec.js build examples/savonnerie
node scripts/verify-shop.mjs examples/savonnerie/dist 8970        # parcours d'achat, stock, webhook
node scripts/verify-php-site.mjs examples/savonnerie/dist 8971    # routes, SEO, formulaires, sécurité
```

Les bancs démarrent eux-mêmes un serveur PHP de développement ; indiquer le chemin de `php` dans `PHP_BIN` s'il n'est pas dans le `PATH`.

## État et limites

Ce que les mesures montrent : le langage réduit surtout le coût de maintenance, l'écart avec le PHP à la main grandit quand le modèle rétrécit, et la valeur tient à l'oracle de vérification et à l'homogénéité des sites, pas à la correction d'erreurs. Non testé à ce jour : création réelle de sessions Stripe, règles Apache sur un hébergement réel, appels directs au modèle pour `review` et `keywords`. Détail dans [docs/rapports/RAPPORT-EXPLOITATION.html](docs/rapports/RAPPORT-EXPLOITATION.html) et [RAPPORT-VARIANCE.html](docs/rapports/RAPPORT-VARIANCE.html).

## Licence

MIT, voir [LICENSE](LICENSE).
