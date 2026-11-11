// sitec test : rendu des composants à gabarit neutre (projet, paquets, et natifs avec --catalog) par le PHP de la cible,
// cas par cas, comparé à des instantanés. Un cas = components/<nom>/fixtures/<cas>.yaml (props) ; son instantané = <cas>.html à côté.
// Sans fixtures, l'exemple du manifeste est rendu (vérifie l'absence d'erreur PHP, sans instantané).
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import YAML from 'yaml';
import Ajv from 'ajv';
import { RENDER_PHP, FORMS_PHP, phpValue } from './emit/php/php.js';
import { sourceSchema } from './lang/sources.js';
import { normalizeContactFields } from './forms.js';

/** Clé d'un cas de test qui tient lieu de ce que la cible fournirait à la visite : { nom de lecture: valeur }. */
export const VISIT_KEY = 'à la visite';
/** Sépare les props d'un cas de ses données de visite, et vérifie celles-ci contre la forme que la source annonce. */
function splitVisit(c, props, ajv) {
  if (!props || typeof props !== 'object' || Array.isArray(props) || !(VISIT_KEY in props)) return { props, visit: null, error: null };
  const { [VISIT_KEY]: visit, ...rest } = props;
  if (!visit || typeof visit !== 'object' || Array.isArray(visit)) return { props: rest, visit: null, error: `« ${VISIT_KEY} » attend { nom de lecture: valeur }` };
  const sources = c.manifest.sources || [];
  for (const [k, v] of Object.entries(visit)) {
    const src = sources.find(x => x.key === k);
    if (!src) return { props: rest, visit: null, error: `« ${VISIT_KEY} » : ${k} n'est pas une lecture du composant (${sources.map(x => x.key).join(', ') || 'il ne lit rien'})` };
    const check = ajv.compile({ $defs: c.manifest.props?.$defs || {}, ...sourceSchema(src.source) });
    if (!check(v)) return { props: rest, visit: null, error: `« ${VISIT_KEY} » › ${k} (${src.source}) : ${check.errors.map(e => `${e.instancePath || '/'} ${e.message}${e.params?.additionalProperty ? ' : ' + e.params.additionalProperty : ''}`).join(' ; ')}` };
  }
  return { props: rest, visit, error: null };
}
/** Props telles que la cible les reçoit : données de visite sous _nom, champs du formulaire de contact normalisés. */
function renderProps(k) {
  let p = { ...(k.props || {}) };
  if (k.component === 'contact.form') { try { const n = normalizeContactFields(p, { file: '', path: '' }); p.fields = n.fields; delete p.required; } catch { /* rendu tel quel */ } }
  for (const [key, v] of Object.entries(k.visit || {})) p['_' + key] = v;
  return p;
}

const WINGET_PHP = 'C:/Users/sergi/AppData/Local/Microsoft/WinGet/Packages/PHP.PHP.8.3_Microsoft.Winget.Source_8wekyb3d8bbwe/php.exe';
export function findPhp() {
  for (const c of [process.env.PHP_BIN, existsSync(WINGET_PHP) ? WINGET_PHP : null, 'php'].filter(Boolean)) {
    try { execFileSync(c, ['-v'], { stdio: 'ignore' }); return c; } catch { /* suivant */ }
  }
  return null;
}

const norm = h => String(h).replace(/>\s+</g, '><').replace(/\s+/g, ' ').trim();

