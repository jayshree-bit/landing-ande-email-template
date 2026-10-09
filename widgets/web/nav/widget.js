// Nav menu: a row of links. The settings card (#navCard in editor.html) edits the links in place.
    widget({
      id: 'nav', label: 'Nav menu', category: 'Basic', order: 10,
      tip: 'A row of menu links. Edit the links in the Layout tab after selecting it.',
      content: () => navHtml(),
    });

// The links inside the menu are the only record: the card edits them in place, so any style on a link is kept.
function navTarget(comp) {
  for (let c = comp; c && c.get('type') !== 'wrapper'; c = c.parent()) if (c.getClasses().includes('lp-nav')) return c;
  return null;
}
const navLinks = menu => menu.components().filter(c => (c.get('tagName') || '').toLowerCase() === 'a');
const linkText = link => (link.getEl() ? link.getEl().textContent : link.getInnerHTML().replace(/<[^>]*>/g, '')).trim();

function renderNav() {
  const menu = navTarget(editor.getSelected());
  $('#navCard').style.display = menu ? 'block' : 'none';
  if (!menu) return;
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

function renderCtaText() {
  const sel = editor && editor.getSelected();
  const target = ctaTarget(sel);
  const card = $('#ctaTextCard');
  card.style.display = target ? 'block' : 'none';
  if (!target) return;
  const c = ctaSettings(target);
  if (document.activeElement !== $('#ctaTextInput')) $('#ctaTextInput').value = c.text;
  if (document.activeElement !== $('#ctaLinkInput')) $('#ctaLinkInput').value = c.url;
  if (document.activeElement !== $('#ctaFontInput')) $('#ctaFontInput').value = c.font;
  loadCtaGoogleFont(c.font);
}

function buttonTarget(comp) {
  if (!comp) return null;
  const isButton = link => {
    const style = { ...link.getAttributes(), ...link.getStyle() };
    return (link.get('tagName') || '').toLowerCase() === 'a' &&
      (link.getClasses().includes('lp-btn') || style.display === 'inline-block' || link.getAttributes().role === 'button');
  };
  for (let target = comp; target && target.get('type') !== 'wrapper'; target = target.parent()) {
    if (isButton(target)) return target;
  }
  const buttons = comp.find('a').filter(isButton);
  return buttons.length === 1 ? buttons[0] : null;
}

function renderButtonSettings() {
  const target = buttonTarget(editor && editor.getSelected());
  const card = $('#buttonSettingsCard');
  card.style.display = target ? 'block' : 'none';
  if (!target) return;
  if (document.activeElement !== $('#buttonTextInput')) {
    $('#buttonTextInput').value = target.getEl()?.textContent.trim() || '';
  }
  if (document.activeElement !== $('#buttonLinkInput')) {
    $('#buttonLinkInput').value = target.getAttributes().href || '';
  }
  if (document.activeElement !== $('#buttonFontInput')) {
    $('#buttonFontInput').value = fontFromStack(target.getStyle()['font-family'] || '');
  }
}

function updateButtonText(target, text) {
  const textNode = target.components().models.find(component => component.get('type') === 'textnode');
  if (textNode) textNode.set('content', text);
  else target.components().reset([{ type: 'textnode', content: text }]);
  if (target.view) target.view.render();
}

function ctaFontStack(font) {
  return GOOGLE_FONTS.includes(font) ? `'${font}',Arial,Helvetica,sans-serif` : 'Arial,Helvetica,sans-serif';
}

function fontFromStack(stack) {
  return GOOGLE_FONTS.find(font => String(stack || '').includes(font)) || '';
}

function loadCtaGoogleFont(font) {
  if (!editor) return;
  const doc = editor.Canvas.getDocument();
  if (!doc) return;
  const id = 'lp-cta-google-font';
  let link = doc.getElementById(id);
  if (!GOOGLE_FONTS.includes(font)) { if (link) link.remove(); return; }
  if (!link) { link = doc.createElement('link'); link.id = id; link.rel = 'stylesheet'; doc.head.appendChild(link); }
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(font).replace(/%20/g, '+')}:wght@400;700&display=swap`;
}

const CTA_KEYS = ['email-cta', 'email-cta-signature', 'email-footer-signature'];

// The CTA button a selection refers to: the button block itself, or the cell/row around exactly one button.
function ctaTarget(comp) {
  if (!IS_EMAIL || !comp) return null;
  const isCta = c => c && CTA_KEYS.includes((c.getAttributes() || {})['data-lp-block']);
  if (isCta(comp)) return comp;
  const inside = comp.find('[data-lp-block]').filter(isCta);
  if (inside.length === 1) return inside[0];
  return null;
}

// Each CTA button keeps its own text / link / font on its placeholder (data-cta-*), so two buttons can differ.
function ctaSettings(comp) {
  const a = (comp && comp.getAttributes()) || {};
  return {
    text: a['data-cta-text'] != null ? a['data-cta-text'] : (META.cta_text || 'Download Now'),
    url: a['data-cta-url'] != null ? a['data-cta-url'] : (META.cta_url || META.lp_url || ''),
    font: a['data-cta-font'] != null ? a['data-cta-font'] : (META.cta_font || ''),
  };
}

function applyCtaToHtml(source, text, url, font) {
  return source.replace(/(<a\b[^>]*>)[\s\S]*?(<\/a>)/i, (m, open, close) => `${open}${esc(text)}${close}`)
    .replace(/(<a\b[^>]*\bhref=")[^"]*("[^>]*>)/i, (m, a, b) => `${a}${esc(url || META.lp_url || '#')}${b}`)
    .replace(/font-family:[^;"']*(?:'[^']*'[^;"']*)?/gi, `font-family:${ctaFontStack(font)}`);
}

function updateCtaPreview(comp) {
  if (comp && comp.view) comp.view.render();
}
