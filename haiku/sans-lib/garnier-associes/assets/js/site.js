(function () {
  'use strict';

  // Menu mobile.
  var header = document.querySelector('.site-header');
  var toggle = document.querySelector('.nav-toggle');
  if (header && toggle) {
    toggle.addEventListener('click', function () {
      var open = header.classList.toggle('nav-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  // Lightbox de la galerie (élément <dialog> natif : Échap ferme nativement).
  var dialog = document.getElementById('lightbox');
  if (dialog && typeof dialog.showModal === 'function') {
    var img = dialog.querySelector('img');
    var caption = dialog.querySelector('figcaption');
    var closeBtn = dialog.querySelector('.lightbox-close');

    document.querySelectorAll('a[data-lightbox]').forEach(function (link) {
      link.addEventListener('click', function (event) {
        event.preventDefault();
        img.src = link.getAttribute('href');
        img.alt = link.getAttribute('data-alt') || '';
        caption.textContent = link.getAttribute('data-caption') || '';
        dialog.showModal();
      });
    });

    closeBtn.addEventListener('click', function () { dialog.close(); });
    dialog.addEventListener('click', function (event) {
      if (event.target === dialog) {
        dialog.close();
      }
    });
  }
})();
