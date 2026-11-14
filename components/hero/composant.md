# hero

Bandeau d'en-tête de page, avec titre, sous-titre, image de fond optionnelle et 1 ou 2 boutons.

Ordre : 10
Mots-clés : accueil, présentation

## Données
- title : texte — titre principal (h1)
- subtitle : texte, facultatif — phrase d'accroche sous le titre
- image : image, facultatif — image de fond, fichier dans assets/
- cta : lien, facultatif — bouton principal
- secondary : lien, facultatif — second bouton, style contour
- align : texte, facultatif, un parmi left, center — alignement du texte (défaut center)

## Forme
bandeau, variante align par défaut center, image de fond image, conteneur « hero-inner » :
- titre principal : title
- texte « hero-sub » : subtitle
- si cta ou secondary :
  - bloc « hero-actions » :
    - bouton : cta
    - bouton discret : secondary

## Exemple
```
## Bandeau : Des savons faits main
Fabriqués en Provence depuis 1987
Image : hero.jpg
Découvrir → /boutique
Nous contacter → /contact
```
