# onglets

Contenus en onglets : un bouton par onglet, un seul panneau visible à la fois (clavier : flèches). Sans JavaScript, tous les panneaux restent lisibles.

Mots-clés : formules, comparer, options

## Données
- title : texte, facultatif — titre de la section
- intro : texte, facultatif
- items (liste, au moins 2) :
  - label : texte — texte du bouton
  - title : texte, facultatif — titre du panneau (défaut label)
  - text : texte — texte du panneau, balisage léger et listes acceptés
  - link : lien, facultatif

## Forme
- en-tête : title, intro
- onglets de items, libellé label :
  - sous-titre : {{ title | default(label) }}
  - paragraphes : text
  - bouton discret : link

## Exemple
```
## vitrine.onglets : Nos formules
- Forfait | texte : Un prix global pour une mission définie.
- Temps passé | texte : Un taux horaire adapté à la durée réelle.
```
