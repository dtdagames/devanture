# contact.form

Formulaire de contact avec validation serveur, anti-spam et envoi par e-mail. Champs connus ou champs libres. Coordonnées affichées à côté.

Ordre : 100
Mots-clés : contact, écrire, message, devis, rendez-vous, formulaire, email, téléphone, adresse, joindre, appeler, coordonnées, rappeler, demande

## Données
- title : texte, facultatif
- intro : texte, facultatif
- to : e-mail — adresse qui reçoit les messages
- fields : liste de champs, facultatif, au moins 1 — champs dans l'ordre. Chaque élément est soit un nom connu (name | email | phone | subject | message), soit un objet { name*, label*, type, required, options, placeholder } avec type parmi text | email | tel | number | date | select | textarea (select exige options). Défaut : [name, email, message]
- required : liste de textes, facultatif — noms des champs obligatoires (défaut : name, email, message s'ils sont présents). Un objet de champ peut aussi porter required: true
- success : texte, facultatif — message affiché après envoi
- show_contact : oui ou non, facultatif, par défaut oui — afficher adresse / téléphone du site à côté (défaut true)

## Fonctionnement
> Ce que le composant lit à chaque visite : l'état du formulaire (saisie conservée, erreurs, envoi réussi). Les champs
> viennent de la page ; la cible valide, enregistre le message et prévient par e-mail quand le formulaire revient.
- lit :
  - saisie : saisie du contact, champs fields

## Forme
section « contact », ancre « contact » :
- en-tête : title, intro
- contact en colonnes, show_contact :
  - formulaire de contact : saisie, success
  - si show_contact :
    - coordonnées du site

## Exemple
```
## Formulaire de contact : Demande de devis
Destinataire : contact@maisondubois.fr
Confirmation : Merci, nous revenons vers vous sous 24 h.
Champs :
- name
- email
- phone
- company : facultatif — Entreprise
- event_date : date — Date de l'événement
- guests : nombre, facultatif — Nombre de convives
- kind : facultatif, un parmi Mariage, Anniversaire, Séminaire — Type d'événement
- message
```
