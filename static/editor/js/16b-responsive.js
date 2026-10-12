/* ---------------- Responsive controls (Elementor-style) ----------------
 * Every style option gets a small screen icon next to its name. It shows the screen you are styling (desktop, tablet,
 * mobile); clicking it lets you switch screens right there. Dots under each screen mark where this option has its own
 * value, and the option name turns blue when it is set for the current screen (orange: it comes from a bigger screen).
 */
const RESP_DEVICES = [
  ['desktop', 'Desktop', '<rect x="2" y="4" width="20" height="13" rx="1.5"/><path d="M8 21h8M12 17v4"/>'],
  ['tablet', 'Tablet', '<rect x="5" y="2" width="14" height="20" rx="2"/><path d="M11 18h2"/>'],
  ['mobile', 'Mobile', '<rect x="7" y="3" width="10" height="18" rx="2"/><path d="M11 18h2"/>'],
];
// Emails only have a desktop and a phone layout (no tablet breakpoint).
const respDevices = () => (IS_EMAIL ? RESP_DEVICES.filter(([id]) => id !== 'tablet') : RESP_DEVICES);
const respIcon = d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${d}</svg>`;
// Style keys an option covers (margin covers margin-top… too).
const RESP_EXPAND = {
  'padding-x': ['padding-left', 'padding-right'],
  margin: ['margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left'],
  padding: ['padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left'],
  'border-radius': ['border-radius', 'border-top-left-radius', 'border-top-right-radius', 'border-bottom-left-radius', 'border-bottom-right-radius'],
  border: ['border', 'border-width', 'border-style', 'border-color'],
  background: ['background', 'background-image', 'background-repeat', 'background-position', 'background-size', 'background-attachment'],
};
const respKeys = prop => RESP_EXPAND[prop] || [prop];
function respRule(comp, devId) {
  const dev = editor.Devices.get(devId);
  const media = dev && dev.get('widthMedia');
  return editor.Css.getRule('#' + comp.getId(), media ? { atRuleType: 'media', atRuleParams: `(max-width: ${media})` } : {});
}
// Screens on which the selected element has its own value for these style keys.
function respSetOn(comp, keys) {
  return respDevices().map(([id]) => id).filter(id => {
    const rule = respRule(comp, id);
    const st = rule ? rule.getStyle() : {};
    return keys.some(k => st[k] != null && st[k] !== '');
  });
}
// Remove this option's values (shorthand and every side) for the screen being edited.
function respReset(comp, keys) {
  const rule = respRule(comp, respCurrent());
  if (!rule) return;
  const st = { ...rule.getStyle() };
  keys.forEach(k => delete st[k]);
  rule.setStyle(st);
  editor.trigger('component:styleUpdate');
  editor.StyleManager.select(comp);
  markDirty();
}
function respCurrent() { const d = editor.Devices.getSelected(); return (d && d.id) || 'desktop'; }

let respPop = null;
function respOpen(btn) {
  respClose();
  const keys = (btn.dataset.keys || '').split(',');
  const sel = editor.getSelected();
  const setOn = sel ? respSetOn(sel, keys) : [];
  respPop = document.createElement('div');
  respPop.className = 'resp-pop';
  respPop.innerHTML = respDevices().map(([id, label, d]) =>
    `<button type="button" data-dev="${id}" class="${id === respCurrent() ? 'on' : ''}" title="${label}${setOn.includes(id) ? ': has its own value' : ''}">${respIcon(d)}${setOn.includes(id) ? '<i></i>' : ''}</button>`).join('');
  const cur = respDevices().find(([id]) => id === respCurrent()) || respDevices()[0];
  if (sel && setOn.includes(cur[0])) respPop.insertAdjacentHTML('beforeend', `<button type="button" class="reset" title="Remove this value for ${cur[1].toLowerCase()}">↺</button>`);
  document.body.appendChild(respPop);
  const reset = respPop.querySelector('.reset');
  if (reset) reset.onclick = e => { e.stopPropagation(); respReset(sel, keys); respClose(); };
  const r = btn.getBoundingClientRect();
  Object.assign(respPop.style, { left: r.left - 4 + 'px', top: r.bottom + 4 + 'px' });
  respPop.querySelectorAll('[data-dev]').forEach(b => b.onclick = e => {
    e.stopPropagation();
    const target = document.querySelector(`#devices [data-device="${b.dataset.dev}"]`);
    if (target) target.click(); else editor.setDevice(b.dataset.dev);
    respClose();
  });
}
function respClose() { if (respPop) { respPop.remove(); respPop = null; } }
document.addEventListener('click', e => { if (respPop && !respPop.contains(e.target) && !e.target.closest('.resp-btn')) respClose(); });

