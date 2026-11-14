import path from 'node:path';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { err, nearest } from './errors.js';
import { SHARED_DEFS } from './catalog.js';
import { THEME_PRESETS } from './emit/php/css.js';
import { normalizeContactFields } from './forms.js';
import { compileSegments, experimentUsage, stampExperiments } from './segments.js';
import { validateProducts, validateShop } from './shop.js';
import { resolveData, resolvePages } from './lang/resolve.js';
import { normalizeSpec, normalizeItems } from './collections.js';
import { checkRuntimeExpressions } from './lang/resolve.js';
import { buildComponent } from './catalog.js';
import { compileTemplate } from './lang/template.js';
import { loadComposites, expandComposites } from './composition.js';
import { lintComponentCss } from './lang/css-lint.js';
import { compileVocabulaire, prefixedWords } from './lang/vocabulaire.js';
import { checkRules } from './lang/fonctionnement.js';
import { BEHAVIORS, BEHAVIOR_NAMES, behaviorsUsedIn } from './lang/behaviors.js';
import { lineOfPath } from './lang/site-document.js';

/** Versions du langage que ce compilateur sait lire (site.yaml › language). */
export const LANGUAGE_VERSIONS = [1];

export const SITE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['site'],
  properties: {
    // Version du langage (défaut 1). Une version inconnue arrête tout : le site est écrit pour un compilateur plus récent.
    language: { type: 'integer' },
    // Constantes du projet : valeurs nommées une fois, lues par {{ const.nom }} partout.
    constants: { type: 'object' },
    // Collections génériques : { nom: { label, fields: { champ: type | { type, required, label, default } }, sort, title_field } }.
    collections: { type: 'object' },
    // Paquets de composants partagés : chemins (./paquets/x) ou noms de paquets installés (node_modules).
    packages: { type: 'array', items: { type: 'string', minLength: 1 } },
    site: {
      type: 'object',
      additionalProperties: false,
      required: ['name'],
      properties: {
        name: { type: 'string', minLength: 1 },
        tagline: { type: 'string' },
        locale: { type: 'string' },
        theme: {
          type: 'object', additionalProperties: false,
          properties: {
            preset: { type: 'string', enum: Object.keys(THEME_PRESETS) },
            tokens: { type: 'object', additionalProperties: { type: 'string' } },
            // Polices du site : fichiers de assets/ (woff2, woff, ttf, otf), nommées dans font.body et font.heading.
            fonts: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['family', 'file'], properties: {
              family: { type: 'string', pattern: '^[A-Za-z0-9][A-Za-z0-9 _-]*$' }, file: { type: 'string', format: 'asset', pattern: '\\.(woff2|woff|ttf|otf)$' },
              weight: { type: ['string', 'integer'], pattern: '^[1-9]00( [1-9]00)?$' }, style: { type: 'string', enum: ['normal', 'italic'] } } } },
            // Fond de page : une image de assets/ en haut de la page, une autre en bas, ou une image fixe qui couvre l'écran.
            background: { type: 'object', additionalProperties: false, properties: { image: { type: 'string', format: 'asset' }, bottom: { type: 'string', format: 'asset' }, fixed: { type: 'boolean' },
              phone: { type: 'object', additionalProperties: false, properties: { image: { type: 'string', format: 'asset' }, bottom: { type: 'string', format: 'asset' } } } } },
          },
        },
        nav: { type: 'array', items: { $ref: '#/$defs/link' } },
        redirects: {
          type: 'array',
          items: { type: 'object', additionalProperties: false, required: ['from', 'to'], properties: { from: { type: 'string', pattern: '^/[^\\s?#]*$' }, to: { type: 'string', format: 'route' } } },
        },
        footer: {
          type: 'object', additionalProperties: false,
          properties: { text: { type: 'string' }, links: { type: 'array', items: { $ref: '#/$defs/link' } } },
        },
        contact: {
          type: 'object', additionalProperties: false,
          properties: { email: { type: 'string', format: 'email' }, phone: { type: 'string' }, address: { type: 'string' } },
        },
        intent: {
          type: 'object', additionalProperties: false,
          properties: { enabled: { type: 'boolean' }, placeholder: { type: 'string' } },
        },
        agents: {
          type: 'object', additionalProperties: false,
          properties: { enabled: { type: 'boolean' }, summary: { type: 'string' }, business_type: { type: 'string' } },
        },
        personalization: {
          type: 'object', additionalProperties: false,
          properties: { enabled: { type: 'boolean' }, requires_consent: { type: 'boolean' }, consent_text: { type: 'string' } },
        },
        static: {
          type: 'object', additionalProperties: false,
          properties: { enabled: { type: 'boolean' } },
        },
        studio: {
          type: 'object', additionalProperties: false,
          properties: { enabled: { type: 'boolean' } },
        },
        images: {
          type: 'object', additionalProperties: false,
          properties: { enabled: { type: 'boolean' }, widths: { type: 'array', minItems: 1, maxItems: 6, items: { type: 'integer', minimum: 64, maximum: 4000 } }, quality: { type: 'integer', minimum: 30, maximum: 100 } },
        },
        offline: {
          type: 'object', additionalProperties: false,
          properties: { enabled: { type: 'boolean' }, short_name: { type: 'string', maxLength: 12 }, theme_color: { type: 'string', pattern: '^#[0-9a-fA-F]{6}$' } },
        },
        shop: {
          type: 'object', additionalProperties: false,
          properties: {
            currency: { type: 'string' },
            payment: { type: 'string', enum: ['manual', 'stripe'] },
            manual_instructions: { type: 'string' },
            shipping: { type: 'object', additionalProperties: false, properties: { flat: { type: 'number' }, free_from: { type: 'number' } } },
            order_email: { type: 'string', format: 'email' },
          },
        },
      },
    },
  },
  $defs: SHARED_DEFS,
};

export const PAGE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['route', 'sections'],
  properties: {
    page: { type: 'string' },
    route: { type: 'string', pattern: '^/[a-z0-9\\-/]*(\\[id\\])?$' },
    source: { type: 'string', pattern: '^[a-z][a-z0-9_]*$' },
    seo: {
      type: 'object', additionalProperties: false, required: ['title'],
      properties: { title: { type: 'string' }, description: { type: 'string' } },
    },
    sections: { type: 'array', minItems: 1 },
    // Assemblage par segment : { segment: { first: [ids], hide: [ids] } }
    variants: { type: 'object' },
    // Dérivation (micro-site) : extends: <page id> + override / remove / prepend / append
    extends: { type: 'string' },
    override: { type: 'object' },
    remove: { type: 'array', items: { type: 'string' } },
    prepend: { type: 'array' },
    append: { type: 'array' },
  },
};

