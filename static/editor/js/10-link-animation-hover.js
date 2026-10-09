/* ---------------- Link, animation, hover ---------------- */
const ANIMS = [['', 'None'], ['fade', 'Fade in'], ['fade-up', 'Fade up'], ['fade-down', 'Fade down'], ['fade-right', 'From left'],
  ['fade-left', 'From right'], ['zoom-in', 'Zoom in'], ['zoom-out', 'Zoom out'], ['bounce', 'Bounce'], ['flip', 'Flip up']];
const HOVERS = [['', 'None'], ['lp-hover-grow', 'Grow'], ['lp-hover-shrink', 'Shrink'], ['lp-hover-lift', 'Lift'],
  ['lp-hover-glow', 'Glow'], ['lp-hover-brighten', 'Brighten'], ['lp-hover-dim', 'Fade']];

function linkKeys(c) {
 return (c.get('tagName') || '').toLowerCase() === 'a'
    ? ['href', 'target']
    : ['data-lp-link', 'data-lp-target'];}
function setAttr(c, name, value) {
  if (value) c.addAttributes({ [name]: value });
  else c.removeAttributes(name);
}
function applyLink(url) {
  const sel = editor.getSelected();
  if (!sel) return;
  const [hrefKey, targetKey] = linkKeys(sel);
  setAttr(sel, hrefKey, url.trim());
  if (!url.trim()) setAttr(sel, targetKey, '');
  else setAttr(sel, targetKey, $('#lnkNew').checked ? '_blank' : '');
  renderAdvanced();
}
function playAnimation() {
  const sel = editor.getSelected();
  const el = sel && sel.getEl();
  if (!el || !sel.getAttributes()['data-anim']) return;
  el.classList.remove('lp-anim-in');
  void el.offsetWidth; // restart
  el.classList.add('lp-anim-in');
  el.addEventListener('animationend', () => el.classList.remove('lp-anim-in'), { once: true });
}
function renderAdvanced() {
  const sel = editor.getSelected();
  const on = !!sel && sel.get('type') !== 'wrapper';
  $('#linkCard').style.display = on ? 'block' : 'none';
  $('#animCard').style.display = on && !IS_EMAIL ? 'block' : 'none';
  $('#hoverCard').style.display = on && !IS_EMAIL ? 'block' : 'none';
  $('#emailFxNote').style.display = on && IS_EMAIL ? 'block' : 'none';
  $('#detailsTitle').style.display = on ? 'block' : 'none';
  if (!on) return;
  const attrs = sel.getAttributes();
  const [hrefKey, targetKey] = linkKeys(sel);
  if (document.activeElement !== $('#lnkUrl')) $('#lnkUrl').value = attrs[hrefKey] || '';
  $('#lnkNew').checked = attrs[targetKey] === '_blank';
  $('#lnkPdf').disabled = !META.pdf_url;
  $('#lnkPdf').title = META.pdf_url ? 'Link to the campaign PDF' : 'Upload a PDF in the campaign builder first';
  $$('#animGrid button').forEach(b => b.classList.toggle('active', (attrs['data-anim'] || '') === b.dataset.anim));
  $('#animSpeed').value = attrs['data-anim-speed'] || '';
  $('#animDelay').value = attrs['data-anim-delay'] || '';
  $('#animSpeed').disabled = $('#animDelay').disabled = $('#animPlay').disabled = !attrs['data-anim'];
  const cls = sel.getClasses();
  const hover = (HOVERS.find(([k]) => k && cls.includes(k)) || [''])[0];
  $$('#hoverGrid button').forEach(b => b.classList.toggle('active', b.dataset.hover === hover));
}
function setupAdvanced() {
  $('#animGrid').innerHTML = ANIMS.map(([k, l]) => `<button type="button" data-anim="${k}">${l}</button>`).join('');
  $('#hoverGrid').innerHTML = HOVERS.map(([k, l]) => `<button type="button" data-hover="${k}">${l}</button>`).join('');
  $$('#animGrid button').forEach(b => b.onclick = () => {
    const sel = editor.getSelected();
    if (!sel) return;
    setAttr(sel, 'data-anim', b.dataset.anim);
    if (!b.dataset.anim) { setAttr(sel, 'data-anim-speed', ''); setAttr(sel, 'data-anim-delay', ''); }
    renderAdvanced();
    setTimeout(playAnimation, 50);
  });
  $('#animSpeed').onchange = () => { setAttr(editor.getSelected(), 'data-anim-speed', $('#animSpeed').value); playAnimation(); };
  $('#animDelay').onchange = () => { setAttr(editor.getSelected(), 'data-anim-delay', $('#animDelay').value); playAnimation(); };
  $('#animPlay').onclick = playAnimation;
  $$('#hoverGrid button').forEach(b => b.onclick = () => {
    const sel = editor.getSelected();
    if (!sel) return;
    HOVERS.forEach(([k]) => k && sel.removeClass(k));
    if (b.dataset.hover) sel.addClass(b.dataset.hover);
    renderAdvanced();
  });
  $('#lnkUrl').onchange = () => applyLink($('#lnkUrl').value);
  $('#lnkUrl').onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); applyLink($('#lnkUrl').value); } };
  $('#lnkNew').onchange = () => applyLink($('#lnkUrl').value);
  $$('#linkCard [data-link]').forEach(b => b.onclick = () => {
    const v = b.dataset.link === 'pdf' ? META.pdf_url : b.dataset.link === 'lp' ? META.lp_url : b.dataset.link;
    if (b.dataset.link === 'pdf' || b.dataset.link === 'lp') $('#lnkNew').checked = true;
    if (b.dataset.link === '#form') $('#lnkNew').checked = false;
    $('#lnkUrl').value = v || '';
    applyLink(v || '');
  });
}
