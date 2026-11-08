(function () {
  'use strict';

  // Menu mobile
  var toggle = document.querySelector('.menu-toggle');
  var nav = document.getElementById('main-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  // Lightbox de la galerie
  var buttons = document.querySelectorAll('.gallery__btn');
  if (!buttons.length) return;

  var box = document.createElement('div');
  box.className = 'lightbox';
  box.hidden = true;
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');
  box.setAttribute('aria-label', 'Image agrandie');
  var img = document.createElement('img');
  var cap = document.createElement('p');
  box.appendChild(img);
  box.appendChild(cap);
  document.body.appendChild(box);

  var lastFocus = null;

  function close() {
    box.hidden = true;
    if (lastFocus) lastFocus.focus();
  }

  buttons.forEach(function (b) {
    b.addEventListener('click', function () {
      lastFocus = b;
      img.src = b.getAttribute('data-full');
      img.alt = b.getAttribute('data-caption') || '';
      cap.textContent = b.getAttribute('data-caption') || '';
      box.hidden = false;
    });
  });

  box.addEventListener('click', close);
  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape' && !box.hidden) close();
  });
})();
