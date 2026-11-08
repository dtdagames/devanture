# Quatre modifications à appliquer au site Garnier & Associés

Applique-les dans l'ordre. Chaque modification doit être complète avant de passer à la suivante. Si une modification est impossible dans tes contraintes, dis-le précisément dans ton rapport et passe à la suivante sans contourner par des moyens interdits.

## M1. Ajouter une FAQ sur la page d'accueil

Sur la page d'accueil, juste avant le dernier bandeau d'appel à l'action (ou en toute fin de page s'il n'y en a pas), ajouter une section « Questions fréquentes » en accordéon avec exactement ces trois questions :

1. Q : « Combien coûte la première consultation ? »
   R : « Elle est offerte et dure 30 minutes, au cabinet ou en visioconférence. »
2. Q : « Intervenez-vous en dehors de Bordeaux ? »
   R : « Oui, à Libourne et Arcachon, et devant toutes les juridictions de la cour d'appel de Bordeaux. »
3. Q : « Comment sont fixés les honoraires ? »
   R : « Au forfait ou au temps passé, toujours dans une convention d'honoraires signée avant toute intervention. »

## M2. Changer le thème

Couleur principale (boutons, liens, titres colorés) : `#6b2d5c`. Couleur d'accent (étoiles, filets) : `#d4a017`. Police des titres : Georgia, serif. Le reste du thème ne change pas. Le changement doit s'appliquer à tout le site.

## M3. Ajouter une page Recrutement

- Route : `/recrutement`. Titre SEO : « Recrutement · Garnier & Associés ». Description SEO : « Le cabinet recrute un collaborateur ou une collaboratrice en droit des affaires à Bordeaux. »
- Entrée « Recrutement » dans le menu principal, en avant-dernière position (juste avant « Contact »). Lien « Recrutement » aussi dans le pied de page.
- Contenu, dans l'ordre :
  1. Bandeau d'en-tête : titre « Rejoignez-nous », sous-titre « Le cabinet recrute un collaborateur ou une collaboratrice en droit des affaires. »
  2. Bloc de texte, titre « Le poste », deux paragraphes :
     « Vous rejoindrez l'équipe de Me Thomas Ruiz sur des dossiers de droit des sociétés, de contrats commerciaux et de contentieux d'affaires, pour une clientèle de PME et de dirigeants de la région bordelaise. »
     « Profil : titulaire du CAPA, deux ans d'expérience minimum, rigueur rédactionnelle et goût du contact client. Rémunération selon profil, prise de poste dès que possible. »
  3. Bandeau d'appel à l'action : titre « Candidater », texte « Envoyez CV et lettre de motivation via le formulaire de contact. », bouton « Postuler » vers `/contact`.

## M4. Ajouter un champ au formulaire de contact

Ajouter un champ texte facultatif « Entreprise » (nom technique `company`), placé après le téléphone s'il existe, sinon après l'e-mail. Sa valeur doit être enregistrée dans la ligne JSON du message (clé `company`) et apparaître dans le corps de l'e-mail. Le champ n'est pas obligatoire.
