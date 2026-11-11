# Consignes données aux agents de la mesure « site en YAML ou en documents »

Douze agents sans contexte (Sonnet), trois par case : création en YAML, création en documents, éditions en YAML, éditions en documents.
`DOSSIER` est remplacé par le dossier de l'essai (`mesure-document/<tâche>/<format>/run<n>`). Les deux consignes d'une même tâche
ne diffèrent que par le format demandé et les commandes qui vont avec.

## Création, en YAML

Tu es un agent de test. Dépôt : C:\Users\sergi\nodeLanguage (Windows, Node 24). Il contient un compilateur `sitec` qui transforme la description d'un site vitrine en site PHP. Cette description s'écrit dans l'un de deux formats : en YAML (`site.yaml`, `pages/<id>.page.yaml`) ou en documents (`site.md`, `pages/<id>.md`). Mission : écrire un site vitrine complet EN YAML (pas en documents), en te servant UNIQUEMENT de C:\Users\sergi\nodeLanguage\CLAUDE.md (lis-le en entier d'abord) et des commandes `node bin/sitec.js catalog`, `node bin/sitec.js explain <composant>` (dont `explain site`) et `node bin/sitec.js check <dossier>`, depuis C:\Users\sergi\nodeLanguage.
INTERDIT : lire src/, components/, examples/, baseline/, maintenance/, variance/, docs/, scripts/, mesure-document/ (hors ton dossier) ou tout autre fichier du dépôt que CLAUDE.md ; modifier quoi que ce soit hors de ton dossier ; exécuter `build`.
Brief client : « Cabinet Garnier & Associés, avocats à Bordeaux, fondé en 2011. Trois associés : Me Hélène Garnier (droit du travail), Me Thomas Ruiz (droit des affaires), Me Inès Kaddour (droit de la famille). Deux collaboratrices et une assistante. Première consultation de 30 minutes offerte. Honoraires au forfait ou au temps passé, convention d'honoraires systématique. Interventions à Bordeaux, Libourne et Arcachon. Adresse : 25 cours de l'Intendance, 33000 Bordeaux. Tél 05 56 00 00 00, email contact@garnier-associes.fr. »
Site attendu : 5 pages (accueil, domaines d'intervention, le cabinet / équipe, honoraires, contact) plus mentions légales, dans le dossier DOSSIER (crée-le). Au moins 7 composants différents. Textes crédibles, pas de lorem ipsum, pas de témoignages inventés. Images : `node scripts/placeholders.mjs DOSSIER nom.svg "Légende"`.
Protocole : écris le site, lance `check`, corrige jusqu'à `{"ok":true,...}`. Note chaque exécution de `check` et son nombre d'erreurs.
Rapport final, COURT (10 lignes maximum) : nombre d'appels d'outils, nombre d'exécutions de `check` et le nombre d'erreurs à chacune, nombre de `explain`, une ligne par difficulté rencontrée. Rien d'autre.

## Création, en documents

Même consigne, avec : « Mission : écrire un site vitrine complet EN DOCUMENTS (`site.md` et `pages/<id>.md` ; pas de fichier YAML), en te servant UNIQUEMENT de C:\Users\sergi\nodeLanguage\CLAUDE.md (lis-le en entier d'abord) et des commandes `node bin/sitec.js catalog`, `node bin/sitec.js explain document`, `node bin/sitec.js explain <composant> --document` (dont `explain site`), `node bin/sitec.js lire <dossier> --accepter` et `node bin/sitec.js check <dossier>` » ; et le protocole : « écris le site, lance `lire <dossier> --accepter` puis `check`, corrige jusqu'à `{"ok":true,...}`. Note chaque exécution de `check` et son nombre d'erreurs. »

## Éditions, en YAML

Tu es un agent de test. Dépôt : C:\Users\sergi\nodeLanguage (Windows, Node 24). Il contient un compilateur `sitec` qui transforme la description d'un site vitrine en site PHP. Cette description s'écrit dans l'un de deux formats : en YAML (`site.yaml`, `pages/<id>.page.yaml`) ou en documents (`site.md`, `pages/<id>.md`). Le dossier DOSSIER contient un site écrit EN YAML. Mission : lui appliquer les quatre modifications décrites dans C:\Users\sergi\nodeLanguage\maintenance\MODIFICATIONS-garnier.md (lis ce fichier), sans changer de format, en te servant UNIQUEMENT de C:\Users\sergi\nodeLanguage\CLAUDE.md (lis-le en entier d'abord) et des commandes `node bin/sitec.js catalog`, `node bin/sitec.js explain <composant>` (dont `explain site`) et `node bin/sitec.js check <dossier>`, depuis C:\Users\sergi\nodeLanguage.
INTERDIT : lire src/, components/, examples/, baseline/, variance/, docs/, scripts/, mesure-document/ (hors ton dossier), maintenance/ (hors le fichier des modifications) ou tout autre fichier du dépôt que CLAUDE.md ; modifier quoi que ce soit hors de ton dossier ; exécuter `build`.
Protocole : applique les modifications, lance `check`, corrige jusqu'à `{"ok":true,...}`. Note chaque exécution de `check` et son nombre d'erreurs.
Rapport final, COURT (10 lignes maximum) : nombre d'appels d'outils, nombre d'exécutions de `check` et le nombre d'erreurs à chacune, nombre de `explain`, une ligne par difficulté rencontrée. Rien d'autre.

## Éditions, en documents

Même consigne, avec : « Le dossier DOSSIER contient un site écrit EN DOCUMENTS » ; les commandes `node bin/sitec.js catalog`, `node bin/sitec.js explain document`, `node bin/sitec.js explain <composant> --document` (dont `explain site`), `node bin/sitec.js lire <dossier> --accepter` et `node bin/sitec.js check <dossier>` ; et le protocole : « applique les modifications, lance `lire <dossier> --accepter` puis `check`, corrige jusqu'à `{"ok":true,...}` ».
