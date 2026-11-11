# features

Grille de 2 à 6 points forts (icône, titre, texte court). Pour services, avantages, valeurs.

Ordre : 20
Mots-clés : services, prestations, avantages, pourquoi

## Données
- title : texte, facultatif — titre de la section
- intro : texte, facultatif — texte d'introduction sous le titre
- columns : nombre entier, facultatif, un parmi 2, 3, 4 — nombre de colonnes (défaut 3)
- items (liste, au moins 2) :
  - icon : icône, facultatif — pictogramme SVG (scale = justice, bread/croissant/cake = boulangerie, drop/flame/wrench = plomberie-chauffage, users = équipe, euro = tarifs)
  - title : texte
  - text : texte, facultatif
  - link : lien, facultatif — lien « en savoir plus » optionnel

## Forme
- en-tête : title, intro
- grille de items, colonnes columns par défaut 3 :
  - carte « feature » :
    - icône « feature-icon » : icon
    - titre : title
    - texte discret : text
    - lien « feature-link » : link

## Exemple
```
## Points forts : Pourquoi nous choisir
Colonnes : 3
- leaf | 100 % naturel | Huiles bio et locales
- truck | Livraison 48 h | Offerte dès 40 €
- heart | Fait main | Chaque pièce est unique
```
