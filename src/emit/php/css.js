import { behaviorsAssets } from '../../lang/behaviors.js';
export const THEME_PRESETS = {
  clair: {
    'color.bg': '#ffffff', 'color.surface': '#f5f6f8', 'color.fg': '#1b1f24', 'color.muted': '#5b6470',
    'color.primary': '#1f3a5f', 'color.primary-fg': '#ffffff', 'color.accent': '#c8a24a', 'color.border': '#e1e5ea', 'color.success': '#2e7d4f', 'color.warning': '#b36b00', 'color.danger': 'var(--color-danger)',
    'font.body': 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif', 'font.heading': 'Georgia, "Times New Roman", serif',
    'radius': '10px', 'max-width': '1100px',
  },
  sombre: {
    'color.bg': '#0f1216', 'color.surface': '#171c22', 'color.fg': '#e8ebef', 'color.muted': '#9aa4b1',
    'color.primary': '#8fb4e3', 'color.primary-fg': '#0f1216', 'color.accent': '#e0b85a', 'color.border': '#2a323d', 'color.success': '#5cc28a', 'color.warning': '#f0b45a', 'color.danger': '#ff7a6b',
    'font.body': 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif', 'font.heading': 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    'radius': '8px', 'max-width': '1100px',
  },
  chaleureux: {
    'color.bg': '#fdfaf5', 'color.surface': '#f3ebdd', 'color.fg': '#2b2118', 'color.muted': '#6f6256',
    'color.primary': '#8a4b2a', 'color.primary-fg': '#ffffff', 'color.accent': '#5d7a4a', 'color.border': '#e3d6c2', 'color.success': '#4f7a3a', 'color.warning': '#a8650f', 'color.danger': '#b23a2a',
    'font.body': 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif', 'font.heading': '"Palatino Linotype", Palatino, Georgia, serif',
    'radius': '14px', 'max-width': '1100px',
  },
};

