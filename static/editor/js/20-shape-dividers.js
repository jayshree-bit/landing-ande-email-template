/* ---------------- Shape dividers ---------------- */
function zigzag() {
  let d = 'M0,0 ';
  for (let i = 0; i <= 30; i++) d += `L${i * 40},${i % 2 ? 60 : 20} `;
  return `<path d="${d}L1200,0 Z"/>`;
}
const SHAPES = {
  wave: { label: 'Wave', svg: '<path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z"/>' },
  waves: { label: 'Layered waves', svg: '<path opacity=".25" d="M0,0V46.29c47.79,22.2,103.59,32.17,158,28,70.36-5.37,136.33-33.31,206.8-37.5C438.64,32.43,512.34,53.67,583,72.05c69.27,18,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113-14.29,1200,52.47V0Z"/><path opacity=".5" d="M0,0V15.81C13,36.92,27.64,56.86,47.69,72.05,99.41,111.27,165,111,224.58,91.58c31.15-10.15,60.09-26.07,89.67-39.8,40.92-19,84.73-46,130.83-49.67,36.26-2.85,70.9,9.42,98.6,31.56,31.77,25.39,62.32,62,103.63,73,40.44,10.79,81.35-6.69,119.13-24.28s75.16-39,116.92-43.05c59.73-5.85,113.28,22.88,168.9,38.84,30.2,8.66,59,6.17,87.09-7.5,22.43-10.89,48-26.93,60.65-49.24V0Z"/><path d="M0,0V5.63C149.93,59,314.09,71.32,475.83,42.57c43-7.64,84.23-20.12,127.61-26.46,59-8.63,112.48,12.24,165.56,35.4C827.93,77.22,886,95.24,951.2,90c86.53-7,172.46-45.71,248.8-84.81V0Z"/>' },
  curve: { label: 'Curve', svg: '<path d="M0,0V7.23C0,65.52,268.63,112.77,600,112.77S1200,65.52,1200,7.23V0Z"/>' },
  'curve-asym': { label: 'Soft curve', svg: '<path d="M0,0V6c0,21.6,291,111.46,741,110.26,445.39,3.6,459-88.3,459-110.26V0Z"/>' },
  tilt: { label: 'Tilt', svg: '<path d="M1200 120L0 16.48 0 0 1200 0 1200 120z"/>' },
  triangle: { label: 'Triangle', svg: '<path d="M1200 0L0 0 598.97 114.72 1200 0z"/>' },
  arrow: { label: 'Arrow', svg: '<path d="M0,0 H1200 V20 H650 L600,80 L550,20 H0 Z"/>' },
  swoosh: { label: 'Swoosh', svg: '<path d="M0,0 V80 C60,110 140,122 220,120 C420,116 520,70 700,36 C820,12 930,-4 1000,0 C1080,4 1140,20 1200,40 V0 Z"/>' },
  zigzag: { label: 'Zigzag', svg: zigzag() },
  mountains: { label: 'Mountains', svg: '<path opacity=".45" d="M0,0 V70 L170,110 L330,50 L520,115 L700,55 L880,118 L1040,60 L1200,100 V0 Z"/><path d="M0,0 V40 L150,90 L300,30 L450,100 L600,40 L750,110 L900,50 L1050,95 L1200,35 V0 Z"/>' },
};
let shapePos = 'top';
const shapeOf = (sec, pos) => sec && sec.components().find(c => c.getClasses().includes('lp-shape-' + pos));

