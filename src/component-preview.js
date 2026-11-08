// sitec component preview : une page HTML autonome qui montre tous les cas de test d'un composant, rendus par le runtime de la cible,
// avec la feuille du site, ses comportements, et des boutons pour essayer les trois thèmes et une largeur de téléphone.
// C'est l'outil de la relecture visuelle, que la vérification automatique ne remplace pas.
import fs from 'node:fs/promises';
import path from 'node:path';
import { buildCss, THEME_PRESETS } from './emit/php/css.js';
import { behaviorsAssets } from './lang/behaviors.js';
import { renderCases, validCasesOf } from './component-test.js';

const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Écrit <site>/.devanture/preview/<nom>.html et renvoie { file, cases, errors }. */
export async function previewComponent(project, name) {
  const c = project.catalog?.get(name);
  if (!c) throw new Error(`Composant inconnu : ${name}.`);
  if (!c.compiled?.php && !c.files['template.php']) throw new Error(`${name} n'a pas de gabarit rendu.`);
  const site = project.site?.site || {};
  const all = await validCasesOf(c);
  const valid = all.filter(k => !k.invalid);
  const rendered = valid.length ? await renderCases(project, [c], valid) : [];
  const outDir = path.join(project.root, '.devanture', 'preview');
  await fs.mkdir(outDir, { recursive: true });
  // Les assets du site sont servis depuis le dossier source : chemins /assets/… réécrits en relatif depuis .devanture/preview/.
  const rel = html => html.replace(/(src|href|srcset)="\/assets\//g, '$1="../../assets/').replace(/url\(\/assets\//g, 'url(../../assets/').replace(/, \/assets\//g, ', ../../assets/');
  const themes = Object.entries(THEME_PRESETS).map(([k, t]) => `body[data-theme="${k}"]{${Object.entries(t).map(([n, v]) => `--${n.replace(/\./g, '-')}:${v}`).join(';')};background:var(--color-bg);color:var(--color-fg)}`).join('\n');
  const css = buildCss(site, [c]);
  const beh = behaviorsAssets([c]);
  const description = (await fs.readFile(path.join(c.dir, 'description.md'), 'utf8').catch(() => '')).replace(/^# .*\n+/, '').replace(/<!--[\s\S]*?-->/g, '').trim();
  let errors = 0;
  const blocks = all.map(k => {
    if (k.invalid) { errors++; return `<div class="pv-case"><div class="pv-label pv-bad">${esc(k.name)} : cas invalide</div><pre>${esc(k.invalid)}</pre></div>`; }
    const r = rendered[valid.indexOf(k)] || { error: 'pas de rendu' };
    if (r.error) { errors++; return `<div class="pv-case"><div class="pv-label pv-bad">${esc(k.name)} : erreur de rendu</div><pre>${esc(r.error)}</pre></div>`; }
    return `<div class="pv-case"><div class="pv-label">${esc(k.name)}</div><div class="pv-frame">${rel(r.html)}</div></div>`;
  }).join('\n');
  const html = `<!doctype html>
<html lang="${esc(site.locale?.slice(0, 2) || 'fr')}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Aperçu · ${esc(name)}</title>
<style>
${rel(css)}
${themes}
.pv-bar{position:sticky;top:0;z-index:50;display:flex;flex-wrap:wrap;gap:8px;align-items:center;padding:10px 16px;background:#111;color:#eee;font:13px system-ui,sans-serif}
.pv-bar b{margin-right:8px}.pv-bar button{font:inherit;padding:4px 10px;border-radius:999px;border:1px solid #555;background:#222;color:#eee;cursor:pointer}.pv-bar button[aria-pressed=true]{background:#eee;color:#111}
.pv-intro{max-width:var(--max-width);margin:16px auto;padding:0 16px;color:var(--color-muted);font-size:.95rem}
.pv-case{margin:0 auto 8px}.pv-label{max-width:var(--max-width);margin:24px auto 6px;padding:0 16px;font:600 12px system-ui,sans-serif;text-transform:uppercase;letter-spacing:.06em;color:var(--color-muted)}
.pv-bad{color:var(--color-danger)}.pv-case pre{max-width:var(--max-width);margin:0 auto;padding:12px 16px;white-space:pre-wrap;color:var(--color-danger)}
.pv-frame{outline:1px dashed var(--color-border);margin:0 auto;transition:max-width .2s}
body.pv-narrow .pv-frame,body.pv-narrow .pv-label{max-width:390px}
</style>
</head>
<body data-theme="${esc(site.theme?.preset || 'clair')}">
<div class="pv-bar"><b>${esc(name)}</b>
${Object.keys(THEME_PRESETS).map(t => `<button type="button" data-pv-theme="${t}" aria-pressed="${t === (site.theme?.preset || 'clair')}">${t}</button>`).join('')}
<button type="button" data-pv-site aria-pressed="true">thème du site</button>
<button type="button" data-pv-narrow aria-pressed="false">téléphone</button>
<span>${all.length} cas${errors ? `, ${errors} en erreur` : ''}</span></div>
<p class="pv-intro">${esc(c.manifest.description)}${description ? '<br><em>Description : ' + esc(description) + '</em>' : ''}</p>
${blocks}
<script>
document.querySelectorAll('[data-pv-theme]').forEach(function(b){b.addEventListener('click',function(){document.body.dataset.theme=b.dataset.pvTheme;document.querySelectorAll('[data-pv-theme],[data-pv-site]').forEach(function(x){x.setAttribute('aria-pressed',String(x===b));});document.body.classList.add('pv-preset');});});
document.querySelector('[data-pv-site]').addEventListener('click',function(e){document.body.dataset.theme='site';document.querySelectorAll('[data-pv-theme]').forEach(function(x){x.setAttribute('aria-pressed','false');});e.currentTarget.setAttribute('aria-pressed','true');});
document.querySelector('[data-pv-narrow]').addEventListener('click',function(e){var on=document.body.classList.toggle('pv-narrow');e.currentTarget.setAttribute('aria-pressed',String(on));});
document.body.dataset.theme='site';
</script>
${beh.js ? `<script>\n${beh.js}\n</script>` : ''}
</body>
</html>
`;
  const file = path.join(outDir, name + '.html');
  await fs.writeFile(file, html);
  return { file, cases: all.length, errors };
}
