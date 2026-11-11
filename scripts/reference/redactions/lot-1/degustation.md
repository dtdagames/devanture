# Inscription à une dégustation de fromages

Ce composant permet aux visiteurs de réserver une place à une dégustation de fromages, à la date de leur choix.
Le titre et la phrase d'introduction qui le précèdent sont fournis par la page qui utilise le composant.
Le formulaire demande la date (choix : 14 mars, 11 avril), le nom, l'e-mail et, facultativement, le téléphone.
Le bouton d'envoi affiche « Je m'inscris ».
Chaque date compte 12 places, et chaque inscription en réserve une.
Si la date choisie est complète, l'envoi est refusé avec le message « Cette date est complète ».
Une même adresse e-mail ne peut s'inscrire qu'une seule fois à une même date, et sinon le message affiché est « Vous êtes déjà inscrit à cette date ».
Lorsque l'inscription est acceptée, le visiteur voit le message « Merci, votre place est réservée ».
Les inscriptions sont enregistrées dans le registre « degustations ».
La fromagerie reçoit un e-mail à chaque nouvelle inscription.
Pour chaque date, le composant affiche le nombre de places restantes.
