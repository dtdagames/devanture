# Inscription à une soirée jeux de société

Ce composant permet à un visiteur de s'inscrire à l'une des soirées jeux de société du café.

Il affiche en haut un titre et une phrase d'introduction, que la page qui utilise le composant fournit.

Le visiteur remplit un formulaire avec les champs soirée (Vendredi 6 juin, Vendredi 20 juin), nom, e-mail et nombre de joueurs (par exemple 3).

Le bouton d'envoi porte le texte « Je viens jouer ».

Chaque inscription est enregistrée dans le registre « soirees ».

Chaque soirée accueille 20 places au maximum, et les places se comptent selon le nombre de joueurs indiqué.

Quand une soirée est complète, l'inscription est refusée avec le message « Cette soirée affiche complet. ».

Une même adresse e-mail ne peut s'inscrire qu'une seule fois par soirée.

Si cette adresse est déjà inscrite à la soirée choisie, le visiteur voit le message « Vous êtes déjà inscrit à cette soirée. ».

Quand l'inscription est acceptée, le visiteur voit le message « C'est noté, à vendredi. ».

Le café reçoit un e-mail à chaque nouvelle inscription.

Le composant affiche aussi les places restantes de chaque soirée.
