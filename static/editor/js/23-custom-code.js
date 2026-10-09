/* ---------------- Custom code (CSS / mobile CSS / JS) ---------------- */
function customCssText() {
  let css = CUSTOM.custom_css || '';
  if ((CUSTOM.custom_mobile_css || '').trim()) css += `\n@media (max-width: ${MOBILE_MAX}px) {\n${CUSTOM.custom_mobile_css}\n}`;
  return css;
}
function applyCustomCss() {
  const doc = editor.Canvas.getDocument();
  if (!doc) return;
  // The design's own stylesheet: kept outside GrapesJS (its CSS parser drops shorthands that use var()).
  let base = doc.getElementById('lp-base-css');
  if (!base) { base = doc.createElement('style'); base.id = 'lp-base-css'; doc.head.appendChild(base); }
  base.textContent = BASE_CSS;
  let st = doc.getElementById('lp-custom-css');
  if (!st) { st = doc.createElement('style'); st.id = 'lp-custom-css'; doc.head.appendChild(st); }
  st.textContent = customCssText();
}
function openCode() {
  const wrap = document.createElement('div');
  wrap.className = 'lp-modal';
  wrap.innerHTML = `
    <p class="muted">For most changes use the Style tab: pick the <b>Mobile</b> view at the top and any style you set applies to phones only.
    Use these boxes for anything extra. Classes you can target: <code>.lp-section</code>, <code>.lp-row</code>, <code>.lp-col</code>, <code>.lp-btn</code>, <code>.form-card</code>.</p>
    <label class="f">CSS for all screens<textarea class="code" data-k="custom_css" placeholder=".lp-btn { border-radius: 30px; }"></textarea></label>
    <label class="f" style="margin-top:10px">CSS for mobile only (screens up to ${MOBILE_MAX}px)<textarea class="code" data-k="custom_mobile_css" placeholder="h1 { font-size: 26px; }"></textarea></label>
    ${IS_EMAIL ? '<p class="muted">JavaScript is not allowed in emails.</p>' :
      '<label class="f" style="margin-top:10px">JavaScript (runs on the published page; not in the editor)<textarea class="code" data-k="custom_js" placeholder="// e.g. analytics or chat widget code"></textarea></label>'}
    <div class="modal-actions"><button type="button" id="codeCancel">Cancel</button><button type="button" class="primary" id="codeApply">Apply</button></div>`;
  wrap.querySelectorAll('[data-k]').forEach(el => { el.value = CUSTOM[el.dataset.k] || ''; });
  wrap.querySelector('#codeCancel').onclick = () => editor.Modal.close();
  wrap.querySelector('#codeApply').onclick = () => {
    wrap.querySelectorAll('[data-k]').forEach(el => { CUSTOM[el.dataset.k] = el.value; });
    applyCustomCss();
    markDirty();
    editor.Modal.close();
  };
  editor.Modal.open({ title: 'Custom code', content: wrap });
}
