// Rendu « texte simplifié » : une page lisible par section, sans mise en page ni script de suivi,
// avec un ordre de lecture explicite et une lecture à voix haute par le navigateur (Web Speech API).
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const paras = t => String(t ?? '').trim().split(/\n\s*\n/).filter(Boolean).map(p => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join('');
const link = l => l ? `<p><a href="${esc(l.to)}">${esc(l.label)}</a></p>` : '';

function sectionHtml(name, p, ctx) {
  const h = (lvl, t) => t ? `<h${lvl}>${esc(t)}</h${lvl}>` : '';
  switch (name) {
    case 'hero': return `${h(2, p.title)}${p.subtitle ? `<p>${esc(p.subtitle)}</p>` : ''}${link(p.cta)}${link(p.secondary)}`;
    case 'features': return `${h(2, p.title)}${p.intro ? `<p>${esc(p.intro)}</p>` : ''}<ul>${(p.items || []).map(it => `<li><strong>${esc(it.title)}</strong>${it.text ? ` : ${esc(it.text)}` : ''}${it.link ? ` <a href="${esc(it.link.to)}">${esc(it.link.label)}</a>` : ''}</li>`).join('')}</ul>`;
    case 'richtext': return `${h(2, p.title)}${paras(p.text)}${link(p.cta)}`;
    case 'gallery': return `${h(2, p.title || 'Galerie')}${p.intro ? `<p>${esc(p.intro)}</p>` : ''}<ul>${(p.images || []).map(i => `<li>${esc(i.caption || i.alt || 'Image')}</li>`).join('')}</ul>`;
    case 'testimonials': return `${h(2, p.title || 'Avis')}<ul>${(p.items || []).map(t => `<li>« ${esc(t.quote)} » — ${esc(t.author)}${t.role ? `, ${esc(t.role)}` : ''}${t.rating ? ` (${t.rating} sur 5)` : ''}</li>`).join('')}</ul>`;
    case 'faq': return `${h(2, p.title || 'Questions fréquentes')}<dl>${(p.items || []).map(it => `<dt>${esc(it.q)}</dt><dd>${paras(it.a)}</dd>`).join('')}</dl>`;
    case 'cta': return `${h(2, p.title)}${p.text ? `<p>${esc(p.text)}</p>` : ''}${link(p.button)}`;
    case 'team': return `${h(2, p.title || 'Équipe')}<ul>${(p.members || []).map(m => `<li><strong>${esc(m.name)}</strong>${m.role ? `, ${esc(m.role)}` : ''}${m.bio ? `. ${esc(m.bio)}` : ''}</li>`).join('')}</ul>`;
    case 'stats': return `${h(2, p.title || 'Chiffres clés')}<ul>${(p.items || []).map(s => `<li>${esc(String(s.value))} ${esc(s.label)}</li>`).join('')}</ul>`;
    case 'hours': return `${h(2, p.title || 'Horaires d\'ouverture')}${p.intro ? `<p>${esc(p.intro)}</p>` : ''}<ul>${(p.days || []).map(d => `<li>${esc(d.day[0].toUpperCase() + d.day.slice(1))} : ${d.closed || !d.slots ? 'fermé' : d.slots.map(s => s.replace('-', ' à ').replace(/:00/g, ' h').replace(/:(\d\d)/g, ' h $1')).join(' et ')}</li>`).join('')}</ul>${p.note ? `<p>${esc(p.note)}</p>` : ''}`;
    case 'pricelist': return `${h(2, p.title || 'Tarifs')}${p.intro ? `<p>${esc(p.intro)}</p>` : ''}${(p.groups || []).map(g => `${g.title ? `<h3>${esc(g.title)}</h3>` : ''}<ul>${(g.items || []).map(it => `<li>${esc(it.name)} : ${esc(typeof it.price === 'number' ? it.price.toFixed(2).replace('.', ',') + ' €' : it.price)}${it.unit ? ` ${esc(it.unit)}` : ''}${it.description ? ` (${esc(it.description)})` : ''}</li>`).join('')}</ul>`).join('')}${p.note ? `<p>${esc(p.note)}</p>` : ''}`;
    case 'contact.form': return `${h(2, p.title || 'Contact')}${p.intro ? `<p>${esc(p.intro)}</p>` : ''}<p>Le formulaire de contact est sur la <a href="${esc(ctx.route)}#contact">version complète de cette page</a>.${ctx.contact?.phone ? ` Téléphone : <a href="tel:${esc(ctx.contact.phone.replace(/\s+/g, ''))}">${esc(ctx.contact.phone)}</a>.` : ''}${ctx.contact?.email ? ` E-mail : <a href="mailto:${esc(ctx.contact.email)}">${esc(ctx.contact.email)}</a>.` : ''}</p>`;
    case 'products.grid': return `${h(2, p.title || 'Produits')}${p.intro ? `<p>${esc(p.intro)}</p>` : ''}<ul>${(ctx.products || []).filter(x => (!p.filter?.category || x.category === p.filter.category) && (!p.filter?.featured || x.featured)).slice(0, p.limit || 100).map(x => `<li>${ctx.productRoute ? `<a href="${esc(ctx.productRoute.replace('{id}', x.id))}">${esc(x.name)}</a>` : esc(x.name)} : ${x.price.toFixed(2).replace('.', ',')} €${x.stock === 0 ? ' (épuisé)' : ''}</li>`).join('')}</ul>`;
    case 'cart.page': return `<h2>Panier</h2><p>Le panier est disponible sur la <a href="${esc(ctx.route)}">version complète</a>.</p>`;
    case 'checkout.page': return `<h2>Commande</h2><p>La commande se passe sur la <a href="${esc(ctx.route)}">version complète</a>.</p>`;
    case 'collection.list': return `${h(2, p.title)}${p.intro ? `<p>${esc(p.intro)}</p>` : ''}<ul>${(p._items || []).map(it => { const t = esc(String(it[p._fields?.title] ?? it.id)); const u = p._route ? p._route.replace('[id]', it.id) : null; return `<li>${u ? `<a href="${esc(u)}">${t}</a>` : t}</li>`; }).join('')}</ul>`;
    case 'recent': return '';
    default: return `${h(2, p.title)}${p.text ? paras(p.text) : ''}`;
  }
}

export function buildReadablePage(page, site, ctx) {
  const title = page.data.seo?.title || site.name;
  const body = page.data.sections.map(s => { const name = Object.keys(s)[0]; const { variants, ...p } = s[name] || {}; return sectionHtml(name, p, { ...ctx, route: page.data.route }); }).filter(Boolean).join('\n');
  const nav = (site.nav || []).map(l => `<li><a href="/lisible${l.to === '/' ? '/' : l.to}">${esc(l.label)}</a></li>`).join('');
  return `<!doctype html>
<html lang="${esc((site.locale || 'fr-FR').slice(0, 2))}">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} (version texte)</title>
<meta name="description" content="${esc(page.data.seo?.description || site.tagline || title)} Version texte simplifié, lisible et écoutable.">
<meta name="robots" content="noindex"><link rel="canonical" href="${esc(page.data.route)}">
<style>
body{max-width:46rem;margin:0 auto;padding:1.5rem 1rem 4rem;font:20px/1.7 Georgia,"Times New Roman",serif;color:#111;background:#fff}
@media (prefers-color-scheme:dark){body{color:#eee;background:#111}a{color:#9cf}}
h1{font-size:1.9rem;line-height:1.25}h2{font-size:1.4rem;margin-top:2.2rem}h3{font-size:1.15rem}
nav ul{list-style:none;padding:0;display:flex;flex-wrap:wrap;gap:.4rem 1.2rem}
dt{font-weight:bold;margin-top:1rem}dd{margin:0 0 .6rem}
.tools{display:flex;gap:.8rem;flex-wrap:wrap;margin:1rem 0 2rem}
.tools button,.tools a{font:inherit;font-size:1rem;padding:.5rem 1rem;border:2px solid currentColor;border-radius:8px;background:none;color:inherit;cursor:pointer;text-decoration:none}
a:focus,button:focus{outline:3px solid #f90;outline-offset:2px}
</style>
</head>
<body>
<a href="#contenu" style="position:absolute;left:-999px" onfocus="this.style.left='1rem'">Aller au contenu</a>
<header><p><strong>${esc(site.name)}</strong> — version texte</p>
<nav aria-label="Pages"><ul>${nav}</ul></nav>
<div class="tools"><button type="button" id="lire" aria-pressed="false">Écouter cette page</button><a href="${esc(page.data.route)}">Version complète</a></div>
</header>
<main id="contenu">
<h1>${esc(title.split(/\s[·|–-]\s/)[0])}</h1>
${body}
</main>
<footer><p>${esc(site.name)}${site.contact?.address ? ` — ${esc(site.contact.address)}` : ''}${site.contact?.phone ? ` — ${esc(site.contact.phone)}` : ''}</p></footer>
<script>
(function(){var b=document.getElementById('lire');if(!('speechSynthesis' in window)){b.disabled=true;b.textContent='Lecture non disponible';return;}
var on=false,u=null;b.addEventListener('click',function(){if(on){speechSynthesis.cancel();on=false;b.textContent='Écouter cette page';b.setAttribute('aria-pressed','false');return;}
var t=document.getElementById('contenu').innerText;u=new SpeechSynthesisUtterance(t);u.lang='${esc(site.locale || 'fr-FR')}';u.rate=0.95;u.onend=function(){on=false;b.textContent='Écouter cette page';b.setAttribute('aria-pressed','false');};speechSynthesis.speak(u);on=true;b.textContent='Arrêter la lecture';b.setAttribute('aria-pressed','true');});})();
</script>
</body>
</html>
`;
}
