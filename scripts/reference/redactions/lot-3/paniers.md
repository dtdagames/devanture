# Précommande de paniers de légumes

Ce composant permet aux visiteurs de réserver un ou plusieurs paniers de légumes pour la semaine à venir.
Le titre et la phrase d'introduction affichés en haut ne sont pas gérés par le composant : ils sont fournis par la page qui l'utilise.
Le formulaire demande la taille du panier (Petit, Grand), le nom, l'adresse e-mail, le téléphone et le nombre de paniers souhaité, par exemple 1.
Le téléphone n'est pas obligatoire, les autres champs le sont.
Le bouton d'envoi affiche « Je précommande ».
Il y a 40 paniers au total pour la semaine, et la capacité se compte en paniers, pas en personnes.
Quand il ne reste plus assez de paniers pour une demande, la précommande est refusée avec le message « Tous les paniers de la semaine sont réservés ».
Une même adresse e-mail ne peut précommander qu'une seule fois par semaine ; si elle recommence, le message « Vous avez déjà précommandé cette semaine » s'affiche.
Quand la précommande est acceptée, le visiteur voit le message « Votre panier vous attend vendredi ».
Chaque précommande acceptée est enregistrée dans le registre « precommandes ».
La ferme reçoit un e-mail à chaque précommande acceptée.
Le composant affiche en permanence le nombre de paniers encore disponibles pour la semaine.
