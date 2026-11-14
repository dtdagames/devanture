# promo

Bandeau d'offre du moment : le texte de l'offre, un code à donner et une date de fin. Composant propre au site ; il remplace l'ancien bloc écrit en PHP.

Mots-clés : offre, promotion, réduction, code promo

## Données
- text : texte — l'offre du moment
- code : texte, facultatif — code à donner au téléphone
- until : texte, facultatif — date de fin (ex. 30 novembre)

## Forme
section, conteneur « promo-inner » :
- texte : **Offre du moment :** {{ text }}
- si code :
  - texte « promo-code » : Code **{{ code }}**
- si until :
  - texte discret : jusqu'au {{ until }}

## Apparence
- promo-inner : fond d'accent, coins arrondis, en ligne, compactes
- promo-code : gras

## Exemple
```
## promo
-15 % sur l'entretien annuel de chaudière
Code : ENTRETIEN15
Until : 30 novembre
```
