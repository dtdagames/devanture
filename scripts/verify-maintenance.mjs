// Contrôle des 4 modifications du test de maintenance sur un site PHP servi par php -S.
// Usage : node scripts/verify-maintenance.mjs <dossier-site> <port> <garnier|fournil>
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

const [dir, portArg, brief] = process.argv.slice(2);
if (!dir || !portArg || !['garnier', 'fournil'].includes(brief)) { console.error('usage: verify-maintenance.mjs <dossier> <port> <garnier|fournil>'); process.exit(2); }
const PHP = 'C:/Users/sergi/AppData/Local/Microsoft/WinGet/Packages/PHP.PHP.8.3_Microsoft.Winget.Source_8wekyb3d8bbwe/php.exe';
const root = path.resolve(dir);
const base = `http://127.0.0.1:${portArg}`;

const EXPECT = {
  garnier: {
    faq: ['Combien coûte la première consultation ?', 'Intervenez-vous en dehors de Bordeaux ?', 'Comment sont fixés les honoraires ?'],
    faqA: 'convention d\'honoraires signée avant toute intervention',
    seoTitle: 'Recrutement', seoDesc: 'Le cabinet recrute un collaborateur ou une collaboratrice en droit des affaires à Bordeaux.',
    sub: 'Le cabinet recrute un collaborateur ou une collaboratrice en droit des affaires.',
    para: 'Vous rejoindrez l\'équipe de Me Thomas Ruiz',
  },
  fournil: {
    faq: ['Faites-vous du pain sans gluten ?', 'Peut-on réserver une pièce montée ?', 'Êtes-vous ouverts le lundi ?'],
    faqA: 'fermée le lundi',
    seoTitle: 'Recrutement', seoDesc: 'La boulangerie Le Fournil recrute un apprenti boulanger à Nantes pour la rentrée.',
    sub: 'Le Fournil recrute un apprenti boulanger pour la rentrée.',
    para: 'Vous apprendrez le pain au levain naturel',
  },
}[brief];

