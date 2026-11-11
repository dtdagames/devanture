// Jumeau du site produit à la compilation : index d'intention, données structurées (site.json),
// fichier d'instructions pour agents (llms.txt) et JSON-LD pour la page.

export const normalize = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const TEXT_KEYS = ['title', 'subtitle', 'intro', 'text', 'note', 'name', 'description', 'quote', 'author', 'role', 'bio', 'caption', 'label', 'q', 'a', 'badge', 'unit', 'success'];

/** Concatène tous les textes significatifs d'un objet de props (profondeur limitée). */
function collectText(v, depth = 0, out = []) {
  if (depth > 4 || v == null) return out;
  if (typeof v === 'string' || typeof v === 'number') { out.push(String(v)); return out; }
  if (Array.isArray(v)) { for (const x of v) collectText(x, depth + 1, out); return out; }
  if (typeof v === 'object') {
    for (const [k, x] of Object.entries(v)) {
      if (k === 'id' || k === 'keywords' || k === 'image' || k === 'src' || k === 'photo' || k === 'to' || k === 'php' || k === 'css' || k === 'js' || k === 'slots' || k === 'day') continue;
      if (TEXT_KEYS.includes(k) || typeof x === 'object') collectText(x, depth + 1, out);
    }
  }
  return out;
}

function sectionTitle(name, props) {
  return props.title || props.q || (name === 'contact.form' ? 'Contact' : name === 'hours' ? 'Horaires d\'ouverture' : name === 'pricelist' ? 'Tarifs' : name === 'gallery' ? 'Galerie' : name === 'team' ? 'Équipe' : name === 'faq' ? 'Questions fréquentes' : name === 'testimonials' ? 'Avis' : name === 'stats' ? 'Chiffres clés' : props.subtitle || '');
}

const money = v => typeof v === 'number' ? v.toFixed(2).replace('.', ',') + ' €' : String(v);

