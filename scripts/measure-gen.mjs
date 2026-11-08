// Mesure du générateur sur une série fixe de descriptions, dans les deux formats (html : gabarit + feuille ; langage : données,
// forme, apparence) : composants valides, tours de réparation, problèmes par tour, tokens consommés, durée.
// Appelle réellement le modèle : clé d'API requise (ANTHROPIC_API_KEY, ou profil « ant auth login »).
// Usage : node scripts/measure-gen.mjs [--repetitions N] [--model id] [--sortie mesures.json]
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateComponent, DEFAULT_MODEL } from '../src/component-gen.js';
import { loadCatalog } from '../src/catalog.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
const REPS = Number(arg('--repetitions', 1));
const MODEL = arg('--model', DEFAULT_MODEL);
const OUT = arg('--sortie', null);

const DESCRIPTIONS = [
  ['horaires-speciaux', 'Un bandeau qui annonce des horaires exceptionnels (fêtes, congés) : un titre, une période avec date de début et de fin, un texte court et un lien facultatif.'],
  ['avis-defilants', 'Un carrousel d\'avis clients : note sur 5 en étoiles, texte, prénom et date ; boutons précédent et suivant ; défilement automatique lent ; titre facultatif et lien vers tous les avis.'],
  ['offres-comparees', 'Trois à quatre formules côte à côte : nom, prix, liste de points inclus, badge facultatif « le plus choisi », bouton par formule.'],
  ['equipe-cartes', 'Les membres de l\'équipe en grille : photo, prénom, rôle, une phrase de présentation ; titre et introduction facultatifs.'],
  ['questions-onglets', 'Des questions fréquentes rangées par thème en onglets : chaque thème a un nom et une liste de questions avec leur réponse.'],
  ['rappel-rapide', 'Un formulaire de demande de rappel : nom, téléphone, créneau préféré parmi matin, midi, soir ; message de confirmation ; titre et phrase d\'introduction.'],
];

const catalog = await loadCatalog();
const results = [];
for (let rep = 0; rep < REPS; rep++) for (const format of ['html', 'langage']) for (const [name, description] of DESCRIPTIONS) {
  const work = await fs.mkdtemp(path.join(os.tmpdir(), `sitec-mesure-${format}-`));
  await fs.cp(path.join(ROOT, 'examples', 'le-fournil'), work, { recursive: true, filter: s => !/[\\/](dist|node_modules|\.devanture)([\\/]|$)/.test(s) });
  await fs.rm(path.join(work, 'components', name), { recursive: true, force: true });
  const usage = { input: 0, output: 0 }, perRound = [];
  const t0 = Date.now();
  let r;
  try {
    r = await generateComponent({ root: work, name, description, catalog, model: MODEL, format, rounds: 3, onRound: x => perRound.push(x.problems.length + x.warnings.length), onUsage: u => { usage.input += u.input_tokens || 0; usage.output += u.output_tokens || 0; } });
  } catch (e) {
    if (/api.?key|auth|credential|401/i.test(e.message)) { console.error(`Pas d'accès à l'API (${e.message.split('\n')[0]}). Définissez ANTHROPIC_API_KEY ou connectez-vous (ant auth login), puis relancez.`); process.exit(2); }
    r = { ok: false, rounds: perRound.length, error: e.message };
  }
  const row = { format, composant: name, repetition: rep + 1, ok: r.ok, tours: r.rounds, problemes_par_tour: perRound, tokens_entree: usage.input, tokens_sortie: usage.output, secondes: Math.round((Date.now() - t0) / 1000), erreur: r.error || null };
  results.push(row);
  console.log(`${format.padEnd(8)} ${name.padEnd(20)} ${r.ok ? 'OK ' : 'ÉCHEC'} tours ${row.tours}  problèmes ${perRound.join('→') || '-'}  sortie ${usage.output} tokens  ${row.secondes} s`);
  await fs.rm(work, { recursive: true, force: true });
}
const sum = f => { const rows = results.filter(x => x.format === f); const n = rows.length || 1; return { composants: rows.length, valides: rows.filter(x => x.ok).length, tours_moyens: +(rows.reduce((a, x) => a + x.tours, 0) / n).toFixed(2), premier_jet_valide: rows.filter(x => x.ok && x.tours === 1).length, tokens_sortie_moyens: Math.round(rows.reduce((a, x) => a + x.tokens_sortie, 0) / n), secondes_moyennes: Math.round(rows.reduce((a, x) => a + x.secondes, 0) / n) }; };
const summary = { modele: MODEL, repetitions: REPS, html: sum('html'), langage: sum('langage') };
console.log(JSON.stringify(summary, null, 1));
if (OUT) await fs.writeFile(OUT, JSON.stringify({ summary, results }, null, 1));