/** Matérialise les pages dérivées (extends) à partir de leur page de base. */
function resolveDerivedPages(project, errors) {
  const byId = new Map(project.pages.map(p => [p.id, p]));
  for (const page of project.pages) {
    const d = page.data;
    if (!d || typeof d !== 'object' || d.extends === undefined) {
      for (const k of ['override', 'remove', 'prepend', 'append']) if (d && d[k] !== undefined) errors.push(err('E_FORBIDDEN', { file: page.file, path: k, message: `${k} n'a de sens qu'avec extends: <page>.` }));
      continue;
    }
    const base = byId.get(d.extends);
    if (!base) { const s = nearest(String(d.extends), [...byId.keys()]); errors.push(err('E_UNKNOWN_PAGE', { file: page.file, path: 'extends', message: `Page de base inconnue : ${d.extends}.`, expected: [...byId.keys()].filter(k => k !== page.id), hint: s ? `Vouliez-vous dire ${s} ?` : undefined, fix: s ? { set: s } : undefined })); continue; }
    if (base.data?.extends !== undefined) { errors.push(err('E_FORBIDDEN', { file: page.file, path: 'extends', message: `${d.extends} est elle-même dérivée : une page ne dérive que d'une page de base.` })); continue; }
    if (d.sections !== undefined) errors.push(err('E_FORBIDDEN', { file: page.file, path: 'sections', message: 'Une page dérivée n\'a pas de sections propres : utilisez override, remove, prepend, append.' }));
    const sections = JSON.parse(JSON.stringify(Array.isArray(base.data?.sections) ? base.data.sections : []));
    const idOf = s => (s && typeof s === 'object') ? (Object.values(s)[0]?.id ?? null) : null;
    const ids = sections.map(idOf).filter(Boolean);
    for (const [sid, over] of Object.entries(d.override || {})) {
      const i = sections.findIndex(s => idOf(s) === sid);
      if (i < 0) { const s = nearest(sid, ids); errors.push(err('E_UNKNOWN_SECTION', { file: page.file, path: `override.${sid}`, message: `Aucune section avec id: ${sid} dans ${d.extends}.`, expected: ids, hint: s ? `Vouliez-vous dire ${s} ?` : 'Donnez un id à la section dans la page de base.', fix: s ? { rename: { from: sid, to: s } } : undefined })); continue; }
      if (!over || typeof over !== 'object' || Array.isArray(over)) { errors.push(err('E_TYPE', { file: page.file, path: `override.${sid}`, message: 'override attend { id: { props à remplacer } }.' })); continue; }
      const name = Object.keys(sections[i])[0];
      sections[i] = { [name]: { ...sections[i][name], ...over, id: sid } };
    }
    (d.remove || []).forEach((sid, j) => { const i = sections.findIndex(s => idOf(s) === sid); if (i < 0) { const s = nearest(String(sid), ids); errors.push(err('E_UNKNOWN_SECTION', { file: page.file, path: `remove[${j}]`, message: `Aucune section avec id: ${sid} dans ${d.extends}.`, expected: ids, hint: s ? `Vouliez-vous dire ${s} ?` : undefined })); } else sections.splice(i, 1); });
    d.sections = [...(Array.isArray(d.prepend) ? d.prepend : []), ...sections, ...(Array.isArray(d.append) ? d.append : [])];
    if (d.seo === undefined) d.seo = JSON.parse(JSON.stringify(base.data.seo || {}));
    page.derivedFrom = d.extends;
  }
}

