// Intégration continue : le compilateur empaqueté pour le navigateur compile un exemple sous Node, comme l'atelier le ferait.
// Les fichiers de l'atelier sont placés dans le système de fichiers en mémoire (dans le navigateur, app.js les récupère par fetch),
// car un site qui embarque l'atelier (site.studio.enabled) les copie dans sa sortie.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const S = await import(path.join(ROOT, 'studio', 'sitec-browser.js').replace(/\\/g, '/').replace(/^([A-Za-z]):/, 'file:///$1:'));
await S.init();
for (const f of ['index.html', 'app.js', 'sitec-browser.js']) await S.vfs.write('/sitec/studio/' + f, await fs.readFile(path.join(ROOT, 'studio', f), 'utf8'));

let failed = false;
for (const ex of S.examples()) {
  await S.loadExample(ex);
  const c = await S.check();
  const b = await S.build('/project', '/out', { draft: true });
  if (!c.ok || !b.ok) { failed = true; console.error(ex, 'KO', JSON.stringify((c.errors.length ? c.errors : b.errors).slice(0, 3), null, 1)); continue; }
  console.log(`${ex} : ${c.pages} pages, ${b.files.length} fichiers compilés dans l'atelier${S.vfs.has('/out/lib/studio/project.json') ? ' (atelier embarqué)' : ''}`);
}
process.exitCode = failed ? 1 : 0;
