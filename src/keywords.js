// Génération des mots-clés de recherche par LLM, à la compilation, figés dans le YAML.
// Trois modes : appel direct au modèle (SDK Anthropic), export du prompt (--export) pour un autre outil,
// import d'une réponse (--import). Dans tous les cas, la validation et l'écriture sont les mêmes.
import fs from 'node:fs/promises';
import path from 'node:path';
import YAML from 'yaml';
import { normalize } from './emit/php/twin.js';

const MAX_PER_SECTION = 14;
const MAX_LEN = 60;


/** Liste des sections candidates avec le contexte envoyé au modèle. */
export function collectSections(project, catalog, { all = false } = {}) {
  const out = [];
  for (const page of project.pages) {
    const pageTitle = page.data.seo?.title || page.id;
    (page.data.sections || []).forEach((s, i) => {
      const name = Object.keys(s)[0];
      const props = s[name] || {};
      if (name === 'custom') return;
      const existing = Array.isArray(props.keywords) ? props.keywords : [];
      if (!all && existing.length) return;
      const texts = [];
      const walk = (v, d = 0) => {
        if (d > 3 || v == null) return;
        if (typeof v === 'string') { if (v.length > 2) texts.push(v); return; }
        if (Array.isArray(v)) return v.forEach(x => walk(x, d + 1));
        if (typeof v === 'object') for (const [k, x] of Object.entries(v)) { if (['id', 'keywords', 'image', 'src', 'photo', 'to', 'slots', 'icon'].includes(k)) continue; walk(x, d + 1); }
      };
      walk(props);
      out.push({
        key: `${page.id}:${i}`,
        page: page.id, pageTitle, index: i, component: name,
        intents: catalog.get(name)?.manifest.intents || [],
        existing,
        title: props.title || props.q || '',
        excerpt: texts.join(' | ').slice(0, 700),
      });
    });
  }
  return out;
}

export function buildUserPrompt(site, sections) {
  const head = `Site : ${site.name}${site.tagline ? ' — ' + site.tagline : ''}.\nSections (id, page, composant, titre, mots-clés déjà connus, extrait) :\n`;
  const body = sections.map(s => `\n[${s.key}] page « ${s.pageTitle} », composant ${s.component}${s.title ? `, titre « ${s.title} »` : ''}\n  déjà connus : ${[...s.intents, ...s.existing].join(', ') || 'aucun'}\n  extrait : ${s.excerpt || '(vide)'}`).join('\n');
  return head + body + '\n\nRéponds avec le JSON demandé, une clé par id de section.';
}

/** Extrait et nettoie la réponse : JSON strict, expressions courtes, sans doublon ni redite du titre. */
export function parseProposals(text, sections) {
  const m = /\{[\s\S]*\}/.exec(String(text));
  if (!m) throw new Error('Réponse sans objet JSON.');
  const raw = JSON.parse(m[0]);
  const byKey = new Map(sections.map(s => [s.key, s]));
  const result = new Map();
  const report = { accepted: 0, dropped: 0, unknown: [] };
  for (const [key, list] of Object.entries(raw)) {
    const s = byKey.get(key);
    if (!s) { report.unknown.push(key); continue; }
    if (!Array.isArray(list)) continue;
    const known = new Set([...s.intents, ...s.existing, ...normalize(s.title).split(' ')].map(normalize));
    const seen = new Set();
    const clean = [];
    for (let v of list) {
      if (typeof v !== 'string') continue;
      v = v.trim().toLowerCase().replace(/[.!?;:]+$/, '').replace(/\s+/g, ' ');
      const n = normalize(v);
      if (!n || v.length > MAX_LEN || seen.has(n) || known.has(n)) { report.dropped++; continue; }
      seen.add(n); clean.push(v);
      if (clean.length >= MAX_PER_SECTION) break;
    }
    if (clean.length) { result.set(key, clean); report.accepted += clean.length; }
  }
  return { result, report };
}

/** Écrit les mots-clés dans les fichiers YAML des pages, en préservant le reste du document. */
export async function applyProposals(project, sections, result) {
  const byPage = new Map();
  for (const [key, list] of result) {
    const s = sections.find(x => x.key === key);
    if (!byPage.has(s.page)) byPage.set(s.page, []);
    byPage.get(s.page).push({ ...s, list });
  }
  const touched = [];
  for (const [pageId, items] of byPage) {
    const page = project.pages.find(p => p.id === pageId);
    const text = await fs.readFile(page.file, 'utf8');
    const doc = YAML.parseDocument(text);
    for (const it of items) {
      const merged = [...it.existing, ...it.list.filter(k => !it.existing.includes(k))];
      const seq = doc.createNode(merged);
      seq.flow = true;
      doc.setIn(['sections', it.index, it.component, 'keywords'], seq);
    }
    await fs.writeFile(page.file, doc.toString({ lineWidth: 0 }));
    touched.push(path.relative(project.root, page.file).replaceAll('\\', '/'));
  }
  return touched;
}
