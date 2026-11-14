# avis-defilants

Carrousel d'avis clients : note en étoiles, texte, prénom et date, boutons précédent et suivant, défilement lent.

Mots-clés : avis, témoignages, ce que disent les clients, note

## Données
- title : texte, facultatif — titre de la section
- intro : texte, facultatif — phrase sous le titre
- items (liste, au moins 1) :
  - rating : nombre entier, de 1 à 5, facultatif — note sur 5
  - text : texte — texte de l'avis
  - author : texte — prénom
  - date : date, facultatif — date de l'avis (AAAA-MM-JJ)
- link : lien, facultatif — lien vers tous les avis

## Forme
- en-tête : title, intro
- défilement de items, automatique :
  - témoignage :
    - étoiles : rating
    - citation : text
    - signature : author, date, en toutes lettres
- bouton discret : link

## Apparence
- étoiles : couleur d'accent
- bouton discret : espace au-dessus
- sur téléphone :
  - flèches : masquées

## Exemple
```
## avis-defilants : Ils parlent de nous
Tous les avis → /contact
- 5 | Le meilleur pain du quartier, croustillant à souhait. | Claire | 2026-10-02
- 4 | Des viennoiseries généreuses. | Hugo
```
