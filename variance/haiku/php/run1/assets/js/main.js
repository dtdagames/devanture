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

    // Lightbox de la galerie
    var box = document.querySelector('.lightbox');
    if (!box) {
        return;
    }
    var img = box.querySelector('img');
    var caption = box.querySelector('figcaption');
    var closeBtn = box.querySelector('.lightbox__close');
    var lastFocus = null;

    function open(link) {
        lastFocus = link;
        img.src = link.getAttribute('href');
        img.alt = link.querySelector('img') ? link.querySelector('img').alt : '';
        caption.textContent = link.getAttribute('data-caption') || '';
        box.hidden = false;
        closeBtn.focus();
    }

    function close() {
        box.hidden = true;
        img.src = '';
        if (lastFocus) {
            lastFocus.focus();
        }
    }

    document.querySelectorAll('a[data-lightbox]').forEach(function (link) {
        link.addEventListener('click', function (event) {
            event.preventDefault();
            open(link);
        });
    });

    closeBtn.addEventListener('click', close);
    box.addEventListener('click', function (event) {
        if (event.target === box) {
            close();
        }
    });
    document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape' && !box.hidden) {
            close();
        }
    });
})();
