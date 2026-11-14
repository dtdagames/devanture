# testimonials

Témoignages clients (citation, auteur, rôle ou ville, note optionnelle).

Ordre : 50
Mots-clés : avis, témoignages, clients, note

## Données
- title : texte, facultatif
- items (liste, au moins 1) :
  - quote : texte
  - author : texte
  - role : texte, facultatif — fonction, entreprise ou ville
  - rating : nombre entier, de 1 à 5, facultatif — note sur 5

## Forme
- en-tête : title
- grille de items, 3 colonnes :
  - témoignage « testimonial » :
    - étoiles : rating
    - citation : quote
    - signature : author, role

## Exemple
```
## Témoignages : Ils nous font confiance
- Travail soigné et dans les délais. | Marie L. | Lyon | 5
- Équipe à l'écoute. | Karim B. | Villeurbanne
```
