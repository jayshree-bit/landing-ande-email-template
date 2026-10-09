/* ---------------- UI wiring ---------------- */
let currentPane = 'blocks';
function showPane(name) {
  const sel = editor && editor.getSelected();
  if (name !== 'blocks' && (!sel || sel.get('type') === 'wrapper')) name = 'blocks';
  currentPane = name;
  const widgets = name === 'blocks';
  $('#tabs').style.display = widgets ? 'none' : 'grid';
  $('#crumbs').style.visibility = widgets ? 'hidden' : '';
  $('#panelTitle').textContent = widgets ? 'Elements' : 'Edit ' + sel.getName().replace(/^⚡ /, '');
  $('#toWidgets').classList.toggle('active', widgets);
  $$('#tabs button').forEach(b => b.classList.toggle('active', b.dataset.pane === name));
  $$('.pane').forEach(p => p.classList.toggle('active', p.id === 'pane-' + name));
  if (name === 'layout') renderLayout();
}
$$('#tabs button').forEach(b => b.onclick = () => showPane(b.dataset.pane));
function selectedCta() { return ctaTarget(editor.getSelected()); }
function setCtaAttr(attr, value) {
  const comp = selectedCta();
  if (!comp) return;
  // keep the other fields pinned to this button too, so a later global change cannot alter it
  const c = ctaSettings(comp);
  comp.addAttributes({ 'data-cta-text': c.text, 'data-cta-url': c.url, 'data-cta-font': c.font, [attr]: value });
  updateCtaPreview(comp);
  const first = editor.getWrapper().find('[data-lp-block^="email-cta"]')[0];
  if (first === comp) { META.cta_text = ctaSettings(comp).text; META.cta_url = ctaSettings(comp).url; META.cta_font = ctaSettings(comp).font; }
  markDirty();
}
$('#ctaTextInput').addEventListener('input', e => setCtaAttr('data-cta-text', e.target.value));
$('#ctaLinkInput').addEventListener('change', e => setCtaAttr('data-cta-url', e.target.value.trim()));
$('#ctaFontInput').addEventListener('change', e => { setCtaAttr('data-cta-font', e.target.value); loadCtaGoogleFont(e.target.value); });
$('#buttonTextInput').addEventListener('input', e => {
  const target = buttonTarget(editor.getSelected());
  if (!target) return;
  updateButtonText(target, e.target.value);
  markDirty();
});
$('#buttonLinkInput').addEventListener('change', e => {
  const target = buttonTarget(editor.getSelected());
  if (!target) return;
  const href = e.target.value.trim();
  if (href) target.addAttributes({ href });
  else target.removeAttributes('href');
  markDirty();
});
$('#buttonFontInput').addEventListener('change', e => {
  const target = buttonTarget(editor.getSelected());
  if (!target) return;
  const style = { ...target.getStyle() };
  if (e.target.value) style['font-family'] = ctaFontStack(e.target.value);
  else delete style['font-family'];
  target.setStyle(style);
  loadCtaGoogleFont(e.target.value);
  markDirty();
});
$('#emailWidthInput').addEventListener('input', e => { if (e.target.value) setEmailWidth(e.target.value); });
$('#emailWidthRange').addEventListener('input', e => { setEmailWidth(e.target.value); $('#emailWidthInput').value = e.target.value; });
$('#emailBackgroundInput').addEventListener('input', e => {
  META.body_background_color = e.target.value;
  renderEmailBackground();
  markDirty();
});
$$('#textAlignCard [data-align]').forEach(button => button.onclick = () => {
  const target = alignmentTarget(editor.getSelected());
  if (!target) return;
  target.setStyle({ ...target.getStyle(), 'text-align': button.dataset.align });
  renderTextAlign();
});

$('#search').oninput = e => {
  const q = e.target.value.toLowerCase();
  const bm = editor.BlockManager;
  bm.render(q ? bm.getAll().filter(b => b.get('label').toLowerCase().includes(q)) : bm.getAll().models);
};

