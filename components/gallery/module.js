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
  function close() { box.remove(); document.removeEventListener('keydown', onKey); }
  function onKey(e) { if (e.key === 'Escape') close(); }
  box.addEventListener('click', close);
  document.addEventListener('keydown', onKey);
  document.body.appendChild(box);
});
