import { existsSync } from 'node:fs';
// Parcours d'achat sur un site généré : grille, fiche, ajout au panier, quantités, commande manuelle, confirmation.
// Usage : node scripts/verify-shop.mjs <dossier-dist> <port>
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

const [dir, portArg] = process.argv.slice(2);
if (!dir || !portArg) { console.error('usage: verify-shop.mjs <dossier-dist> <port>'); process.exit(2); }
const WINGET_PHP = 'C:/Users/sergi/AppData/Local/Microsoft/WinGet/Packages/PHP.PHP.8.3_Microsoft.Winget.Source_8wekyb3d8bbwe/php.exe';
const PHP = process.env.PHP_BIN || (existsSync(WINGET_PHP) ? WINGET_PHP : 'php');
const root = path.resolve(dir);
const base = `http://127.0.0.1:${portArg}`;
const checks = [];
const ok = (name, pass, detail = '') => checks.push({ name, pass: !!pass, detail });
const server = spawn(PHP, ['-S', `127.0.0.1:${portArg}`, '-t', root, path.join(root, 'index.php')], { stdio: 'ignore' });
let cookie = '';
async function req(p, opts = {}) {
  const r = await fetch(base + p, { redirect: 'manual', headers: { cookie, ...(opts.headers || {}) }, method: opts.method || 'GET', body: opts.body });
  const sc = r.headers.get('set-cookie'); if (sc) cookie = sc.split(';')[0];
  return { status: r.status, text: await r.text(), location: r.headers.get('location') };
}
const form = o => ({ method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(o).toString() });
const phpErr = t => /(Fatal error|Warning:|Notice:|Deprecated:)/.test(t);
const csrfOf = t => /name="_csrf" value="([^"]+)"/.exec(t)?.[1];

