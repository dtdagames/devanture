# Vocabulaire
> Mots du site : des éléments de forme en plus des primitives. Les composants du site les emploient comme des primitives
> (« - sortie du four: baked »). Fiche d'un mot : sitec explain "sortie du four" examples/le-fournil.

## commande par téléphone
Un numéro à appeler pour commander, avec un bouton qui le copie.

### Données
- numero : texte

### Forme
- bloc « comptoir-commande » :
  - texte : numero
  - copier, libellé « Copier le numéro » : numero

## sortie du four
L'heure à laquelle un produit sort du four, balisée comme une heure (<time>) : ce que les primitives ne savent pas écrire.

### Données
- heure : texte — au format 07:30

### Gabarit
```html
<p class="sortie-du-four"><span class="sortie-du-four-point" aria-hidden="true"></span>Sortie du four à <time datetime="{{ heure }}">{{ heure | replace(':', ' h ') }}</time></p>
```

### Feuille
```css
.sortie-du-four{display:flex;align-items:center;gap:8px;margin:0;font-size:.9rem;font-weight:600;color:var(--color-primary)}
.sortie-du-four-point{width:8px;height:8px;border-radius:50%;background:var(--color-success)}
```
