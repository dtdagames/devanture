// Du manifeste YAML d'un composant à son plan (composant.md) : mêmes lignes, sans YAML. Le plan écrit est relu et doit rendre
// le manifeste d'origine, clé pour clé ; l'exemple, écrit comme une section de page, doit rendre les mêmes données.
import fs from 'node:fs/promises';
import path from 'node:path';
import YAML, { isMap, isScalar } from 'yaml';
import { writeComponentOutline, parseComponentOutline, writeVocabularyOutline } from './lang/outline.js';
import { writeSectionDocument, readPageDocument, canon } from './lang/site-document.js';

const same = (a, b) => JSON.stringify(canon(a, true)) === JSON.stringify(canon(b, true));

/**
 * Écrit le plan d'un composant. name : nom d'usage (préfixé pour un paquet) ; props : schéma de ses données, tel que le catalogue
 * l'a compilé (il sert à écrire l'exemple). Renvoie { text, comments: { kept, lost } } ou { error }.
 */
export function outlineOf(manifestText, { name, props }) {
  let doc; try { doc = YAML.parseDocument(manifestText); } catch (e) { return { error: `manifest.yaml illisible : ${e.message.split('\n')[0]}` }; }
  if (doc.errors.length) return { error: `manifest.yaml illisible : ${doc.errors[0].message.split('\n')[0]}` };
  const raw = doc.toJS();
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { error: 'manifest.yaml ne décrit pas un objet' };
  // Commentaires placés avant une clé de premier niveau : repris en notes (« > … ») en tête de la section.
  const notes = {}; let kept = 0;
  const lines = c => String(c).split('\n').map(l => l.replace(/^\s?/, '').trimEnd()).filter(Boolean);
  if (doc.commentBefore) { notes.name = lines(doc.commentBefore); kept += notes.name.length; }
  if (isMap(doc.contents)) {
    if (doc.contents.commentBefore) { notes.name = [...(notes.name || []), ...lines(doc.contents.commentBefore)]; kept += lines(doc.contents.commentBefore).length; }
    for (const pair of doc.contents.items) if (isScalar(pair.key) && pair.key.commentBefore) { const k = String(pair.key.value), target = ['name', 'order', 'description', 'intents', 'behaviors'].includes(k) ? 'name' : k; notes[target] = [...(notes[target] || []), ...lines(pair.key.commentBefore)]; kept += lines(pair.key.commentBefore).length; }
  }
  const total = manifestText.split('\n').filter(l => /^\s*#/.test(l)).length;
  // L'exemple : chaque section écrite comme dans une page en document.
  let example = null, sections = null;
  if (raw.example !== undefined) {
    try { sections = YAML.parse(String(raw.example)); } catch { return { error: 'exemple illisible' }; }
    if (!Array.isArray(sections) || !sections.length) return { error: 'exemple vide' };
    const schemas = new Map([[name, props]]);
    example = [];
    for (const s of sections) { const w = writeSectionDocument(s, { schemas }); if (w.error) return { error: `exemple : ${w.error}` }; if (example.length) example.push(''); example.push(...w.lines); }
  }
  const w = writeComponentOutline(raw, { example, notes });
  if (w.error) return { error: w.error };
  if (sections) {
    const back = parseComponentOutline(w.text).value.example;
    const r = readPageDocument(`Adresse : /x\n\n${back.document}\n`, { schemas: new Map([[name, props]]) });
    if (r.errors.length || !same(r.data.sections, sections)) return { error: `l'exemple écrit ne rend pas l'exemple d'origine${r.errors[0] ? ' : ' + r.errors[0].message : ''}` };
  }
  return { text: w.text, comments: { kept, lost: Math.max(0, total - kept) } };
}

/** Écrit un vocabulaire en document depuis son YAML. Renvoie { text, comments: { kept, lost } } ou { error }. */
export function vocabularyOutlineOf(text) {
  let doc; try { doc = YAML.parseDocument(text); } catch (e) { return { error: `vocabulaire.yaml illisible : ${e.message.split('\n')[0]}` }; }
  if (doc.errors.length) return { error: `vocabulaire.yaml illisible : ${doc.errors[0].message.split('\n')[0]}` };
  const lines = c => String(c).split('\n').map(l => l.replace(/^\s?/, '').trimEnd()).filter(Boolean);
  const notes = [...(doc.commentBefore ? lines(doc.commentBefore) : []), ...(isMap(doc.contents) && doc.contents.commentBefore ? lines(doc.contents.commentBefore) : [])];
  // Un commentaire placé avant un mot le précède aussi dans le document.
  const wordNotes = {}; let kept = notes.length;
  if (isMap(doc.contents)) for (const pair of doc.contents.items) {
    if (isScalar(pair.key) && pair.key.commentBefore) { notes.push(...lines(pair.key.commentBefore)); kept += lines(pair.key.commentBefore).length; }
    if (!isMap(pair.value)) continue;
    const first = pair.value.items[0];
    if (pair.value.commentBefore && first && isScalar(first.key)) { wordNotes[String(first.key.value)] = lines(pair.value.commentBefore); kept += lines(pair.value.commentBefore).length; }
    for (const wp of pair.value.items) if (isScalar(wp.key) && wp.key.commentBefore) { const k = String(wp.key.value); wordNotes[k] = [...(wordNotes[k] || []), ...lines(wp.key.commentBefore)]; kept += lines(wp.key.commentBefore).length; }
  }
  const w = writeVocabularyOutline(doc.toJS(), { notes, wordNotes });
  if (w.error) return { error: w.error };
  return { text: w.text, comments: { kept, lost: Math.max(0, text.split('\n').filter(l => /^\s*#/.test(l)).length - kept) } };
}

/** Convertit un dossier de composant : écrit composant.md, retire manifest.yaml. Renvoie { ok, error, comments }. */
export async function redigerComponent(dir, { name, props, dry = false }) {
  const file = path.join(dir, 'manifest.yaml');
  let text; try { text = await fs.readFile(file, 'utf8'); } catch { return { ok: false, error: 'pas de manifest.yaml' }; }
  const r = outlineOf(text, { name, props });
  if (r.error) return { ok: false, error: r.error };
  if (!dry) { await fs.writeFile(path.join(dir, 'composant.md'), r.text); await fs.rm(file); }
  return { ok: true, comments: r.comments, text: r.text };
}
