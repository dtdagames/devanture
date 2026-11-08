/* Le Fournil – JS vanilla : menu mobile et lightbox. */
(function () {
  'use strict';

  /* ------------------------------------------------ Menu mobile */
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.getElementById('nav-principale');

  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });

    // Fermer le menu si on repasse en mode bureau.
    window.addEventListener('resize', function () {
      if (window.innerWidth > 760 && nav.classList.contains('is-open')) {
        nav.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });

    // Échap referme le menu.
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) {
        nav.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.focus();
      }
    });
  }

  /* --------------------------------------------------- Lightbox */
  var lightbox = document.getElementById('lightbox');
  if (!lightbox) { return; }

  var lbImg = lightbox.querySelector('img');
  var lbCaption = lightbox.querySelector('figcaption');
  var lbClose = lightbox.querySelector('.lightbox-close');
  var lastFocus = null;

  function openLightbox(src, caption) {
    lbImg.setAttribute('src', src);
    lbImg.setAttribute('alt', caption || '');
    lbCaption.textContent = caption || '';
    lightbox.hidden = false;
    document.body.classList.add('has-lightbox');
    lastFocus = document.activeElement;
    lbClose.focus();
  }

  function closeLightbox() {
    if (lightbox.hidden) { return; }
    lightbox.hidden = true;
    lbImg.setAttribute('src', '');
    document.body.classList.remove('has-lightbox');
    if (lastFocus && typeof lastFocus.focus === 'function') {
      lastFocus.focus();
    }
  }

  var links = document.querySelectorAll('[data-lightbox]');
  Array.prototype.forEach.call(links, function (link) {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      openLightbox(link.getAttribute('href'), link.getAttribute('data-caption'));
    });
  });

  // Fermeture : bouton, clic sur le fond (hors image) ou Échap.
  lbClose.addEventListener('click', closeLightbox);
  lightbox.addEventListener('click', function (e) {
    if (e.target !== lbImg) {
      closeLightbox();
    }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      closeLightbox();
    }
  });
})();
