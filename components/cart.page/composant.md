# cart.page

Panier : lignes, quantités modifiables, suppression, sous-total, livraison, total, bouton vers la commande. Une seule par site.

Ordre : 113
Mots-clés : panier, mon panier, commande en cours

## Données
- title : texte, facultatif — défaut « Votre panier »
- empty_text : texte, facultatif — texte quand le panier est vide
- continue : lien, facultatif — lien « continuer mes achats »

## Fonctionnement
> Ce que le composant lit à chaque visite : le panier de la session. Les quantités et les retraits passent par /_cart.
- lit :
  - panier : panier du visiteur

## Forme
section « cart », conteneur « cart-inner » :
- titre principal : {{ title | default("Votre panier") }}
- si panier.empty :
  - texte discret : {{ empty_text | default("Votre panier est vide.") }}
  - bouton : continue
- sinon :
  - tableau du panier : panier.lines
  - totaux du panier : panier.subtotal_text, panier.shipping_text, panier.total_text, panier.free_from_text
  - bloc « cart-actions » :
    - bouton discret : continue
    - bouton : panier.checkout

## Exemple
```
## cart.page
Continuer mes achats → /boutique
```
