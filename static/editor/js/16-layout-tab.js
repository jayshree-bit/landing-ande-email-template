/* ---------------- Layout tab: Container + Items (Elementor-style) ---------------- */
const JUSTIFY = ['flex-start', 'center', 'flex-end', 'space-between', 'space-around', 'space-evenly'];
const JUSTIFY_BARS = { 'flex-start': [1, 6], center: [5.5, 10.5], 'flex-end': [10, 15], 'space-between': [1, 15], 'space-around': [3, 13], 'space-evenly': [4.5, 11.5] };
const jIcon = v => `<svg viewBox="0 0 20 14"><rect x="0" y="0" width="1.2" height="14" fill="currentColor" opacity=".45"/><rect x="18.8" y="0" width="1.2" height="14" fill="currentColor" opacity=".45"/>${JUSTIFY_BARS[v].map(x => `<rect x="${x + 1}" y="3" width="3" height="8" rx=".6" fill="currentColor"/>`).join('')}</svg>`;
const ALIGN_Y = { 'flex-start': [1, 7], center: [4, 10], 'flex-end': [7, 13], stretch: [1, 13] };
const aIcon = v => `<svg viewBox="0 0 20 14"><rect x="0" y="0" width="20" height="1" fill="currentColor" opacity=".45"/><rect x="0" y="13" width="20" height="1" fill="currentColor" opacity=".45"/><rect x="5" y="${ALIGN_Y[v][0]}" width="4" height="${ALIGN_Y[v][1] - ALIGN_Y[v][0]}" rx=".6" fill="currentColor"/><rect x="11" y="${ALIGN_Y[v][0]}" width="4" height="${ALIGN_Y[v][1] - ALIGN_Y[v][0]}" rx=".6" fill="currentColor"/></svg>`;
const ICON_GROUPS = {
  cDir: { prop: 'flex-direction', items: [['row', '→', 'Row'], ['column', '↓', 'Column'], ['row-reverse', '←', 'Row reversed'], ['column-reverse', '↑', 'Column reversed']] },
  cJustify: { prop: 'justify-content', items: JUSTIFY.map(v => [v, jIcon(v), v.replace('flex-', '').replace('-', ' ')]) },
  cAlign: { prop: 'align-items', items: ['flex-start', 'center', 'flex-end', 'stretch'].map(v => [v, aIcon(v), v.replace('flex-', '')]) },
  cWrap: { prop: 'flex-wrap', items: [['nowrap', '⇥', 'No wrap: keep items on one line'], ['wrap', '↵', 'Wrap: let items break onto new lines']] },
};
const UNIT_RANGES = { '%': [0, 100], px: [0, 1600], vw: [0, 100], vh: [0, 100] };

function ruleStyleOf(comp) {
  // Styles set in the editor for this component: desktop rule plus the current device's rule.
  const selector = '#' + comp.getId();
  const base = editor.Css.getRule(selector);
  const dev = editor.Devices.getSelected();
  const media = dev && dev.get('widthMedia');
  const devRule = media ? editor.Css.getRule(selector, { atRuleType: 'media', atRuleParams: `(max-width: ${media})` }) : null;
  return { ...comp.getStyle(), ...(base ? base.getStyle() : {}), ...(devRule ? devRule.getStyle() : {}) };
}
const selEl = () => { const s = editor.getSelected(); return s && s.getEl() && s.getEl().nodeType === 1 ? s.getEl() : null; };
const csOf = el => el.ownerDocument.defaultView.getComputedStyle(el);

function setupLayout() {
  $$('.ctl-head').forEach(h => h.onclick = () => h.classList.toggle('closed'));
  Object.entries(ICON_GROUPS).forEach(([id, g]) => {
    $('#' + id).innerHTML = g.items.map(([v, icon, title]) => `<button type="button" data-v="${v}" title="${title}">${icon}</button>`).join('');
    $$(`#${id} button`).forEach(b => b.onclick = () => {
      const sel = editor.getSelected();
      if (!sel) return;
      setCompStyle(sel, { [g.prop]: b.dataset.v });
      renderLayout();
    });
  });
  $('#cDisplay').onchange = () => {
    const sel = editor.getSelected();
    if (!sel) return;
    const v = $('#cDisplay').value;
    const extra = v === 'grid' && !ruleStyleOf(sel)['grid-template-columns'] ? { 'grid-template-columns': 'repeat(2, minmax(0, 1fr))' } : {};
    setCompStyle(sel, { display: v, ...extra });
    renderLayout();
  };
  $$('#pane-layout .ctl-slider').forEach(box => {
    const prop = box.dataset.prop, range = box.querySelector('input[type=range]'), num = box.querySelector('input[type=number]');
    const unitSel = box.querySelector('select.unit');
    if (unitSel) unitSel.innerHTML = box.dataset.units.split(',').map(u => `<option>${u}</option>`).join('');
    const value = v => prop === 'grid-cols' ? { 'grid-template-columns': `repeat(${Math.max(1, Math.round(v))}, minmax(0, 1fr))` } : { [prop]: v === '' ? '' : v + unitSel.value };
    const setRange = () => { if (unitSel) { const [mn, mx] = UNIT_RANGES[unitSel.value]; range.min = mn; range.max = mx; } };
    const preview = v => {
      const el = selEl();
      if (el) Object.entries(value(v)).forEach(([k, val]) => el.style.setProperty(k, val, 'important'));
      num.value = v;
    };
    const commit = v => {
      const sel = editor.getSelected(), el = selEl();
      if (!sel) return;
      if (el) Object.keys(value(1)).forEach(k => el.style.removeProperty(k));
      setCompStyle(sel, value(v));
      renderLayout();
    };
    range.oninput = () => preview(range.value);
    range.onchange = () => commit(range.value);
    num.onchange = () => commit(num.value === '' ? '' : +num.value);
    if (unitSel) unitSel.onchange = () => { setRange(); if (num.value !== '') commit(+num.value); };
    box._setRange = setRange;
  });
  const gap = (which) => {
    const sel = editor.getSelected();
    if (!sel) return;
    const c = $('#gapCol').value, r = $('#gapRow').value;
    const linked = $('#gapLink').classList.contains('active');
    if (linked) { if (which === 'col') $('#gapRow').value = c; else $('#gapCol').value = r; }
    const col = $('#gapCol').value, row = $('#gapRow').value;
    setCompStyle(sel, { 'column-gap': col === '' ? '' : col + 'px', 'row-gap': row === '' ? '' : row + 'px', gap: '' });
    renderLayout();
  };
  $('#gapCol').onchange = () => gap('col');
  $('#gapRow').onchange = () => gap('row');
  $('#gapLink').onclick = () => $('#gapLink').classList.toggle('active');
}

