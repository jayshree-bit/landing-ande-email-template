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
/* widget: countdown */
(function () {
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  document.querySelectorAll('[data-lp-countdown]').forEach(function (el) {
    var end = new Date(el.getAttribute('data-lp-countdown')).getTime();
    if (isNaN(end)) return;
    var timer;
    function tick() {
      var s = Math.max(0, Math.floor((end - Date.now()) / 1000));
      var v = { d: Math.floor(s / 86400), h: Math.floor(s % 86400 / 3600), m: Math.floor(s % 3600 / 60), s: s % 60 };
      Object.keys(v).forEach(function (k) { var b = el.querySelector('[data-u="' + k + '"]'); if (b) b.textContent = pad(v[k]); });
      if (!s) { el.classList.add('lp-cd-ended'); clearInterval(timer); }
    }
    timer = setInterval(tick, 1000);
    tick();
  });
})();

/* widget: counter */
(function () {
  var nums = document.querySelectorAll('[data-lp-counter]');
  if (!nums.length) return;
  function run(el) {
    var target = parseFloat(el.getAttribute('data-lp-counter')) || 0, pre = el.getAttribute('data-prefix') || '', suf = el.getAttribute('data-suffix') || '';
    var start = null, ms = 1600;
    function step(t) {
      if (!start) start = t;
      var p = Math.min(1, (t - start) / ms), eased = 1 - Math.pow(1 - p, 3);
      el.textContent = pre + Math.round(target * eased).toLocaleString('en-US') + suf;
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  if (!('IntersectionObserver' in window)) return;
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { if (e.isIntersecting) { run(e.target); io.unobserve(e.target); } });
  }, { threshold: 0.4 });
  nums.forEach(function (el) { io.observe(el); });
})();

/* widget: tabs */
(function () {
  document.querySelectorAll('.lp-tabs').forEach(function (box) {
    var tabs = box.querySelectorAll('.lp-tab'), panels = box.querySelectorAll('.lp-tab-panel');
    tabs.forEach(function (tab, i) {
      tab.setAttribute('role', 'tab');
      tab.tabIndex = 0;
      function show() {
        tabs.forEach(function (t, k) { t.classList.toggle('active', k === i); });
        panels.forEach(function (p, k) { p.classList.toggle('active', k === i); });
      }
      tab.addEventListener('click', show);
      tab.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); show(); } });
    });
  });
})();
