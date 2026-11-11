# pricelist

Liste de prix ou carte : groupes (catégories) d'articles avec prix libre (« 1,30 € », « à partir de 95 € », « sur devis »), description et badge.

Ordre : 96
Mots-clés : prix, tarifs, combien, coût, carte, tarif

## Données
- title : texte, facultatif
- intro : texte, facultatif
- note : texte, facultatif — mention sous la liste (ex. Prix TTC, hors déplacement)
- columns : nombre entier, facultatif, un parmi 1, 2 — groupes sur 1 ou 2 colonnes (défaut 2 si plusieurs groupes)
- cta : lien, facultatif — bouton sous la liste
- groups (liste, au moins 1) :
  - title : texte, facultatif — nom de la catégorie
  - text : texte, facultatif — courte description de la catégorie
  - items (liste, au moins 1) :
    - name : texte
    - price : texte ou nombre — texte libre : « 1,30 € », « à partir de 95 € », « sur devis » ; un nombre est affiché avec €
    - description : texte, facultatif
    - badge : texte, facultatif — mention courte mise en avant (ex. Nouveau, Médaille d'argent 2024)
    - unit : texte, facultatif — unité ou condition (ex. / kg, la pièce, par heure)

## Forme
- en-tête : title, intro
- rangée « pricelist-groups » de groups, variante columns par défaut 2 :
  - bloc « pricelist-group » :
    - titre : title
    - texte discret : text
    - liste « pricelist-items » de items :
      - ligne de tarif : name, price, description, badge, unit
- texte discret « pricelist-note » : note
- si cta :
  - bloc « pricelist-cta » :
    - bouton : cta

## Exemple
```
## Tarifs : Nos tarifs
Note : Prix TTC. Devis gratuit pour tous travaux.
- Dépannage
  - Déplacement + 1 h de main-d'œuvre | à partir de 95 € | Majoration de 30 % dimanches et fériés
  - Recherche de fuite | 180 € | mention : Rapport assurance inclus
- Entretien
  - Contrat entretien chaudière | 129 € | unité : par an
```
