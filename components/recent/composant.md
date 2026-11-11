# recent

Mémoire du visiteur : « Vous avez regardé » avec les produits et sections consultés récemment, d'après le profil tenu dans son navigateur (consentement requis). N'affiche rien tant qu'il n'y a pas d'historique.

Ordre : 97
Mots-clés : historique, déjà vu, reprendre, récemment

## Données
- title : texte, facultatif — défaut « Reprendre où vous en étiez »
- limit : nombre entier, facultatif, de 1 à 8 — défaut 4
- kinds : liste de textes, facultatif, un parmi products, sections — ce qui est repris (défaut les deux)

## Fonctionnement
> Ce que le composant lit à chaque visite : la mémoire du visiteur (rien sans consentement, rien sans historique).
- lit :
  - recents : consultations récentes, limite limit, types kinds

## Forme
section, seulement si recents :
- en-tête : {{ title | default("Reprendre où vous en étiez") }}
- liste « recent-list » de recents :
  - consultation récente : title, url, meta, image, is_product

## Exemple
```
## recent : Vous aviez regardé
Limite : 4
```
