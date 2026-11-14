# Paquet vitrine

Composants partagés pour sites Devanture.

| Composant | Sorte | Usage |
|---|---|---|
| `vitrine.encart` | gabarit (`components/encart/`) | encadré mis en avant : icône, titre, texte, lien ; ton info, attention ou succès |
| `vitrine.contact-rapide` | composé (`components.yaml`) | encart puis bandeau d'appel, coordonnées lues dans le site |

Dans un site : `packages: [ ../paquets/vitrine ]` à la racine de `site.yaml`, puis `- vitrine.encart: { title: …, text: … }`.
Tests : `sitec test <dossier-du-site>` rend chaque cas de `components/*/fixtures/*.yaml` et le compare à son instantané `.html`.
