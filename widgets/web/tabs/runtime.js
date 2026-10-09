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
