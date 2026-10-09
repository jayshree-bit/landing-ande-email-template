/* ---------------- Size & spacing: card + drag handles ---------------- */
// Write styles for any component, for the device being edited (same media queries the Style tab uses).
function setCompStyle(comp, style) {
  const dev = editor.Devices.getSelected();
  const media = dev && dev.get('widthMedia');
  const opts = media ? { atRuleType: 'media', atRuleParams: `(max-width: ${media})` } : {};
  const selector = '#' + comp.getId();
  const rule = editor.Css.getRule(selector, opts) || editor.Css.setRule(selector, {}, opts);
  const next = { ...rule.getStyle() };
  Object.entries(style).forEach(([k, v]) => { if (v === '' || v == null) delete next[k]; else next[k] = v; });
  rule.setStyle(next);
  if (comp === editor.getSelected()) editor.trigger('component:styleUpdate');
}
const isSection = c => !!c && ((c.get('tagName') || '').toLowerCase() === 'section' || c.getClasses().some(k => ['lp-section', 'lp-hero', 'lp-nav-bar'].includes(k)));
const px = v => Math.round(parseFloat(v) || 0);

function renderSpacing() {
  const sel = editor.getSelected();
  const el = sel && sel.getEl();
  const card = $('#spCard');
  const on = !!el && sel.get('type') !== 'wrapper' && el.nodeType === 1;
  card.style.display = on ? 'block' : 'none';
  if (!on) return;
  const cs = el.ownerDocument.defaultView.getComputedStyle(el);
  const vals = { 'padding-top': cs.paddingTop, 'padding-bottom': cs.paddingBottom, 'padding-x': cs.paddingLeft,
    'margin-top': cs.marginTop, 'margin-bottom': cs.marginBottom };
  $$('#spCard .sp-row').forEach(r => {
    if (r.contains(document.activeElement) && document.activeElement.type === 'number') return;
    const v = px(vals[r.dataset.prop]);
    r.querySelector('input[type=range]').value = v;
    r.querySelector('input[type=number]').value = v;
  });
  const sec = isSection(sel);
  $('#spSection').style.display = sec ? '' : 'none';
  if (sec) {
    const mh = (sel.getStyle()['min-height'] || '').trim();
    const ruleMh = (() => { try { return el.style.minHeight || cs.minHeight; } catch (e) { return ''; } })();
    const h = ['50vh', '100vh'].find(x => mh === x || ruleMh === x) || '';
    $$('#spHeight button').forEach(b => b.classList.toggle('active', b.dataset.h === h));
    const inner = sel.find('.container')[0];
    const w = inner ? inner.getEl() && inner.getEl().ownerDocument.defaultView.getComputedStyle(inner.getEl()).maxWidth : '';
    $$('#spWidth button').forEach(b => b.classList.toggle('active', b.dataset.w === (w || '').replace(/\.\d+/, '')));
  }
}

function spacingStyle(prop, value) {
  const v = value + 'px';
  return prop === 'padding-x' ? { 'padding-left': v, 'padding-right': v } : { [prop]: v };
}
function setupSpacing() {
  $$('#spCard .sp-row').forEach(r => {
    const range = r.querySelector('input[type=range]'), num = r.querySelector('input[type=number]');
    const preview = v => {
      const el = editor.getSelected() && editor.getSelected().getEl();
      if (!el) return;
      Object.entries(spacingStyle(r.dataset.prop, v)).forEach(([k, val]) => el.style.setProperty(k, val, 'important'));
      num.value = v;
    };
    const commit = v => {
      const sel = editor.getSelected();
      if (!sel) return;
      const el = sel.getEl();
      Object.keys(spacingStyle(r.dataset.prop, 0)).forEach(k => el && el.style.removeProperty(k));
      setCompStyle(sel, spacingStyle(r.dataset.prop, Math.round(v)));
      renderSpacing();
    };
    range.oninput = () => preview(range.value);
    range.onchange = () => commit(range.value);
    num.onchange = () => { range.value = num.value; commit(num.value || 0); };
  });
  $$('#spHeight button').forEach(b => b.onclick = () => {
    const sel = editor.getSelected();
    if (!sel) return;
    setCompStyle(sel, b.dataset.h
      ? { 'min-height': b.dataset.h, display: 'flex', 'flex-direction': 'column', 'justify-content': 'center' }
      : { 'min-height': '', display: '', 'flex-direction': '', 'justify-content': '' });
    renderSpacing();
  });
  $$('#spWidth button').forEach(b => b.onclick = () => {
    const sel = editor.getSelected();
    const inner = sel && (sel.find('.container')[0] || null);
    if (!inner) return;
    setCompStyle(inner, b.dataset.w === 'none' ? { 'max-width': 'none' } : { 'max-width': b.dataset.w });
    renderSpacing();
  });
}

