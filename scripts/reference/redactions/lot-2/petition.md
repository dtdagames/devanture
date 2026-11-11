# Pétition du marché du quartier

Ce composant permet aux visiteurs de signer une pétition pour sauver le marché du quartier.

Le composant s'ouvre sur un titre, que la page qui l'utilise fournit, sans texte d'introduction.
Le visiteur remplit un formulaire qui comporte les champs nom, e-mail, ville et message.
Le nom et l'e-mail sont obligatoires, tandis que la ville et le message sont facultatifs.
Le bouton d'envoi affiche « Je signe ».
Le nombre de signatures n'est pas limité, il n'y a donc aucune limite de places.
Chaque signature est enregistrée dans le registre « signatures ».
Une même adresse e-mail ne peut signer qu'une seule fois.
Si quelqu'un signe de nouveau avec la même adresse e-mail, le visiteur voit le message « Vous avez déjà signé. ».
Quand la signature est acceptée, le visiteur voit le message « Merci pour votre soutien. ».
L'association n'est pas prévenue par e-mail lorsqu'une signature arrive.