/** Cas à rendre pour un composant : fixtures/*.yaml, sinon l'exemple du manifeste. */
async function casesOf(c) {
  const out = [];
  const fdir = path.join(c.dir, 'fixtures');
  let files = [];
  try { files = (await fs.readdir(fdir)).filter(f => /\.ya?ml$/.test(f)).sort(); } catch { /* pas de fixtures */ }
  for (const f of files) {
    const file = path.join(fdir, f);
    let props, error = null;
    try { props = YAML.parse(await fs.readFile(file, 'utf8')) ?? {}; } catch (e) { error = `YAML invalide : ${e.message.split('\n')[0]}`; }
    out.push({ component: c.name, name: f.replace(/\.ya?ml$/, ''), file, snapshot: file.replace(/\.ya?ml$/, '.html'), props, error });
  }
  if (!out.length && c.manifest.example) {
    let props = null, error = null;
    try { const ex = YAML.parse(c.manifest.example); props = Array.isArray(ex) && ex[0] && typeof ex[0] === 'object' ? Object.values(ex[0])[0] ?? {} : null; } catch (e) { error = `exemple du manifeste illisible : ${e.message.split('\n')[0]}`; }
    if (props || error) out.push({ component: c.name, name: 'exemple', file: path.join(c.dir, c.outline ? 'composant.md' : 'manifest.yaml'), snapshot: null, props, error });
  }
  return out;
}

/**
 * Rend et compare. Renvoie { results: [{ component, name, status: ok|created|updated|changed|invalid|error|skipped, detail }], php }.
 * opts : { update, catalog (inclure les natifs à gabarit), only (nom de composant) }.
 */
/** Rend des cas ({ component, props }) par le runtime PHP de la cible, dans un banc temporaire. Renvoie [{ html } | { error }]. */
export async function renderCases(project, components, cases, php = findPhp()) {
  if (!php) throw new Error('PHP introuvable : installez php (ou indiquez son chemin dans PHP_BIN) pour rendre les composants.');
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'sitec-rendu-'));
  try {
    await fs.mkdir(path.join(tmp, 'lib'), { recursive: true }); await fs.mkdir(path.join(tmp, 'components'), { recursive: true });
    await fs.writeFile(path.join(tmp, 'lib', 'render.php'), RENDER_PHP);
    await fs.writeFile(path.join(tmp, 'lib', 'forms.php'), FORMS_PHP);
    await fs.writeFile(path.join(tmp, 'lib', 'images.php'), '<?php return [];');
    for (const c of components) await fs.writeFile(path.join(tmp, 'components', c.name + '.php'), c.compiled?.php || c.files['template.php'] || '');
    await fs.writeFile(path.join(tmp, 'cases.json'), JSON.stringify(cases.map(k => ({ component: k.component, props: renderProps(k) }))));
    await fs.writeFile(path.join(tmp, 'run.php'), `<?php
declare(strict_types=1);
define('SL_FIXTURES', true); // les données « à la visite » d'un cas remplacent la lecture de la source
ob_start();
ini_set('session.save_path', sys_get_temp_dir()); ini_set('session.use_cookies', '0'); @session_start(); $_SESSION['csrf'] = str_repeat('0', 32);
require __DIR__ . '/lib/render.php'; require __DIR__ . '/lib/forms.php';
set_error_handler(function (int $no, string $msg, string $file, int $line) { throw new ErrorException($msg . ' (' . basename($file) . ':' . $line . ')', 0, $no); });
$site = ${phpValue(project.site?.site || {})};
$page = ['file' => null, 'seo' => []]; $SL_ITEM = null; $product = null; $order = null; $SHOP = null; $current = '/';
$GLOBALS['SL_FORMS'] = ${phpValue(Object.fromEntries(components.filter(c => c.manifest?.effects?.form?._fields).map(c => [c.name, { status: null, errors: [], data: [], fields: c.manifest.effects.form._fields, name: c.name, success: c.manifest.effects.form.success || null, message: null }])))};
$out = [];
foreach (json_decode((string)file_get_contents(__DIR__ . '/cases.json'), true) as $i => $c) {
    ob_start();
    try { render_component($c['component'], $c['props'] ?: []); $out[$i] = ['html' => ob_get_clean()]; }
    catch (Throwable $e) { ob_end_clean(); $out[$i] = ['error' => get_class($e) . ' : ' . $e->getMessage()]; }
}
ob_end_clean();
echo json_encode($out, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
`);
    const raw = execFileSync(php, [path.join(tmp, 'run.php')], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    try { return JSON.parse(raw); } catch { throw new Error('Sortie PHP illisible : ' + raw.slice(0, 400)); }
  } finally { await fs.rm(tmp, { recursive: true, force: true }); }
}