// Handles over the canvas
let spDrag = null;
function overlayTarget() {
  const sel = editor && editor.getSelected();
  if (!sel || sel.get('type') === 'wrapper' || editor.Commands.isActive('core:preview')) return null;
  const el = sel.getEl();
  return el && el.nodeType === 1 && el.isConnected ? { sel, el } : null;
}
function drawOverlay() {
  const ov = $('#spOverlay');
  const t = overlayTarget();
  const frame = editor && editor.Canvas.getFrameEl();
  if (!t || !frame) { ov.style.display = 'none'; ov._lastHtml = ''; return; }
  const fr = frame.getBoundingClientRect();
  Object.assign(ov.style, { display: 'block', left: fr.left + 'px', top: fr.top + 'px', width: fr.width + 'px', height: fr.height + 'px' });
  const r = t.el.getBoundingClientRect();
  const cs = t.el.ownerDocument.defaultView.getComputedStyle(t.el);
  const p = { t: px(cs.paddingTop), b: px(cs.paddingBottom), l: px(cs.paddingLeft), r: px(cs.paddingRight) };
  const m = { t: px(cs.marginTop), b: px(cs.marginBottom) };
  const parts = [];
  const band = (cls, x, y, w, h) => parts.push(`<div class="band ${cls}" style="left:${x}px;top:${y}px;width:${Math.max(w, 0)}px;height:${Math.max(h, 0)}px"></div>`);
  const grip = (cls, x, y, data) => parts.push(`<div class="grip ${cls}" ${data} style="left:${x}px;top:${y}px"></div>`);
  band('pad', r.left, r.top, r.width, p.t);
  band('pad', r.left, r.bottom - p.b, r.width, p.b);
  band('pad', r.left, r.top + p.t, p.l, r.height - p.t - p.b);
  band('pad', r.right - p.r, r.top + p.t, p.r, r.height - p.t - p.b);
  band('mar', r.left, r.top - Math.max(m.t, 0), r.width, Math.max(m.t, 0));
  band('mar', r.left, r.bottom, r.width, Math.max(m.b, 0));
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  const small = r.height < 60;
  grip('pad v', cx - 17 - (small ? 0 : 0), r.top + Math.max(p.t, 6) / 2 - 5 + 1, 'data-k="padding-top" title="Drag: inner space at the top"');
  grip('pad v', cx - 17, r.bottom - Math.max(p.b, 6) / 2 - 5 - 1, 'data-k="padding-bottom" title="Drag: inner space at the bottom"');
  if (r.width > 120) {
    grip('pad h', r.left + Math.max(p.l, 6) / 2 - 5 + 1, cy - 17, 'data-k="padding-left" title="Drag: inner space on the left"');
    grip('pad h', r.right - Math.max(p.r, 6) / 2 - 5 - 1, cy - 17, 'data-k="padding-right" title="Drag: inner space on the right"');
  }
  grip('mar v', cx + 24, r.top - Math.max(m.t, 0) / 2 - 5 - (m.t > 0 ? 0 : 8), 'data-k="margin-top" title="Drag: outer space above"');
  grip('mar v', cx + 24, r.bottom + Math.max(m.b, 0) / 2 - 5 + (m.b > 0 ? 0 : 8), 'data-k="margin-bottom" title="Drag: outer space below"');
  // Column divider: resize this column against the next one
  const next = t.sel.parent() && t.sel.parent().components().at(t.sel.parent().components().indexOf(t.sel) + 1);
  const dev = String(editor.getDevice() || '').toLowerCase();
  const rowDir = t.el.parentElement ? csOf(t.el.parentElement).flexDirection : '';
  if (!IS_EMAIL && dev !== 'mobile' && rowDir.startsWith('row') && t.sel.getClasses().includes('lp-col') && next && next.getClasses().includes('lp-col')) {
    const nr = next.getEl().getBoundingClientRect();
    parts.push(`<div class="grip col" data-k="col" title="Drag to resize the columns" style="left:${(r.right + nr.left) / 2 - 4}px;top:${r.top + r.height / 2 - 30}px;height:60px"></div>`);
  }
  const html = parts.join('');
  if (html === ov._lastHtml) return; // only touch the DOM when something moved
  ov._lastHtml = html;
  if (!spDrag) ov.innerHTML = html;
  else ov.querySelectorAll('.band').forEach(b => b.remove()), ov.insertAdjacentHTML('afterbegin', parts.filter(x => x.includes('band')).join(''));
}
function overlayLoop() {
  try { drawOverlay(); } catch (e) {}
  try { drawSectionPlus(); } catch (e) {}
  requestAnimationFrame(overlayLoop);
}

