const BASE_JS = `
(function(){
  var t=document.querySelector('.nav-toggle'),n=document.querySelector('.site-nav');
  if(t&&n){t.addEventListener('click',function(){var o=n.classList.toggle('open');t.setAttribute('aria-expanded',o?'true':'false');});}
})();

/* Arrivée sur une ancre : ouvrir le <details> visé et garantir le défilement (même après chargement des images). */
(function(){
  function openHash(){ if(!location.hash) return; var el=document.getElementById(location.hash.slice(1)); if(!el) return; if(el.tagName==='DETAILS') el.open=true; el.scrollIntoView(); }
  window.addEventListener('hashchange',openHash); window.addEventListener('load',function(){ setTimeout(openHash,50); }); openHash();
})();

/* Personnalisation : profil agrégé dans un cookie first-party, segments évalués comme en PHP, consentement. */
(function(){
  var SL=window.SL; if(!SL||!SL.spec) return;
  var spec=SL.spec, tracked=spec.tracked||{events:['page_view'],where:[]};
  function getCookie(n){ var m=document.cookie.match(new RegExp('(?:^|; )'+n+'=([^;]*)')); return m?decodeURIComponent(m[1]):null; }
  function setCookie(n,v,days){ document.cookie=n+'='+encodeURIComponent(v)+'; path=/; max-age='+(days*86400)+'; SameSite=Lax'; }
  function allowed(){ return !SL.consent.required || getCookie('sl_c')==='1'; }
  var profile; try{ profile=JSON.parse(getCookie('sl_p')||''); }catch(e){ profile=null; }
  if(!profile||typeof profile!=='object') profile={v:1,n:0,e:{}};
  profile.e=profile.e||{};
  function save(){ if(!allowed()) return; try{ setCookie('sl_p',JSON.stringify(profile),180); }catch(e){} }
  function cmp(v,c){ return c.op==='eq'?v===c.n:c.op==='gte'?v>=c.n:c.op==='lte'?v<=c.n:c.op==='gt'?v>c.n:c.op==='lt'?v<c.n:false; }
  function evalNode(n,now){
    if(!n) return false;
    switch(n.type){
      case 'all': return n.items.every(function(i){return evalNode(i,now);});
      case 'any': return n.items.some(function(i){return evalNode(i,now);});
      case 'not': return !evalNode(n.item,now);
      case 'visits': return cmp(profile.n|0,n);
      case 'device': return (window.innerWidth<768?'mobile':'desktop')===n.value;
      case 'event': var ev=profile.e[n.name]; if(!ev) return cmp(0,n.count); var count=ev.n|0; if(n.where) count=((ev.w||{})[n.where.key]||{})[n.where.value]|0; if(n.within!==null&&(ev.t|0)<now-n.within) count=0; return cmp(count,n.count);
    }
    return false;
  }
  function segments(){ if(!allowed()) return []; var now=Math.floor(Date.now()/1000); return spec.priority.filter(function(name){return evalNode(spec.segments[name],now);}); }
  function remember(kind,id){ if(!id) return; profile.r=(profile.r||[]).filter(function(x){return !(x.k===kind&&x.id===id);}); profile.r.unshift({k:kind,id:id,t:Math.floor(Date.now()/1000)}); profile.r=profile.r.slice(0,10); }
  var lastSeg=(SL.segments||[]).join(',');
  /* Fragments : quand les segments calculés ici diffèrent de ceux rendus par le serveur (page servie statique, ou profil qui vient de changer), chaque section à variantes est rechargée depuis /_fragment et remplacée sur place. */
  function fragments(){
    var spans=document.querySelectorAll('span.anchor[data-sl-fragment]'); if(!spans.length) return;
    var want=segments().join(','); if(want===lastSeg) return; lastSeg=want;
    Array.prototype.forEach.call(spans,function(a){
      fetch('/_fragment?page='+encodeURIComponent(a.getAttribute('data-sl-fragment'))+'&section='+encodeURIComponent(a.id),{credentials:'same-origin',cache:'no-store'}).then(function(r){ return r.ok?r.text():null; }).then(function(html){
        if(!html||!a.parentNode) return; var tpl=document.createElement('template'); tpl.innerHTML=html.trim(); var nodes=Array.prototype.slice.call(tpl.content.childNodes); var old=a.nextElementSibling;
        nodes.forEach(function(n){ a.parentNode.insertBefore(n,a); }); if(old) old.parentNode.removeChild(old); a.parentNode.removeChild(a);
        var na=document.getElementById(a.id); var v=na&&na.getAttribute('data-variant'); if(v){ var d={section:a.id,segment:v}; record('variant_shown',d); beacon('variant_shown',d); }
        document.dispatchEvent(new CustomEvent('sl:fragment',{detail:{section:a.id}}));
      }).catch(function(){});
    });
  }
  function record(name,data){
    if(name==='product_view'&&data&&data.product) remember('p',String(data.product));
    if(name==='section_view'&&data&&data.section&&tracked.remember) remember('s',String(data.section));
    if(tracked.events.indexOf(name)<0&&name!=='variant_shown'){ if(name==='product_view'||name==='section_view') save(); return; }
    var ev=profile.e[name]||(profile.e[name]={n:0,t:0});
    ev.n=(ev.n|0)+1; ev.t=Math.floor(Date.now()/1000);
    (tracked.where||[]).forEach(function(k){ if(data&&data[k]!=null){ ev.w=ev.w||{}; ev.w[k]=ev.w[k]||{}; var v=String(data[k]); ev.w[k][v]=(ev.w[k][v]|0)+1; var keys=Object.keys(ev.w[k]); if(keys.length>20) delete ev.w[k][keys[0]]; } });
    save();
    try{ fragments(); }catch(e){}
  }
  function beacon(name,data){ if(!allowed()) return; try{ var body=JSON.stringify({name:name,data:data||null}); if(navigator.sendBeacon) navigator.sendBeacon('/_event',new Blob([body],{type:'application/json'})); else fetch('/_event',{method:'POST',body:body,headers:{'content-type':'application/json'},keepalive:true}); }catch(e){} }
  function start(){
    if(!allowed()) return;
    try{ if(!sessionStorage.getItem('sl_s')){ sessionStorage.setItem('sl_s','1'); profile.n=(profile.n|0)+1; save(); } }catch(e){ if(!profile.n) profile.n=1; }
    record('page_view',{route:location.pathname});
    var anchors=document.querySelectorAll('span.anchor[id]');
    if('IntersectionObserver' in window){
      var seen={}; var io=new IntersectionObserver(function(entries){ entries.forEach(function(en){ if(en.isIntersecting){ var id=en.target.getAttribute('data-sl-id'); if(id&&!seen[id]){ seen[id]=1; record('section_view',{section:id,route:location.pathname}); } } }); },{threshold:0.3});
      Array.prototype.forEach.call(anchors,function(a){ var sec=a.nextElementSibling; if(sec&&!/^s\\d+$/.test(a.id)){ sec.setAttribute('data-sl-id',a.id); io.observe(sec); } });
    }
    Array.prototype.forEach.call(document.querySelectorAll('span.anchor[data-variant]'),function(a){ var d={section:a.id,segment:a.getAttribute('data-variant')}; record('variant_shown',d); beacon('variant_shown',d); });
    document.addEventListener('click',function(ev){ var a=ev.target.closest('a.btn'); if(a) record('click_cta',{to:a.getAttribute('href'),route:location.pathname}); });
    Array.prototype.forEach.call(document.querySelectorAll('form.contact-form'),function(f){ var started=false; f.addEventListener('input',function(){ if(!started){ started=true; record('form_start',{route:location.pathname}); } }); f.addEventListener('submit',function(){ record('form_submit',{route:location.pathname}); beacon('form_submit',{route:location.pathname}); }); });
    var intent=document.querySelector('.intent'); if(intent) intent.addEventListener('submit',function(){ var q=intent.querySelector('input').value; if(q) record('search',{q:q}); });
    /* Boutique : événements déclarés par les composants (checkout_start, purchase) et ajouts au panier. */
    Array.prototype.forEach.call(document.querySelectorAll('[data-sl-event]'),function(el){ var d=null; try{ d=JSON.parse(el.getAttribute('data-sl-data')||'null'); }catch(e){} var n=el.getAttribute('data-sl-event'); record(n,d); beacon(n,d); });
    Array.prototype.forEach.call(document.querySelectorAll('form.add-to-cart'),function(f){ f.addEventListener('submit',function(){ record('cart_add',{category:f.getAttribute('data-category')||'',route:location.pathname}); }); });
  }
  var banner=document.querySelector('.consent');
  if(SL.consent.required&&getCookie('sl_c')===null&&banner){
    banner.hidden=false;
    banner.querySelector('.consent-accept').addEventListener('click',function(){ setCookie('sl_c','1',365); banner.hidden=true; start(); });
    banner.querySelector('.consent-refuse').addEventListener('click',function(){ setCookie('sl_c','0',365); banner.hidden=true; });
  } else { start(); }
  try{ fragments(); }catch(e){}
  window.sitelang={profile:profile,segments:segments,record:record,serverSegments:SL.segments,refresh:fragments};
})();

/* Navigation par intention : index produit à la compilation, recherche locale, lien vers la section exacte. */
(function(){
  var form=document.querySelector('.intent'); if(!form) return;
  var input=form.querySelector('input'), list=form.querySelector('.intent-results'), idx=null, items=[], sel=-1;
  /* « où » devient « ou » sans accent : on le garde comme signal de lieu. « comment » est trop fréquent dans les titres pour discriminer. */
  var STOP={le:1,la:1,les:1,de:1,des:1,du:1,un:1,une:1,et:1,a:1,au:1,aux:1,en:1,pour:1,sur:1,je:1,vous:1,nous:1,est:1,ce:1,que:1,qui:1,quel:1,quelle:1,quels:1,quelles:1,il:1,elle:1,y:1,t:1,d:1,l:1,s:1,avez:1,etes:1,faites:1,on:1,me:1,mon:1,ma:1,mes:1,votre:1,vos:1,se:1,ne:1,pas:1,avec:1,dans:1,par:1,plus:1,si:1,comment:1,veux:1,voudrais:1,souhaite:1,cherche:1,faut:1,peut:1,peux:1};
  function norm(s){return String(s).normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();}
  function load(cb){ if(idx) return cb(idx); fetch(form.getAttribute('data-index')).then(function(r){return r.json();}).then(function(d){idx=d;cb(d);}).catch(function(){}); }
  /* Racinisation légère du français : coûte/coût, ouverts/ouvert, tarifs/tarif, horaires/horaire. */
  function stem(w){ if(w.length<=4) return w; return w.replace(/(issements?|ements?|ations?|euses?|eurs?|ent|es|s|e)$/,''); }
  function stems(str){ var o={}; str.split(' ').forEach(function(w){ if(w) o[stem(w)]=1; }); return o; }
  function prep(e){ if(!e._p){ e._p={k:stems(e.k),t:stems(e.t),x:stems(e.x)}; } return e._p; }
  var CONTACT_WORDS=/\\b(devis|contact|joindre|appeler|rappel|rappeler|rendez|ecrire|message|coordonnees|numero|reserver|commander|demande|je veux|je voudrais|je souhaite|je cherche|besoin d)/;
  function score(q,e){
    q=q.replace(/(^|\\s)o\\u00f9(?=\\s|$|[?!.,])/gi,'$1adresse'); /* « où » = question de lieu, sans collision avec « ou » */
    var toks=norm(q).split(' ').filter(function(t){return t&&!STOP[t];}).map(stem); if(!toks.length) return 0;
    var p=prep(e), s=0, kw=' '+e.k+' ', tt=' '+e.t+' ', tx=' '+e.x+' ';
    if(e.F&&CONTACT_WORDS.test(norm(q))) s+=5; /* une demande d'action mène au formulaire, avant la section qui en parle */
    toks.forEach(function(t){
      if(p.k[t]) s+=3; else if(t.length>3&&kw.indexOf(' '+t)>=0) s+=1.5;
      if(p.t[t]) s+=2.5; else if(t.length>3&&tt.indexOf(' '+t)>=0) s+=1.2;
      if(p.x[t]) s+=1; else if(t.length>3&&tx.indexOf(' '+t)>=0) s+=0.5;
    });
    return s;
  }
  var lastQuery='';
  /* Cible : la section, ou le formulaire de contact prérempli avec la question (paramètre q). */
  function targetUrl(e){ var base=e.r; if(e.F&&lastQuery) base+=(base.indexOf('?')>=0?'&':'?')+'q='+encodeURIComponent(lastQuery); return base+'#'+e.a; }
  function go(e){ var target=targetUrl(e); var same=(location.pathname.replace(/\\/+$/,'')===(e.r.replace(/\\/+$/,'')||'')||(location.pathname==='/'&&e.r==='/')); if(same&&!e.F){ location.hash=e.a; var el=document.getElementById(e.a); if(el){ if(el.tagName==='DETAILS') el.open=true; el.scrollIntoView({behavior:'smooth'}); } } else { location.href=target; } close(); }
  function close(){ list.hidden=true; list.innerHTML=''; items=[]; sel=-1; input.setAttribute('aria-expanded','false'); }
  /* Réponse « horaires » calculée à la visite, dans le fuseau du site. */
  var DAYS=['dimanche','lundi','mardi','mercredi','jeudi','vendredi','samedi'];
  function fmtH(hm){ var h=parseInt(hm.slice(0,2),10), m=hm.slice(3,5); return h+' h'+(m==='00'?'':' '+m); }
  function hoursAnswer(H){
    try{
      var parts=new Intl.DateTimeFormat('fr-FR',{timeZone:H.tz,weekday:'long',hour:'2-digit',minute:'2-digit',hour12:false}).formatToParts(new Date());
      var wd=parts.find(function(p){return p.type==='weekday';}).value.toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g,''), hh=parseInt(parts.find(function(p){return p.type==='hour';}).value,10)%24, mm=parseInt(parts.find(function(p){return p.type==='minute';}).value,10), now=hh*60+mm;
      var byDay={}; H.days.forEach(function(d){ byDay[d.day.normalize('NFD').replace(/[\\u0300-\\u036f]/g,'')]=d.slots; });
      var toMin=function(s){return parseInt(s.slice(0,2),10)*60+parseInt(s.slice(3,5),10);};
      var open=null; (byDay[wd]||[]).forEach(function(s){ if(now>=toMin(s.slice(0,5))&&now<toMin(s.slice(6,11))) open=s; });
      var today=(byDay[wd]||[]).length?(byDay[wd]).map(function(s){return fmtH(s.slice(0,5))+' – '+fmtH(s.slice(6,11));}).join(' et '):'fermé';
      var idx=DAYS.indexOf(wd); var next='';
      for(var i=0;i<8&&!next;i++){ var dn=DAYS[(idx+i)%7]; var slots=byDay[dn]||[]; for(var j=0;j<slots.length;j++){ var st=toMin(slots[j].slice(0,5)); if(i>0||st>now){ next=(i===0?'aujourd\\'hui':i===1?'demain':dn)+' à '+fmtH(slots[j].slice(0,5)); break; } } }
      return (open?'Ouvert actuellement, ferme à '+fmtH(open.slice(6,11)):'Fermé actuellement'+(next?', ouvre '+next:''))+'. Aujourd\\'hui ('+wd+') : '+today+'.';
    }catch(e){ return null; }
  }
  function render(q,d){
    lastQuery=q.trim();
    var scored=d.entries.map(function(e){return {e:e,s:score(q,e)};}).filter(function(x){return x.s>0;}).sort(function(a,b){return b.s-a.s;}).slice(0,6);
    list.innerHTML=''; items=scored.map(function(x){return x.e;}); sel=-1;
    if(!scored.length){ list.innerHTML='<li class="ir-empty">Aucune section ne correspond. Essayez un autre mot.</li>'; }
    /* Carte de réponse : la meilleure section répond directement, d'après les données compilées du site. */
    if(scored.length&&scored[0].s>=2.5){ var best=scored[0].e; var ans=best.H?hoursAnswer(best.H):best.A; if(ans){ var card=document.createElement('li'); card.className='ir-answer'; card.setAttribute('role','option'); card.innerHTML='<span class="ir-title"></span><span class="ir-text"></span><span class="ir-page"></span>'; card.children[0].textContent=best.T; card.children[1].textContent=ans; card.children[2].textContent=(best.F?'Envoyer cette demande':'Voir la section')+' · '+best.P; card.addEventListener('mousedown',function(ev){ev.preventDefault(); go(best);}); list.appendChild(card); } }
    scored.forEach(function(x,i){ var li=document.createElement('li'); li.setAttribute('role','option'); li.innerHTML='<span class="ir-title"></span><span class="ir-page"></span>'; li.firstChild.textContent=x.e.T; li.lastChild.textContent=x.e.P; li.addEventListener('mousedown',function(ev){ev.preventDefault(); go(x.e);}); list.appendChild(li); });
    list.hidden=false; input.setAttribute('aria-expanded','true');
  }
  var timer=null;
  input.addEventListener('input',function(){ clearTimeout(timer); var q=input.value; if(q.trim().length<2){ close(); return; } timer=setTimeout(function(){ load(function(d){ render(q,d); }); },120); });
  input.addEventListener('keydown',function(ev){
    if(ev.key==='ArrowDown'||ev.key==='ArrowUp'){ if(!items.length) return; ev.preventDefault(); sel=(sel+(ev.key==='ArrowDown'?1:-1)+items.length)%items.length; Array.prototype.forEach.call(list.children,function(li,i){ li.setAttribute('aria-selected',i===sel?'true':'false'); }); }
    else if(ev.key==='Enter'){ ev.preventDefault(); if(items.length) go(items[sel<0?0:sel]); }
    else if(ev.key==='Escape'){ close(); }
  });
  form.addEventListener('submit',function(ev){ ev.preventDefault(); if(items.length) go(items[0]); });
  input.addEventListener('blur',function(){ setTimeout(close,150); });
})();
`;

export function buildJs(usedComponents) {
  const comps = usedComponents.map(c => c.files['module.js'] ? `/* ${c.name} */\n${c.files['module.js'].trim()}` : '').filter(Boolean).join('\n\n');
  return `${BASE_JS.trim()}\n\n${comps}\n`;
}
