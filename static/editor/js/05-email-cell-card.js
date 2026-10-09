/* ---------------- Rounded card + spacing for a table cell ---------------- */
function cardTarget(comp) {
  if (!IS_EMAIL || !comp) return null;
  const tag = (comp.get('tagName') || '').toLowerCase();
  if (tag !== 'td' && tag !== 'th') return null;
  if ((comp.getAttributes() || {})['data-lp-gap']) return null;
  return comp.parent() && comp.parent().parent() ? comp : null;
}
function closestTag(comp, tag) {
  for (let p = comp.parent(); p; p = p.parent()) if ((p.get('tagName') || '').toLowerCase() === tag) return p;
  return null;
}
function cardId(cell) {
  let id = cell.getAttributes()['data-lp-card'];
  if (!id) { id = 'c' + Math.random().toString(36).slice(2, 8); cell.addAttributes({ 'data-lp-card': id }); }
  return id;
}
// The element that carries the visible background (the cell, or the nearest ancestor that has one).
function radiusHost(cell) {
  for (let c = cell; c && c.get('type') !== 'wrapper'; c = c.parent()) {
    const el = c.getEl && c.getEl();
    if (!el) continue;
    const bg = getComputedStyle(el).backgroundColor;
    if (bg && bg !== 'transparent' && !/rgba\(\s*0,\s*0,\s*0,\s*0\s*\)/.test(bg)) return c;
  }
  return cell;
}
function rowFor(host) {
  for (let c = host; c && c.get('type') !== 'wrapper'; c = c.parent()) if ((c.get('tagName') || '').toLowerCase() === 'tr') return c;
  return null;
}
// The table row that must get the gaps: the one holding whichever element carries the dark background.
function anchorRow(cell) { return rowFor(radiusHost(cell)) || cell.parent(); }
function gapComps(cell) {
  const id = cell.getAttributes()['data-lp-card'];
  const out = { top: null, bottom: null, left: null, right: null };
  if (!id) return out;
  const row = anchorRow(cell), tbody = row && row.parent();
  if (tbody) tbody.components().models.forEach(r => { const g = r.getAttributes()['data-lp-gap']; if (g === id + '-top') out.top = r; if (g === id + '-bottom') out.bottom = r; });
  if (row) row.components().models.forEach(c => { const g = c.getAttributes()['data-lp-gap']; if (g === id + '-left') out.left = c; if (g === id + '-right') out.right = c; });
  return out;
}
function gapPx(comp) {
  if (!comp) return 0;
  const td = (comp.get('tagName') || '').toLowerCase() === 'td' ? comp : comp.find('td')[0];
  return td ? parseInt(td.getAttributes().height || td.getAttributes().width || 0, 10) || 0 : 0;
}
function applyCard(cell, { radius, top, bottom, side }) {
  const host = radiusHost(cell);
  const hostTag = (host.get('tagName') || '').toLowerCase();
  const row = rowFor(host) || cell.parent(), tbody = row.parent();
  const table = hostTag === 'table' ? host : closestTag(host, 'table');
  const id = cardId(cell);
  marginBusy = true;
  // 1. rounded corners (need a separated-borders table, otherwise the radius is ignored)
  const style = { ...host.getStyle() };
  if (radius > 0) style['border-radius'] = radius + 'px'; else delete style['border-radius'];
  if (hostTag === 'table') { if (radius > 0) style.overflow = 'hidden'; else if (style.overflow === 'hidden') delete style.overflow; }
  host.setStyle(style);
  if (radius > 0 && table) table.addStyle({ 'border-collapse': 'separate', 'border-spacing': '0' });
  // 2. remove the old spacers, then rebuild them outside the element that carries the background
  const old = gapComps(cell);
  [old.top, old.bottom, old.left, old.right].forEach(g => g && g.remove());
  const cells = row.components().models.filter(c => ['td', 'th'].includes((c.get('tagName') || '').toLowerCase()));
  // Component definitions (not HTML strings): a bare <tr>/<td> in an HTML string is dropped by the browser's parser.
  const spacerCell = (pos, props, style) => ({
    tagName: 'td', attributes: { 'data-lp-gap': `${id}-${pos}`, ...props }, style: { 'font-size': '0', 'line-height': '0', ...style },
    components: [{ type: 'textnode', content: '\u00a0' }],
  });
  if (side > 0 && cells.length === 1 && !(parseInt(cells[0].getAttributes().colspan, 10) > 1)) {
    row.components().add(spacerCell('left', { width: String(side) }, { width: side + 'px' }), { at: 0 });
    row.components().add(spacerCell('right', { width: String(side) }, { width: side + 'px' }));
  }
  const span = Math.max(1, row.components().length);
  const gap = (pos, h) => ({
    tagName: 'tr', attributes: { 'data-lp-gap': `${id}-${pos}` },
    components: [{
      tagName: 'td', attributes: { colspan: String(span), height: String(h) }, style: { height: h + 'px', 'line-height': h + 'px', 'font-size': '0' },
      components: [{ type: 'textnode', content: '\u00a0' }],
    }],
  });
  let idx = tbody.components().models.indexOf(row);
  if (top > 0) { tbody.components().add(gap('top', top), { at: idx }); idx += 1; }
  if (bottom > 0) tbody.components().add(gap('bottom', bottom), { at: idx + 1 });
  marginBusy = false;
  markDirty();
}

