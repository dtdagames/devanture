# steps

Étapes numérotées (déroulé d'un dossier, d'une prestation, d'une commande).

Ordre : 98
Mots-clés : étapes, comment ça se passe, déroulement, processus, procédure

## Données
- title : texte, facultatif
- intro : texte, facultatif
- items (liste, au moins 2) :
  - title : texte
  - text : texte, facultatif

## Forme
- en-tête : title, intro
- liste numérotée « steps-list » de items :
  - élément « step » :
    - numéro « step-num »
    - bloc :
      - titre : title
      - texte discret : text

## Exemple
```
## Étapes : Comment ça se passe
- Premier échange | 30 minutes offertes pour comprendre votre situation.
- Convention d'honoraires | Un devis écrit avant toute démarche.
- Suivi | Un interlocuteur unique jusqu'à la fin du dossier.
```
