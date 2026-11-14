// Banc des outils du langage : paquets de composants, tests de composants (sitec test), migration (sitec migrate), avertissements.
// Travaille sur des copies temporaires des exemples ; ne modifie rien dans le dépôt.
// Usage : node scripts/verify-lang-tools.mjs
import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITEC = path.join(ROOT, 'bin', 'sitec.js');
const checks = [];
const ok = (n, pass, detail = '') => { checks.push({ name: n, pass: !!pass, detail }); };
const run = (...args) => { try { return { code: 0, out: execFileSync(process.execPath, [SITEC, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) }; } catch (e) { return { code: e.status ?? 1, out: (e.stdout || '') + (e.stderr || '') }; } };
const lines = out => out.split('\n').filter(Boolean).map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'sitec-tools-'));
const copy = async (rel, name) => { const d = path.join(tmp, name); await fs.cp(path.join(ROOT, rel), d, { recursive: true, filter: s => !/[\\/](dist|node_modules)([\\/]|$)/.test(s) }); return d; };

try {
  // --- Paquets
  const paquets = await copy('scripts/reference/exemples-yaml/paquets', 'paquets');
  const garnier = await copy('scripts/reference/exemples-yaml/garnier-associes', 'garnier');
  let r = run('check', garnier);
  const sum = lines(r.out).find(x => x.ok);
  ok('paquets : site avec paquet local valide', r.code === 0 && sum?.components?.packages?.includes('vitrine'), r.out.slice(-300));
  r = run('catalog', garnier);
  ok('paquets : catalogue liste vitrine.encart [paquet vitrine] et le composé du paquet', /vitrine\.encart .*\[paquet vitrine\]/.test(r.out) && /vitrine\.contact-rapide .*\[composé du paquet vitrine/.test(r.out));
  r = run('explain', 'vitrine.contact-rapide', garnier);
  ok('paquets : explain d\'un composé de paquet', /Produit les sections : vitrine\.encart, cta/.test(r.out), r.out.slice(0, 200));
  r = run('build', garnier, '--out', path.join(tmp, 'garnier-dist'));
  const css = await fs.readdir(path.join(tmp, 'garnier-dist', 'assets')).then(async () => fs.readFile(path.join(tmp, 'garnier-dist', 'assets', 'site.css'), 'utf8')).catch(() => '');
  ok('paquets : compilation, styles du paquet dans site.css, gabarit compilé', r.code === 0 && css.includes('.encart-attention') && (await fs.readFile(path.join(tmp, 'garnier-dist', 'components', 'vitrine.encart.php'), 'utf8')).includes('compilé depuis template.html'), r.out.slice(-200));
  const siteYaml = await fs.readFile(path.join(garnier, 'site.yaml'), 'utf8');
  await fs.writeFile(path.join(garnier, 'site.yaml'), siteYaml.replace('../paquets/vitrine', '../paquets/absent'));
  r = run('check', garnier);
  ok('paquets : paquet introuvable → E_PACKAGE', r.code === 1 && lines(r.out).some(e => e.code === 'E_PACKAGE' && /introuvable/.test(e.message)), r.out.slice(0, 300));
  await fs.writeFile(path.join(garnier, 'site.yaml'), siteYaml);
  const pkgYaml = await fs.readFile(path.join(paquets, 'vitrine', 'package.yaml'), 'utf8');
  await fs.writeFile(path.join(paquets, 'vitrine', 'package.yaml'), pkgYaml.replace('name: vitrine', 'name: products'));
  r = run('check', garnier);
  ok('paquets : préfixe d\'une famille native refusé', r.code === 1 && lines(r.out).some(e => e.code === 'E_PACKAGE' && /famille du catalogue natif/.test(e.message)), r.out.slice(0, 300));
  await fs.writeFile(path.join(paquets, 'vitrine', 'package.yaml'), pkgYaml.replace('language: 1', 'language: 9'));
  r = run('check', garnier);
  ok('paquets : version de langage inconnue du paquet → E_LANGUAGE', r.code === 1 && lines(r.out).some(e => e.code === 'E_LANGUAGE'), r.out.slice(0, 300));
  await fs.writeFile(path.join(paquets, 'vitrine', 'package.yaml'), pkgYaml);
  await fs.writeFile(path.join(paquets, 'vitrine', 'components', 'encart', 'template.php'), '<?php echo 1;');
  r = run('check', garnier);
  ok('paquets : template.php interdit dans un composant de paquet', r.code === 1 && /template\.php interdit/.test(r.out), r.out.slice(0, 300));
  await fs.rm(path.join(paquets, 'vitrine', 'components', 'encart', 'template.php'));

  // --- sitec test
  r = run('test', garnier);
  let s = lines(r.out).find(x => 'cases' in x);
  ok('test : instantanés du paquet conformes', r.code === 0 && s?.failed === 0 && s.cases >= 2, r.out.slice(-300));
  const snap = path.join(paquets, 'vitrine', 'components', 'encart', 'fixtures', 'info.html');
  const original = await fs.readFile(snap, 'utf8');
  await fs.writeFile(snap, original.replace('Première consultation offerte', 'Autre titre'));
  r = run('test', garnier);
  ok('test : instantané modifié → DIFF, code 1', r.code === 1 && /^DIFF vitrine\.encart › info/m.test(r.out), r.out.slice(0, 300));
  r = run('test', garnier, '--update');
  ok('test : --update accepte le nouveau rendu', r.code === 0 && /^MAJ  vitrine\.encart › info/m.test(r.out) && (await fs.readFile(snap, 'utf8')).includes('Première consultation offerte'));
  await fs.writeFile(path.join(paquets, 'vitrine', 'components', 'encart', 'fixtures', 'faux.yaml'), 'title: X\ntone: rouge\n');
  r = run('test', garnier);
  ok('test : cas invalide (valeur hors enum) → CAS, code 1', r.code === 1 && /^CAS  vitrine\.encart › faux/m.test(r.out), r.out.slice(0, 300));
  await fs.rm(path.join(paquets, 'vitrine', 'components', 'encart', 'fixtures', 'faux.yaml'));
  await fs.writeFile(path.join(paquets, 'vitrine', 'components', 'encart', 'fixtures', 'neuf.yaml'), 'title: Nouveau cas\n');
  r = run('test', garnier);
  ok('test : nouveau cas → instantané créé', r.code === 0 && /^NEW  vitrine\.encart › neuf/m.test(r.out) && (await fs.readFile(path.join(paquets, 'vitrine', 'components', 'encart', 'fixtures', 'neuf.html'), 'utf8')).includes('Nouveau cas'));
  const plomberie = await copy('scripts/reference/exemples-yaml/plomberie-martin', 'plomberie');
  r = run('test', plomberie, '--catalog');
  s = lines(r.out).find(x => 'cases' in x);
  ok('test : exemples de tous les composants natifs à gabarit et composant de projet à formulaire', r.code === 0 && s?.components >= 15 && s.failed === 0, r.out.slice(-400));

  // --- schémas de l'éditeur
  r = run('schema', plomberie);
  const sch = lines(r.out).find(x => x.schemas);
  ok('schema : schémas produits (site, pages, composés, manifestes, paquet, cas de test, collection)', r.code === 0 && sch?.files?.includes('page.schema.json') && sch.files.includes('data.realisations.schema.json') && sch.files.includes('fixture.devis-express.schema.json'), r.out.slice(0, 300));
  const vs = JSON.parse(await fs.readFile(path.join(plomberie, '.vscode', 'settings.json'), 'utf8'));
  ok('schema : réglages VS Code (yaml.schemas) et extension recommandée', vs['yaml.schemas']?.['./.devanture/schema/page.schema.json']?.includes('pages/*.page.yaml') && JSON.parse(await fs.readFile(path.join(plomberie, '.vscode', 'extensions.json'), 'utf8')).recommendations.includes('redhat.vscode-yaml'));
  const chk = () => { try { return { code: 0, out: execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'check-schemas.mjs'), plomberie], { encoding: 'utf8' }) }; } catch (e) { return { code: e.status, out: (e.stdout || '') + (e.stderr || '') }; } };
  r = chk();
  ok('schema : tous les fichiers YAML du site valides contre leurs schémas', r.code === 0, r.out.slice(0, 400));
  const pageFile = path.join(plomberie, 'pages', 'services.page.yaml'); const pageText = await fs.readFile(pageFile, 'utf8');
  for (const [label, from, to] of [['prop inconnue', '      title: Nos services', '      titel: Nos services'], ['composant inconnu', '  - steps:', '  - etapes:'], ['image inexistante', '  - hero:\n', '  - hero:\n      image: absente.jpg\n']]) {
    await fs.writeFile(pageFile, pageText.replace(from, to));
    r = chk();
    ok(`schema : ${label} soulignée par l'éditeur`, r.code === 1 && /FAIL pages\/services\.page\.yaml/.test(r.out), r.out.slice(0, 300));
  }
  await fs.writeFile(pageFile, pageText);
  const vsBefore = { ...vs, 'editor.tabSize': 2 }; await fs.writeFile(path.join(plomberie, '.vscode', 'settings.json'), JSON.stringify(vsBefore));
  run('schema', plomberie);
  ok('schema : réglages VS Code existants conservés', JSON.parse(await fs.readFile(path.join(plomberie, '.vscode', 'settings.json'), 'utf8'))['editor.tabSize'] === 2);

  // --- CSS encadré, comportements déclarés, gabarit sans script
  const fournil0 = await copy('scripts/reference/exemples-yaml/le-fournil', 'fournil-composants');
  // Format html (porte de sortie) : gabarit et feuille écrits à la main, toujours vérifiés.
  const cdir = path.join(fournil0, 'components', 'avis-html');
  await fs.mkdir(path.join(cdir, 'fixtures'), { recursive: true });
  const css0 = '.avis-html-box{display:flex;align-items:center;gap:12px}\n.avis-html-stars{color:var(--color-accent)}\n';
  const tpl0 = '<section class="section avis-html">\n  <div class="container">\n    <div class="avis-html-box" data-sl-carousel>\n      <button type="button" class="avis-html-nav" data-sl-prev>‹</button>\n      <div data-sl-track>{% for a in p.items %}<blockquote class="card"><div class="avis-html-stars">{{ \'★\' | repeat(a.rating | default(5)) }}</div><p>« {{ a.text }} »</p></blockquote>{% endfor %}</div>\n      <button type="button" class="avis-html-nav" data-sl-next>›</button>\n    </div>\n  </div>\n</section>\n';
  const man0 = 'name: avis-html\ndescription: "Carrousel au format html."\nbehaviors: [carousel]\nprops:\n  type: object\n  required: [items]\n  properties:\n    items:\n      type: array\n      items:\n        type: object\n        additionalProperties: false\n        required: [text]\n        properties:\n          text: { type: string }\n          rating: { type: integer }\nexample: |\n  - avis-html:\n      items:\n        - { text: Bon. }\n';
  for (const [f, t] of [['styles.css', css0], ['template.html', tpl0], ['manifest.yaml', man0], ['fixtures/simple.yaml', 'items:\n  - { text: Bon., rating: 4 }\n']]) await fs.writeFile(path.join(cdir, f), t);
  r = run('check', fournil0);
  ok('format html et format langage côte à côte : valides, sans avertissement', r.code === 0 && lines(r.out).find(x => x.ok)?.warnings === 0, r.out.slice(-300));
  const expectCheck = async (file, content, re, label, code = 1) => { await fs.writeFile(path.join(cdir, file), content); const x = run('check', fournil0); ok(label, x.code === code && re.test(x.out), x.out.slice(0, 300)); };
  await expectCheck('styles.css', css0 + 'h2{color:var(--color-fg)}\n', /E_CSS.*sélecteur « h2 » hors du composant/, 'CSS : sélecteur hors du composant → E_CSS');
  await expectCheck('styles.css', css0 + ':root{--x:1}\n', /E_CSS.*sélecteur global/, 'CSS : sélecteur global → E_CSS');
  await expectCheck('styles.css', css0 + '.avis-html-bg{background:url(https://cdn.exemple.fr/x.png)}\n', /E_CSS.*ressource externe/, 'CSS : ressource externe → E_CSS');
  await expectCheck('styles.css', css0 + '.avis-html-x{color:#ff0000}\n', /W_CSS.*couleur écrite en dur/, 'CSS : couleur en dur → avertissement W_CSS', 0);
  await fs.writeFile(path.join(cdir, 'styles.css'), css0);
  await expectCheck('manifest.yaml', man0.replace('behaviors: [carousel]\n', ''), /E_BEHAVIOR.*carousel sans le déclarer/, 'comportements : attributs posés sans déclaration → E_BEHAVIOR');
  await expectCheck('manifest.yaml', man0.replace('behaviors: [carousel]', 'behaviors: [carousel, carousell]'), /E_ENUM.*Comportement inconnu : carousell/, 'comportements : nom inconnu → E_ENUM avec suggestion');
  await expectCheck('manifest.yaml', man0.replace('behaviors: [carousel]', 'behaviors: [carousel, tabs]'), /W_BEHAVIOR.*déclare tabs/, 'comportements : déclaré mais inutilisé → W_BEHAVIOR', 0);
  await fs.writeFile(path.join(cdir, 'manifest.yaml'), man0);
  await expectCheck('template.html', tpl0 + '<script>alert(1)</script>\n', /E_TEMPLATE.*<script> interdit/, 'gabarit : <script> → E_TEMPLATE');
  await expectCheck('template.html', tpl0.replace('<button type="button" class="avis-html-nav" data-sl-prev>', '<button type="button" class="avis-html-nav" data-sl-prev onclick="x()">'), /E_TEMPLATE.*attribut d'événement/, 'gabarit : onclick= → E_TEMPLATE');
  await fs.writeFile(path.join(cdir, 'template.html'), tpl0);
  await fs.writeFile(path.join(cdir, 'module.js'), 'console.log(1);');
  r = run('check', fournil0);
  ok('module.js libre → avertissement W_MODULE_JS', r.code === 0 && /W_MODULE_JS/.test(r.out));
  await fs.rm(path.join(cdir, 'module.js'));
  r = run('build', fournil0, '--out', path.join(tmp, 'fournil-dist'));
  const sitejs = await fs.readFile(path.join(tmp, 'fournil-dist', 'assets', 'site.js'), 'utf8');
  ok('comportements : seul le code du comportement utilisé est inclus', r.code === 0 && /comportements déclarés : carousel/.test(sitejs) && !/data-sl-tabs/.test(sitejs));

  // --- Générateur : boucle de réparation avec un modèle simulé (sans clé d'API)
  const gen = await import(pathToFileURL(path.join(ROOT, 'src', 'component-gen.js')).href);
  const { loadCatalog } = await import(pathToFileURL(path.join(ROOT, 'src', 'catalog.js')).href);
  const catalog = await loadCatalog();
  const ldir = path.join(ROOT, 'scripts', 'reference', 'exemples-yaml', 'le-fournil', 'components', 'avis-defilants');
  const manL = await fs.readFile(path.join(ldir, 'manifest.yaml'), 'utf8');
  const good = { manifest: manL, fixtures: [{ name: 'complet', yaml: await fs.readFile(path.join(ldir, 'fixtures', 'complet.yaml'), 'utf8') }, { name: 'minimal', yaml: await fs.readFile(path.join(ldir, 'fixtures', 'minimal.yaml'), 'utf8') }], notes: 'ok' };
  // Mauvais jet typique : un champ mal nommé dans la forme, une intention mal orthographiée dans l'apparence.
  const bad = { ...good, manifest: manL.replace('          - signature: author, date, en toutes lettres', '          - signature: auteur, date, en toutes lettres').replace("étoiles: couleur d'accent", "étoiles: couleur d'acent"), notes: 'premier jet' };
  const site2 = await copy('scripts/reference/exemples-yaml/le-fournil', 'fournil-gen');
  await fs.rm(path.join(site2, 'components', 'avis-defilants'), { recursive: true });
  await fs.writeFile(path.join(site2, 'pages', 'accueil.page.yaml'), (await fs.readFile(path.join(ROOT, 'scripts', 'reference', 'exemples-yaml', 'le-fournil', 'pages', 'accueil.page.yaml'), 'utf8')).replace('  - avis-defilants:', '  - testimonials:').replace(/        - text: /g, '        - quote: '));
  const prompts = [];
  let res = await gen.generateComponent({ root: site2, name: 'avis-defilants', description: 'Un carrousel d\'avis clients.', catalog, rounds: 3, ask: async (system, user, round) => { prompts.push({ system, user }); return JSON.stringify(round === 1 ? bad : good); } });
  ok('générateur : premier jet refusé, réparé au deuxième tour', res.ok && res.rounds === 2, JSON.stringify({ ok: res.ok, rounds: res.rounds, problems: res.problems }));
  ok('générateur : le prompt de réparation cite les problèmes (donnée inconnue avec suggestion, intention mal écrite) et les fichiers précédents', /« auteur » n'est pas une donnée.*vouliez-vous dire « author »/.test(prompts[1]?.user || '') && /intention inconnue « couleur d'acent »/.test(prompts[1]?.user || '') && /## Fichiers précédents/.test(prompts[1]?.user || ''));
  ok('générateur : le guide du format langage vient du code (types, primitives, intentions, natifs en forme)', /défilement : carrousel/.test(prompts[0]?.system || '') && /nombre entier/.test(prompts[0]?.system || '') && /coins arrondis/.test(prompts[0]?.system || '') && /- grille de items, colonnes columns par défaut 3 :/.test(prompts[0]?.system || '') && !/template\.html :/.test(prompts[0]?.system || ''));
  ok('générateur : aucun gabarit ni feuille écrits au format langage', !(await fs.readdir(path.join(site2, 'components', 'avis-defilants'))).some(f => f === 'template.html' || f === 'styles.css'));
  const written = await fs.readdir(path.join(site2, 'components', 'avis-defilants', 'fixtures'));
  ok('générateur : description.md, cas de test et instantanés écrits', written.includes('complet.html') && (await fs.readFile(path.join(site2, 'components', 'avis-defilants', 'description.md'), 'utf8')).includes('Un carrousel d\'avis clients.'));
  res = await gen.generateComponent({ root: site2, name: 'avis-defilants', description: 'x', catalog, rounds: 2, ask: async (s2, u, round) => round === 1 ? 'Voici le composant : pas de JSON' : JSON.stringify(good) });
  ok('générateur : réponse sans JSON → nouveau tour', res.ok && res.rounds === 2);
  res = await gen.generateComponent({ root: site2, name: 'avis-defilants', description: 'x', catalog, rounds: 2, ask: async () => JSON.stringify(bad) });
  ok('générateur : toujours faux → échec après le nombre de tours, problèmes rendus', !res.ok && res.rounds === 2 && res.problems.some(p => /auteur/.test(p.message)));
  const htmlPrompts = [];
  res = await gen.generateComponent({ root: site2, name: 'avis-html2', description: 'x', catalog, rounds: 1, format: 'html', ask: async (system) => { htmlPrompts.push(system); return JSON.stringify({ manifest: man0.replace('name: avis-html', 'name: avis-html2'), template: tpl0.replace(/avis-html/g, 'avis-html2'), styles: css0.replace(/avis-html/g, 'avis-html2'), fixtures: [{ name: 'simple', yaml: 'items:\n  - { text: Bon. }\n' }], notes: '' }); } });
  ok('générateur --format html : guide html, gabarit et feuille écrits et vérifiés', res.ok && /template\.html \(gabarit neutre\)/.test(htmlPrompts[0] || '') && (await fs.readdir(path.join(site2, 'components', 'avis-html2'))).includes('template.html'), JSON.stringify(res.problems));
  r = run('component', 'new', site2, 'autre-bloc', '--describe', 'Un bloc simple.', '--export', path.join(tmp, 'p.json'));
  const exported = JSON.parse(await fs.readFile(path.join(tmp, 'p.json'), 'utf8'));
  ok('générateur sans clé : --export écrit system, user et schéma de sortie', r.code === 0 && exported.system && /Nom du composant : autre-bloc/.test(exported.user) && exported.output_schema?.required?.includes('composant') && !exported.output_schema?.required?.includes('manifest') && !exported.output_schema?.required?.includes('template') && exported.format === 'langage');
  await fs.writeFile(path.join(tmp, 'r.json'), JSON.stringify(bad));
  await fs.rm(path.join(site2, 'components', 'avis-defilants'), { recursive: true });
  r = run('component', 'new', site2, 'avis-defilants', '--import', path.join(tmp, 'r.json'), '--export', path.join(tmp, 'rep.json'));
  ok('générateur sans clé : --import d\'une réponse fautive → code 1 et prompt de réparation', r.code === 1 && /prompt de réparation écrit/.test(r.out) && /Ta proposition précédente/.test(JSON.parse(await fs.readFile(path.join(tmp, 'rep.json'), 'utf8')).user));

  // --- Modification en langage naturel, génération dans un paquet, aperçu
  const site3 = await copy('scripts/reference/exemples-yaml/le-fournil', 'fournil-edit');
  const before3 = await fs.readFile(path.join(site3, 'components', 'avis-defilants', 'manifest.yaml'), 'utf8');
  const edited = { ...good, manifest: manL.replace("  étoiles: couleur d'accent", "  étoiles: couleur d'accent\n  citations: italique"), notes: 'texte en italique' };
  const editPrompts = [];
  res = await gen.editComponent({ root: site3, name: 'avis-defilants', request: 'Mets le texte des avis en italique.', catalog, rounds: 2, ask: async (system, user) => { editPrompts.push(user); return JSON.stringify(edited); } });
  ok('edit : modification appliquée et vérifiée en un tour', res.ok && res.rounds === 1, JSON.stringify(res.problems));
  ok('edit : le prompt contient le composant actuel et la demande', /# Composant actuel/.test(editPrompts[0] || '') && /# Modification demandée\nMets le texte des avis en italique\./.test(editPrompts[0] || '') && /défilement de items/.test(editPrompts[0] || ''));
  const md3 = await fs.readFile(path.join(site3, 'components', 'avis-defilants', 'description.md'), 'utf8');
  ok('edit : description conservée, demande ajoutée à l\'historique', /Un carrousel d'avis clients/.test(md3) && /## Modifications\n\n- Mets le texte des avis en italique\./.test(md3));
  res = await gen.editComponent({ root: site3, name: 'avis-defilants', request: 'Casse tout.', catalog, rounds: 2, ask: async () => JSON.stringify(bad) });
  const after3 = await fs.readFile(path.join(site3, 'components', 'avis-defilants', 'manifest.yaml'), 'utf8');
  ok('edit : échec après tous les tours → version précédente restaurée', !res.ok && res.restored && after3.includes('citations: italique') && after3 !== before3 && !(await fs.readdir(path.join(site3, 'components'))).some(f => f.startsWith('.sauvegarde-')));
  // --- Générateur au format plan : la réponse est un composant.md et des cas écrits en documents, dans un site en documents
  {
    const pdir = path.join(ROOT, 'examples', 'le-fournil', 'components', 'avis-defilants');
    const rename = t => t.replaceAll('avis-defilants', 'avis-bis');
    const planY = await fs.readFile(path.join(pdir, 'composant.md'), 'utf8');
    const casesY = []; for (const n of ['complet', 'minimal']) casesY.push({ name: n, document: await fs.readFile(path.join(pdir, 'fixtures', n + '.md'), 'utf8') });
    const goodP = { composant: rename(planY), fixtures: casesY.map(c => ({ name: c.name, document: rename(c.document) })), notes: 'ok' };
    const badP = { ...goodP, composant: goodP.composant.replace('- signature : author, date, en toutes lettres', '- signature : auteur, date, en toutes lettres') };
    const site4 = await copy('examples/le-fournil', 'fournil-plan');
    const promptsP = [];
    let rp = await gen.generateComponent({ root: site4, name: 'avis-bis', description: 'Un carrousel d\'avis.', catalog, rounds: 3, ask: async (system, user, round) => { promptsP.push({ system, user }); return JSON.stringify(round === 1 ? badP : goodP); } });
    ok('générateur en plan : premier jet refusé à la ligne de composant.md, réparé au deuxième tour', badP.composant !== goodP.composant && rp.ok && rp.rounds === 2 && /composant\.md › ligne \d+ : .*« auteur » n'est pas une donnée/.test(promptsP[1]?.user || '') && /composant\.md :\n````\n# avis-bis/.test(promptsP[1]?.user || ''), JSON.stringify({ ok: rp.ok, rounds: rp.rounds, problems: rp.problems }) + (promptsP[1]?.user || '').slice(-600));
    const filesP = await fs.readdir(path.join(site4, 'components', 'avis-bis')), casesP = await fs.readdir(path.join(site4, 'components', 'avis-bis', 'fixtures'));
    ok('générateur en plan : composant.md et cas en documents écrits, aucun YAML, instantanés rendus', filesP.includes('composant.md') && !filesP.includes('manifest.yaml') && casesP.includes('complet.md') && casesP.includes('complet.html') && !casesP.some(f => /\.ya?ml$/.test(f)), filesP.join(' ') + ' | ' + casesP.join(' '));
    const sysP = promptsP[0]?.system || '';
    ok('générateur en plan : la consigne demande un plan et des cas en documents, sans manifeste', /composant \(le contenu complet de composant\.md\)/.test(sysP) && !/manifest\.yaml/.test(sysP) && /À la visite :/.test(sysP) && /Dans composant\.md, le titre est « # avis-bis »/.test(promptsP[0]?.user || '') && gen.schemaFor('langage').required.includes('composant') && gen.schemaFor('html').required.includes('manifest'));
    const editedP = { ...goodP, composant: goodP.composant.replace("- étoiles : couleur d'accent", "- étoiles : couleur d'accent\n- citations : italique") };
    const ep = [];
    rp = await gen.editComponent({ root: site4, name: 'avis-bis', request: 'Mets le texte des avis en italique.', catalog, rounds: 1, ask: async (s, u) => { ep.push(u); return JSON.stringify(editedP); } });
    ok('edit en plan : le composant actuel est montré en plan, la modification écrite dans composant.md', editedP.composant !== goodP.composant && rp.ok && /# Composant actuel\ncomposant\.md :\n````\n# avis-bis/.test(ep[0] || '') && /- complet :\n````\n## avis-bis/.test(ep[0] || '') && (await fs.readFile(path.join(site4, 'components', 'avis-bis', 'composant.md'), 'utf8')).includes('- citations : italique'), JSON.stringify(rp.problems) + (ep[0] || '').slice(0, 300));
    // Un composant encore écrit en manifeste : montré en plan au modèle, récrit en plan par sa réponse.
    const site5 = await copy('scripts/reference/exemples-yaml/le-fournil', 'fournil-edit-plan');
    const ep2 = [];
    rp = await gen.editComponent({ root: site5, name: 'avis-defilants', request: 'Ne change rien.', catalog, rounds: 1, ask: async (s, u) => { ep2.push(u); return JSON.stringify({ composant: planY, fixtures: casesY, notes: '' }); } });
    const d5 = await fs.readdir(path.join(site5, 'components', 'avis-defilants'));
    ok('edit d\'un composant en manifeste : montré en plan au modèle, récrit en composant.md', rp.ok && /composant\.md :\n````\n# avis-defilants/.test(ep2[0] || '') && !/manifest\.yaml :/.test(ep2[0] || '') && /````\n## avis-defilants/.test(ep2[0] || '') && d5.includes('composant.md') && !d5.includes('manifest.yaml'), JSON.stringify(rp.problems) + d5.join(' ') + (ep2[0] || '').slice(0, 300));
    r = run('check', site5);
    ok('edit d\'un composant en manifeste : le site en YAML reste valide avec son composant en plan', r.code === 0, r.out.slice(0, 300));
    // Les exemples que la consigne donne au modèle sont compilés ici : un exemple faux enseignerait une erreur.
    const site6 = path.join(tmp, 'consigne'); r = run('init', site6, '--no-git', '--local');
    await fs.mkdir(path.join(site6, 'components', 'avis-defilants', 'fixtures'), { recursive: true }); await fs.mkdir(path.join(site6, 'components', 'devis-express'), { recursive: true });
    await fs.writeFile(path.join(site6, 'components', 'avis-defilants', 'composant.md'), gen.EXAMPLE_PLAN + '\n');
    for (const f of gen.EXAMPLE_PLAN_FIXTURES) await fs.writeFile(path.join(site6, 'components', 'avis-defilants', 'fixtures', f.name + '.md'), f.document + '\n');
    await fs.writeFile(path.join(site6, 'components', 'devis-express', 'composant.md'), gen.EXAMPLE_PLAN_FORM + '\n');
    const t6 = run('test', site6);
    ok('générateur en plan : les exemples de la consigne se compilent et leurs cas se rendent', r.code === 0 && t6.code === 0 && /avis-defilants › complet/.test(t6.out) && /avis-defilants › minimal/.test(t6.out) && /devis-express › exemple/.test(t6.out) && /"failed":0/.test(t6.out), t6.out.slice(-500));
    const site7 = await copy('examples/savonnerie', 'savon-consigne');
    await fs.writeFile(path.join(site7, 'components', 'selection', 'fixtures', 'consigne.md'), gen.EXAMPLE_PLAN_VISIT.document + '\n');
    const t7 = run('test', site7, '--only', 'selection');
    ok('générateur en plan : le cas « à la visite » de la consigne (une liste) se lit et se rend', t7.code === 0 && /NEW  selection › consigne/.test(t7.out) && !/yaml/.test(gen.EXAMPLE_PLAN_VISIT.document), t7.out.slice(-400));
    const site8 = await copy('examples/le-fournil', 'fournil-consigne');
    await fs.writeFile(path.join(site8, 'components', 'atelier', 'fixtures', 'consigne.md'), gen.EXAMPLE_PLAN_VISIT_GROUP.document + '\n');
    const t8 = run('test', site8, '--only', 'atelier');
    ok('générateur en plan : le cas « à la visite » de la consigne (un groupe et sa liste) se lit et se rend', t8.code === 0 && /NEW  atelier › consigne/.test(t8.out), t8.out.slice(-400));
  }

  const garnier3 = await copy('scripts/reference/exemples-yaml/garnier-associes', 'garnier-gen');
  await copy('scripts/reference/exemples-yaml/paquets', 'paquets-gen');
  await fs.writeFile(path.join(garnier3, 'site.yaml'), (await fs.readFile(path.join(garnier3, 'site.yaml'), 'utf8')).replace('../paquets/vitrine', '../paquets-gen/vitrine'));
  const pkgGood = { manifest: 'name: alerte\ndescription: "Bandeau d\'alerte : un titre et un texte."\nprops:\n  type: object\n  required: [title]\n  properties:\n    title: { type: string }\n    text: { type: string }\nexample: |\n  - vitrine.alerte:\n      title: Fermé le 15 août\nintents: [alerte, fermeture]\n', template: '<section class="section alerte">\n  <div class="container"><div class="alerte-box"><strong>{{ p.title }}</strong>{% if p.text %} {{ p.text }}{% endif %}</div></div>\n</section>\n', styles: '.alerte-box{padding:14px 18px;border-radius:var(--radius);background:var(--color-surface);border-left:5px solid var(--color-warning)}\n', fixtures: [{ name: 'simple', yaml: 'title: Fermé le 15 août\ntext: Réouverture le 16.\n' }], notes: '' };
  const pkgPrompts = [];
  res = await gen.generateComponent({ root: garnier3, name: 'alerte', description: 'Un bandeau d\'alerte.', catalog, pkg: '../paquets-gen/vitrine', rounds: 1, ask: async (s3, user) => { pkgPrompts.push(user); return JSON.stringify(pkgGood); } });
  ok('paquet : composant généré dans le paquet, exposé vitrine.alerte', res.ok && res.target?.name === 'vitrine.alerte' && (await fs.readFile(path.join(tmp, 'paquets-gen', 'vitrine', 'components', 'alerte', 'template.html'), 'utf8')).includes('alerte-box'), JSON.stringify(res.problems));
  ok('paquet : le prompt donne le nom court au manifeste et le nom préfixé aux pages', /le titre est « # alerte » \(nom court\)/.test(pkgPrompts[0] || '') && /« ## vitrine\.alerte »/.test(pkgPrompts[0] || ''), (pkgPrompts[0] || '').slice(-400));
  r = run('component', 'preview', site3, 'avis-defilants');
  const pv = await fs.readFile(path.join(site3, '.devanture', 'preview', 'avis-defilants.html'), 'utf8').catch(() => '');
  ok('preview : page d\'aperçu (cas rendus, thèmes, comportement, assets en relatif)', r.code === 0 && (pv.match(/class="pv-case"/g) || []).length === good.fixtures.length && /data-pv-theme="sombre"/.test(pv) && /comportements déclarés : carousel/.test(pv) && !/src="\/assets\//.test(pv), r.out.slice(0, 300));
  r = run('component', 'preview', garnier3, 'alerte', '--package', '../paquets-gen/vitrine');
  ok('preview : composant de paquet', r.code === 0 && /vitrine\.alerte\.html \(1 cas\)/.test(r.out), r.out.slice(0, 300));

  // --- Fonctionnement en français, primitives à comportement, erreurs à la ligne du manifeste, component show
  const pm = await copy('scripts/reference/exemples-yaml/plomberie-martin', 'pm-fonct');
  const devis = path.join(pm, 'components', 'devis-express', 'manifest.yaml');
  const devis0 = await fs.readFile(devis, 'utf8');
  const lineIn = (text, needle) => text.split(/\r?\n/).findIndex(l => l.includes(needle)) + 1;
  const withDevis = async (from, to) => { await fs.writeFile(devis, devis0.replace(from, to)); const x = run('check', pm); await fs.writeFile(devis, devis0); return { ...x, errs: lines(x.out).filter(e => e.code && !e.level) }; };
  r = run('component', 'show', pm, 'devis-express', '--json');
  const shown = (() => { try { return JSON.parse(r.out); } catch { return null; } })();
  const fb = shown?.blocks?.find(b => b.key === 'fonctionnement');
  ok('fonctionnement : compilé vers les effets (registre, e-mail, champs typés, choix, exemple affiché)', r.code === 0 && /store: devis/.test(fb?.output || '') && /notify: true/.test(fb?.output || '') && /name: type_travaux, label: Type de travaux, type: select, required: true, options: \[ Fuite ou dépannage/.test(fb?.output || '') && /name: details, label: Précisions, type: textarea, required: false, placeholder:/.test(fb?.output || '') && /name: name, label: Nom, type: text, required: true/.test(fb?.output || ''), r.out.slice(0, 300));
  ok('component show --json : chaque bloc avec ses lignes dans le manifeste', shown?.format === 'langage' && fb?.source?.from === lineIn(devis0, 'fonctionnement:') && shown.blocks.find(b => b.key === 'forme')?.source?.from === lineIn(devis0, 'forme:') && shown.blocks.map(b => b.key).join() === 'données,fonctionnement,forme,apparence', JSON.stringify(shown?.blocks?.map(b => [b.key, b.source?.from])));
  let x = await withDevis('prévient par e-mail: oui', 'previen par mail: oui');
  ok('fonctionnement : réglage inconnu → suggestion et ligne du manifeste', x.code === 1 && x.errs.length === 1 && x.errs[0].path === `ligne ${lineIn(devis0, 'prévient par e-mail')}` && /vouliez-vous dire « prévient par e-mail » \?/.test(x.errs[0].message), x.out.slice(0, 300));
  x = await withDevis('enregistre dans: devis', 'enregistre dans: orders');
  ok('fonctionnement : registre réservé refusé, une seule erreur', x.code === 1 && x.errs.length === 1 && /orders est un registre réservé/.test(x.errs[0].message), x.out.slice(0, 400));
  x = await withDevis('details: texte long, facultatif', 'precision: texte, si type_travau vaut Autre — Précisez\n      details: texte long, facultatif');
  ok('fonctionnement : « si … vaut … » sur un champ inconnu → suggestion', x.code === 1 && /type_travau n'est pas un champ déclaré plus haut ; vouliez-vous dire « type_travaux » \?$/.test(x.errs[0]?.message || ''), x.out.slice(0, 300));
  x = await withDevis('details: texte long, facultatif', 'precision: texte, si type_travaux vaut Piscine — Précisez\n      details: texte long, facultatif');
  ok('fonctionnement : « si … vaut … » avec une valeur hors du choix refusée', x.code === 1 && /Piscine n'est pas une valeur de type_travaux/.test(x.errs[0]?.message || ''), x.out.slice(0, 300));
  x = await withDevis('details: texte long, facultatif', 'precision: texte, si type_travaux vaut Autre — Précisez\n      details: texte long, facultatif');
  ok('fonctionnement : champ conditionnel accepté', x.code === 0, x.out.slice(0, 300));
  x = await withDevis('phone: facultatif', 'phone: facultatif, grand');
  ok('fonctionnement : précision inconnue → vocabulaire rappelé', x.code === 1 && /« grand » n'est ni un type de champ \(texte, texte long, e-mail/.test(x.errs[0]?.message || ''), x.out.slice(0, 300));
  x = await withDevis('fonctionnement:', 'effects: { form: { store: x, fields: [name] } }\nfonctionnement:');
  ok('fonctionnement et effects à la fois refusés', x.code === 1 && x.errs.some(e => /effects et fonctionnement à la fois/.test(e.message)), x.out.slice(0, 300));
  x = await withDevis('    - formulaire, bouton Demander un devis\n', '');
  ok('formulaire déclaré mais absent de la forme → erreur dans manifest.yaml, à la ligne de la forme', x.code === 1 && x.errs.length === 1 && /manifest\.yaml$/.test(x.errs[0].file) && x.errs[0].path === `ligne ${lineIn(devis0, 'forme:')}` && /rien ne l'affiche/.test(x.errs[0].message), x.out.slice(0, 400));
  x = await withDevis('    - formulaire, bouton Demander un devis\n', '    - formulaire, bouton Demander un devis:\n        - champ: nom\n');
  ok('forme : « champ: » inconnu du formulaire → suggestion', x.code === 1 && /champ inconnu « nom »/.test(x.errs[0]?.message || '') && /vouliez-vous dire « name »/.test(x.errs[0]?.message || ''), x.out.slice(0, 300));
  r = run('build', pm, '--out', path.join(tmp, 'pm-dist'));
  const devisPhp = await fs.readFile(path.join(tmp, 'pm-dist', 'components', 'devis-express.php'), 'utf8').catch(() => '');
  ok('fonctionnement : compilation, formulaire rendu par le gabarit produit', r.code === 0 && /sl_form_open|sl_fn_field|sl_field/.test(devisPhp) && /Demander un devis/.test(devisPhp), r.out.slice(-300) + devisPhp.slice(0, 200));

  const lf = await copy('scripts/reference/exemples-yaml/le-fournil', 'lf-prim');
  const comptoir = path.join(lf, 'components', 'comptoir', 'manifest.yaml');
  const comptoir0 = await fs.readFile(comptoir, 'utf8');
  const withComptoir = async (from, to) => { await fs.writeFile(comptoir, comptoir0.replace(from, to)); const y = run('check', lf); await fs.writeFile(comptoir, comptoir0); return { ...y, errs: lines(y.out).filter(e => e.code && !e.level) }; };
  r = run('component', 'show', lf, 'comptoir');
  ok('component show : blocs, lignes, gabarit et feuille produits', r.code === 0 && /== données → schéma JSON des props/.test(r.out) && /== forme → gabarit neutre/.test(r.out) && /manifest\.yaml, lignes \d+ à \d+ :/.test(r.out) && /data-sl-filters/.test(r.out) && /== apparence → feuille/.test(r.out) && /\.comptoir \.comptoir-carte\{padding:/.test(r.out), r.out.slice(0, 300));
  ok('primitives : filtres, image agrandissable, repli et copier posent leurs comportements sans les déclarer', /comportements ajoutés : filter, lightbox, copy/.test(r.out) && /data-sl-filter-item="\{\{ it1\.category \| slug \}\}"/.test(r.out) && /<a href="\{\{ img_src\(it1\.image, 1600\) \}\}" data-sl-lightbox>/.test(r.out) && /<details class="comptoir-repli"><summary>En savoir plus<\/summary>/.test(r.out) && /data-sl-copy="\{\{ p\.phone \}\}">Copier le numéro</.test(r.out), r.out.slice(0, 200));
  r = run('component', 'show', lf, 'comptoir', '--php');
  ok('component show --php : le PHP exécuté par le serveur', r.code === 0 && /== PHP compilé/.test(r.out) && /<\?php \/\* comptoir — compilé depuis template\.html par sitec \*\//.test(r.out));
  r = run('component', 'show', lf, 'team');
  ok('component show : natif écrit dans le langage (portrait : photo ronde ou initiale)', r.code === 0 && /composant natif/.test(r.out) && /\{% if it1\.photo %\}<div class="team-avatar">/.test(r.out) && /team-avatar-initiale" aria-hidden="true">\{\{ it1\.name \| trim \| first \| upper \}\}/.test(r.out), r.out.slice(0, 200));
  r = run('explain', 'custom');
  ok('la porte de sortie custom n\'est plus un composant du catalogue', r.code === 1 && /Composant inconnu : custom/.test(r.out));
  r = run('component', 'show', lf, 'products.grid');
  ok('component show : un natif de boutique montre ce qu\'il lit à la visite et ce que la cible reçoit', r.code === 0 && /lectures à la visite/.test(r.out) && /produits ← produits de la boutique \(category: p\.filter\.category, featured: p\.filter\.featured, sort: p\.sort, limit: p\.limit\)/.test(r.out) && /sl_source\(\$p, 'produits', 'products'/.test(r.out) && /n'est pas servie depuis le cache statique/.test(r.out), r.out.slice(0, 300));
  r = run('component', 'show', path.join(ROOT, 'scripts', 'reference', 'exemples-yaml', 'garnier-associes'), 'vitrine.encart');
  ok('component show : composant au format html, rien de produit pour la structure', r.code === 0 && /format html, paquet/.test(r.out) && /le fichier est la source/.test(r.out), r.out.slice(0, 200));
  r = run('component', 'show', lf, 'inconnu');
  ok('component show : composant introuvable → code 1', r.code === 1 && /Composant introuvable ou en erreur : inconnu/.test(r.out));
  let y = await withComptoir('filtres de items, selon category', 'filtres de items, selon categorie');
  ok('forme : filtres sur un champ inconnu → erreur à la ligne', y.code === 1 && y.errs[0]?.path === `ligne ${lineIn(comptoir0, 'filtres de items')}` && /categorie/.test(y.errs[0]?.message || ''), y.out.slice(0, 400));
  y = await withComptoir('- repli, libellé « En savoir plus »:', '- replis, libellé « En savoir plus »:');
  ok('forme : primitive inconnue → suggestion et ligne', y.code === 1 && y.errs[0]?.path === `ligne ${lineIn(comptoir0, '- repli, libellé')}` && /repli/.test(y.errs[0]?.message || ''), y.out.slice(0, 400));
  y = await withComptoir('  cartes: compactes', '  cartes: compactes\n  replis: bordur');
  ok('apparence : intention inconnue → suggestion et ligne', y.code === 1 && y.errs[0]?.path === `ligne ${lineIn(comptoir0, '  cartes: compactes') + 1}` && /vouliez-vous dire « bordure »/.test(y.errs[0]?.message || ''), y.out.slice(0, 400));
  r = run('build', lf, '--out', path.join(tmp, 'lf-dist'));
  const lfCss = await fs.readFile(path.join(tmp, 'lf-dist', 'assets', 'site.css'), 'utf8').catch(() => '');
  const lfAssets = await fs.readdir(path.join(tmp, 'lf-dist', 'assets')).catch(() => []);
  const lfJs = (await Promise.all(lfAssets.filter(f => f.endsWith('.js')).map(f => fs.readFile(path.join(tmp, 'lf-dist', 'assets', f), 'utf8')))).join('\n');
  ok('primitives : compilation, feuille de base dans site.css, comportements filter, lightbox et copy dans le script du site', r.code === 0 && lfCss.includes('.comptoir .comptoir-filtre-grille{grid-template-columns:repeat(auto-fill,minmax(200px,1fr))}') && /data-sl-filters/.test(lfJs) && /data-sl-lightbox/.test(lfJs) && /data-sl-copy/.test(lfJs), r.out.slice(-300));
  r = run('component', 'new', lf, 'essai-forme', '--describe', 'Un formulaire de réservation.', '--export', path.join(tmp, 'pf.json'));
  const sysF = JSON.parse(await fs.readFile(path.join(tmp, 'pf.json'), 'utf8')).system || '';
  ok('générateur : le guide enseigne fonctionnement (réglages, types de champ) et les primitives à comportement', /# ## Fonctionnement › formulaire/.test(sysF) && /enregistre dans, prévient par e-mail/.test(sysF) && /si <champ> vaut <valeur>/.test(sysF) && !/effects\.form/.test(sysF) && /- filtres : /.test(sysF) && /- portrait : /.test(sysF) && /- repli : /.test(sysF) && /- copier : /.test(sysF));

  // --- expériences : objectifs, bras, groupe témoin (segments.yaml)
  {
    const xp = await copy('scripts/reference/exemples-yaml/plomberie-martin', 'xp');
    const segFile = path.join(xp, 'segments.yaml'); const seg0 = await fs.readFile(segFile, 'utf8');
    const withSeg = async (from, to) => { if (!seg0.includes(from)) return { code: -1, errs: [], out: 'introuvable : ' + from }; await fs.writeFile(segFile, seg0.replace(from, () => to)); const y = run('check', xp); await fs.writeFile(segFile, seg0); return { ...y, errs: lines(y.out).filter(e => e.code && !e.level) }; };
    const has = (y, code, at) => y.code === 1 && y.errs.some(e => e.code === code && (!at || e.path === at));
    let y = await withSeg('accroche: { goal: appel,', 'accroche: { goal: appels,');
    ok('expérience : objectif inconnu → erreur, suggestion et correction', has(y, 'E_UNKNOWN_GOAL', 'experiments.accroche.goal') && y.errs[0].fix?.set === 'appel', y.out.slice(0, 300));
    y = await withSeg('arms: [prix_annonce] }', 'arms: [recurrent] }');
    ok('expérience : un bras ne porte pas le nom d\'un segment', has(y, 'E_DUPLICATE') && /déjà un segment/.test(y.errs.map(e => e.message).join(' ')), y.out.slice(0, 300));
    y = await withSeg('arms: [prix_annonce] }', 'arms: [prix_annonce], segment: mobile }');
    ok('expérience : arms ou segment, pas les deux', has(y, 'E_SCHEMA', 'experiments.accroche'), y.out.slice(0, 300));
    y = await withSeg('arms: [prix_annonce] }', 'arms: { prix_annonce: 100 } }');
    ok('expérience : des bras à 100 % ne laissent pas de témoin', has(y, 'E_FORMAT', 'experiments.accroche.arms') && /témoin/.test(y.errs[0].message), y.out.slice(0, 300));
    y = await withSeg('arms: [prix_annonce] }', 'arms: [temoin] }');
    ok('expérience : « temoin » est réservé au groupe de base', has(y, 'E_FORBIDDEN'), y.out.slice(0, 300));
    y = await withSeg('arms: [prix_annonce] }', 'arms: [prix_annonce, autre_accroche] }');
    ok('expérience : un bras sans variante dans les pages → rien à mesurer', has(y, 'E_EXPERIMENT_UNUSED', 'experiments.accroche.arms.autre_accroche') && /variants: \{ autre_accroche/.test(y.errs[0].hint || ''), y.out.slice(0, 300));
    y = await withSeg('segment: devis_abandonne, holdout: 20 }', 'segment: devis_abandonne, holdout: 0 }');
    ok('expérience : holdout de 1 à 99', has(y, 'E_FORMAT', 'experiments.relance.holdout'), y.out.slice(0, 300));
    y = await withSeg('holdout: 20 }', 'holdout: 20, minimum: 5 }');
    ok('expérience : minimum d\'au moins 20 visiteurs par groupe', has(y, 'E_FORMAT', 'experiments.relance.minimum'), y.out.slice(0, 300));
    y = await withSeg('devis: { event: form_sent, where: { form: contact } }', 'devis: { event: form_sent, where: { to: /contact } }');
    ok('objectif : where limité à ce que l\'événement transporte', has(y, 'E_UNKNOWN_PROP', 'goals.devis.where.to'), y.out.slice(0, 300));
    y = await withSeg('appel: { event: click_cta,', 'appel: { event: clic_cta,');
    ok('objectif : événement inconnu → suggestion', has(y, 'E_ENUM', 'goals.appel.event') && y.errs.find(e => e.code === 'E_ENUM').fix?.set === 'click_cta', y.out.slice(0, 300));

    // empreinte : stable d'une compilation à l'autre, liée au contenu comparé
    const sigs = async out => { const r = run('build', xp, '--out', out); const all = (await Promise.all((await fs.readdir(out, { recursive: true })).filter(n => n.endsWith('.php')).map(n => fs.readFile(path.join(out, n), 'utf8')))).join('\n'); const g = k => new RegExp("'" + k + "' => (?:array \\(|\\[)[\\s\\S]*?'sig' => '([0-9a-f]{8})'").exec(all)?.[1]; return { code: r.code, accroche: g('accroche'), relance: g('relance'), all }; };
    const s1 = await sigs(path.join(tmp, 'xp-1')); const s2 = await sigs(path.join(tmp, 'xp-2'));
    ok('empreinte d\'expérience : identique d\'une compilation à l\'autre', s1.code === 0 && !!s1.accroche && !!s1.relance && s1.accroche === s2.accroche && s1.relance === s2.relance, JSON.stringify([s1.accroche, s1.relance, s2.accroche, s2.relance]));
    const pageFile = path.join(xp, 'pages', 'accueil.page.yaml'); const page0 = await fs.readFile(pageFile, 'utf8');
    await fs.writeFile(pageFile, page0.replace('title: Dépannage à Lyon à partir de 95 € TTC', 'title: Dépannage à partir de 95 € TTC à Lyon'));
    const s3 = await sigs(path.join(tmp, 'xp-3'));
    ok('empreinte : changer la variante d\'un bras change la sienne, pas celle de l\'autre expérience', s3.code === 0 && s3.accroche !== s1.accroche && s3.relance === s1.relance, JSON.stringify([s3.accroche, s3.relance]));
    await fs.writeFile(pageFile, page0);
    await fs.writeFile(segFile, seg0.replace('holdout: 20 }', 'holdout: 30 }'));
    const s4 = await sigs(path.join(tmp, 'xp-4'));
    ok('empreinte : changer la définition (part du témoin) ouvre une nouvelle mesure', s4.code === 0 && s4.relance !== s1.relance && s4.accroche === s1.accroche, JSON.stringify([s4.accroche, s4.relance]));
    await fs.writeFile(segFile, seg0);
    // sans expérience : rien de plus dans le site compilé
    await fs.writeFile(segFile, seg0.slice(0, seg0.indexOf('# Ce qu')).replace('devis_abandonne, prix_annonce,', 'devis_abandonne,'));
    await fs.writeFile(pageFile, page0.replace(/\n +prix_annonce:\n +title: [^\n]+\n +subtitle: [^\n]+/, ''));
    const s5 = await sigs(path.join(tmp, 'xp-5'));
    ok('site sans expérience : ni objectifs, ni expériences, ni marqueur dans le site compilé', s5.code === 0 && !s5.accroche && !/'experiments' =>/.test(s5.all) && !/'goals' =>/.test(s5.all), s5.all.match(/'(experiments|goals)' =>.{0,80}/)?.[0] || '');
    await fs.writeFile(segFile, seg0); await fs.writeFile(pageFile, page0);
  }

  // --- vocabulaire : des mots nouveaux pour la forme, définis hors du compilateur (site, paquet, natif)
  {
    const voc = await copy('scripts/reference/exemples-yaml/le-fournil', 'voc');
    const vf = path.join(voc, 'vocabulaire.yaml'), v0 = await fs.readFile(vf, 'utf8');
    const mf = path.join(voc, 'components', 'comptoir', 'manifest.yaml'), m0 = await fs.readFile(mf, 'utf8');
    const chk = dir => { const x = run('check', dir); return { code: x.code, out: x.out, errs: lines(x.out).filter(e => e.code && !e.code.startsWith('W_')) }; };
    const withVoc = async text => { await fs.writeFile(vf, text); const x = chk(voc); await fs.writeFile(vf, v0); return x; };
    const withMan = async (from, to) => { if (!m0.includes(from)) throw new Error('ancre absente du manifeste : ' + from); await fs.writeFile(mf, m0.replace(from, to)); const x = chk(voc); await fs.writeFile(mf, m0); return x; };
    const word = (x, re, line) => x.code === 1 && x.errs.some(e => e.code === 'E_WORD' && e.file === 'vocabulaire.yaml' && re.test(e.message) && (!line || e.path === 'ligne ' + line));
    const call = (x, re, line) => x.code === 1 && x.errs.some(e => e.code === 'E_COMPONENT' && re.test(e.message) && (!line || e.path === 'ligne ' + line));
    const once = x => x.errs.length === 1; // l'erreur est dite une fois, à l'endroit où elle se corrige

    let v = chk(voc);
    ok('vocabulaire : site avec des mots à lui valide', v.code === 0 && v.errs.length === 0, v.out.slice(0, 300));
    r = run('catalog', voc);
    ok('vocabulaire : catalogue liste les mots du site et les mots natifs, avec leurs données', /^sortie du four: heure .*\[mot du site, vocabulaire\.yaml\]/m.test(r.out) && /^ligne de tarif: nom, prix, .*\[mot natif\]/m.test(r.out), r.out.slice(-600));
    r = run('explain', 'sortie du four', voc);
    ok('vocabulaire : explain d\'un mot à gabarit montre le fragment, sa ligne et sa feuille', /^# sortie du four \(mot du site/m.test(r.out) && /Défini par un fragment de gabarit \(ligne 13 du vocabulaire\)/.test(r.out) && r.out.includes('<time datetime="{{ heure }}">') && /Sa feuille/.test(r.out) && r.out.includes('.sortie-du-four-point{'), r.out.slice(0, 400));
    r = run('explain', 'commande par téléphone', voc);
    ok('vocabulaire : explain d\'un mot à forme montre la forme', /Défini par une forme, faite de primitives et d'autres mots \(ligne 4 du vocabulaire\)/.test(r.out) && /- copier, libellé « Copier le numéro »: numero/.test(r.out), r.out.slice(0, 400));
    r = run('explain', 'ligne de tarif');
    ok('vocabulaire : explain d\'un mot natif, sans dossier', /^# ligne de tarif \(mot natif\)/m.test(r.out) && /prix \(obligatoire\): string ou number/.test(r.out) && /Défini par un fragment de gabarit/.test(r.out), r.out.slice(0, 300));
    r = run('explain', 'sortie du fou', voc);
    ok('vocabulaire : explain d\'un mot mal écrit → suggestion', r.code === 1 && /Vouliez-vous dire sortie du four/.test(r.out), r.out.slice(0, 200));
    r = run('component', 'show', voc, 'comptoir');
    ok('vocabulaire : le mot est développé dans le gabarit du composant ; donnée obligatoire liée à une donnée facultative → gardé par un si', r.out.includes('{% if it1.baked %}<p class="sortie-du-four">') && r.out.includes('<time datetime="{{ it1.baked }}">') && /mots du vocabulaire employés : sortie du four, commande par téléphone/.test(r.out), r.out.slice(0, 300));
    ok('vocabulaire : un mot à forme apporte ses parties à l\'apparence du composant', /parties que l'apparence peut viser : .*comptoir-commande/.test(r.out) && r.out.includes('.comptoir .comptoir-commande{'), '');
    r = run('build', voc, '--out', path.join(tmp, 'voc-dist'));
    const vcss = await fs.readFile(path.join(tmp, 'voc-dist', 'assets', 'site.css'), 'utf8').catch(() => '');
    const vphp = await fs.readFile(path.join(tmp, 'voc-dist', 'components', 'comptoir.php'), 'utf8').catch(() => '');
    ok('vocabulaire : compilation, feuille du mot une seule fois dans site.css, balisage du mot dans le composant compilé', r.code === 0 && vcss.split('/* mot : sortie du four */').length === 2 && vcss.includes('.sortie-du-four-point{') && vphp.includes('<time datetime="'), r.out.slice(-300));
    ok('vocabulaire : la feuille d\'un mot natif n\'entre dans site.css que s\'il sert', !vcss.includes('/* mot : ligne de tarif */') && !vcss.includes('/* mot : carte à la demande */') && !vcss.includes('.pricelist-item'), '');

    // définition d'un mot : erreurs à la ligne du vocabulaire
    v = await withVoc(v0 + '\n  titre:\n    description: Un titre à nous.\n    forme:\n      - texte: « a »\n');
    ok('mot : le nom d\'une primitive est refusé (E_WORD, ligne)', word(v, /c'est déjà une primitive/, 23) && once(v), v.out.slice(0, 300));
    v = await withVoc(v0 + '\n  ligne de tarif:\n    description: La nôtre.\n    forme:\n      - texte: « a »\n');
    ok('mot : un vocabulaire ajoute des mots, il ne redéfinit pas un mot natif', word(v, /existe déjà dans le langage/, 23), v.out.slice(0, 300));
    v = await withVoc(v0.replace('    description: Un numéro à appeler pour commander, avec un bouton qui le copie.\n', ''));
    ok('mot : description obligatoire ; le composant qui l\'emploie ne répète pas l\'erreur', word(v, /description manquante/, 4) && once(v), v.out.slice(0, 500));
    v = await withVoc(v0 + '\n  duo:\n    description: Deux textes.\n    données:\n      a: texte, facultatif\n      b: texte\n    forme:\n      - texte: a\n      - texte: b\n');
    ok('mot : données obligatoires avant les facultatives', word(v, /donnée « b » : les données obligatoires se déclarent avant/, 25), v.out.slice(0, 300));
    v = await withVoc(v0 + '\n  vide:\n    description: Rien.\n');
    ok('mot : ni forme ni gabarit', word(v, /ni forme ni gabarit/, 23), v.out.slice(0, 300));
    v = await withVoc(v0 + '\n  double:\n    description: Deux.\n    forme:\n      - texte: « a »\n    gabarit: <p>a</p>\n');
    ok('mot : forme et gabarit à la fois', word(v, /forme et gabarit à la fois/, 23), v.out.slice(0, 300));
    v = await withVoc(v0 + '\n  autre:\n    description: Deux.\n    forme:\n      - texte: « a »\n    style: gras\n');
    ok('mot : clé inconnue, à sa ligne', word(v, /clé inconnue « style »/, 27), v.out.slice(0, 300));
    v = await withVoc(v0.replace('- texte: numero', '- texte: numéro'));
    ok('mot : donnée inconnue dans sa forme → suggestion, une seule erreur', word(v, /« numéro » n'est ni une donnée du mot.*vouliez-vous dire « numero »/, 10) && once(v), v.out.slice(0, 500));
    v = await withVoc(v0.replace('datetime="{{ heure }}"', 'datetime="{{ heur }}"'));
    ok('mot : variable inconnue dans son gabarit, à la ligne du fragment', word(v, /« heur » n'est ni une donnée du mot \(heure\)/, 18) && once(v), v.out.slice(0, 500));
    v = await withVoc(v0.replace('</time></p>\n', '</time></p>\n      <script>alert(1)</script>\n'));
    ok('mot : <script> refusé dans un gabarit de mot', word(v, /<script> interdit/, 19) && once(v), v.out.slice(0, 500));
    v = await withVoc(v0.replace('<p class="sortie-du-four">', '<p class="sortie-du-four" onclick="x()">'));
    ok('mot : attribut d\'événement refusé dans un gabarit de mot', word(v, /attribut d'événement \(onclick=…\) interdit/, 18) && once(v), v.out.slice(0, 500));
    v = await withVoc(v0.replace('.sortie-du-four-point{', 'p{margin:0}\n      .sortie-du-four-point{'));
    ok('mot : feuille encadrée, sélecteur hors du mot refusé à sa ligne', word(v, /feuille : sélecteur « p » hors du composant/, 21) && once(v), v.out.slice(0, 500));
    v = await withVoc(v0 + '\n  boucle:\n    description: Tourne.\n    forme:\n      - boucle\n');
    ok('mot : un mot qui s\'emploie lui-même', word(v, /s'emploie lui-même/), v.out.slice(0, 300));
    v = await withVoc(v0 + '\n  cassé: [\n');
    ok('vocabulaire illisible : une erreur, à la ligne, sans cascade dans les composants', word(v, /vocabulaire\.yaml illisible/, 24) && once(v), v.out.slice(0, 500));

    // emploi d'un mot : erreurs à la ligne du manifeste
    v = await withMan('- sortie du four: baked', '- sortie du fou: baked');
    ok('emploi : mot mal écrit → suggestion à la ligne du manifeste, sans la liste des primitives', call(v, /« sortie du fou » ; vouliez-vous dire « sortie du four » \?\.?$/, 21) && once(v), v.out.slice(0, 400));
    v = await withMan('- sortie du four: baked', '- sortie du four: baked, note');
    ok('emploi : trop de données', call(v, /« sortie du four » reçoit 2 données pour 1 déclarée : « sortie du four: heure »/, 21), v.out.slice(0, 400));
    v = await withMan('          - sortie du four: baked', '          - sortie du four');
    ok('emploi : donnée obligatoire absente', call(v, /la donnée « heure » est obligatoire/, 21), v.out.slice(0, 400));
    v = await withMan('          - sortie du four: baked', '          - sortie du four:\n              - texte: note');
    ok('emploi : éléments sous un mot qui n\'en contient pas', call(v, /ne contient pas d'éléments \(sa définition n'emploie pas « contenu »\)/, 21), v.out.slice(0, 400));
    v = await withMan('  - commande par téléphone: phone', '  - commande par téléphone: items');
    ok('emploi : une liste là où le mot attend un texte', call(v, /donnée « numero » : attendu une valeur simple.*reçu une liste/, 25), v.out.slice(0, 400));
    v = await withMan('  - commande par téléphone: phone', '  - contenu');
    ok('emploi : « contenu » hors de la définition d\'un mot', call(v, /« contenu » ne s'emploie que dans la définition d'un mot/, 25), v.out.slice(0, 400));

    // mot conteneur : « contenu » dans sa forme, les éléments de l'appelant dedans
    await fs.writeFile(vf, v0 + '\n  encadré:\n    description: Un cadre avec un titre, autour de ce qu\'on écrit dessous.\n    données:\n      titre: texte, facultatif\n    forme:\n      - bloc « cadre »:\n          - titre: titre\n          - contenu\n');
    await fs.writeFile(mf, m0.replace('  - commande par téléphone: phone', '  - encadré, title:\n      - commande par téléphone: phone'));
    v = chk(voc); r = run('component', 'show', voc, 'comptoir');
    ok('mot conteneur : « mot, donnée: » puis des éléments, placés là où la définition écrit « contenu »', v.code === 0 && /<div class="cadre">[\s\S]*<div class="comptoir-commande">[\s\S]*<\/div>\s*<\/div>/.test(r.out), v.out.slice(0, 300) + r.out.slice(0, 200));
    await fs.writeFile(mf, m0.replace('  - commande par téléphone: phone', '  - encadré: title'));
    v = chk(voc);
    ok('mot conteneur : employé sans éléments → erreur qui montre l\'écriture', call(v, /« encadré » contient des éléments : « encadré, titre: » puis la liste en dessous/, 25), v.out.slice(0, 300));
    await fs.writeFile(vf, v0); await fs.writeFile(mf, m0);

    // données : calculé, groupe libre, expression avec virgule
    v = await withMan('forme:\n', 'calculé:\n  total: nombre\nforme:\n');
    ok('calculé : réservé aux composants natifs', call(v, /calculé est réservé aux composants natifs/, 14), v.out.slice(0, 300));
    v = await withMan('  phone: texte', '  filtre: groupe libre, facultatif — clés au choix de la page\n  phone: texte');
    ok('données : « groupe libre » accepté (objet aux clés libres)', v.code === 0, v.out.slice(0, 300));
    v = await withMan('  phone: texte', '  filtre (groupe libre, facultatif):\n    a: texte\n  phone: texte');
    ok('données : un groupe libre ne décrit pas ses champs', call(v, /un groupe libre ne décrit pas ses champs/, 13), v.out.slice(0, 300));
    await fs.writeFile(mf, m0.replace('- titre: name', '- titre: "{{ name | default(\'Pain, sans nom\') }}"'));
    r = run('component', 'show', voc, 'comptoir');
    ok('forme : une virgule dans une expression {{ … }} ne coupe pas la valeur', r.code === 0 && r.out.includes('<h3>{{ it1.name | default(\'Pain, sans nom\') }}</h3>'), r.out.slice(0, 300));
    await fs.writeFile(mf, m0);

    // mot de paquet : sans préfixe dans le paquet, « préfixe.mot » depuis le site
    const vg = await copy('scripts/reference/exemples-yaml/garnier-associes', path.join('vp', 'garnier-associes'));
    const vpk = path.join(await copy('scripts/reference/exemples-yaml/paquets', path.join('vp', 'paquets')), 'vitrine');
    const pvf = path.join(vpk, 'vocabulaire.yaml');
    const mention = d => `mots:\n  mention:\n    description: Une ligne discrète, pour une mention légale ou une précision.\n    données:\n      texte: texte\n    forme:\n      - texte discret « mention »: ${d}\n`;
    await fs.writeFile(pvf, mention('texte'));
    const of = path.join(vpk, 'components', 'onglets', 'manifest.yaml');
    await fs.writeFile(of, (await fs.readFile(of, 'utf8')).replace('  - en-tête: title, intro\n', '  - en-tête: title, intro\n  - mention: intro\n'));
    await fs.mkdir(path.join(vg, 'components', 'pied'), { recursive: true });
    const pied = w => fs.writeFile(path.join(vg, 'components', 'pied', 'manifest.yaml'), `name: pied\ndescription: Une note en bas de page.\ndonnées:\n  note: texte\nforme:\n  - ${w}: note\nexample: |\n  - pied: { note: Cabinet inscrit au barreau. }\n`);
    await pied('vitrine.mention');
    v = chk(vg);
    ok('mot de paquet : site valide, le paquet l\'emploie sans préfixe, le site avec', v.code === 0, v.out.slice(0, 400));
    r = run('catalog', vg);
    ok('mot de paquet : catalogue le liste préfixé [mot du paquet vitrine]', /^vitrine\.mention: texte .*\[mot du paquet vitrine\]/m.test(r.out), r.out.slice(-400));
    r = run('explain', 'vitrine.mention', vg);
    ok('mot de paquet : explain', /^# vitrine\.mention \(mot du paquet vitrine\)/m.test(r.out) && /- texte discret « mention »: texte/.test(r.out), r.out.slice(0, 300));
    r = run('component', 'show', vg, 'pied');
    const r2 = run('component', 'show', vg, 'vitrine.onglets');
    ok('mot de paquet : développé dans le composant du site et dans celui du paquet', r.out.includes('<p class="muted mention">{{ p.note }}</p>') && r2.out.includes('{% if p.intro %}<p class="muted mention">{{ p.intro }}</p>{% endif %}'), r.out.slice(0, 300));
    await pied('mention');
    v = chk(vg);
    ok('mot de paquet : sans préfixe depuis le site → l\'erreur donne l\'écriture', call(v, /un mot de paquet s'écrit avec son préfixe : « vitrine\.mention »/, 6) && once(v), v.out.slice(0, 400));
    await pied('vitrine.mention');
    await fs.writeFile(pvf, mention('text'));
    v = chk(vg);
    ok('mot de paquet en erreur : E_WORD dans le fichier du paquet, une seule fois', v.code === 1 && once(v) && v.errs[0].code === 'E_WORD' && /paquets\/vitrine\/vocabulaire\.yaml$/.test(v.errs[0].file) && v.errs[0].path === 'ligne 7' && /vouliez-vous dire « texte »/.test(v.errs[0].message), v.out.slice(0, 500));

    // comportement map et état du catalogue natif
    r = run('component', 'show', voc, 'map');
    ok('map : le mot « carte à la demande » pose le comportement map, sans script dans le composant', r.out.includes('data-sl-map="{{ p.lat }},{{ p.lon }},') && /comportements ajoutés : map/.test(r.out) && /mots du vocabulaire employés : adresse, itinéraire, carte à la demande/.test(r.out), r.out.slice(0, 300));
    const pmDist = path.join(tmp, 'pm-dist');
    r = run('build', await copy('scripts/reference/exemples-yaml/plomberie-martin', 'pm'), '--out', pmDist);
    const pjs = await fs.readFile(path.join(pmDist, 'assets', 'site.js'), 'utf8').catch(() => '');
    const pcss = await fs.readFile(path.join(pmDist, 'assets', 'site.css'), 'utf8').catch(() => '');
    ok('map : compilation, comportement dans le script du site, feuilles des mots natifs employés', r.code === 0 && pjs.includes('data-sl-map') && pjs.includes('openstreetmap.org/export/embed.html') && pcss.includes('/* mot : carte à la demande */') && pcss.includes('/* mot : carte de collection */'), r.out.slice(-300));
    const natives = (await fs.readdir(path.join(ROOT, 'components'), { withFileTypes: true })).filter(d => d.isDirectory()).map(d => d.name);
    const has = async (n, f) => fs.access(path.join(ROOT, 'components', n, f)).then(() => true, () => false);
    const html = [], php = [];
    for (const n of natives) { if (await has(n, 'template.html')) html.push(n); if (await has(n, 'template.php')) php.push(n); }
    ok('catalogue natif : plus aucun gabarit HTML ni PHP', html.length === 0 && php.length === 0, JSON.stringify({ html, php }));

    // --- lectures à la visite : fonctionnement › lit, sources de la cible, cas de test « à la visite »
    const sav = await copy('scripts/reference/exemples-yaml/savonnerie', 'sav');
    const sm = path.join(sav, 'components', 'selection', 'manifest.yaml'), sm0 = await fs.readFile(sm, 'utf8');
    const withSel = async (from, to) => { if (!sm0.includes(from)) throw new Error('ancre absente de selection : ' + from); await fs.writeFile(sm, sm0.replace(from, to)); const x = chk(sav); await fs.writeFile(sm, sm0); return x; };
    v = chk(sav);
    ok('lit : un composant du site qui lit la boutique est valide', v.code === 0 && v.errs.length === 0, v.out.slice(0, 400));
    r = run('catalog', sav);
    ok('lit : catalogue liste les sources et leur service', /^produits de la boutique +.*\[boutique\]/m.test(r.out) && /^horaires du moment +.*\[horaires\]/m.test(r.out) && !/saisie du contact/.test(r.out), r.out.slice(-500));
    r = run('explain', 'panier du visiteur');
    ok('lit : explain d\'une source montre son emploi et ce qu\'elle rend', /^# panier du visiteur \(source : service « boutique » de la cible\)/m.test(r.out) && /nom: panier du visiteur/.test(r.out) && /^ {2}lines: liste$/m.test(r.out) && /^ {4}qty: nombre$/m.test(r.out) && /checkout: lien, facultatif/.test(r.out) && /« À la visite : », puis « ### nom »/.test(r.out), r.out.slice(0, 300));
    r = run('explain', 'produits de la boutique');
    ok('lit : explain liste les paramètres d\'une source', /Paramètres .* : catégorie, vedettes, tri, limite\./.test(r.out) && /Elle rend une liste ; chaque élément :/.test(r.out), r.out.slice(0, 400));
    r = run('component', 'show', sav, 'selection', '--php');
    ok('lit : la lecture devient un appel à la cible avant le rendu, valeurs par défaut posées', r.out.includes("$p += ['limit' => 3]; $p['_produits'] = sl_source($p, 'produits', 'products', ['category' => sl_get($p, 'category'), 'limit' => sl_get($p, 'limit')]);") && r.out.includes('{% if p._produits %}<section class="section selection{% if p._ap %} {{ p._ap }}{% endif %}">'), r.out.slice(-600));
    ok('lit : le mot « ajout au panier » pose le formulaire d\'action et son jeton', r.out.includes('<form method="post" action="/_cart" class="add-to-cart" data-category="{{ it1.category }}">') && r.out.includes('{{ csrf() }}<input type="hidden" name="action" value="add">') && r.out.includes('sl_fn_csrf()'), '');
    r = run('test', sav);
    s = lines(r.out).find(x => 'cases' in x);
    ok('lit : cas de test avec « à la visite », rendu sans boutique ni stock réels', r.code === 0 && s?.failed === 0 && s.cases === 2, r.out.slice(-300));
    const vide = await fs.readFile(path.join(sav, 'components', 'selection', 'fixtures', 'vide.html'), 'utf8');
    const deux = await fs.readFile(path.join(sav, 'components', 'selection', 'fixtures', 'deux-produits.html'), 'utf8');
    ok('lit : « section, seulement si » : rien quand la lecture est vide ; « Épuisé » sans bouton quand le stock est nul', vide.trim() === '' && (deux.match(/<form method="post" action="\/_cart"/g) || []).length === 1 && /<p class="muted">Épuisé<\/p>/.test(deux) && /6,50 €/.test(deux), deux.slice(0, 300));
    const fx = path.join(sav, 'components', 'selection', 'fixtures', 'deux-produits.yaml'), fx0 = await fs.readFile(fx, 'utf8');
    await fs.writeFile(fx, fx0.replace('price_text: "6,50 €", ', ''));
    r = run('test', sav);
    ok('lit : données de visite contrôlées contre ce que la source annonce', r.code === 1 && /à la visite » › produits \(produits de la boutique\) : .*price_text/.test(r.out), r.out.slice(0, 400));
    await fs.writeFile(fx, fx0.replace('  produits:', '  articles:'));
    r = run('test', sav);
    ok('lit : donnée de visite qui n\'est pas une lecture du composant', r.code === 1 && /articles n'est pas une lecture du composant \(produits\)/.test(r.out), r.out.slice(0, 400));
    await fs.writeFile(fx, fx0);
    v = await withSel('produits: produits de la boutique,', 'produits: produits de la boutik,');
    ok('lit : source mal écrite → suggestion, à la ligne du manifeste', call(v, /source inconnue « produits de la boutik » ; vouliez-vous dire « produits de la boutique » \?/, 10) && once(v), v.out.slice(0, 400));
    v = await withSel('catégorie category, limite limit', 'categorie category, limites limit');
    ok('lit : paramètre inconnu → suggestion (les accents ne comptent pas)', call(v, /paramètre inconnu « limites » pour « produits de la boutique » ; vouliez-vous dire « limite » \?/, 10) && once(v), v.out.slice(0, 400));
    v = await withSel('catégorie category, limite limit', 'catégorie categorie, limite limit');
    ok('lit : valeur de paramètre qui n\'est pas une donnée du composant', call(v, /paramètre « catégorie » : « categorie » : « categorie » n'est pas une donnée du composant \(connues : title, category, limit\)/, 10), v.out.slice(0, 400));
    v = await withSel('    produits: produits de la boutique', '    title: produits de la boutique');
    ok('lit : une lecture ne prend pas le nom d\'une donnée', call(v, /« title » est déjà une donnée du composant/, 10), v.out.slice(0, 400));
    v = await withSel('    produits: produits de la boutique, catégorie category, limite limit', '    produits: produits de la boutique, catégorie category, limite limit\n    saisie: saisie du contact');
    ok('lit : source réservée à un composant natif → la voie normale est dite', call(v, /« saisie du contact » est réservée au composant contact\.form ; pour un formulaire à vous, déclarez « fonctionnement: formulaire: »/, 11), v.out.slice(0, 400));
    v = await withSel('            - texte discret: stock_text', '            - texte discret: stock_texte');
    ok('lit : champ inconnu d\'un élément lu → erreur de la forme, avec les champs que la source rend', call(v, /« stock_texte » n'est pas une donnée.*vouliez-vous dire « stock_text »/, 19), v.out.slice(0, 500));
    v = await withSel('  section, seulement si produits:', '  section, seulement si produit:');
    ok('lit : « seulement si » sur un nom inconnu', call(v, /« produit » n'est pas une donnée/), v.out.slice(0, 400));
    r = run('build', sav, '--out', path.join(tmp, 'sav-dist'));
    const idx = await fs.readFile(path.join(tmp, 'sav-dist', 'index.php'), 'utf8').catch(() => '');
    const atelier = /'\/atelier' => (?:array \(|\[)([\s\S]*?)\n {2}\S/.exec(idx)?.[1] || '';
    ok('lit : la page qui contient le composant n\'est plus statique et porte un jeton', r.code === 0 && atelier !== '' && !/'static' =>/.test(atelier) && /'csrf' => true/.test(atelier), atelier.slice(0, 400) || idx.slice(0, 200));
    const gp2 = path.join(tmp, 'gen-lit.json');
    r = run('component', 'new', sav, 'vitrine-du-jour', '--describe', 'Les trois derniers produits.', '--export', gp2);
    const gj2 = JSON.parse(await fs.readFile(gp2, 'utf8').catch(() => '{}'));
    ok('lit : le guide du générateur décrit les sources et leurs champs, sans la source réservée', /Fonctionnement › lit/.test(gj2.system || '') && /- produits de la boutique, catégorie <donnée>, vedettes <donnée>, tri <donnée>, limite <donnée> : /.test(gj2.system) && /« À la visite : », puis une section « ### nom » par lecture/.test(gj2.system) && !/bloc yaml/.test(gj2.system) && !/saisie du contact/.test(gj2.system), (gj2.system || '').slice(0, 200));
    r = run('schema', sav);
    const ms2 = JSON.parse(await fs.readFile(path.join(sav, '.devanture', 'schema', 'manifest.schema.json'), 'utf8').catch(() => 'null'));
    ok('lit : le schéma d\'éditeur propose « lit » et ses sources', /`panier du visiteur`/.test(ms2?.properties?.fonctionnement?.properties?.lit?.markdownDescription || ''), '');

    // --- registre à règles : places, liste d'attente, une fois par (fonctionnement › formulaire) et lecture de son état
    const rg = await copy('scripts/reference/exemples-yaml/le-fournil', 'reg');
    // L'exemple écrit ce composant au format document ; ces contrôles portent sur les règles au format langage : on remet ici
    // le manifeste écrit à la main que le document remplace (scripts/reference), le même que celui dont verify-document prouve l'identité.
    const am = path.join(rg, 'components', 'atelier', 'manifest.yaml');
    await fs.rm(path.join(rg, 'components', 'atelier', 'document.md'), { force: true }); await fs.rm(path.join(rg, 'components', 'atelier', 'lecture.yaml'), { force: true });
    await fs.copyFile(path.join(ROOT, 'scripts', 'reference', 'atelier.manifest.yaml'), am);
    const am0 = await fs.readFile(am, 'utf8');
    const withAt = async (from, to) => { if (!am0.includes(from)) throw new Error('ancre absente de atelier : ' + from); await fs.writeFile(am, am0.replace(from, to)); const x = chk(rg); await fs.writeFile(am, am0); return x; };
    v = chk(rg);
    ok('registre : composant à places limitées, liste d\'attente et unicité valide', v.code === 0 && v.errs.length === 0, v.out.slice(0, 500));
    r = run('component', 'show', rg, 'atelier');
    ok('registre : component show donne les règles compilées et ce que la cible en fait', r.out.includes('rules: { capacity: { max: 8, by: seance, qty: personnes, waitlist: true') && r.out.includes('unique: { fields: [ email, seance ]') && /au plus 8 places par valeur de « seance », chaque envoi comptant pour la valeur de « personnes » ; au-delà : liste d'attente/.test(r.out) && /un seul envoi non annulé par email \+ seance/.test(r.out) && /places ← état du registre \(store: 'ateliers'\)/.test(r.out), r.out.slice(0, 300));
    r = run('explain', 'état du registre');
    ok('registre : explain de la source (nom de registre facultatif, places par groupe)', /registre <nom>/.test(r.out) && /Sans lui : le registre du formulaire du même composant/.test(r.out) && /left_text: texte, facultatif — « 3 places restantes », « Dernière place », « Complet »/.test(r.out) && /^ {2}groups: liste$/m.test(r.out), r.out.slice(0, 300));
    v = await withAt('places: 8 par seance, comptées par personnes', 'places: 8 par seanse, comptées par personnes');
    ok('registre : champ qui groupe mal écrit → suggestion, à la ligne de « places »', call(v, /places … par seanse : seanse n'est pas un champ du formulaire ; vouliez-vous dire « seance » \?/, 15) && once(v), v.out.slice(0, 400));
    v = await withAt('places: 8 par seance, comptées par personnes', 'places: 8 par seance, comptées par name');
    ok('registre : « comptées par » exige un champ nombre', call(v, /comptées par name : ce champ doit être un nombre/, 15), v.out.slice(0, 400));
    v = await withAt('places: 8 par seance, comptées par personnes', 'places: beaucoup');
    ok('registre : « places » mal formé → les trois écritures sont rappelées', call(v, /attendu : « 12 », « 12 par atelier » \(un champ qui groupe\) ou « 12 par atelier, comptées par personnes »/, 15), v.out.slice(0, 400));
    v = await withAt('une fois par: email, seance', 'une fois par: mail, seance');
    ok('registre : « une fois par » sur un champ inconnu → suggestion, à sa ligne', call(v, /une fois par mail : mail n'est pas un champ du formulaire ; vouliez-vous dire « email » \?/, 17), v.out.slice(0, 400));
    v = await withAt('une fois par: email, seance', 'une fois par: message');
    ok('registre : « une fois par » exige un champ obligatoire', call(v, /une fois par message : ce champ doit être obligatoire et toujours affiché/, 17), v.out.slice(0, 400));
    v = await withAt('    places: 8 par seance, comptées par personnes\n', '');
    ok('registre : « liste d\'attente » sans « places » est une erreur', call(v, /« liste d'attente » va avec « places: »/, 15), v.out.slice(0, 400));
    v = await withAt('    places: 8 par seance', '    place: 8 par seance');
    ok('registre : réglage mal écrit → suggestion', call(v, /réglage de formulaire inconnu « place » ; vouliez-vous dire « places » \?/, 15), v.out.slice(0, 400));
    v = await withAt('      message: facultatif', '      waiting: texte — En attente');
    ok('registre : un champ ne prend pas un nom que la cible pose sur chaque envoi', call(v, /waiting est un nom de champ réservé \(la cible le pose sur chaque envoi\)/, 24), v.out.slice(0, 400));
    v = await withAt('    places: état du registre', '    places: état du registre, registre inscriptions');
    ok('registre : lire un registre que personne n\'écrit → E_UNKNOWN_STORE avec les registres du site', v.code === 1 && v.errs.some(e => e.code === 'E_UNKNOWN_STORE' && /registre inconnu « inscriptions »/.test(e.message) && (e.expected || []).includes('ateliers')), v.out.slice(0, 400));
    v = await withAt('    places: état du registre', '    places: état du registre, registre title');
    ok('registre : le paramètre « registre » est un nom, pas une donnée du composant', v.code === 1 && v.errs.some(e => /registre inconnu « title »/.test(e.message)), v.out.slice(0, 400));
    // un second composant écrit dans le même registre avec d'autres règles
    await fs.mkdir(path.join(rg, 'components', 'atelier-bis'), { recursive: true });
    await fs.writeFile(path.join(rg, 'components', 'atelier-bis', 'manifest.yaml'), am0.replace('name: atelier', 'name: atelier-bis').replace('places: 8 par seance', 'places: 10 par seance').replace('- atelier:', '- atelier-bis:'));
    v = chk(rg);
    ok('registre : deux composants, un registre, des règles différentes → E_STORE_RULES', v.code === 1 && v.errs.some(e => e.code === 'E_STORE_RULES' && /Le registre ateliers reçoit les envois de atelier et de atelier-bis avec des règles différentes/.test(e.message)), v.out.slice(0, 400));
    await fs.rm(path.join(rg, 'components', 'atelier-bis'), { recursive: true, force: true });
    // lecture sans formulaire et sans nom de registre
    await fs.mkdir(path.join(rg, 'components', 'compteur'), { recursive: true });
    const compteur = lit0 => fs.writeFile(path.join(rg, 'components', 'compteur', 'manifest.yaml'), `name: compteur\ndescription: Les places qui restent, sur une autre page que le formulaire.\ndonnées:\n  title: texte, facultatif\nfonctionnement:\n  lit:\n    places: ${lit0}\nforme:\n  section, seulement si places:\n    - en-tête: title\n    - texte: places.left_text\nexample: |\n  - compteur: { title: Atelier du samedi }\n`);
    await compteur('état du registre');
    v = chk(rg);
    ok('registre : lecture sans formulaire dans le composant → il faut nommer le registre', call(v, /« état du registre » sans formulaire dans ce composant : nommez le registre lu \(« état du registre, registre inscriptions »\)/), v.out.slice(0, 400));
    await compteur('état du registre, registre ateliers');
    v = chk(rg);
    ok('registre : un autre composant lit le registre par son nom', v.code === 0, v.out.slice(0, 400));
    r = run('build', rg, '--out', path.join(tmp, 'reg-dist'));
    const ridx = await fs.readFile(path.join(tmp, 'reg-dist', 'index.php'), 'utf8').catch(() => '');
    const regs = /\$SL_REGISTERS = ([\s\S]*?);\n\$/.exec(ridx)?.[1] || '';
    ok('registre : le site compilé connaît ses registres (règles, valeurs du champ qui groupe), jamais lus depuis la requête', r.code === 0 && /'ateliers' =>/.test(regs) && /'max' => 8/.test(regs) && /'by' => 'seance'/.test(regs) && /'Premier samedi du mois'/.test(regs) && /'waitlist' => true/.test(regs), regs.slice(0, 300) || ridx.slice(0, 200));
    const evp = /'\/commandes-evenements' => (?:array \(|\[)([\s\S]*?)\n {2}\S/.exec(ridx)?.[1] || '';
    ok('registre : les règles sont dans la configuration du formulaire de la page ; la page n\'est pas statique', /'rules' =>/.test(evp) && /'unique' =>/.test(evp) && !/'static' =>/.test(evp), evp.slice(0, 300));
    const gp3 = path.join(tmp, 'gen-reg.json');
    r = run('component', 'new', rg, 'stage', '--describe', 'Inscription à un stage, douze places.', '--export', gp3);
    const gj3 = JSON.parse(await fs.readFile(gp3, 'utf8').catch(() => '{}'));
    ok('registre : le guide du générateur enseigne les règles, sans inventer de nombre', /places : 12 par atelier, comptées par personnes/.test(gj3.system || '') && /liste d'attente/.test(gj3.system) && /N'invente aucun nombre de places/.test(gj3.system) && /état du registre/.test(gj3.system), (gj3.system || '').slice(0, 200));

    // éditeur et générateur : les mots sont connus
    r = run('schema', voc);
    const sj = async n => JSON.parse(await fs.readFile(path.join(voc, '.devanture', 'schema', n), 'utf8').catch(() => 'null'));
    const vs = await sj('vocabulaire.schema.json'), ms = await sj('manifest.schema.json');
    const vsc = JSON.parse(await fs.readFile(path.join(voc, '.vscode', 'settings.json'), 'utf8').catch(() => '{}'))['yaml.schemas'] || {};
    ok('éditeur : schéma de vocabulaire.yaml branché, mots du site au survol de « forme »', r.code === 0 && Object.keys(vs?.properties?.mots?.additionalProperties?.properties || {}).join() === 'description,données,forme,apparence,gabarit,feuille,parties' && (vsc['./.devanture/schema/vocabulaire.schema.json'] || []).includes('vocabulaire.yaml') && /`sortie du four: heure`/.test(ms?.properties?.forme?.markdownDescription || '') && /`ligne de tarif: nom, prix/.test(ms.properties.forme.markdownDescription), r.out.slice(0, 300));
    const gp = path.join(tmp, 'gen-voc.json');
    r = run('component', 'new', voc, 'annonce', '--describe', 'Une annonce avec l\'heure de sortie du four.', '--export', gp);
    const gj = JSON.parse(await fs.readFile(gp, 'utf8').catch(() => '{}'));
    ok('générateur : la demande liste les mots utilisables, le guide dit comment les employer', r.code === 0 && /Mots du vocabulaire utilisables dans la forme[\s\S]*- sortie du four: heure — /.test(gj.user || '') && /Mots du vocabulaire : quand la demande en liste/.test(gj.system || '') && /- map : /.test(JSON.stringify(gj)) === false, r.out.slice(0, 300));
  }

  // --- migrate
  const fournil = await copy('scripts/reference/exemples-yaml/le-fournil', 'fournil');
  const before = await fs.readFile(path.join(fournil, 'site.yaml'), 'utf8');
  await fs.writeFile(path.join(fournil, 'site.yaml'), before.replace(/^language: 1\n\n/m, ''));
  r = run('check', fournil);
  ok('migrate : version absente → avertissement W_LANGUAGE', r.code === 0 && lines(r.out).some(e => e.code === 'W_LANGUAGE'), r.out.slice(0, 200));
  r = run('migrate', fournil, '--dry-run');
  ok('migrate : --dry-run annonce l\'étape sans écrire', r.code === 0 && /PRÉVU 0 → 1/.test(r.out) && !(await fs.readFile(path.join(fournil, 'site.yaml'), 'utf8')).includes('language:'));
  ok('migrate : suggestions (coordonnées recopiées)', /IDÉE  site\.contact\.phone/.test(r.out));
  r = run('migrate', fournil);
  ok('migrate : écrit language: 1, le site reste valide', r.code === 0 && /FAIT  0 → 1/.test(r.out) && /^language: 1$/m.test(await fs.readFile(path.join(fournil, 'site.yaml'), 'utf8')), r.out.slice(-200));
  r = run('migrate', fournil);
  ok('migrate : idempotent (déjà en version 1)', r.code === 0 && /Déjà en version 1/.test(r.out));
  await fs.writeFile(path.join(fournil, 'site.yaml'), (await fs.readFile(path.join(fournil, 'site.yaml'), 'utf8')).replace('language: 1', 'language: 7'));
  r = run('migrate', fournil);
  ok('migrate : version future refusée', r.code === 1 && /ne connaît que jusqu'à 1/.test(r.out));
  r = run('check', fournil);
  ok('check : version future → E_LANGUAGE', r.code === 1 && lines(r.out).some(e => e.code === 'E_LANGUAGE'));
} catch (e) {
  ok('exécution du banc', false, e.stack || e.message);
} finally {
  await fs.rm(tmp, { recursive: true, force: true });
}

const passed = checks.filter(c => c.pass).length;
for (const c of checks) console.log(`${c.pass ? 'OK  ' : 'FAIL'} ${c.name}${c.detail && !c.pass ? ' — ' + c.detail : ''}`);
console.log(JSON.stringify({ tools: 'langage', passed, total: checks.length }));
process.exit(passed === checks.length ? 0 : 1);
