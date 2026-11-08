(function () {
  var btn = document.querySelector('.menu-btn'), nav = document.getElementById('nav');
  if (btn && nav) {
    btn.addEventListener('click', function () {
      var o = nav.classList.toggle('open');
      btn.setAttribute('aria-expanded', o ? 'true' : 'false');
    });
  }
  var box = null;
  function close() { if (box) { box.remove(); box = null; } }
  document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') close(); });
  document.addEventListener('click', function (ev) {
    var a = ev.target.closest && ev.target.closest('a.lb');
    if (a) {
      ev.preventDefault(); close();
      box = document.createElement('div');
      box.className = 'lightbox'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true');
      var f = document.createElement('figure'), i = document.createElement('img'), c = document.createElement('figcaption');
      i.src = a.href; i.alt = a.dataset.cap || ''; c.textContent = a.dataset.cap || '';
      f.appendChild(i); f.appendChild(c); box.appendChild(f);
      document.body.appendChild(box);
      return;
    }
    if (box && box.contains(ev.target)) close();
  });
})();
