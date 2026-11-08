(function () {
  var btn = document.querySelector('.menu-btn');
  var nav = document.getElementById('nav');
  if (btn && nav) {
    btn.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  var lb = document.querySelector('.lightbox');
  if (!lb) return;
  var lbImg = lb.querySelector('img');
  var lbCap = lb.querySelector('p');
  function close() { lb.hidden = true; lbImg.removeAttribute('src'); }
  document.querySelectorAll('a.zoom').forEach(function (a) {
    a.addEventListener('click', function (ev) {
      ev.preventDefault();
      lbImg.src = a.getAttribute('href');
      lbImg.alt = a.getAttribute('data-caption') || '';
      lbCap.textContent = a.getAttribute('data-caption') || '';
      lb.hidden = false;
    });
  });
  lb.addEventListener('click', close);
  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape' && !lb.hidden) close();
  });
})();
