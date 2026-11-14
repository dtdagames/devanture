# hours

Horaires d'ouverture par jour, avec l'état « ouvert / fermé actuellement » calculé côté serveur et le jour courant mis en avant.

Ordre : 95
Mots-clés : horaires, ouvert, fermé, heures, ouverture, fermeture, lundi, mardi, mercredi, jeudi, vendredi, samedi, dimanche, aujourd'hui

## Données
- title : texte, facultatif — titre (défaut Horaires d'ouverture)
- intro : texte, facultatif
- note : texte, facultatif — mention sous le tableau (ex. Fermé les jours fériés)
- timezone : texte, facultatif — fuseau pour le calcul de l'état (défaut Europe/Paris)
- show_status : oui ou non, facultatif, par défaut oui — afficher « Ouvert actuellement » / « Fermé » (défaut true)
- days (liste, au moins 1) :
  - day : texte, un parmi lundi, mardi, mercredi, jeudi, vendredi, samedi, dimanche
  - slots : liste de plages horaires, facultatif, au moins 1 — plages HH:MM-HH:MM (ex. 06:30-19:30 ; deux plages pour une coupure)
  - closed : oui ou non, facultatif — true = fermé ce jour (sans slots)

## Fonctionnement
> Ce que le composant lit à chaque visite : l'état du moment et les plages de chaque jour, calculés par la cible.
- lit :
  - horaires : horaires du moment, jours days, fuseau timezone

## Forme
section, conteneur « hours-inner » :
- en-tête : {{ title | default("Horaires d'ouverture") }}, intro
- si show_status :
  - état d'ouverture : horaires.status_text, horaires.open
- tableau des horaires : horaires.days
- texte discret « hours-note » : note

## Exemple
```
## Horaires : Horaires d'ouverture
Note : Fermé les jours fériés.
- lundi | fermé : oui
- mardi | 06:30-19:30
- mercredi | 06:30-19:30
- jeudi | 06:30-19:30
- vendredi | 06:30-19:30
- samedi | 06:30-13:00, 15:00-19:30
- dimanche | 07:00-13:00
```
