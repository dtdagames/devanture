# Bibliothèque de composants PHP

À copier dans le site (`components/`, `lib/`, `assets/site.css`, `assets/site.js`). Elle couvre les blocs de la spécification ; il reste à écrire le routeur (`index.php`), la mise en page (`layout.php` : head, en-tête, nav, pied de page) et les pages.

## lib/render.php

- `e($v)` : échappement HTML.
- `asset($path)` : URL d'un fichier de `assets/`.
- `url($to)` : URL d'une route.
- `paragraphs($text)` : texte en paragraphes (ligne vide = nouveau paragraphe).
- `first_letter($s)`, `str_cut($s, $max)` : helpers UTF-8 sans mbstring.
- `render_component($name, array $p)` : inclut `components/<name>.php` avec `$p` (les props du composant, voir COMPOSANTS.md).
- `render_link(array $link, $class)` : `<a>` à partir de `{ label, to }`.

## lib/forms.php

- `handle_contact_form(array $site)` : à appeler avant tout affichage, après `session_start()`. Lit `$_POST` (`_form=contact`, `_csrf`, `_to`, `_required`, champs), valide, enregistre dans `data/messages.jsonl`, envoie par `mail()`. Renvoie `['status' => null|'ok'|'error', 'message', 'errors', 'data']`.
- `csrf_token()` : jeton de session.

Le composant `contact.form` lit les variables globales `$formResult` (résultat ci-dessus, enrichi de `['csrf' => csrf_token()]`) et `$site` (tableau avec `name`, `contact` → `email`, `phone`, `address`).

## assets/site.css

Variables de thème dans `:root` (`--color-primary`, `--font-heading`, …), styles de base (`.container`, `.section`, `.btn`, `.grid-3`, `.card`, en-tête `.site-header`, nav `.site-nav`, bouton `.nav-toggle`, pied `.site-footer`, 404 `.page-404`) et styles des dix composants.

## assets/site.js

Menu mobile (`.nav-toggle` / `.site-nav.open`) et lightbox de la galerie (`[data-lightbox]`).
