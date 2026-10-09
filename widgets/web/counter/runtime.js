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