/** Réponse courte d'une section, affichée dans la carte de réponse de la recherche (sans LLM). */
function sectionAnswer(name, p, site) {
  const cut = (s, n = 240) => { s = String(s ?? '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1) + '…' : s; };
  switch (name) {
    case 'hours': return null; // calculée à la visite depuis les horaires structurés
    case 'pricelist': return cut((p.groups || []).flatMap(g => (g.items || []).map(it => `${it.name} : ${money(it.price)}${it.unit ? ' ' + it.unit : ''}`)).slice(0, 4).join(' · ') + (p.note ? ` — ${p.note}` : ''), 300);
    case 'contact.form': return cut([site.contact?.phone ? `Téléphone ${site.contact.phone}` : null, site.contact?.email ? `e-mail ${site.contact.email}` : null, site.contact?.address || null].filter(Boolean).join(' · ') + (p.intro ? ` — ${p.intro}` : ''), 300);
    case 'stats': return cut((p.items || []).map(s => `${s.value} ${s.label}`).join(' · '));
    case 'team': return cut((p.members || []).map(m => m.role ? `${m.name} (${m.role})` : m.name).join(', '));
    case 'testimonials': return cut(p.items?.[0] ? `« ${p.items[0].quote} » — ${p.items[0].author}` : '');
    case 'features': return cut(p.intro || (p.items || []).map(i => i.title).join(' · '));
    case 'gallery': return cut(p.intro || (p.images || []).map(i => i.caption).filter(Boolean).join(' · '));
    case 'products.grid': return cut(p.intro || p.title || '');
    case 'steps': return cut((p.items || []).map((s, i) => `${i + 1}. ${s.title}`).join(' '));
    case 'timeline': return cut((p.items || []).map(s => `${s.date} : ${s.title}`).join(' · '));
    case 'map': return cut(p.address || site.contact?.address || '');
    default: return cut(p.subtitle || p.intro || p.text || p.title || '');
  }
}

/** Index d'intention : une entrée par section, plus une par question de FAQ. */
export function buildIntentIndex(pages, catalog, site = {}) {
  const entries = [];
  for (const page of pages) {
    if (page.data.route.includes('[id]')) continue; // pages dynamiques : pas d'ancre fixe
    const pageTitle = page.data.seo?.title?.split(/\s[·|–-]\s/)[0] || page.id;
    page.data.sections.forEach((s) => {
      const name = Object.keys(s)[0];
      const props = s[name] || {};
      const comp = catalog.get(name);
      const intents = (comp?.manifest.intents || []).join(' ');
      const keywords = [...(props.keywords || [])].join(' ');
      const title = sectionTitle(name, props);
      const text = collectText(props).join(' ').slice(0, 600);
      const entry = { r: page.data.route, a: props.id, c: name, T: title || pageTitle, P: pageTitle, t: normalize(title), k: normalize(`${intents} ${keywords} ${name}`), x: normalize(text) };
      const ans = sectionAnswer(name, props, site);
      if (ans) entry.A = ans;
      if (name === 'hours') entry.H = { tz: props.timezone || 'Europe/Paris', days: (props.days || []).map(d => ({ day: d.day, slots: d.closed || !d.slots ? [] : d.slots })) };
      if (name === 'contact.form') entry.F = 1; // cible de préremplissage
      entries.push(entry);
      if (name === 'faq' && Array.isArray(props.items)) {
        props.items.forEach((it, j) => {
          entries.push({ r: page.data.route, a: `${props.id}-q${j + 1}`, c: 'faq.q', T: it.q, P: pageTitle, t: normalize(it.q), k: normalize(`${keywords} question`), x: normalize(it.a).slice(0, 300), A: String(it.a).replace(/\s+/g, ' ').trim().slice(0, 300) });
        });
      }
    });
  }
  return { entries };
}

/** Données structurées du site pour les agents. */
export function buildTwin(site, pages, catalog) {
  let hours = null; const pricelists = []; const forms = [];
  const pagesOut = pages.map(page => {
    const sections = page.data.sections.map(s => {
      const name = Object.keys(s)[0]; const props = s[name] || {};
      if (name === 'hours' && !hours) hours = { timezone: props.timezone || 'Europe/Paris', days: props.days.map(d => ({ day: d.day, closed: !!d.closed || !d.slots, slots: d.slots || [] })), note: props.note || null };
      if (name === 'pricelist') pricelists.push({ route: page.data.route, anchor: props.id, title: props.title || 'Tarifs', note: props.note || null, groups: props.groups.map(g => ({ title: g.title || null, items: g.items.map(it => ({ name: it.name, price: String(it.price), unit: it.unit || null, description: it.description || null, badge: it.badge || null })) })) });
      if (name === 'contact.form') forms.push({
        route: page.data.route, anchor: props.id, method: 'POST',
        fields: props.fields.map(f => ({ name: f.name, label: f.label, type: f.type, required: !!f.required, options: f.options || undefined, when: f.when || undefined })),
        protocol: 'GET la page pour obtenir le cookie de session et le champ caché _csrf, puis POST application/x-www-form-urlencoded avec _form=contact, _csrf et les champs. Réponse 200 avec « Message envoyé » en cas de succès.',
        api: { url: '/api/contact', describe: 'GET /api/contact renvoie les champs et indique si l\'API est activée', method: 'POST', content_type: 'application/json', auth: 'Authorization: Bearer <AGENT_API_TOKEN> (jeton fourni par le propriétaire du site)', rate_limit: '20 requêtes par heure et par adresse', responses: { 200: '{ ok: true, id }', 400: '{ ok: false, errors: { champ: message } }', 401: 'jeton absent ou invalide', 429: 'débit dépassé', 503: 'API désactivée' } },
        success_message: props.success || null,
      });
      return { type: name, id: props.id, title: sectionTitle(name, props) || undefined };
    });
    return { route: page.data.route, title: page.data.seo?.title || site.name, description: page.data.seo?.description || null, sections };
  });
  const products = pages.__products || null;
  return {
    generator: 'devanture', generated_at: new Date().toISOString(),
    ...(products ? { products: products.map(p => ({ id: p.id, name: p.name, price: p.price, category: p.category, description: p.description, in_stock: p.stock === null || p.stock > 0, url: pages.__shop?.product_route ? pages.__shop.product_route.replace('{id}', p.id) : null })), shop: { cart_route: pages.__shop?.cart_route, checkout_route: pages.__shop?.checkout_route, payment: pages.__shop?.payment } } : {}),
    name: site.name, tagline: site.tagline || null, locale: site.locale || 'fr-FR',
    summary: site.agents?.summary || site.tagline || null,
    business_type: site.agents?.business_type || 'LocalBusiness',
    contact: site.contact || null,
    navigation: (site.nav || []).map(l => ({ label: l.label, to: l.to })),
    pages: pagesOut, hours, pricelists, forms,
    actions: forms.map(f => ({ name: 'contacter', description: 'Envoyer un message ou une demande via le formulaire', route: f.route, method: 'POST' })),
    intent_index: '/assets/intent-index.json',
  };
}

const dayLabel = s => s.charAt(0).toUpperCase() + s.slice(1);
const slotFmt = s => s.replace('-', ' – ');

export function buildLlmsTxt(twin) {
  const L = [];
  L.push(`# ${twin.name}`);
  if (twin.summary) L.push(`> ${twin.summary}`);
  L.push('');
  if (twin.contact) {
    const c = twin.contact;
    L.push('## Contact');
    if (c.address) L.push(`- Adresse : ${c.address}`);
    if (c.phone) L.push(`- Téléphone : ${c.phone}`);
    if (c.email) L.push(`- E-mail : ${c.email}`);
    L.push('');
  }
  L.push('## Pages');
  for (const p of twin.pages) L.push(`- [${p.title}](${p.route})${p.description ? ` : ${p.description}` : ''}`);
  L.push('');
  if (twin.hours) {
    L.push(`## Horaires (${twin.hours.timezone})`);
    for (const d of twin.hours.days) L.push(`- ${dayLabel(d.day)} : ${d.closed ? 'fermé' : d.slots.map(slotFmt).join(' et ')}`);
    if (twin.hours.note) L.push(`- ${twin.hours.note}`);
    L.push('');
  }
  for (const pl of twin.pricelists) {
    L.push(`## ${pl.title} (${pl.route}#${pl.anchor})`);
    for (const g of pl.groups) { if (g.title) L.push(`### ${g.title}`); for (const it of g.items) L.push(`- ${it.name} : ${it.price}${it.unit ? ' ' + it.unit : ''}${it.description ? ` (${it.description})` : ''}`); }
    if (pl.note) L.push(`- ${pl.note}`);
    L.push('');
  }
  if (twin.forms.length) {
    L.push('## Agir');
    for (const f of twin.forms) {
      L.push(`- Contacter (API) : POST ${f.api.url} en JSON, en-tête ${f.api.auth}. Champs : ${f.fields.map(x => `${x.name}${x.required ? '*' : ''} (${x.type}${x.options ? ' : ' + x.options.join(' | ') : ''}${x.when ? `, si ${x.when.field} ∈ ${x.when.values.join('|')}` : ''})`).join(', ')}. GET ${f.api.url} décrit les champs et dit si l'API est activée. ${f.api.rate_limit}.`);
      L.push(`- Contacter (formulaire) : ${f.method} ${f.route}. ${f.protocol}`);
    }
    if (twin.products) L.push(`- Acheter : le panier et la commande passent par les pages ${twin.shop.cart_route} et ${twin.shop.checkout_route} (session navigateur requise) ; la liste des produits avec prix est dans /site.json.`);
    L.push('');
  }
  L.push('## Données structurées');
  L.push('- JSON complet : /site.json');
  L.push(`- Index des sections pour la recherche : ${twin.intent_index}`);
  L.push('');
  return L.join('\n');
}

const DAY_EN = { lundi: 'Monday', mardi: 'Tuesday', mercredi: 'Wednesday', jeudi: 'Thursday', vendredi: 'Friday', samedi: 'Saturday', dimanche: 'Sunday' };

export function buildJsonLd(twin) {
  const ld = { '@context': 'https://schema.org', '@type': twin.business_type || 'LocalBusiness', name: twin.name };
  if (twin.summary) ld.description = twin.summary;
  if (twin.contact?.phone) ld.telephone = twin.contact.phone;
  if (twin.contact?.email) ld.email = twin.contact.email;
  if (twin.contact?.address) ld.address = { '@type': 'PostalAddress', streetAddress: twin.contact.address };
  if (twin.hours) {
    ld.openingHoursSpecification = twin.hours.days.filter(d => !d.closed).flatMap(d => d.slots.map(s => ({ '@type': 'OpeningHoursSpecification', dayOfWeek: DAY_EN[d.day], opens: s.slice(0, 5), closes: s.slice(6, 11) })));
  }
  return JSON.stringify(ld);
}
