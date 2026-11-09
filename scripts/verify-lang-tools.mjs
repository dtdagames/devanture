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
  const paquets = await copy('examples/paquets', 'paquets');
  const garnier = await copy('examples/garnier-associes', 'garnier');
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
  const plomberie = await copy('examples/plomberie-martin', 'plomberie');
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
  const fournil0 = await copy('examples/le-fournil', 'fournil-composants');
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
  const ldir = path.join(ROOT, 'examples', 'le-fournil', 'components', 'avis-defilants');
  const manL = await fs.readFile(path.join(ldir, 'manifest.yaml'), 'utf8');
  const good = { manifest: manL, fixtures: [{ name: 'complet', yaml: await fs.readFile(path.join(ldir, 'fixtures', 'complet.yaml'), 'utf8') }, { name: 'minimal', yaml: await fs.readFile(path.join(ldir, 'fixtures', 'minimal.yaml'), 'utf8') }], notes: 'ok' };
  // Mauvais jet typique : un champ mal nommé dans la forme, une intention mal orthographiée dans l'apparence.
  const bad = { ...good, manifest: manL.replace('          - signature: author, date, en toutes lettres', '          - signature: auteur, date, en toutes lettres').replace("étoiles: couleur d'accent", "étoiles: couleur d'acent"), notes: 'premier jet' };
  const site2 = await copy('examples/le-fournil', 'fournil-gen');
  await fs.rm(path.join(site2, 'components', 'avis-defilants'), { recursive: true });
  await fs.writeFile(path.join(site2, 'pages', 'accueil.page.yaml'), (await fs.readFile(path.join(ROOT, 'examples', 'le-fournil', 'pages', 'accueil.page.yaml'), 'utf8')).replace('  - avis-defilants:', '  - testimonials:').replace(/        - text: /g, '        - quote: '));
  const prompts = [];
  let res = await gen.generateComponent({ root: site2, name: 'avis-defilants', description: 'Un carrousel d\'avis clients.', catalog, rounds: 3, ask: async (system, user, round) => { prompts.push({ system, user }); return JSON.stringify(round === 1 ? bad : good); } });
  ok('générateur : premier jet refusé, réparé au deuxième tour', res.ok && res.rounds === 2, JSON.stringify({ ok: res.ok, rounds: res.rounds, problems: res.problems }));
  ok('générateur : le prompt de réparation cite les problèmes (donnée inconnue avec suggestion, intention mal écrite) et les fichiers précédents', /« auteur » n'est pas une donnée.*vouliez-vous dire « author »/.test(prompts[1]?.user || '') && /intention inconnue « couleur d'acent »/.test(prompts[1]?.user || '') && /## Fichiers précédents/.test(prompts[1]?.user || ''));
  ok('générateur : le guide du format langage vient du code (types, primitives, intentions, natifs en forme)', /défilement : carrousel/.test(prompts[0]?.system || '') && /nombre entier/.test(prompts[0]?.system || '') && /coins arrondis/.test(prompts[0]?.system || '') && /- grille de items, colonnes columns par défaut 3:/.test(prompts[0]?.system || '') && !/template\.html :/.test(prompts[0]?.system || ''));
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
  ok('générateur sans clé : --export écrit system, user et schéma de sortie', r.code === 0 && exported.system && /Nom du composant : autre-bloc/.test(exported.user) && exported.output_schema?.required?.includes('manifest') && !exported.output_schema?.required?.includes('template') && exported.format === 'langage');
  await fs.writeFile(path.join(tmp, 'r.json'), JSON.stringify(bad));
  await fs.rm(path.join(site2, 'components', 'avis-defilants'), { recursive: true });
  r = run('component', 'new', site2, 'avis-defilants', '--import', path.join(tmp, 'r.json'), '--export', path.join(tmp, 'rep.json'));
  ok('générateur sans clé : --import d\'une réponse fautive → code 1 et prompt de réparation', r.code === 1 && /prompt de réparation écrit/.test(r.out) && /Ta proposition précédente/.test(JSON.parse(await fs.readFile(path.join(tmp, 'rep.json'), 'utf8')).user));

  // --- Modification en langage naturel, génération dans un paquet, aperçu
  const site3 = await copy('examples/le-fournil', 'fournil-edit');
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
  const garnier3 = await copy('examples/garnier-associes', 'garnier-gen');
  await copy('examples/paquets', 'paquets-gen');
  await fs.writeFile(path.join(garnier3, 'site.yaml'), (await fs.readFile(path.join(garnier3, 'site.yaml'), 'utf8')).replace('../paquets/vitrine', '../paquets-gen/vitrine'));
  const pkgGood = { manifest: 'name: alerte\ndescription: "Bandeau d\'alerte : un titre et un texte."\nprops:\n  type: object\n  required: [title]\n  properties:\n    title: { type: string }\n    text: { type: string }\nexample: |\n  - vitrine.alerte:\n      title: Fermé le 15 août\nintents: [alerte, fermeture]\n', template: '<section class="section alerte">\n  <div class="container"><div class="alerte-box"><strong>{{ p.title }}</strong>{% if p.text %} {{ p.text }}{% endif %}</div></div>\n</section>\n', styles: '.alerte-box{padding:14px 18px;border-radius:var(--radius);background:var(--color-surface);border-left:5px solid var(--color-warning)}\n', fixtures: [{ name: 'simple', yaml: 'title: Fermé le 15 août\ntext: Réouverture le 16.\n' }], notes: '' };
  const pkgPrompts = [];
  res = await gen.generateComponent({ root: garnier3, name: 'alerte', description: 'Un bandeau d\'alerte.', catalog, pkg: '../paquets-gen/vitrine', rounds: 1, ask: async (s3, user) => { pkgPrompts.push(user); return JSON.stringify(pkgGood); } });
  ok('paquet : composant généré dans le paquet, exposé vitrine.alerte', res.ok && res.target?.name === 'vitrine.alerte' && (await fs.readFile(path.join(tmp, 'paquets-gen', 'vitrine', 'components', 'alerte', 'template.html'), 'utf8')).includes('alerte-box'), JSON.stringify(res.problems));
  ok('paquet : le prompt donne le nom court au manifeste et le nom préfixé aux pages', /name: alerte \(nom court\)/.test(pkgPrompts[0] || '') && /« - vitrine\.alerte: »/.test(pkgPrompts[0] || ''));
  r = run('component', 'preview', site3, 'avis-defilants');
  const pv = await fs.readFile(path.join(site3, '.devanture', 'preview', 'avis-defilants.html'), 'utf8').catch(() => '');
  ok('preview : page d\'aperçu (cas rendus, thèmes, comportement, assets en relatif)', r.code === 0 && (pv.match(/class="pv-case"/g) || []).length === good.fixtures.length && /data-pv-theme="sombre"/.test(pv) && /comportements déclarés : carousel/.test(pv) && !/src="\/assets\//.test(pv), r.out.slice(0, 300));
  r = run('component', 'preview', garnier3, 'alerte', '--package', '../paquets-gen/vitrine');
  ok('preview : composant de paquet', r.code === 0 && /vitrine\.alerte\.html \(1 cas\)/.test(r.out), r.out.slice(0, 300));

  // --- Fonctionnement en français, primitives à comportement, erreurs à la ligne du manifeste, component show
  const pm = await copy('examples/plomberie-martin', 'pm-fonct');
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

  const lf = await copy('examples/le-fournil', 'lf-prim');
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
  r = run('component', 'show', lf, 'hero');
  ok('component show : composant au format html, rien de produit pour la structure', r.code === 0 && /format html, composant natif/.test(r.out) && /le fichier est la source/.test(r.out));
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
  ok('générateur : le guide enseigne fonctionnement (réglages, types de champ) et les primitives à comportement', /# fonctionnement/.test(sysF) && /enregistre dans, prévient par e-mail/.test(sysF) && /si <champ> vaut <valeur>/.test(sysF) && !/effects\.form/.test(sysF) && /- filtres : /.test(sysF) && /- portrait : /.test(sysF) && /- repli : /.test(sysF) && /- copier : /.test(sysF));

  // --- expériences : objectifs, bras, groupe témoin (segments.yaml)
  {
    const xp = await copy('examples/plomberie-martin', 'xp');
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

  // --- migrate
  const fournil = await copy('examples/le-fournil', 'fournil');
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