function shapeHtml(pos, o) {
  const flip = o.flip ? ' scaleX(-1)' : '';
  return `<div class="lp-shape lp-shape-${pos}" data-shape="${o.type}" data-h="${o.h}" data-w="${o.w}" data-color="${o.color}" data-flip="${o.flip ? 1 : 0}" data-front="${o.front ? 1 : 0}" style="height:${o.h}px;color:${o.color};">` +
    `<svg viewBox="0 0 1200 120" preserveAspectRatio="none" fill="currentColor" style="width:${o.w}%;transform:translateX(-50%)${flip};">${SHAPES[o.type].svg}</svg></div>`;
}
function currentShape(sec, pos) {
  const c = shapeOf(sec, pos);
  const a = c ? c.getAttributes() : {};
  return { type: a['data-shape'] || '', h: +a['data-h'] || 70, w: +a['data-w'] || 100, color: a['data-color'] || '#ffffff', flip: a['data-flip'] === '1', front: a['data-front'] === '1' };
}
function setShape(patch) {
  const sec = editor.getSelected();
  if (!sec) return;
  const o = { ...currentShape(sec, shapePos), ...patch };
  const old = shapeOf(sec, shapePos);
  if (old) old.remove();
  if (o.type && SHAPES[o.type]) {
    sec.append(shapeHtml(shapePos, o), { at: shapePos === 'top' ? 0 : sec.components().length });
  }
  const has = shapeOf(sec, 'top') || shapeOf(sec, 'bottom');
  has ? sec.addClass('lp-has-shape') : sec.removeClass('lp-has-shape');
  renderShape();
}
function renderShape() {
  const sec = editor && editor.getSelected();
  const show = !IS_EMAIL && !!sec && isSection(sec);
  $('#shapeCard').style.display = show ? '' : 'none';
  if (!show) return;
  const o = currentShape(sec, shapePos);
  $$('#shapePos button').forEach(b => b.classList.toggle('active', b.dataset.pos === shapePos));
  $$('#shapeGrid button').forEach(b => b.classList.toggle('active', b.dataset.shape === o.type));
  $('#shapeOpts').style.display = o.type ? '' : 'none';
  $('#shapeColor').value = toHex(o.color);
  $('#shapeH').value = $('#shapeHn').value = o.h;
  $('#shapeW').value = $('#shapeWn').value = o.w;
  $('#shapeFlip').checked = o.flip;
  $('#shapeFront').checked = o.front;
}
function setupShapes() {
  $('#shapeGrid').innerHTML = `<button type="button" data-shape=""><svg viewBox="0 0 1200 120"><path d="M100 60h1000" stroke="currentColor" stroke-width="8" stroke-dasharray="40 30"/></svg>None</button>` +
    Object.entries(SHAPES).map(([k, v]) => `<button type="button" data-shape="${k}"><svg viewBox="0 0 1200 120" preserveAspectRatio="none" fill="currentColor">${v.svg}</svg>${v.label}</button>`).join('');
  $$('#shapeGrid button').forEach(b => b.onclick = () => setShape({ type: b.dataset.shape }));
  $$('#shapePos button').forEach(b => b.onclick = () => { shapePos = b.dataset.pos; renderShape(); });
  $('#shapeColor').oninput = () => { const c = shapeOf(editor.getSelected(), shapePos); if (c && c.getEl()) c.getEl().style.color = $('#shapeColor').value; };
  $('#shapeColor').onchange = () => setShape({ color: $('#shapeColor').value });
  [['#shapeH', '#shapeHn', 'h', 'height', 'px'], ['#shapeW', '#shapeWn', 'w', null, '%']].forEach(([r, n, key]) => {
    $(r).oninput = () => {
      $(n).value = $(r).value;
      const c = shapeOf(editor.getSelected(), shapePos), el = c && c.getEl();
      if (!el) return;
      if (key === 'h') el.style.setProperty('height', $(r).value + 'px', 'important');
      else el.querySelector('svg').style.setProperty('width', $(r).value + '%', 'important');
    };
    const clamp = v => key === 'h' ? Math.min(Math.max(v, 10), 600) : Math.min(Math.max(v, 100), 400);
    $(r).onchange = () => setShape({ [key]: clamp(+$(r).value) });
    $(n).onchange = () => { const v = parseFloat($(n).value); if (!isNaN(v)) setShape({ [key]: clamp(v) }); else renderShape(); };
  });
  $('#shapeFlip').onchange = () => setShape({ flip: $('#shapeFlip').checked });
  $('#shapeFront').onchange = () => setShape({ front: $('#shapeFront').checked });
}
