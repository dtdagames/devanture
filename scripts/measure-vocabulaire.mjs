// Mesure des natifs portés au format langage, en deux étapes, tout compris :
//   présentation (v0.9.0 → v0.10.0) : six natifs à gabarit HTML, portés grâce au vocabulaire ;
//   état (v0.10.0 → aujourd'hui)    : neuf natifs à gabarit PHP, portés grâce aux lectures à la visite.
// Avant : schéma des props, gabarit (HTML ou PHP), feuille, module. Après : données, calculé, fonctionnement, forme, apparence,
// feuille restante, plus ce que l'étape a ajouté au vocabulaire natif. Pour l'étape « état », le PHP n'a pas disparu : la logique
// des gabarits est devenue des fonctions de source dans la cible ; elles sont comptées à part, en lignes.
// Usage : node scripts/measure-vocabulaire.mjs [présentation | état]     (les deux par défaut)
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';
import { encode } from 'gpt-tokenizer';
import { parseComponentOutline } from '../src/lang/outline.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// Un composant écrit en plan (composant.md) : ses blocs sont ceux d'un manifeste, rendus en YAML pour être mesurés à l'identique.
const planAsManifest = p => { try { const v = parseComponentOutline(fs.readFileSync(path.join(ROOT, p.replace(/manifest\.yaml$/, 'composant.md')), 'utf8')).value; delete v.example; return YAML.stringify(v, { lineWidth: 0 }); } catch { return ''; } };
// Le vocabulaire natif écrit en document se mesure tel quel : c'est le texte qu'un auteur écrit.
const at = (rev, p) => { if (!rev) { try { return fs.readFileSync(path.join(ROOT, p), 'utf8'); } catch { return /manifest\.yaml$/.test(p) ? planAsManifest(p) : /vocabulaire\.yaml$/.test(p) ? (() => { try { return fs.readFileSync(path.join(ROOT, p.replace(/\.yaml$/, '.md')), 'utf8'); } catch { return ''; } })() : ''; } } try { return execFileSync('git', ['show', `${rev}:${p}`], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }); } catch { return ''; } };
const authored = (text, keys) => { const m = YAML.parse(text) || {}; return keys.filter(k => m[k] !== undefined).map(k => YAML.stringify({ [k]: m[k] }, { lineWidth: 0 })).join(''); };
const tok = t => encode(t).length, lin = t => (t.trim() ? t.trim().split('\n').length : 0);
const FILES = ['template.html', 'template.php', 'styles.css', 'module.js'];
const BLOCKS = ['props', 'behaviors', 'effects', 'données', 'calculé', 'fonctionnement', 'forme', 'apparence'];

const STEPS = {
  'présentation': { before: 'v0.9.0', after: 'v0.10.0', natives: ['hero', 'gallery', 'richtext', 'pricelist', 'map', 'collection.list'] },
  'état': { before: 'v0.10.0', after: null, natives: ['hours', 'recent', 'contact.form', 'products.grid', 'product.hero', 'products.related', 'cart.page', 'checkout.page', 'order.confirmation'] },
};
const want = process.argv[2] ? [process.argv[2]] : Object.keys(STEPS);
for (const name of want) {
  const st = STEPS[name]; if (!st) { console.error(`étape inconnue : ${name} (${Object.keys(STEPS).join(', ')})`); process.exit(2); }
  if (!at(st.before, 'package.json')) { console.log(JSON.stringify({ etape: name, ignoree: `étiquette ${st.before} absente du dépôt cloné` })); continue; }
  let A = 0, B = 0, AL = 0, BL = 0, tplA = 0, tplB = 0;
  for (const n of st.natives) {
    const d = `components/${n}`;
    const side = rev => authored(at(rev, `${d}/manifest.yaml`), BLOCKS) + FILES.map(f => at(rev, `${d}/${f}`)).join('');
    const a = side(st.before), b = side(st.after);
    const tpl = rev => lin(at(rev, `${d}/template.html`)) + lin(at(rev, `${d}/template.php`));
    console.log(`${n.padEnd(20)} ${String(tok(a)).padStart(5)} → ${String(tok(b)).padStart(5)} tokens   ${String(lin(a)).padStart(3)} → ${String(lin(b)).padStart(3)} lignes   gabarit : ${tpl(st.before)} → ${tpl(st.after)} lignes`);
    A += tok(a); B += tok(b); AL += lin(a); BL += lin(b); tplA += tpl(st.before); tplB += tpl(st.after);
  }
  const vA = at(st.before, 'components/vocabulaire.yaml'), vB = at(st.after, 'components/vocabulaire.yaml');
  const words = t => Object.values(YAML.parse(t || 'mots: {}')?.mots || {});
  const gab = t => words(t).reduce((s, w) => s + (w.gabarit ? lin(w.gabarit) : 0), 0);
  const out = { etape: name, de: st.before, a: st.after || 'arbre de travail', composants: st.natives.length, tokens_avant: A, tokens_apres: B + tok(vB) - tok(vA), dont_vocabulaire: tok(vB) - tok(vA), mots_ajoutes: words(vB).length - words(vA).length, lignes_avant: AL, lignes_apres: BL + lin(vB) - lin(vA), gabarit_lignes_avant: tplA, gabarit_lignes_apres: tplB + gab(vB) - gab(vA) };
  out.reduction_pct = Math.round((1 - out.tokens_apres / out.tokens_avant) * 100);
  if (name === 'état' && !st.after) {
    // Logique passée des gabarits PHP aux fonctions de source de la cible : comptée en lignes de PHP.
    const { RENDER_PHP, SHOP_PHP } = await import('../src/emit/php/php.js');
    const fn = /^function (sl_source|sl_hm|sl_src_\w+|sl_shop_item|sl_fn_csrf|sl_fn_event)\([\s\S]*?^\}/gm;
    out.php_de_la_cible_lignes = [...(RENDER_PHP + '\n' + SHOP_PHP).matchAll(fn)].reduce((s, m) => s + lin(m[0]), 0);
  }
  console.log(JSON.stringify(out));
}
