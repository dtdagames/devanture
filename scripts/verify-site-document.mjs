// Banc du format document du site (prototype) : site.md et pages/<id>.md à la place du YAML, lus sans modèle d'après les
// données que chaque composant déclare.
//   - identité : examples/garnier-document (documents) vaut examples/garnier-associes (YAML) : mêmes données, mêmes fichiers
//     servis tels quels, même HTML rendu page par page ;
//   - aller-retour : chaque site d'exemple écrit en documents par le rédacteur se relit à l'identique ;
//   - règles de lecture : titre, texte libre, « Nom : valeur », lien seul, puces et leurs champs dans l'ordre, puces en retrait ;
//   - garde-fou 1 : une ligne sans rôle est refusée, à sa ligne ; garde-fou 3 : la lecture est figée dans lecture/, tout
//     changement arrête la compilation jusqu'à « sitec lire --accepter » ;
//   - commandes : rediger, lire, explain ; mesure : les documents sont plus courts que le YAML sur chaque exemple.
// Usage : node scripts/verify-site-document.mjs [port]     (PHP : PHP_BIN, sinon php ; sans PHP, la comparaison du rendu échoue)
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadCatalog } from '../src/catalog.js';
import { loadProject } from '../src/load.js';
import { componentSchemas, readPageDocument, readSiteDocument, writePageDocument, writeSiteDocument, canon, parseLink, COMPONENT_NAMES, PROP_NAMES } from '../src/lang/site-document.js';
import { THEME_PRESETS } from '../src/emit/php/css.js';
import { SITE_SCHEMA } from '../src/validate.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITEC = path.join(ROOT, 'bin', 'sitec.js');
const port = Number(process.argv[2]) || 8976;
const checks = [];
const ok = (n, pass, detail = '') => { checks.push({ name: n, pass: !!pass, detail: String(detail).slice(0, 700) }); };
const run = (...args) => { try { return { code: 0, out: execFileSync(process.execPath, [SITEC, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) }; } catch (e) { return { code: e.status ?? 1, out: (e.stdout || '') + (e.stderr || '') }; } };
const jsonLines = out => out.split('\n').filter(Boolean).map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'sitec-site-document-'));
const same = (a, b) => JSON.stringify(canon(a)) === JSON.stringify(canon(b));
// À la conversion d'un site YAML, un nombre vaut son écriture (1999 et « 1999 ») : un document ne dit pas la différence.
const sameLoose = (a, b) => JSON.stringify(canon(a, true)) === JSON.stringify(canon(b, true));
const groups = SITE_SCHEMA.properties.site.properties;
const tokens = Object.keys(THEME_PRESETS.clair);
const catalog = await loadCatalog();
const schemas = new Map(catalog.list().map(c => [c.name, c.manifest.props]));
const page = body => readPageDocument(`# Titre\n\nAdresse : /x\n\n${body}\n`, { schemas });
const first = r => { const s = r.data.sections?.[0]; return s ? s[Object.keys(s)[0]] : null; };
const refused = (r, re, line) => r.errors.some(e => re.test(e.message) && (line === undefined || e.line === line));

