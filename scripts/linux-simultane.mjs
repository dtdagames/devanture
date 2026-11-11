// Reproduit en local ce que seule l'intégration continue montrait : un site compilé servi sous Linux par plusieurs processus
// PHP à la fois, puis un banc lancé contre lui. Sous Windows, « php -S » n'a qu'un processus : des envois simultanés y passent
// l'un après l'autre, et un défaut d'écritures concurrentes y reste invisible (v0.12.0 : « database is locked » pour dix
// inscriptions sur douze, vu seulement sous Linux).
// Le site est copié dans le conteneur, pas monté : un dossier Windows monté ralentit les écritures au point de les sérialiser.
// Usage : node scripts/linux-simultane.mjs <dossier-dist> <port> [banc.mjs] [--processus 6] [--fois 1] [--keep]
//   banc.mjs : un banc de scripts/ qui accepte une adresse à la place du port et ne lit pas les fichiers du site
//              (défaut : verify-registre.mjs). --fois : répète le banc, pour écarter un succès de hasard.
// Docker requis (image php:8.3-cli, avec PDO SQLite : le stockage est donc SQLite, comme chez la plupart des hébergeurs).
import { execFileSync, spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const opt = (name, def) => { const i = argv.indexOf(name); if (i < 0) return def; const v = argv[i + 1]; argv.splice(i, 2); return v; };
const flag = name => { const i = argv.indexOf(name); if (i < 0) return false; argv.splice(i, 1); return true; };
const workers = Number(opt('--processus', 6)), times = Number(opt('--fois', 1)), keep = flag('--keep');
const [dir, portArg, benchArg] = argv;
if (!dir || !/^\d+$/.test(String(portArg || '')) || !(workers >= 1) || !(times >= 1)) { console.error('usage: linux-simultane.mjs <dossier-dist> <port> [banc.mjs] [--processus 6] [--fois 1] [--keep]'); process.exit(2); }
const dist = path.resolve(dir), port = Number(portArg), bench = path.basename(benchArg || 'verify-registre.mjs');
const name = `devanture-linux-${port}`, base = `http://127.0.0.1:${port}`, ADMIN = 'apache-admin';
const docker = (args, o = {}) => execFileSync('docker', args, { stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8', ...o });
const quiet = args => { try { docker(args); } catch { /* absent */ } };

try { docker(['info']); } catch { console.error('Docker ne répond pas : lancez Docker Desktop (ou le démon docker), puis recommencez.'); process.exit(2); }
let code = 1;
try {
  quiet(['rm', '-f', name]);
  docker(['run', '-d', '--name', name, '-e', `PHP_CLI_SERVER_WORKERS=${workers}`, '-p', `${port}:${port}`, 'php:8.3-cli', 'sleep', '3600']);
  docker(['cp', dist, `${name}:/site`]);
  // Données d'exploitation remises à zéro, jeton du back-office connu du banc, droits ouverts au serveur.
  const drivers = docker(['exec', name, 'sh', '-c', `rm -rf /site/data/* /site/data/.[!.]* 2>/dev/null; printf 'ADMIN_TOKEN=${ADMIN}\\n' > /site/.env; chmod -R a+rwX /site; php -r 'echo implode(",", PDO::getAvailableDrivers());'`]).trim();
  docker(['exec', '-d', name, 'sh', '-c', `php -S 0.0.0.0:${port} -t /site /site/index.php > /tmp/php.log 2>&1`]);
  let up = false;
  for (let i = 0; i < 60 && !up; i++) { try { await fetch(base + '/'); up = true; } catch { await new Promise(r => setTimeout(r, 250)); } }
  if (!up) throw new Error('le serveur PHP du conteneur ne répond pas : ' + docker(['exec', name, 'sh', '-c', 'tail -5 /tmp/php.log']).trim());
  console.log(`${path.basename(path.dirname(dist))} servi sous Linux par ${workers} processus PHP (stockage : ${/sqlite/.test(drivers) ? 'SQLite' : 'JSONL'}), ${base}`);
  const run = () => new Promise(resolve => {
    const p = spawn(process.execPath, [path.join(ROOT, 'scripts', bench), dist, base], { stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, ADMIN_TOKEN: ADMIN } });
    let out = ''; p.stdout.on('data', d => { out += d; }); p.stderr.on('data', d => { out += d; });
    p.on('close', c => resolve({ code: c, out }));
  });
  let failed = 0;
  for (let i = 1; i <= times; i++) {
    const r = await run();
    const lines = r.out.split('\n').filter(Boolean), sum = lines.filter(l => l.startsWith('{')).pop() || '';
    for (const l of lines.filter(l => l.startsWith('FAIL'))) console.log(l);
    console.log(`${r.code === 0 ? 'OK  ' : 'FAIL'} ${bench}${times > 1 ? ` (passage ${i}/${times})` : ''} ${sum}`);
    if (r.code !== 0) failed++;
  }
  // Ce que PHP a écrit sur sa sortie d'erreur pendant les bancs, regroupé : une erreur fatale n'apparaît pas toujours dans la page.
  const errs = docker(['exec', name, 'sh', '-c', "grep -iE 'fatal|uncaught|exception|database is locked' /tmp/php.log | sed 's/^\\[[^]]*\\] //' | sort | uniq -c | sort -rn | head -5 || true"]).trim();
  if (errs) console.log('erreurs PHP relevées dans le conteneur :\n' + errs);
  code = failed ? 1 : 0;
  console.log(JSON.stringify({ linux: path.basename(path.dirname(dist)), banc: bench, processus: workers, passages: times, echecs: failed }));
} catch (e) {
  console.error('FAIL exécution : ' + String(e.stderr || e.message).trim().split('\n').slice(-3).join(' | '));
} finally {
  if (keep) console.log(`conteneur ${name} laissé en route sur ${base} (docker rm -f ${name} pour l'arrêter)`);
  else quiet(['rm', '-f', name]);
}
process.exit(code);