function respButton(keys) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'resp-btn';
  b.dataset.keys = keys.join(',');
  b.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); respPop ? respClose() : respOpen(b); });
  b.addEventListener('mousedown', e => e.stopPropagation());
  return b;
}
// Draw the current screen's icon, and a dot when another screen also has its own value.
function respPaint(b) {
  const sel = editor.getSelected();
  const cur = respDevices().find(([id]) => id === respCurrent()) || respDevices()[0];
  const setOn = sel ? respSetOn(sel, b.dataset.keys.split(',')) : [];
  b.innerHTML = respIcon(cur[2]) + (setOn.some(id => id !== cur[0]) ? '<i></i>' : '');
  b.classList.toggle('set-here', setOn.includes(cur[0]));
  b.title = `Styling for ${cur[1].toLowerCase()}${setOn.length ? ` · own value on: ${setOn.join(', ')}` : ''}. Click to switch screen.`;
}

// Add the icon to every option that doesn't have one yet: GrapesJS style options and our own sliders / spacing rows.
function respDecorate() {
  if (!editor) return;
  document.querySelectorAll('#styles .gjs-sm-property').forEach(p => {
    if (p.parentElement && p.parentElement.closest('.gjs-sm-property')) return; // only whole options, not their parts
    const label = p.querySelector(':scope > .gjs-sm-label');
    if (!label || label.querySelector('.resp-btn')) return;
    const name = ([...p.classList].find(c => c.startsWith('gjs-sm-property__')) || '').replace('gjs-sm-property__', '');
    if (!name) return;
    label.classList.add('resp-label');
    label.appendChild(respButton(respKeys(name)));
  });
  document.querySelectorAll('.sp-row[data-prop], .ctl-slider[data-prop]').forEach(row => {
    const label = row.matches('.sp-row') ? row.querySelector(':scope > span') : row.querySelector('.top > span');
    if (!label || label.querySelector('.resp-btn') || row.dataset.prop === 'grid-cols') return;
    label.classList.add('resp-label');
    label.appendChild(respButton(respKeys(row.dataset.prop)));
  });
  respRefresh();
}
function respRefresh() { document.querySelectorAll('.resp-btn').forEach(respPaint); }

let respTimer = null;
function setupResponsive() {
  const later = () => { clearTimeout(respTimer); respTimer = setTimeout(respDecorate, 60); };
  new MutationObserver(later).observe(document.getElementById('styles'), { childList: true, subtree: true });
  editor.on('component:toggled change:device component:styleUpdate component:update:style', later);
  editor.on('change:device', respClose);
  // GrapesJS's × clears the shorthand only (e.g. padding); also clear the single sides set by the Spacing sliders.
  document.getElementById('styles').addEventListener('click', e => {
    const x = e.target.closest('[data-clear-style]');
    const prop = x && x.closest('.gjs-sm-property');
    const name = prop && ([...prop.classList].find(c => c.startsWith('gjs-sm-property__')) || '').replace('gjs-sm-property__', '');
    const sel = editor.getSelected();
    if (name && sel) setTimeout(() => respReset(sel, respKeys(name)), 30);
  }, true);
  later();
}
