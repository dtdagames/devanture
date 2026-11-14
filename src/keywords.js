// Génération des mots-clés de recherche par LLM, à la compilation, figés dans la source du site (YAML ou documents).
// Le compilateur n'appelle aucun modèle : il écrit la consigne (--export) à soumettre par un autre outil,
// puis applique la réponse (--import), qu'il valide avant de l'écrire.
import fs from 'node:fs/promises';
import path from 'node:path';
import YAML from 'yaml';
import { normalize } from './emit/php/twin.js';
import { loadProject } from './load.js';
import { canon } from './lang/site-document.js';

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

/**
 * Mots-clés d'une page écrite en document : la ligne « Mots-clés : … » de chaque section est remplacée, ou posée sous son intitulé.
 * Le reste du texte n'est pas touché. Renvoie { text, expected (ce que le document doit valoir une fois relu), dropped, skipped }.
 */
function applyToDocument(doc, items) {
  const lines = doc.text.replace(/\r\n/g, '\n').split('\n');
  const expected = YAML.parse(doc.yaml); let dropped = 0; const skipped = [];
  // De la dernière section à la première : une ligne ajoutée ne décale pas celles qui restent à traiter.
  for (const it of [...items].sort((a, b) => b.index - a.index)) {
    const head = doc.where?.[`sections[${it.index}]`];
    if (!head || !expected?.sections?.[it.index]?.[it.component]) { skipped.push(it.key); continue; }
    // Une liste de mots s'écrit « a, b, c » sur une ligne : un mot-clé qui porte une virgule ne s'y écrit pas.
    const list = it.list.filter(k => !/[,|]/.test(k)); dropped += it.list.length - list.length;
    const merged = [...it.existing, ...list.filter(k => !it.existing.includes(k))];
    if (!merged.length) continue;
    const line = `Mots-clés : ${merged.join(', ')}`, at = doc.where[`sections[${it.index}].${it.component}.keywords`];
    if (at) lines[at - 1] = line; else lines.splice(head, 0, line);
    expected.sections[it.index][it.component].keywords = merged;
  }
  return { text: lines.join('\n'), expected, dropped, skipped };
}

/**
 * Écrit les mots-clés dans les pages, en préservant le reste du texte : fichiers YAML, ou documents (pages/<id>.md). Un document
 * modifié est relu : s'il vaut bien l'ancienne lecture plus les mots-clés, sa lecture est figée (lecture/) ; sinon il est remis en l'état.
 * Renvoie { files, dropped, skipped, failed }.
 */
export async function applyProposals(project, sections, result) {
  const documents = new Map((project.documents?.pages || []).map(d => [d.file, d]));
  const pending = []; let dropped = 0; const skipped = [], failed = [];
  const byPage = new Map();
  for (const [key, list] of result) {
    const s = sections.find(x => x.key === key);
    if (!byPage.has(s.page)) byPage.set(s.page, []);
    byPage.get(s.page).push({ ...s, list });
  }
  const touched = [];
  for (const [pageId, items] of byPage) {
    const page = project.pages.find(p => p.id === pageId);
    const document = documents.get(page.file);
    if (document) {
      const r = applyToDocument(document, items);
      dropped += r.dropped; skipped.push(...r.skipped);
      if (r.text !== document.text.replace(/\r\n/g, '\n')) { await fs.writeFile(page.file, r.text); pending.push({ document, expected: r.expected }); }
      continue;
    }
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
  if (pending.length) {
    // Relecture : chaque document modifié doit valoir exactement sa lecture d'avant, mots-clés ajoutés.
    const again = await loadProject(project.root);
    const same = (a, b) => JSON.stringify(canon(a, true)) === JSON.stringify(canon(b, true));
    for (const { document, expected } of pending) {
      const now = (again.documents?.pages || []).find(d => d.file === document.file);
      const rel = f => path.relative(project.root, f).replaceAll('\\', '/');
      if (!now || now.errors.length || !same(YAML.parse(now.yaml), expected)) { await fs.writeFile(document.file, document.text); failed.push(rel(document.file)); continue; }
      await fs.mkdir(path.dirname(now.frozenFile), { recursive: true });
      await fs.writeFile(now.frozenFile, now.yaml);
      touched.push(rel(document.file), rel(now.frozenFile));
    }
  }
  return { files: touched, dropped, skipped, failed };
}
