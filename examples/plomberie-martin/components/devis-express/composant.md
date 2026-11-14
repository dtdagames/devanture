# devis-express

Demande de devis en trois champs, enregistrée dans la collection devis et transmise par e-mail. Composant propre au site.

Mots-clés : devis, demander un prix, estimation, rappel

## Données
- title : texte — titre du bloc
- intro : texte, facultatif — phrase sous le titre
- delai : texte, facultatif — délai de réponse annoncé (ex. 2 h ouvrées)

## Fonctionnement
- formulaire :
  - enregistre dans : devis
  - prévient par e-mail : oui
  - confirmation : Merci, un plombier vous rappelle pour chiffrer votre demande.
  - champs :
    - name
    - phone : facultatif
    - type_travaux : choix, un parmi Fuite ou dépannage, Chauffe-eau, Chaudière ou chauffage, Salle de bain, Autre — Type de travaux
    - details : texte long, facultatif — Précisions (ex. Étage, accès, urgence…)

## Forme
section, conteneur « devis-express-inner » :
- bloc « devis-express-text » :
  - titre : title
  - texte : intro
  - texte discret : Réponse sous {{ delai }}, du lundi au samedi. Ou appelez le [{{ site.contact.phone }}](tel:{{ site.contact.phone | replace(' ', '') }}).
- formulaire, bouton Demander un devis

## Apparence
- section : fond surface
- devis-express-inner : deux colonnes
- sur téléphone :
  - devis-express-inner : une colonne

## Exemple
```
## devis-express : Un devis en quelques minutes
Dites-nous ce qui ne va pas, nous rappelons avec un prix.
Delai : 2 h ouvrées
```
