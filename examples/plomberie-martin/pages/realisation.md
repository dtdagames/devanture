# {{ item.title }} · Plomberie Martin

Adresse : /realisations/[id]
Source : realisations
Description :
{{ item.title }} : un chantier Plomberie Martin, {{ item.category }}.

## Bandeau : {{ item.title }}
{{ item.category | replace('-', ' ') | capitalize }} · {{ item.date | date('F Y') }}
Alignement : left
Toutes les réalisations → /realisations

## Texte : Le chantier
{{ item.text }}
Image : {{ item.image }}

## Appel : Un projet semblable ?
Devis gratuit, réponse sous {{ const.delai_devis }}.
Demander un devis → /services#devis
