/* ---------------- Widget settings (Layout tab) ----------------
 * A widget lists its fields in `settings`; this draws them whenever something inside the widget is selected.
 *   { label, type, get(root), set(root, value) }   type: text | url | number | color | datetime-local | select | checkbox | textarea
 *   { label, type: 'button', run(root) }            an action, e.g. "Add a question"
 * Optional: options (select: [[value, label], …]), min, max, step, placeholder, note, list (datalist id).
 * `root` is the widget's outer element (the component its `match` accepted).
 */
function renderWidgetSettings() {
  const card = $('#widgetCard');
  const hit = editor && widgetOf(editor.getSelected());
  if (!hit || !hit.w.settings) { card.style.display = 'none'; card.innerHTML = ''; return; }
  const { w, root } = hit;
  card.style.display = 'block';
  card.innerHTML = `<label>${esc(w.label)}</label>${w.note ? `<p class="ctl-note" style="margin-top:2px">${w.note}</p>` : ''}`;
  w.settings.forEach((s, i) => {
    const id = `wset-${i}`;
    const box = document.createElement('div');
    box.className = 'wset';
    if (s.type === 'button') {
      box.innerHTML = `<button type="button" class="nav-add">${esc(s.label)}</button>`;
      box.querySelector('button').onclick = () => { s.run(root); markDirty(); renderWidgetSettings(); };
    } else {
      const v = s.get ? s.get(root) : '';
      const attrs = ['min', 'max', 'step', 'placeholder', 'list'].filter(k => s[k] != null).map(k => ` ${k}="${esc(s[k])}"`).join('');
      let input;
      if (s.type === 'select') input = `<select id="${id}">${s.options.map(([val, txt]) => `<option value="${esc(val)}"${String(val) === String(v) ? ' selected' : ''}>${esc(txt)}</option>`).join('')}</select>`;
      else if (s.type === 'textarea') input = `<textarea id="${id}" rows="3"${attrs}>${esc(v)}</textarea>`;
      else if (s.type === 'checkbox') input = `<input id="${id}" type="checkbox"${v ? ' checked' : ''}>`;
      else input = `<input id="${id}" type="${s.type || 'text'}" value="${esc(s.type === 'color' ? toHex(v || '#000000') : v)}"${attrs}>`;
      box.innerHTML = s.type === 'checkbox'
        ? `<label class="nav-check" for="${id}">${input} ${esc(s.label)}</label>`
        : `<label for="${id}">${esc(s.label)}</label>${input}`;
      const el = box.querySelector('#' + id);
      el.addEventListener(s.type === 'checkbox' || s.type === 'select' ? 'change' : 'input', () => {
        s.set(root, s.type === 'checkbox' ? el.checked : el.value);
        markDirty();
      });
    }
    if (s.note) box.insertAdjacentHTML('beforeend', `<p class="ctl-note">${s.note}</p>`);
    card.appendChild(box);
  });
}

// Let a widget react to selection (e.g. Tabs shows the panel of the tab you clicked).
function runWidgetSelect(sel) {
  const hit = sel && widgetOf(sel);
  if (hit && hit.w.onSelect) hit.w.onSelect(sel, hit.root);
}
