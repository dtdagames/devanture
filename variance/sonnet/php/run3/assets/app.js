(function () {
  'use strict';

  var btn = document.querySelector('.menu-btn');
  var nav = document.getElementById('nav');
  if (btn && nav) {
    btn.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  var box = document.getElementById('lightbox');
  if (box) {
    var img = box.querySelector('img');
    var cap = box.querySelector('p');
    var close = function () { box.hidden = true; };
    document.querySelectorAll('a.lb').forEach(function (a) {
      a.addEventListener('click', function (ev) {
        ev.preventDefault();
        img.src = a.getAttribute('href');
        img.alt = a.getAttribute('data-caption') || '';
        cap.textContent = a.getAttribute('data-caption') || '';
        box.hidden = false;
      });
    });
    box.addEventListener('click', close);
    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape') { close(); }
    });
  }
})();
