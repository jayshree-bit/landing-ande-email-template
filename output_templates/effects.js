/* Links on any element and entrance animations for pages built in the visual editor. */
(function () {
  window.LP_FX = true;
  var INTERACTIVE = 'a, button, input, select, textarea, label';

  document.querySelectorAll('[data-lp-link]').forEach(function (el) {
    el.setAttribute('role', 'link');
    if (!el.hasAttribute('tabindex')) el.tabIndex = 0;
    function go(e) {
      var inner = e.target.closest && e.target.closest(INTERACTIVE);
      if (inner && inner !== el && el.contains(inner)) return; // let real links, buttons and form fields work
      var url = el.getAttribute('data-lp-link');
      if (!url) return;
      if (url.charAt(0) === '#') {
        var target = document.querySelector(url);
        if (target) { target.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
      }
      if (el.getAttribute('data-lp-target') === '_blank') window.open(url, '_blank', 'noopener');
      else location.href = url;
    }
    el.addEventListener('click', go);
    el.addEventListener('keydown', function (e) { if (e.key === 'Enter') go(e); });
  });

  var items = document.querySelectorAll('[data-anim]');
  if (!items.length) return;
  if (!('IntersectionObserver' in window)) {
    items.forEach(function (el) { el.classList.add('lp-anim-in'); });
    return;
  }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('lp-anim-in');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
  items.forEach(function (el) { io.observe(el); });
})();
