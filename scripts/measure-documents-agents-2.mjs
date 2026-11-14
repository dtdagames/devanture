// Seconde mesure avec des agents : écrire et modifier un site en YAML ou en documents (mesure-document-2/).
// Elle reprend la première (mesure-document/, scripts/measure-site-document-agents.mjs) en retirant ce qui la brouillait :
//   - même plan de site imposé aux deux formats (6 pages, 22 sections) : la taille du site ne dépend plus du format ;
//   - chaque fichier écrit avec l'outil d'écriture, un par appel : plus de longue commande shell, dont trois avaient échoué en YAML ;
//   - un mode d'emploi par format, celui que « sitec init » pose dans un dépôt de site (manuel-yaml.md, manuel-documents.md) ;
//   - éditions : le même site de départ (maintenance/originaux/dsl/garnier-associes), converti par « sitec rediger » pour les documents.
//
// Troisième passe (mesure-document-3/) : seuls les essais en documents sont refaits, après deux corrections du compilateur
// (« check --accepter » relit, accepte et vérifie en une commande ; dans un texte long, une phrase « Mot : suite » est du texte).
// Les essais en YAML de la seconde passe servent de référence : rien n'a changé pour eux.
//
// Usage (--dossier <nom> : mesure-document-2 par défaut) :
//   node scripts/measure-documents-agents-2.mjs --preparer      crée les dossiers, les modes d'emploi, les sites de départ, les consignes
//        [--formats document] [--une-commande] [--reference mesure-document-2]
//   node scripts/measure-documents-agents-2.mjs --releve        lit les journaux des agents (agents.json → usage.json)
//   node scripts/measure-documents-agents-2.mjs [--sans-banc]   vérifie les sites laissés, joint les relevés, écrit mesures.json
// PHP : PHP_BIN, sinon php. Journaux : MESURE_JOURNAUX (dossier « subagents » de la session qui a lancé les agents).
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { encode } from 'gpt-tokenizer';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = name => { const i = process.argv.indexOf(name); return i >= 0 ? process.argv[i + 1] : null; };
const BASE = path.join(ROOT, arg('--dossier') || 'mesure-document-2');
// Le protocole d'une passe : formats essayés, relecture en une commande ou en deux, passe de référence pour les formats non refaits.
const PROTOCOL_FILE = path.join(BASE, 'protocole.json');
const protocol = process.argv.includes('--preparer')
  ? { formats: (arg('--formats') || 'yaml,document').split(','), une_commande: process.argv.includes('--une-commande'), reference: arg('--reference') }
  : fs.existsSync(PROTOCOL_FILE) ? JSON.parse(fs.readFileSync(PROTOCOL_FILE, 'utf8')) : { formats: ['yaml', 'document'], une_commande: false, reference: null };
const node = (...args) => spawnSync(process.execPath, args, { cwd: ROOT, encoding: 'utf8' });
const sitec = (...args) => node(path.join('bin', 'sitec.js'), ...args);
const last = out => { const l = String(out || '').trim().split('\n').filter(Boolean).pop() || ''; try { return JSON.parse(l); } catch { return null; } };
const TASKS = ['creation', 'edition'], FORMATS = protocol.formats, RUNS = [1, 2, 3];
const runs = () => TASKS.flatMap(task => FORMATS.flatMap(format => RUNS.map(n => ({ key: `${task}/${format}/run${n}`, task, format, dir: path.join(BASE, task, format, `run${n}`) }))));

