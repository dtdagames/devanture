(function () {
  'use strict';

  // Menu mobile
  var toggle = document.querySelector('.menu-toggle');
  var nav = document.getElementById('site-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  // Galerie : agrandissement dans une fenetre, fermeture par clic ou Echap
  var links = document.querySelectorAll('.gallery__link');
  var lightbox = null;

  function closeLightbox() {
    if (lightbox) {
      document.body.removeChild(lightbox);
      lightbox = null;
    }
  }

  function openLightbox(href, caption) {
    closeLightbox();
    lightbox = document.createElement('div');
    lightbox.className = 'lightbox';
    lightbox.setAttribute('role', 'dialog');
    lightbox.setAttribute('aria-modal', 'true');

    var img = document.createElement('img');
    img.src = href;
    img.alt = caption || '';
    lightbox.appendChild(img);

    if (caption) {
      var p = document.createElement('p');
      p.className = 'lightbox__caption';
      p.textContent = caption;
      lightbox.appendChild(p);
    }

    lightbox.addEventListener('click', closeLightbox);
    document.body.appendChild(lightbox);
  }

  for (var i = 0; i < links.length; i++) {
    links[i].addEventListener('click', function (event) {
      event.preventDefault();
      openLightbox(this.getAttribute('href'), this.getAttribute('data-caption'));
    });
  }

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
      closeLightbox();
    }
  });
})();
