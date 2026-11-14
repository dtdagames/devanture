# team

Présentation de l'équipe (photo, nom, rôle, courte bio).

Ordre : 80
Mots-clés : équipe, qui, membres, associés, personnel

## Données
- title : texte, facultatif
- intro : texte, facultatif
- members (liste, au moins 1) :
  - name : texte
  - role : texte, facultatif
  - photo : image, facultatif
  - bio : texte, facultatif

## Forme
- en-tête : title, intro
- grille de members, 4 colonnes :
  - bloc « team-member » :
    - portrait « team-avatar » : photo, name
    - titre : name
    - bloc « muted » : role
    - texte : bio

## Exemple
```
## Équipe : L'équipe
- Jeanne Dubois | Fondatrice | jeanne.jpg
- Paul Martin | Maître savonnier | 15 ans de métier
```
