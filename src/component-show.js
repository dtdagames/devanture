// sitec component show : pour chaque bloc du manifeste (données, fonctionnement, forme, apparence), les lignes écrites
// et ce que le compilateur en tire (schéma des props, effets, gabarit, feuille). Rien n'est recalculé ici : tout vient de
// l'entrée de catalogue, celle-là même que check et build utilisent.
import fs from 'node:fs/promises';
import path from 'node:path';
import YAML from 'yaml';
import { parseWithLines } from './lang/lines.js';
import { parseComponentOutline } from './lang/outline.js';
import { compileTemplate } from './lang/template.js';
import { SOURCES, sourceSchema } from './lang/sources.js';

const COMMON_PROPS = new Set(['id', 'keywords', 'variants', 'appearance']);
const flow = v => YAML.stringify(v, { collectionStyle: 'flow', lineWidth: 0 }).trim();

/** Lignes d'un bloc de premier niveau du manifeste : { from, to, text } (commentaires et lignes vides de fin retirés). */
function blockSource(lines, starts, key) {
  const from = starts.get(key);
  if (!from) return null;
  const next = Math.min(...[...starts.values()].filter(l => l > from), lines.length + 1);
  let to = next - 1;
  while (to > from && /^\s*(#.*)?$/.test(lines[to - 1])) to--;
  return { from, to, text: lines.slice(from - 1, to).join('\n') };
}

/** Données de l'affichage : { name, file, format, blocks: [{ key, target, source, output, notes }], php }. */
export async function describeComponent(entry, { php = false } = {}) {
  const file = path.join(entry.dir, entry.document ? 'document.md' : entry.outline ? 'composant.md' : 'manifest.yaml');
  const text = entry.document ? entry.document.yaml : await fs.readFile(file, 'utf8');
  const lines = text.split(/\r?\n/);
  const { value, lineOf } = entry.outline ? parseComponentOutline(text) : parseWithLines(text);
  const starts = new Map(Object.keys(value || {}).map(k => [k, lineOf({ in: value, at: k })]));
  const m = entry.manifest, made = entry.produced || {};
  const blocks = [];
  // Format document : la première transformation est la lecture, phrase par phrase ; les blocs suivants montrent ce que devient cette lecture.
  if (entry.document) blocks.push({ key: 'document.md', target: 'lecture.yaml : ce que le compilateur comprend, phrase par phrase (manifeste au format langage, figé à côté du document)', source: null, output: entry.document.trace.map(t => `ligne ${t.line} : ${t.text}\n  → ${t.said}${t.corrected ? `\n  (${t.corrected.join(' ; ')})` : ''}`).join('\n'), notes: [entry.document.stale ? 'cette lecture n\'est pas celle qui a été acceptée : sitec lire <dossier> --accepter' : 'lecture identique à celle qui a été acceptée (lecture.yaml)'] });
  const own = Object.fromEntries(Object.entries(m.props?.properties || {}).filter(([k]) => !COMMON_PROPS.has(k)));
  const propsOut = [
    ...(m.props?.required?.length ? [`required: ${flow(m.props.required)}`] : []),
    ...Object.entries(own).map(([k, v]) => `${k}: ${flow(v)}`),
  ].join('\n');
  if (value['données'] !== undefined) blocks.push({ key: 'données', target: 'schéma JSON des props (validation des pages, complétion de l\'éditeur, site.json)', source: blockSource(lines, starts, 'données'), output: propsOut, notes: ['id, keywords et variants s\'ajoutent à toute section'] });
  else if (value.props !== undefined) blocks.push({ key: 'props', target: 'schéma JSON écrit à la main, repris tel quel', source: blockSource(lines, starts, 'props'), output: null, notes: [] });
  if (value.fonctionnement !== undefined) {
    const f = m.effects?.form, reads = m.sources || [];
    // Lectures à la visite : ce que le composant demande à la cible, et la forme de ce qu'elle rend.
    const readsOut = reads.map(r => {
      const def = SOURCES[r.source], sch = sourceSchema(r.source), it = sch.type === 'array' ? sch.items : sch;
      const args = Object.entries(r.args).map(([k, e]) => `${k}: ${e}`).join(', ');
      return `${r.key} ← ${r.source}${args ? ` (${args})` : ''} : ${sch.type === 'array' ? 'une liste, chaque élément' : 'un groupe'} { ${Object.keys(it.properties).join(', ')} }\n  service de la cible : ${def.service} ; appel produit : sl_source($p, '${r.key}', '${r.id}', […]) avant le rendu`;
    }).join('\n');
    const onlyReads = reads.length && !f && !('formulaire' in (value.fonctionnement || {}));
    blocks.push({
      key: 'fonctionnement', target: onlyReads ? 'lectures à la visite : sources demandées à la cible avant le rendu, lues par la forme comme des données' : reads.length ? 'lectures à la visite et effets déclarés (validation, CSRF, pot de miel, enregistrement, e-mail fournis par le compilateur)' : 'effets déclarés (validation, CSRF, pot de miel, enregistrement, e-mail fournis par le compilateur)', source: blockSource(lines, starts, 'fonctionnement'),
      output: onlyReads ? readsOut : (reads.length ? readsOut + '\n' : '') + (f ? [`store: ${f.store}`, `notify: ${!!f.notify}`, ...(f.to ? [`to: ${f.to}`] : []), ...(f.success ? [`success: ${flow(f.success)}`] : []), ...(f.rules ? [`rules: ${flow(f.rules)}`] : []), 'fields:', ...(f.fields || []).map(x => '  - ' + flow(x))].join('\n') : '(aucun effet : le bloc contient des erreurs, voir sitec check)'),
      notes: [...(reads.length ? ['une page qui contient ce composant n\'est pas servie depuis le cache statique : ce qu\'il lit change d\'une visite à l\'autre'] : []), ...(f ? [`réponses enregistrées dans la collection d'exploitation « ${f.store} » (back-office, onglet Formulaires)`] : []),
        ...(f?.rules?.capacity ? [`règle appliquée par la cible à l'enregistrement, sous le verrou du registre : au plus ${f.rules.capacity.max} place${f.rules.capacity.max > 1 ? 's' : ''}${f.rules.capacity.by ? ` par valeur de « ${f.rules.capacity.by} »` : ' en tout'}${f.rules.capacity.qty ? `, chaque envoi comptant pour la valeur de « ${f.rules.capacity.qty} »` : ''} ; au-delà : ${f.rules.capacity.waitlist ? 'liste d\'attente' : 'refus'}`] : []),
        ...(f?.rules?.unique ? [`règle appliquée de la même façon : un seul envoi non annulé par ${f.rules.unique.fields.join(' + ')}`] : []),
        ...(f?.rules ? ['le back-office peut annuler un envoi (sa place est rendue), le rétablir, ou donner la place à un envoi en attente'] : [])],
    });
  } else if (value.effects !== undefined) blocks.push({ key: 'effects', target: 'effets en format machine, repris tels quels', source: blockSource(lines, starts, 'effects'), output: null, notes: [] });
  if (value['calculé'] !== undefined) blocks.push({ key: 'calculé', target: 'données que le compilateur fournit à la section (lues par la forme comme les autres)', source: blockSource(lines, starts, 'calculé'), output: null, notes: [] });
  if (value.forme !== undefined) {
    blocks.push({
      key: 'forme', target: 'gabarit neutre (template.html en mémoire), puis PHP', source: blockSource(lines, starts, 'forme'), output: (made.template ?? entry.files['template.html'] ?? '').trim(),
      notes: [
        ...(made.words?.length ? [`mots du vocabulaire employés : ${made.words.join(', ')} (sitec explain "<mot>")`] : []),
        ...(m.behaviors?.length ? [`comportements ajoutés : ${m.behaviors.join(', ')} (script commun du site, aucun JavaScript dans le composant)`] : []),
        ...(made.parts?.length ? [`parties que l'apparence peut viser : ${made.parts.join(', ')}`] : []),
      ],
      extra: made.formeCss ? { title: 'feuille de base des primitives', text: made.formeCss.trim() } : null,
    });
  } else if (entry.files['template.html'] === undefined && entry.files['template.php'] !== undefined) blocks.push({ key: 'template.php', target: 'gabarit PHP du compilateur (composant natif à traitement serveur : panier, commande, formulaire de contact, horaires)', source: null, output: null, notes: ['rien n\'est généré pour la structure : le fichier est la source'] });
  else blocks.push({ key: 'template.html', target: 'gabarit écrit à la main (format html), compilé en PHP', source: null, output: null, notes: ['rien n\'est généré pour la structure : le fichier est la source'] });
  if (value.apparence !== undefined) blocks.push({ key: 'apparence', target: 'feuille de style encadrée (sélecteurs préfixés, jetons du thème)', source: blockSource(lines, starts, 'apparence'), output: (made.apparenceCss ?? '').trim() || '(aucune règle)', notes: [] });
  let compiled = null;
  if (php && entry.files['template.html'] !== undefined) {
    const r = entry.compiled || compileTemplate(entry.files['template.html'], { name: entry.name, props: m.props, effects: m.effects || null, sources: m.sources || null });
    compiled = r.php ?? `(gabarit en erreur : ${r.errors.map(e => `ligne ${e.line} : ${e.message}`).join(' ; ')})`;
  }
  return { name: entry.name, file, outline: !!entry.outline, format: entry.document ? 'document' : value.forme !== undefined ? 'langage' : entry.files['template.html'] === undefined && entry.files['template.php'] !== undefined ? 'php' : 'html', native: !entry.project, package: entry.package || null, blocks, php: compiled };
}

const indent = (t, n = 4) => String(t).split('\n').map(l => ' '.repeat(n) + l).join('\n');

/** Texte lisible : un bloc du manifeste, une flèche, ce qu'il devient. */
export function formatDescription(d, { cwd = process.cwd() } = {}) {
  const rel = path.relative(cwd, d.file).replaceAll('\\', '/');
  const out = [`${d.name} — ${rel} (format ${d.format}${d.native ? ', composant natif' : d.package ? `, paquet ${d.package}` : ''})`, 'Chaque bloc du manifeste, puis ce que le compilateur en tire. Rien d\'autre n\'entre dans le site.'];
  for (const b of d.blocks) {
    out.push('', `== ${b.key} → ${b.target}`);
    if (b.source) out.push(`  ${d.format === 'document' ? 'lecture.yaml' : d.outline ? 'composant.md' : 'manifest.yaml'}, ligne${b.source.to > b.source.from ? `s ${b.source.from} à ${b.source.to}` : ` ${b.source.from}`} :`, indent(b.source.text));
    if (b.output !== null && b.output !== undefined) out.push('  devient :', indent(b.output));
    if (b.extra) out.push(`  ${b.extra.title} :`, indent(b.extra.text));
    for (const n of b.notes) out.push(`  (${n})`);
  }
  if (d.php !== null) out.push('', '== PHP compilé (ce que le serveur exécute)', indent(d.php));
  return out.join('\n');
}
