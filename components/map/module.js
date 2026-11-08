document.addEventListener('click', function (ev) {
  var b = ev.target.closest('.map-load'); if (!b) return;
  var frame = b.closest('.map-frame'); var f = document.createElement('iframe');
  f.src = frame.getAttribute('data-embed'); f.title = 'Carte OpenStreetMap'; f.loading = 'lazy'; f.referrerPolicy = 'no-referrer';
  frame.innerHTML = ''; frame.appendChild(f);
});
