// Banc du format document (prototype) : un composant écrit en français dans document.md, lu sans modèle.
//   - identité : le site compilé depuis le document de l'exemple le-fournil est le même, fichier par fichier, que celui compilé
//     depuis le manifeste écrit à la main qu'il remplace (scripts/reference/atelier.manifest.yaml) ;
//   - tolérance : des reformulations donnent la même lecture ;
//   - garde-fou 1 : un mot sans rôle fait refuser la phrase ; garde-fou 2 : deux lectures possibles, c'est une erreur ;
//     garde-fou 3 : la lecture est figée, et tout changement arrête la compilation jusqu'à ce qu'on l'accepte ;
//   - jamais deviné : un nombre, une négation, un destinataire.
// Usage : node scripts/verify-document.mjs
import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';
import { encode } from 'gpt-tokenizer';
import { readDocument } from '../src/lang/document.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITEC = path.join(ROOT, 'bin', 'sitec.js');
const checks = [];
const ok = (n, pass, detail = '') => { checks.push({ name: n, pass: !!pass, detail: String(detail).slice(0, 600) }); };
const run = (...args) => { try { return { code: 0, out: execFileSync(process.execPath, [SITEC, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) }; } catch (e) { return { code: e.status ?? 1, out: (e.stdout || '') + (e.stderr || '') }; } };
const jsonLines = out => out.split('\n').filter(Boolean).map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'sitec-document-'));
const copy = async name => { const d = path.join(tmp, name); await fs.cp(path.join(ROOT, 'examples', 'le-fournil'), d, { recursive: true, filter: s => !/[\\/](dist|node_modules)([\\/]|$)/.test(s) }); return d; };
const walk = async d => (await fs.readdir(d, { withFileTypes: true, recursive: true })).filter(e => e.isFile()).map(e => path.relative(d, path.join(e.parentPath ?? e.path, e.name)).split(path.sep).join('/'));

// Un document de base : champs et registre dits ; chaque essai y ajoute une phrase (ligne 7).
const BASE = `# Atelier

Inscription à un atelier.

Pour s'inscrire, le visiteur choisit sa séance (Matin ou Soir), indique le nombre de personnes (par exemple 2), son nom et son e-mail.
Les inscriptions sont rangées dans le registre « ateliers ».
`;
const read = (extra, base = BASE) => { const r = readDocument(base + extra + '\n', { name: 'atelier' }); return { ...r, form: r.manifest.fonctionnement?.formulaire || {}, err: r.errors.map(e => e.message).join(' | '), hint: r.errors.map(e => e.hint || '').join(' | ') }; };
const refused = (r, re) => r.errors.length > 0 && re.test(r.err);

