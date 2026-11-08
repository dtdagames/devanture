/* Préremplissage depuis la navigation par intention : ?q=<question> → message, et choix d'une option si un mot correspond. */
(function () {
  var q = null; try { q = new URLSearchParams(location.search).get('q'); } catch (e) {}
  if (!q) return;
  var form = document.querySelector('form.contact-form'); if (!form) return;
  var norm = function (s) { return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); };
  var msg = form.querySelector('textarea[name="message"], textarea');
  if (msg && !msg.value) { var t = q.trim(); var isQ = /\?$/.test(t); msg.value = 'Bonjour, ' + t.charAt(0).toLowerCase() + t.slice(1).replace(/[.?!]+$/, '') + (isQ ? ' ?' : '.'); }
  Array.prototype.forEach.call(form.querySelectorAll('select'), function (sel) {
    if (sel.value) return;
    var words = norm(q).split(/[^a-z0-9]+/).filter(function (w) { return w.length > 3; });
    Array.prototype.some.call(sel.options, function (o) { if (!o.value) return false; var ov = norm(o.value); var hit = words.some(function (w) { return ov.indexOf(w) >= 0 || w.indexOf(ov) >= 0; }); if (hit) { sel.value = o.value; sel.dispatchEvent(new Event('change', { bubbles: true })); } return hit; });
  });
  var first = Array.prototype.find.call(form.querySelectorAll('input:not([type=hidden]), select, textarea'), function (el) { return !el.value && el.offsetParent !== null && !/website/.test(el.name); });
  if (first) first.focus();
})();

/* Champs conditionnels : affichés et actifs seulement si la condition when est remplie. */
(function () {
  var forms = document.querySelectorAll('form.contact-form');
  Array.prototype.forEach.call(forms, function (form) {
    var conds = form.querySelectorAll('[data-when-field]');
    if (!conds.length) return;
    function valueOf(name) { var el = form.elements[name]; return el ? String(el.value || '').trim() : ''; }
    function apply() {
      Array.prototype.forEach.call(conds, function (wrap) {
        var ok = JSON.parse(wrap.getAttribute('data-when-values')).indexOf(valueOf(wrap.getAttribute('data-when-field'))) >= 0;
        wrap.hidden = !ok;
        Array.prototype.forEach.call(wrap.querySelectorAll('input,select,textarea'), function (el) { el.disabled = !ok; });
      });
    }
    form.addEventListener('change', apply);
    form.addEventListener('input', apply);
    apply();
  });
})();