try {
  // --- identité : l'exemple en documents vaut l'exemple en YAML
  const yamlSite = await loadProject(path.join(ROOT, 'examples', 'garnier-associes')), docSite = await loadProject(path.join(ROOT, 'examples', 'garnier-document'));
  ok('identité : l\'exemple en documents est lu sans erreur, lecture à jour', docSite.documents.site && docSite.documents.pages.length === 6 && !docSite.loadErrors.length, JSON.stringify(docSite.loadErrors).slice(0, 400));
  ok('identité : le site lu de site.md vaut site.yaml', same(docSite.site, yamlSite.site), JSON.stringify(canon(docSite.site)).slice(0, 300));
  const strip = d => { const { page: _p, ...rest } = d; return rest; };
  const diffPages = yamlSite.pages.filter((p, i) => docSite.pages[i]?.id !== p.id || !same(strip(p.data), docSite.pages[i].data)).map(p => p.id);
  ok('identité : chaque page lue de pages/<id>.md vaut son .page.yaml, dans le même ordre', yamlSite.pages.length === 6 && !diffPages.length, diffPages.join(', '));
  const a = path.join(tmp, 'dist-yaml'), b = path.join(tmp, 'dist-documents');
  let r = run('build', path.join(ROOT, 'examples', 'garnier-associes'), '--out', a);
  const r2 = run('build', path.join(ROOT, 'examples', 'garnier-document'), '--out', b);
  ok('identité : les deux sites compilent', r.code === 0 && r2.code === 0, r.out + r2.out);
  const walk = async d => (await fs.readdir(d, { withFileTypes: true, recursive: true })).filter(e => e.isFile()).map(e => path.relative(d, path.join(e.parentPath ?? e.path, e.name)).split(path.sep).join('/')).sort();
  const fa = await walk(a), fb = await walk(b);
  // Les pages compilées gardent l'ordre des données de la source (celui de la déclaration, en document) : comparées par leur rendu.
  const skip = f => /^pages\/.*\.php$/.test(f) || f === 'manifest.sha256.json' || f === 'site.json' || /^(data|cache)\//.test(f);
  const differ = [];
  for (const f of fa.filter(f => !skip(f))) { const x = await fs.readFile(path.join(a, f)), y = await fs.readFile(path.join(b, f)).catch(() => null); if (!y || !x.equals(y)) differ.push(f); }
  ok('identité : mêmes fichiers compilés', JSON.stringify(fa.filter(f => !/^(data|cache)\//.test(f))) === JSON.stringify(fb.filter(f => !/^(data|cache)\//.test(f))), `${fa.length} / ${fb.length}`);
  ok('identité : gabarits, styles, scripts, index d\'intention, versions texte identiques à l\'octet', fa.length > 40 && !differ.length, differ.join(', '));
  const twin = async d => { const j = JSON.parse(await fs.readFile(path.join(d, 'site.json'), 'utf8')); delete j.generated_at; return JSON.stringify(j); };
  ok('identité : jumeau pour agents (site.json) identique hors date', await twin(a) === await twin(b));
  const snap = async (dist, p, out) => spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'snapshot-pages.mjs'), dist, String(p), out], { encoding: 'utf8' });
  const sa = await snap(a, port, path.join(tmp, 'snap-a')), sb = await snap(b, port + 1, path.join(tmp, 'snap-b'));
  const cmp = spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'snapshot-pages.mjs'), '--compare', path.join(tmp, 'snap-a'), path.join(tmp, 'snap-b')], { encoding: 'utf8' });
  const verdict = jsonLines(cmp.stdout || '').pop() || {};
  ok('identité : HTML rendu identique sur toutes les pages (PHP)', sa.status === 0 && sb.status === 0 && verdict.pages >= 6 && verdict.different === 0, (sa.stderr || '') + (sb.stderr || '') + (cmp.stdout || '').slice(0, 400));

  // --- aller-retour : tout site d'exemple s'écrit en documents et se relit à l'identique
  for (const site of ['garnier-associes', 'plomberie-martin', 'le-fournil', 'savonnerie']) {
    const project = await loadProject(path.join(ROOT, 'examples', site));
    const sch = componentSchemas(project, catalog), bad = []; let blocs = 0;
    const pageOf = id => project.pages.find(x => x.id === id)?.data || null;
    const s = writeSiteDocument(project.site, { tokens, groups });
    if (s.error || !sameLoose(readSiteDocument(s.text, { tokens, groups }).data, { language: 1, ...project.site })) bad.push('site : ' + (s.error || 'relu différent'));
    blocs += ((s.text || '').match(/^```yaml/gm) || []).length;
    for (const p of project.pages) { const w = writePageDocument(p.data, { schemas: sch, pageOf }); if (w.error || !sameLoose(readPageDocument(w.text, { schemas: sch, pageOf }).data, strip(p.data))) bad.push(`${p.id} : ${w.error || 'relu différent'}`); blocs += ((w.text || '').match(/^```yaml/gm) || []).length; }
    ok(`aller-retour : ${site} (${project.pages.length} pages) s'écrit en documents, sans aucun bloc yaml, et se relit à l'identique`, !bad.length && blocs === 0, bad.join(' | ') + (blocs ? ` ${blocs} bloc(s) yaml` : ''));
  }

  // --- règles de lecture
  let d = page('## Bandeau : Des savons faits main\nFabriqués en Provence.\nImage : hero.jpg\nDécouvrir → /boutique\nNous contacter → /contact\nAlignement : gauche');
  ok('lecture : titre dans l\'intitulé, texte libre, « Nom : valeur », liens seuls dans l\'ordre, valeur dite en français', !d.errors.length && same(first(d), { title: 'Des savons faits main', subtitle: 'Fabriqués en Provence.', image: 'hero.jpg', cta: { label: 'Découvrir', to: '/boutique' }, secondary: { label: 'Nous contacter', to: '/contact' }, align: 'left' }), JSON.stringify(d));
  ok('lecture : le nom du composant vaut son nom français', Object.keys(page('## hero : A').data.sections[0])[0] === 'hero' && Object.keys(page('## BANDEAU : A').data.sections[0])[0] === 'hero');
  d = page('## Appel #joindre : Une question : laquelle ?\nÉcrivez-nous.\n[Nous écrire](/contact)');
  ok('lecture : ancre dans l\'intitulé, « : » dans le titre, lien écrit en Markdown', !d.errors.length && same(first(d), { title: 'Une question : laquelle ?', text: 'Écrivez-nous.', button: { label: 'Nous écrire', to: '/contact' }, id: 'joindre' }), JSON.stringify(d));
  d = page('## Points forts : Pourquoi nous\nUne introduction.\nColonnes : 3\n- leaf | Naturel | Huiles bio | En savoir plus → /a\n- Fait main\n- Local | Produit à 20 km, vendu sur place.\n- rien | check | Une coche en titre');
  ok('lecture : puces, champs dans l\'ordre de la fiche, icône sautée si absente, « rien » saute un champ', !d.errors.length && same(first(d).items, [{ icon: 'leaf', title: 'Naturel', text: 'Huiles bio', link: { label: 'En savoir plus', to: '/a' } }, { title: 'Fait main' }, { title: 'Local', text: 'Produit à 20 km, vendu sur place.' }, { title: 'check', text: 'Une coche en titre' }]) && first(d).columns === 3 && first(d).intro === 'Une introduction.', JSON.stringify(d));
  d = page('## Équipe\n- Jeanne Dubois | Fondatrice | jeanne.jpg | Trente ans de métier.\n- Paul Martin | bio : Arrivé en 2020.\n- Zoé Petit | zoe.jpg');
  ok('lecture : un fichier image va au champ image, « nom : valeur » vise un champ', !d.errors.length && same(first(d).members, [{ name: 'Jeanne Dubois', role: 'Fondatrice', photo: 'jeanne.jpg', bio: 'Trente ans de métier.' }, { name: 'Paul Martin', bio: 'Arrivé en 2020.' }, { name: 'Zoé Petit', photo: 'zoe.jpg' }]), JSON.stringify(d));
  d = page('## Tarifs : Nos tarifs\nNote : Prix TTC.\n- Dépannage\n  - Déplacement | à partir de 95 € | Lyon\n  - Recherche de fuite | 180 € | mention : Rapport inclus\n- Entretien\n  - Contrat chaudière | 129 €');
  ok('lecture : puces en retrait, la liste d\'un élément', !d.errors.length && first(d).groups.length === 2 && same(first(d).groups[0], { title: 'Dépannage', items: [{ name: 'Déplacement', price: 'à partir de 95 €', description: 'Lyon' }, { name: 'Recherche de fuite', price: '180 €', badge: 'Rapport inclus' }] }) && first(d).note === 'Prix TTC.', JSON.stringify(d));
  d = page('## Horaires\n- lundi | fermé : oui\n- mardi | 06:30-13:00, 15:00-19:30');
  ok('lecture : oui / non, liste de mots sur une ligne', !d.errors.length && same(first(d).days, [{ day: 'lundi', closed: true }, { day: 'mardi', slots: ['06:30-13:00', '15:00-19:30'] }]), JSON.stringify(d));
  d = page('## Texte : Notre histoire\nNotre tout premier paragraphe : fondé en 1987, « à la main ».\n\nSecond paragraphe.\n\n- un point\n- un autre\nImage : atelier.jpg');
  ok('lecture : paragraphes, deux-points et guillemets tels quels, puces gardées dans un texte sans liste', !d.errors.length && first(d).text === 'Notre tout premier paragraphe : fondé en 1987, « à la main ».\n\nSecond paragraphe.\n\n- un point\n- un autre' && first(d).image === 'atelier.jpg', JSON.stringify(d));
  d = page('## Chiffres\n- 2011 | année de fondation\n- 3 | associés\nMots-clés : chiffres, année, combien');
  ok('lecture : un nombre reste le texte qu\'on a écrit, mots-clés sur une ligne', !d.errors.length && same(first(d), { items: [{ value: '2011', label: 'année de fondation' }, { value: '3', label: 'associés' }], keywords: ['chiffres', 'année', 'combien'] }), JSON.stringify(d));
  d = page('## Accès : Venir\nlat : 45.7745\nlon : 4.832\nAccès :\nMétro C.\n\nParking à 200 m.');
  ok('lecture : nombres, texte de plusieurs paragraphes annoncé par « Nom : »', !d.errors.length && first(d).lat === 45.7745 && first(d).access === 'Métro C.\n\nParking à 200 m.', JSON.stringify(d));
  d = page('## Formulaire de contact : Écrivez-nous\nDestinataire : a@b.fr\nChamps : name, email, message\n```yaml\nvariants:\n  mobile: { title: Appelez-nous }\n```');
  ok('lecture : bloc yaml pour ce qui ne se dit pas en lignes', !d.errors.length && same(first(d), { title: 'Écrivez-nous', to: 'a@b.fr', fields: ['name', 'email', 'message'], variants: { mobile: { title: 'Appelez-nous' } } }), JSON.stringify(d));
  d = page('## products.grid : Nos savons\nFiltre : category = savons, featured = oui\nColonnes : 3');
  const d2 = page('## products.grid : Nos savons\nFiltre :\n- category | savons\n- featured | oui');
  ok('lecture : un groupe de données sur une ligne (« nom = valeur ») ou en puces (« nom | valeur »), typé par sa déclaration', !d.errors.length && same(first(d).filter, { category: 'savons', featured: true }) && !d2.errors.length && same(first(d2).filter, first(d).filter), JSON.stringify([d, d2]));
  d = page('## custom\nphp : custom/promo.php\nProps :\n- text | -15 % sur l\'entretien\n- code | ENTRETIEN15\n- jours | 30\n- visible | oui');
  ok('lecture : données libres en puces « nom | valeur » (oui / non, nombre, texte)', !d.errors.length && same(first(d).props, { text: '-15 % sur l\'entretien', code: 'ENTRETIEN15', jours: 30, visible: true }), JSON.stringify(d));
  d = page('## Bandeau : Plombier à Lyon\nDépannage 7j/7.\nAppeler → tel:0472001122\nVariantes :\n- mobile | Appeler maintenant → tel:0472001122\n- recurrent | sous-titre : Content de vous revoir.\n- prix | Dépannage dès 95 € | Devis gratuit.');
  ok('lecture : variantes d\'une section, « segment | données du composant »', !d.errors.length && same(first(d).variants, { mobile: { cta: { label: 'Appeler maintenant', to: 'tel:0472001122' } }, recurrent: { subtitle: 'Content de vous revoir.' }, prix: { title: 'Dépannage dès 95 €', subtitle: 'Devis gratuit.' } }), JSON.stringify(d));
  d = page('## Questions\n- Quel délai ? | Une semaine.\n- Comment obtenir un devis ? | Envoyez-nous la date.\n\n  Un acompte de 30 % est demandé.\n  Le solde au retrait.\n- Livrez-vous ? | Oui.');
  ok('lecture : lignes en retrait sous une puce, la suite de son dernier texte', !d.errors.length && first(d).items.length === 3 && first(d).items[1].a === 'Envoyez-nous la date.\n\nUn acompte de 30 % est demandé.\nLe solde au retrait.', JSON.stringify(d));
  const der = readPageDocument('# Savon de Marseille\n\nAdresse : /savons-marseille\nDérive de : accueil\nRetire : avis\nRemplace :\n- entree | Le savon de Marseille | Voir → /boutique\n\n## Questions : Trois questions\n- Pourquoi ? | Parce que.\n', { schemas, pageOf: id => (id === 'accueil' ? { route: '/', sections: [{ hero: { id: 'entree', title: 'A' } }, { testimonials: { id: 'avis', items: [] } }] } : null) });
  ok('lecture : page dérivée (« Dérive de », « Retire », « Remplace : » lu d\'après le composant de la section, sections ajoutées)', !der.errors.length && same(der.data, { route: '/savons-marseille', extends: 'accueil', seo: { title: 'Savon de Marseille' }, override: { entree: { title: 'Le savon de Marseille', cta: { label: 'Voir', to: '/boutique' } } }, remove: ['avis'], append: [{ faq: { title: 'Trois questions', items: [{ q: 'Pourquoi ?', a: 'Parce que.' }] } }] }), JSON.stringify(der));
  ok('refus : section remplacée dont l\'ancre n\'existe pas dans la page de base', readPageDocument('# T\n\nAdresse : /x\nDérive de : accueil\nRemplace :\n- absente | Titre\n', { schemas, pageOf: () => ({ sections: [] }) }).errors.some(e => /aucune section de cette ancre/.test(e.message)));
  ok('lecture : cibles de lien (route, ancre, URL, mailto, tel) ; un texte à flèche sans cible n\'est pas un lien', same(parseLink('Voir → #tarifs'), { label: 'Voir', to: '#tarifs' }) && parseLink('Appeler -> tel:+33472001122').to === 'tel:+33472001122' && parseLink('Paris → Lyon') === null && parseLink('Site → https://exemple.fr/a').to === 'https://exemple.fr/a');
  const sd = readSiteDocument('# Mon site\n\nUn slogan.\n\nLangue : fr-FR\nThème : sombre\ncolor.primary : #6b2d5c\nE-mail : a@b.fr\nMenu :\n- Accueil → /\n- Contact → /contact\nLiens du pied de page :\n- Mentions → /mentions\n```yaml\nconstants: { delai: 1 h }\nsite:\n  agents: { enabled: true }\n```\n', { tokens });
  const sg = readSiteDocument('# Maison Dubois\n\nThème : chaleureux\nConstantes :\n- delai | 48 h\n- seuil | 50\n\n## Boutique\nDevise : €\nPaiement : manual\nshipping.flat : 4.9\nshipping.free_from : 50\n\n## Agents\nActif : oui\nType d\'activité : Store\n\n## Images\nLargeurs : 480, 960\n\n## Collection realisations : Réalisations\nTri : -date\nChamps :\n- title | string | oui\n- image | asset\n- date | date\n', { tokens, groups });
  ok('lecture : site.md, constantes, réglages et collections dans leurs sections, sans bloc yaml', !sg.errors.length && same(sg.data, { language: 1, constants: { delai: '48 h', seuil: 50 }, collections: { realisations: { label: 'Réalisations', fields: { title: { type: 'string', required: true }, image: 'asset', date: 'date' }, sort: '-date' } }, site: { name: 'Maison Dubois', theme: { preset: 'chaleureux' }, shop: { currency: '€', payment: 'manual', shipping: { flat: 4.9, free_from: 50 } }, agents: { enabled: true, business_type: 'Store' }, images: { widths: [480, 960] } } }), JSON.stringify(sg));
  ok('refus : section de site inconnue, réglage inconnu dans une section', readSiteDocument('# S\n\n## Boutiqu\nDevise : €\n', { tokens, groups }).errors.some(e => /n'est pas un réglage du site.*boutique/.test(e.message)) && readSiteDocument('# S\n\n## Boutique\nMonnaie : €\n', { tokens, groups }).errors.some(e => /« Monnaie » n'est pas une donnée/.test(e.message)));
  ok('lecture : site.md (nom, slogan, thème, jeton sans guillemets, menu, pied, bloc yaml fusionné)', !sd.errors.length && same(sd.data, { language: 1, constants: { delai: '1 h' }, site: { name: 'Mon site', tagline: 'Un slogan.', locale: 'fr-FR', theme: { preset: 'sombre', tokens: { 'color.primary': '#6b2d5c' } }, nav: [{ label: 'Accueil', to: '/' }, { label: 'Contact', to: '/contact' }], footer: { links: [{ label: 'Mentions', to: '/mentions' }] }, contact: { email: 'a@b.fr' }, agents: { enabled: true } } }), JSON.stringify(sd));

  // --- garde-fou 1 : toute ligne a un rôle, sinon elle est refusée à sa ligne
  ok('refus : ligne sans rôle (composant sans texte libre), à sa ligne', refused(page('## Chiffres\nUn texte sans place.\n- 3 | avocats\n- 2 | villes'), /ligne sans rôle/, 6));
  ok('refus : nom de réglage à une lettre près, pas rangé dans le texte', refused(page('## Bandeau : A\nAlignment : left'), /Alignment.*vouliez-vous dire « alignement »/));
  ok('refus : une ligne « nom : suite » d\'un à trois mots dont le nom n\'est pas une donnée, avec le nom le plus proche', refused(page('## Texte : A\nUn paragraphe.\nImage côté : left'), /Image côté.*vouliez-vous dire « côté de l'image »/) && refused(page('## Texte : A\nProfil : titulaire du CAPA.'), /« Profil » n'est pas une donnée de richtext$/, 6) && /annoncez le texte : « Texte : »/.test(page('## Texte : A\nProfil : titulaire du CAPA.').errors[0].hint) && refused(page('## Bandeau : A\nAccroche : Une longue phrase qui serait affichée telle quelle.'), /« Accroche » n'est pas une donnée de hero/));
  d = page('## Texte : Mentions\nImage : a.jpg\nTexte :\nÉditeur du site : cabinet Garnier.\n\nTéléphone : 05 56 00 00 00.\nImage : crédit photo\n- un point\n### Un intertitre\nVoir → /contact');
  ok('lecture : un texte annoncé par « Texte : » est lu tel quel jusqu\'à la fin de la section', !d.errors.length && first(d).image === 'a.jpg' && first(d).text === 'Éditeur du site : cabinet Garnier.\n\nTéléphone : 05 56 00 00 00.\nImage : crédit photo\n- un point\n### Un intertitre\nVoir → /contact', JSON.stringify(d));
  ok('lecture : au-delà de trois mots avant les deux-points, c\'est une phrase du texte', !page('## Texte : A\nLe directeur de la publication : Me Garnier.').errors.length && first(page('## Texte : A\nLe directeur de la publication : Me Garnier.')).text === 'Le directeur de la publication : Me Garnier.');
  d = page('## Formulaire de contact : Écrivez-nous\nDestinataire : a@b.fr\nChamps :\n- name\n- email\n- societe : facultatif — Entreprise\n- nature : un parmi Dépannage, Devis — Type de demande\n- date_souhaitee : date, facultatif, si nature vaut Devis — Date souhaitée (ex. 12/03)\n- message');
  ok('lecture : champs de formulaire en lignes, dans l\'écriture du bloc fonctionnement', !d.errors.length && same(first(d).fields, ['name', 'email', { name: 'societe', label: 'Entreprise' }, { name: 'nature', label: 'Type de demande', type: 'select', required: true, options: ['Dépannage', 'Devis'] }, { name: 'date_souhaitee', label: 'Date souhaitée', type: 'date', placeholder: '12/03', when: { nature: 'Devis' } }, 'message']), JSON.stringify(d));
  ok('refus : champ de formulaire mal dit (type inconnu, libellé manquant)', refused(page('## Formulaire de contact\nDestinataire : a@b.fr\nChamps :\n- societe : chiffre — Entreprise'), /champ societe : « chiffre » n'est ni un type de champ/) && refused(page('## Formulaire de contact\nDestinataire : a@b.fr\nChamps :\n- societe : texte'), /libellé manquant/));
  ok('refus : composant inconnu, avec le nom le plus proche', refused(page('## Formulaire : Écrivez-nous'), /n'est pas un composant.*formulaire de contact/) && refused(page('## Bandau : A'), /vouliez-vous dire « bandeau »/));
  ok('refus : un lien de trop', refused(page('## Appel : A\nUn → /a\nDeux → /b'), /un lien de trop/));
  ok('refus : valeur de puce sans champ', refused(page('## Galerie\n- a.jpg | Alt | Légende | en trop'), /ne trouve pas de champ/));
  ok('refus : valeur du mauvais type', refused(page('## Points forts\nColonnes : trois\n- A\n- B'), /une valeur parmi 2, 3, 4/) && refused(page('## Horaires\nshow_status : peut-être\n- lundi | fermé : oui'), /oui ou non/));
  ok('refus : donnée dite deux fois', refused(page('## Bandeau : A\nTitre : B'), /déjà dans l'intitulé/) && refused(page('## Bandeau : A\nImage : a.jpg\nImage : b.jpg'), /déjà dit ligne 6/));
  ok('refus : intertitre, bloc non yaml, donnée inconnue dans un bloc', refused(page('## Texte : A\nB\n### C'), /intertitre non lu/) && refused(page('## Texte : A\nB\n```js\nx\n```'), /seul un bloc ```yaml/) && refused(page('## Texte : A\nB\n```yaml\ncouleur: rouge\n```'), /donnée inconnue de richtext : couleur/));
  ok('refus : page sans adresse, page sans section', refused(readPageDocument('# T\n\n## Texte : A\nB\n', { schemas }), /ne dit pas son adresse/) && refused(readPageDocument('# T\n\nAdresse : /x\n', { schemas }), /aucune section/));
  ok('refus : site sans nom, ligne de site inconnue gardée comme slogan une seule fois', refused(readSiteDocument('Thème : clair\n', { tokens }), /commence par son nom/) && refused(readSiteDocument('# S\n\nUn slogan.\n\nThème : clair\nThème : sombre\n', { tokens }), /déjà dit/));

  // --- en projet : erreurs à la ligne, lecture figée, commandes
  const site = path.join(tmp, 'site');
  await fs.cp(path.join(ROOT, 'examples', 'garnier-document'), site, { recursive: true, filter: s => !/[\\/](dist|node_modules)([\\/]|$)/.test(s) });
  await fs.cp(path.join(ROOT, 'examples', 'paquets'), path.join(tmp, 'paquets'), { recursive: true });
  r = run('check', site);
  ok('projet : l\'exemple en documents passe check', r.code === 0 && /"ok":true/.test(r.out), r.out);
  const accueil = path.join(site, 'pages', 'accueil.md'), original = await fs.readFile(accueil, 'utf8');
  await fs.writeFile(accueil, original.replace('Nos honoraires → /honoraires', 'Nos honoraires → /tarifs'));
  r = run('lire', site, '--accepter');
  const out1 = r.out;
  r = run('check', site);
  let errs = jsonLines(r.out);
  ok('projet : une erreur de validation renvoie à la ligne du document', r.code === 1 && errs.some(e => /accueil\.md$/.test(e.file || '') && /^ligne \d+ · sections\[0\]\.hero\.secondary/.test(e.path || '')), r.out);
  await fs.writeFile(accueil, original); run('lire', site, '--accepter');
  await fs.writeFile(accueil, original.replace('## Appel : Une question juridique ?', '## Appel : Une question de droit ?'));
  r = run('check', site); errs = jsonLines(r.out);
  ok('garde-fou 3 : un document modifié arrête check (E_READING), l\'ancienne et la nouvelle lecture citées', r.code === 1 && errs.some(e => e.code === 'E_READING' && /Une question juridique/.test(e.message) && /Une question de droit/.test(e.message)), r.out + out1);
  r = run('build', site, '--out', path.join(tmp, 'd3'));
  ok('garde-fou 3 : build s\'arrête aussi', r.code !== 0, r.out);
  r = run('lire', site);
  ok('lire : dit le document changé et les lignes de lecture retirées et ajoutées', r.code === 1 && /pages\/accueil\.md : la lecture a changé/.test(r.out) && /- title: Une question juridique \?/.test(r.out) && /\+ title: Une question de droit \?/.test(r.out) && /Lecture à jour : site\.md, pages\/cabinet\.md/.test(r.out), r.out);
  r = run('lire', site, '--accepter');
  const r3 = run('check', site);
  ok('lire --accepter : fige la lecture, check repasse', r.code === 0 && /changement accepté/.test(r.out) && r3.code === 0 && /Une question de droit/.test(await fs.readFile(path.join(site, 'lecture', 'pages', 'accueil.page.yaml'), 'utf8')), r.out + r3.out);
  await fs.writeFile(path.join(site, 'pages', 'recrutement.md'), '# Recrutement\n\nLe cabinet recrute.\n\nAdresse : /recrutement\n\n## Bandeau : Rejoignez-nous\nLe cabinet recrute.\n\n## Appel : Candidater\nPostuler → /contact\n');
  r = run('check', site); errs = jsonLines(r.out);
  ok('garde-fou 3 : une page nouvelle n\'est pas compilée avant d\'être relue', r.code === 1 && errs.some(e => e.code === 'E_READING' && /recrutement/.test(e.message + e.file)), r.out);
  r = run('lire', site);
  ok('lire : une page jamais acceptée est redite section par section, avec ses lignes', /pages\/recrutement\.md : pas encore acceptée/.test(r.out) && /ligne\s+7\s+hero : title, subtitle/.test(r.out) && /ligne\s+10\s+cta : title, button/.test(r.out), r.out);
  r = run('lire', site, '--accepter'); const r4 = run('check', site);
  ok('lire --accepter : la page nouvelle est acceptée', r.code === 0 && r4.code === 0 && /"pages":7/.test(r4.out), r.out + r4.out);
  await fs.writeFile(path.join(site, 'pages', 'recrutement.md'), '# Recrutement\n\nAdresse : /recrutement\n\n## Chiffres\nTexte perdu.\n- 3 | a\n- 2 | b\n');
  r = run('check', site); errs = jsonLines(r.out);
  ok('projet : un document refusé donne E_DOCUMENT à sa ligne, sans erreurs en cascade', r.code === 1 && errs.filter(e => /recrutement/.test(e.file || '')).length === 1 && errs[0].code === 'E_DOCUMENT' && errs[0].path === 'ligne 6', r.out);
  await fs.rm(path.join(site, 'pages', 'recrutement.md'));
  await fs.writeFile(path.join(site, 'pages', 'cabinet.page.yaml'), 'route: /cabinet\nsections:\n  - richtext: { text: A }\n');
  r = run('check', site);
  ok('projet : une page écrite deux fois (document et YAML) est refusée', r.code === 1 && /une page n'a qu'une source/.test(r.out), r.out);
  await fs.rm(path.join(site, 'pages', 'cabinet.page.yaml'));

  // --- commandes : rediger, explain
  const y = path.join(tmp, 'plomberie');
  await fs.cp(path.join(ROOT, 'examples', 'plomberie-martin'), y, { recursive: true, filter: s => !/[\\/](dist|node_modules)([\\/]|$)/.test(s) });
  r = run('rediger', y, '--dry-run');
  ok('rediger --dry-run : dit ce qui s\'écrirait sans rien modifier', r.code === 0 && /site\.yaml → site\.md/.test(r.out) && /rien n'est modifié/.test(r.out) && await fs.access(path.join(y, 'site.yaml')).then(() => true, () => false), r.out);
  r = run('rediger', y); const r5 = run('check', y); const r6 = run('lire', y);
  ok('rediger : écrit les documents et leur lecture, retire le YAML, sans garder de bloc yaml, et le site passe check', r.code === 0 && !/bloc/.test(r.out) && r5.code === 0 && /"ok":true/.test(r5.out) && !/à accepter|a changé/.test(r6.out) && await fs.access(path.join(y, 'site.yaml')).then(() => false, () => true) && await fs.access(path.join(y, 'lecture', 'site.yaml')).then(() => true, () => false), r.out + r5.out);
  r = run('rediger', y);
  ok('rediger : refuse un site déjà en documents', r.code === 1 && /déjà écrit en documents/.test(r.out), r.out);
  r = run('explain', 'features', '--document');
  ok('explain --document : l\'exemple du composant écrit en document, sans son écriture YAML', r.code === 0 && /Exemple, en document/.test(r.out) && !/- features:/.test(r.out) && /## Points forts : Pourquoi nous choisir/.test(r.out) && /- leaf \| 100 % naturel \| Huiles bio et locales/.test(r.out), r.out);
  r = run('explain', 'hero', site);
  ok('explain <composant> <dossier> : la forme document est donnée d\'office pour un site en documents', r.code === 0 && /Exemple, en document/.test(r.out), r.out);
  r = run('explain', 'document');
  const frOk = Object.entries(COMPONENT_NAMES).every(([k, v]) => r.out.toLowerCase().includes(`${v} = ${k}`)) && Object.entries(PROP_NAMES).every(([k, v]) => r.out.includes(`${v} = ${k}`));
  ok('explain document : le format en une page, noms français tirés du lecteur', r.code === 0 && frOk && /Adresse : \/contact/.test(r.out), r.out.slice(0, 300));
  ok('noms français : chacun désigne un composant natif', Object.keys(COMPONENT_NAMES).every(k => catalog.has(k)), Object.keys(COMPONENT_NAMES).filter(k => !catalog.has(k)).join(', '));

  // --- mesure : la source en documents est plus courte que la source en YAML, sur chaque exemple
  const m = spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'measure-site-document.mjs'), '--json'], { encoding: 'utf8' });
  let mes = null; try { mes = JSON.parse(m.stdout); } catch { /* dit par le contrôle */ }
  if (mes) console.log(`mesure : création ${mes.total.creation.yaml} tokens en YAML, ${mes.total.creation.documents} en documents (${mes.total.creation.gain_pct} % de moins) ; éditions ${mes.total.editions.yaml_ecrits} contre ${mes.total.editions.documents_ecrits} tokens écrits (${mes.total.editions.gain_pct} % de moins)`);
  ok('mesure : documents plus courts que le YAML sur chaque exemple, à la création et aux éditions', mes && mes.creation.every(x => x.documents < x.yaml) && mes.editions.every(x => x.documents.tokens_ajoutes < x.yaml.tokens_ajoutes), m.stdout + m.stderr);
} catch (e) {
  ok('exécution du banc', false, e.stack || e.message);
} finally {
  await fs.rm(tmp, { recursive: true, force: true });
}

const passed = checks.filter(c => c.pass).length;
for (const c of checks) console.log(`${c.pass ? 'OK  ' : 'FAIL'} ${c.name}${c.detail && !c.pass ? ' — ' + c.detail : ''}`);
console.log(JSON.stringify({ banc: 'document du site', passed, total: checks.length }));
process.exit(passed === checks.length ? 0 : 1);
