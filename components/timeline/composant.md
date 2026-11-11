# timeline

Frise chronologique : dates clés avec titre et texte (histoire d'une entreprise, parcours).

Ordre : 99
Mots-clés : histoire, dates, chronologie, depuis quand, parcours

## Données
- title : texte, facultatif
- intro : texte, facultatif
- items (liste, au moins 2) :
  - date : texte ou nombre — année ou date affichée (ex. 1987, « mars 2015 »)
  - title : texte
  - text : texte, facultatif

## Forme
section, conteneur « timeline-inner » :
- en-tête : title, intro
- liste numérotée « timeline-list » de items :
  - élément « tl-item » :
    - date « tl-date » : date
    - bloc « tl-body » :
      - titre : title
      - texte discret : text

## Exemple
```
## Dates : Notre histoire
- 1987 | Ouverture de l'atelier | Jeanne Dubois s'installe rue des Lilas.
- 2015 | Camille reprend | Les cosmétiques solides rejoignent la gamme.
```
