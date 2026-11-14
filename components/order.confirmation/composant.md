# order.confirmation

Confirmation de commande (page dynamique /commande/[id], source: orders) : numéro, lignes, total, instructions de paiement, coordonnées.

Ordre : 115
Mots-clés : confirmation, suivi de commande, ma commande

## Données
- title : texte, facultatif — défaut « Merci pour votre commande »
- text : texte, facultatif — texte sous le titre
- cta : lien, facultatif — lien de sortie (ex. retour à l'accueil)

## Fonctionnement
> Ce que le composant lit à chaque visite : la commande de la page, son statut et où en est le paiement.
- lit :
  - commande : commande de la page

## Forme
section « order », seulement si commande :
- événement d'achat : commande.total
- titre principal : {{ title | default("Merci pour votre commande") }}
- texte : text
- reçu de commande : commande
- si cta :
  - bloc « order-cta » :
    - bouton : cta

## Exemple
```
## order.confirmation
Vous recevez un e-mail de confirmation dans quelques minutes.
Retour à l'accueil → /
```
