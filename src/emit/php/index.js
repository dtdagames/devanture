import fs from 'node:fs/promises';
import path from 'node:path';
import { buildCss } from './css.js';
import { buildJs } from './js.js';
import { RENDER_PHP, FORMS_PHP, LAYOUT_PHP, htaccess, DENY_HTACCESS, SHOP_PHP, indexPhp, pagePhp, segmentsPhp, phpValue, ASSETS_HTACCESS } from './php.js';
import { processAssets } from '../../images/index.js';
import { DEPLOY_PHP, buildServiceWorker, buildOfflinePage, buildWebManifest } from './deploy.js';
import { THEME_PRESETS } from './css.js';
import { normalizeContactFields } from '../../forms.js';
import { buildIntentIndex, buildTwin, buildLlmsTxt, buildJsonLd } from './twin.js';
import { buildReadablePage } from './readable.js';
import { ADMIN_PHP, INTEGRITY_CLI_PHP } from './admin.js';
import { STORE_PHP } from './store.js';
import crypto from 'node:crypto';
import { COMPONENTS_DIR } from '../../catalog.js';
const SITEC_ROOT = path.resolve(COMPONENTS_DIR, '..'); // racine du dépôt (Node) ou /sitec (navigateur)

export async function emit(project, catalogBase, out) {
  const catalog = project.catalog || catalogBase;
  // Les données d'exploitation (messages, commandes, stock, événements, .env) survivent à la recompilation.
  const keep = new Map();
  try { keep.set('.env', await fs.readFile(path.join(out, '.env'))); } catch { /* absent */ }
  try { for (const f of await fs.readdir(path.join(out, 'data'))) if (!['products.json', '.htaccess', '.gitkeep'].includes(f) && !(project.collections && f.endsWith('.json') && project.collections[f.slice(0, -5)])) keep.set('data/' + f, await fs.readFile(path.join(out, 'data', f))); } catch { /* absent */ }
  await fs.rm(out, { recursive: true, force: true });
  await Promise.all(['lib', 'lib/data', 'pages', 'components', 'assets', 'data', 'custom', 'cache'].map(d => fs.mkdir(path.join(out, d), { recursive: true })));
  const stores = new Set();
  // Statique d'abord : une page sans état (ni formulaire, ni panier, ni horaires calculés, ni bloc libre) peut être servie telle quelle à un visiteur sans cookie.
  const DYNAMIC = new Set(['contact.form', 'cart.page', 'checkout.page', 'order.confirmation', 'products.grid', 'product.hero', 'products.related', 'hours', 'recent', 'custom']);
  // Composants écrits dans le langage : ce qu'ils lisent à la visite (fonctionnement › lit) dit ce que la page exige.
  const reads = name => (catalog.get(name)?.manifest?.sources || []).map(x => x.id);
  const posts = name => /csrf_token\(\)|sl_fn_csrf\(\)/.test(catalog.get(name)?.compiled?.php || '');
  const deviceSegments = JSON.stringify(project.segments || {}).includes('"device"');
  const staticRoutes = [];

  const used = new Map();
  const routes = {};
  const dynamic = [];
  const customCss = [], customJs = [];
  for (const page of project.pages) {
    let contact = null;
    const forms = {};
    page.data.sections.forEach((s, i) => {
      const name = Object.keys(s)[0];
      const props = s[name] ?? {};
      s[name] = props;
      props.id ??= `s${i + 1}`; // chaque section a une ancre : cible de l'index d'intention
    });
    for (const s of page.data.sections) {
      const name = Object.keys(s)[0];
      used.set(name, catalog.get(name));
      const props = s[name] ?? {};
      if (name === 'contact.form') {
        // Champs normalisés une fois : le template et le serveur partagent la même définition.
        const { fields } = normalizeContactFields(props, { file: page.file, path: '' });
        props.fields = fields;
        delete props.required;
        contact = contact || { to: props.to, fields };
      }
      // Liste d'une collection : éléments filtrés et triés à la compilation, champs d'affichage résolus, route de la page par élément.
      if (name === 'collection.list' && project.collections?.[props.source]?.spec) {
        const col = project.collections[props.source]; const spec = col.spec;
        let items = [...col.items];
        for (const [fk, fv] of Object.entries(props.filter || {})) items = items.filter(it => String(it[fk] ?? '') === String(fv));
        const sortKey = props.sort || spec.sort;
        if (sortKey) { const desc = String(sortKey).startsWith('-'); const k = String(sortKey).replace(/^-/, ''); items.sort((a, b) => { const x = a[k], y = b[k]; const c = typeof x === 'number' && typeof y === 'number' ? x - y : String(x ?? '').localeCompare(String(y ?? ''), 'fr'); return desc ? -c : c; }); }
        if (props.limit) items = items.slice(0, props.limit);
        const firstOf = (types, not = null) => Object.entries(spec.fields).find(([k, f]) => types.includes(f.type) && k !== not)?.[0] || null;
        const title = props.title_field || spec.title_field;
        const meta = props.meta_field || firstOf(['date']) || null;
        props._fields = { title, image: props.image_field || firstOf(['asset']), text: props.text_field || firstOf(['text'], title) || firstOf(['string'], title), meta, meta_is_date: !!(meta && spec.fields[meta]?.type === 'date') };
        props._items = items;
        const f = props._fields, route0 = project.pages.find(pg => pg.data?.source === props.source && typeof pg.data.route === 'string' && pg.data.route.includes('[id]'))?.data.route || null;
        // Vue normalisée, lue par la forme du composant (manifeste › calculé) : mêmes noms quelle que soit la collection.
        props._elements = items.map(it => ({
          title: it[f.title] ?? '', image: (f.image && it[f.image]) || null, text: (f.text && it[f.text]) || null,
          meta: (!f.meta_is_date && f.meta && it[f.meta]) || null, meta_date: (f.meta_is_date && it[f.meta]) || null,
          url: route0 ? route0.replace('[id]', it.id) : null,
        }));
        props._route = project.pages.find(pg => pg.data?.source === props.source && typeof pg.data.route === 'string' && pg.data.route.includes('[id]'))?.data.route || null;
      }
      // Formulaire déclaré par un composant (effects.form) : configuration fixée ici, jamais lue depuis la requête.
      const efForm = catalog.get(name)?.manifest?.effects?.form;
      if (efForm) { forms[name] = { store: efForm.store, to: efForm.to || null, notify: efForm.notify ?? true, fields: efForm._fields || [], label: catalog.get(name).manifest.description || name, success: efForm.success || null }; stores.add(efForm.store); }
      if (name === 'custom') {
        const rel = props.php.replace(/^\.?\//, '');
        await fs.mkdir(path.dirname(path.join(out, 'custom', rel)), { recursive: true });
        await fs.copyFile(path.join(project.root, rel), path.join(out, 'custom', rel));
        if (props.css) customCss.push(`/* custom: ${props.css} */\n${await fs.readFile(path.join(project.root, props.css), 'utf8')}`);
        if (props.js) customJs.push(`/* custom: ${props.js} */\n${await fs.readFile(path.join(project.root, props.js), 'utf8')}`);
        const id = props.id;
        s[name] = { _file: rel, ...(props.props || {}), ...(id ? { id } : {}) };
      }
    }
    const entry = {
      file: page.id + '.php',
      seo: page.data.seo || { title: project.site.site.name },
      // Destinataire, champs et obligations fixés côté serveur, jamais lus depuis le POST.
      ...(contact ? { contact } : {}),
      ...(Object.keys(forms).length ? { forms } : {}),
      ...(page.data.sections.some(s => 'checkout.page' in s || reads(Object.keys(s)[0]).includes('checkout')) ? { checkout: true } : {}),
      // Jeton CSRF (donc session et cookie) seulement si la page contient un formulaire : contact, boutique ou composant à effects.form.
      ...(page.data.sections.some(s => ['contact.form', 'products.grid', 'product.hero', 'products.related', 'cart.page', 'checkout.page'].includes(Object.keys(s)[0]) || posts(Object.keys(s)[0])) || Object.keys(forms).length ? { csrf: true } : {}),
    };
    if (page.data.route.includes('[id]')) dynamic.push({ ...entry, pattern: '#^' + page.data.route.replace('[id]', '([a-z0-9A-Z\\-]+)') + '$#', source: page.data.source });
    else {
      const hasVariants = page.data.sections.some(sec => { const pr = sec[Object.keys(sec)[0]]; return pr.variants && Object.keys(pr.variants).length; }) || (page.data.variants && Object.keys(page.data.variants).length);
      const isStatic = page.data.sections.every(sec => !DYNAMIC.has(Object.keys(sec)[0]) && !reads(Object.keys(sec)[0]).length && !posts(Object.keys(sec)[0])) && !Object.keys(forms).length && !(hasVariants && deviceSegments) && !(page.data.variants && Object.keys(page.data.variants).length);
      routes[page.data.route] = { ...entry, readable: '/lisible/' + page.id + '.html', readable_url: '/lisible' + (page.data.route === '/' ? '/' : page.data.route), ...(isStatic ? { static: 'cache/' + page.id + '.html' } : {}) };
      if (isStatic) staticRoutes.push({ route: page.data.route, file: 'cache/' + page.id + '.html' });
    }
    await fs.writeFile(path.join(out, 'pages', page.id + '.php'), pagePhp(page));
  }
  const usedList = [...used.values()];
  // Données compilées (catalogue produits, collections) sous lib/data : versionnées, déployées, jamais servies ; data/ reste à l'exploitation.
  if (project.products) await fs.writeFile(path.join(out, 'lib', 'data', 'products.json'), JSON.stringify(project.products));
  for (const [cname, col] of Object.entries(project.collections || {})) await fs.writeFile(path.join(out, 'lib', 'data', cname + '.json'), JSON.stringify(col.items));
  const shopCfg = project.shop ? { ...project.shop, currency: project.site.site.shop?.currency || '€', payment: project.site.site.shop?.payment || 'manual', shipping: project.site.site.shop?.shipping || null, manual_instructions: project.site.site.shop?.manual_instructions || null, order_email: project.site.site.shop?.order_email || null } : null;
  if (shopCfg) await fs.writeFile(path.join(out, 'lib', 'shop.php'), SHOP_PHP);

  // Jumeau : index d'intention, données structurées, instructions agents, JSON-LD.
  const site = project.site.site;
  project.pages.__products = project.products; project.pages.__shop = shopCfg;
  const twin = buildTwin(site, project.pages, catalog);
  const agentsOn = site.agents?.enabled !== false;
  const intentIdx = buildIntentIndex(project.pages, catalog, project.site.site);
  await fs.writeFile(path.join(out, 'assets', 'intent-index.json'), JSON.stringify(intentIdx));
  if (agentsOn) {
    await fs.writeFile(path.join(out, 'site.json'), JSON.stringify(twin, null, 2));
    await fs.writeFile(path.join(out, 'llms.txt'), buildLlmsTxt(twin));
  }
  const staticEnabled = site.static?.enabled !== false;
  await fs.writeFile(path.join(out, 'index.php'), indexPhp(site, routes, { jsonld: buildJsonLd(twin), agents: agentsOn, shop: shopCfg, dynamic, staticEnabled, stores: [...stores], collections: Object.keys(project.collections || {}) }));
  // Assets versionnés par empreinte (cache long, Subresource Integrity) : calculés avant le layout qui les référence.
  const cssText = buildCss(site, usedList) + (customCss.length ? '\n' + customCss.join('\n\n') + '\n' : '');
  const jsText = buildJs(usedList) + (customJs.length ? '\n' + customJs.join('\n\n') + '\n' : '');
  const sha = (t) => crypto.createHash('sha256').update(t).digest();
  const cssSha = sha(cssText), jsSha = sha(jsText);
  const version = crypto.createHash('sha256').update(cssSha).update(jsSha).update(JSON.stringify(project.pages.map(pg => pg.data))).digest('hex').slice(0, 10);
  const offlineOn = site.offline?.enabled === true;
  const themeColor = site.offline?.theme_color || site.theme?.tokens?.['color.primary'] || THEME_PRESETS[site.theme?.preset || 'clair']?.['color.primary'] || '#1f3a5f';
  await fs.writeFile(path.join(out, 'layout.php'), LAYOUT_PHP
    .replace('{{CSS_V}}', cssSha.toString('hex').slice(0, 10)).replace('{{CSS_SRI}}', cssSha.toString('base64'))
    .replace('{{JS_V}}', jsSha.toString('hex').slice(0, 10)).replace('{{JS_SRI}}', jsSha.toString('base64'))
    .replace('{{OFFLINE_HEAD}}', offlineOn ? '\n<link rel="manifest" href="/manifest.webmanifest">\n<meta name="theme-color" content="' + themeColor + '">' : '')
    .replace('{{OFFLINE_SW}}', offlineOn ? "\n<script>if('serviceWorker' in navigator)navigator.serviceWorker.register('/sw.js');</script>" : ''));
  await fs.writeFile(path.join(out, 'lib', 'deploy.php'), DEPLOY_PHP);
  // Atelier servi par le site (site.studio.enabled) : le compilateur navigateur et la source du projet, sous lib/ (jamais servis directement), sur /_studio derrière le jeton d'administration.
  if (site.studio?.enabled === true) {
    const studioDir = path.join(SITEC_ROOT, 'studio');
    try { await fs.access(path.join(studioDir, 'sitec-browser.js')); } catch { throw new Error('site.studio.enabled : studio/sitec-browser.js manquant, lancer « node scripts/build-studio.mjs » (npm run build:studio)'); }
    await fs.mkdir(path.join(out, 'lib', 'studio'), { recursive: true });
    for (const f of ['index.html', 'app.js', 'sitec-browser.js']) await fs.copyFile(path.join(studioDir, f), path.join(out, 'lib', 'studio', f));
    const TEXT = /\.(yaml|yml|php|js|css|md|txt|json|svg|html)$/i, SKIP = new Set(['dist', 'node_modules', '.env', '.git', 'keywords-proposals.json']);
    const src = {};
    const walkSrc = async (dir, rel = '') => { for (const e of await fs.readdir(dir, { withFileTypes: true })) { if (SKIP.has(e.name)) continue; const r = rel ? rel + '/' + e.name : e.name; if (e.isDirectory()) await walkSrc(path.join(dir, e.name), r); else { const buf = await fs.readFile(path.join(dir, e.name)); src[r] = TEXT.test(e.name) ? { t: new TextDecoder().decode(buf) } : { b: btoa(String.fromCharCode(...buf)) }; } } };
    await walkSrc(project.root);
    await fs.writeFile(path.join(out, 'lib', 'studio', 'project.json'), JSON.stringify({ name: site.name, files: src }));
  }
  await fs.writeFile(path.join(out, 'lib', 'render.php'), RENDER_PHP);
  await fs.writeFile(path.join(out, 'lib', 'forms.php'), FORMS_PHP);
  await fs.writeFile(path.join(out, 'lib', 'store.php'), STORE_PHP);
  await fs.writeFile(path.join(out, 'lib', 'admin.php'), ADMIN_PHP);
  await fs.writeFile(path.join(out, 'lib', 'integrity.php'), INTEGRITY_CLI_PHP);
  // Carte des sections connues (pour le composant recent) et suivi étendu si le composant est utilisé.
  const sectionsMap = Object.fromEntries(intentIdx.entries.filter(e => e.a && !/^s\d+$/.test(e.a) && !/-q\d+$/.test(e.a)).map(e => [e.a, { route: e.r, title: e.T, page: e.P }]));
  const spec = project.segments ? JSON.parse(JSON.stringify(project.segments)) : { segments: {}, priority: [], tracked: { events: ['page_view'], where: [] } };
  if (used.has('recent')) { spec.tracked.remember = true; for (const ev of ['section_view', 'product_view']) if (!spec.tracked.events.includes(ev)) spec.tracked.events.push(ev); }
  project.segments = spec;
  await fs.writeFile(path.join(out, 'lib', 'segments.php'), segmentsPhp(spec, sectionsMap));
  // Version texte simplifié de chaque page statique, servie sous /lisible<route>.
  await fs.mkdir(path.join(out, 'lisible'), { recursive: true });
  const readableCtx = { contact: project.site.site.contact || null, products: project.products, productRoute: shopCfg?.product_route || null };
  for (const page of project.pages) {
    if (page.data.route.includes('[id]')) continue;
    await fs.writeFile(path.join(out, 'lisible', page.id + '.html'), buildReadablePage(page, project.site.site, readableCtx));
  }
  await fs.writeFile(path.join(out, '.htaccess'), htaccess(staticEnabled ? staticRoutes : []));
  await fs.writeFile(path.join(out, '.env.example'), `# Copier en .env à côté de index.php. Jamais dans le DSL ni dans un dépôt public.\n# Back-office : https://<domaine>/_admin (jeton long et aléatoire)\nADMIN_TOKEN=\nAGENT_API_TOKEN=\n# Expéditeur des e-mails (formulaire, commandes) ; défaut : no-reply@<domaine du site>\nMAIL_FROM=\nSTRIPE_SECRET_KEY=\n# Webhook Stripe à déclarer sur https://<domaine>/_stripe/webhook (événements checkout.session.completed et checkout.session.expired)\nSTRIPE_WEBHOOK_SECRET=\n# Stockage : sqlite (si l'extension PDO SQLite existe) ou jsonl ; forcer avec STORE=jsonl\nSTORE=\n# Déploiement signé (/_deploy) : secret partagé avec « sitec deploy »\nDEPLOY_SECRET=\n`);
  await fs.writeFile(path.join(out, 'data', '.gitkeep'), '');
  for (const [f, buf] of keep) await fs.writeFile(path.join(out, f), buf);
  for (const d of ['data', 'lib', 'pages', 'components']) await fs.writeFile(path.join(out, d, '.htaccess'), DENY_HTACCESS);
  for (const c of usedList) {
    await fs.writeFile(path.join(out, 'components', c.name + '.php'), c.files['template.php'] || c.compiled?.php || `<!-- ${c.name} : pas de template -->`);
  }
  await fs.writeFile(path.join(out, 'assets', 'site.css'), cssText);
  await fs.writeFile(path.join(out, 'assets', 'site.js'), jsText);
  // Hors ligne (site.offline.enabled) : service worker, page de repli, manifeste web. Les pages elles-mêmes ne sont jamais mises en cache, seules leurs versions texte.
  if (offlineOn) {
    const staticPages = project.pages.filter(pg => !pg.data.route.includes('[id]'));
    const shell = ['/assets/site.css?v=' + cssSha.toString('hex').slice(0, 10), '/assets/site.js?v=' + jsSha.toString('hex').slice(0, 10), '/offline.html', ...staticPages.map(pg => '/lisible' + (pg.data.route === '/' ? '/' : pg.data.route))];
    await fs.writeFile(path.join(out, 'sw.js'), buildServiceWorker({ version, shell }));
    await fs.writeFile(path.join(out, 'offline.html'), buildOfflinePage(site, staticPages.map(pg => ({ route: pg.data.route, title: pg.data.seo?.title || pg.id }))));
    await fs.writeFile(path.join(out, 'manifest.webmanifest'), buildWebManifest(site, themeColor));
  }
  await fs.writeFile(path.join(out, 'custom', '.htaccess'), DENY_HTACCESS);
  // Images : copie des assets, variantes WebP redimensionnées (site.images), manifeste des dimensions pour l'aide PHP img().
  const images = await processAssets(path.join(project.root, 'assets'), path.join(out, 'assets'), site.images || {});
  await fs.writeFile(path.join(out, 'assets', '.htaccess'), ASSETS_HTACCESS);
  await fs.writeFile(path.join(out, 'lib', 'images.php'), '<?php\n// Généré : dimensions et variantes WebP des images de assets/ (voir img() dans lib/render.php).\nreturn ' + phpValue(images.manifest) + ';\n');

  // Empreintes de tous les fichiers compilés, pour la vérification d'intégrité (back-office et cron).
  const manifest = {};
  const walkAll = async (dir, rel = '') => { for (const e of await fs.readdir(dir, { withFileTypes: true })) { const r = rel ? rel + '/' + e.name : e.name; if (e.isDirectory()) { if (!['data', 'cache'].includes(r)) await walkAll(path.join(dir, e.name), r); } else if (r !== '.env' && r !== 'manifest.sha256.json' && !r.startsWith('data/')) manifest[r] = crypto.createHash('sha256').update(await fs.readFile(path.join(dir, e.name))).digest('hex'); } };
  await walkAll(out);
  await fs.writeFile(path.join(out, 'manifest.sha256.json'), JSON.stringify(manifest, null, 1));

  return { pages: project.pages.length, components: usedList.length, staticRoutes: staticEnabled ? staticRoutes : [], version, images: images.report };
}
