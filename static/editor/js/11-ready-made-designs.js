/* ---------------- Ready-made designs ---------------- */
async function openTemplates() {
  const lib = await (await fetch('/api/templates')).json();
  const items = lib[PAGE] || [];
  const width = IS_EMAIL ? 680 : 1280;
  const wrap = document.createElement('div');
  wrap.className = 'lp-modal';
  wrap.innerHTML = `<p class="muted" style="margin:0 0 12px">Previews use this campaign's logos, banner and content. Choosing a design replaces the current
    ${IS_EMAIL ? 'email' : 'page'} in the editor; nothing is published until you click <b>Save &amp; Publish</b>, and <b>Restore previous design</b> brings the old one back.</p>
    <div class="tpl-grid">${items.map(i => `
      <div class="tpl-card" data-id="${i.id}">
        <div class="tpl-thumb"><iframe loading="lazy" scrolling="no" tabindex="-1" title="${esc(i.name)}" src="/templates/preview/${PAGE}/${i.id}?slug=${SLUG}&preview=1"></iframe></div>
        <div class="tpl-body"><b>${esc(i.name)}</b><span>${esc(i.description)}</span><button type="button">Use this design</button></div>
      </div>`).join('')}</div>`;
  editor.Modal.open({ title: 'Choose a design', content: wrap });
  const dlg = document.querySelector('.gjs-mdl-dialog');
  if (dlg) dlg.classList.add('lp-wide');
  editor.Modal.onceClose && editor.Modal.onceClose(() => dlg && dlg.classList.remove('lp-wide'));
  requestAnimationFrame(() => wrap.querySelectorAll('.tpl-thumb').forEach(t => {
    const f = t.querySelector('iframe');
    const scale = t.clientWidth / width;
    f.style.width = width + 'px';
    f.style.height = Math.ceil(t.clientHeight / scale) + 'px';
    f.style.transform = `scale(${scale})`;
  }));
  wrap.querySelectorAll('.tpl-card').forEach(card => card.querySelector('button').onclick = async () => {
    const btn = card.querySelector('button');
    btn.disabled = true; btn.textContent = 'Loading…';
    const d = await (await fetch(`/api/campaigns/${SLUG}/library/${PAGE}/${card.dataset.id}`)).json();
    previousDesign = { project: editor.getProjectData(), base: BASE_CSS, template: TEMPLATE_ID };
    editor.setStyle('');
    editor.setComponents(d.html);
    BASE_CSS = d.css || '';
    TEMPLATE_ID = card.dataset.id;
    editor.UndoManager.clear(); // undo can't bring back the old design's stylesheet; "Restore previous design" does
    applyCustomCss();
    nameTree(editor.getWrapper());
    applyDropRules(editor.getWrapper());
    editor.select(null);
    editor.Modal.close();
    if (dlg) dlg.classList.remove('lp-wide');
    markDirty();
    showRestore();
  });
}

function showRestore() {
  const n = $('#notice');
  document.body.classList.add('has-notice');
  n.style.display = 'flex';
  n.className = '';
  n.innerHTML = 'New design applied. Click <b>Save &amp; Publish</b> to make it live.<button id="restoreDesign">↩ Restore previous design</button>';
  $('#restoreDesign').onclick = () => {
    if (!previousDesign) return;
    editor.loadProjectData(previousDesign.project);
    BASE_CSS = previousDesign.base;
    TEMPLATE_ID = previousDesign.template;
    previousDesign = null;
    setTimeout(() => { applyCustomCss(); nameTree(editor.getWrapper()); applyDropRules(editor.getWrapper()); }, 50);
    showNotice();
    markDirty();
  };
}
