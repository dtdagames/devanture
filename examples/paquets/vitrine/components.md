# Composants composés

## contact-rapide
Un encart puis un bandeau d'appel : le téléphone et l'adresse viennent de site.contact.

### Paramètres
- titre : texte — titre de l'encart
- texte : texte, par défaut vide — phrase sous le titre
- bouton : lien, par défaut Nous écrire → /contact — bouton du bandeau

### Sections
```
## vitrine.encart : {{ p.titre }}
{{ p.texte }}
Icône : phone
Ton : succes

## Appel : Appelez le {{ site.contact.phone }}
{{ site.contact.address }}
Bouton : {{ p.bouton }}
Style : surface
```
