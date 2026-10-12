// Phones: the ☰ button next to a menu with "On phones: Menu button" opens and closes its links (like Bootstrap's navbar).
(function () {
  document.querySelectorAll('.lp-nav.lp-nav-burger').forEach(function (nav, i) {
    var btn = nav.parentNode.querySelector(':scope > .lp-burger');
    if (!btn) { // pages saved before the button was part of the design
      btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'lp-burger';
      btn.setAttribute('aria-label', 'Menu');
      btn.innerHTML = '<span></span><span></span><span></span>';
      nav.parentNode.insertBefore(btn, nav);
    }
    if (!nav.id) nav.id = 'lp-nav-' + (i + 1);
    btn.setAttribute('aria-controls', nav.id);
    btn.setAttribute('aria-expanded', 'false');
    if (!btn.style.color) btn.style.color = getComputedStyle(nav).color;
    function setOpen(open) {
      nav.classList.toggle('lp-nav-open', open);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    }
    btn.addEventListener('click', function () { setOpen(!nav.classList.contains('lp-nav-open')); });
    nav.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('a')) setOpen(false); });
  });
})();