try {
  // --- identité : document et manifeste écrit à la main donnent le même site
  const doc = await copy('document'), ref = await copy('reference');
  const adir = path.join(ref, 'components', 'atelier');
  await fs.rm(path.join(adir, 'document.md')); await fs.rm(path.join(adir, 'lecture.yaml'));
  await fs.copyFile(path.join(ROOT, 'scripts', 'reference', 'atelier.manifest.yaml'), path.join(adir, 'manifest.yaml'));
  const b1 = run('build', doc, '--out', path.join(tmp, 'dist-document')), b2 = run('build', ref, '--out', path.join(tmp, 'dist-reference'));
  ok('identité : les deux sites compilent', b1.code === 0 && b2.code === 0, b1.out.slice(-300) + b2.out.slice(-300));
  const fa = await walk(path.join(tmp, 'dist-document')), fb = await walk(path.join(tmp, 'dist-reference'));
  // Seule l'heure de compilation diffère (site.json), et donc l'empreinte de ce fichier dans manifest.sha256.json.
  const clean = (f, t) => (f === 'site.json' ? t.replace(/"generated_at":\s*"[^"]*"/, '"generated_at":""') : t);
  const differ = [];
  for (const f of fa) { if (f === 'manifest.sha256.json') continue; const x = await fs.readFile(path.join(tmp, 'dist-document', f)), y = await fs.readFile(path.join(tmp, 'dist-reference', f)).catch(() => null); if (!y || clean(f, x.toString('latin1')) !== clean(f, y.toString('latin1'))) differ.push(f); }
  ok(`identité : ${fa.length} fichiers compilés, les mêmes des deux côtés`, fa.length > 40 && fa.join() === fb.join(), `${fa.length} / ${fb.length}`);
  ok('identité : chaque fichier compilé depuis le document est identique à celui du manifeste écrit à la main', differ.length === 0, differ.join(', '));
  const lecture = YAML.parse(await fs.readFile(path.join(doc, 'components', 'atelier', 'lecture.yaml'), 'utf8')), manual = YAML.parse(await fs.readFile(path.join(ROOT, 'scripts', 'reference', 'atelier.manifest.yaml'), 'utf8'));
  const blocks = ['name', 'description', 'données', 'fonctionnement', 'forme', 'apparence', 'intents'];
  ok('identité : la lecture figée dit la même chose que le manifeste, bloc par bloc', blocks.every(k => JSON.stringify(lecture[k]) === JSON.stringify(manual[k])), blocks.filter(k => JSON.stringify(lecture[k]) !== JSON.stringify(manual[k])).join(', '));

  // --- la commande lire, component show, cas de test
  let r = run('lire', doc, '--json');
  const rep = jsonLines(r.out)[0]?.documents?.[0];
  ok('lire : chaque phrase du document de l\'exemple a une lecture, la lecture est à jour', r.code === 0 && rep?.status === 'à jour' && rep.sentences.length === 10 && rep.sentences.every(x => x.said && !x.error), r.out.slice(0, 300));
  ok('lire : une phrase peut porter deux tournures (« … rangées dans le registre « ateliers » et nous sommes prévenus par e-mail »)', rep?.sentences.some(x => x.tournure === 'registre + prevenir'), rep?.sentences.map(x => x.tournure).join(', '));
  r = run('component', 'show', doc, 'atelier');
  ok('component show : format document, lecture phrase par phrase puis ce qu\'elle devient', /format document/.test(r.out) && /document\.md → lecture\.yaml/.test(r.out) && /→ formulaire : places = 8 par seance, comptées par personnes/.test(r.out) && /lecture identique à celle qui a été acceptée/.test(r.out) && /sl_source|places ← état du registre/.test(r.out), r.out.slice(0, 300));
  r = run('test', doc);
  ok('test : les cas du composant se rendent comme avant', r.code === 0 && jsonLines(r.out).find(x => 'cases' in x)?.failed === 0, r.out.slice(-300));

  // --- garde-fou 3 : la lecture figée
  const dfile = path.join(doc, 'components', 'atelier', 'document.md'), lfile = path.join(doc, 'components', 'atelier', 'lecture.yaml');
  const d0 = await fs.readFile(dfile, 'utf8'), l0 = await fs.readFile(lfile, 'utf8');
  const errs = dir => jsonLines(run('check', dir).out).filter(e => e.code && !e.code.startsWith('W_'));
  await fs.writeFile(dfile, d0.replace('Il y a 8 places par séance', 'Il y a 10 places par séance'));
  let e = errs(doc);
  ok('garde-fou 3 : document modifié sans relecture → la compilation s\'arrête et dit ce qui a changé', e.length === 1 && e[0].code === 'E_READING' && /lecture\.yaml$/.test(e[0].file) && /« places: 8 par seance, comptées par personnes » est maintenant lu « places: 10 par seance, comptées par personnes »/.test(e[0].message) && /sitec lire/.test(e[0].hint || ''), JSON.stringify(e).slice(0, 500));
  r = run('lire', doc);
  ok('garde-fou 3 : lire montre le changement et sort en erreur tant qu\'il n\'est pas accepté', r.code === 1 && /La lecture a changé/.test(r.out) && (await fs.readFile(lfile, 'utf8')) === l0, r.out.slice(-300));
  r = run('lire', doc, '--accepter');
  ok('garde-fou 3 : --accepter fige la nouvelle lecture, le site se vérifie de nouveau', r.code === 0 && /places: 10 par seance/.test(await fs.readFile(lfile, 'utf8')) && errs(doc).length === 0, r.out.slice(-300));
  await fs.writeFile(dfile, d0); await fs.writeFile(lfile, l0.replace('une fois par: email, seance', 'une fois par: email'));
  e = errs(doc);
  ok('garde-fou 3 : une lecture qui ne correspond plus au document (lecteur mis à jour, fichier retouché) est refusée', e.length === 1 && e[0].code === 'E_READING' && /« une fois par: email » est maintenant lu « une fois par: email, seance »/.test(e[0].message), JSON.stringify(e).slice(0, 400));
  await fs.rm(lfile);
  e = errs(doc);
  ok('garde-fou 3 : sans lecture acceptée, rien ne compile', e.length === 1 && e[0].code === 'E_READING' && /lecture absente/.test(e[0].message) && run('build', doc, '--out', path.join(tmp, 'x')).code === 1, JSON.stringify(e).slice(0, 300));
  await fs.writeFile(lfile, l0);
  await fs.writeFile(dfile, d0.replace('Il y a 8 places par séance, comptées par personnes.', 'Il y a 8 places par séance, comptées par personnes, sauf le dimanche.'));
  e = errs(doc);
  ok('une phrase refusée → E_DOCUMENT à la ligne du document, avec la tournure la plus proche', e.length === 1 && e[0].code === 'E_DOCUMENT' && /document\.md$/.test(e[0].file) && e[0].path === 'ligne 20' && /Tournure la plus proche/.test(e[0].hint || ''), JSON.stringify(e).slice(0, 400));
  r = run('lire', doc, '--accepter');
  ok('une phrase refusée : --accepter n\'écrit rien', r.code === 1 && (await fs.readFile(lfile, 'utf8')) === l0 && /rien n'est écrit tant qu'une phrase est refusée/.test(r.out), r.out.slice(-300));
  await fs.writeFile(dfile, d0);
  await fs.copyFile(path.join(ROOT, 'scripts', 'reference', 'atelier.manifest.yaml'), path.join(doc, 'components', 'atelier', 'manifest.yaml'));
  e = errs(doc);
  ok('document.md et manifest.yaml ensemble : une seule source', e.some(x => x.code === 'E_DOCUMENT' && /un composant n'a qu'une source/.test(x.message)), JSON.stringify(e).slice(0, 300));
  await fs.rm(path.join(doc, 'components', 'atelier', 'manifest.yaml'));

  // --- tolérance : des reformulations, la même lecture
  const same = (list, pick, expected) => { const got = list.map(x => { const q = read(x); return q.errors.length ? 'REFUS ' + q.err.slice(0, 80) : pick(q); }); return { pass: got.every(g => g === expected), detail: list.map((x, i) => `${x} → ${got[i]}`).filter((x, i) => got[i] !== expected).join(' | ') }; };
  let t = same(['Il y a 8 places par séance.', 'Séances limitées à 8 places.', 'Huit places par séance.', 'Chaque séance dispose de 8 places au maximum.', 'Au plus 8 places pour chaque séance.', 'Il y a 8 inscriptions par séance.', 'par séance, il y a 8 places'], q => q.form.places, '8 par seance');
  ok('tolérance : sept façons de dire « 8 places par séance » (ordre, synonymes, nombre en lettres)', t.pass, t.detail);
  t = same(['Il y a 8 places par séance, comptées par personnes.', 'Chaque séance accueille 8 personnes au plus.', 'Il y a 8 places par séance, selon le nombre de personnes.'], q => q.form.places, '8 par seance, comptées par personnes');
  ok('tolérance : « 8 personnes » compte les places par le champ nombre du formulaire', t.pass, t.detail);
  t = same(['Une même adresse e-mail ne s\'inscrit qu\'une fois par séance.', 'Chaque adresse e-mail ne peut s\'inscrire qu\'une seule fois par séance.', 'Une seule inscription par adresse e-mail et par séance.', 'Un e-mail ne s\'inscrit pas deux fois par séance.'], q => q.form['une fois par'], 'email, seance');
  ok('tolérance : quatre façons de dire « une fois par adresse et par séance » (« ne … que » et « pas deux fois » ne sont pas des refus)', t.pass, t.detail);
  t = same(['Nous sommes prévenus par e-mail.', 'L\'équipe est avertie par courriel.', 'Nous recevons un e-mail à chaque inscription.'], q => q.form['prévient par e-mail'], 'oui');
  ok('tolérance : trois façons de dire que le site est prévenu', t.pass, t.detail);
  let q = read('Il y a 8 places par séance.\nQuand une séance est complète, l\'inscription passe en file d\'attente.');
  ok('tolérance : liste d\'attente dite autrement', !q.errors.length && q.form["liste d'attente"] === 'oui', q.err);
  q = read('Il y a 8 places par séance.\nQuand une séance est complète, l\'inscription va en liste d\'atente.');
  ok('tolérance : une faute de frappe est lue, et c\'est dit dans la lecture', !q.errors.length && q.form["liste d'attente"] === 'oui' && /lu comme « liste d'attente »/.test(JSON.stringify(q.trace)), q.err + JSON.stringify(q.trace.slice(-1)));
  q = read('Il y a 8 places par séance.\nQuand une séance est complète, l\'inscription va en liste d\'attente. Le visiteur lit alors : « Vous êtes en attente. »');
  ok('tolérance : un message dit dans la phrase suivante complète la règle qui précède', !q.errors.length && q.form["liste d'attente"] === 'Vous êtes en attente.', q.err);
  q = read('', BASE.replace('son nom et son e-mail.', 'son nom, son adresse e-mail et son téléphone ; il peut laisser un message et la date souhaitée.'));
  ok('champs : noms connus, champ nombre, choix, exemple, champs facultatifs après « il peut »', !q.errors.length && JSON.stringify(q.form.champs) === JSON.stringify({ seance: 'choix, un parmi Matin, Soir — Séance', personnes: 'nombre — Nombre de personnes (ex. 2)', name: null, email: null, phone: null, message: 'facultatif', date_souhaitee: 'date, facultatif — Date souhaitée' }), q.err + JSON.stringify(q.form.champs));
  const FIELDS = "Pour s'inscrire, le visiteur choisit sa séance (Matin ou Soir), indique le nombre de personnes (par exemple 2), son nom et son e-mail.";
  q = read('', BASE.replace(FIELDS, "Le visiteur remplit un formulaire composé de la séance (Matin, Soir), du nom, de l'e-mail, du nombre de personnes, par exemple 2, et d'un message libre, ce dernier étant facultatif."));
  ok('champs : énumération à articles contractés, exemple sans parenthèses, « ce dernier étant facultatif » (le formulaire n\'est pas un champ)', !q.errors.length && JSON.stringify(q.form.champs) === JSON.stringify({ seance: 'choix, un parmi Matin, Soir — Séance', name: null, email: null, personnes: 'nombre — Nombre de personnes (ex. 2)', message: 'facultatif' }), q.err + JSON.stringify(q.form.champs));
  q = read('', BASE.replace(FIELDS, 'Le visiteur choisit sa séance (Matin ou Soir), par exemple Matin, et indique son nom.'));
  ok('champs : un exemple après un choix déjà donné entre parenthèses est refusé', refused(q, /a déjà ses valeurs entre parenthèses/), q.err + JSON.stringify(q.form.champs));
  // Un mot qui désigne deux champs (« paniers » : la taille du panier, le nombre de paniers souhaités) n'en choisit aucun.
  const PANIERS = BASE.replace(FIELDS, 'Le visiteur choisit la taille du panier (Petit, Grand), indique son nom, son e-mail et le nombre de paniers souhaités (par exemple 1).');
  q = read('Il y a 40 places, comptées par paniers.', PANIERS);
  ok('garde-fou 2 : un mot qui désigne deux champs fait refuser la phrase, les deux champs cités', refused(q, /« paniers » désigne 2 champs du formulaire \(taille_panier, paniers_souhaites\)/) && !q.form.places, q.err + JSON.stringify(q.form.places));
  q = read('Il y a 40 places, comptées par paniers souhaités.\nLa taille du panier et le nombre de paniers sont obligatoires, le nom est facultatif.', PANIERS);
  ok('champs : désignés par les mots de leur libellé ; un voisin tranche (« paniers souhaités », « la taille du panier », « le nombre de paniers »)', !q.errors.length && q.form.places === '40, comptées par paniers_souhaites' && q.form.champs.name === 'facultatif' && !/facultatif/.test(q.form.champs.taille_panier + q.form.champs.paniers_souhaites), q.err + JSON.stringify(q.form));

  // --- garde-fou 1 : tout mot doit être expliqué
  q = read('Il y a 8 places par séance pendant les vacances.');
  ok('garde-fou 1 : des mots sans rôle font refuser la phrase (elle n\'est pas lue « 8 places par séance »)', refused(q, /mots non compris : pendant, vacances/) && !q.form.places, q.err);
  q = read('Il y a 8 places par salle.');
  ok('garde-fou 1 : un champ cité qui n\'existe pas est nommé', refused(q, /« salle » n'est pas un champ du formulaire \(champs : seance, personnes, name, email\)/), q.err);
  q = read('Il y a 8 places par séance, comptées selon le nombre de visiteurs.\nQuand une séance est complète, l\'inscription est refusée.\nUn même e-mail ne s\'inscrit qu\'une fois par séance, et dans ce cas le visiteur voit le message « Déjà inscrit. »', BASE.replace('le nombre de personnes (par exemple 2)', 'le nombre de visiteurs (par exemple 2)'));
  ok('un mot à double rôle : « le visiteur voit » est la personne, « le nombre de visiteurs » est le champ', !q.errors.length && q.form.places === '8 par seance, comptées par visiteurs' && q.form['une fois par'] === 'email, seance', q.err + JSON.stringify(q.form));
  q = read('Un même numéro de téléphone ne s\'inscrit qu\'une fois.');
  ok('garde-fou 1 : « numéro de téléphone » n\'est pas ignoré quand le formulaire n\'a pas ce champ', refused(q, /« numéro de téléphone » n'est pas un champ du formulaire/) && !q.form['une fois par'], q.err);
  q = read('Le formulaire est joli.');
  ok('garde-fou 1 : une phrase sans tournure connue est refusée', refused(q, /phrase non comprise/), q.err);

  // --- garde-fou 2 : une lecture doit gagner seule
  q = read('Le visiteur lit : « Merci. »');
  ok('garde-fou 2 : un message sans moment → trois lectures montrées, aucune choisie', refused(q, /phrase ambiguë/) && /Trois lectures possibles/.test(q.hint) && !q.form.confirmation, q.err);
  q = read('Pas plus de 8 participants par séance.');
  ok('garde-fou 2 : « 8 participants », avec un champ « nombre de personnes » → deux lectures montrées', refused(q, /peut se lire de deux façons : 8 inscriptions .* ; ou 8 places comptées par personnes/) && !q.form.places, q.err);
  q = read('Pas plus de 8 participants par séance.', BASE.replace(', indique le nombre de personnes (par exemple 2), son nom', ', indique son nom'));
  ok('garde-fou 2 : la même phrase sans champ nombre n\'a qu\'une lecture', !q.errors.length && q.form.places === '8 par seance', q.err);
  q = read('Il y a 8 places par séance.\nQuand une séance est complète, l\'inscription va en liste d\'attente.\nQuand une séance est complète, l\'inscription est refusée.');
  ok('contradiction entre deux phrases : liste d\'attente ou refus', refused(q, /contradiction avec la ligne 8/), q.err);

  // --- jamais deviné : nombre, négation, destinataire
  q = read('Il y a 8 ou 10 places par séance.');
  ok('nombre : deux nombres, aucun n\'est choisi', refused(q, /un seul nombre attendu \(lus : 8, 10\)/), q.err);
  q = read('Il y a 8 places par séance, sauf le dimanche.');
  ok('négation : « sauf » n\'est jamais ignoré', refused(q, /la négation « sauf » n'a pas de sens connu ici/) && !q.form.places, q.err);
  q = read('Nous ne sommes pas prévenus par e-mail.');
  ok('négation : dite là où elle a un sens, elle est lue (« ne sommes pas prévenus » → non)', !q.errors.length && q.form['prévient par e-mail'] === 'non', q.err);
  q = read('Il y a 8 places par séance.\nIl n\'y a pas de liste d\'attente.');
  ok('négation : « pas de liste d\'attente » n\'est pas lu « liste d\'attente »', !q.errors.length && q.form["liste d'attente"] === 'non', q.err + JSON.stringify(q.form));
  q = read('Le visiteur est prévenu par e-mail.');
  ok('destinataire : prévenir le visiteur n\'est pas lu comme prévenir le site', refused(q, /le visiteur ne reçoit pas d'e-mail dans cette version/) && q.form['prévient par e-mail'] === undefined, q.err);
  q = read('On est prévenu par e-mail.');
  ok('destinataire : « on est prévenu » ne dit pas qui, la phrase est refusée', refused(q, /qui est prévenu \?/), q.err);

  // --- ce qu'une phrase cite doit exister ailleurs
  q = read('Les places restantes de chaque séance sont affichées, une ligne par séance.');
  ok('cohérence : afficher des places sans avoir dit combien il y en a', refused(q, /ne dit pas combien il y en a/), q.err);
  q = read('Il y a 8 places.\nLes places restantes de chaque séance sont affichées, une ligne par séance.');
  ok('cohérence : afficher par séance des places qui ne se comptent pas par séance', refused(q, /les places ne se comptent pas par seance/), q.err);
  q = readDocument('# Compteur\n\nUn titre.\n\nIl y a 8 places.\n', { name: 'compteur' });
  ok('cohérence : une règle de formulaire sans la phrase des champs', q.errors.some(x => /ne dit pas quels champs le visiteur remplit/.test(x.message)), JSON.stringify(q.errors).slice(0, 300));
  q = read('', BASE.replace('Les inscriptions sont rangées dans le registre « ateliers ».', ''));
  ok('cohérence : des champs sans registre', refused(q, /ne dit pas où ranger les envois/), q.err);

  // --- mesure : ce qu'on écrit, en tokens (hors exemple et mots-clés, communs aux deux formats)
  const mtext = await fs.readFile(path.join(ROOT, 'scripts', 'reference', 'atelier.manifest.yaml'), 'utf8'), m = YAML.parse(mtext);
  const yamlPart = ['description', 'données', 'fonctionnement', 'forme', 'apparence'].map(k => YAML.stringify({ [k]: m[k] }, { lineWidth: 0 })).join('');
  const docPart = d0.replace(/^Mots-clés.*$/m, '').trim() + '\n';
  const tk = { manifeste: encode(yamlPart).length, document: encode(docPart).length };
  console.log(`mesure : même composant, ${tk.manifeste} tokens en manifeste YAML, ${tk.document} tokens en document (${Math.round((tk.document / tk.manifeste - 1) * 100)} %)`);
  ok('mesure : les deux écritures sont comptées', tk.manifeste > 100 && tk.document > 100, JSON.stringify(tk));
} catch (e) {
  ok('exécution du banc', false, e.stack || e.message);
} finally {
  await fs.rm(tmp, { recursive: true, force: true });
}

const passed = checks.filter(c => c.pass).length;
for (const c of checks) console.log(`${c.pass ? 'OK  ' : 'FAIL'} ${c.name}${c.detail && !c.pass ? ' — ' + c.detail : ''}`);
console.log(JSON.stringify({ banc: 'document', passed, total: checks.length }));
process.exit(passed === checks.length ? 0 : 1);