try {
  for (let i = 0; i < 40; i++) { try { await fetch(base + '/'); break; } catch { await new Promise(r => setTimeout(r, 150)); } }
  const home = await req('/');
  ok('accueil 200 sans erreur PHP', home.status === 200 && !phpErr(home.text));
  const products = JSON.parse(await fs.readFile(path.join(root, 'data', 'products.json'), 'utf8'));
  ok('products.json émis', products.length > 0, String(products.length));
  const cards = (home.text.match(/class="card product-card"/g) || []).length;
  ok('grille de produits sur l\'accueil', cards > 0, `${cards} cartes`);
  ok('lien Panier dans l\'en-tête avec compteur 0', /class="cart-link"[^>]*>Panier<span class="cart-count">0<\/span>/.test(home.text));

  const first = products.find(p => p.stock === null || p.stock > 0);
  const fiche = await req(`/produit/${first.id}`);
  ok(`fiche /produit/${first.id} 200`, fiche.status === 200 && !phpErr(fiche.text), String(fiche.status));
  ok('titre SEO interpolé avec le nom du produit', new RegExp(`<title>[^<]*${first.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).test(fiche.text));
  ok('fiche inconnue → 404', (await req('/produit/n-existe-pas')).status === 404);
  const out = products.find(p => p.stock === 0);
  if (out) { const f2 = await req(`/produit/${out.id}`); ok('produit épuisé : pas de bouton d\'ajout', f2.status === 200 && !/name="action" value="add"/.test(f2.text) && /Épuisé/.test(f2.text)); }

  // ajout au panier (CSRF depuis la fiche)
  const csrf = csrfOf(fiche.text);
  ok('jeton CSRF présent sur la fiche', !!csrf);
  const add = await req('/_cart', form({ _csrf: csrf, action: 'add', id: first.id, qty: 2 }));
  ok('POST /_cart add → 303', add.status === 303, String(add.status));
  const bad = await req('/_cart', form({ _csrf: 'faux', action: 'add', id: first.id }));
  ok('POST /_cart sans CSRF valide → 400', bad.status === 400, String(bad.status));
  const second = products.find(p => p.id !== first.id && (p.stock === null || p.stock > 0));
  await req('/_cart', form({ _csrf: csrf, action: 'add', id: second.id, qty: 1 }));

  const cart = await req('/panier');
  ok('panier 200 sans erreur PHP', cart.status === 200 && !phpErr(cart.text));
  ok('panier : 2 lignes', (cart.text.match(/class="cart-item"/g) || []).length === 2);
  ok('compteur d\'en-tête = 3', /class="cart-count">3</.test(cart.text));
  const expectedSub = first.price * 2 + second.price;
  const money = n => n.toFixed(2).replace('.', ',');
  ok('sous-total correct', cart.text.includes(money(expectedSub)), money(expectedSub));
  const setq = await req('/_cart', form({ _csrf: csrf, action: 'set', id: first.id, qty: 1 }));
  ok('modification de quantité → 303', setq.status === 303);
  const rem = await req('/_cart', form({ _csrf: csrf, action: 'remove', id: second.id }));
  ok('retrait d\'une ligne → 303', rem.status === 303);
  const cart2 = await req('/panier');
  ok('panier : 1 ligne, compteur 1', (cart2.text.match(/class="cart-item"/g) || []).length === 1 && /class="cart-count">1</.test(cart2.text));
  const shippingShown = /Livraison<\/span><span>[^<]*(€|Offerte)/.test(cart2.text);
  ok('livraison affichée', shippingShown);

  // commande
  const co = await req('/commande');
  ok('page commande 200 avec formulaire', co.status === 200 && /name="_form" value="checkout"/.test(co.text));
  ok('événement checkout_start déclaré', /data-sl-event="checkout_start"/.test(co.text));
  const csrf2 = csrfOf(co.text);
  const bad2 = await req('/commande', form({ _form: 'checkout', _csrf: csrf2, name: '', email: 'pas-un-mail', address: '' }));
  ok('commande invalide : erreurs par champ', bad2.status === 200 && /est obligatoire/.test(bad2.text) && /e-mail invalide/i.test(bad2.text));
  const good = await req('/commande', form({ _form: 'checkout', _csrf: csrf2, name: 'Test Achat', email: 'test@example.test', phone: '0600000000', address: '1 rue du Test\n13001 Marseille', notes: 'Retrait à l\'atelier' }));
  ok('commande valide → 303 vers la confirmation', good.status === 303 && /\/commande\/[A-Z0-9]+\?t=/.test(good.location || ''), `${good.status} ${good.location}`);
  const created = [];
  const m1 = /\/commande\/([A-Z0-9]+)\?t=([^&\s]+)/.exec(good.location || ''); if (m1) created.push({ id: m1[1], token: m1[2], lines: [] });
  const conf = await req(good.location || '/');
  ok('confirmation 200 sans erreur PHP', conf.status === 200 && !phpErr(conf.text));
  ok('confirmation : numéro, total, statut', /Commande <strong>n° [A-Z0-9]+/.test(conf.text) && /Total :/.test(conf.text) && /order-status/.test(conf.text));
  ok('événement purchase déclaré', /data-sl-event="purchase"/.test(conf.text));
  const noToken = await req((good.location || '').split('?')[0]);
  ok('confirmation sans jeton → 404', noToken.status === 404, String(noToken.status));
  const after = await req('/panier');
  ok('panier vidé après commande', /class="cart-count">0</.test(after.text));
  let stored = false;
  try { stored = (await fs.readFile(path.join(root, 'data', 'orders.jsonl'), 'utf8')).includes('"name":"Test Achat"'); } catch { /* stockage SQLite */ }
  if (!stored) { try { await fs.access(path.join(root, 'data', 'site.sqlite')); stored = true; } catch { /* */ } }
  ok('commande enregistrée (data/orders.jsonl ou data/site.sqlite)', stored);
  ok('données non servies en HTTP', (await req('/data/orders.jsonl')).status === 404 && (await req('/data/site.sqlite')).status === 404);
  const sj = await req('/site.json');
  ok('site.json liste les produits', sj.status === 200 && JSON.parse(sj.text).products?.length === products.length);

  // Stock : plafond au panier, décrément à la commande, épuisement visible.
  const limited = products.find(p => p.stock !== null && p.stock > 0);
  if (limited) {
    const stockBefore = JSON.parse(await fs.readFile(path.join(root, 'data', 'stock.json'), 'utf8'));
    ok('stock.json créé avec base et restant', stockBefore[limited.id]?.base === limited.stock && stockBefore[limited.id]?.remaining === limited.stock);
    const f = await req(`/produit/${limited.id}`);
    const c3 = csrfOf(f.text);
    await req('/_cart', form({ _csrf: c3, action: 'add', id: limited.id, qty: limited.stock + 5 }));
    const cartL = await req('/panier');
    const qtyShown = Number(/name="qty" value="(\d+)"/.exec(cartL.text)?.[1]);
    ok(`ajout au-delà du stock plafonné à ${limited.stock}`, qtyShown === limited.stock, String(qtyShown));
    ok('message « Stock limité » affiché', /Stock limité/.test(cartL.text));
    const coL = await req('/commande');
    const good2 = await req('/commande', form({ _form: 'checkout', _csrf: csrfOf(coL.text), name: 'Test Stock', email: 'stock@example.test', address: '2 rue du Stock' }));
    ok('commande du stock complet → confirmation', good2.status === 303, String(good2.status));
    const m2 = /\/commande\/([A-Z0-9]+)\?t=([^&\s]+)/.exec(good2.location || ''); if (m2) created.push({ id: m2[1], token: m2[2], lines: [{ id: limited.id, qty: limited.stock }] });
    const stockAfter = JSON.parse(await fs.readFile(path.join(root, 'data', 'stock.json'), 'utf8'));
    ok('stock décrémenté à 0', stockAfter[limited.id]?.remaining === 0, JSON.stringify(stockAfter[limited.id]));
    const f2 = await req(`/produit/${limited.id}`);
    ok('fiche : produit épuisé après la commande', /Épuisé/.test(f2.text) && !/name="action" value="add"/.test(f2.text));
    const again = await req('/_cart', form({ _csrf: csrfOf(f2.text) || c3, action: 'add', id: limited.id, qty: 1 }));
    const cartE = await req('/panier');
    ok('nouvel ajout refusé : panier vide, message « épuisé »', again.status === 303 && /class="cart-count">0</.test(cartE.text) && /épuisé/i.test(cartE.text));
  }
  // Webhook Stripe : événements signés localement avec un secret de test.
  const crypto = await import('node:crypto');
  const secret = 'whsec_test_' + crypto.randomBytes(8).toString('hex');
  await fs.writeFile(path.join(root, '.env'), `STRIPE_WEBHOOK_SECRET=${secret}\n`);
  const target = created[0];
  const signed = (event, ts = Math.floor(Date.now() / 1000), sec = secret) => { const body = JSON.stringify(event); const v1 = crypto.createHmac('sha256', sec).update(`${ts}.${body}`).digest('hex'); return { body, header: `t=${ts},v1=${v1}` }; };
  const hook = async (event, opts = {}) => { const s = signed(event, opts.ts, opts.secret); const r = await fetch(base + '/_stripe/webhook', { method: 'POST', headers: { 'content-type': 'application/json', 'stripe-signature': opts.header ?? s.header }, body: s.body }); return { status: r.status, json: await r.json().catch(() => null) }; };
  const completed = { id: 'evt_1', type: 'checkout.session.completed', data: { object: { id: 'cs_test', client_reference_id: target.id, payment_status: 'paid', payment_intent: 'pi_test' } } };
  const badSig = await hook(completed, { secret: 'whsec_autre' });
  ok('webhook : mauvaise signature → 400', badSig.status === 400 && badSig.json?.error === 'bad_signature', String(badSig.status));
  const old = await hook(completed, { ts: Math.floor(Date.now() / 1000) - 3600 });
  ok('webhook : horodatage trop ancien → 400', old.status === 400 && old.json?.error === 'bad_timestamp');
  const paid = await hook(completed);
  ok('webhook : session payée → 200, commande payée', paid.status === 200 && paid.json?.status === 'paid', JSON.stringify(paid.json));
  const replay = await hook(completed);
  ok('rejeu du paiement : idempotent, commande toujours payée', replay.status === 200 && replay.json?.status === 'paid', JSON.stringify(replay.json));
  const confPaid = await req(`/commande/${target.id}?t=${target.token}`);
  ok('confirmation affiche « Payée »', /Payée/.test(confPaid.text) && /Paiement confirmé/.test(confPaid.text));
  const pendingOrder = created.find(o => o.id !== target.id) || null;
  if (pendingOrder) {
    const stockBefore = JSON.parse(await fs.readFile(path.join(root, 'data', 'stock.json'), 'utf8'));
    const exp = await hook({ id: 'evt_2', type: 'checkout.session.expired', data: { object: { id: 'cs_x', client_reference_id: pendingOrder.id } } });
    ok('webhook : session expirée → commande annulée', exp.status === 200 && exp.json?.status === 'cancelled', JSON.stringify(exp.json));
    const stockAfter = JSON.parse(await fs.readFile(path.join(root, 'data', 'stock.json'), 'utf8'));
    const released = pendingOrder.lines.every(l => !(l.id in stockBefore) || stockAfter[l.id].remaining === Math.min(stockAfter[l.id].base, stockBefore[l.id].remaining + l.qty));
    ok('stock libéré pour les lignes annulées', released, JSON.stringify({ before: stockBefore, after: stockAfter }));
    const exp2 = await hook({ id: 'evt_3', type: 'checkout.session.expired', data: { object: { id: 'cs_x', client_reference_id: pendingOrder.id } } });
    const stockAgain = JSON.parse(await fs.readFile(path.join(root, 'data', 'stock.json'), 'utf8'));
    ok('rejeu de l\'événement : idempotent (stock inchangé)', exp2.status === 200 && JSON.stringify(stockAgain) === JSON.stringify(stockAfter));
  }
  const ignored = await hook({ id: 'evt_4', type: 'payment_intent.created', data: { object: {} } });
  ok('autre événement → 200 ignoré', ignored.status === 200 && ignored.json?.ignored === 'payment_intent.created');
  await fs.rm(path.join(root, '.env'), { force: true });
  const disabled = await hook(completed);
  ok('sans secret → 503', disabled.status === 503);
} catch (e) {
  ok('exécution du script', false, e.message);
} finally {
  try { await fs.rm(path.join(root, '.env'), { force: true }); } catch { /* */ }
  server.kill();
  try { for (const f of ['orders.jsonl', 'events.jsonl', 'stock.json', 'messages.jsonl']) await fs.rm(path.join(root, 'data', f), { force: true }); } catch { /* */ }
}
const passed = checks.filter(c => c.pass).length;
for (const c of checks) console.log(`${c.pass ? 'OK  ' : 'FAIL'} ${c.name}${c.detail && !c.pass ? ' — ' + c.detail : ''}`);
console.log(JSON.stringify({ site: path.relative(process.cwd(), root).replaceAll('\\', '/'), passed, total: checks.length }));
process.exit(passed === checks.length ? 0 : 1);
