/* ---------------- Friendly names, breadcrumb ---------------- */
const CLASS_NAMES = [
  ['lp-hero', 'Hero banner'], ['lp-section', 'Section'], ['lp-row', 'Columns'], ['lp-col', 'Column'], ['lp-box', 'Box'],
  ['main-grid', 'Content + form'], ['container', 'Content area'], ['content', 'Text area'], ['rich', 'Text block'],
  ['lp-btn', 'Button'], ['lp-spacer', 'Spacer'], ['lp-divider', 'Divider'], ['email-container', 'Email body'],
  ['ty-card', 'Thank-you card'], ['ty-icon', 'Tick icon'], ['eyebrow', 'Small label'], ['subheadline', 'Sub-headline'], ['stack', 'Column'], ['lp-nav', 'Nav menu'], ['lp-nav-bar', 'Header + menu'],
  ['lp-cards', 'Card grid'], ['lp-card', 'Card'], ['lp-notice', 'Notice bar'],
];
const TAG_NAMES = { h1: 'Heading', h2: 'Heading', h3: 'Heading', h4: 'Heading', p: 'Paragraph', ul: 'List', ol: 'List', li: 'List item',
  img: 'Image', a: 'Link', blockquote: 'Quote', table: 'Row', td: 'Cell', tr: 'Table row', hr: 'Divider', svg: 'Icon', span: 'Text' };
function friendlyName(c) {
  if (c.getAttributes()['data-lp-block']) return null; // live blocks name themselves
  const w = pageWidgets().find(x => x.match && x.match(c));
  if (w) return w.label; // widgets name themselves
  const cls = c.getClasses();
  const hit = CLASS_NAMES.find(([k]) => cls.includes(k));
  if (hit) return hit[1];
  return TAG_NAMES[(c.get('tagName') || '').toLowerCase()] || null;
}
function nameTree(c) {
  if (!c.get('name')) { const n = friendlyName(c); if (n) c.set('name', n); }
  c.components().forEach(nameTree);
}
function renderCrumbs() {
  const el = $('#crumbs');
  const sel = editor.getSelected();
  if (!sel || sel.get('type') === 'wrapper') { el.style.display = 'none'; return; }
  const chain = [];
  for (let c = sel; c && c.get('type') !== 'wrapper'; c = c.parent()) chain.unshift(c);
  el.innerHTML = '';
  chain.forEach((c, i) => {
    if (i) el.insertAdjacentText('beforeend', '›');
    if (c === sel) { const b = document.createElement('b'); b.textContent = c.getName(); el.appendChild(b); return; }
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = c.getName();
    b.title = 'Select this ' + c.getName();
    b.onclick = () => editor.select(c);
    el.appendChild(b);
  });
  el.style.display = 'flex';
}

function renderTextAlign() {
  const sel = editor && editor.getSelected();
  const target = alignmentTarget(sel);
  const el = target && target.getEl();
  const card = $('#textAlignCard');
  const on = !!el && sel.get('type') !== 'wrapper' && el.nodeType === 1;
  card.style.display = on ? 'block' : 'none';
  if (!on) return;
  const current = el.ownerDocument.defaultView.getComputedStyle(el).textAlign;
  $$('#textAlignCard [data-align]').forEach(button => {
    const active = button.dataset.align === current;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', active ? 'true' : 'false');
  });
}

function alignmentTarget(comp) {
  let target = comp;
  let el = target && target.getEl();
  while (target && el && el.ownerDocument.defaultView.getComputedStyle(el).display === 'inline') {
    target = target.parent();
    el = target && target.getEl();
  }
  return target;
}

const LIVE_EDITABLE = ['email-content', 'email-signoff', 'email-header', 'email-banner', 'email-footer', 'email-footer-signature'];
function liveTarget(comp) {
  if (!IS_EMAIL || !comp) return null;
  const ok = c => c && LIVE_EDITABLE.includes((c.getAttributes() || {})['data-lp-block']);
  if (ok(comp)) return comp;
  for (let p = comp.parent(); p && p.get('type') !== 'wrapper'; p = p.parent()) if (ok(p)) return p;
  const inside = comp.find('[data-lp-block]').filter(ok);
  return inside.length === 1 ? inside[0] : null;
}
function renderLiveEdit() {
  const card = $('#liveEditCard');
  if (card) card.style.display = liveTarget(editor && editor.getSelected()) ? 'block' : 'none';
}
function convertLive(comp) {
  if (!comp) return;
  const key = comp.getAttributes()['data-lp-block'];
  const html = BLOCKS[key];
  if (!html) return;
  if (!confirm('Convert this block to normal, editable content? It will no longer update from the campaign builder.')) return;
  const added = comp.replaceWith(html);
  const first = Array.isArray(added) ? added[0] : added;
  if (first) {
    const cells = [first, ...first.find('td, div, p')].filter(c => richTarget(c));
    editor.select(cells.length ? cells[cells.length > 1 ? 0 : 0] : first);
  }
  markDirty();
}
