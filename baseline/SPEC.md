# Spécification commune des sites de baseline

Site vitrine en PHP 8.1+ (sans framework, sans Composer, sans extension optionnelle : pas de mbstring, pas de curl, pas d'intl), JavaScript vanilla, CSS sans préprocesseur. Doit tourner tel quel avec le serveur intégré : `php -S localhost:PORT -t <dossier> <dossier>/index.php` (index.php sert de routeur et renvoie `false` pour les fichiers statiques existants).

## Pages (6)

Routes propres sans extension (`/`, `/nos-produits`, …), définies dans un tableau de routes du routeur. Une page inconnue renvoie un vrai HTTP 404 avec une page « Page introuvable » dans la mise en page du site.

Chaque page a un `<title>` et une `<meta name="description">` propres.

## Mise en page commune

- En-tête collant avec nom du site et navigation ; l'entrée de la page courante porte `aria-current="page"`.
- Menu mobile : bouton « Menu » visible sous 760 px qui déplie la navigation (JS).
- Pied de page : nom du site, mention légale courte, liens, coordonnées (adresse, téléphone cliquable `tel:`, e-mail cliquable `mailto:`).
- Responsive : aucune barre de défilement horizontale à 375 px de large.
- Palette et polices définies une seule fois en variables CSS dans `:root`.

## Blocs à utiliser (au moins 7 types différents sur l'ensemble du site)

- Bandeau d'en-tête (titre, sous-titre, image de fond optionnelle avec voile sombre, 1 ou 2 boutons).
- Grille de points forts (icône, titre, texte), 2 à 4 colonnes.
- Bloc de texte riche avec image à côté (gauche ou droite), plusieurs paragraphes.
- Galerie d'images en grille avec légende et agrandissement au clic (lightbox en JS, fermeture par clic ou Échap).
- Témoignages (citation, auteur, lieu, note en étoiles optionnelle).
- FAQ en accordéon (`<details>`), première question ouverte.
- Bandeau d'appel à l'action (titre, texte, bouton).
- Équipe (nom, rôle, bio, photo ou initiale dans un disque).
- Chiffres clés en ligne.
- Formulaire de contact (voir ci-dessous).

## Formulaire de contact

- Champs paramétrables parmi nom, e-mail, téléphone, sujet, message ; champs obligatoires paramétrables.
- Méthode POST sur la même page. Validation côté serveur : champs obligatoires, e-mail valide. En cas d'erreur, réaffichage du formulaire avec les valeurs saisies et un message par champ fautif.
- Jeton CSRF en session, vérifié avec `hash_equals`.
- Champ pot de miel caché : si rempli, on affiche le succès sans rien enregistrer.
- Succès : message de confirmation à la place du formulaire. Le message est ajouté en JSON (une ligne) dans `data/messages.jsonl` (dossier créé si absent) et envoyé par `mail()` à l'adresse configurée, avec `Reply-To` sur l'expéditeur.
- Tout texte affiché est échappé avec `htmlspecialchars` (ENT_QUOTES, UTF-8).

## Images

Pas de vraies photos : génère des SVG de substitution avec
`node scripts/placeholders.mjs <dossier-du-site> nom.svg "Légende" autre.svg "Légende"` (crée `<dossier>/assets/*.svg`). Cette commande est autorisée.

## Contenu

Textes rédigés et crédibles à partir du brief, pas de lorem ipsum. Mentions légales plausibles.