const BASE_CSS = `
*,*::before,*::after{box-sizing:border-box}
html{scroll-behavior:smooth}
body{margin:0;background:var(--color-bg);color:var(--color-fg);font:16px/1.6 var(--font-body)}
img{max-width:100%;height:auto;display:block}
a{color:var(--color-primary)}
h1,h2,h3{font-family:var(--font-heading);line-height:1.2;margin:0 0 .5em}
h1{font-size:clamp(2rem,4vw,3rem)}h2{font-size:clamp(1.5rem,3vw,2.1rem)}h3{font-size:1.2rem}
p{margin:0 0 1em}
.container{max-width:var(--max-width);margin:0 auto;padding:0 20px}
.section{padding:64px 0}
main > .section ~ .section{padding-top:0}
.anchor{display:block;height:0;scroll-margin-top:80px}
.section-head{max-width:720px;margin:0 auto 36px;text-align:center}
.section-head p{color:var(--color-muted)}
.btn{display:inline-block;padding:12px 22px;border-radius:var(--radius);background:var(--color-primary);color:var(--color-primary-fg);text-decoration:none;font-weight:600;border:2px solid var(--color-primary)}
.btn:hover{filter:brightness(1.1)}
.btn.btn-outline{background:transparent;color:var(--color-primary)}
.grid{display:grid;gap:24px}
.grid-2{grid-template-columns:repeat(auto-fit,minmax(280px,1fr))}
.grid-3{grid-template-columns:repeat(auto-fit,minmax(240px,1fr))}
.grid-4{grid-template-columns:repeat(auto-fit,minmax(200px,1fr))}
.card{background:var(--color-surface);border:1px solid var(--color-border);border-radius:var(--radius);padding:24px}
.muted{color:var(--color-muted)}
.site-header{position:sticky;top:0;z-index:10;background:var(--color-bg);border-bottom:1px solid var(--color-border)}
.site-header .container{display:flex;align-items:center;justify-content:space-between;min-height:64px;gap:16px}
.brand{font-family:var(--font-heading);font-weight:700;font-size:1.25rem;color:var(--color-fg);text-decoration:none}
.nav-toggle{display:none;background:none;border:1px solid var(--color-border);border-radius:6px;padding:6px 10px;color:var(--color-fg);font-size:1.2rem}
.site-nav > ul{display:flex;gap:4px;list-style:none;margin:0;padding:0;flex-wrap:wrap}
.site-nav > ul a{display:block;padding:8px 12px;border-radius:6px;color:var(--color-fg);text-decoration:none;white-space:nowrap}
.site-nav > ul a:hover,.site-nav > ul a[aria-current=page]{background:var(--color-surface);color:var(--color-primary)}
.brand{white-space:nowrap}
.site-nav{display:flex;align-items:center;gap:12px}
.intent{position:relative}
.intent input{width:190px;padding:7px 12px;border:1px solid var(--color-border);border-radius:999px;background:var(--color-surface);color:var(--color-fg);font:inherit;font-size:.92rem;transition:width .15s}
.intent input:focus{outline:2px solid var(--color-primary);outline-offset:1px;width:260px}
@media (max-width:1100px){.intent input{width:150px}.intent input:focus{width:220px}}
.intent-results{display:block;position:absolute;right:0;top:calc(100% + 6px);width:340px;max-width:90vw;list-style:none;margin:0;padding:6px;background:var(--color-bg);border:1px solid var(--color-border);border-radius:var(--radius);box-shadow:0 10px 30px rgba(0,0,0,.12);z-index:20}
.intent-results li{padding:8px 10px;border-radius:6px;cursor:pointer}
.intent-results li:hover,.intent-results li[aria-selected=true]{background:var(--color-surface)}
.intent-results .ir-title{display:block;font-weight:600}
.intent-results .ir-page{display:block;font-size:.85rem;color:var(--color-muted)}
.intent-results .ir-empty{color:var(--color-muted);cursor:default}
.intent-results .ir-answer{background:var(--color-surface);border:1px solid var(--color-border);margin-bottom:6px}
.intent-results .ir-answer .ir-text{display:block;white-space:normal;font-size:.92rem;margin:4px 0 6px;color:var(--color-fg)}
.intent-results .ir-answer .ir-page{color:var(--color-primary);font-weight:600}
.field[hidden]{display:none}
/* Formulaires : contact et formulaires déclarés des composants (effects.form) partagent ces règles. */
.sl-form .field,.contact-form .field{margin-bottom:16px}
.sl-form label,.contact-form label{display:block;font-weight:600;margin-bottom:6px}
.sl-form input,.sl-form textarea,.sl-form select,.contact-form input,.contact-form textarea,.contact-form select{width:100%;padding:10px 12px;border:1px solid var(--color-border);border-radius:6px;background:var(--color-bg);color:var(--color-fg);font:inherit}
.sl-form input:focus,.sl-form textarea:focus,.sl-form select:focus,.contact-form input:focus,.contact-form textarea:focus,.contact-form select:focus{outline:2px solid var(--color-primary);outline-offset:1px}
.sl-form .has-error input,.sl-form .has-error textarea,.sl-form .has-error select,.contact-form .has-error input,.contact-form .has-error textarea,.contact-form .has-error select{border-color:var(--color-danger)}
.field-error,.form-error{color:var(--color-danger);font-size:.9rem;margin-top:4px}
.form-error{margin-bottom:12px}
.hp{position:absolute;left:-9999px;opacity:0;height:0;overflow:hidden}
.contact-success{border-color:var(--color-accent)}
.consent{position:fixed;left:16px;right:16px;bottom:16px;max-width:560px;margin:0 auto;background:var(--color-bg);border:1px solid var(--color-border);border-radius:var(--radius);box-shadow:0 10px 30px rgba(0,0,0,.18);padding:16px 18px;z-index:50;font-size:.95rem}
.consent[hidden]{display:none}
.consent p{margin:0 0 12px}
.consent-actions{display:flex;gap:10px;flex-wrap:wrap}
.consent .btn{padding:8px 16px}
.site-footer{border-top:1px solid var(--color-border);padding:32px 0;margin-top:48px;color:var(--color-muted);font-size:.95rem}
.site-footer .container{display:flex;flex-wrap:wrap;gap:16px 32px;justify-content:space-between;align-items:center}
.site-footer ul{display:flex;gap:16px;list-style:none;margin:0;padding:0;flex-wrap:wrap}
.site-footer a{color:var(--color-muted)}
.page-404{padding:120px 0;text-align:center}
@media (max-width:760px){
  .nav-toggle{display:block}
  .site-nav{display:none;position:absolute;left:0;right:0;top:64px;background:var(--color-bg);border-bottom:1px solid var(--color-border);padding:12px 20px}
  .site-nav.open{display:block}
  .site-nav > ul{flex-direction:column}
  .intent{margin-top:10px}
  .intent input,.intent input:focus{width:100%}
  .intent-results{left:0;right:0;min-width:0}
  .section{padding:48px 0}
}
`;

export function buildCss(site, usedComponents) {
  const preset = THEME_PRESETS[site.theme?.preset || 'clair'];
  const tokens = { ...preset, ...(site.theme?.tokens || {}) };
  const vars = Object.entries(tokens).map(([k, v]) => `  --${k.replace(/\./g, '-')}: ${v};`).join('\n');
  const comps = usedComponents.map(c => c.files['styles.css'] ? `/* ${c.name} */\n${c.files['styles.css'].trim()}` : '').filter(Boolean).join('\n\n');
  const beh = behaviorsAssets(usedComponents).css;
  return `:root {\n${vars}\n}\n${BASE_CSS}\n${beh ? '/* comportements déclarés */\n' + beh + '\n' : ''}${comps}\n`;
}