function showLabel(text, x, y) {
  const l = $('#spLabel');
  l.textContent = text;
  Object.assign(l.style, { display: 'block', left: x + 14 + 'px', top: y + 14 + 'px' });
}
function startDrag(e, grip) {
  const t = overlayTarget();
  if (!t) return;
  e.preventDefault();
  const k = grip.dataset.k;
  const cs = t.el.ownerDocument.defaultView.getComputedStyle(t.el);
  spDrag = { k, sel: t.sel, el: t.el, x: e.clientX, y: e.clientY };
  if (k === 'col') {
    const next = t.sel.parent().components().at(t.sel.parent().components().indexOf(t.sel) + 1);
    const rowW = t.el.parentElement.getBoundingClientRect().width;
    spDrag.next = next;
    spDrag.w1 = t.el.getBoundingClientRect().width;
    spDrag.w2 = next.getEl().getBoundingClientRect().width;
    spDrag.rowW = rowW;
  } else {
    spDrag.start = px(cs.getPropertyValue(k));
  }
  $('#spShield').style.display = 'block';
  $('#spShield').style.cursor = getComputedStyle(grip).cursor;
}
function moveDrag(e) {
  if (!spDrag) return;
  const dx = e.clientX - spDrag.x, dy = e.clientY - spDrag.y;
  const snap = v => e.shiftKey ? Math.round(v / 10) * 10 : Math.round(v);
  if (spDrag.k === 'col') {
    const total = spDrag.w1 + spDrag.w2, min = spDrag.rowW * 0.1;
    const w1 = Math.min(Math.max(spDrag.w1 + dx, min), total - min);
    let p1 = w1 / spDrag.rowW * 100, p2 = (total - w1) / spDrag.rowW * 100;
    if (e.shiftKey) { p1 = Math.round(p1 / 5) * 5; p2 = (total / spDrag.rowW * 100) - p1; }
    spDrag.p1 = p1; spDrag.p2 = p2;
    spDrag.el.style.setProperty('flex', `0 0 ${p1}%`, 'important');
    spDrag.next.getEl().style.setProperty('flex', `0 0 ${p2}%`, 'important');
    const pair = p1 + p2;
    showLabel(`${Math.round(p1 / pair * 100)}% | ${Math.round(p2 / pair * 100)}%`, e.clientX, e.clientY);
    return;
  }
  const dir = { 'padding-top': dy, 'padding-bottom': -dy, 'padding-left': dx, 'padding-right': -dx, 'margin-top': -dy, 'margin-bottom': dy }[spDrag.k];
  const min = spDrag.k.startsWith('margin') ? -200 : 0;
  spDrag.val = Math.max(min, snap(spDrag.start + dir));
  spDrag.el.style.setProperty(spDrag.k, spDrag.val + 'px', 'important');
  showLabel(`${spDrag.k.replace('-', ' ')}: ${spDrag.val}px`, e.clientX, e.clientY);
}
function endDrag() {
  if (!spDrag) return;
  const d = spDrag;
  spDrag = null;
  $('#spShield').style.display = 'none';
  $('#spLabel').style.display = 'none';
  if (d.k === 'col') {
    d.el.style.removeProperty('flex');
    d.next.getEl().style.removeProperty('flex');
    if (d.p1 != null) {
      setCompStyle(d.sel, { flex: `0 0 ${d.p1.toFixed(2)}%` });
      setCompStyle(d.next, { flex: `0 0 ${d.p2.toFixed(2)}%` });
    }
  } else {
    d.el.style.removeProperty(d.k);
    if (d.val != null && d.val !== d.start) setCompStyle(d.sel, { [d.k]: d.val + 'px' });
  }
  renderSpacing();
}
document.addEventListener('mousedown', e => {
  const grip = e.target.closest && e.target.closest('#spOverlay .grip');
  if (grip) startDrag(e, grip);
});
document.addEventListener('mousemove', moveDrag);
document.addEventListener('mouseup', endDrag);