function renderLayout() {
  const sel = editor && editor.getSelected();
  const el = selEl();
  if (!sel || !el || currentPane !== 'layout') return;
  const cs = csOf(el), st = ruleStyleOf(sel);
  const display = cs.display.includes('grid') ? 'grid' : cs.display.includes('flex') ? 'flex' : 'block';
  $('#cDisplay').value = display;
  $('#cContentWrap').style.display = isSection(sel) && sel.find('.container').length ? '' : 'none';
  $$('#pane-layout .ctl-slider').forEach(box => {
    const prop = box.dataset.prop, range = box.querySelector('input[type=range]'), num = box.querySelector('input[type=number]');
    const unitSel = box.querySelector('select.unit');
    if (document.activeElement === num) return;
    if (prop === 'grid-cols') {
      const n = (cs.gridTemplateColumns || '').split(' ').filter(Boolean).length || 1;
      range.value = num.value = n;
      return;
    }
    const m = String(st[prop] || '').match(/^(-?[\d.]+)\s*(px|%|vw|vh)$/);
    if (m && [...unitSel.options].some(o => o.value === m[2])) unitSel.value = m[2];
    box._setRange();
    num.value = m ? +m[1] : '';
    range.value = m ? +m[1] : 0;
  });
  const isFlex = display === 'flex', isGrid = display === 'grid';
  $('#itemsHint').style.display = isFlex || isGrid ? 'none' : '';
  $('#itemsFlex').style.display = isFlex ? '' : 'none';
  $('#itemsGrid').style.display = isGrid ? '' : 'none';
  $('#ctlItems .gap-grid').style.display = $('#ctlItems .gap-labels').style.display = isFlex || isGrid ? '' : 'none';
  $('#gapTitle').style.display = isFlex || isGrid ? '' : 'none';
  const current = { cDir: cs.flexDirection, cJustify: cs.justifyContent === 'normal' ? 'flex-start' : cs.justifyContent,
    cAlign: cs.alignItems === 'normal' ? 'stretch' : cs.alignItems, cWrap: cs.flexWrap };
  Object.keys(ICON_GROUPS).forEach(id => $$(`#${id} button`).forEach(b => b.classList.toggle('active', b.dataset.v === current[id] || (b.dataset.v === 'flex-start' && current[id] === 'start') || (b.dataset.v === 'flex-end' && current[id] === 'end'))));
  if (document.activeElement !== $('#gapCol')) $('#gapCol').value = px(cs.columnGap);
  if (document.activeElement !== $('#gapRow')) $('#gapRow').value = px(cs.rowGap);
}

function renderVisibility() {
  const sel = editor.getSelected();
  const card = $('#visCard');
  card.style.display = sel && sel.get('type') !== 'wrapper' ? 'block' : 'none';
  if (!sel) return;
  const cls = sel.getClasses();
  const shown = [];
  $$('#visCard [data-cls]').forEach(b => {
    const hidden = cls.includes(b.dataset.cls);
    b.classList.toggle('off', hidden);
    b.title = (hidden ? 'Hidden' : 'Visible') + ' on ' + b.textContent.trim() + '. Click to ' + (hidden ? 'show' : 'hide') + '.';
    if (!hidden && b.style.display !== 'none') shown.push(b.textContent.trim());
  });
  const total = VISIBILITY.length;
  const sum = $('#visSummary');
  sum.className = 'vis-summary' + (shown.length ? '' : ' warn');
  sum.textContent = !shown.length ? 'Hidden on every device: it will not appear anywhere.'
    : shown.length === total ? 'Visible on all devices.' : 'Visible on ' + shown.join(' and ') + ' only.';
}

function setHidden(clsList) {
  const sel = editor.getSelected();
  if (!sel) return;
  VISIBILITY.forEach(([cls]) => clsList.includes(cls) ? sel.addClass(cls) : sel.removeClass(cls));
  renderVisibility();
}

function enhanceSelected(comp) {
  if (!comp || comp.get('type') === 'wrapper') return;
  // Elementor-style "+" in the element toolbar
  const tb = comp.get('toolbar') || [];
  if (!tb.some(t => t.id === 'lp-add')) {
    comp.set('toolbar', [{ id: 'lp-add', label: I.plus, command: 'lp:add', attributes: { title: 'Add an element here' } }, ...tb]);
  }
  const names = comp.getTraits().map(t => t.get('name'));
  const extra = [];
  if (comp.getAttributes()['data-lp-block'] === 'form' && !names.includes('lp-no-sticky')) {
    extra.unshift({ type: 'lp-class-toggle', name: 'lp-no-sticky', cls: 'lp-no-sticky', label: 'Turn off sticky form' });
  }
  if (extra.length) comp.addTrait(extra);
}
