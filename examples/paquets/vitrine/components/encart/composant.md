# encart

Encadré mis en avant : icône, titre, texte court et lien. Pour une information à ne pas manquer (consultation offerte, délai, fermeture exceptionnelle).

Mots-clés : à savoir, information, important

## Props
```yaml
type: object
required:
  - title
properties:
  title:
    type: string
    description: titre de l'encadré
  text:
    type: string
    description: texte court, balisage léger accepté (**gras**, liens)
  icon:
    type: string
    description: "pictogramme (liste : sitec explain features), défaut check"
  tone:
    type: string
    enum:
      - info
      - attention
      - succes
    description: couleur de l'encadré (défaut info)
  link:
    $ref: "#/$defs/link"
    description: lien sous le texte
```

## Exemple
```
## vitrine.encart : Première consultation offerte
Trente minutes pour faire le point, sans engagement.
Icône : clock
Ton : info
Prendre rendez-vous → /contact
```
