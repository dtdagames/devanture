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

// Vocabulaire dans l'atelier : mots natifs (carte, tarifs : compilés ci-dessus), puis un mot du site écrit dans le navigateur,
// en documents comme le reste de l'exemple : vocabulaire.md, composant.md, et une section ajoutée à une page.
await S.loadExample(S.examples()[0]);
const mot = d => `# Vocabulaire\n\n## note de bas\nUne ligne discrète en bas de section.\n\n### Données\n- texte : texte\n\n### Forme\n- texte discret « note-de-bas » : ${d}\n`;
await S.vfs.write('/project/vocabulaire.md', mot('texte'));
await S.vfs.write('/project/components/pied/composant.md', '# pied\n\nUne note en bas de page.\n\n## Données\n- note : texte\n\n## Forme\n- note de bas : note\n\n## Exemple\n```\n## pied\nDevis gratuit.\n```\n');
await S.vfs.write('/project/pages/mentions-legales.md', S.vfs.read('/project/pages/mentions-legales.md').trimEnd() + '\n\n## pied\nDevis gratuit.\n');
// Le document a changé : la vérification s'arrête sur la lecture, l'atelier dit ce qui change, puis l'accepte.
let c = await S.check();
let rd = (await S.reading()).filter(x => x.status === 'à accepter');
if (c.ok || c.errors.length !== 1 || c.errors[0].code !== 'E_READING' || rd.length !== 1 || rd[0].file !== 'pages/mentions-legales.md' || !rd[0].changes.some(l => /^\+ .*pied/.test(l)) || rd[0].changes.some(l => l.startsWith('- '))) { failed = true; console.error('lecture à accepter KO', JSON.stringify(c.errors.slice(0, 3), null, 1), JSON.stringify(rd.map(x => ({ file: x.file, changes: x.changes })))); }
else console.log(`lecture : un document modifié arrête la vérification (E_READING) ; l'atelier montre ce qui change (${rd[0].changes.join(' ; ')})`);
const accepted = await S.acceptReading();
c = await S.check();
let b = await S.build('/project', '/out', { draft: true });
const php = S.vfs.has('/out/components/pied.php') ? await S.vfs.read('/out/components/pied.php') : '';
if (JSON.stringify(accepted) !== JSON.stringify(['lecture/pages/mentions-legales.page.yaml']) || (await S.reading()).some(x => x.status !== 'à jour')) { failed = true; console.error('lecture acceptée KO', JSON.stringify(accepted)); }
else console.log('lecture : acceptée dans l\'atelier, figée dans ' + accepted.join(', '));
if (!c.ok || !b.ok || !php.includes('class="muted note-de-bas"')) { failed = true; console.error('vocabulaire du site KO', JSON.stringify((c.errors.length ? c.errors : b.errors || []).slice(0, 3), null, 1), php.slice(0, 200)); }
else console.log('vocabulaire : mot du site développé dans un composant compilé dans l\'atelier');
await S.vfs.write('/project/vocabulaire.md', mot('text'));
c = await S.check();
const e = c.errors || [];
if (c.ok || e.length !== 1 || e[0].code !== 'E_WORD' || e[0].path !== 'ligne 10') { failed = true; console.error('erreur de vocabulaire KO', JSON.stringify(e.slice(0, 3), null, 1)); }
else console.log('vocabulaire : erreur de mot à sa ligne (E_WORD, ligne 10 de vocabulaire.md), une seule fois');
process.exitCode = failed ? 1 : 0;