const BRIEF = 'Cabinet Garnier & Associés, avocats à Bordeaux, fondé en 2011. Trois associés : Me Hélène Garnier (droit du travail), Me Thomas Ruiz (droit des affaires), Me Inès Kaddour (droit de la famille). Deux collaboratrices et une assistante. Première consultation de 30 minutes offerte. Honoraires au forfait ou au temps passé, convention d\'honoraires systématique. Interventions à Bordeaux, Libourne et Arcachon. Adresse : 25 cours de l\'Intendance, 33000 Bordeaux. Tél 05 56 00 00 00, email contact@garnier-associes.fr.';
const PLAN = `Plan du site, à suivre exactement (6 pages, 22 sections, dans cet ordre ; les noms sont ceux du catalogue) :
1. Accueil, route / : hero (titre, sous-titre, image hero.svg, bouton vers /contact, second bouton vers /domaines) ; features (les trois domaines du brief, une icône chacun) ; stats (trois chiffres tirés du brief) ; richtext (présentation du cabinet, image cabinet.svg) ; cta (vers /contact).
2. Domaines, route /domaines : hero ; features (les trois domaines, deux phrases chacun) ; steps (quatre étapes : premier rendez-vous, convention d'honoraires, traitement du dossier, suivi) ; faq (trois questions tirées du brief) ; cta.
3. Le cabinet, route /cabinet : hero ; team (les trois associés, photos helene.svg, thomas.svg, ines.svg) ; richtext (l'équipe et les lieux d'intervention, image bordeaux.svg) ; cta.
4. Honoraires, route /honoraires : hero ; pricelist (un groupe, trois lignes : première consultation, forfait, temps passé ; le prix en mots, sans montant) ; faq (trois questions) ; cta.
5. Contact, route /contact : hero ; contact.form (nom, e-mail, téléphone, message) ; map (l'adresse du brief).
6. Mentions légales, route /mentions-legales : richtext.
Menu : les cinq premières pages. Pied de page : un lien vers les mentions légales. Coordonnées du site : celles du brief.`;
const ASSETS = ['hero.svg', 'cabinet.svg', 'bordeaux.svg', 'helene.svg', 'thomas.svg', 'ines.svg'];

/** La consigne d'une case ; DOSSIER est remplacé par le dossier de l'essai. */
function consigne(task, format) {
  const doc = format === 'document';
  const manuel = path.join(BASE, doc ? 'manuel-documents.md' : 'manuel-yaml.md');
  const ecrit = doc ? 'EN DOCUMENTS (`site.md`, `pages/<id>.md` ; aucun fichier YAML)' : 'EN YAML (`site.yaml`, `pages/<id>.page.yaml`)';
  const commandes = doc
    ? protocol.une_commande ? '`node bin/sitec.js catalog`, `node bin/sitec.js explain document`, `node bin/sitec.js explain <composant> --document` (dont `explain site`) et `node bin/sitec.js check DOSSIER --accepter`'
    : '`node bin/sitec.js catalog`, `node bin/sitec.js explain document`, `node bin/sitec.js explain <composant> --document` (dont `explain site`), `node bin/sitec.js lire DOSSIER --accepter` et `node bin/sitec.js check DOSSIER`'
    : '`node bin/sitec.js catalog`, `node bin/sitec.js explain <composant>` (dont `explain site`) et `node bin/sitec.js check DOSSIER`';
  const boucle = doc ? (protocol.une_commande ? 'lance `check DOSSIER --accepter`' : 'lance `lire DOSSIER --accepter` puis `check`') : 'lance `check`';
  const tete = `Tu es un agent de test. Dépôt : ${ROOT} (Windows, Node 24). Il contient un compilateur \`sitec\` qui transforme la description d'un site vitrine en site PHP.`;
  const outils = `Sers-toi UNIQUEMENT du mode d'emploi ${manuel} (lis-le en entier d'abord) et des commandes ${commandes}, lancées depuis ${ROOT}.`;
  const rapport = 'Rapport final, COURT (10 lignes maximum) : nombre d\'appels d\'outils, nombre d\'exécutions de `check` et le nombre d\'erreurs à chacune, nombre de `explain`, une ligne par difficulté rencontrée. Rien d\'autre.';
  if (task === 'creation') return [
    `${tete} Mission : écrire un site vitrine complet ${ecrit} dans le dossier DOSSIER, qui existe déjà et contient les images (DOSSIER/assets : ${ASSETS.join(', ')}). ${outils}`,
    'INTERDIT : lire tout autre fichier du dépôt (src/, components/, examples/, docs/, scripts/, CLAUDE.md, les autres dossiers de ' + path.basename(BASE) + '/…) ; modifier quoi que ce soit hors de ton dossier ; exécuter `build`.',
    'Écriture : écris chaque fichier avec l\'outil Write, un fichier par appel (aucune commande shell pour créer ou modifier un fichier).',
    `Brief client : « ${BRIEF} »`,
    PLAN,
    'Textes crédibles, tirés du brief : n\'invente ni montant, ni délai, ni distinction, ni témoignage ; ce que le brief ne dit pas et qu\'il faut pourtant écrire (SIRET, hébergeur) s\'écrit `[à compléter]`.',
    `Protocole : écris le site, ${boucle}, corrige jusqu'à \`{"ok":true,...}\`. Note chaque exécution de \`check\` et son nombre d'erreurs.`,
    rapport,
  ].join('\n');
  return [
    `${tete} Le dossier DOSSIER contient un site écrit ${ecrit}. Mission : lui appliquer les quatre modifications décrites dans ${path.join(ROOT, 'maintenance', 'MODIFICATIONS-garnier.md')} (lis ce fichier), sans changer de format. ${outils}`,
    'INTERDIT : lire tout autre fichier du dépôt (src/, components/, examples/, docs/, scripts/, CLAUDE.md, le reste de maintenance/, les autres dossiers de ' + path.basename(BASE) + '/…) ; modifier quoi que ce soit hors de ton dossier ; exécuter `build`.',
    'Écriture : modifie les fichiers avec les outils Edit et Write (aucune commande shell pour créer ou modifier un fichier).',
    `Protocole : applique les modifications, ${boucle}, corrige jusqu'à \`{"ok":true,...}\`. Note chaque exécution de \`check\` et son nombre d'erreurs.`,
    rapport,
  ].join('\n');
}

