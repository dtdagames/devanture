# gallery

Grille d'images (réalisations, photos, produits) avec légende optionnelle et agrandissement au clic.

Ordre : 40
Mots-clés : photos, réalisations, galerie, exemples

## Données
- title : texte, facultatif
- intro : texte, facultatif
- columns : nombre entier, facultatif, un parmi 2, 3, 4 — colonnes (défaut 3)
- images (liste, au moins 1) :
  - src : image
  - alt : texte, facultatif — description pour l'accessibilité
  - caption : texte, facultatif

## Forme
- en-tête : title, intro
- grille « gallery-grid » de images, colonnes columns par défaut 3 :
  - figure « gallery-item » :
    - image : src, {{ alt | default(caption) | default('') }}, agrandissable
    - légende : caption

## Exemple
```
## Galerie : Nos réalisations
Colonnes : 3
- real-1.jpg | Cuisine rénovée | Cuisine, Lyon 3e
- real-2.jpg | Salle de bain
```