const checks = [];
const ok = (mod, name, pass, detail = '') => checks.push({ mod, name, pass: !!pass, detail });
const norm = s => s.replace(/&#039;|&#x27;|&apos;/g, '\'').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/\s+/g, ' ');

const server = spawn(PHP, ['-S', `127.0.0.1:${portArg}`, '-t', root, path.join(root, 'index.php')], { stdio: 'ignore' });
let cookie = '';
async function get(p, opts = {}) {
  const r = await fetch(base + p, { redirect: 'manual', headers: { cookie, ...(opts.headers || {}) }, method: opts.method || 'GET', body: opts.body });
  const sc = r.headers.get('set-cookie'); if (sc) cookie = sc.split(';')[0];
  return { status: r.status, text: await r.text() };
}

try {
  for (let i = 0; i < 40; i++) { try { await fetch(base + '/'); break; } catch { await new Promise(r => setTimeout(r, 150)); } }

  // M1 : FAQ sur l'accueil
  const home = await get('/');
  const h = norm(home.text);
  for (const q of EXPECT.faq) ok('M1', `accueil contient « ${q} »`, h.includes(q));
  ok('M1', 'réponse présente', h.includes(EXPECT.faqA));
  ok('M1', 'accordéon (<details>) présent sur l\'accueil', /<details/i.test(home.text));
  const idxFaq = h.indexOf(EXPECT.faq[0]);
  const lastCta = Math.max(h.lastIndexOf('class="btn"'), h.lastIndexOf('class="cta'), h.lastIndexOf('cta-inner'));
  ok('M1', 'FAQ placée avant le dernier appel à l\'action', idxFaq > 0 && (lastCta < 0 || idxFaq < lastCta), `faq@${idxFaq} cta@${lastCta}`);

  // M2 : thème
  const cssHrefs = [...home.text.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"|<link[^>]+href="([^"]+\.css[^"]*)"/gi)].map(m => m[1] || m[2]).filter(Boolean);
  let css = '';
  for (const href of cssHrefs) css += (await get(href.startsWith('http') ? new URL(href).pathname : href)).text + '\n';
  const inline = [...home.text.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map(m => m[1]).join('\n');
  const allCss = css + inline;
  // Valeur effective de chaque variable : dernière déclaration dans l'ordre de cascade des blocs :root.
  const vars = {};
  for (const m of allCss.matchAll(/:root\s*\{([^}]*)\}/gi)) for (const d of m[1].matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) vars[d[1]] = d[2].trim();
  const pick = re => Object.entries(vars).filter(([k]) => re.test(k));
  const primary = pick(/primary|primaire|brand/i).filter(([k]) => !/dark|light|fg|soft|hover/i.test(k));
  const accent = pick(/accent/i);
  const heading = pick(/head|title|titre/i).filter(([, v]) => !/^#|^\d/.test(v) && /[a-z]{3,}/i.test(v));
  ok('M2', 'couleur principale effective = #6b2d5c', primary.length && primary.every(([, v]) => /#6b2d5c/i.test(v)), primary.map(([k, v]) => `${k}:${v}`).join(' ') || 'aucune variable « primary »');
  ok('M2', 'couleur d\'accent effective = #d4a017', accent.length && accent.every(([, v]) => /#d4a017/i.test(v)), accent.map(([k, v]) => `${k}:${v}`).join(' ') || 'aucune variable « accent »');
  ok('M2', 'police des titres effective = Georgia', heading.length && heading.every(([, v]) => /georgia/i.test(v)), heading.map(([k, v]) => `${k}:${v}`).join(' ') || 'aucune variable de police de titres');
  ok('M2', 'thème porté par des variables :root (pas de couleur principale en dur ailleurs)', !/#(1f3a5f|0b5d8a|8a4b1c|8a4b2a)\b/i.test(allCss.replace(/:root\s*\{[^}]*\}/gi, '')));

  // M3 : page recrutement
  const rec = await get('/recrutement');
  const r = norm(rec.text);
  ok('M3', 'GET /recrutement → 200', rec.status === 200, String(rec.status));
  ok('M3', 'sans erreur PHP', !/(Fatal error|Warning:|Notice:)/.test(rec.text));
  ok('M3', 'titre SEO contient « Recrutement »', new RegExp(`<title>[^<]*${EXPECT.seoTitle}`).test(rec.text));
  const desc = /<meta\s+name="description"\s+content="([^"]*)"/i.exec(rec.text)?.[1] || /<meta\s+content="([^"]*)"\s+name="description"/i.exec(rec.text)?.[1] || '';
  ok('M3', 'description SEO exacte', norm(desc) === EXPECT.seoDesc, norm(desc));
  ok('M3', 'titre « Rejoignez-nous »', r.includes('Rejoignez-nous'));
  ok('M3', 'sous-titre exact', r.includes(EXPECT.sub));
  ok('M3', 'bloc « Le poste » avec le texte', r.includes('Le poste') && r.includes(EXPECT.para));
  ok('M3', 'bouton « Postuler » vers /contact', /<a[^>]+href="\/contact"[^>]*>\s*Postuler\s*<\/a>/i.test(rec.text));
  const nav = /<nav[\s\S]*?<\/nav>/i.exec(home.text)?.[0] || '';
  const navLabels = [...nav.matchAll(/<a[^>]*>([^<]+)<\/a>/gi)].map(m => norm(m[1]).trim());
  const iRec = navLabels.indexOf('Recrutement'), iContact = navLabels.indexOf('Contact');
  ok('M3', 'entrée « Recrutement » dans le menu juste avant « Contact »', iRec >= 0 && iContact === iRec + 1, navLabels.join(' | '));
  const footers = [...home.text.matchAll(/<footer[\s\S]*?<\/footer>/gi)].map(m => m[0]);
  ok('M3', 'lien « Recrutement » dans le pied de page', footers.some(f => /href="\/recrutement"/i.test(f)), `${footers.length} <footer>`);
  ok('M3', 'page marquée courante dans la nav', /aria-current="page"/.test(rec.text));

  // M4 : champ Entreprise
  let contactPath = null;
  for (const p of ['/contact', '/nous-contacter', '/contactez-nous']) { const t = await get(p); if (t.status === 200 && /<form/i.test(t.text)) { contactPath = p; break; } }
  if (!contactPath) {
    for (const m of home.text.matchAll(/href="(\/[a-z0-9\-\/]*)"/g)) { const t = await get(m[1]); if (t.status === 200 && /<form[^>]+method="post"/i.test(t.text)) { contactPath = m[1]; break; } }
  }
  ok('M4', 'page contact trouvée', !!contactPath, contactPath || '');
  if (contactPath) {
    const page = await get(contactPath);
    const formHtml = /<form[^>]*method="post"[\s\S]*?<\/form>/i.exec(page.text)?.[0] || /<form[\s\S]*?<\/form>/i.exec(page.text)?.[0] || '';
    ok('M4', 'champ name="company" présent', /name="company"/.test(formHtml));
    ok('M4', 'libellé « Entreprise »', /Entreprise/.test(formHtml));
    const companyTag = /<input[^>]*name="company"[^>]*>/.exec(formHtml)?.[0] || '';
    ok('M4', 'champ facultatif (pas d\'attribut required)', companyTag && !/\brequired\b/.test(companyTag));
    const names = [...formHtml.matchAll(/<(?:input|textarea)[^>]*name="([^"]+)"/gi)].map(m => m[1]);
    const iPhone = names.findIndex(n => /phone|tel/i.test(n)), iMail = names.findIndex(n => /mail/i.test(n)), iComp = names.indexOf('company');
    ok('M4', 'placé après le téléphone (ou l\'e-mail)', iComp > (iPhone >= 0 ? iPhone : iMail), names.join(','));
    const fields = [];
    for (const m of formHtml.matchAll(/<input[^>]*>/gi)) { const tag = m[0]; const name = /name="([^"]+)"/.exec(tag)?.[1]; if (!name) continue; fields.push({ name, type: (/type="([^"]+)"/.exec(tag)?.[1] || 'text').toLowerCase(), value: /value="([^"]*)"/.exec(tag)?.[1] ?? '' }); }
    for (const m of formHtml.matchAll(/<textarea[^>]*name="([^"]+)"/gi)) fields.push({ name: m[1], type: 'textarea', value: '' });
    const body = {};
    for (const f of fields) {
      if (f.type === 'hidden') { body[f.name] = f.value; continue; }
      if (/website|site_?web|url|honey|^hp|company_?url|fax|trap/i.test(f.name) && f.name !== 'company') continue;
      if (f.name === 'company') body[f.name] = 'ACME Maintenance SARL';
      else if (f.type === 'email' || /mail/i.test(f.name)) body[f.name] = 'test@example.test';
      else if (f.type === 'tel' || /phone|tel/i.test(f.name)) body[f.name] = '0600000000';
      else if (f.type === 'textarea' || /message/i.test(f.name)) body[f.name] = 'Message test maintenance.';
      else body[f.name] = 'Test Maintenance';
    }
    const sent = await get(contactPath, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(body).toString() });
    ok('M4', 'envoi accepté', sent.status === 200 && /envoy|merci|succ/i.test(sent.text) && !/(Fatal error|Warning:|Notice:)/.test(sent.text), String(sent.status));
    let stored = false;
    try { for (const f of await fs.readdir(path.join(root, 'data'))) if ((await fs.readFile(path.join(root, 'data', f), 'utf8')).includes('"company":"ACME Maintenance SARL"')) stored = true; } catch { /* */ }
    ok('M4', 'clé company enregistrée dans le JSONL', stored);
  }
} catch (e) {
  ok('--', 'exécution du script', false, e.message);
} finally {
  server.kill();
  try { await fs.rm(path.join(root, 'data'), { recursive: true, force: true }); } catch { /* */ }
}

const byMod = {};
for (const c of checks) { byMod[c.mod] ??= { passed: 0, total: 0 }; byMod[c.mod].total++; if (c.pass) byMod[c.mod].passed++; }
for (const c of checks) console.log(`${c.pass ? 'OK  ' : 'FAIL'} ${c.mod} ${c.name}${c.detail && !c.pass ? ' — ' + c.detail : ''}`);
console.log(JSON.stringify({ site: path.relative(process.cwd(), root).replaceAll('\\', '/'), ...byMod }));
