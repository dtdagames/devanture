# Réservation d'une visite guidée

Ce composant permet au visiteur de réserver une place pour une visite guidée du musée à l'un des horaires proposés.

Il affiche en haut un titre et une phrase d'introduction, que la page qui l'utilise lui fournit.

Le visiteur remplit un formulaire composé de l'horaire (10 h, 14 h, 16 h), du nom, de l'e-mail et du nombre de personnes (par exemple 2).

Le bouton d'envoi porte le texte « Réserver ma visite guidée ».

Chaque réservation est enregistrée dans le registre « visites guidees ».

Chaque horaire offre 25 places, et elles se comptent selon le nombre de personnes indiqué dans la réservation, pas selon le nombre de réservations.

Quand un horaire est complet, le visiteur est placé sur liste d'attente et voit le message « Cet horaire est complet, vous êtes inscrit sur liste d'attente. ».

Une même adresse e-mail ne peut faire qu'une seule réservation par horaire.

Si elle en a déjà une à cet horaire, le visiteur voit le message « Vous avez déjà une réservation à cet horaire. ».

Quand la réservation est acceptée, le visiteur voit le message « Votre visite est réservée. ».

Le musée n'est pas prévenu par e-mail lorsqu'une réservation arrive.

Le composant affiche aussi, pour chacun des trois horaires, le nombre de places encore disponibles.
