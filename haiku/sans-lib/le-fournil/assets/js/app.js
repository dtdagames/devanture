(function () {
  'use strict';

  // Menu mobile : déplie la navigation et met à jour aria-expanded.
  var bouton = document.querySelector('.menu-toggle');
  var nav = document.getElementById('site-nav');
  if (bouton && nav) {
    bouton.addEventListener('click', function () {
      var ouvert = nav.classList.toggle('is-open');
      bouton.setAttribute('aria-expanded', ouvert ? 'true' : 'false');
    });
  }

  // Lightbox de la galerie : fermeture par clic ou par Échap.
  var liens = Array.prototype.slice.call(document.querySelectorAll('a[data-lightbox]'));
  if (liens.length === 0) {
    return;
  }

  var overlay = null;

  function fermer() {
    if (overlay && overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
    }
    overlay = null;
  }

  function ouvrir(lien) {
    fermer();
    var miniature = lien.querySelector('img');

    overlay = document.createElement('div');
    overlay.className = 'lightbox';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', lien.getAttribute('data-caption') || 'Agrandissement');

    var figure = document.createElement('figure');
    var image = document.createElement('img');
    image.src = lien.getAttribute('href');
    image.alt = miniature ? miniature.alt : '';

    var legende = document.createElement('figcaption');
    legende.textContent = lien.getAttribute('data-caption') || '';

    figure.appendChild(image);
    figure.appendChild(legende);
    overlay.appendChild(figure);
    overlay.addEventListener('click', fermer);
    document.body.appendChild(overlay);
  }

  liens.forEach(function (lien) {
    lien.addEventListener('click', function (evenement) {
      evenement.preventDefault();
      ouvrir(lien);
    });
  });

  document.addEventListener('keydown', function (evenement) {
    if (evenement.key === 'Escape') {
      fermer();
    }
  });
})();
