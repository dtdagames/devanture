# collection.list

Liste d'une collection déclarée dans site.yaml (réalisations, équipe, recettes…) : cartes avec image, titre, texte, et lien vers la page de chaque élément si une page source: <collection> existe. Filtre, tri, limite.

Ordre : 45
Mots-clés : liste, réalisations, exemples, catalogue, équipe, actualités

## Données
- source : texte — nom de la collection (site.yaml › collections)
- title : texte, facultatif
- intro : texte, facultatif
- filter : groupe libre, facultatif — { champ: valeur } : seuls les éléments dont le champ vaut la valeur
- sort : texte, facultatif — champ de tri, précédé de - pour l'ordre décroissant (défaut : sort de la collection, sinon ordre du fichier)
- limit : nombre entier, facultatif, au moins 1
- columns : nombre entier, facultatif, un parmi 2, 3, 4 — défaut 3
- title_field : texte, facultatif — champ affiché en titre (défaut : title_field de la collection)
- image_field : texte, facultatif — champ image (défaut : premier champ asset)
- text_field : texte, facultatif — champ texte court (défaut : premier champ text)
- meta_field : texte, facultatif — champ affiché en surtitre, date ou catégorie (défaut : premier champ date)
- cta : lien, facultatif — lien sous la liste
- empty : texte, facultatif — texte quand la liste est vide (défaut : rien)

## Calculé
> Ce que le compilateur fournit à la section : les éléments de la collection, filtrés, triés, limités, sous des noms fixes.
- elements (liste) :
  - title : texte
  - image : image, facultatif
  - meta : texte, facultatif
  - meta_date : date, facultatif
  - text : texte, facultatif
  - url : texte, facultatif

## Forme
section « collection-list » :
- en-tête : title, intro
- si elements :
  - grille de elements, colonnes columns par défaut 3 :
    - carte de collection : title, image, meta, meta_date, text, url
- sinon :
  - texte discret : empty
- si cta :
  - bloc « col-cta » :
    - bouton : cta

## Exemple
```
## Liste : Nos derniers chantiers
Source : realisations
Filtre : category = salle-de-bain
Tri : -date
Limite : 6
```
