/* ---------------- Email width (whole email, centred) ---------------- */
function emailContainer() { return editor && editor.getWrapper().find('.email-container')[0]; }
function emailWidthNow() {
  const c = emailContainer();
  if (!c) return 0;
  const st = c.getStyle(), at = c.getAttributes();
  return parseInt(st.width, 10) || parseInt(at.width, 10) || (c.getEl() ? Math.round(c.getEl().getBoundingClientRect().width) : 0);
}
function renderEmailWidth() {
  if (!IS_EMAIL) return;
  $('#emailWidthCard').style.display = 'block';
  const w = emailWidthNow() || '';
  if (document.activeElement !== $('#emailWidthInput')) $('#emailWidthInput').value = w;
  $('#emailWidthRange').value = w || 600;
}
function setEmailWidth(px) {
  const c = emailContainer();
  px = Math.max(320, Math.min(900, parseInt(px, 10) || 0));
  if (!c || !px) return;
  c.addAttributes({ width: String(px), align: 'center' });
  c.addStyle({ width: px + 'px', 'max-width': '100%', 'margin-left': 'auto', 'margin-right': 'auto' });
  $('#emailWidthRange').value = px;
  markDirty();
}

function renderEmailBackground() {
  if (!IS_EMAIL) return;
  const color = META.body_background_color || '#f1f5f9';
  $('#emailBackgroundCard').style.display = 'block';
  $('#emailBackgroundInput').value = color;
  const body = editor && editor.Canvas.getBody();
  if (body) body.style.backgroundColor = color;
}
