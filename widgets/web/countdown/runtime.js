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
