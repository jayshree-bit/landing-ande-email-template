/* ---------------- Form fields editor ---------------- */
const FIELD_TYPES = ['text', 'email', 'tel', 'number', 'select', 'radio', 'textarea', 'checkbox', 'url', 'hidden'];
function openFormEditor() {
  const f = JSON.parse(JSON.stringify(FORM || {}));
  const wrap = document.createElement('div');
  wrap.className = 'lp-modal';
  wrap.innerHTML = `
    <div class="grid2">
      <label class="f">Form title<input data-k="form_title"></label>
      <label class="f">Submit button text<input data-k="submit_text"></label>
    </div>
    <label class="f" style="margin-top:10px">Intro text<input data-k="form_intro"></label>
    <h4>Fields <span class="muted" style="text-transform:none;letter-spacing:0">(drag ⋮⋮ to reorder; "half" puts two fields side by side)</span></h4>
    <div id="fieldRows"></div>
    <button type="button" class="add-tile" id="addField" style="flex-direction:row;padding:8px 12px;width:auto">+ Add field</button>
    <h4>Consent</h4>
    <div class="grid2">
      <label class="f">Consent style<select data-k="consent_type"><option value="checkbox">Checkbox the visitor must tick</option><option value="text">Text only (no checkbox)</option></select></label>
      <span class="muted" style="align-self:end">HTML links are allowed, e.g. &lt;a href="https://…"&gt;Privacy Policy&lt;/a&gt;</span>
    </div>
    <label class="f" style="margin-top:10px">Consent text<textarea data-k="consent_text"></textarea></label>
    <div class="modal-actions"><button type="button" id="formCancel">Cancel</button><button type="button" class="primary" id="formSave">Save form</button></div>`;
  wrap.querySelectorAll('[data-k]').forEach(el => { el.value = f[el.dataset.k] || (el.dataset.k === 'consent_type' ? 'checkbox' : ''); });
  const rows = wrap.querySelector('#fieldRows');
  let drag = null;
  const addRow = (fd = { label: '', type: 'text', width: 'full', required: false }) => {
    const r = document.createElement('div');
    r.className = 'frow';
    r.innerHTML = `<span class="handle" title="Drag to reorder">⋮⋮</span>
      <div class="sub"><input class="lbl" placeholder="Field label"><input class="opts" placeholder="Options, comma separated"><input class="ph" placeholder="Placeholder (or value for hidden fields)"></div>
      <select class="type">${FIELD_TYPES.map(t => `<option>${t}</option>`).join('')}</select>
      <select class="width"><option value="full">full</option><option value="half">half</option></select>
      <label class="req">Req<input type="checkbox" class="rq"></label>
      <button type="button" class="del" title="Remove">✕</button>`;
    r.querySelector('.lbl').value = fd.label || '';
    r.querySelector('.type').value = fd.type || 'text';
    r.querySelector('.width').value = fd.width || 'full';
    r.querySelector('.rq').checked = !!fd.required;
    r.querySelector('.ph').value = fd.placeholder || '';
    r.dataset.id = fd.id || '';
    r.dataset.cls = fd.css_class || '';
    const opts = r.querySelector('.opts');
    opts.value = (fd.options || []).join(', ');
    const sync = () => { opts.style.display = ['select', 'radio'].includes(r.querySelector('.type').value) ? '' : 'none'; };
    r.querySelector('.type').onchange = sync; sync();
    r.querySelector('.del').onclick = () => r.remove();
    r.querySelector('.handle').onmousedown = () => { r.draggable = true; };
    r.ondragstart = e => { drag = r; r.classList.add('dragging'); e.dataTransfer.setData('text/plain', ''); };
    r.ondragend = () => { r.draggable = false; r.classList.remove('dragging'); drag = null; };
    rows.appendChild(r);
  };
  rows.ondragover = e => {
    if (!drag) return;
    e.preventDefault();
    const after = [...rows.children].find(x => x !== drag && e.clientY < x.getBoundingClientRect().top + x.offsetHeight / 2);
    rows.insertBefore(drag, after || null);
  };
  (f.fields || []).forEach(addRow);
  wrap.querySelector('#addField').onclick = () => addRow();
  wrap.querySelector('#formCancel').onclick = () => editor.Modal.close();
  wrap.querySelector('#formSave').onclick = async () => {
    const body = {};
    wrap.querySelectorAll('[data-k]').forEach(el => { body[el.dataset.k] = el.value; });
    body.fields = [...rows.children].map(r => ({
      label: r.querySelector('.lbl').value.trim(), type: r.querySelector('.type').value,
      width: r.querySelector('.width').value, required: r.querySelector('.rq').checked,
      placeholder: r.querySelector('.ph').value.trim(), id: r.dataset.id || undefined, css_class: r.dataset.cls,
      options: r.querySelector('.opts').value.split(',').map(s => s.trim()).filter(Boolean),
    })).filter(x => x.label);
    const btn = wrap.querySelector('#formSave'); btn.disabled = true; btn.textContent = 'Saving…';
    const res = await fetch(`/api/campaigns/${SLUG}/form`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const d = await res.json();
    if (!res.ok) { btn.disabled = false; btn.textContent = 'Save form'; alert(d.error || 'Failed'); return; }
    FORM = d.form; BLOCKS = d.blocks;
    refreshLiveBlocks();
    editor.Modal.close();
    setState('Form saved and published', 'ok');
  };
  editor.Modal.open({ title: 'Lead form', content: wrap });
}