if (process.argv.includes('--preparer')) {
  if (fs.existsSync(BASE) && fs.readdirSync(BASE).length) { console.error(`${BASE} existe déjà : la mesure est préparée (supprimez le dossier pour la refaire).`); process.exit(1); }
  fs.mkdirSync(BASE, { recursive: true });
  fs.writeFileSync(PROTOCOL_FILE, JSON.stringify(protocol, null, 1) + '\n');
  // Un mode d'emploi par format : celui du dépôt que pose « sitec init », commandes ramenées à celles de ce dépôt.
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sitec-mesure-'));
  for (const [format, flag] of [['documents', []], ['yaml', ['--yaml']]].filter(([x]) => FORMATS.includes(x === 'documents' ? 'document' : 'yaml'))) {
    const d = path.join(tmp, format), r = sitec('init', d, '--name', 'Garnier & Associés', '--no-git', '--local', ...flag);
    if (r.status !== 0) { console.error(r.stdout + r.stderr); process.exit(1); }
    const manual = fs.readFileSync(path.join(d, 'CLAUDE.md'), 'utf8').replace(/\r\n/g, '\n').replaceAll('npx sitec', 'node bin/sitec.js').replace(/(node bin\/sitec\.js (?:check|build|review|lire|test|schema|keywords|deploy)) \./g, '$1 <dossier>');
    fs.writeFileSync(path.join(BASE, `manuel-${format}.md`), manual);
  }
  const start = path.join(ROOT, 'maintenance', 'originaux', 'dsl', 'garnier-associes');
  const docStart = path.join(tmp, 'depart-documents');
  fs.cpSync(start, docStart, { recursive: true, filter: s => !/[\\/](dist|node_modules)([\\/]|$)/.test(s) });
  const conv = sitec('rediger', docStart);
  if (conv.status !== 0) { console.error(conv.stdout + conv.stderr); process.exit(1); }
  for (const r of runs()) {
    if (r.task === 'creation') {
      fs.mkdirSync(path.join(r.dir, 'assets'), { recursive: true });
      for (const a of ASSETS) fs.copyFileSync(path.join(ROOT, 'examples', 'garnier-associes', 'assets', a), path.join(r.dir, 'assets', a));
    } else fs.cpSync(r.format === 'yaml' ? start : docStart, r.dir, { recursive: true, filter: s => !/[\\/](dist|node_modules)([\\/]|$)/.test(s) });
  }
  const md = ['# Consignes de la seconde mesure avec des agents', '', 'Douze agents sans contexte, trois par case. `DOSSIER` est remplacé par le dossier de l\'essai (`mesure-document-2/<tâche>/<format>/run<n>`).', 'Les deux consignes d\'une même tâche ne diffèrent que par le format demandé, le mode d\'emploi et les commandes qui vont avec.', ''];
  fs.mkdirSync(path.join(BASE, 'consignes'), { recursive: true });
  for (const task of TASKS) for (const format of FORMATS) {
    const c = consigne(task, format);
    fs.writeFileSync(path.join(BASE, 'consignes', `${task}-${format}.txt`), c + '\n');
    md.push(`## ${task === 'creation' ? 'Création' : 'Éditions'}, en ${format === 'yaml' ? 'YAML' : 'documents'}`, '', c, '');
  }
  fs.writeFileSync(path.join(BASE, 'CONSIGNES.md'), md.join('\n'));
  fs.rmSync(tmp, { recursive: true, force: true });
  const sizes = Object.fromEntries(['yaml', 'documents'].filter(f => fs.existsSync(path.join(BASE, `manuel-${f}.md`))).map(f => [f, encode(fs.readFileSync(path.join(BASE, `manuel-${f}.md`), 'utf8')).length]));
  // La consigne de chaque essai, avec son dossier.
  for (const r of runs()) fs.writeFileSync(path.join(BASE, 'consignes', `${r.task}-${r.format}-run${r.key.slice(-1)}.txt`), consigne(r.task, r.format).replaceAll('DOSSIER', r.dir) + '\n');
  const src = d => { const fmt = fs.existsSync(path.join(d, 'site.md')) ? 'document' : 'yaml'; return encode([fmt === 'yaml' ? 'site.yaml' : 'site.md', ...fs.readdirSync(path.join(d, 'pages')).map(f => 'pages/' + f)].map(f => fs.readFileSync(path.join(d, f), 'utf8')).join('\n')).length; };
  console.log(JSON.stringify({ prepare: path.relative(ROOT, BASE), essais: runs().length, manuels_tokens: sizes, consignes_tokens: Object.fromEntries(TASKS.flatMap(t => FORMATS.map(f => [`${t}/${f}`, encode(consigne(t, f)).length]))), depart_editions_tokens: Object.fromEntries(FORMATS.map(f => [f, src(path.join(BASE, 'edition', f, 'run1'))])) }));
  process.exit(0);
}

