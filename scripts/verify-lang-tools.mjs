// Banc des outils du langage : paquets de composants, tests de composants (sitec test), migration (sitec migrate), avertissements.
// Travaille sur des copies temporaires des exemples ; ne modifie rien dans le dépôt.
// Usage : node scripts/verify-lang-tools.mjs
import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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
