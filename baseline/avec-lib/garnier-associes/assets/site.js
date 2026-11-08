(function(){
  var t=document.querySelector('.nav-toggle'),n=document.querySelector('.site-nav');
  if(t&&n){t.addEventListener('click',function(){var o=n.classList.toggle('open');t.setAttribute('aria-expanded',o?'true':'false');});}
})();

/* gallery */
document.addEventListener('click', function (ev) {
  var a = ev.target.closest('[data-lightbox]');
  if (!a) return;
  ev.preventDefault();
  var box = document.createElement('div');
  box.className = 'lightbox';
  var img = document.createElement('img');
  img.src = a.getAttribute('href');
  img.alt = (a.querySelector('img') || {}).alt || '';
  box.appendChild(img);
  box.addEventListener('click', function () { box.remove(); });
  document.addEventListener('keydown', function esc(e) { if (e.key === 'Escape') { box.remove(); document.removeEventListener('keydown', esc); } });
  document.body.appendChild(box);
});
