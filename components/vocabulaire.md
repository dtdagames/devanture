# Vocabulaire
> Mots natifs du langage : des éléments de forme en plus des primitives, définis ici et non dans le compilateur.
> Un site ou un paquet en ajoute de la même façon dans son propre vocabulaire.md. Fiche d'un mot : sitec explain "<mot>".

## ligne de tarif
Une ligne de carte ou de tarif, à placer dans une liste : nom, prix, puis description, mention mise en avant et unité.

### Données
- nom : texte
- prix : texte ou nombre — un nombre est affiché avec €
- description : texte, facultatif
- mention : texte, facultatif — mention courte mise en avant (Nouveau, Médaille d'argent)
- unite : texte, facultatif — unité ou condition (/ kg, la pièce, par heure)

### Gabarit
```html
<li class="pricelist-item">
  <div class="pricelist-main">
    <span class="pricelist-name">{{ nom }}{% if mention %} <span class="badge">{{ mention }}</span>{% endif %}</span>
    {% if description %}<span class="pricelist-desc muted">{{ description }}</span>{% endif %}
  </div>
  <span class="pricelist-price">{{ prix | price }}{% if unite %} <span class="muted pricelist-unit">{{ unite }}</span>{% endif %}</span>
</li>
```

### Feuille
```css
.pricelist-item{display:flex;justify-content:space-between;gap:16px;align-items:baseline;padding:10px 0;border-bottom:1px dashed var(--color-border)}
.pricelist-main{display:flex;flex-direction:column;gap:2px}
.pricelist-name{font-weight:600}
.pricelist-desc{font-size:.92rem}
.pricelist-price{font-family:var(--font-heading);font-weight:700;color:var(--color-primary);white-space:nowrap}
.pricelist-unit{font-family:var(--font-body);font-weight:400;font-size:.9rem}
.badge{display:inline-block;font-size:.75rem;font-weight:600;background:var(--color-accent);color:#1b1f24;padding:1px 8px;border-radius:999px;margin-left:6px;vertical-align:middle}
```

## adresse
Une adresse postale sur ses lignes ; sans donnée, celle du site (site.contact.address).

### Données
- lieu : texte, facultatif

### Gabarit
```html
{% set a = lieu | default(site.contact.address) | default('') %}
{% if a %}<p class="map-address">{{ lines(a) }}</p>{% endif %}
```

### Feuille
```css
.map-address{font-size:1.1rem;font-weight:600}
```

## itinéraire
Deux boutons, « Itinéraire » et « Voir sur OpenStreetMap », vers un point (latitude, longitude) ou, à défaut, vers une adresse (celle du site sans donnée).

### Données
- lieu : texte, facultatif
- lat : nombre, facultatif
- lon : nombre, facultatif
- zoom : nombre entier, facultatif — de 10 à 19, 16 par défaut

### Gabarit
```html
{% if lat and lon %}
{% set osm = 'https://www.openstreetmap.org/?mlat=' ~ lat ~ '&mlon=' ~ lon ~ '#map=' ~ (zoom | default(16) | int) ~ '/' ~ lat ~ '/' ~ lon %}
{% set gm = 'https://www.google.com/maps/dir/?api=1&destination=' ~ lat ~ ',' ~ lon %}
{% else %}
{% set a = lieu | default(site.contact.address) | default('') %}
{% set osm = 'https://www.openstreetmap.org/search?query=' ~ (a | url_encode) %}
{% set gm = 'https://www.google.com/maps/dir/?api=1&destination=' ~ (a | url_encode) %}
{% endif %}
<p class="map-links"><a class="btn" href="{{ gm }}" rel="noopener" target="_blank">Itinéraire</a> <a class="btn btn-outline" href="{{ osm }}" rel="noopener" target="_blank">Voir sur OpenStreetMap</a></p>
```

### Feuille
```css
.map-links{display:flex;gap:10px;flex-wrap:wrap}
```

## carte à la demande
Carte OpenStreetMap d'un point, chargée seulement quand le visiteur clique : aucun appel à un tiers avant son accord.

### Données
- lat : nombre
- lon : nombre
- zoom : nombre entier, facultatif — de 10 à 19, 16 par défaut

### Gabarit
```html
<div class="map-frame" data-sl-map="{{ lat }},{{ lon }},{{ zoom | default(16) | int }}">
  <button type="button" class="map-load">Afficher la carte<span class="muted">OpenStreetMap, chargée à votre demande</span></button>
</div>
```

### Feuille
```css
.map-frame{min-height:280px;border:1px solid var(--color-border);border-radius:var(--radius);overflow:hidden;background:var(--color-surface);display:flex;align-items:center;justify-content:center}
.map-load{font:inherit;background:var(--color-bg);border:1px solid var(--color-border);border-radius:var(--radius);padding:16px 22px;cursor:pointer;color:var(--color-fg);display:flex;flex-direction:column;gap:4px;align-items:center}
.map-load .muted{font-size:.85rem}
```

## carte de collection
Carte d'un élément de collection : image, surtitre (date ou catégorie), titre, résumé, et lien vers sa page quand elle existe.

### Données
- titre : texte
- image : image, facultatif
- surtitre : texte, facultatif — catégorie, écrite en clair
- date : date, facultatif — affichée « Mois année », à la place du surtitre
- resume : texte, facultatif — coupé à 160 caractères
- url : texte, facultatif — adresse de la page de l'élément

### Gabarit
```html
<article class="card col-item">
  {% if image %}
  {% if url %}<a href="{{ url }}" class="col-img">{{ img(image, titre, '(max-width: 700px) 100vw, 33vw') }}</a>{% else %}<div class="col-img">{{ img(image, titre, '(max-width: 700px) 100vw, 33vw') }}</div>{% endif %}
  {% endif %}
  <div class="col-body">
    {% if date %}<p class="col-meta muted">{{ date | date('F Y') | capitalize }}</p>{% elif surtitre %}<p class="col-meta muted">{{ surtitre | replace('-', ' ') | capitalize }}</p>{% endif %}
    <h3>{% if url %}<a href="{{ url }}">{{ titre }}</a>{% else %}{{ titre }}{% endif %}</h3>
    {% if resume %}<p class="col-text">{{ resume | truncate(160) }}</p>{% endif %}
    {% if url %}<a class="col-more" href="{{ url }}">Voir →</a>{% endif %}
  </div>
</article>
```

### Feuille
```css
.col-item{display:flex;flex-direction:column;padding:0;overflow:hidden}
.col-item .col-img img{width:100%;aspect-ratio:4/3;object-fit:cover}
.col-item .col-body{padding:16px 18px 18px;display:flex;flex-direction:column;gap:6px;flex:1}
.col-item h3{margin:0;font-size:1.05rem}
.col-item h3 a{color:inherit;text-decoration:none}
.col-item h3 a:hover{text-decoration:underline}
.col-meta{margin:0;font-size:.85rem;text-transform:uppercase;letter-spacing:.04em}
.col-text{margin:0;font-size:.92rem;flex:1}
.col-more{align-self:flex-start;font-weight:600;text-decoration:none;margin-top:4px}
```

> --- horaires : ce que la source « horaires du moment » fournit, mis en forme
## état d'ouverture
L'état du moment, « Ouvert actuellement · ferme à 18 h » ou « Fermé actuellement · ouvre demain à 8 h », en pastille.

### Données
- texte : texte
- ouvert : oui ou non, facultatif

### Gabarit
```html
<div class="hours-status {% if ouvert %}is-open{% else %}is-closed{% endif %}" role="status">{{ texte }}</div>
```

### Feuille
```css
.hours-status{display:inline-block;padding:6px 14px;border-radius:999px;font-weight:600;margin:0 auto 18px;display:table}
.hours-status.is-open{background:#e7f5ec;color:#1e6b3a}
.hours-status.is-closed{background:var(--color-surface);color:var(--color-muted);border:1px solid var(--color-border)}
```

## tableau des horaires
Les jours et leurs plages d'ouverture, en tableau ; le jour de la visite est mis en avant.

### Données
- jours (liste) :
  - name : texte
  - slots_text : texte, facultatif
  - today : oui ou non, facultatif

### Gabarit
```html
<table class="hours-table">
  <tbody>
  {% for j in jours %}
    <tr{% if j.today %} class="is-today"{% endif %}>
      <th scope="row">{{ j.name }}</th>
      <td>{% if j.slots_text %}{{ j.slots_text }}{% else %}<span class="muted">Fermé</span>{% endif %}</td>
    </tr>
  {% endfor %}
  </tbody>
</table>
```

### Feuille
```css
.hours-table{width:100%;border-collapse:collapse}
.hours-table th,.hours-table td{padding:10px 12px;border-bottom:1px solid var(--color-border);text-align:left}
.hours-table th{width:40%;font-weight:600}
.hours-table tr.is-today th,.hours-table tr.is-today td{background:var(--color-surface);color:var(--color-primary)}
```

> --- mémoire du visiteur
## consultation récente
Un élément déjà consulté par le visiteur (produit ou section), à placer dans une liste : vignette, titre, précision.

### Données
- titre : texte
- url : texte
- precision : texte, facultatif — prix du produit, ou page de la section
- image : image, facultatif
- produit : oui ou non, facultatif

### Gabarit
```html
<li class="recent-item{% if produit %} is-product{% endif %}">
  <a href="{{ url }}">
    {% if image %}{{ img(image, '', '80px') }}{% endif %}
    <span class="recent-title">{{ titre }}</span>
    <span class="muted recent-meta">{{ precision }}</span>
  </a>
</li>
```

### Feuille
```css
.recent-item a{display:flex;align-items:center;gap:12px;padding:12px 14px;border:1px solid var(--color-border);border-radius:var(--radius);background:var(--color-surface);text-decoration:none;color:var(--color-fg)}
.recent-item img{width:48px;height:48px;object-fit:cover;border-radius:6px}
.recent-title{font-weight:600;display:block}
.recent-meta{font-size:.85rem;display:block}
```

> --- boutique : ce que les sources de la boutique fournissent, mis en forme ; les actions passent par /_cart (docs/CIBLES.md)
## événement d'achat
Marque invisible qui compte un achat dans les mesures du site (événement purchase).

### Données
- total : nombre

### Gabarit
```html
{{ event('purchase', 'total', total) }}
```

## événement de vue de produit
Marque invisible qui compte la vue d'un produit dans les mesures du site (événement product_view).

### Données
- id : texte
- categorie : texte, facultatif

### Gabarit
```html
{{ event('product_view', 'product', id, 'category', categorie | default('')) }}
```

## événement de début de commande
Marque invisible qui compte l'arrivée sur la page de commande (événement checkout_start).

### Gabarit
```html
{{ event('checkout_start') }}
```

## aperçu de produit
Carte courte d'un produit : photo, nom, prix et bouton « Voir », tous liés à sa page.

### Données
- produit (groupe) :
  - name : texte
  - price_text : texte
  - url : texte, facultatif
  - image : image, facultatif

### Gabarit
```html
<article class="card product-card">
  {% if produit.image %}<a href="{{ produit.url }}" class="product-img">{{ img(produit.image, produit.name, '(max-width: 700px) 50vw, 25vw') }}</a>{% endif %}
  <h3><a href="{{ produit.url }}">{{ produit.name }}</a></h3>
  <div class="product-foot"><span class="product-price">{{ produit.price_text }}</span><a class="btn btn-outline" href="{{ produit.url }}">Voir</a></div>
</article>
```

### Feuille
```css
.product-card{display:flex;flex-direction:column;gap:8px;padding:0;overflow:hidden}
.product-card .product-img img{width:100%;aspect-ratio:4/3;object-fit:cover}
.product-card h3{margin:14px 18px 0;font-size:1.05rem}
.product-card h3 a{color:inherit;text-decoration:none}
.product-foot{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:0 18px 16px}
.product-price{font-family:var(--font-heading);font-weight:700;color:var(--color-primary);font-size:1.1rem}
```

## reçu de commande
Le reçu d'une commande : numéro, date, statut, lignes, totaux, où en est le paiement, adresse de livraison.

### Données
- commande (groupe) :
  - id : texte
  - date_text : texte
  - status_text : texte
  - lines (liste) :
    - qty : nombre
    - name : texte
    - total_text : texte
  - subtotal_text : texte
  - shipping_text : texte
  - total_text : texte
  - note : texte, facultatif
  - address : texte
  - email : texte

### Gabarit
```html
<div class="order-box">
  <p>Commande <strong>n° {{ commande.id }}</strong> du {{ commande.date_text }} · <span class="order-status">{{ commande.status_text }}</span></p>
  <ul class="order-lines">{% for l in commande.lines %}<li><span>{{ l.qty }} × {{ l.name }}</span><span>{{ l.total_text }}</span></li>{% endfor %}</ul>
  <div>Sous-total : {{ commande.subtotal_text }} · Livraison : {{ commande.shipping_text }}</div>
  <p><strong>Total : {{ commande.total_text }}</strong></p>
  {% if commande.note %}<p class="muted">{{ commande.note }}</p>{% endif %}
  <p class="muted">Livraison à : {{ lines(commande.address) }}<br>Confirmation envoyée à {{ commande.email }}.</p>
</div>
```

### Feuille
```css
.order-box{background:var(--color-surface);border:1px solid var(--color-border);border-radius:var(--radius);padding:24px;max-width:720px}
.order-lines{list-style:none;margin:12px 0;padding:0}
.order-lines li{display:flex;justify-content:space-between;gap:10px;padding:6px 0;border-bottom:1px dashed var(--color-border)}
.order-status{display:inline-block;padding:4px 12px;border-radius:999px;background:var(--color-accent);color:#1b1f24;font-size:.85rem;font-weight:600}
```

## carte de produit
Carte d'un produit dans une grille : photo, nom, mention ou stock bas, résumé, prix, et le bouton qui l'ajoute au panier (ou « Épuisé »).

### Données
- produit (groupe) :
  - id : texte
  - name : texte
  - price_text : texte
  - url : texte, facultatif
  - image : image, facultatif
  - summary : texte, facultatif
  - badge : texte, facultatif
  - unit : texte, facultatif
  - category : texte, facultatif
  - stock : nombre, facultatif
  - low_stock : oui ou non, facultatif
  - in_stock : oui ou non, facultatif
- ajout : oui ou non, facultatif — avec le bouton « Ajouter »

### Gabarit
```html
<article class="card product-card">
  {% if produit.image %}<a href="{{ produit.url | default('#') }}" class="product-img">{{ img(produit.image, produit.name, '(max-width: 700px) 50vw, 25vw') }}</a>{% endif %}
  <h3>{% if produit.url %}<a href="{{ produit.url }}">{{ produit.name }}</a>{% else %}{{ produit.name }}{% endif %}{% if produit.badge %} <span class="badge">{{ produit.badge }}</span>{% elif produit.low_stock %} <span class="badge badge-low">Plus que {{ produit.stock | int }}</span>{% endif %}</h3>
  {% if produit.summary %}<p class="muted product-desc">{{ produit.summary }}</p>{% endif %}
  <div class="product-foot">
    <span class="product-price">{{ produit.price_text }}{% if produit.unit %} <span class="muted">/ {{ produit.unit }}</span>{% endif %}</span>
    {% if ajout and produit.in_stock %}
    <form method="post" action="/_cart" class="add-to-cart" data-category="{{ produit.category }}">
      {{ csrf() }}<input type="hidden" name="action" value="add"><input type="hidden" name="id" value="{{ produit.id }}">
      <button class="btn" type="submit">Ajouter</button>
    </form>
    {% elif ajout %}<span class="muted product-soldout">Épuisé</span>{% endif %}
  </div>
</article>
```

### Feuille
```css
.product-card{display:flex;flex-direction:column;gap:8px;padding:0;overflow:hidden}
.product-card .product-img img{width:100%;aspect-ratio:4/3;object-fit:cover}
.product-card h3{margin:14px 18px 0;font-size:1.05rem}
.product-card h3 a{color:inherit;text-decoration:none}
.product-card .product-desc{margin:0 18px;font-size:.92rem;flex:1}
.product-foot{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:0 18px 16px}
.product-price{font-family:var(--font-heading);font-weight:700;color:var(--color-primary);font-size:1.1rem}
.add-to-cart{margin:0}
.add-to-cart .btn{padding:8px 14px;font-size:.92rem}
.badge-low{background:#f3d9c2;color:#7a3a10}
```

## ajout au panier
Le bouton qui ajoute un produit au panier du visiteur (action « add » de /_cart) ; sans quantité, il en ajoute un.

### Données
- id : texte
- categorie : texte, facultatif — sert aux mesures (événement add_to_cart)
- libelle : texte, facultatif — texte du bouton (Ajouter)

### Gabarit
```html
<form method="post" action="/_cart" class="add-to-cart" data-category="{{ categorie }}">
  {{ csrf() }}<input type="hidden" name="action" value="add"><input type="hidden" name="id" value="{{ id }}">
  <button class="btn" type="submit">{{ libelle | default('Ajouter') }}</button>
</form>
```

### Feuille
```css
.add-to-cart{margin:0}
.add-to-cart .btn{padding:8px 14px;font-size:.92rem}
```

## fiche de produit
La fiche d'un produit : photo, nom, catégorie, prix, description, quantité et ajout au panier, stock restant ou « Épuisé ».

### Données
- produit (groupe) :
  - id : texte
  - name : texte
  - price_text : texte
  - max_qty : nombre
  - image : image, facultatif
  - badge : texte, facultatif
  - category : texte, facultatif
  - unit : texte, facultatif
  - description : texte, facultatif
  - in_stock : oui ou non, facultatif
  - low_stock : oui ou non, facultatif
  - stock_text : texte, facultatif
- retour : lien, facultatif — lien de retour, au-dessus du nom
- stock_visible : oui ou non, facultatif — afficher le stock restant

### Gabarit
```html
{% if produit.image %}<div class="product-hero-media">{{ img(produit.image, produit.name, '(max-width: 700px) 100vw, 50vw', true) }}</div>{% endif %}
<div class="product-hero-body">
  {{ event('product_view', 'product', produit.id, 'category', produit.category | default('')) }}
  {% if retour %}{{ link(retour, 'product-back') }}{% endif %}
  <h1>{{ produit.name }}{% if produit.badge %} <span class="badge">{{ produit.badge }}</span>{% endif %}</h1>
  {% if produit.category %}<div class="muted product-cat">{{ produit.category | capitalize }}</div>{% endif %}
  <div class="product-hero-price">{{ produit.price_text }}{% if produit.unit %} <span class="muted">/ {{ produit.unit }}</span>{% endif %}</div>
  {% if produit.description %}<div class="product-hero-desc">{{ paragraphs(produit.description) }}</div>{% endif %}
  {% if produit.in_stock %}
  <form method="post" action="/_cart" class="add-to-cart product-add" data-category="{{ produit.category }}">
    {{ csrf() }}<input type="hidden" name="action" value="add"><input type="hidden" name="id" value="{{ produit.id }}">
    <label>Quantité <input type="number" name="qty" value="1" min="1" max="{{ produit.max_qty }}"></label>
    <button class="btn" type="submit">Ajouter au panier</button>
  </form>
  {% if stock_visible and produit.stock_text %}<p class="product-stock{% if produit.low_stock %} product-stock-low{% else %} muted{% endif %}">{{ produit.stock_text }}</p>{% endif %}
  {% else %}<p class="product-stock"><strong>Épuisé</strong> · revenez bientôt ou contactez-nous.</p>{% endif %}
</div>
```

### Feuille
```css
.product-hero-media img{width:100%;border-radius:var(--radius);aspect-ratio:4/3;object-fit:cover}
.product-back{display:inline-block;margin-bottom:12px;text-decoration:none;font-size:.95rem}
.product-hero-price{font-family:var(--font-heading);font-size:1.8rem;font-weight:700;color:var(--color-primary);margin:8px 0 16px}
.product-add{display:flex;gap:14px;align-items:end;flex-wrap:wrap;margin-top:12px}
.product-add label{display:flex;flex-direction:column;gap:4px;font-size:.9rem}
.product-add input{width:90px;padding:9px 10px;border:1px solid var(--color-border);border-radius:6px;font:inherit;background:var(--color-bg);color:var(--color-fg)}
.product-stock{margin-top:10px;font-size:.95rem}
.product-stock-low{color:#b2541a;font-weight:600}
```

## tableau du panier
Les lignes du panier en tableau : article, prix, quantité modifiable (action « set » de /_cart), total, retrait (action « remove »).

### Données
- lignes (liste) :
  - id : texte
  - name : texte
  - price_text : texte
  - qty : nombre
  - total_text : texte
  - max_qty : nombre
  - image : image, facultatif
  - url : texte, facultatif
  - low_text : texte, facultatif

### Gabarit
```html
<table class="cart-table">
  <thead><tr><th>Article</th><th>Prix</th><th>Quantité</th><th>Total</th><th></th></tr></thead>
  <tbody>
  {% for l in lignes %}
    <tr>
      <td class="cart-item">{% if l.image %}{{ img(l.image, '', '64px') }}{% endif %}{% if l.url %}<a href="{{ l.url }}">{{ l.name }}</a>{% else %}{{ l.name }}{% endif %}</td>
      <td>{{ l.price_text }}</td>
      <td>
        <form method="post" action="/_cart" class="cart-qty">{{ csrf() }}<input type="hidden" name="action" value="set"><input type="hidden" name="id" value="{{ l.id }}">
          <input type="number" name="qty" value="{{ l.qty | int }}" min="0" max="{{ l.max_qty }}" aria-label="Quantité"><button class="btn btn-outline" type="submit">OK</button></form>
        {% if l.low_text %}<div class="muted cart-low">{{ l.low_text }}</div>{% endif %}
      </td>
      <td><strong>{{ l.total_text }}</strong></td>
      <td><form method="post" action="/_cart">{{ csrf() }}<input type="hidden" name="action" value="remove"><input type="hidden" name="id" value="{{ l.id }}"><button class="cart-remove" type="submit" aria-label="Retirer">×</button></form></td>
    </tr>
  {% endfor %}
  </tbody>
</table>
```

### Feuille
```css
.cart-table{width:100%;border-collapse:collapse;margin:16px 0}
.cart-table th,.cart-table td{padding:12px 8px;border-bottom:1px solid var(--color-border);text-align:left;vertical-align:middle}
.cart-item{display:flex;align-items:center;gap:12px}
.cart-item img{width:56px;height:56px;object-fit:cover;border-radius:6px}
.cart-qty{display:flex;gap:6px;margin:0}
.cart-qty input{width:64px;padding:6px 8px;border:1px solid var(--color-border);border-radius:6px;font:inherit;background:var(--color-bg);color:var(--color-fg)}
.cart-qty .btn{padding:6px 10px;font-size:.85rem}
.cart-low{font-size:.85rem}
.cart-remove{background:none;border:1px solid var(--color-border);border-radius:6px;width:32px;height:32px;cursor:pointer;color:var(--color-muted);font-size:1.1rem}
@media (max-width:760px){.cart-table thead{display:none}.cart-table td{display:block;border:0;padding:4px 0}.cart-table tr{display:block;border-bottom:1px solid var(--color-border);padding:10px 0}}
```

## totaux du panier
Sous-total, livraison, seuil de livraison offerte s'il n'est pas atteint, et total.

### Données
- sous_total : texte
- livraison : texte
- total : texte
- seuil : texte, facultatif — montant à partir duquel la livraison est offerte

### Gabarit
```html
<div class="cart-totals">
  <div><span>Sous-total</span><span>{{ sous_total }}</span></div>
  <div><span>Livraison</span><span>{{ livraison }}</span></div>
  {% if seuil %}<div class="muted"><span>Offerte dès {{ seuil }}</span><span></span></div>{% endif %}
  <div class="cart-total"><span>Total</span><span>{{ total }}</span></div>
</div>
```

### Feuille
```css
.cart-totals{max-width:360px;margin-left:auto}
.cart-totals > div{display:flex;justify-content:space-between;padding:6px 0}
.cart-total{border-top:2px solid var(--color-border);font-weight:700;font-size:1.15rem;margin-top:6px;padding-top:12px!important}
```

## formulaire de commande
Le formulaire qui passe la commande : coordonnées et adresse, erreurs de saisie, mode de paiement, bouton de confirmation. La cible valide, réserve le stock et enregistre.

### Données
- saisie (groupe) :
  - error : texte, facultatif
  - fields (liste) :
    - name : texte
    - label : texte
    - type : texte
    - rows : nombre
    - long : oui ou non, facultatif
    - required : oui ou non, facultatif
    - value : texte, facultatif
    - error : texte, facultatif
  - payment_text : texte
  - submit_label : texte

### Gabarit
```html
<form class="card contact-form checkout-form" method="post" action="" novalidate>
  <input type="hidden" name="_form" value="checkout">{{ csrf() }}
  <div class="hp"><label>Site web <input type="text" name="website" tabindex="-1" autocomplete="off"></label></div>
  {% if saisie.error %}<div class="form-error" role="alert">{{ saisie.error }}</div>{% endif %}
  {% for f in saisie.fields %}
  <div class="field{% if f.error %} has-error{% endif %}">
    <label for="c-{{ f.name }}">{{ f.label }}{% if f.required %} *{% endif %}</label>
    {% if f.long %}<textarea id="c-{{ f.name }}" name="{{ f.name }}" rows="{{ f.rows }}"{% if f.required %} required{% endif %}>{{ f.value }}</textarea>
    {% else %}<input id="c-{{ f.name }}" type="{{ f.type }}" name="{{ f.name }}" value="{{ f.value }}"{% if f.required %} required{% endif %}>{% endif %}
    {% if f.error %}<div class="field-error">{{ f.error }}</div>{% endif %}
  </div>
  {% endfor %}
  <p class="muted checkout-payment">{{ saisie.payment_text }}</p>
  <button class="btn" type="submit">{{ saisie.submit_label }}</button>
</form>
```

## récapitulatif du panier
Le panier en résumé, à côté du formulaire de commande : lignes, sous-total, livraison, total, lien pour le modifier.

### Données
- panier (groupe) :
  - lines (liste) :
    - qty : nombre
    - name : texte
    - total_text : texte
  - subtotal_text : texte
  - shipping_text : texte
  - total_text : texte
  - cart_url : texte, facultatif

### Gabarit
```html
<aside class="checkout-summary">
  <h2>Récapitulatif</h2>
  <ul>{% for l in panier.lines %}<li><span>{{ l.qty | int }} × {{ l.name }}</span><span>{{ l.total_text }}</span></li>{% endfor %}</ul>
  <div>Sous-total : {{ panier.subtotal_text }}</div>
  <div>Livraison : {{ panier.shipping_text | lower }}</div>
  <div><strong>Total : {{ panier.total_text }}</strong></div>
  {% if panier.cart_url %}<p><a href="{{ panier.cart_url }}">Modifier le panier</a></p>{% endif %}
</aside>
```

### Feuille
```css
.checkout-summary{background:var(--color-surface);border:1px solid var(--color-border);border-radius:var(--radius);padding:20px}
.checkout-summary li{display:flex;justify-content:space-between;gap:10px;padding:6px 0;border-bottom:1px dashed var(--color-border)}
.checkout-summary ul{list-style:none;margin:0 0 12px;padding:0}
```

> --- contact
## contact en colonnes
Deux colonnes, le formulaire et les coordonnées ; une seule, centrée, quand les coordonnées ne sont pas affichées.

### Données
- coordonnees : oui ou non, facultatif — les coordonnées du site sont affichées à côté

### Gabarit
```html
<div class="contact-grid{% if not (coordonnees and site.contact) %} contact-solo{% endif %}">
  {{ contenu }}
</div>
```

### Feuille
```css
.contact-grid{display:grid;gap:32px;grid-template-columns:minmax(0,2fr) minmax(240px,1fr)}
.contact-solo{grid-template-columns:minmax(0,1fr);max-width:720px;margin:0 auto}
@media (max-width:760px){.contact-grid{grid-template-columns:1fr}}
```

## formulaire de contact
Le formulaire de contact de la page : ses champs, ce que le visiteur a saisi, les erreurs, puis la confirmation. La cible valide, enregistre le message et prévient par e-mail.

### Données
- saisie (groupe) :
  - sent : oui ou non, facultatif
  - error : texte, facultatif
  - csrf : texte
  - fields (liste) :
    - name : texte
    - label : texte
    - type : texte
    - long : oui ou non, facultatif
    - choice : oui ou non, facultatif
    - numeric : oui ou non, facultatif
    - required : oui ou non, facultatif
    - value : texte, facultatif
    - error : texte, facultatif
    - placeholder : texte, facultatif
    - options (liste) :
      - value : texte
      - selected : oui ou non, facultatif
    - when_field : texte, facultatif
    - when_values : texte, facultatif
    - hidden : oui ou non, facultatif
- confirmation : texte, facultatif — phrase affichée après l'envoi

### Gabarit
```html
{% if saisie.sent %}
<div class="card contact-success" role="status"><strong>✔ Message envoyé.</strong> {{ confirmation | default('Nous vous répondons rapidement.') }}</div>
{% else %}
<form class="card contact-form" method="post" action="" novalidate>
  <input type="hidden" name="_form" value="contact">
  <input type="hidden" name="_csrf" value="{{ saisie.csrf }}">
  <div class="hp"><label>Site web <input type="text" name="website" tabindex="-1" autocomplete="off"></label></div>
  {% if saisie.error %}<div class="form-error" role="alert">{{ saisie.error }}</div>{% endif %}
  {% for f in saisie.fields %}
  <div class="field{% if f.error %} has-error{% endif %}"{% if f.when_field %} data-when-field="{{ f.when_field }}" data-when-values="{{ f.when_values }}"{% if f.hidden %} hidden{% endif %}{% endif %}>
    <label for="f-{{ f.name }}">{{ f.label }}{% if f.required %} *{% endif %}</label>
    {% if f.long %}
    <textarea id="f-{{ f.name }}" name="{{ f.name }}" rows="6"{% if f.required %} required{% endif %}{% if f.placeholder %} placeholder="{{ f.placeholder }}"{% endif %}>{{ f.value }}</textarea>
    {% elif f.choice %}
    <select id="f-{{ f.name }}" name="{{ f.name }}"{% if f.required %} required{% endif %}>
      <option value="">{{ f.placeholder | default('Choisir…') }}</option>
      {% for o in f.options %}<option value="{{ o.value }}"{% if o.selected %} selected{% endif %}>{{ o.value }}</option>{% endfor %}
    </select>
    {% else %}
    <input id="f-{{ f.name }}" type="{{ f.type }}" name="{{ f.name }}" value="{{ f.value }}"{% if f.required %} required{% endif %}{% if f.placeholder %} placeholder="{{ f.placeholder }}"{% endif %}{% if f.numeric %} inputmode="numeric"{% endif %}>
    {% endif %}
    {% if f.error %}<div class="field-error">{{ f.error }}</div>{% endif %}
  </div>
  {% endfor %}
  <button class="btn" type="submit">Envoyer</button>
</form>
{% endif %}
```

## coordonnées du site
Adresse, téléphone et e-mail du site (site.contact), en colonne ; rien si le site n'en déclare pas.

### Gabarit
```html
{% if site.contact %}
<aside class="contact-info">
  {% if site.contact.address %}<p><strong>Adresse</strong><br>{{ lines(site.contact.address) }}</p>{% endif %}
  {% if site.contact.phone %}<p><strong>Téléphone</strong><br><a href="tel:{{ site.contact.phone | replace(' ', '') }}">{{ site.contact.phone }}</a></p>{% endif %}
  {% if site.contact.email %}<p><strong>E-mail</strong><br><a href="mailto:{{ site.contact.email }}">{{ site.contact.email }}</a></p>{% endif %}
</aside>
{% endif %}
```

### Feuille
```css
.contact-info p{margin-bottom:16px}
```

## marque du site
Le nom du site, en lien vers l'accueil ; avec une image, le logo à la place du nom.

### Données
- logo : image, facultatif — logo affiché à la place du nom

### Gabarit
```html
<a class="brand" href="/">{% if logo %}<img class="brand-logo" src="{{ asset(logo) }}" alt="{{ site.name }}">{% else %}{{ site.name }}{% endif %}</a>
```

### Feuille
```css
.brand-logo{max-height:48px;width:auto}
```

## menu du site
Le menu du site (site.nav) : la page affichée y est marquée, et il se replie derrière un bouton sur téléphone. Ce qui est écrit en dessous (panier, recherche) prend place à la suite des entrées.

### Gabarit
```html
<button class="nav-toggle" aria-label="Menu" aria-expanded="false">☰</button>
<nav class="site-nav" aria-label="Navigation principale">
  <ul>
  {% for entree in site.nav %}
    <li><a href="{{ url(entree.to) }}"{% if entree.to == page.route %} aria-current="page"{% endif %}>{{ entree.label }}</a></li>
  {% endfor %}
  </ul>
  {{ contenu }}
</nav>
```

## panier du site
Lien vers le panier, avec le nombre d'articles ; rien sur un site sans boutique.

### Gabarit
```html
{% if shop.cart_route %}<a class="cart-link" href="{{ shop.cart_route }}"{% if shop.cart_route == page.route %} aria-current="page"{% endif %}>Panier<span class="cart-count">{{ cart_count() }}</span></a>{% endif %}
```

## recherche du site
Le champ « Que cherchez-vous ? » de la navigation par intention ; rien quand le site la coupe (site.intent.enabled).

### Gabarit
```html
{% if site.intent.enabled %}
<form class="intent" role="search" autocomplete="off" data-index="/assets/intent-index.json">
  <input type="search" name="q" placeholder="{{ site.intent.placeholder | default('Que cherchez-vous ?') }}" aria-label="{{ site.intent.placeholder | default('Que cherchez-vous ?') }}" aria-expanded="false" aria-controls="intent-results">
  <ul class="intent-results" id="intent-results" role="listbox" hidden></ul>
</form>
{% endif %}
```

## téléphone du site
Le téléphone du site (site.contact.phone), en lien d'appel ; rien si le site n'en déclare pas.

### Gabarit
```html
{% if site.contact.phone %}<a class="site-phone" href="tel:{{ site.contact.phone | replace(' ', '') }}">{{ site.contact.phone }}</a>{% endif %}
```

### Feuille
```css
.site-phone{font-weight:600;white-space:nowrap;text-decoration:none}
```

## mentions du site
Le nom du site, le texte du pied de page, puis l'adresse, le téléphone et l'e-mail sur une ligne.

### Gabarit
```html
<div>
  <strong>{{ site.name }}</strong>{% if site.footer.text %} · {{ site.footer.text }}{% endif %}
  {% if site.contact %}<div>{% set sep = '' %}{% if site.contact.address %}{{ site.contact.address }}{% set sep = ' · ' %}{% endif %}{% if site.contact.phone %}{{ sep }}{{ site.contact.phone }}{% set sep = ' · ' %}{% endif %}{% if site.contact.email %}{{ sep }}<a href="mailto:{{ site.contact.email }}">{{ site.contact.email }}</a>{% endif %}</div>{% endif %}
</div>
```

## liens du pied
Les liens du pied de page (site.footer.links), puis le lien « Version texte » de la page affichée.

### Gabarit
```html
<ul>{% for l in site.footer.links %}<li>{{ link(l) }}</li>{% endfor %}{% if page.readable_url %}<li><a href="{{ page.readable_url }}" rel="alternate">Version texte</a></li>{% endif %}</ul>
```
