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

// Vocabulaire dans l'atelier : mots natifs (carte, tarifs : compilés ci-dessus), puis un mot du site écrit dans le navigateur.
await S.loadExample(S.examples()[0]);
const mot = d => `mots:\n  note de bas:\n    description: Une ligne discrète en bas de section.\n    données:\n      texte: texte\n    forme:\n      - texte discret « note-de-bas »: ${d}\n`;
await S.vfs.write('/project/vocabulaire.yaml', mot('texte'));
await S.vfs.write('/project/components/pied/manifest.yaml', 'name: pied\ndescription: Une note en bas de page.\ndonnées:\n  note: texte\nforme:\n  - note de bas: note\nexample: |\n  - pied: { note: Devis gratuit. }\n');
await S.vfs.write('/project/pages/mentions-legales.page.yaml', S.vfs.read('/project/pages/mentions-legales.page.yaml').trimEnd() + '\n  - pied: { note: Devis gratuit. }\n');
let c = await S.check();
let b = await S.build('/project', '/out', { draft: true });
const php = S.vfs.has('/out/components/pied.php') ? await S.vfs.read('/out/components/pied.php') : '';
if (!c.ok || !b.ok || !php.includes('class="muted note-de-bas"')) { failed = true; console.error('vocabulaire du site KO', JSON.stringify((c.errors.length ? c.errors : b.errors || []).slice(0, 3), null, 1), php.slice(0, 200)); }
else console.log('vocabulaire : mot du site développé dans un composant compilé dans l\'atelier');
await S.vfs.write('/project/vocabulaire.yaml', mot('text'));
c = await S.check();
const e = c.errors || [];
if (c.ok || e.length !== 1 || e[0].code !== 'E_WORD' || e[0].path !== 'ligne 7') { failed = true; console.error('erreur de vocabulaire KO', JSON.stringify(e.slice(0, 3), null, 1)); }
else console.log('vocabulaire : erreur de mot à sa ligne (E_WORD, ligne 7), une seule fois');
process.exitCode = failed ? 1 : 0;
