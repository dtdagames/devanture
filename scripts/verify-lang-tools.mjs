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
  const cdir = path.join(fournil0, 'components', 'avis-defilants');
  const css0 = await fs.readFile(path.join(cdir, 'styles.css'), 'utf8');
  const tpl0 = await fs.readFile(path.join(cdir, 'template.html'), 'utf8');
  const man0 = await fs.readFile(path.join(cdir, 'manifest.yaml'), 'utf8');
  r = run('check', fournil0);
  ok('composant généré (exemple fournil) : valide, sans avertissement', r.code === 0 && lines(r.out).find(x => x.ok)?.warnings === 0, r.out.slice(-300));
  const expectCheck = async (file, content, re, label, code = 1) => { await fs.writeFile(path.join(cdir, file), content); const x = run('check', fournil0); ok(label, x.code === code && re.test(x.out), x.out.slice(0, 300)); };
  await expectCheck('styles.css', css0 + 'h2{color:var(--color-fg)}\n', /E_CSS.*sélecteur « h2 » hors du composant/, 'CSS : sélecteur hors du composant → E_CSS');
  await expectCheck('styles.css', css0 + ':root{--x:1}\n', /E_CSS.*sélecteur global/, 'CSS : sélecteur global → E_CSS');
  await expectCheck('styles.css', css0 + '.avis-defilants-bg{background:url(https://cdn.exemple.fr/x.png)}\n', /E_CSS.*ressource externe/, 'CSS : ressource externe → E_CSS');
  await expectCheck('styles.css', css0 + '.avis-defilants-x{color:#ff0000}\n', /W_CSS.*couleur écrite en dur/, 'CSS : couleur en dur → avertissement W_CSS', 0);
  await fs.writeFile(path.join(cdir, 'styles.css'), css0);
  await expectCheck('manifest.yaml', man0.replace('behaviors: [carousel]\n', ''), /E_BEHAVIOR.*carousel sans le déclarer/, 'comportements : attributs posés sans déclaration → E_BEHAVIOR');
  await expectCheck('manifest.yaml', man0.replace('behaviors: [carousel]', 'behaviors: [carousel, carousell]'), /E_ENUM.*Comportement inconnu : carousell/, 'comportements : nom inconnu → E_ENUM avec suggestion');
  await expectCheck('manifest.yaml', man0.replace('behaviors: [carousel]', 'behaviors: [carousel, tabs]'), /W_BEHAVIOR.*déclare tabs/, 'comportements : déclaré mais inutilisé → W_BEHAVIOR', 0);
  await fs.writeFile(path.join(cdir, 'manifest.yaml'), man0);
  await expectCheck('template.html', tpl0 + '<script>alert(1)</script>\n', /E_TEMPLATE.*<script> interdit/, 'gabarit : <script> → E_TEMPLATE');
  await expectCheck('template.html', tpl0.replace('<button type="button" class="avis-defilants-nav" data-sl-prev>', '<button type="button" class="avis-defilants-nav" data-sl-prev onclick="x()">'), /E_TEMPLATE.*attribut d'événement/, 'gabarit : onclick= → E_TEMPLATE');
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
  const good = { manifest: man0, template: tpl0, styles: css0, fixtures: [{ name: 'complet', yaml: await fs.readFile(path.join(cdir, 'fixtures', 'complet.yaml'), 'utf8') }, { name: 'minimal', yaml: await fs.readFile(path.join(cdir, 'fixtures', 'minimal.yaml'), 'utf8') }], notes: 'ok' };
  const bad = { ...good, manifest: man0.replace('behaviors: [carousel]\n', ''), styles: css0.replace('var(--color-accent)', '#e0a100'), notes: 'premier jet' };
  const site2 = await copy('examples/le-fournil', 'fournil-gen');
  await fs.rm(path.join(site2, 'components', 'avis-defilants'), { recursive: true });
  await fs.writeFile(path.join(site2, 'pages', 'accueil.page.yaml'), (await fs.readFile(path.join(ROOT, 'examples', 'le-fournil', 'pages', 'accueil.page.yaml'), 'utf8')).replace('  - avis-defilants:', '  - testimonials:').replace(/        - text: /g, '        - quote: '));
  const prompts = [];
  let res = await gen.generateComponent({ root: site2, name: 'avis-defilants', description: 'Un carrousel d\'avis clients.', catalog, rounds: 3, ask: async (system, user, round) => { prompts.push({ system, user }); return JSON.stringify(round === 1 ? bad : good); } });
  ok('générateur : premier jet refusé, réparé au deuxième tour', res.ok && res.rounds === 2, JSON.stringify({ ok: res.ok, rounds: res.rounds, problems: res.problems }));
  ok('générateur : le prompt de réparation cite les problèmes et les fichiers précédents', /E_BEHAVIOR/.test(prompts[1]?.user || '') && /W_CSS/.test(prompts[1]?.user || '') && /## Fichiers précédents/.test(prompts[1]?.user || ''));
  ok('générateur : le guide système vient du code (comportements, filtres, composants de référence)', /carousel : carrousel/.test(prompts[0]?.system || '') && /truncate/.test(prompts[0]?.system || '') && /Composant de référence : features/.test(prompts[0]?.system || ''));
  const written = await fs.readdir(path.join(site2, 'components', 'avis-defilants', 'fixtures'));
  ok('générateur : description.md, cas de test et instantanés écrits', written.includes('complet.html') && (await fs.readFile(path.join(site2, 'components', 'avis-defilants', 'description.md'), 'utf8')).includes('Un carrousel d\'avis clients.'));
  res = await gen.generateComponent({ root: site2, name: 'avis-defilants', description: 'x', catalog, rounds: 2, ask: async (s2, u, round) => round === 1 ? 'Voici le composant : pas de JSON' : JSON.stringify(good) });
  ok('générateur : réponse sans JSON → nouveau tour', res.ok && res.rounds === 2);
  res = await gen.generateComponent({ root: site2, name: 'avis-defilants', description: 'x', catalog, rounds: 2, ask: async () => JSON.stringify(bad) });
  ok('générateur : toujours faux → échec après le nombre de tours, problèmes rendus', !res.ok && res.rounds === 2 && res.problems.some(p => p.code === 'E_BEHAVIOR'));
  r = run('component', 'new', site2, 'autre-bloc', '--describe', 'Un bloc simple.', '--export', path.join(tmp, 'p.json'));
  const exported = JSON.parse(await fs.readFile(path.join(tmp, 'p.json'), 'utf8'));
  ok('générateur sans clé : --export écrit system, user et schéma de sortie', r.code === 0 && exported.system && /Nom du composant : autre-bloc/.test(exported.user) && exported.output_schema?.required?.includes('template'));
  await fs.writeFile(path.join(tmp, 'r.json'), JSON.stringify(bad));
  await fs.rm(path.join(site2, 'components', 'avis-defilants'), { recursive: true });
  r = run('component', 'new', site2, 'avis-defilants', '--import', path.join(tmp, 'r.json'), '--export', path.join(tmp, 'rep.json'));
  ok('générateur sans clé : --import d\'une réponse fautive → code 1 et prompt de réparation', r.code === 1 && /prompt de réparation écrit/.test(r.out) && /Ta proposition précédente/.test(JSON.parse(await fs.readFile(path.join(tmp, 'rep.json'), 'utf8')).user));

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
