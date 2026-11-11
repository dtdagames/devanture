// Publie une version : pose l'étiquette vX.Y.Z et la pousse, seulement quand tout ce qui précède est vrai.
//   1. on est sur main, sans modification en attente, et main est exactement ce qui est sur le dépôt distant ;
//   2. la version de package.json est la même partout où elle est écrite (package-lock.json, src/init.js, CLAUDE.md,
//      CHANGELOG.md), et le journal a son entrée « ## vX.Y.Z — date — titre » ;
//   3. l'étiquette n'existe pas encore, ni ici ni sur le dépôt distant ;
//   4. l'intégration continue a tourné sur ce commit précis et s'est terminée en succès.
// La v0.12.0 avait été étiquetée avant son intégration continue, qui a échoué : une version à ne pas utiliser est restée
// publiée. Une étiquette publiée ne se déplace pas (les dépôts de sites l'épinglent) : on ne la pose donc qu'à la fin.
// Usage : node scripts/release.mjs [--attendre] [--dry-run]
//   --attendre : si l'intégration continue tourne encore, attend sa fin (20 minutes au plus) au lieu de s'arrêter ;
//   --dry-run  : fait tous les contrôles, dit ce qui serait fait, n'écrit rien.
// L'état de l'intégration continue est lu dans l'API publique de GitHub, sans jeton.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const dry = args.includes('--dry-run'), wait = args.includes('--attendre');
const unknown = args.filter(a => !['--dry-run', '--attendre'].includes(a));
if (unknown.length) { console.error(`option inconnue : ${unknown.join(' ')}\nusage: release.mjs [--attendre] [--dry-run]`); process.exit(2); }
const git = (...a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const refusals = [];
const check = (label, pass, why = '') => { console.log(`${pass ? 'OK    ' : 'REFUS '} ${label}${!pass && why ? ' — ' + why : ''}`); if (!pass) refusals.push(label); return pass; };

const version = JSON.parse(read('package.json')).version, tag = 'v' + version;
console.log(`Version à publier : ${tag}${dry ? ' (essai à blanc : rien ne sera écrit)' : ''}\n`);

// --- 1. l'état du dépôt
const branch = git('rev-parse', '--abbrev-ref', 'HEAD');
check('branche main', branch === 'main', `branche courante : ${branch} ; une version se publie depuis main, après fusion de la PR`);
const dirty = git('status', '--porcelain');
check('aucune modification en attente', !dirty, dirty.split('\n').slice(0, 5).join(' ; '));
let remoteOk = true; try { git('fetch', '--quiet', 'origin', 'main'); } catch (e) { remoteOk = false; check('dépôt distant joignable', false, String(e.stderr || e.message).trim().split('\n').pop()); }
const head = git('rev-parse', 'HEAD');
if (remoteOk) { const remote = git('rev-parse', 'origin/main'); check('main est à jour avec le dépôt distant', head === remote, `ici ${head.slice(0, 7)}, distant ${remote.slice(0, 7)} : poussez ou tirez d'abord`); }

// --- 2. la version, partout pareille
const lock = JSON.parse(read('package-lock.json'));
check('package-lock.json à la même version', lock.version === version && lock.packages?.['']?.version === version, `${lock.version} / ${lock.packages?.['']?.version}`);
const pin = `devanture#${tag}`;
check(`src/init.js épingle ${tag}`, read('src/init.js').includes(pin));
check(`CLAUDE.md épingle ${tag}`, read('CLAUDE.md').includes(pin));
const log = read('CHANGELOG.md');
check(`CHANGELOG.md épingle ${tag} en tête`, log.split('\n').slice(0, 6).join('\n').includes(pin));
const entry = new RegExp(`^## ${tag.replace(/\./g, '\\.')} — \\d{4}-\\d{2}-\\d{2} — \\S`, 'm').test(log);
check(`CHANGELOG.md a son entrée « ## ${tag} — date — titre »`, entry);
check('cette entrée est la première du journal', (/^## (v[\d.]+) /m.exec(log) || [])[1] === tag, `première entrée : ${(/^## (v[\d.]+) /m.exec(log) || [])[1]}`);

// --- 3. l'étiquette n'existe pas
let localTag = true; try { git('rev-parse', '-q', '--verify', `refs/tags/${tag}`); } catch { localTag = false; }
check(`l'étiquette ${tag} n'existe pas ici`, !localTag, 'une étiquette publiée ne se déplace pas : changez la version (package.json et les fichiers qui l\'épinglent)');
if (remoteOk) { const there = git('ls-remote', '--tags', 'origin', tag); check(`l'étiquette ${tag} n'existe pas sur le dépôt distant`, !there); }

// --- 4. l'intégration continue de ce commit
const slug = (/github\.com[:/]([^/]+\/[^/.\s]+)/.exec(git('remote', 'get-url', 'origin')) || [])[1];
const api = async p => { const r = await fetch(`https://api.github.com/repos/${slug}${p}`, { headers: { accept: 'application/vnd.github+json', 'user-agent': 'devanture-release' } }); if (!r.ok) throw new Error(`API GitHub ${r.status} sur ${p}`); return r.json(); };
const runOf = async () => (await api(`/actions/runs?head_sha=${head}&per_page=20`)).workflow_runs?.filter(r => r.name === 'Compilateur').sort((a, b) => b.run_number - a.run_number)[0] || null;
if (!slug) check('dépôt GitHub reconnu', false, 'origin n\'est pas une adresse github.com');
else if (remoteOk && !refusals.includes('main est à jour avec le dépôt distant')) {
  try {
    let run = await runOf();
    for (let i = 0; wait && (!run || run.status !== 'completed') && i < 40; i++) { if (i === 0) console.log(`       intégration continue ${run ? 'en cours' : 'pas encore démarrée'} sur ${head.slice(0, 7)} : attente…`); await new Promise(r => setTimeout(r, 30000)); run = await runOf(); }
    if (!run) check('intégration continue lancée sur ce commit', false, `aucun passage du flux « Compilateur » pour ${head.slice(0, 7)} : poussez main (ou fusionnez la PR), puis recommencez${wait ? '' : ' avec --attendre'}`);
    else if (run.status !== 'completed') check('intégration continue terminée', false, `encore en cours (${run.html_url}) : recommencez plus tard, ou avec --attendre`);
    else if (run.conclusion !== 'success') {
      // Étapes en échec, pour dire où regarder sans ouvrir le journal.
      const jobs = (await api(`/actions/runs/${run.id}/jobs`)).jobs || [];
      const failed = jobs.flatMap(j => (j.steps || []).filter(s => s.conclusion === 'failure').map(s => `${j.name} › ${s.name}`));
      check('intégration continue en succès', false, `${run.conclusion} (${run.html_url})${failed.length ? ' ; étapes en échec : ' + failed.join(' ; ') : ''}`);
    } else check(`intégration continue en succès sur ${head.slice(0, 7)}`, true);
  } catch (e) { check('intégration continue lisible', false, e.message); }
} else check('intégration continue contrôlée', false, 'non contrôlée tant que main n\'est pas à jour avec le dépôt distant');

// --- décision
// (process.exitCode plutôt que process.exit : sous Windows, sortir pendant que la connexion à l'API se referme fait planter Node.)
if (refusals.length) { console.log(`\n${tag} n'est pas publiée : ${refusals.length} contrôle${refusals.length > 1 ? 's' : ''} en refus.`); process.exitCode = 1; }
else if (dry) console.log(`\nTous les contrôles passent. Sans --dry-run : git tag ${tag} ${head.slice(0, 7)} puis git push origin ${tag}.`);
else {
  git('tag', tag, head);
  try { git('push', 'origin', tag); console.log(`\n${tag} publiée sur ${head.slice(0, 7)}. Les dépôts de sites peuvent l'épingler : github:${slug}#${tag}`); }
  catch (e) { git('tag', '-d', tag); console.error(`\nL'étiquette n'a pas pu être poussée (retirée ici) : ${String(e.stderr || e.message).trim().split('\n').pop()}`); process.exitCode = 1; }
}
