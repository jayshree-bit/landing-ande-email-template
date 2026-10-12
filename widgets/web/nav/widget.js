// Nav menu: a row of links. The settings card (#navCard in editor.html) edits the links in place.
// "On phones: Menu button" adds a real ☰ button next to the menu; on phones the links stay hidden until it is tapped.
const BURGER_HTML = '<button type="button" class="lp-burger" aria-label="Menu" aria-expanded="false"><span></span><span></span><span></span></button>';
widget({
  id: 'nav', label: 'Nav menu', category: 'Basic', order: 10,
  tip: 'A row of menu links. Edit the links in the Layout tab after selecting it.',
  content: () => navHtml(),
  // Clicking ☰ in the canvas opens / closes the menu, like on a phone. Capture phase: the editor stops clicks on elements.
  onLoad(ed) {
    ed.Canvas.getDocument().addEventListener('click', e => {
      const btn = e.target.closest && e.target.closest('.lp-burger');
      const nav = btn && btn.parentNode.querySelector(':scope > .lp-nav-burger');
      if (!nav) return;
      const open = !nav.classList.contains('lp-nav-open');
      nav.classList.toggle('lp-nav-open', open);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    }, true);
  },
  types(ed) {
    // The ☰ button: one piece (its three bars can't be selected), never a drop target.
    ed.DomComponents.addType('lp-burger', {
      isComponent: el => el.nodeType === 1 && el.classList && el.classList.contains('lp-burger'),
      model: {
        defaults: { name: 'Menu button ☰', droppable: false, editable: false, copyable: false },
        init() { this.components().forEach(c => c.set({ selectable: false, hoverable: false, layerable: false, draggable: false })); },
      },
    });
  },
});

