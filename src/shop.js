// Boutique minimale : produits (data/products.yaml), pages dynamiques, panier, commande.
import { err, nearest } from './errors.js';

export const PRODUCT_KEYS = ['id', 'name', 'price', 'category', 'description', 'image', 'stock', 'badge', 'featured', 'unit'];
const SHOP_COMPONENTS = ['products.grid', 'product.hero', 'products.related', 'cart.page', 'checkout.page', 'order.confirmation'];

/** Valide data/products.yaml. Retourne { products, errors }. */
export function validateProducts(raw, file, assets) {
  const errors = [];
  if (raw === null || raw === undefined) return { products: null, errors };
  const list = Array.isArray(raw) ? raw : raw?.products;
  if (!Array.isArray(list)) { errors.push(err('E_SCHEMA', { file, path: 'products', message: 'data/products.yaml attend products: [ { id, name, price, … } ].' })); return { products: null, errors }; }
  const seen = new Set(); const products = [];
  list.forEach((p, i) => {
    const base = `products[${i}]`;
    if (!p || typeof p !== 'object' || Array.isArray(p)) { errors.push(err('E_TYPE', { file, path: base, message: 'Un produit est un objet.' })); return; }
    for (const k of Object.keys(p)) if (!PRODUCT_KEYS.includes(k)) { const s = nearest(k, PRODUCT_KEYS); errors.push(err('E_UNKNOWN_PROP', { file, path: `${base}.${k}`, message: `Propriété inconnue : ${k}.`, expected: PRODUCT_KEYS, hint: s ? `Vouliez-vous dire ${s} ?` : undefined, fix: s ? { rename: { from: k, to: s } } : undefined })); }
    for (const k of ['id', 'name', 'price']) if (p[k] === undefined) errors.push(err('E_MISSING_PROP', { file, path: `${base}.${k}`, message: `Propriété obligatoire manquante : ${k}.` }));
    if (typeof p.id === 'string' && !/^[a-z0-9][a-z0-9-]*$/.test(p.id)) errors.push(err('E_FORMAT', { file, path: `${base}.id`, message: `Identifiant mal formé : ${p.id}.`, hint: 'Minuscules, chiffres et tirets (il sert dans l\'URL : /produit/<id>).' }));
    if (seen.has(p.id)) errors.push(err('E_DUPLICATE', { file, path: `${base}.id`, message: `Identifiant en double : ${p.id}.` }));
    seen.add(p.id);
    if (p.price !== undefined && (typeof p.price !== 'number' || p.price < 0)) errors.push(err('E_TYPE', { file, path: `${base}.price`, message: 'price attend un nombre positif (ex. 6.5), sans symbole.', fix: typeof p.price === 'string' && /^[\d.,]+/.test(p.price) ? { set: Number(p.price.replace(',', '.').replace(/[^\d.]/g, '')) } : undefined }));
    if (p.image !== undefined && !assets.has(p.image)) { const s = nearest(String(p.image), [...assets]); errors.push(err('E_MISSING_ASSET', { file, path: `${base}.image`, message: `Fichier introuvable dans assets/ : ${p.image}.`, hint: s ? `Vouliez-vous dire ${s} ?` : undefined, fix: s ? { set: s } : undefined })); }
    if (p.stock !== undefined && (!Number.isInteger(p.stock) || p.stock < 0)) errors.push(err('E_TYPE', { file, path: `${base}.stock`, message: 'stock attend un entier positif ou nul.' }));
    if (p.featured !== undefined && typeof p.featured !== 'boolean') errors.push(err('E_TYPE', { file, path: `${base}.featured`, message: 'featured attend true ou false.' }));
    products.push({ id: String(p.id), name: String(p.name ?? ''), price: Number(p.price) || 0, category: p.category ? String(p.category) : null, description: p.description ? String(p.description) : null, image: p.image || null, stock: p.stock ?? null, badge: p.badge ? String(p.badge) : null, featured: p.featured === true, unit: p.unit ? String(p.unit) : null });
  });
  return { products, errors };
}

/**
 * Cohérence boutique : composants utilisés, pages dynamiques, panier et commande présents.
 * Retourne { shop, errors } ; shop = { product_route, cart_route, checkout_route, order_route, categories } ou null.
 */
