import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { err, nearest } from './errors.js';
import { SHARED_DEFS } from './catalog.js';
import { THEME_PRESETS } from './emit/php/css.js';
import { normalizeContactFields } from './forms.js';
import { compileSegments } from './segments.js';
import { validateProducts, validateShop } from './shop.js';

const SITE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['site'],
  properties: {
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
          },
        },
        nav: { type: 'array', items: { $ref: '#/$defs/link' } },
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

const PAGE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['route', 'sections'],
  properties: {
    page: { type: 'string' },
    route: { type: 'string', pattern: '^/[a-z0-9\\-/]*(\\[id\\])?$' },
    source: { type: 'string', enum: ['products', 'orders'] },
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
  const unreadPages = project.loadErrors.some(e => e.code === 'E_YAML_PARSE' && /\.page\.yaml$/.test(e.file || ''));
  const ajv = new Ajv({ allErrors: true, verbose: true, strict: false });
  addFormats(ajv);
  // Les routes dynamiques (/produit/[id]) acceptent tout lien /produit/<quelque chose>.
  const dynPrefixes = [...routes].filter(r => r.includes('[id]')).map(r => r.replace('[id]', ''));
  const routeOf = v => { const r = v.split('#')[0].replace(/\/+$/, '') || '/'; const d = dynPrefixes.find(p => r.startsWith(p) && r.length > p.length); return d ? d + '[id]' : r; };
  ajv.addFormat('route', v => unreadPages || typeof v !== 'string' || /^(https?:\/\/|mailto:|tel:|#)/.test(v) || routes.has(routeOf(v)));
  ajv.addFormat('asset', v => typeof v !== 'string' || project.assets.has(v));
  ajv.addFormat('file', v => typeof v !== 'string' || (project.files?.has(v.replace(/^\.?\//, '')) && !v.includes('..')));
  const compiled = new Map();
  const compile = (key, schema) => { if (!compiled.has(key)) compiled.set(key, ajv.compile(schema)); return compiled.get(key); };
  const ctx = { routes, assets: project.assets, files: project.files };

  // --- site.yaml
  if (project.site !== null && project.site !== undefined) {
    const v = compile('site', SITE_SCHEMA);
    if (!v(project.site)) errors.push(...mapAjvErrors(v.errors, { file: project.siteFile, prefix: '', ctx }));
    // Noms de tokens de thème : liste fermée, dérivée des presets.
    const knownTokens = Object.keys(THEME_PRESETS.clair);
    for (const k of Object.keys(project.site?.site?.theme?.tokens || {})) {
      if (knownTokens.includes(k)) continue;
      const s = nearest(k, knownTokens);
      errors.push(err('E_UNKNOWN_TOKEN', { file: project.siteFile, path: `site.theme.tokens.${k}`, message: `Token de thème inconnu : ${k}. Il serait ignoré silencieusement.`, expected: knownTokens, hint: s ? `Vouliez-vous dire ${s} ?` : 'sitec explain site', fix: s ? { rename: { from: k, to: s } } : undefined }));
    }
  }

  // --- data/products.yaml
  const prod = validateProducts(project.productsRaw, project.productsFile, project.assets);
  errors.push(...prod.errors);
  project.products = prod.products;

  // --- segments.yaml
  const seg = compileSegments(project.segmentsRaw, project.segmentsFile);
  errors.push(...seg.errors);
  project.segments = seg.spec;
  const segmentNames = seg.spec ? Object.keys(seg.spec.segments) : [];

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
    if (typeof page.data?.route === 'string') {
      if (seenRoutes.has(page.data.route)) {
        errors.push(err('E_DUPLICATE_ROUTE', { file, path: 'route', message: `La route ${page.data.route} est déjà utilisée par ${seenRoutes.get(page.data.route)}.`, hint: 'Deux pages ne peuvent pas partager la même route.' }));
      } else seenRoutes.set(page.data.route, page.id + '.page.yaml');
    }
    if (!Array.isArray(page.data?.sections)) continue;

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
      const comp = catalog.get(name);
      if (!comp) {
        const s = catalog.suggest(name);
        errors.push(err('E_UNKNOWN_COMPONENT', { file, path: base, message: `Composant inconnu : ${name}.`, expected: catalog.names(), hint: s ? `Vouliez-vous dire ${s} ?` : 'sitec catalog pour la liste.', fix: s ? { rename: { from: name, to: s } } : undefined }));
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
  }

  // --- boutique : cohérence des pages et composants
  project.shop = validateShop(project, errors).shop;

  if (project.pages.length && !routes.has('/') && !unreadPages) {
    errors.push(err('E_NO_HOME', { file: project.siteFile, path: '', message: 'Aucune page n\'a la route / (page d\'accueil).', hint: 'Donnez route: / à la page d\'accueil.' }));
  }

  return dedupe(errors);
}

/** Avertissements (n'empêchent pas la compilation) : blocs custom hors validation. */
export function collectWarnings(project) {
  const out = [];
  for (const page of project.pages) {
    (Array.isArray(page.data?.sections) ? page.data.sections : []).forEach((s, i) => {
      if (s && typeof s === 'object' && 'custom' in s) {
        out.push({ level: 'warning', code: 'W_CUSTOM', file: page.file, path: `sections[${i}].custom`, message: `Bloc custom (${s.custom?.php ?? '?'}) : contenu non validé par check, à relire à la main.` });
      }
    });
  }
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
