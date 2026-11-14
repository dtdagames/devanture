# richtext

Bloc de texte libre (plusieurs paragraphes) avec titre optionnel et image à côté. Pour « à propos », histoire, présentation.

Ordre : 30
Mots-clés : à propos, histoire, qui sommes-nous, présentation

## Données
- title : texte, facultatif
- text : texte long — texte, paragraphes séparés par une ligne vide (utiliser | en YAML)
- image : image, facultatif — image affichée à côté du texte
- image_position : texte, facultatif, un parmi left, right — côté de l'image (défaut right)
- cta : lien, facultatif

## Forme
section, variante image_position par défaut right, conteneur « richtext-split » si image, conteneur « richtext-narrow » sans image :
- bloc « richtext-body » :
  - grand titre : title
  - paragraphes : text
  - bouton : cta
- image « richtext-media » : image, {{ title | default('') }}

## Exemple
```
## Texte : Notre histoire
Fondé en 1987 par Jeanne Dubois, l'atelier perpétue un savoir-faire familial.

Chaque savon est saponifié à froid puis séché quatre semaines.
Image : atelier.jpg
```