if (process.argv.includes('--releve')) {
  // Journaux des agents : tours, tokens produits, tokens lus (hors cache, écrits au cache, relus du cache), outils appelés.
  const logs = process.env.MESURE_JOURNAUX;
  if (!logs || !fs.existsSync(logs)) { console.error('MESURE_JOURNAUX : dossier « subagents » de la session qui a lancé les agents.'); process.exit(2); }
  const agents = JSON.parse(fs.readFileSync(path.join(BASE, 'agents.json'), 'utf8')), out = {};
  for (const [run, a] of Object.entries(agents)) {
    const f = path.join(logs, `agent-${a.id}.jsonl`);
    if (!fs.existsSync(f)) { out[run] = null; continue; }
    const byMsg = new Map(), tools = {}; let first = null, lastAt = null, written = 0, writes = 0, edits = 0, checks = 0, reads = 0, explains = 0;
    for (const line of fs.readFileSync(f, 'utf8').split('\n')) {
      if (!line.trim()) continue;
      let j; try { j = JSON.parse(line); } catch { continue; }
      if (j.timestamp) { const at = Date.parse(j.timestamp); if (!Number.isNaN(at)) { first ??= at; lastAt = at; } }
      const m = j.message;
      if (!m || m.role !== 'assistant' || !m.usage) continue;
      // Un même message peut tenir sur plusieurs lignes du journal : son usage et ses appels ne sont comptés qu'une fois.
      const id = m.id || `sans-id-${byMsg.size}`;
      if (!byMsg.has(id)) byMsg.set(id, { usage: m.usage, tools: new Set() });
      const e = byMsg.get(id); e.usage = m.usage;
      for (const c of Array.isArray(m.content) ? m.content : []) if (c.type === 'tool_use') {
        if (e.tools.has(`${c.id}|${c.name}`)) continue;
        e.tools.add(`${c.id}|${c.name}`);
        if (c.name === 'Write') { written += encode(String(c.input?.content ?? '')).length; writes++; }
        if (c.name === 'Edit') { written += encode(String(c.input?.new_string ?? '')).length; edits++; }
        if (c.name === 'Bash') { const cmd = String(c.input?.command ?? ''); checks += (cmd.match(/sitec\.js\s+check\b/g) || []).length; reads += (cmd.match(/sitec\.js\s+lire\b/g) || []).length; explains += (cmd.match(/sitec\.js\s+explain\b/g) || []).length; }
      }
    }
    const u = [...byMsg.values()], sum = k => u.reduce((n, x) => n + (x.usage[k] || 0), 0);
    for (const e of u) for (const t of e.tools) { const n = t.split('|')[1]; tools[n] = (tools[n] || 0) + 1; }
    out[run] = { tours: u.length, produits: sum('output_tokens'), lus_hors_cache: sum('input_tokens'), ecrits_au_cache: sum('cache_creation_input_tokens'), relus_du_cache: sum('cache_read_input_tokens'), outils: tools };
    out[run].traites = out[run].produits + out[run].lus_hors_cache + out[run].ecrits_au_cache + out[run].relus_du_cache;
    out[run].appels_outils = Object.entries(tools).filter(([n]) => n !== 'SubagentHandback').reduce((s, [, n]) => s + n, 0);
    // Durée du premier au dernier événement du journal ; les douze agents tournaient en même temps : elle ne vaut que comme ordre de grandeur.
    out[run].duree_s = first !== null ? Math.round((lastAt - first) / 100) / 10 : null;
    // Ce qui part dans les fichiers du site (contenu des Write, nouveau texte des Edit), en tokens ; le reste des tokens produits
    // est du raisonnement, des commandes et le rapport. Les relances : combien de fois lire, check et explain ont été lancés.
    Object.assign(out[run], { ecrits_dans_les_fichiers: written, ecritures: writes, retouches: edits, lancements_check: checks, lancements_lire: reads, lancements_explain: explains });
  }
  fs.writeFileSync(path.join(BASE, 'usage.json'), JSON.stringify(out, null, 1) + '\n');
  console.log(JSON.stringify({ releves: Object.values(out).filter(Boolean).length, manquants: Object.entries(out).filter(([, v]) => !v).map(([k]) => k) }));
  process.exit(0);
}

