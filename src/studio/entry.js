// Point d'entrée de l'atelier navigateur : le compilateur, inchangé, tourne sur un système de fichiers en mémoire.
import snapshot from 'virtual:snapshot';
import { vfs } from './shim-fs.js';
import { loadCatalog } from '../catalog.js';
import { loadProject } from '../load.js';
import { validateProject, collectWarnings } from '../validate.js';
import { emit } from '../emit/index.js';
import { reviewProject } from '../review.js';
import { formatErrors } from '../errors.js';

let catalogPromise = null;
function b64ToBytes(b64) { const s = atob(b64); const out = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i); return out; }

/** Installe les composants (et les exemples) dans le système de fichiers en mémoire. */
export async function init() {
  for (const [p, v] of Object.entries(snapshot.components)) await vfs.write('/sitec/components/' + p, 't' in v ? v.t : b64ToBytes(v.b));
  catalogPromise = loadCatalog();
  return catalogPromise;
}
export function examples() { return Object.keys(snapshot.examples); }
export async function loadExample(name, root = '/project') {
  vfs.reset(root);
  for (const [p, v] of Object.entries(snapshot.examples[name])) await vfs.write(root + '/' + p, 't' in v ? v.t : b64ToBytes(v.b));
}
export { vfs };
export async function catalog() { return catalogPromise || init(); }
export async function catalogList() { const c = await catalog(); return c.list().map(x => ({ name: x.name, description: x.manifest.description, order: x.manifest.order ?? 50 })); }
export async function explain(name) {
  const c = await catalog(); const comp = c.get(name); if (!comp) return null;
  const req = new Set(comp.manifest.props.required || []);
  const props = Object.entries(comp.manifest.props.properties || {}).map(([k, v]) => ({ name: k, required: req.has(k), type: v.type || (v.$ref ? v.$ref.replace('#/$defs/', '') : v.enum ? 'enum' : 'objet'), description: v.description || '', enum: v.enum || null, items: v.items?.enum || null }));
  return { name: comp.name, description: comp.manifest.description, props, example: comp.manifest.example || null };
}

/** Vérifie le projet : erreurs (bloquantes), avertissements, textes à compléter. */
export async function check(root = '/project') {
  const c = await catalog();
  const project = await loadProject(root);
  const errors = validateProject(project, c);
  const rel = f => (f || '').replace(root + '/', '');
  if (errors.length) return { ok: false, errors: JSON.parse('[' + formatErrors(errors, { json: true, root }).trim().split('\n').filter(Boolean).join(',') + ']').map(e => ({ ...e, file: rel(e.file) })), warnings: [], placeholders: [], project };
  const warnings = collectWarnings(project).map(w => ({ ...w, file: rel(w.file) }));
  const placeholders = reviewProject(project, project.brief).filter(f => f.code === 'E_PLACEHOLDER').map(f => ({ ...f, file: rel(f.file) }));
  return { ok: true, errors: [], warnings, placeholders, project, pages: project.pages.length, sections: project.pages.reduce((n, p) => n + (p.data?.sections?.length || 0), 0) };
}

/** Compile dans out/ (en mémoire). Retourne la liste des fichiers produits. */
export async function build(root = '/project', out = '/out', { draft = false } = {}) {
  const r = await check(root);
  if (!r.ok) return { ok: false, errors: r.errors };
  if (r.placeholders.length && !draft) return { ok: false, errors: r.placeholders.map(p => ({ ...p, message: p.message + ' (compilation refusée sans brouillon)' })) };
  const c = await catalog();
  const report = await emit(r.project, c, out);
  const files = vfs.list(out).map(p => ({ path: p, size: vfs.bytes(out + '/' + p).length }));
  return { ok: true, report, files, warnings: r.warnings, placeholders: r.placeholders };
}
