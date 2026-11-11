# map

Carte et accès : adresse, boutons d'itinéraire, et carte OpenStreetMap chargée au clic (aucun appel tiers avant l'accord du visiteur) si lat et lon sont fournis.

Ordre : 94
Mots-clés : adresse, où, plan, carte, itinéraire, venir, accès, parking, métro

## Données
- title : texte, facultatif — défaut « Nous trouver »
- address : texte, facultatif — défaut l'adresse du site
- lat : nombre, facultatif — latitude (ex. 45.7772)
- lon : nombre, facultatif — longitude (ex. 4.8319)
- zoom : nombre entier, facultatif, de 10 à 19 — défaut 16
- access : texte, facultatif — indications d'accès (métro, parking, étage), paragraphes séparés par une ligne vide

## Forme
section, conteneur « map-inner » :
- bloc « map-info » :
  - grand titre : {{ title | default('Nous trouver') }}
  - adresse : address
  - paragraphes « muted » : access
  - itinéraire : address, lat, lon, zoom
- carte à la demande : lat, lon, zoom

## Exemple
```
## Accès : Nous trouver
Lat : 45.7772
Lon : 4.8319
Accès :
Métro C, arrêt Croix-Rousse, puis 3 minutes à pied.

Stationnement : parking Gros Caillou (payant).
```
