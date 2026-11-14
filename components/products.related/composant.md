# products.related

Produits de la même catégorie que le produit affiché (page dynamique source: products).

Ordre : 112
Mots-clés : similaires, autres produits

## Données
- title : texte, facultatif — défaut « Vous aimerez aussi »
- limit : nombre entier, facultatif, au moins 1 — défaut 3

## Fonctionnement
> Ce que le composant lit à chaque visite : les autres produits de la catégorie du produit de la page, avec leur stock.
- lit :
  - voisins : produits voisins, limite limit

## Forme
section « products », seulement si voisins :
- en-tête : {{ title | default("Vous aimerez aussi") }}
- grille « products-grid » de voisins, 3 colonnes :
  - aperçu de produit : valeur

## Exemple
```
## products.related : Dans la même gamme
Limite : 3
```
