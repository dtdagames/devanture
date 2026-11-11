# Inscription à un cours de cuisine

Ce composant permet à un visiteur de réserver une place dans un cours de cuisine.
Il affiche en haut un titre et une phrase d'introduction, tous deux fournis par la page qui l'utilise.
Il montre aussi le nombre de places qui restent.
Le visiteur remplit son nom, son téléphone, son e-mail et son régime alimentaire (Aucun, Végétarien, Sans gluten).
Le bouton d'envoi porte le texte « Je réserve ma place ».
Les inscriptions sont enregistrées dans le registre « cours ».
Le cours accueille 10 places en tout, et chaque inscription occupe 1 place.
Quand le cours est complet, le visiteur est placé sur liste d'attente et lit le message « Le cours est complet, nous vous avons mis sur liste d'attente. ».
Un même numéro de téléphone ne peut s'inscrire qu'une seule fois, et un doublon reçoit le message « Ce numéro est déjà inscrit. ».
Quand l'inscription est acceptée, le visiteur lit le message « Votre place est réservée, à bientôt en cuisine. ».
L'équipe reçoit un e-mail à chaque inscription.
