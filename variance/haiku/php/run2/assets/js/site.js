(function () {
  'use strict';

  // Menu mobile
  var toggle = document.querySelector('.menu-toggle');
  var nav = document.getElementById('nav-principale');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var isOpen = nav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
  }

  // Lightbox de la galerie
  var links = document.querySelectorAll('[data-lightbox]');
  if (!links.length) {
    return;
  }

  var box = document.createElement('div');
  box.className = 'lightbox';
  box.hidden = true;
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');
  box.setAttribute('aria-label', 'Agrandissement de l’image');
  box.innerHTML =
    '<button type="button" class="lightbox-close" aria-label="Fermer">&times;</button>' +
    '<figure><img alt=""><figcaption></figcaption></figure>';
  document.body.appendChild(box);

  var img = box.querySelector('img');
  var caption = box.querySelector('figcaption');
  var closeBtn = box.querySelector('.lightbox-close');
  var lastFocus = null;

  function openBox(link) {
    lastFocus = document.activeElement;
    img.setAttribute('src', link.getAttribute('href'));
    img.setAttribute('alt', link.getAttribute('data-alt') || '');
    caption.textContent = link.getAttribute('data-caption') || '';
    box.hidden = false;
    closeBtn.focus();
  }

  function closeBox() {
    if (box.hidden) {
      return;
    }
    box.hidden = true;
    img.removeAttribute('src');
    if (lastFocus && typeof lastFocus.focus === 'function') {
      lastFocus.focus();
    }
  }

  for (var i = 0; i < links.length; i++) {
    links[i].addEventListener('click', function (event) {
      event.preventDefault();
      openBox(this);
    });
  }

  box.addEventListener('click', function (event) {
    if (event.target === box || event.target === closeBtn) {
      closeBox();
    }
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
      closeBox();
    }
  });
})();
