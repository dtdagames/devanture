# Références des bancs

`exemples-yaml/` garde les exemples du dépôt dans leur écriture YAML d'origine (`site.yaml`, `pages/<id>.page.yaml`,
`manifest.yaml`, `vocabulaire.yaml`, cas de test, `package.yaml`, `hosts.yaml`). Les exemples eux-mêmes, dans `examples/`,
sont écrits en documents depuis la v0.16.0.

Ces fichiers ne sont pas des modèles à suivre : ils servent aux bancs qui

- comparent les deux écritures d'un même site (`scripts/verify-site-document.mjs` : mêmes données, mêmes fichiers compilés,
  même HTML rendu) ;
- exercent la conversion (`sitec rediger`) sur une copie, et vérifient qu'il n'y reste en YAML que les composés ;
- exercent ce qui lit et récrit du YAML (`scripts/verify-lang-tools.mjs`, `scripts/verify-document.mjs`) ;
- mesurent le texte à écrire dans chaque écriture (`scripts/measure-site-document.mjs`).

Un changement de contenu dans un exemple se fait dans `examples/` ; il n'a pas à être reporté ici, sauf pour
`garnier-associes`, que le banc compare à sa référence donnée pour donnée.
