// Banc des registres à règles : le composant « atelier » de l'exemple le-fournil (huit places par séance, comptées par
// personnes, liste d'attente, une inscription par adresse et par séance), servi par php -S ou par un serveur déjà lancé.
// Vérifie ce que le manifeste déclare : places décomptées, refus de saisie, unicité, liste d'attente, lecture de l'état sur
// la page, actions du back-office (annuler, donner la place, rétablir), et douze inscriptions simultanées pour huit places.
// Usage : node scripts/verify-registre.mjs <dossier-dist-le-fournil> <port | http://hôte> [chemin-php]
// Sous php -S (un seul processus sous Windows) les envois simultanés passent l'un après l'autre ; sous Apache, ou sous
// Linux avec PHP_CLI_SERVER_WORKERS, ils se croisent vraiment et c'est le verrou du registre qui tient le compte.
import { existsSync } from 'node:fs';
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const [dir, portArg, phpArg] = process.argv.slice(2);
if (!dir || !portArg) { console.error('usage: verify-registre.mjs <dossier-dist> <port | url> [php]'); process.exit(2); }
const WINGET_PHP = 'C:/Users/sergi/AppData/Local/Microsoft/WinGet/Packages/PHP.PHP.8.3_Microsoft.Winget.Source_8wekyb3d8bbwe/php.exe';
const PHP = phpArg || process.env.PHP_BIN || (existsSync(WINGET_PHP) ? WINGET_PHP : 'php');
const root = path.resolve(dir);
const external = /^https?:[/][/]/.test(String(portArg));
const base = external ? String(portArg).replace(/[/]$/, '') : `http://127.0.0.1:${portArg}`;
const TOKEN = external ? (process.env.ADMIN_TOKEN || 'apache-admin') : 'registre-admin';
const PAGE = '/commandes-evenements', STORE = 'ateliers', S1 = 'Premier samedi du mois', S2 = 'Troisième samedi du mois';
const checks = [];
const ok = (n, pass, detail = '') => { checks.push({ name: n, pass: !!pass, detail: String(detail).slice(0, 500) }); };
const phpErr = t => /(Fatal error|Warning:|Notice:|Deprecated:|Parse error)/.test(t);
const enc = o => Object.entries(o).map(([k, v]) => encodeURIComponent(k) + '=' + encodeURIComponent(v)).join('&');

/** Un visiteur : sa session (cookie), son jeton, ses envois. */
function visitor() {
  let cookie = '';
  const req = async (p, opts = {}) => {
    const r = await fetch(base + p, { redirect: 'manual', headers: { cookie, ...(opts.headers || {}) }, method: opts.method || 'GET', body: opts.body });
    for (const c of r.headers.getSetCookie?.() || []) if (/PHPSESSID|sl_session/.test(c)) cookie = c.split(';')[0];
    return { status: r.status, text: await r.text(), headers: r.headers };
  };
  return {
    req,
    async page() { return req(PAGE); },
    async submit(fields) {
      const pg = await req(PAGE);
      const csrf = /name="_form" value="atelier"><input type="hidden" name="_csrf" value="([a-f0-9]+)"/.exec(pg.text)?.[1] || '';
      return req(PAGE, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: enc({ _form: 'atelier', _csrf: csrf, ...fields }) });
    },
  };
}
const mail = n => `banc${n}-${process.pid}@exemple.fr`;
const entry = (n, seance, personnes) => ({ seance, personnes: String(personnes), name: 'Banc ' + n, email: mail(n) });
/** Places restantes affichées sur la page pour une séance (« 5 places restantes », « Dernière place », « Complet »). */
const shown = (html, seance) => new RegExp('<li><p>' + seance.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '</p>\\s*<span class="badge">([^<]*)</span>').exec(html)?.[1] ?? null;
const success = t => /role="status"/.test(t) && /Votre place est réservée/.test(t);
const waitlisted = t => /role="status"/.test(t) && /vous êtes sur la liste d&#039;attente|vous êtes sur la liste d'attente/.test(t);