/** Cas d'un composant (fixtures, sinon exemple), validés contre son manifeste. */
export async function validCasesOf(c) {
  const ajv = new Ajv({ allErrors: true, strict: false });
  for (const f of ['route', 'asset', 'file', 'email', 'uri']) ajv.addFormat(f, () => true);
  const v = ajv.compile(c.manifest.props);
  return (await casesOf(c)).map(k => {
    if (k.error) return { ...k, invalid: k.error };
    const sp = splitVisit(c, k.props, ajv); k = { ...k, props: sp.props, visit: sp.visit };
    if (sp.error) return { ...k, invalid: sp.error };
    return v(k.props) ? k : { ...k, invalid: v.errors.map(e => `${e.instancePath || '/'} ${e.message}`).join(' ; ') };
  });
}

export async function testComponents(project, { update = false, catalog = false, only = null } = {}) {
  const cat = project.catalog;
  const targets = cat.list().filter(c => c.compiled?.php && (c.project || catalog) && (!only || c.name === only));
  const results = [];
  if (!targets.length) return { results, php: null, targets: 0 };
  const php = findPhp();
  if (!php) throw new Error('PHP introuvable : installez php (ou indiquez son chemin dans PHP_BIN) pour rendre les composants.');
  const ajv = new Ajv({ allErrors: true, strict: false });
  for (const f of ['route', 'asset', 'file', 'email', 'uri']) ajv.addFormat(f, () => true);
  const cases = [];
  for (const c of targets) for (let k of await casesOf(c)) {
    if (k.error) { results.push({ component: c.name, name: k.name, status: 'invalid', detail: k.error }); continue; }
    const sp = splitVisit(c, k.props, ajv); k = { ...k, props: sp.props, visit: sp.visit };
    if (sp.error) { results.push({ component: c.name, name: k.name, status: 'invalid', detail: sp.error }); continue; }
    const v = ajv.compile(c.manifest.props);
    if (!v(k.props)) { results.push({ component: c.name, name: k.name, status: 'invalid', detail: v.errors.map(e => `${e.instancePath || '/'} ${e.message}${e.params?.additionalProperty ? ' : ' + e.params.additionalProperty : ''}`).join(' ; ') }); continue; }
    cases.push(k);
  }
  {
    const rendered = cases.length ? await renderCases(project, targets, cases, php) : [];
    for (const [i, k] of cases.entries()) {
      const r = rendered[i] || { error: 'pas de résultat' };
      if (r.error) { results.push({ component: k.component, name: k.name, status: 'error', detail: r.error }); continue; }
      if (/<!-- composant inconnu/.test(r.html)) { results.push({ component: k.component, name: k.name, status: 'error', detail: 'composant non rendu' }); continue; }
      if (!k.snapshot) { results.push({ component: k.component, name: k.name, status: 'ok', detail: 'exemple rendu sans erreur (pas d\'instantané : ajoutez fixtures/<cas>.yaml)' }); continue; }
      const html = r.html.trim() + '\n';
      let prev = null; try { prev = await fs.readFile(k.snapshot, 'utf8'); } catch { /* premier passage */ }
      if (prev === null) { await fs.writeFile(k.snapshot, html); results.push({ component: k.component, name: k.name, status: 'created', detail: path.basename(k.snapshot) }); continue; }
      if (norm(prev) === norm(html)) { results.push({ component: k.component, name: k.name, status: 'ok' }); continue; }
      if (update) { await fs.writeFile(k.snapshot, html); results.push({ component: k.component, name: k.name, status: 'updated', detail: path.basename(k.snapshot) }); continue; }
      const a = norm(prev), b = norm(html); let j = 0; while (j < a.length && a[j] === b[j]) j++;
      results.push({ component: k.component, name: k.name, status: 'changed', detail: `différence au caractère ${j} : attendu « …${a.slice(Math.max(0, j - 40), j + 60)}… », obtenu « …${b.slice(Math.max(0, j - 40), j + 60)}… » (--update pour accepter)` });
    }
  }
  return { results, php, targets: targets.length };
}