// --- Mesure : ce qui se revérifie sur les sites laissés, joint à ce que les agents ont dépensé.
const noBench = process.argv.includes('--sans-banc');
const usage = fs.existsSync(path.join(BASE, 'usage.json')) ? JSON.parse(fs.readFileSync(path.join(BASE, 'usage.json'), 'utf8')) : {};
const agents = fs.existsSync(path.join(BASE, 'agents.json')) ? JSON.parse(fs.readFileSync(path.join(BASE, 'agents.json'), 'utf8')) : {};
let port = 9300; const rows = [];
for (const r of runs()) {
  const yaml = r.format === 'yaml';
  const pages = fs.existsSync(path.join(r.dir, 'pages')) ? fs.readdirSync(path.join(r.dir, 'pages')) : [];
  const files = [yaml ? 'site.yaml' : 'site.md', ...pages.filter(f => (yaml ? f.endsWith('.page.yaml') : f.endsWith('.md'))).map(f => 'pages/' + f)].filter(f => fs.existsSync(path.join(r.dir, f)));
  const text = files.map(f => fs.readFileSync(path.join(r.dir, f), 'utf8')).join('\n');
  // Un essai n'a pas le droit de changer de format ni d'en mêler deux.
  const stray = [...(yaml ? ['site.md', ...pages.filter(f => f.endsWith('.md')).map(f => 'pages/' + f)] : ['site.yaml', ...pages.filter(f => /\.ya?ml$/.test(f)).map(f => 'pages/' + f)])].filter(f => fs.existsSync(path.join(r.dir, f)));
  const check = sitec('check', r.dir), summary = last(check.stdout) || {};
  const build = sitec('build', r.dir, '--draft');
  const row = { essai: r.key, check_ok: check.status === 0, build_ok: build.status === 0, format_tenu: !stray.length, pages: summary.pages ?? null, sections: summary.sections ?? null, source_tokens: encode(text).length, source_lignes: text.split('\n').filter(l => l.trim()).length, blocs_yaml: yaml ? null : (text.match(/^```yaml/gm) || []).length };
  if (!noBench && build.status === 0) {
    const b = r.task === 'creation' ? node('scripts/verify-php-site.mjs', path.join(r.dir, 'dist'), String(port++)) : node('scripts/verify-maintenance.mjs', path.join(r.dir, 'dist'), String(port++), 'garnier');
    const j = last(b.stdout);
    if (r.task === 'creation') row.banc = j ? `${j.passed}/${j.total}` : 'illisible';
    else { const p = j ? ['M1', 'M2', 'M3', 'M4'].reduce((s, m) => s + (j[m]?.passed || 0), 0) : 0, t = j ? ['M1', 'M2', 'M3', 'M4'].reduce((s, m) => s + (j[m]?.total || 0), 0) : 0; row.banc = j ? `${p}/${t}` : 'illisible'; }
    row.banc_ok = !!row.banc && row.banc.split('/')[0] === row.banc.split('/')[1];
  }
  const u = usage[r.key] || {}, a = agents[r.key] || {};
  Object.assign(row, { tours: u.tours ?? null, tokens_produits: u.produits ?? null, tokens_traites: u.traites ?? null, appels_outils: u.appels_outils ?? null, outils: u.outils ?? null, ecrits_dans_les_fichiers: u.ecrits_dans_les_fichiers ?? null, ecritures: u.ecritures ?? null, retouches: u.retouches ?? null, lancements_check: u.lancements_check ?? null, lancements_lire: u.lancements_lire ?? null, lancements_explain: u.lancements_explain ?? null, contexte_par_tour: u.tours ? Math.round(u.traites / u.tours) : null, duree_s: u.duree_s ?? a.duree_s ?? null });
  rows.push(row);
}
const mean = xs => (xs.some(x => x === null || x === undefined) ? null : Math.round(xs.reduce((a, b) => a + b, 0) / xs.length));
const KEYS = ['source_tokens', 'sections', 'tours', 'tokens_produits', 'ecrits_dans_les_fichiers', 'tokens_traites', 'contexte_par_tour', 'appels_outils', 'ecritures', 'retouches', 'lancements_check', 'lancements_lire', 'lancements_explain', 'duree_s'];
const cells = {};
for (const task of TASKS) for (const format of FORMATS) {
  const r = rows.filter(x => x.essai.startsWith(`${task}/${format}/`));
  cells[`${task}/${format}`] = Object.fromEntries(KEYS.map(k => [k, { moyenne: mean(r.map(x => x[k])), essais: r.map(x => x[k]) }]));
  cells[`${task}/${format}`].reussis = `${r.filter(x => x.check_ok && x.build_ok && x.format_tenu && (noBench || x.banc_ok)).length}/${r.length}`;
}
// Les formats qui ne sont pas refaits dans cette passe viennent de la passe de référence, telle qu'elle a été mesurée.
const ref = protocol.reference ? JSON.parse(fs.readFileSync(path.join(ROOT, protocol.reference, 'mesures.json'), 'utf8')).cases : null;
const cell = (task, format) => cells[`${task}/${format}`] || ref?.[`${task}/${format}`] || null;
const pct = (d, y) => (y && d !== null && d !== undefined ? `${d > y ? '+' : ''}${Math.round((d / y - 1) * 100)} %` : null);
const gap = (task, k) => pct(cell(task, 'document')?.[k]?.moyenne, cell(task, 'yaml')?.[k]?.moyenne);
const ecarts = Object.fromEntries(TASKS.map(t => [t, Object.fromEntries(KEYS.filter(k => k !== 'sections').map(k => [k, gap(t, k)]))]));
// Écart avec les mêmes essais de la passe de référence (documents avant et après les corrections).
const avant = ref ? Object.fromEntries(TASKS.map(t => [t, Object.fromEntries(KEYS.filter(k => k !== 'sections').map(k => [k, pct(cells[`${t}/document`]?.[k]?.moyenne, ref[`${t}/document`]?.[k]?.moyenne)]))])) : null;
if (!noBench) fs.writeFileSync(path.join(BASE, 'mesures.json'), JSON.stringify({ protocole: protocol, essais: rows, cases: cells, ...(ref ? { cases_de_reference: Object.fromEntries(Object.entries(ref).filter(([k]) => !(k in cells) || k.endsWith('/document'))) } : {}), ecarts_document_contre_yaml: ecarts, ...(avant ? { ecarts_document_contre_document_de_reference: avant } : {}) }, null, 1) + '\n');
for (const [k, c] of Object.entries(cells)) console.log(`${k.padEnd(20)} ${KEYS.map(x => `${x} ${c[x].moyenne}`).join(' | ')}`);
for (const r of rows) console.log(`${r.essai.padEnd(24)} check ${r.check_ok ? 'ok ' : 'KO '} build ${r.build_ok ? 'ok ' : 'KO '} banc ${String(r.banc ?? '—').padEnd(6)} ${String(r.sections ?? '?').padStart(2)} sections  source ${String(r.source_tokens).padStart(5)} tokens  produits ${String(r.tokens_produits ?? '?').padStart(6)}  traités ${String(r.tokens_traites ?? '?').padStart(8)}  tours ${String(r.tours ?? '?').padStart(2)}  outils ${String(r.appels_outils ?? '?').padStart(2)}`);
console.log(JSON.stringify({ reussis: Object.fromEntries(Object.entries(cells).map(([k, v]) => [k, v.reussis])), ecarts_document_contre_yaml: ecarts, ...(avant ? { ecarts_document_contre_document_de_reference: avant } : {}) }));