$$('#devices button').forEach(b => b.onclick = () => {
  $$('#devices button').forEach(x => x.classList.toggle('active', x === b));
  editor.setDevice({ desktop: 'Desktop', tablet: 'Tablet', mobile: 'Mobile' }[b.dataset.device]);
});
$('#addBtn').onclick = () => openAdd(editor.getSelected());
$$('#visCard [data-cls]').forEach(b => b.onclick = () => {
  const sel = editor.getSelected();
  if (!sel) return;
  const cls = b.dataset.cls;
  sel.getClasses().includes(cls) ? sel.removeClass(cls) : sel.addClass(cls);
  renderVisibility();
});
$$('#visCard [data-preset]').forEach(b => b.onclick = () => setHidden({
  all: [],
  desktop: ['lp-hide-tablet', 'lp-hide-mobile'],
  mobile: IS_EMAIL ? ['lp-hide-desktop'] : ['lp-hide-desktop', 'lp-hide-tablet'],
}[b.dataset.preset]));
if (IS_EMAIL) {
  $('#visCard [data-cls=lp-hide-tablet]').style.display = 'none';
  $('#visCard .vis-btns').style.setProperty('--n', 2);
}
$('#addSection').onclick = () => openStructure(null);
$('#secPlus').onclick = () => openStructure(hoverSection);
$('#setBtn').onclick = () => openSettings();
$('#undo').onclick = () => editor.UndoManager.undo();
$('#redo').onclick = () => editor.UndoManager.redo();
$('#outline').onclick = () => {
  const id = 'core:component-outline', on = editor.Commands.isActive(id);
  on ? editor.stopCommand(id) : editor.runCommand(id);
  $('#outline').classList.toggle('on', !on);
};
$('#preview').onclick = () => editor.runCommand('core:preview');
$('#formBtn').onclick = openFormEditor;
$('#formBtn2').onclick = openFormEditor;
$('#codeBtn').onclick = openCode;
$('#helpBtn').onclick = openHelp;
$('#toWidgets').onclick = () => showPane('blocks');
function toggleStructure(force) {
  const open = force != null ? force : !$('#structure').classList.contains('open');
  $('#structure').classList.toggle('open', open);
  $('#structBtn').classList.toggle('on', open);
  $('#structBtn2').classList.toggle('active', open);
}
$('#structBtn').onclick = () => toggleStructure();
$('#structBtn2').onclick = () => toggleStructure();
$('#stClose').onclick = () => toggleStructure(false);
(() => { // drag the Structure panel by its header
  const panel = $('#structure'), head = panel.querySelector('.st-head');
  let start = null;
  head.addEventListener('mousedown', e => {
    if (e.target.closest('button')) return;
    const r = panel.getBoundingClientRect(), pr = panel.parentElement.getBoundingClientRect();
    start = { x: e.clientX, y: e.clientY, left: r.left - pr.left, top: r.top - pr.top };
    e.preventDefault();
  });
  document.addEventListener('mousemove', e => {
    if (!start) return;
    Object.assign(panel.style, { left: start.left + e.clientX - start.x + 'px', top: start.top + e.clientY - start.y + 'px', right: 'auto' });
  });
  document.addEventListener('mouseup', () => { start = null; });
})();
$('#tplBtn').onclick = openTemplates;
['cardRadius', 'cardTop', 'cardBottom', 'cardSide'].forEach(id => $('#' + id).addEventListener('input', onCardInput));
$('#liveEditBtn').onclick = () => convertLive(liveTarget(editor.getSelected()));
if (IS_EMAIL) { $('#formBtn').style.display = 'none'; $('#devices [data-device=tablet]').style.display = 'none'; }
$('#reset').onclick = async () => {
  if (!confirm('Discard this visual design and start again from the standard layout? This cannot be undone.')) return;
  await fetch(`/api/campaigns/${SLUG}/visual/${PAGE}`, { method: 'DELETE' });
  dirty = false;
  location.reload();
};

async function save() {
  if (saving) return;
  saving = true; $('#save').disabled = true; setState('Saving…');
  try {
    const body = {
      project: editor.getProjectData(),
      html: editor.getHtml(),
      css: editor.getCss({ avoidProtected: true }),
      base_css: BASE_CSS,
      template: TEMPLATE_ID,
      ...(IS_EMAIL ? { email_cta_text: META.cta_text || 'Download Now' } : {}),
      ...(IS_EMAIL ? { email_cta_url: META.cta_url || '' } : {}),
      ...(IS_EMAIL ? { email_cta_font: META.cta_font || '' } : {}),
      ...(IS_EMAIL ? { email_body_background_color: META.body_background_color || '#f1f5f9' } : {}),
      ...CUSTOM,
    };
    const r = await fetch(`/api/campaigns/${SLUG}/visual/${PAGE}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Save failed');
    editor.clearDirtyCount();
    dirty = false; enabled = true; showNotice();
    setState('Published ' + new Date().toLocaleTimeString(), 'ok');
  } catch (err) {
    setState('Not saved: ' + err.message, 'err');
  } finally {
    saving = false; $('#save').disabled = false;
  }
}
$('#save').onclick = save;
window.addEventListener('beforeunload', e => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });
