/* ---------------- Colour fields: native picker + quick palette ---------------- */
function toHex(value) {
  const ctx = document.createElement('canvas').getContext('2d');
  ctx.fillStyle = '#000000';
  ctx.fillStyle = value || '#000000';
  const v = ctx.fillStyle;
  if (v[0] === '#') return v;
  const m = v.match(/\d+(\.\d+)?/g) || [0, 0, 0];
  return '#' + m.slice(0, 3).map(n => (+n).toString(16).padStart(2, '0')).join('');
}
function setFieldColor(field, value) {
  const input = field.querySelector('input');
  if (!input) return;
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}
function paletteColors() {
  return [...new Set([META.primary || '#0b5cff', '#0f172a', '#334155', '#64748b', '#cbd5e1', '#f1f5f9', '#ffffff', '#000000',
    '#16a34a', '#dc2626', '#f59e0b', '#7c3aed'])];
}
// One browser-native colour input, opened next to whichever swatch was clicked.
const nativeColor = document.createElement('input');
nativeColor.type = 'color';
nativeColor.id = 'lpNativeColor';
document.body.appendChild(nativeColor);
let colorTarget = null;
nativeColor.addEventListener('input', () => colorTarget && setFieldColor(colorTarget, nativeColor.value));
nativeColor.addEventListener('change', () => colorTarget && setFieldColor(colorTarget, nativeColor.value));

function openNativeColor(field, swatch) {
  colorTarget = field;
  const r = swatch.getBoundingClientRect();
  nativeColor.style.left = Math.round(r.left) + 'px';
  nativeColor.style.top = Math.round(r.bottom) + 'px';
  nativeColor.value = toHex((field.querySelector('input') || {}).value);
  try { nativeColor.showPicker(); } catch (e) { nativeColor.click(); }
}

function enhanceColorFields(root) {
  root.querySelectorAll('.gjs-field-color').forEach(field => {
    if (field.dataset.lpColor) return;
    field.dataset.lpColor = '1';
    const swatch = field.querySelector('.gjs-field-colorp') || field;
    swatch.title = 'Pick a colour';
    // Capture phase on the wrapper: the click never reaches GrapesJS's own picker.
    ['mousedown', 'click'].forEach(type => swatch.addEventListener(type, e => {
      e.stopPropagation();
      e.preventDefault();
      if (type === 'click') openNativeColor(field, swatch);
    }, true));
    const pal = document.createElement('div');
    pal.className = 'lp-palette';
    paletteColors().forEach(c => {
      const b = document.createElement('button');
      b.type = 'button';
      b.style.background = c;
      b.title = c;
      b.onclick = () => setFieldColor(field, c);
      pal.appendChild(b);
    });
    const clear = document.createElement('button');
    clear.type = 'button';
    clear.className = 'clear';
    clear.title = 'No colour (transparent)';
    clear.onclick = () => setFieldColor(field, 'transparent');
    pal.appendChild(clear);
    (field.closest('.gjs-fields') || field).after(pal);
  });
}
