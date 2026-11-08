# Quatre modifications à appliquer au site Le Fournil

Applique-les dans l'ordre. Chaque modification doit être complète avant de passer à la suivante. Si une modification est impossible dans tes contraintes, dis-le précisément dans ton rapport et passe à la suivante sans contourner par des moyens interdits.

## M1. Ajouter une FAQ sur la page d'accueil

Sur la page d'accueil, juste avant le dernier bandeau d'appel à l'action (ou en toute fin de page s'il n'y en a pas), ajouter une section « Questions fréquentes » en accordéon avec exactement ces trois questions :

1. Q : « Faites-vous du pain sans gluten ? »
   R : « Non, notre fournil travaille le blé et le seigle ; nous ne pouvons pas garantir l'absence de traces. »
2. Q : « Peut-on réserver une pièce montée ? »
   R : « Oui, avec dix jours de préavis, par téléphone ou via le formulaire de contact. »
3. Q : « Êtes-vous ouverts le lundi ? »
   R : « Non, la boulangerie est fermée le lundi. Ouvert du mardi au dimanche de 6 h 30 à 19 h 30. »

## M2. Changer le thème

Couleur principale (boutons, liens, titres colorés) : `#6b2d5c`. Couleur d'accent (étoiles, filets) : `#d4a017`. Police des titres : Georgia, serif. Le reste du thème ne change pas. Le changement doit s'appliquer à tout le site.

## M3. Ajouter une page Recrutement

- Route : `/recrutement`. Titre SEO : « Recrutement · Le Fournil ». Description SEO : « La boulangerie Le Fournil recrute un apprenti boulanger à Nantes pour la rentrée. »
- Entrée « Recrutement » dans le menu principal, en avant-dernière position (juste avant « Contact »). Lien « Recrutement » aussi dans le pied de page.
- Contenu, dans l'ordre :
  1. Bandeau d'en-tête : titre « Rejoignez-nous », sous-titre « Le Fournil recrute un apprenti boulanger pour la rentrée. »
  2. Bloc de texte, titre « Le poste », deux paragraphes :
     « Vous apprendrez le pain au levain naturel, les viennoiseries pur beurre et la pâtisserie de saison aux côtés de Marc Lefèvre, dans un fournil de quartier où tout est pétri, façonné et cuit sur place. »
     « Profil : CAP boulanger en cours ou en projet, goût du travail d'équipe et du lever tôt. Contrat d'apprentissage de deux ans, repos le lundi, prise de poste en septembre. »
  3. Bandeau d'appel à l'action : titre « Candidater », texte « Envoyez-nous quelques lignes et votre CV via le formulaire de contact. », bouton « Postuler » vers `/contact`.

## M4. Ajouter un champ au formulaire de contact

Ajouter un champ texte facultatif « Entreprise » (nom technique `company`), placé après le téléphone s'il existe, sinon après l'e-mail. Sa valeur doit être enregistrée dans la ligne JSON du message (clé `company`) et apparaître dans le corps de l'e-mail. Le champ n'est pas obligatoire.
