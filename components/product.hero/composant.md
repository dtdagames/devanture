# product.hero

Fiche produit (page dynamique /produit/[id], source: products) : image, nom, prix, description, stock et ajout au panier avec quantité.

Ordre : 111
Mots-clés : fiche produit, détail, acheter

## Données
- back : lien, facultatif — lien de retour (ex. vers la boutique)
- show_stock : oui ou non, facultatif, par défaut oui — afficher le stock restant (défaut true)

## Fonctionnement
> Ce que le composant lit à chaque visite : le produit de la page, son prix et son stock du moment.
- lit :
  - produit : produit de la page

## Forme
section « product-hero », conteneur « product-hero-inner », seulement si produit :
- fiche de produit : produit, back, show_stock

## Exemple
```
## product.hero
Retour à la boutique → /boutique
```