// Margin set in the Style tab does nothing on a table cell: turn it into real gaps.
let marginBusy = false, marginTimer = null;
function boxValues(st) {
  let t = 0, r = 0, b = 0, l = 0;
  if (st.margin != null) {
    const p = String(st.margin).trim().split(/\s+/).map(v => parseInt(v, 10) || 0);
    if (p.length === 1) t = r = b = l = p[0];
    else if (p.length === 2) { t = b = p[0]; r = l = p[1]; }
    else if (p.length === 3) { t = p[0]; r = l = p[1]; b = p[2]; }
    else [t, r, b, l] = p;
  }
  t = parseInt(st['margin-top'], 10) || t; r = parseInt(st['margin-right'], 10) || r;
  b = parseInt(st['margin-bottom'], 10) || b; l = parseInt(st['margin-left'], 10) || l;
  return { t, r, b, l };
}
function convertCellMargin(comp) {
  if (marginBusy || !IS_EMAIL) return;
  const cell = cardTarget(comp && comp.getStyle ? comp : editor.getSelected());
  if (!cell) return;
  const st = cell.getStyle();
  if (!['margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left'].some(k => st[k] != null)) return;
  const m = boxValues(st);
  clearTimeout(marginTimer);
  marginTimer = setTimeout(() => {
    if (marginBusy) return;
    const cur = cell.getStyle();
    ['margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left'].forEach(k => delete cur[k]);
    marginBusy = true; cell.setStyle(cur); marginBusy = false;
    if (!m.t && !m.b && !m.l && !m.r) return;
    const g = gapComps(cell), host = radiusHost(cell);
    applyCard(cell, {
      radius: parseInt(host.getStyle()['border-radius'], 10) || 0,
      top: Math.min(120, m.t || gapPx(g.top)), bottom: Math.min(120, m.b || gapPx(g.bottom)),
      side: Math.min(80, Math.max(m.l, m.r) || gapPx(g.left)),
    });
    renderCard();
  }, 350);
}
function renderCard() {
  const cell = cardTarget(editor && editor.getSelected());
  const card = $('#cardCard');
  card.style.display = cell ? 'block' : 'none';
  if (!cell) return;
  const g = gapComps(cell);
  const set = (id, v) => { const el = $('#' + id); if (document.activeElement !== el) el.value = v || ''; };
  set('cardRadius', parseInt(radiusHost(cell).getStyle()['border-radius'], 10) || 0);
  set('cardTop', gapPx(g.top)); set('cardBottom', gapPx(g.bottom)); set('cardSide', gapPx(g.left));
}
let cardTimer = null;
function onCardInput() {
  clearTimeout(cardTimer);
  cardTimer = setTimeout(() => {
    const cell = cardTarget(editor.getSelected());
    if (!cell) return;
    const n = id => Math.max(0, parseInt($('#' + id).value, 10) || 0);
    applyCard(cell, { radius: n('cardRadius'), top: n('cardTop'), bottom: n('cardBottom'), side: n('cardSide') });
  }, 300);
}