const admin = visitor();
let adminCsrf = '';
const adminPage = async () => { const r = await admin.req('/_admin/forms?store=' + STORE); adminCsrf = /name="_csrf" value="([a-f0-9]+)"/.exec(r.text)?.[1] || adminCsrf; return r; };
const act = async (id, action) => { await admin.req('/_admin/forms', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: enc({ _csrf: adminCsrf, store: STORE, id, act: action }) }); return adminPage(); };
/** Envois lus dans le back-office : [{ id, status, text }], du plus récent au plus ancien. */
const rowsOf = html => [...html.matchAll(/<tr><td>[^<]*<br><span class="muted">([A-F0-9]{8})<\/span>([\s\S]*?)<\/tr>/g)].map(m => ({ id: m[1], text: m[2], status: /<span class="tag">annulé<\/span>/.test(m[2]) ? 'annulé' : /<span class="tag">en attente<\/span>/.test(m[2]) ? 'en attente' : 'inscrit' }));
const idOf = (html, n) => rowsOf(html).find(r => r.text.includes(`</b> : Banc ${n}<br>`))?.id || '';

const server = external ? null : spawn(PHP, ['-S', `127.0.0.1:${portArg}`, '-t', root, path.join(root, 'index.php')], { stdio: 'ignore', env: { ...process.env, PHP_CLI_SERVER_WORKERS: '6' } });
try {
  for (let i = 0; i < 40; i++) { try { await fetch(base + '/'); break; } catch { await new Promise(r => setTimeout(r, 150)); } }
  if (!external) await fs.writeFile(path.join(root, '.env'), `ADMIN_TOKEN=${TOKEN}\n`);
  await admin.req('/_admin?token=' + TOKEN);
  // Registre remis à zéro par le back-office lui-même : tout envoi encore compté est annulé (vaut pour JSONL comme pour SQLite).
  let adm = await adminPage();
  for (const r of rowsOf(adm.text).filter(r => r.status !== 'annulé')) adm = await act(r.id, 'cancel');
  ok('départ : registre vide de toute inscription comptée', rowsOf(adm.text).every(r => r.status === 'annulé'), rowsOf(adm.text).length);

  // --- ce que la page lit
  const v0 = visitor(); let pg = await v0.page();
  ok('page : rendue sans erreur PHP, jamais servie depuis le cache statique', pg.status === 200 && !phpErr(pg.text) && !/sl-static/.test(pg.headers.get('x-sl-static') || ''), pg.status);
  ok('lecture : huit places restantes pour chaque séance', shown(pg.text, S1) === '8 places restantes' && shown(pg.text, S2) === '8 places restantes', `${shown(pg.text, S1)} / ${shown(pg.text, S2)}`);
  ok('formulaire : champs déclarés, jeton, pot de miel', /name="_form" value="atelier"/.test(pg.text) && /name="seance"/.test(pg.text) && /name="personnes"/.test(pg.text) && /name="website"/.test(pg.text));

  // --- places décomptées, par séance, selon le nombre de personnes
  let r = await visitor().submit(entry(1, S1, 3));
  ok('inscription de 3 personnes acceptée', success(r.text) && !phpErr(r.text), r.text.slice(r.text.indexOf('atelier-formulaire'), r.text.indexOf('atelier-formulaire') + 300));
  ok('lecture après envoi : 5 places pour cette séance, 8 pour l\'autre', shown(r.text, S1) === '5 places restantes' && shown(r.text, S2) === '8 places restantes', `${shown(r.text, S1)} / ${shown(r.text, S2)}`);

  // --- saisies refusées
  r = await visitor().submit(entry(2, S1, 0));
  ok('nombre de personnes nul → erreur sur le champ, rien d\'enregistré', /Indiquez un nombre entier, au moins 1/.test(r.text) && /has-error/.test(r.text) && shown(r.text, S1) === '5 places restantes');
  r = await visitor().submit(entry(2, S1, '2.5'));
  ok('nombre de personnes non entier → erreur sur le champ', /Indiquez un nombre entier, au moins 1/.test(r.text));
  r = await visitor().submit(entry(2, S1, 9));
  ok('plus de personnes que de places dans une séance → refus', /Au plus 8 par envoi/.test(r.text) && shown(r.text, S1) === '5 places restantes');
  r = await visitor().submit({ ...entry(2, 'Séance inventée', 1) });
  ok('séance hors de la liste déclarée → refus (jamais de groupe inventé par la requête)', /Choix invalide/.test(r.text));
  r = await visitor().submit({ ...entry(2, S1, 1), email: mail(1) });
  ok('une fois par adresse et par séance : second envoi refusé avec le message déclaré', /Cette adresse est déjà inscrite à cette séance/.test(r.text) && !success(r.text) && shown(r.text, S1) === '5 places restantes');
  r = await visitor().submit({ ...entry(2, S1, 1), email: mail(1).toUpperCase() });
  ok('unicité insensible à la casse de l\'adresse', /Cette adresse est déjà inscrite à cette séance/.test(r.text));
  r = await visitor().submit({ ...entry(3, S2, 2), email: mail(1) });
  ok('la même adresse s\'inscrit à l\'autre séance', success(r.text) && shown(r.text, S2) === '6 places restantes', shown(r.text, S2));

  // --- liste d'attente
  r = await visitor().submit(entry(4, S1, 6));
  ok('6 personnes pour 5 places → liste d\'attente, message déclaré, aucune place prise', waitlisted(r.text) && shown(r.text, S1) === '5 places restantes', shown(r.text, S1));
  r = await visitor().submit(entry(5, S1, 5));
  ok('5 personnes pour 5 places → acceptées, séance complète', success(r.text) && shown(r.text, S1) === 'Complet', shown(r.text, S1));
  pg = await visitor().page();
  ok('formulaire : la séance complète est signalée dans la liste de choix', new RegExp(S1 + ' — liste d(&#039;|\')attente</option>').test(pg.text) && !new RegExp(S2 + ' —').test(pg.text));
  r = await visitor().submit(entry(6, S1, 1));
  ok('séance complète : un envoi de plus va en liste d\'attente', waitlisted(r.text) && shown(r.text, S1) === 'Complet');

  // --- back-office
  adm = await adminPage();
  ok('back-office : état du registre par séance (8/8 et 2 en attente… 6/8)', adm.status === 200 && /Places<\/b> \(8 par seance\)/.test(adm.text) && new RegExp(S1 + ' <b>8/8</b> · 7 en attente').test(adm.text) && new RegExp(S2 + ' <b>2/8</b>').test(adm.text), (/<p class="reg-state">([\s\S]*?)<\/p>/.exec(adm.text) || [])[1]);
  let rows = rowsOf(adm.text);
  ok('back-office : chaque envoi porte son statut', rows.filter(x => x.status === 'inscrit').length === 3 && rows.filter(x => x.status === 'en attente').length === 2, JSON.stringify(rows.map(x => x.status)));
  adm = await act(idOf(adm.text, 4), 'seat');
  ok('back-office : donner la place sans place libre → refus expliqué, rien ne change', /Plus assez de places/.test(adm.text) && rowsOf(adm.text).find(x => x.id === idOf(adm.text, 4))?.status === 'en attente');
  adm = await act(idOf(adm.text, 1), 'cancel');
  pg = await visitor().page();
  ok('back-office : annuler une inscription de 3 libère 3 places, visibles sur la page', rowsOf(adm.text).find(x => x.id === idOf(adm.text, 1))?.status === 'annulé' && shown(pg.text, S1) === '3 places restantes', shown(pg.text, S1));
  adm = await act(idOf(adm.text, 6), 'seat');
  pg = await visitor().page();
  ok('back-office : donner la place à un envoi en attente qui tient dans les places libres', rowsOf(adm.text).find(x => x.id === idOf(adm.text, 6))?.status === 'inscrit' && shown(pg.text, S1) === '2 places restantes', shown(pg.text, S1));
  adm = await act(idOf(adm.text, 1), 'restore');
  ok('back-office : rétablir une inscription de 3 quand il reste 2 places → en liste d\'attente, et c\'est dit', /Rétabli en liste d(&#039;|')attente/.test(adm.text) && rowsOf(adm.text).find(x => x.id === idOf(adm.text, 1))?.status === 'en attente');
  r = await visitor().submit({ ...entry(7, S1, 1), email: mail(1) });
  ok('unicité : un envoi rétabli (même en attente) empêche de nouveau le doublon', /Cette adresse est déjà inscrite à cette séance/.test(r.text));
  const csv = await admin.req('/_admin/forms?store=' + STORE + '&csv=1');
  ok('back-office : l\'export CSV porte la colonne waiting', /text\/csv/.test(csv.headers.get('content-type') || '') && /waiting/.test(csv.text.split('\n')[0]), csv.text.split('\n')[0]);
  const forged = await visitor().req('/_admin/forms', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: enc({ _csrf: adminCsrf, store: STORE, id: idOf(adm.text, 5), act: 'cancel' }) });
  adm = await adminPage();
  ok('back-office : action sans session d\'administration refusée', forged.status !== 303 && rowsOf(adm.text).find(x => x.id === idOf(adm.text, 5))?.status === 'inscrit', forged.status);

  // --- douze inscriptions en même temps pour les six places restantes de la seconde séance
  const before = shown((await visitor().page()).text, S2);
  const racers = await Promise.all(Array.from({ length: 12 }, (_, i) => visitor()).map((v, i) => v.submit(entry(100 + i, S2, 1))));
  const won = racers.filter(x => success(x.text)).length, queued = racers.filter(x => waitlisted(x.text)).length, broken = racers.filter(x => phpErr(x.text) || x.status !== 200).length;
  pg = await visitor().page(); adm = await adminPage();
  const bad = racers.find(x => phpErr(x.text) || x.status !== 200);
  ok('simultané : six places, douze envois → six inscrits, six en attente, aucune erreur', before === '6 places restantes' && won === 6 && queued === 6 && broken === 0, `avant ${before} ; ${won} inscrits, ${queued} en attente, ${broken} erreurs${bad ? ` ; première erreur (HTTP ${bad.status}) : ${(/(Fatal error|Warning|Uncaught|Exception)[^\n]{0,260}/.exec(bad.text) || [bad.text.replace(/\s+/g, ' ').slice(0, 200)])[0]}` : ''}`);
  ok('simultané : le registre compte exactement huit places prises, jamais plus', shown(pg.text, S2) === 'Complet' && new RegExp(S2 + ' <b>8/8</b> · 6 en attente').test(adm.text), (/<p class="reg-state">([\s\S]*?)<\/p>/.exec(adm.text) || [])[1]);

  // --- règles sans liste d'attente : la fonction de la cible, appelée directement sur un registre d'essai (serveur local seulement)
  if (!external) {
    const tmp = path.join(os.tmpdir(), 'devanture-registre-' + process.pid + '.php');
    const lib = f => JSON.stringify(path.join(root, 'lib', f));
    await fs.writeFile(tmp, `<?php require ${lib('render.php')}; require ${lib('store.php')}; require ${lib('forms.php')};
$store = 'banc_refus_${process.pid}'; $rules = ['capacity' => ['max' => 3, 'qty' => 'n', 'message' => 'Complet pour cette date.'], 'unique' => ['fields' => ['email']]];
$out = []; $send = function (array $d) use ($store, $rules, &$out) { $out[] = sl_reg_submit($store, $rules, $d, function (bool $w) use ($store, $d) { sl_store_append($store, sl_form_record('banc', $d, $w ? ['waiting' => true] : [])); }); };
$send(['email' => 'a@x.fr', 'n' => '2']); $send(['email' => 'b@x.fr', 'n' => '2']); $send(['email' => 'A@x.fr ', 'n' => '1']); $send(['email' => 'c@x.fr', 'n' => '1']); $send(['email' => 'd@x.fr', 'n' => '1']);
$out[] = sl_reg_state($store, $rules);
// Places par groupe sans liste d'attente : la valeur complète est marquée et non sélectionnable dans le formulaire.
$s2 = $store . '_g'; $r2 = ['capacity' => ['max' => 1, 'by' => 'g']];
sl_reg_submit($s2, $r2, ['g' => 'Matin'], function (bool $w) use ($s2) { sl_store_append($s2, sl_form_record('banc', ['g' => 'Matin'])); });
$out[] = sl_fn_field(['fields' => [['name' => 'g', 'label' => 'Groupe', 'type' => 'select', 'required' => true, 'options' => ['Matin', 'Soir']]], 'data' => [], 'errors' => [], 'rules' => $r2, 'store' => $s2], 'g');
foreach ([$store, $s2] as $t) { $f = sl_store_dir() . '/' . $t . '.jsonl'; if (is_file($f)) @unlink($f); elseif (sl_store_kind() === 'sqlite') sl_store_db()->exec('DROP TABLE IF EXISTS ' . $t); @unlink(sl_store_dir() . '/.' . $t . '.lock'); }
echo json_encode($out, JSON_UNESCAPED_UNICODE);`);
    try {
      const o = JSON.parse(execFileSync(PHP, [tmp], { encoding: 'utf8' }));
      ok('sans liste d\'attente : 2 sur 3 acceptées', o[0].ok === true && o[0].waiting === false);
      ok('sans liste d\'attente : 2 de plus refusées, le message déclaré dit ce qui reste', o[1].ok === false && o[1].message === 'Complet pour cette date. Il reste une place.', JSON.stringify(o[1]));
      ok('unicité seule : même adresse (casse, espaces) refusée avec le message par défaut', o[2].ok === false && o[2].message === 'Vous êtes déjà inscrit.', JSON.stringify(o[2]));
      ok('sans liste d\'attente : la dernière place est prise, la suivante refusée sans reste', o[3].ok === true && o[4].ok === false && o[4].message === 'Complet pour cette date.', JSON.stringify(o[4]));
      ok('état du registre d\'essai : trois places prises, deux envois', o[5].total === 3 && o[5].entries === 2 && o[5].waiting_total === 0, JSON.stringify(o[5]));
      ok('formulaire sans liste d\'attente : la valeur complète est marquée « — complet » et non sélectionnable, l\'autre reste libre', /<option value="Matin" disabled>Matin — complet<\/option>/.test(o[6]) && /<option value="Soir">Soir<\/option>/.test(o[6]), o[6]);
    } catch (e) { ok('règles sans liste d\'attente : exécution PHP', false, String(e.stderr || e.message)); }
    finally { await fs.rm(tmp, { force: true }); }
  }

  // Le registre est laissé sans inscription comptée : un second passage du banc repart du même état.
  adm = await adminPage();
  for (const x of rowsOf(adm.text).filter(x => x.status !== 'annulé')) adm = await act(x.id, 'cancel');
  ok('fin : toutes les inscriptions du banc annulées, les seize places sont libres', shown((await visitor().page()).text, S1) === '8 places restantes' && shown((await visitor().page()).text, S2) === '8 places restantes');
  const csv2 = await admin.req('/_admin/forms?store=' + STORE + '&csv=1');
  ok('back-office : l\'export CSV garde les envois annulés, avec leur date d\'annulation', /cancelled;cancelled_at|cancelled_at/.test(csv2.text.split('\n')[0]) && csv2.text.includes(mail(1)), csv2.text.split('\n')[0]);
} catch (e) {
  ok('exécution du banc', false, e.stack || e.message);
} finally {
  server?.kill();
  if (!external) {
    await fs.rm(path.join(root, '.env'), { force: true });
    for (const f of [STORE + '.jsonl', 'events.jsonl', '.' + STORE + '.lock']) await fs.rm(path.join(root, 'data', f), { force: true });
  }
}

const passed = checks.filter(c => c.pass).length;
for (const c of checks) console.log(`${c.pass ? 'OK  ' : 'FAIL'} ${c.name}${c.detail && !c.pass ? ' — ' + c.detail : ''}`);
console.log(JSON.stringify({ registre: path.basename(path.dirname(root)), simultane: external ? 'serveur externe' : (process.platform === 'win32' ? 'séquentiel (php -S, un processus)' : 'php -S, 6 processus'), passed, total: checks.length }));
process.exit(passed === checks.length ? 0 : 1);