const isBurger = c => !!c && c.getClasses && c.getClasses().includes('lp-burger');
const burgerOf = menu => { const p = menu.parent(); return p ? p.components().find(c => isBurger(c)) : null; };
// The menu a selection belongs to: the menu itself, a link in it, or its ☰ button.
function navTarget(comp) {
  for (let c = comp; c && c.get('type') !== 'wrapper'; c = c.parent()) {
    if (c.getClasses().includes('lp-nav')) return c;
    if (isBurger(c)) return c.parent() && c.parent().components().find(x => x.getClasses().includes('lp-nav')) || null;
  }
  return null;
}
function setBurger(menu, on) {
  const btn = burgerOf(menu);
  if (on) {
    menu.addClass('lp-nav-burger');
    if (!btn) menu.parent().components().add(BURGER_HTML, { at: menu.parent().components().indexOf(menu) });
  } else {
    menu.removeClass('lp-nav-burger');
    if (btn) btn.remove();
  }
}
// In the editor, clicking ☰ (or working on the menu) opens it like on a phone; clicking anything else closes it.
// Only the canvas is changed, never the saved page.
function previewBurgers(openMenu) {
  const doc = editor.Canvas.getDocument();
  if (!doc) return;
  doc.querySelectorAll('.lp-nav-burger').forEach(el => {
    const open = !!openMenu && el === openMenu.getEl();
    el.classList.toggle('lp-nav-open', open);
    const btn = el.parentNode && el.parentNode.querySelector(':scope > .lp-burger');
    if (btn) btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
}
const navLinks = menu => menu.components().filter(c => (c.get('tagName') || '').toLowerCase() === 'a');
const linkText = link => (link.getEl() ? link.getEl().textContent : link.getInnerHTML().replace(/<[^>]*>/g, '')).trim();

function renderNav() {
  const menu = navTarget(editor.getSelected());
  // Working on the menu or a link keeps it open; the ☰ button toggles it (click handler in onLoad); anything else closes it.
  // Checked once the selection has settled: a click first deselects the old element, then selects the new one.
  setTimeout(() => {
    const sel = editor.getSelected();
    if (sel && isBurger(sel)) return;
    const m = navTarget(sel);
    previewBurgers(m && m.getClasses().includes('lp-nav-burger') ? m : null);
  }, 0);
  $('#navCard').style.display = menu ? 'block' : 'none';
  if (!menu) return;
  if (menu.getClasses().includes('lp-nav-burger') && !burgerOf(menu)) { setBurger(menu, true); markDirty(); } // menus set up before ☰ was a real button
  // Suggest the form and any element that has its own ID (set in Advanced) as places to jump to.
  const ids = ['form'];
  (function walk(c) { const id = c.get('attributes') && c.get('attributes').id; if (id && !ids.includes(id)) ids.push(id); c.components().forEach(walk); })(editor.getWrapper());
  $('#navTargets').innerHTML = ids.map(id => `<option value="#${esc(id)}">`).join('');
  const links = navLinks(menu);
  const box = $('#navItems');
  box.innerHTML = links.length ? '' : '<p class="ctl-note">No links yet. Click <b>+ Add a link</b>.</p>';
  links.forEach((link, i) => {
    const at = link.getAttributes();
    const row = document.createElement('div');
    row.className = 'nav-item';
    row.innerHTML = `<input class="nav-text" type="text" placeholder="Link text" value="${esc(linkText(link))}">
      <div class="nav-btns"><button type="button" class="up" title="Move left"${i ? '' : ' disabled'}>▲</button><button type="button" class="down" title="Move right"${i < links.length - 1 ? '' : ' disabled'}>▼</button><button type="button" class="del" title="Remove this link">✕</button></div>
      <input class="nav-url" type="text" list="navTargets" placeholder="#form or https://…" value="${esc(at.href || '')}">
      <label class="nav-check" style="margin-top:0;grid-column:1"><input type="checkbox" class="nav-new"${at.target === '_blank' ? ' checked' : ''}> Open in a new tab</label>`;
    row.querySelector('.nav-text').oninput = e => { link.components(esc(e.target.value || 'Link')); markDirty(); };
    row.querySelector('.nav-url').oninput = e => { link.addAttributes({ href: e.target.value.trim() || '#' }); markDirty(); };
    row.querySelector('.nav-new').onchange = e => {
      if (e.target.checked) link.addAttributes({ target: '_blank', rel: 'noopener' }); else link.removeAttributes(['target', 'rel']);
      markDirty();
    };
    row.querySelector('.up').onclick = () => moveNavLink(menu, link, i - 1);
    row.querySelector('.down').onclick = () => moveNavLink(menu, link, i + 1);
    row.querySelector('.del').onclick = () => {
      const sel = editor.getSelected();
      const wasSelected = sel && (sel === link || sel.parents().includes(link));
      link.remove();
      markDirty();
      if (wasSelected) editor.select(menu); else renderNav(); // keep the card on this menu
    };
    box.appendChild(row);
  });
  const cs = menu.getEl() ? getComputedStyle(menu.getEl()) : null;
  const firstLink = links[0] && links[0].getEl();
  const set = (id, v) => { const el = $('#' + id); if (document.activeElement !== el) el.value = v; };
  set('navAlign', cs ? cs.justifyContent.replace(/^(normal|start|left)$/, 'flex-start').replace(/^(end|right)$/, 'flex-end') : 'flex-start');
  set('navSize', cs ? Math.round(parseFloat(cs.fontSize)) : 15);
  set('navGap', cs ? Math.round(parseFloat(cs.columnGap) || 0) : 28);
  set('navColor', toHex(firstLink ? getComputedStyle(firstLink).color : (cs ? cs.color : '#0f172a')));
  set('navWeight', String(cs ? (+cs.fontWeight >= 650 ? 700 : +cs.fontWeight >= 550 ? 600 : 400) : 600));
  const hover = editor.Css.getRule(`#${menu.getId()} a:hover`);
  set('navHover', toHex((hover && hover.getStyle().color) || META.primary || '#0b5cff'));
  $('#navUpper').checked = !!cs && cs.textTransform === 'uppercase';
  $('#navMobile').value = menu.getClasses().includes('lp-nav-burger') ? 'burger' : '';
}

function moveNavLink(menu, link, to) {
  const links = navLinks(menu);
  if (to < 0 || to >= links.length) return;
  const all = menu.components();
  const target = links[to];
  link.remove({ temporary: true });
  all.add(link, { at: all.indexOf(target) + (to > links.indexOf(link) ? 1 : 0) });
  markDirty();
  renderNav();
}

function setupNav() {
  const menu = () => navTarget(editor.getSelected());
  // Phones: a ☰ button that opens the links (runtime.js makes it work on the published page).
  $('#navMobile').onchange = e => {
    const m = menu();
    if (!m) return;
    setBurger(m, !!e.target.value);
    markDirty();
    renderNav();
  };
  $('#navAdd').onclick = () => {
    const m = menu();
    if (!m) return;
    m.append('<a href="#form">New link</a>');
    markDirty();
    renderNav();
    const inputs = document.querySelectorAll('#navItems .nav-text');
    const last = inputs[inputs.length - 1];
    if (last) { last.focus(); last.select(); }
  };
  const style = (id, fn) => { $('#' + id).addEventListener('input', () => { const m = menu(); if (m) { setCompStyle(m, fn($('#' + id).value)); markDirty(); } }); };
  style('navAlign', v => ({ 'justify-content': v }));
  style('navSize', v => ({ 'font-size': v ? Math.max(10, Math.min(40, +v)) + 'px' : '' }));
  style('navGap', v => ({ 'column-gap': v === '' ? '' : Math.max(0, Math.min(80, +v)) + 'px' }));
  style('navColor', v => ({ color: v }));
  style('navWeight', v => ({ 'font-weight': v }));
  $('#navUpper').onchange = e => { const m = menu(); if (m) { setCompStyle(m, { 'text-transform': e.target.checked ? 'uppercase' : '', 'letter-spacing': e.target.checked ? '.04em' : '' }); markDirty(); } };
  $('#navHover').addEventListener('input', e => {
    const m = menu();
    if (!m) return;
    editor.Css.setRule(`#${m.getId()} a:hover`, { color: e.target.value });
    m.addAttributes({ id: m.getId() }); // keep the ID in the HTML so the hover rule still matches after saving
    markDirty();
  });
}