export function validateShop(project, errors) {
  const used = new Map(); // composant → [{page, i}]
  const dyn = { products: null, orders: null };
  for (const page of project.pages) {
    const route = page.data?.route;
    if (typeof route === 'string' && route.includes('[')) {
      const m = /^\/[a-z0-9\-]+\/\[id\]$/.exec(route);
      if (!m) errors.push(err('E_FORMAT', { file: page.file, path: 'route', message: `Route dynamique mal formée : ${route}.`, hint: 'Forme attendue : /produit/[id] ou /commande/[id], avec source: products | orders.' }));
      const sources = ['products', 'orders', ...Object.keys(project.collections || {})];
      if (!sources.includes(page.data.source)) errors.push(err('E_MISSING_PROP', { file: page.file, path: 'source', message: 'Une route dynamique exige source: products, orders ou une collection déclarée.', expected: sources, hint: 'Collections : site.yaml › collections.' }));
      else if (dyn[page.data.source]) errors.push(err('E_DUPLICATE', { file: page.file, path: 'route', message: `Une seule page dynamique par source (${page.data.source}).` }));
      else dyn[page.data.source] = page;
    } else if (page.data?.source !== undefined) {
      errors.push(err('E_FORBIDDEN', { file: page.file, path: 'source', message: 'source n\'a de sens que sur une route dynamique (/produit/[id]).' }));
    }
    (Array.isArray(page.data?.sections) ? page.data.sections : []).forEach((s, i) => {
      const name = s && typeof s === 'object' ? Object.keys(s)[0] : null;
      if (SHOP_COMPONENTS.includes(name)) { if (!used.has(name)) used.set(name, []); used.get(name).push({ page, i }); }
    });
  }
  if (!used.size && !dyn.products && !dyn.orders) return { shop: null };
  const products = project.products;
  if (!products) { errors.push(err('E_NO_PRODUCTS', { file: project.root + '/data/products.yaml', path: '', message: 'Des composants boutique sont utilisés mais data/products.yaml est absent.', hint: 'Créez data/products.yaml avec products: [ { id, name, price, image, category } ].' })); return { shop: null }; }
  const one = (name, max = 1) => { const l = used.get(name) || []; if (l.length > max) errors.push(err('E_DUPLICATE', { file: l[1].page.file, path: `sections[${l[1].i}]`, message: `${name} ne peut apparaître qu'une fois dans le site.` })); return l[0] || null; };
  const cart = one('cart.page'), checkout = one('checkout.page'), confirm = one('order.confirmation');
  const needCart = used.has('products.grid') || used.has('product.hero');
  if (needCart && !cart) errors.push(err('E_NO_CART', { file: (used.get('products.grid') || used.get('product.hero'))[0].page.file, path: '', message: 'Des produits sont vendus mais aucune page ne contient cart.page.', hint: 'Créez pages/panier.page.yaml avec route: /panier et une section cart.page.' }));
  if (cart && !checkout) errors.push(err('E_NO_CHECKOUT', { file: cart.page.file, path: '', message: 'cart.page sans checkout.page : le visiteur ne peut pas commander.', hint: 'Créez une page avec une section checkout.page (route: /commande).' }));
  if (checkout && !dyn.orders) errors.push(err('E_NO_ORDER_PAGE', { file: checkout.page.file, path: '', message: 'checkout.page sans page de confirmation.', hint: 'Créez pages/commande-confirmation.page.yaml avec route: /commande/[id], source: orders et une section order.confirmation.' }));
  if (dyn.orders && !confirm) errors.push(err('E_MISSING_PROP', { file: dyn.orders.file, path: 'sections', message: 'La page source: orders doit contenir une section order.confirmation.' }));
  for (const name of ['product.hero', 'products.related']) for (const u of used.get(name) || []) if (u.page !== dyn.products) errors.push(err('E_FORBIDDEN', { file: u.page.file, path: `sections[${u.i}]`, message: `${name} ne s'utilise que sur la page dynamique source: products (/produit/[id]).` }));
  if (confirm && confirm.page !== dyn.orders) errors.push(err('E_FORBIDDEN', { file: confirm.page.file, path: `sections[${confirm.i}]`, message: 'order.confirmation ne s\'utilise que sur la page dynamique source: orders (/commande/[id]).' }));
  if (dyn.products && !(used.get('product.hero') || []).some(u => u.page === dyn.products)) errors.push(err('E_MISSING_PROP', { file: dyn.products.file, path: 'sections', message: 'La page source: products doit contenir une section product.hero.' }));
  const categories = [...new Set(products.map(p => p.category).filter(Boolean))];
  for (const u of used.get('products.grid') || []) {
    const f = u.page.data.sections[u.i]['products.grid']?.filter;
    if (f?.category && !categories.includes(f.category)) { const s = nearest(f.category, categories); errors.push(err('E_UNKNOWN_CATEGORY', { file: u.page.file, path: `sections[${u.i}].products.grid.filter.category`, message: `Catégorie inconnue : ${f.category}.`, expected: categories, hint: s ? `Vouliez-vous dire ${s} ?` : undefined, fix: s ? { set: s } : undefined })); }
  }
  const payment = project.site?.site?.shop?.payment || 'manual';
  if (payment === 'stripe' && checkout) errors.push(...[]); // clés lues depuis .env à l'exécution
  return {
    shop: {
      product_route: dyn.products ? dyn.products.data.route.replace('[id]', '{id}') : null,
      cart_route: cart ? cart.page.data.route : null,
      checkout_route: checkout ? checkout.page.data.route : null,
      order_route: dyn.orders ? dyn.orders.data.route.replace('[id]', '{id}') : null,
      categories,
    },
  };
}
