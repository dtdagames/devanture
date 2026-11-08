// Comportements déclarés : le côté navigateur des composants sans JavaScript libre. Un composant les déclare (manifest.yaml ›
// behaviors: [tabs, carousel]) et les pose dans son gabarit par des attributs data-sl-… ; le compilateur fournit le code, accessible
// (rôles ARIA, clavier, prefers-reduced-motion), et ne l'inclut que si un composant utilisé le déclare. Sans JavaScript, le contenu reste
// lisible : onglets et carrousel montrent tout, une bascule laisse sa cible dans l'état écrit.

export const BEHAVIORS = {
  toggle: {
    description: 'bascule : un bouton montre ou cache une zone',
    usage: '<button type="button" data-sl-toggle="zone-id">Afficher</button> … <div id="zone-id" hidden>…</div>',
    attrs: ['data-sl-toggle'],
    js: `document.addEventListener('click',function(e){var b=e.target.closest('[data-sl-toggle]');if(!b)return;var t=document.getElementById(b.getAttribute('data-sl-toggle'));if(!t)return;t.hidden=!t.hidden;b.setAttribute('aria-expanded',String(!t.hidden));});
document.querySelectorAll('[data-sl-toggle]').forEach(function(b){var t=document.getElementById(b.getAttribute('data-sl-toggle'));if(t){b.setAttribute('aria-controls',t.id);b.setAttribute('aria-expanded',String(!t.hidden));}});`,
    css: '',
  },
  tabs: {
    description: 'onglets : des boutons choisissent le panneau affiché',
    usage: '<div data-sl-tabs><button data-sl-tab="a">A</button><button data-sl-tab="b">B</button><div data-sl-panel="a">…</div><div data-sl-panel="b">…</div></div>',
    attrs: ['data-sl-tabs', 'data-sl-tab', 'data-sl-panel'],
    js: `document.querySelectorAll('[data-sl-tabs]').forEach(function(box,n){var tabs=[].slice.call(box.querySelectorAll('[data-sl-tab]')),panels=[].slice.call(box.querySelectorAll('[data-sl-panel]'));if(!tabs.length)return;
var list=tabs[0].parentElement;list.setAttribute('role','tablist');
function show(k,focus){tabs.forEach(function(t){var on=t.getAttribute('data-sl-tab')===k;t.setAttribute('aria-selected',String(on));t.tabIndex=on?0:-1;if(on&&focus)t.focus();});panels.forEach(function(p){p.hidden=p.getAttribute('data-sl-panel')!==k;});}
tabs.forEach(function(t,i){var k=t.getAttribute('data-sl-tab');t.setAttribute('role','tab');t.id=t.id||'sl-tab-'+n+'-'+k;var p=box.querySelector('[data-sl-panel="'+k+'"]');if(p){p.setAttribute('role','tabpanel');p.setAttribute('aria-labelledby',t.id);}
t.addEventListener('click',function(){show(k);});t.addEventListener('keydown',function(e){var d=e.key==='ArrowRight'?1:e.key==='ArrowLeft'?-1:0;if(!d)return;e.preventDefault();var j=(i+d+tabs.length)%tabs.length;show(tabs[j].getAttribute('data-sl-tab'),true);});});
show(tabs[0].getAttribute('data-sl-tab'));});`,
    css: '[data-sl-tab][aria-selected=true]{border-color:var(--color-primary);color:var(--color-primary)}',
  },
  carousel: {
    description: 'carrousel : une rangée qui défile, boutons précédent et suivant, défilement automatique facultatif',
    usage: '<div data-sl-carousel data-sl-autoplay="6000"><button data-sl-prev>‹</button><div data-sl-track><div>…</div><div>…</div></div><button data-sl-next>›</button></div>',
    attrs: ['data-sl-carousel', 'data-sl-track', 'data-sl-prev', 'data-sl-next', 'data-sl-autoplay'],
    js: `document.querySelectorAll('[data-sl-carousel]').forEach(function(box){var track=box.querySelector('[data-sl-track]');if(!track)return;box.setAttribute('role','region');box.setAttribute('aria-roledescription','carrousel');
function step(d){var c=track.children;var w=c.length>1?c[1].offsetLeft-c[0].offsetLeft:track.clientWidth;var end=track.scrollLeft+track.clientWidth>=track.scrollWidth-4;if(d>0&&end)track.scrollTo({left:0,behavior:'smooth'});else track.scrollBy({left:d*w,behavior:'smooth'});}
var p=box.querySelector('[data-sl-prev]'),nx=box.querySelector('[data-sl-next]');if(p){p.setAttribute('aria-label',p.getAttribute('aria-label')||'Précédent');p.addEventListener('click',function(){step(-1);});}if(nx){nx.setAttribute('aria-label',nx.getAttribute('aria-label')||'Suivant');nx.addEventListener('click',function(){step(1);});}
var ms=parseInt(box.getAttribute('data-sl-autoplay')||'0',10);if(ms>=2000&&!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches)){var timer=setInterval(function(){step(1);},ms);['mouseenter','focusin','touchstart'].forEach(function(ev){box.addEventListener(ev,function(){clearInterval(timer);},{passive:true});});}});`,
    css: '[data-sl-track]{display:flex;gap:16px;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:thin}[data-sl-track]>*{flex:0 0 auto;scroll-snap-align:start}[data-sl-prev],[data-sl-next]{background:var(--color-surface);border:1px solid var(--color-border);border-radius:999px;width:40px;height:40px;cursor:pointer;color:var(--color-fg)}',
  },
  lightbox: {
    description: 'agrandissement : un lien vers une image l\'ouvre en plein écran (Échap ou clic pour fermer)',
    usage: '<a href="{{ img_src(p.image, 1600) }}" data-sl-lightbox>{{ img(p.image, p.title) }}</a>',
    attrs: ['data-sl-lightbox'],
    js: `document.addEventListener('click',function(e){var a=e.target.closest('a[data-sl-lightbox]');if(!a)return;e.preventDefault();var box=document.createElement('div');box.className='sl-lightbox';box.setAttribute('role','dialog');box.setAttribute('aria-modal','true');var im=document.createElement('img');im.src=a.getAttribute('href');im.alt=(a.querySelector('img')||{}).alt||'';box.appendChild(im);
function close(){box.remove();document.removeEventListener('keydown',key);a.focus();}function key(k){if(k.key==='Escape')close();}box.tabIndex=-1;box.addEventListener('click',close);document.addEventListener('keydown',key);document.body.appendChild(box);box.focus();});`,
    css: '.sl-lightbox{position:fixed;inset:0;background:rgba(0,0,0,.85);display:flex;align-items:center;justify-content:center;z-index:100;cursor:zoom-out}.sl-lightbox img{max-width:92vw;max-height:92vh;border-radius:6px}',
  },
  filter: {
    description: 'filtre : des boutons ne montrent que les éléments d\'une catégorie',
    usage: '<div data-sl-filters><button data-sl-filter="*">Tout</button><button data-sl-filter="a">A</button></div> … <article data-sl-filter-item="a b">…</article>',
    attrs: ['data-sl-filters', 'data-sl-filter', 'data-sl-filter-item'],
    js: `document.querySelectorAll('[data-sl-filters]').forEach(function(bar){var scope=bar.closest('section')||document;var btns=[].slice.call(bar.querySelectorAll('[data-sl-filter]'));
function apply(v){btns.forEach(function(b){b.setAttribute('aria-pressed',String(b.getAttribute('data-sl-filter')===v));});scope.querySelectorAll('[data-sl-filter-item]').forEach(function(it){it.hidden=v!=='*'&&(' '+it.getAttribute('data-sl-filter-item')+' ').indexOf(' '+v+' ')<0;});}
btns.forEach(function(b){b.addEventListener('click',function(){apply(b.getAttribute('data-sl-filter'));});});if(btns.length)apply(btns[0].getAttribute('data-sl-filter'));});`,
    css: '[data-sl-filter][aria-pressed=true]{background:var(--color-primary);color:var(--color-primary-fg);border-color:var(--color-primary)}',
  },
  copy: {
    description: 'copier : un bouton copie un texte (code promo, adresse, IBAN) dans le presse-papiers',
    usage: '<button type="button" data-sl-copy="{{ p.code }}">Copier le code</button>',
    attrs: ['data-sl-copy'],
    js: `document.addEventListener('click',function(e){var b=e.target.closest('[data-sl-copy]');if(!b||!navigator.clipboard)return;navigator.clipboard.writeText(b.getAttribute('data-sl-copy')).then(function(){var t=b.textContent;b.textContent='Copié ✓';setTimeout(function(){b.textContent=t;},1600);});});`,
    css: '',
  },
};
export const BEHAVIOR_NAMES = Object.keys(BEHAVIORS);

/** Comportements dont le gabarit utilise les attributs. */
export function behaviorsUsedIn(template) {
  const out = new Set();
  for (const [name, b] of Object.entries(BEHAVIORS)) if (b.attrs.some(a => new RegExp(`\\b${a}(?![\\w-])`).test(template))) out.add(name);
  return [...out];
}

/** Code navigateur et CSS de base des comportements déclarés par les composants utilisés. */
export function behaviorsAssets(usedComponents) {
  const names = [...new Set(usedComponents.flatMap(c => Array.isArray(c.manifest?.behaviors) ? c.manifest.behaviors : []))].filter(n => BEHAVIORS[n]).sort();
  return {
    names,
    js: names.length ? `/* comportements déclarés : ${names.join(', ')} */\n(function(){\n${names.map(n => BEHAVIORS[n].js).join('\n')}\n})();` : '',
    css: names.map(n => BEHAVIORS[n].css).filter(Boolean).join('\n'),
  };
}
