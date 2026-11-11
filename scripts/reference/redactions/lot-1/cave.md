# Réservation de visite de cave

Ce composant permet au visiteur de réserver une visite de cave à l'un des créneaux proposés.
Le titre et la phrase d'introduction sont fournis par la page qui utilise le composant.
Le visiteur remplit le créneau (Samedi 10 h, Samedi 15 h, Dimanche 10 h), le nombre de visiteurs, son nom et son e-mail.
Le formulaire comporte un bouton « Réserver ma visite ».
Chaque créneau compte 15 places, décomptées selon le nombre de visiteurs.
Si le créneau est complet, la réservation est mise en liste d'attente, sans message particulier.
Un même e-mail ne peut réserver qu'une seule fois le même créneau, et dans ce cas le visiteur voit le message « Vous avez déjà réservé ce créneau. »
Quand la réservation est acceptée, le visiteur voit le message « Votre visite est réservée. »
Les réservations sont enregistrées dans le registre « visites ».
Chaque réservation envoie un e-mail à l'équipe du site.
Les places restantes de chaque créneau s'affichent, sur une ligne par créneau.
