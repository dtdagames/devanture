# products.grid

Grille de produits depuis data/products.yaml : image, nom, prix, badge, bouton d'ajout au panier et lien vers la fiche. Filtre par catégorie ou mis en avant.

Ordre : 110
Mots-clés : boutique, acheter, produits, commander, catalogue, articles

## Données
- title : texte, facultatif
- intro : texte, facultatif
- filter (groupe, facultatif) :
  - category : texte, facultatif — catégorie telle qu'écrite dans products.yaml
  - featured : oui ou non, facultatif — true = seulement les produits featured: true
- sort : texte, facultatif, un parmi name, price, price_desc — ordre d'affichage (défaut ordre du fichier)
- limit : nombre entier, facultatif, au moins 1
- columns : nombre entier, facultatif, un parmi 2, 3, 4 — défaut 3
- show_add : oui ou non, facultatif, par défaut oui — bouton « Ajouter au panier » (défaut true)
- cta : lien, facultatif — lien sous la grille (ex. vers la boutique complète)

## Fonctionnement
> Ce que le composant lit à chaque visite : les produits de la sélection, avec leur stock du moment.
- lit :
  - produits : produits de la boutique, catégorie filter.category, vedettes filter.featured, tri sort, limite limit

## Forme
section « products » :
- en-tête : title, intro
- si produits :
  - grille « products-grid » de produits, colonnes columns par défaut 3 :
    - carte de produit : valeur, show_add
- sinon :
  - texte discret : « Aucun produit dans cette sélection pour le moment. »
- si cta :
  - bloc « products-cta » :
    - bouton discret : cta

## Exemple
```
## products.grid : Nos savons
Filtre : catégorie = savons
Colonnes : 3
Toute la boutique → /boutique
```
