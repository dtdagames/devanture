// sitec migrate : fait passer un site d'une version du langage à la suivante, par étapes enregistrées, en modifiant le texte des fichiers
// (commentaires et mise en forme conservés). Chaque étape décrit ses changements ; --dry-run les montre sans écrire.
// Après les changements obligatoires, des suggestions (non appliquées) signalent ce que la nouvelle version permet d'écrire mieux.
import fs from 'node:fs/promises';
import path from 'node:path';
import YAML from 'yaml';
import { LANGUAGE_VERSIONS } from './validate.js';
import { loadProject } from './load.js';

export const LATEST = Math.max(...LANGUAGE_VERSIONS);

/** Version déclarée par site.yaml : language, sinon 0 (site écrit avant la version 1, sans déclaration). */
export function declaredVersion(siteText) {
  try { const d = YAML.parse(siteText); return d && typeof d === 'object' && Number.isInteger(d.language) ? d.language : 0; } catch { return null; }
}

/** Étapes : { from, to, title, apply(ctx) → [{ file, change }] } ; ctx.read / ctx.write travaillent sur le texte. */
export const MIGRATIONS = [
  {
    from: 0, to: 1,
    title: 'Déclarer la version du langage (language: 1)',
    async apply(ctx) {
      const text = await ctx.read('site.yaml');
      const lines = text.split('\n');
      // Un en-tête de commentaires séparé du reste par une ligne vide reste en tête ; un commentaire collé à la première clé lui appartient.
      let i = 0; while (i < lines.length && /^\s*#/.test(lines[i])) i++;
      const header = i > 0 && i < lines.length && lines[i].trim() === '';
      lines.splice(header ? i + 1 : 0, 0, 'language: 1', '');
      await ctx.write('site.yaml', lines.join('\n'));
      return [{ file: 'site.yaml', change: 'ajout de « language: 1 » en tête' }];
    },
  },
];

/** Suggestions propres à la version 1 : coordonnées recopiées en dur, valeurs répétées qui gagneraient à devenir des constantes. */
async function suggestV1(root, documentSite = null) {
  const out = [];
  let site = documentSite; if (!site) try { site = YAML.parse(await fs.readFile(path.join(root, 'site.yaml'), 'utf8')); } catch { return out; }
  const contact = site?.site?.contact || {};
  // Les pages dans leur écriture d'auteur : YAML ou documents.
  const pages = []; try { for (const f of (await fs.readdir(path.join(root, 'pages'))).filter(f => f.endsWith('.page.yaml') || f.endsWith('.md'))) pages.push({ f: 'pages/' + f, t: await fs.readFile(path.join(root, 'pages', f), 'utf8') }); } catch { /* pas de pages */ }
  const constant = k => (documentSite ? `dans site.md, « Constantes : » puis « - nom | ${k} », et {{ const.nom }} dans les pages` : `constants: { nom: ${k} } puis {{ const.nom }}`);
  for (const [k, v] of Object.entries(contact)) {
    if (typeof v !== 'string' || v.length < 6) continue;
    const hits = pages.filter(p => p.t.includes(v)).map(p => p.f);
    if (hits.length) out.push(`site.contact.${k} (« ${v} ») est recopié dans ${hits.join(', ')} : écrivez {{ site.contact.${k} }} pour qu'un changement de coordonnées se fasse à un seul endroit.`);
  }
  // Montants et délais répétés sur plusieurs pages : candidats aux constantes.
  const counts = new Map();
  for (const p of pages) for (const m of p.t.matchAll(/\b\d+(?:[.,]\d+)?\s?(?:€(?:\s?TTC|\s?HT)?|h\b|heures?|jours?|min\b|minutes?|ans?)\b/g)) { const k = m[0].replace(/\s+/g, ' '); const s = counts.get(k) || new Set(); s.add(p.f); counts.set(k, s); }
  for (const [k, files] of counts) if (files.size >= 2) out.push(`« ${k} » apparaît dans ${files.size} pages (${[...files].join(', ')}) : une constante (${constant(k)}) éviterait un oubli lors d'un changement.`);
  return out;
}

/**
 * Migre le site de root vers la version to (défaut : la dernière). Renvoie { from, to, steps: [{ title, changes }], suggestions, written }.
 */
export async function migrate(root, { to = LATEST, dryRun = false } = {}) {
  const files = new Map();
  const ctx = {
    read: async (rel) => files.has(rel) ? files.get(rel) : fs.readFile(path.join(root, rel), 'utf8'),
    write: async (rel, text) => { files.set(rel, text); },
  };
  // Un site écrit en documents (site.md) : sa version est celle que vaut sa lecture ; le format document est né avec la version 1.
  const exists = f => fs.access(path.join(root, f)).then(() => true, () => false);
  let documentSite = null;
  if (!(await exists('site.yaml')) && await exists('site.md')) {
    const project = await loadProject(root);
    if (project.documents?.site?.errors.length) throw new Error('site.md illisible : reprenez les lignes refusées avant de migrer (sitec lire).');
    documentSite = project.site || {};
  }
  const from = documentSite ? (Number.isInteger(documentSite.language) ? documentSite.language : 1) : declaredVersion(await ctx.read('site.yaml'));
  if (from === null) throw new Error('site.yaml illisible : corrigez le YAML avant de migrer (sitec check).');
  if (from > LATEST) throw new Error(`Le site déclare la version ${from}, ce compilateur ne connaît que jusqu'à ${LATEST}.`);
  if (to < from) throw new Error(`Retour en arrière non pris en charge (site en version ${from}, demandé ${to}).`);
  const steps = [];
  let v = from;
  while (v < to) {
    const m = MIGRATIONS.find(x => x.from === v);
    if (!m) throw new Error(`Aucune étape de migration depuis la version ${v}.`);
    if (documentSite) throw new Error(`L'étape ${m.from} → ${m.to} ne sait pas encore récrire un site en documents.`);
    steps.push({ title: `${m.from} → ${m.to} : ${m.title}`, changes: await m.apply(ctx) });
    v = m.to;
  }
  if (!dryRun) for (const [rel, text] of files) await fs.writeFile(path.join(root, rel), text);
  const suggestions = to >= 1 ? await suggestV1(root, documentSite) : [];
  return { from, to, steps, suggestions, written: dryRun ? [] : [...files.keys()] };
}
