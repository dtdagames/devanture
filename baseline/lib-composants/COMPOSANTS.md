# Fiches des composants (props attendues dans le tableau $p)

# hero
Bandeau d'en-tête de page, avec titre, sous-titre, image de fond optionnelle et 1 ou 2 boutons.

Props :
  title (obligatoire): string — titre principal (h1)
  subtitle: string — phrase d'accroche sous le titre
  image: fichier dans assets/ — image de fond, fichier dans assets/
  cta: lien { label*, to* } — bouton principal
  secondary: lien { label*, to* } — second bouton, style contour
  align: left | center — alignement du texte (défaut center)

Exemple :
  - hero:
      title: Des savons faits main
      subtitle: Fabriqués en Provence depuis 1987
      image: hero.jpg
      cta: { label: Découvrir, to: /boutique }
      secondary: { label: Nous contacter, to: /contact }
  

# features
Grille de 2 à 6 points forts (icône, titre, texte court). Pour services, avantages, valeurs.

Props :
  title: string — titre de la section
  intro: string — texte d'introduction sous le titre
  columns: 2 | 3 | 4 — nombre de colonnes (défaut 3)
  items (obligatoire): liste de objets (min 2)
      .icon: leaf | truck | star | heart | shield | clock | phone | tools | home | check | sun | gift — pictogramme
      .title*: string
      .text: string
      .link: lien { label*, to* } — lien « en savoir plus » optionnel

Exemple :
  - features:
      title: Pourquoi nous choisir
      columns: 3
      items:
        - { icon: leaf, title: 100 % naturel, text: Huiles bio et locales }
        - { icon: truck, title: Livraison 48 h, text: Offerte dès 40 € }
        - { icon: heart, title: Fait main, text: Chaque pièce est unique }
  

# richtext
Bloc de texte libre (plusieurs paragraphes) avec titre optionnel et image à côté. Pour « à propos », histoire, présentation.

Props :
  title: string
  text (obligatoire): string — texte, paragraphes séparés par une ligne vide (utiliser | en YAML)
  image: fichier dans assets/ — image affichée à côté du texte
  image_position: left | right — côté de l'image (défaut right)
  cta: lien { label*, to* }

Exemple :
  - richtext:
      title: Notre histoire
      image: atelier.jpg
      text: |
        Fondé en 1987 par Jeanne Dubois, l'atelier perpétue un savoir-faire familial.
  
        Chaque savon est saponifié à froid puis séché quatre semaines.
  

# gallery
Grille d'images (réalisations, photos, produits) avec légende optionnelle et agrandissement au clic.

Props :
  title: string
  intro: string
  columns: 2 | 3 | 4 — colonnes (défaut 3)
  images (obligatoire): liste de objets (min 1)
      .src*: fichier dans assets/
      .alt: string — description pour l'accessibilité
      .caption: string

Exemple :
  - gallery:
      title: Nos réalisations
      columns: 3
      images:
        - { src: real-1.jpg, alt: Cuisine rénovée, caption: Cuisine, Lyon 3e }
        - { src: real-2.jpg, alt: Salle de bain }
  

# testimonials
Témoignages clients (citation, auteur, rôle ou ville, note optionnelle).

Props :
  title: string
  items (obligatoire): liste de objets (min 1)
      .quote*: string
      .author*: string
      .role: string — fonction, entreprise ou ville
      .rating: integer — note sur 5

Exemple :
  - testimonials:
      title: Ils nous font confiance
      items:
        - { quote: Travail soigné et dans les délais., author: Marie L., role: Lyon, rating: 5 }
        - { quote: Équipe à l'écoute., author: Karim B., role: Villeurbanne }
  

# faq
Questions fréquentes en accordéon (question, réponse).

Props :
  title: string
  intro: string
  items (obligatoire): liste de objets (min 1)
      .q*: string — question
      .a*: string — réponse (paragraphes séparés par une ligne vide)

Exemple :
  - faq:
      title: Questions fréquentes
      items:
        - { q: Livrez-vous partout en France ?, a: Oui, sous 48 h ouvrées. }
        - q: Puis-je retourner un produit ?
          a: Vous avez 14 jours pour changer d'avis.
  

# cta
Bandeau d'appel à l'action (titre, texte, bouton). À placer en fin de page.

Props :
  title (obligatoire): string
  text: string
  button (obligatoire): lien { label*, to* }
  style: primary | surface — fond coloré (primary) ou discret (surface), défaut primary

Exemple :
  - cta:
      title: Un projet en tête ?
      text: Devis gratuit sous 48 h.
      button: { label: Demander un devis, to: /contact }
  

# team
Présentation de l'équipe (photo, nom, rôle, courte bio).

Props :
  title: string
  intro: string
  members (obligatoire): liste de objets (min 1)
      .name*: string
      .role: string
      .photo: fichier dans assets/
      .bio: string

Exemple :
  - team:
      title: L'équipe
      members:
        - { name: Jeanne Dubois, role: Fondatrice, photo: jeanne.jpg }
        - { name: Paul Martin, role: Maître savonnier, bio: 15 ans de métier }
  

# stats
Chiffres clés en ligne (valeur, libellé). Exemple : 25 ans d'expérience, 300 chantiers.

Props :
  title: string
  items (obligatoire): liste de objets (min 2)
      .value*: string ou number — le chiffre tel qu'affiché (ex : 25+, 98 %). Entre guillemets si décimal ("4,9").
      .label*: string

Exemple :
  - stats:
      items:
        - { value: 25 ans, label: d'expérience }
        - { value: 300+, label: chantiers réalisés }
        - { value: 98 %, label: de clients satisfaits }
  

# contact.form
Formulaire de contact avec validation serveur, anti-spam et envoi par e-mail. Coordonnées affichées à côté.

Props :
  title: string
  intro: string
  to (obligatoire): email — adresse qui reçoit les messages
  fields: liste parmi : name | email | phone | subject | message — champs affichés dans l'ordre (défaut name, email, message)
  required: liste parmi : name | email | phone | subject | message — champs obligatoires (défaut name, email, message)
  success: string — message affiché après envoi
  show_contact: boolean — afficher adresse / téléphone du site à côté (défaut true)

Exemple :
  - contact.form:
      title: Écrivez-nous
      to: contact@maisondubois.fr
      fields: [name, email, phone, message]
      success: Merci, nous vous répondons sous 24 h.
  

