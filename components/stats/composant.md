# stats

Chiffres clés en ligne (valeur, libellé). Exemple : 25 ans d'expérience, 300 chantiers.

Ordre : 90
Mots-clés : chiffres, expérience, depuis quand

## Données
- title : texte, facultatif
- items (liste, au moins 2) :
  - value : texte ou nombre — le chiffre tel qu'affiché (ex : 25+, 98 %). Entre guillemets si décimal ("4,9").
  - label : texte

## Forme
- en-tête : title
- rangée « stats-row » de items :
  - bloc « stat » :
    - bloc « stat-value » : value
    - bloc « stat-label » : label

## Exemple
```
## Chiffres
- 25 ans | d'expérience
- 300+ | chantiers réalisés
- 98 % | de clients satisfaits
```