/** Retourne la liste des erreurs (vide si tout est valide). */
export function validateProject(project, catalog) {
  const errors = [...project.loadErrors];
  const routes = new Set(project.pages.map(p => p.data?.route).filter(r => typeof r === 'string'));
  // Si une page n'a pas pu être lue, ses routes sont inconnues : on ne signale pas les routes
  // manquantes ni l'absence d'accueil, ce seraient des erreurs en cascade trompeuses.
  const unreadPages = project.loadErrors.some(e => (e.code === 'E_YAML_PARSE' && /\.page\.yaml$/.test(e.file || '')) || (e.code === 'E_DOCUMENT' && (project.documents?.pages || []).some(d => d.file === e.file)));
  const ajv = new Ajv({ allErrors: true, verbose: true, strict: false });
  addFormats(ajv);
  // Les routes dynamiques (/produit/[id]) acceptent tout lien /produit/<quelque chose>.
  const dynPrefixes = [...routes].filter(r => r.includes('[id]')).map(r => r.replace('[id]', ''));
  const routeOf = v => { const r = v.split('#')[0].replace(/\/+$/, '') || '/'; const d = dynPrefixes.find(p => r.startsWith(p) && r.length > p.length); return d ? d + '[id]' : r; };
  ajv.addFormat('route', v => unreadPages || typeof v !== 'string' || /^(https?:\/\/|mailto:|tel:|#)/.test(v) || routes.has(routeOf(v)) || rtExpr(v));
  // Une valeur contenant une expression d'affichage ({{ item.image }}) n'est connue qu'à la requête : le champ de collection est vérifié de son côté.
  const rtExpr = v => typeof v === 'string' && /\{\{[\s\S]*?\}\}/.test(v);
  ajv.addFormat('asset', v => typeof v !== 'string' || project.assets.has(v) || rtExpr(v));
  ajv.addFormat('file', v => typeof v !== 'string' || (project.files?.has(v.replace(/^\.?\//, '')) && !v.includes('..')));
  const compiled = new Map();
  const compile = (key, schema) => { if (!compiled.has(key)) compiled.set(key, ajv.compile(schema)); return compiled.get(key); };
  const ctx = { routes, assets: project.assets, files: project.files };

  // --- site.yaml
  if (project.site !== null && project.site !== undefined) {
    const v = compile('site', SITE_SCHEMA);
    if (!v(project.site)) errors.push(...mapAjvErrors(v.errors, { file: project.siteFile, prefix: '', ctx }));
    const lang = project.site?.language;
    if (lang !== undefined && !LANGUAGE_VERSIONS.includes(lang)) return dedupe([...errors, err('E_LANGUAGE', { file: project.siteFile, path: 'language', message: `Version de langage ${JSON.stringify(lang)} inconnue de ce compilateur (versions lues : ${LANGUAGE_VERSIONS.join(', ')}).`, hint: 'Mettez le compilateur à jour (étiquette plus récente dans package.json) ou retirez language pour la version 1.' })]);
    project.language = lang ?? 1;
    // Noms de tokens de thème : liste fermée, dérivée des presets.
    const knownTokens = Object.keys(THEME_PRESETS.clair);
    for (const k of Object.keys(project.site?.site?.theme?.tokens || {})) {
      if (knownTokens.includes(k)) continue;
      const s = nearest(k, knownTokens);
      errors.push(err('E_UNKNOWN_TOKEN', { file: project.siteFile, path: `site.theme.tokens.${k}`, message: `Token de thème inconnu : ${k}. Il serait ignoré silencieusement.`, expected: knownTokens, hint: s ? `Vouliez-vous dire ${s} ?` : 'sitec explain site', fix: s ? { rename: { from: k, to: s } } : undefined }));
    }
  }

  // --- collections : déclarations, puis interpolation de tout le projet, puis éléments (déjà interpolés)
  for (const [name, col] of Object.entries(project.collections || {})) col.spec = normalizeSpec(name, project.site?.collections?.[name], project.siteFile, errors);
  for (const name of Object.keys(project.site?.collections || {})) if (!project.collections?.[name]) errors.push(err('E_FORMAT', { file: project.siteFile, path: `collections.${name}`, message: `Nom de collection mal formé : ${name}.`, hint: 'Minuscules, chiffres et _ ; commence par une lettre.' }));
  // Expressions {{ … }} de compilation (site, const, page, collections) ; celles d'affichage (item, product, order) restent en place.
  const parseOk = !errors.some(e => e.code === 'E_YAML_PARSE');
  if (parseOk) resolveData(project, errors);
  for (const col of Object.values(project.collections || {})) if (col.spec) col.items = normalizeItems(col.spec, col.raw, col.file, project.assets, errors);
  if (parseOk) resolvePages(project, errors); // les pages voient les collections normalisées
  const collectionNames = Object.keys(project.collections || {});

  // --- data/products.yaml
  const prod = validateProducts(project.productsRaw, project.productsFile, project.assets);
  errors.push(...prod.errors);
  project.products = prod.products;

  // --- segments.yaml
  const seg = compileSegments(project.segmentsRaw, project.segmentsFile);
  errors.push(...seg.errors);
  project.segments = seg.spec;
  const segmentNames = seg.spec ? Object.keys(seg.spec.segments) : [];

  // --- paquets de composants : préfixe unique (package.yaml › name), composants exposés en <préfixe>.<nom>
  const prefixes = new Set();
  const nativeFamilies = new Set(catalog.names().filter(n => n.includes('.')).map(n => n.split('.')[0]));
  const sources = [];
  (project.packages || []).forEach((pkg, i) => {
    const where = `packages[${i}]`;
    if (pkg.missing) { errors.push(err('E_PACKAGE', { file: project.siteFile, path: where, message: `Paquet introuvable : ${pkg.spec} (pas de package.yaml dans ${pkg.dir.replaceAll('\\', '/')}).`, hint: pkg.local ? 'Chemin relatif à la racine du site.' : `Installez-le (npm install ${pkg.spec}) ou donnez un chemin (./paquets/…).` })); return; }
    const name = pkg.meta && typeof pkg.meta === 'object' ? pkg.meta.name : undefined;
    if (typeof name !== 'string' || !/^[a-z][a-z0-9-]*$/.test(name)) { errors.push(err('E_PACKAGE', { file: pkg.file, path: 'name', message: `package.yaml doit déclarer name: <préfixe> (minuscules, chiffres, tirets), reçu ${JSON.stringify(name)}.` })); return; }
    for (const k of Object.keys(pkg.meta)) if (!['name', 'description', 'version', 'language'].includes(k)) errors.push(err('E_UNKNOWN_PROP', { file: pkg.file, path: k, message: `Propriété inconnue : ${k}.`, expected: ['name', 'description', 'version', 'language'] }));
    if (pkg.meta.language !== undefined && !LANGUAGE_VERSIONS.includes(pkg.meta.language)) { errors.push(err('E_LANGUAGE', { file: pkg.file, path: 'language', message: `Le paquet ${name} est écrit pour la version de langage ${pkg.meta.language}, inconnue de ce compilateur.` })); return; }
    if (prefixes.has(name)) { errors.push(err('E_PACKAGE', { file: project.siteFile, path: where, message: `Deux paquets portent le même nom : ${name}.` })); return; }
    if (nativeFamilies.has(name) || catalog.has(name)) { errors.push(err('E_PACKAGE', { file: pkg.file, path: 'name', message: `Le préfixe ${name} est déjà une famille du catalogue natif.`, hint: 'Choisissez un autre nom de paquet.' })); return; }
    prefixes.add(name); pkg.prefix = name;
    for (const src of pkg.componentSources) sources.push({ ...src, name: `${name}.${src.name}`, shortName: src.name, pkg: name });
  });

  // --- vocabulaires : mots natifs, puis ceux de chaque paquet (vus « préfixe.mot » depuis le site), puis ceux du site.
  // Un composant de paquet voit les mots natifs et ceux de son paquet ; un composant du site voit tout.
  const vocab = (text, file, opts) => {
    const v = compileVocabulaire(text, opts);
    for (const e of v.errors) errors.push(err('E_WORD', { file, path: e.line ? `ligne ${e.line}` : '', message: e.message + (/[.?!…]$/.test(e.message) ? '' : '.'), hint: 'Un mot : description, données, puis forme (primitives et autres mots) ou gabarit. sitec explain langage.' }));
    for (const w of v.warnings) (project.componentWarnings ||= []).push({ level: 'warning', code: 'W_CSS', file, path: w.line ? `ligne ${w.line}` : '', message: w.message + (/[.?!…]$/.test(w.message) ? '' : '.') });
    return v;
  };
  const wordsOf = new Map();
  let siteInherited = new Map(catalog.words);
  for (const pkg of project.packages || []) {
    if (!pkg.prefix) continue;
    const v = typeof pkg.vocabText === 'string' ? vocab(pkg.vocabText, pkg.vocabFile, { scope: pkg.prefix, inherited: catalog.words, outline: !!pkg.vocabOutline }) : { words: catalog.words, own: new Map() };
    wordsOf.set(pkg.prefix, v.words); pkg.words = v.own;
    const seen = siteInherited;
    siteInherited = new Map([...siteInherited, ...prefixedWords(v.own, pkg.prefix)]);
    siteInherited.broken = new Set([...(seen.broken || []), ...[...(v.words.broken || [])].map(n => `${pkg.prefix}.${n}`)]);
    if (seen.unreadable || v.words.unreadable) siteInherited.unreadable = true;
  }
  const siteVocab = typeof project.vocabText === 'string' ? vocab(project.vocabText, project.vocabFile, { scope: 'site', inherited: siteInherited, outline: !!project.vocabOutline }) : { words: siteInherited, own: new Map() };
  project.words = siteVocab.words; project.ownWords = siteVocab.own;

  // --- composants de projet (components/<nom>/manifest.yaml + template.html) et des paquets : construits, vérifiés, ajoutés au catalogue
  const entries = [];
  for (const src of [...sources, ...(project.componentSources || [])]) {
    const mf = src.dir + (src.documentText !== undefined ? '/lecture.yaml' : src.outlineText !== undefined ? '/composant.md' : '/manifest.yaml');
    if (!src.pkg && prefixes.has(src.name.split('.')[0]) && src.name.includes('.')) { errors.push(err('E_COMPONENT_CONFLICT', { file: mf, path: '', message: `Le préfixe ${src.name.split('.')[0]} appartient à un paquet.` })); continue; }
    const { entry, details: ce } = buildComponent({ ...src, project: true, words: src.pkg ? wordsOf.get(src.pkg) : siteVocab.words });
    for (const d of ce) errors.push(err(d.code || 'E_COMPONENT', { file: d.file ? src.dir + '/' + d.file : mf, path: d.line ? `ligne ${d.line}` : '', message: `Composant ${src.name} : ${d.message}${/[.?!…»]$/.test(d.message) ? '' : '.'}`, ...(d.hint ? { hint: d.hint } : {}) }));
    // Composant illisible (document refusé, manifeste cassé) : son erreur est dite ; les pages qui l'emploient ne la répètent pas.
    if (!entry) { (project.brokenComponents ||= new Set()).add(src.name); continue; }
    if (catalog.has(entry.name)) { errors.push(err('E_COMPONENT_CONFLICT', { file: mf, path: 'name', message: `${entry.name} existe déjà dans le catalogue natif.`, hint: 'Renommez le composant de projet (ex. ' + entry.name + '.maison).' })); continue; }
    const ef = entry.manifest.effects, ee = [], gen = entry.manifest._generated?.effects;
    if (ef !== undefined) {
      if (!ef || typeof ef !== 'object' || Array.isArray(ef)) ee.push(err('E_TYPE', { file: mf, path: 'effects', message: 'effects attend { form: { store, fields, notify, to, success } }.' }));
      else for (const k of Object.keys(ef)) {
        if (k !== 'form') { ee.push(err('E_UNKNOWN_PROP', { file: mf, path: `effects.${k}`, message: `Effet inconnu : ${k}.`, expected: ['form'] })); continue; }
        const f = ef.form;
        if (!f || typeof f !== 'object' || Array.isArray(f)) { ee.push(err('E_TYPE', { file: mf, path: 'effects.form', message: 'effects.form attend { store, fields, notify, to, success }.' })); continue; }
        for (const fk of Object.keys(f)) if (!['store', 'fields', 'notify', 'to', 'success', 'required', 'rules'].includes(fk)) ee.push(err('E_UNKNOWN_PROP', { file: mf, path: `effects.form.${fk}`, message: `Propriété inconnue : ${fk}.`, expected: ['store', 'fields', 'notify', 'to', 'success'] }));
        if (typeof f.store !== 'string' || !/^[a-z][a-z0-9_]*$/.test(f.store)) ee.push(err('E_FORMAT', { file: mf, path: 'effects.form.store', message: 'store : nom de collection d\'exploitation (minuscules, chiffres, _), ex. reservations.' }));
        else if (['orders', 'events', 'stock', 'products'].includes(f.store)) ee.push(err('E_FORBIDDEN', { file: mf, path: 'effects.form.store', message: `${f.store} est réservé.` }));
        if (f.notify !== undefined && typeof f.notify !== 'boolean' && !(typeof f.notify === 'string' && /^[^@\s]+@[^@\s]+$/.test(f.notify))) ee.push(err('E_TYPE', { file: mf, path: 'effects.form.notify', message: 'notify : true, false ou une adresse e-mail.' }));
        if (f.to !== undefined && !(typeof f.to === 'string' && /^[^@\s]+@[^@\s]+$/.test(f.to))) ee.push(err('E_TYPE', { file: mf, path: 'effects.form.to', message: 'to : adresse e-mail du destinataire.' }));
        const nf = normalizeContactFields({ fields: f.fields, required: f.required }, { file: mf, path: 'effects.form' });
        ee.push(...nf.errors);
        f._fields = nf.fields;
        // Règles écrites au format machine : mêmes contrôles que le bloc fonctionnement (qui les a déjà rapportées à leur ligne).
        if (f.rules !== undefined && !gen) for (const m of checkRules(f.rules, nf.fields)) ee.push(err('E_FORMAT', { file: mf, path: 'effects.form.rules', message: m + '.' }));
      }
    }
    // Effets écrits par le bloc fonctionnement : ses erreurs sont déjà rapportées avec leur ligne ; sinon le chemin parle son vocabulaire.
    if (gen !== 'invalid') for (const e of ee) errors.push(gen ? { ...e, path: String(e.path || '').replace(/^effects.form/, 'fonctionnement.formulaire') } : e);
    // CSS encadré : la feuille d'un composant de projet ou de paquet ne touche que ce composant et prend son design au thème.
    const cssFile = src.dir + '/styles.css';
    if (typeof entry.files['styles.css'] === 'string') {
      const lint = lintComponentCss(entry.files['styles.css'], entry.name);
      for (const e of lint.errors) errors.push(err('E_CSS', { file: cssFile, path: `ligne ${e.line}`, message: `${entry.name} : ${e.message}.`, hint: 'Règles du CSS des composants : docs/LANGAGE.md, section 6.' }));
      for (const w of lint.warnings) (project.componentWarnings ||= []).push({ level: 'warning', code: 'W_CSS', file: cssFile, path: `ligne ${w.line}`, message: `${entry.name} : ${w.message}.` });
    }
    // Comportements déclarés : vocabulaire fermé, attributs du gabarit et déclaration du manifeste cohérents.
    const declared = entry.manifest.behaviors;
    if (declared !== undefined && (!Array.isArray(declared) || declared.some(b => typeof b !== 'string'))) errors.push(err('E_TYPE', { file: mf, path: 'behaviors', message: 'behaviors attend une liste : [tabs, carousel].', expected: BEHAVIOR_NAMES }));
    else {
      for (const b of declared || []) if (!BEHAVIORS[b]) { const s = nearest(b, BEHAVIOR_NAMES); errors.push(err('E_ENUM', { file: mf, path: 'behaviors', message: `Comportement inconnu : ${b}.`, expected: BEHAVIOR_NAMES, hint: s ? `Vouliez-vous dire ${s} ?` : 'sitec explain langage', fix: s ? { set: s } : undefined })); }
      const used = typeof entry.files['template.html'] === 'string' ? behaviorsUsedIn(entry.files['template.html']) : [];
      for (const b of used) if (!(declared || []).includes(b)) errors.push(err('E_BEHAVIOR', { file: mf, path: 'behaviors', message: `Le gabarit de ${entry.name} utilise les attributs du comportement ${b} sans le déclarer.`, hint: `Ajoutez behaviors: [${[...(declared || []), b].join(', ')}] au manifeste.`, fix: { set: [...(declared || []), b] } }));
      for (const b of declared || []) if (BEHAVIORS[b] && !used.includes(b)) (project.componentWarnings ||= []).push({ level: 'warning', code: 'W_BEHAVIOR', file: mf, path: 'behaviors', message: `${entry.name} déclare ${b} mais son gabarit n'en pose pas les attributs (${BEHAVIORS[b].attrs[0]}…).` });
    }
    if (typeof entry.files['module.js'] === 'string' && entry.files['module.js'].trim()) (project.componentWarnings ||= []).push({ level: 'warning', code: 'W_MODULE_JS', file: src.dir + '/module.js', path: '', message: `${entry.name} : JavaScript libre, non vérifié. Un comportement déclaré (${BEHAVIOR_NAMES.join(', ')}) convient-il ?` });
    entries.push(entry);
  }
  const cat = entries.length ? catalog.extend(entries) : catalog;
  project.catalog = cat;
  // Habillage : un site écrit au plus un en-tête et un pied ; celui qu'il écrit remplace celui du catalogue.
  for (const kind of ['header', 'footer']) {
    const own = entries.filter(c => c.manifest.shell === kind && !c.package);
    const what = kind === 'header' ? 'en-tête de site' : 'pied de site';
    for (const c of own.slice(1)) errors.push(err('E_SHELL', { file: path.join(c.dir, c.outline ? 'composant.md' : 'manifest.yaml'), path: 'forme', message: `Deux composants du site s'ouvrent par « ${what} » : ${own[0].name} et ${c.name}. Un site n'a qu'un ${kind === 'header' ? 'en-tête' : 'pied de page'}.`, hint: `Gardez-en un ; l'autre s'ouvre par « section » s'il sert dans une page.` }));
  }
  // Registres : un registre appartient aux formulaires qui y écrivent ; ses règles ne se déclarent qu'une fois, et on ne lit que ce qui existe.
  {
    const writers = new Map();
    for (const c of cat.list()) { const fm = c.manifest?.effects?.form; if (fm?.store) (writers.get(fm.store) || writers.set(fm.store, []).get(fm.store)).push(c); }
    for (const [store, list] of writers) {
      const sig = c => JSON.stringify(c.manifest.effects.form.rules || null);
      const other = list.find(c => sig(c) !== sig(list[0]));
      if (other) errors.push(err('E_STORE_RULES', { file: other.dir + (other.document ? '/lecture.yaml' : other.outline ? '/composant.md' : '/manifest.yaml'), path: 'fonctionnement.formulaire', message: `Le registre ${store} reçoit les envois de ${list[0].name} et de ${other.name} avec des règles différentes (places, liste d'attente, une fois par).`, hint: 'Un registre n\'a qu\'une série de règles : écrivez les mêmes dans les deux composants, ou donnez un autre nom de registre.' }));
    }
    for (const c of cat.list()) for (const src of c.manifest?.sources || []) {
      if (src.id !== 'register' || !src.args.store) continue;
      const name = String(src.args.store).replace(/'/g, '');
      if (!writers.has(name)) errors.push(err('E_UNKNOWN_STORE', { file: c.dir + (c.document ? '/lecture.yaml' : c.outline ? '/composant.md' : '/manifest.yaml'), path: `fonctionnement.lit.${src.key}`, message: `Composant ${c.name} : registre inconnu « ${name} ».`, expected: [...writers.keys()], hint: 'Un registre est créé par le formulaire d\'un composant (« enregistre dans: »).' }));
    }
  }
  // Gabarits neutres (template.html) : compilés dès la vérification, erreurs avec numéro de ligne.
  for (const c of cat.list()) {
    if (c.files['template.html'] === undefined || c.compiled) continue;
    const r = compileTemplate(c.files['template.html'], { name: c.name, props: c.manifest.props, effects: c.manifest.effects || null, sources: c.manifest.sources || null });
    c.compiled = r;
    // Gabarit produit par la forme : l'erreur renvoie au manifeste, seul fichier que l'auteur a écrit.
    if (c.manifest._generated?.template) { for (const e of r.errors) errors.push(err('E_COMPONENT', { file: c.dir + (c.document ? '/lecture.yaml' : c.outline ? '/composant.md' : '/manifest.yaml'), path: c.produced?.formeLine ? `ligne ${c.produced.formeLine}` : 'forme', message: `Composant ${c.name} : forme : ${e.message}`, hint: `Ce que la forme produit : sitec component show <dossier> ${c.name}.` })); continue; }
    for (const e of r.errors) errors.push(err('E_TEMPLATE', { file: c.dir + '/template.html', path: `ligne ${e.line}`, message: `Gabarit ${c.name} : ${e.message}`, hint: 'Vocabulaire : {{ expr }}, {% if %}, {% for x in liste %}, {% set %}, {% form %} ; variables p, site, page, item, product, order, form, loop.' }));
  }
  // Composants composés (components.yaml) : assemblages nommés, développés page par page avant la validation des sections.
  project.composites = loadComposites(project, cat, errors);
  // Expressions d'affichage dans les pages : item seulement sur une page de collection, product sur products, order sur orders.
  checkRuntimeExpressions(project, errors);

  // --- pages dérivées (micro-sites) : matérialisées avant la validation des sections
  resolveDerivedPages(project, errors);

  // --- pages
  const seenRoutes = new Map();
  for (const page of project.pages) {
    const file = page.file;
    const v = compile('page', PAGE_SCHEMA);
    if (!v(page.data)) errors.push(...mapAjvErrors(v.errors, { file, prefix: '', ctx }));
    // Assemblage par segment
    if (page.data?.variants !== undefined && Array.isArray(page.data.sections)) {
      const explicitIds = page.data.sections.map(s => (s && typeof s === 'object') ? Object.values(s)[0]?.id : null).filter(Boolean);
      const pv = page.data.variants;
      if (!pv || typeof pv !== 'object' || Array.isArray(pv)) errors.push(err('E_TYPE', { file, path: 'variants', message: 'variants de page attend { segment: { first: [ids], hide: [ids] } }.' }));
      else for (const [segName, rule] of Object.entries(pv)) {
        if (!segmentNames.includes(segName)) { const s = nearest(segName, segmentNames); errors.push(err('E_UNKNOWN_SEGMENT', { file, path: `variants.${segName}`, message: `Segment inconnu : ${segName}.`, expected: segmentNames, hint: s ? `Vouliez-vous dire ${s} ?` : 'Déclarez-le dans segments.yaml.', fix: s ? { rename: { from: segName, to: s } } : undefined })); continue; }
        if (!rule || typeof rule !== 'object' || Array.isArray(rule)) { errors.push(err('E_TYPE', { file, path: `variants.${segName}`, message: 'Attendu { first: [ids], hide: [ids] }.' })); continue; }
        for (const k of Object.keys(rule)) if (!['first', 'hide'].includes(k)) errors.push(err('E_UNKNOWN_PROP', { file, path: `variants.${segName}.${k}`, message: `Propriété inconnue : ${k}.`, expected: ['first', 'hide'] }));
        for (const k of ['first', 'hide']) if (rule[k] !== undefined) {
          if (!Array.isArray(rule[k])) { errors.push(err('E_TYPE', { file, path: `variants.${segName}.${k}`, message: `${k} attend une liste d'ids de sections.` })); continue; }
          rule[k].forEach((sid, j) => { if (!explicitIds.includes(sid)) { const s = nearest(String(sid), explicitIds); errors.push(err('E_UNKNOWN_SECTION', { file, path: `variants.${segName}.${k}[${j}]`, message: `Aucune section avec id: ${sid} sur cette page.`, expected: explicitIds, hint: s ? `Vouliez-vous dire ${s} ?` : 'Donnez un id: à la section visée.', fix: s ? { set: s } : undefined })); } });
        }
      }
    }
    // Source d'une page dynamique : boutique (products, orders) ou collection déclarée.
    if (typeof page.data?.source === 'string') {
      const allowed = ['products', 'orders', ...collectionNames];
      if (!allowed.includes(page.data.source)) { const s = nearest(page.data.source, allowed); errors.push(err('E_UNKNOWN_COLLECTION', { file, path: 'source', message: `Source inconnue : ${page.data.source}.`, expected: allowed, hint: s ? `Vouliez-vous dire ${s} ?` : 'Déclarez la collection dans site.yaml › collections.', fix: s ? { set: s } : undefined })); }
      if (typeof page.data.route === 'string' && !page.data.route.includes('[id]')) errors.push(err('E_FORMAT', { file, path: 'route', message: 'Une page avec source doit avoir une route dynamique : /chemin/[id].' }));
    } else if (typeof page.data?.route === 'string' && page.data.route.includes('[id]')) errors.push(err('E_MISSING_PROP', { file, path: 'source', message: 'Une route /…/[id] exige source: <collection> (products, orders ou une collection déclarée).' }));
    if (typeof page.data?.route === 'string') {
      if (seenRoutes.has(page.data.route)) {
        errors.push(err('E_DUPLICATE_ROUTE', { file, path: 'route', message: `La route ${page.data.route} est déjà utilisée par ${seenRoutes.get(page.data.route)}.`, hint: 'Deux pages ne peuvent pas partager la même route.' }));
      } else seenRoutes.set(page.data.route, path.basename(page.file));
    }
    if (!Array.isArray(page.data?.sections)) continue;
    const origins = Object.keys(project.composites).length ? expandComposites(page, project.composites, project, errors, cat) : [];
    const before = errors.length;

    const ids = new Set();
    page.data.sections.forEach((section, i) => {
      const base = `sections[${i}]`;
      if (section === null || typeof section !== 'object' || Array.isArray(section)) {
        errors.push(err('E_SECTION_SHAPE', { file, path: base, message: 'Une section est un objet avec une seule clé : le nom du composant.', hint: 'Exemple : - hero: { title: Bonjour }' }));
        return;
      }
      const keys = Object.keys(section);
      if (keys.length !== 1) {
        errors.push(err('E_SECTION_SHAPE', { file, path: base, message: `Une section doit avoir exactement une clé (le composant), ${keys.length} trouvées : ${keys.join(', ')}.`, hint: 'Les props vont sous le nom du composant, indentées d\'un niveau.', fix: keys.length > 1 ? { wrap_props_under: keys[0] } : undefined }));
        return;
      }
      const name = keys[0];
      const comp = cat.get(name);
      if (!comp) {
        const s = cat.suggest(name);
        if (project.brokenComponents?.has(name)) return;
        if (name === 'custom') { errors.push(err('E_UNKNOWN_COMPONENT', { file, path: base, message: 'Le bloc custom (un fichier PHP du projet) n\'existe plus.', hint: 'Écrivez un composant du site : components/<nom>/ au format langage (données, forme, apparence, fonctionnement), puis « - <nom>: { … } » dans la page. sitec component new <dossier> <nom> en pose le squelette.' })); return; }
        errors.push(err('E_UNKNOWN_COMPONENT', { file, path: base, message: `Composant inconnu : ${name}.`, expected: cat.names().filter(n => !cat.get(n).manifest.shell), hint: s ? `Vouliez-vous dire ${s} ?` : 'sitec catalog pour la liste.', fix: s ? { rename: { from: name, to: s } } : undefined }));
        return;
      }
      if (comp.manifest.shell) {
        errors.push(err('E_SHELL', { file, path: base, message: `${name} est un habillage (${comp.manifest.shell === 'header' ? 'en-tête' : 'pied de page'} du site) : il est rendu autour de chaque page, pas dans une page.`, hint: 'Retirez cette section. Un site récrit son en-tête ou son pied par un composant dont la forme s\'ouvre par « en-tête de site » ou « pied de site » : sitec explain habillage.' }));
        return;
      }
      const props = section[name] ?? {};
      if (typeof props !== 'object' || Array.isArray(props)) {
        errors.push(err('E_TYPE', { file, path: `${base}.${name}`, message: `Les props de ${name} doivent être un objet.`, hint: `sitec explain ${name}` }));
        return;
      }
      const pv = compile('comp:' + name, comp.manifest.props);
      // Variantes : { segment: { props surchargées } } ; validées segment par segment, fusionnées avec la base.
      const { variants, ...baseProps } = props;
      if (!pv(baseProps)) errors.push(...mapAjvErrors(pv.errors, { file, prefix: `${base}.${name}`, ctx, component: name }));
      if (variants !== undefined) {
        if (!variants || typeof variants !== 'object' || Array.isArray(variants)) errors.push(err('E_TYPE', { file, path: `${base}.${name}.variants`, message: 'variants attend { nom_de_segment: { props à surcharger } }.' }));
        else for (const [segName, over] of Object.entries(variants)) {
          if (!segmentNames.includes(segName)) {
            const s = nearest(segName, segmentNames);
            errors.push(err('E_UNKNOWN_SEGMENT', { file, path: `${base}.${name}.variants.${segName}`, message: `Segment inconnu : ${segName}${segmentNames.length ? '' : ' (aucun segments.yaml)'}.`, expected: segmentNames, hint: s ? `Vouliez-vous dire ${s} ?` : 'Déclarez-le dans segments.yaml.', fix: s ? { rename: { from: segName, to: s } } : undefined }));
            continue;
          }
          if (!over || typeof over !== 'object' || Array.isArray(over)) { errors.push(err('E_TYPE', { file, path: `${base}.${name}.variants.${segName}`, message: 'Une variante est un objet de props à surcharger.' })); continue; }
          if ('id' in over || 'variants' in over || 'keywords' in over) errors.push(err('E_FORBIDDEN', { file, path: `${base}.${name}.variants.${segName}`, message: 'Une variante ne peut pas changer id, keywords ni variants.' }));
          const merged = { ...baseProps, ...over };
          if (!pv(merged)) errors.push(...mapAjvErrors(pv.errors, { file, prefix: `${base}.${name}.variants.${segName}`, ctx, component: name }));
        }
      }
      if (name === 'contact.form') errors.push(...normalizeContactFields(props, { file, path: `${base}.${name}` }).errors);
      if (name === 'collection.list' && typeof props.source === 'string') {
        const col = project.collections?.[props.source];
        if (!col || !col.spec) { const s = nearest(props.source, collectionNames); errors.push(err('E_UNKNOWN_COLLECTION', { file, path: `${base}.${name}.source`, message: `Collection inconnue : ${props.source}.`, expected: collectionNames, hint: s ? `Vouliez-vous dire ${s} ?` : 'Déclarez-la dans site.yaml › collections.', fix: s ? { set: s } : undefined })); }
        else {
          const fields = ['id', ...Object.keys(col.spec.fields)];
          for (const [fk] of Object.entries(props.filter || {})) if (!fields.includes(fk)) { const s = nearest(fk, fields); errors.push(err('E_UNKNOWN_FIELD', { file, path: `${base}.${name}.filter.${fk}`, message: `Champ inconnu dans ${props.source} : ${fk}.`, expected: fields, hint: s ? `Vouliez-vous dire ${s} ?` : undefined })); }
          for (const k of ['sort', 'title_field', 'image_field', 'text_field', 'meta_field']) if (typeof props[k] === 'string' && !fields.includes(props[k].replace(/^-/, ''))) { const s = nearest(props[k].replace(/^-/, ''), fields); errors.push(err('E_UNKNOWN_FIELD', { file, path: `${base}.${name}.${k}`, message: `Champ inconnu dans ${props.source} : ${props[k]}.`, expected: fields, hint: s ? `Vouliez-vous dire ${s} ?` : undefined })); }
        }
      }
      if (name === 'hours' && Array.isArray(props.days)) {
        const seenDays = new Set();
        props.days.forEach((d, j) => {
          if (!d || typeof d !== 'object') return;
          const p = `${base}.${name}.days[${j}]`;
          if (seenDays.has(d.day)) errors.push(err('E_DUPLICATE', { file, path: `${p}.day`, message: `Jour déclaré deux fois : ${d.day}.` }));
          seenDays.add(d.day);
          if (d.closed === true && Array.isArray(d.slots)) errors.push(err('E_CONFLICT', { file, path: p, message: `${d.day} : closed: true et slots en même temps.`, hint: 'Retirez slots (fermé) ou closed (ouvert).' }));
          if (d.closed !== true && !Array.isArray(d.slots)) errors.push(err('E_MISSING_PROP', { file, path: `${p}.slots`, message: `${d.day} : précisez slots ["09:00-18:00"] ou closed: true.` }));
        });
      }
      if (typeof props.id === 'string') {
        if (ids.has(props.id)) errors.push(err('E_DUPLICATE', { file, path: `${base}.${name}.id`, message: `Ancre en double sur cette page : ${props.id}.` }));
        ids.add(props.id);
      }
    });
    // Erreurs dans une section issue d'une composition : nommer l'assemblage et l'usage, car l'index final ne figure pas dans le YAML.
    for (let k = before; k < errors.length; k++) { const m = /^sections[(d+)]/.exec(errors[k].path || ''); const o = m && origins[Number(m[1])]; if (o && errors[k].file === file) errors[k].message += ` (section produite par le composant composé ${o.via}, utilisé en ${o.usage})`; }
  }

  // --- expériences : chaque bras, chaque segment mesuré, doit changer quelque chose sur une page
  if (project.segments?.experiments) {
    const usage = experimentUsage(project.segments, project.pages);
    stampExperiments(project.segments, project.pages); // empreinte du contenu mesuré
    for (const [name, x] of Object.entries(project.segments.experiments)) {
      const used = new Set(usage[name].map(u => u.key));
      for (const g of x.groups.slice(1)) if (!used.has(g)) errors.push(err('E_EXPERIMENT_UNUSED', { file: project.segmentsFile, path: x.segment ? `experiments.${name}.segment` : `experiments.${name}.arms.${g}`, message: x.segment ? `L'expérience ${name} mesure le segment ${g}, mais aucune section n'a de variante pour lui : il n'y a rien à mesurer.` : `Le bras ${g} de l'expérience ${name} n'est utilisé par aucune section : ses visiteurs verraient le contenu de base, comme le témoin.`, hint: `Dans une page, sur la section à comparer : variants: { ${g}: { title: … } }.` }));
    }
  }

  // --- boutique : cohérence des pages et composants
  project.shop = validateShop(project, errors).shop;

  if (project.pages.length && !routes.has('/') && !unreadPages) {
    errors.push(err('E_NO_HOME', { file: project.siteFile, path: '', message: 'Aucune page n\'a la route / (page d\'accueil).', hint: 'Donnez route: / à la page d\'accueil.' }));
  }

  return dedupe(locateInDocuments(project, errors));
}

/** Une erreur de validation sur un site ou une page écrits en document renvoie à la ligne du document, puis au chemin de la donnée. */
function locateInDocuments(project, errors) {
  const docs = [project.documents?.site, ...(project.documents?.pages || []), ...(project.documents?.data || [])].filter(Boolean);
  if (!docs.length) return errors;
  // Un document refusé n'a pas de lecture sûre : ses erreurs de validation seraient des redites trompeuses.
  const refused = new Set(docs.filter(d => d.errors.length).map(d => d.file));
  return errors.filter(e => !(refused.has(e.file) && e.code !== 'E_DOCUMENT')).map(e => {
    const doc = docs.find(d => d.file === e.file);
    if (!doc || !e.path || /^ligne \d/.test(e.path)) return e;
    const line = lineOfPath(doc.where, e.path);
    return line ? { ...e, path: `ligne ${line} · ${e.path}` } : e;
  });
}

/** Avertissements (n'empêchent pas la compilation) : paquets hors du dossier avec l'atelier embarqué, version de langage implicite. */
export function collectWarnings(project) {
  const out = [];
  out.push(...(project.componentWarnings || []));
  if (project.site && typeof project.site === 'object' && project.site.language === undefined) out.push({ level: 'warning', code: 'W_LANGUAGE', file: project.siteFile, path: 'language', message: 'Version du langage non déclarée : lue comme 1. « sitec migrate <dossier> » l\'ajoute en tête de site.yaml.' });
  if (project.site?.site?.studio?.enabled === true) for (const pkg of project.packages || []) if (!pkg.missing && !pkg.dir.replaceAll('\\', '/').startsWith(project.root.replaceAll('\\', '/') + '/')) out.push({ level: 'warning', code: 'W_PACKAGE_STUDIO', file: project.siteFile, path: 'packages', message: `Le paquet ${pkg.spec} est hors du dossier du site : l'atelier embarqué (/_studio) ne pourra pas compiler. Copiez-le sous le site (./paquets/…).` });
  return out;
}

function mapAjvErrors(ajvErrors, { file, prefix, ctx, component }) {
  const out = [];
  for (const e of ajvErrors) {
    const p = joinPath(prefix, e.instancePath);
    const explain = component ? `sitec explain ${component}` : undefined;
    switch (e.keyword) {
      case 'additionalProperties': {
        const bad = e.params.additionalProperty;
        const allowed = Object.keys(e.parentSchema?.properties || {});
        const s = nearest(bad, allowed);
        // Clé qui ressemble à du texte : virgule non protégée dans une notation { a: x, b: y }.
        const looksLikeProse = /\s/.test(bad) || bad.length > 24;
        if (looksLikeProse && !s) {
          out.push(err('E_UNQUOTED_COMMA', { file, path: p, message: `Un texte contenant une virgule a été coupé en notation { } : « ${bad.slice(0, 60)}${bad.length > 60 ? '…' : ''} » est lu comme une propriété.`, expected: allowed, hint: 'Entourez le texte de guillemets ("…") ou passez en notation bloc (une prop par ligne).' }));
        } else {
          out.push(err('E_UNKNOWN_PROP', { file, path: joinPath(p, bad), message: `Propriété inconnue : ${bad}.`, expected: allowed, hint: s ? `Vouliez-vous dire ${s} ?` : explain, fix: s ? { rename: { from: bad, to: s } } : undefined }));
        }
        break;
      }
      case 'required':
        out.push(err('E_MISSING_PROP', { file, path: joinPath(p, e.params.missingProperty), message: `Propriété obligatoire manquante : ${e.params.missingProperty}.`, hint: explain }));
        break;
      case 'type': {
        const wantStr = e.params.type === 'string';
        const gotNum = typeof e.data === 'number';
        out.push(err('E_TYPE', { file, path: p, message: `Type incorrect : attendu ${e.params.type}, reçu ${describe(e.data)}.`, hint: e.params.type === 'array' ? 'Utilisez une liste YAML (tirets).' : (wantStr && gotNum ? 'Mettez la valeur entre guillemets ("2024").' : explain), fix: wantStr && gotNum ? { set: String(e.data) } : undefined }));
        break;
      }
      case 'enum': {
        const s = typeof e.data === 'string' ? nearest(e.data, e.params.allowedValues) : null;
        out.push(err('E_ENUM', { file, path: p, message: `Valeur non autorisée : ${JSON.stringify(e.data)}.`, expected: e.params.allowedValues, hint: s ? `Vouliez-vous dire ${s} ?` : undefined, fix: s ? { set: s } : undefined }));
        break;
      }
      case 'format': {
        const f = e.params.format;
        if (f === 'route') {
          const s = nearest(String(e.data), [...ctx.routes]);
          out.push(err('E_UNKNOWN_ROUTE', { file, path: p, message: `Route inconnue : ${e.data}. Aucune page ne déclare cette route.`, expected: [...ctx.routes].sort(), hint: s ? `Vouliez-vous dire ${s} ?` : 'Créez la page ou utilisez une URL complète (https://…).', fix: s ? { set: s } : undefined }));
        } else if (f === 'asset') {
          const s = nearest(String(e.data), [...ctx.assets]);
          out.push(err('E_MISSING_ASSET', { file, path: p, message: `Fichier introuvable dans assets/ : ${e.data}.`, expected: [...ctx.assets].sort().slice(0, 20), hint: s ? `Vouliez-vous dire ${s} ?` : 'Ajoutez le fichier dans assets/ ou corrigez le chemin.', fix: s ? { set: s } : undefined }));
        } else if (f === 'file') {
          const candidates = [...(ctx.files || [])].filter(x => /\.(php|css|js)$/.test(x) && !x.startsWith('pages/'));
          const s = nearest(String(e.data), candidates);
          out.push(err('E_MISSING_FILE', { file, path: p, message: `Fichier introuvable dans le projet : ${e.data}.`, expected: candidates.slice(0, 20), hint: s ? `Vouliez-vous dire ${s} ?` : 'Chemin relatif à la racine du site, sans « .. » (ex. custom/promo.php).', fix: s ? { set: s } : undefined }));
        } else {
          out.push(err('E_FORMAT', { file, path: p, message: `Format invalide (${f}) : ${JSON.stringify(e.data)}.` }));
        }
        break;
      }
      case 'minItems':
        out.push(err('E_EMPTY_LIST', { file, path: p, message: `La liste doit contenir au moins ${e.params.limit} élément(s).` }));
        break;
      case 'minLength':
        out.push(err('E_EMPTY', { file, path: p, message: 'La valeur ne doit pas être vide.' }));
        break;
      case 'pattern':
        out.push(err('E_FORMAT', { file, path: p, message: `Valeur mal formée : ${JSON.stringify(e.data)}.`, hint: p.endsWith('route') ? 'Une route commence par / et ne contient que minuscules, chiffres et tirets.' : undefined }));
        break;
      default:
        out.push(err('E_SCHEMA', { file, path: p, message: e.message || e.keyword }));
    }
  }
  return out;
}

function joinPath(prefix, instancePath) {
  const parts = String(instancePath || '').split('/').filter(Boolean);
  let s = prefix;
  for (const part of parts) s += /^\d+$/.test(part) ? `[${part}]` : (s ? '.' : '') + part;
  return s;
}

function describe(v) {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'liste';
  return typeof v;
}

function dedupe(errors) {
  const seen = new Set();
  return errors.filter(e => { const k = e.code + e.file + e.path + e.message; if (seen.has(k)) return false; seen.add(k); return true; });
}
