# Composants composés
> Composants composés : des assemblages nommés de composants existants, avec des paramètres.
> Usage dans une page : « ## offre : Dépannage », le prix en paragraphe (95 € TTC), puis « Points : Déplacement compris, Devis avant travaux ».

## offre
Une offre tarifaire : son prix, puis ses points forts en trois colonnes, et un bouton.

### Paramètres
- titre : texte — nom de l'offre
- prix : texte — prix affiché, texte libre (95 € TTC, sur devis)
- detail : texte, par défaut vide — phrase sous le prix
- points : liste, par défaut vide — liste de points forts (textes)
- cta : lien, par défaut Nous contacter → /contact — bouton sous les points

### Sections
```
## Tarifs : {{ p.titre }}
- rien
  - {{ p.titre }} | {{ p.prix }} | {{ p.detail }}

## Points forts
Colonnes : 3
- pour chaque pt de p.points : check | {{ pt }}

## Appel : {{ p.titre }} : parlons-en
Bouton : {{ p.cta }}
Style : surface
```
