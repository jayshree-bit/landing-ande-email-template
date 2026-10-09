/* ---------------- Settings (no need to go back to the builder) ---------------- */
const SET_FONTS = ['', 'Inter', 'Poppins', 'Roboto', 'Open Sans', 'Montserrat', 'Lato', 'Arial', 'Georgia', 'Verdana'];
async function openSettings(tab = 'brand') {
  const cfg = await (await fetch(`/api/campaigns/${SLUG}`)).json();
  const g = (path, d = '') => path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), cfg) ?? d;
  const files = cfg.files || {};
  const removed = {};
  const wrap = document.createElement('div');
  wrap.className = 'lp-modal';
  const input = (k, label, ph = '', cls = '') => `<label class="f ${cls}">${label}<input data-k="${k}" value="${esc(g(k))}" placeholder="${esc(ph)}"></label>`;
  const color = (k, label, d) => `<label class="f">${label}<span class="set-color"><input type="color" data-k="${k}" value="${esc(g(k, d) || d)}"><span>${esc(g(k, d) || d)}</span></span></label>`;
  const fileBox = (role, label, accept) => `<div class="set-file" data-role="${role}"><b>${label}</b><div class="prev">${files[role] && role !== 'pdf' ? `<img src="/c/${SLUG}/landing-page/assets/${encodeURIComponent(files[role])}?t=${Date.now()}">` : ''}</div>
    <span class="cur">${files[role] ? '✓ ' + esc(files[role]) : ''}</span><input type="file" accept="${accept}">${files[role] ? '<button type="button" class="rm">Remove</button>' : ''}</div>`;
  wrap.innerHTML = `
    <div class="set-tabs">
      <button type="button" data-t="brand">Logos, banner &amp; colours</button>
      <button type="button" data-t="company">Company &amp; footer</button>
      <button type="button" data-t="email">Email</button>
      <button type="button" data-t="ty">Thank-you page</button>
    </div>
    <div class="set-pane" data-p="brand">
      <div class="set-files">
        ${fileBox('logo', 'Company logo', 'image/*')}${fileBox('partner_logo', 'Partner logo', 'image/*')}
        ${fileBox('banner', 'Banner image', 'image/*')}${fileBox('pdf', 'PDF (downloads after the form)', 'application/pdf')}
      </div>
      <p class="muted">Tip: drag a file onto a box. White logo? Give the header a dark background below.</p>
      <div class="set-grid">
        ${input('partner_name', 'Partner name (logo alt text)')}
        <label class="f">Page font<select data-k="brand.font">${SET_FONTS.map(f => `<option value="${f}"${g('brand.font') === f ? ' selected' : ''}>${f || 'System (Segoe UI)'}</option>`).join('')}</select></label>
        ${color('brand.primary_color', 'Main colour (buttons, links)', '#0b5cff')}${color('brand.button_text_color', 'Button text colour', '#ffffff')}
        ${color('brand.heading_color', 'Heading colour', '#0f172a')}${color('layout.header_bg', 'Header background', '#ffffff')}
        ${color('brand.footer_bg', 'Footer background', '#0f172a')}${color('brand.footer_text_color', 'Footer text colour', '#cbd5e1')}
        ${input('ty.download_text', 'PDF button text', 'Download the PDF')}
      </div>
    </div>
    <div class="set-pane" data-p="company"><div class="set-grid">
      ${input('company.name', 'Company name')}${input('company.website', 'Website', 'https://')}
      <label class="f full">Address<textarea data-k="company.address">${esc(g('company.address'))}</textarea></label>
      ${input('company.phone', 'Phone')}${input('company.email', 'Email')}
      ${input('company.privacy_url', 'Privacy policy URL')}${input('company.terms_url', 'Terms URL')}
      ${input('company.linkedin', 'LinkedIn')}${input('company.twitter', 'X / Twitter')}
      ${input('company.facebook', 'Facebook')}${input('company.instagram', 'Instagram')}
      ${input('company.youtube', 'YouTube')}${input('company.copyright', 'Copyright line', '© 2026 Company. All rights reserved.')}
    </div></div>
    <div class="set-pane" data-p="email"><div class="set-grid">
      ${input('email.subject', 'Subject line', '', 'full')}${input('email.preheader', 'Preheader (inbox preview text)', '', 'full')}
      ${input('email.cta_text', 'Button text', 'Download Now')}${input('email.cta_url', 'Button link (empty = landing page)', 'auto')}
      ${input('email.greeting', 'Greeting', 'Hi [First Name],')}${color('email.body_background_color', 'Email background', '#f1f5f9')}
      <label class="f full">Sign-off<textarea data-k="email.signoff" placeholder="Regards,&#10;Team">${esc(g('email.signoff'))}</textarea></label>
      ${input('email.unsubscribe_url', 'Unsubscribe link', 'https://… or your email tool’s merge tag', 'full')}
      ${input('email.footer_note', 'Footer note (why they got this email)', '', 'full')}
    </div></div>
    <div class="set-pane" data-p="ty"><div class="set-grid">
      ${input('ty.heading', 'Heading', 'Thank you!', 'full')}
      <p class="muted full">The PDF downloads automatically when the thank-you page opens. Change the PDF and its button text under "Logos, banner &amp; colours". The thank-you design itself is edited in the Thank-you tab of this editor.</p>
    </div></div>
    <div class="modal-actions"><button type="button" id="setCancel">Cancel</button><button type="button" class="primary" id="setSave">Save settings</button></div>`;
  const show = t => {
    wrap.querySelectorAll('.set-tabs button').forEach(b => b.classList.toggle('active', b.dataset.t === t));
    wrap.querySelectorAll('.set-pane').forEach(p => p.classList.toggle('active', p.dataset.p === t));
  };
  wrap.querySelectorAll('.set-tabs button').forEach(b => b.onclick = () => show(b.dataset.t));
  show(tab);
  wrap.querySelectorAll('input[type=color]').forEach(c => c.oninput = () => { c.nextElementSibling.textContent = c.value; });
  wrap.querySelectorAll('.set-file').forEach(box => {
    const inp = box.querySelector('input[type=file]');
    const showLocal = () => {
      const f = inp.files[0];
      if (!f) return;
      delete removed[box.dataset.role];
      box.querySelector('.cur').textContent = 'Selected: ' + f.name;
      box.querySelector('.prev').innerHTML = f.type.startsWith('image/') ? `<img src="${URL.createObjectURL(f)}">` : '';
    };
    inp.onchange = showLocal;
    ['dragenter', 'dragover'].forEach(ev => box.addEventListener(ev, e => { e.preventDefault(); box.classList.add('over'); }));
    ['dragleave', 'drop'].forEach(ev => box.addEventListener(ev, () => box.classList.remove('over')));
    box.addEventListener('drop', e => { e.preventDefault(); if (e.dataTransfer.files.length) { inp.files = e.dataTransfer.files; showLocal(); } });
    const rm = box.querySelector('.rm');
    if (rm) rm.onclick = () => { removed[box.dataset.role] = true; inp.value = ''; box.querySelector('.cur').textContent = 'Will be removed when you save'; box.querySelector('.prev').innerHTML = ''; rm.remove(); };
  });
  wrap.querySelector('#setCancel').onclick = () => editor.Modal.close();
  wrap.querySelector('#setSave').onclick = async () => {
    const settings = { remove_files: removed };
    wrap.querySelectorAll('[data-k]').forEach(el => {
      const keys = el.dataset.k.split('.');
      let o = settings;
      keys.slice(0, -1).forEach(k => { o = o[k] = o[k] || {}; });
      o[keys[keys.length - 1]] = el.value;
    });
    const fd = new FormData();
    fd.append('settings', JSON.stringify(settings));
    wrap.querySelectorAll('.set-file').forEach(b => { const f = b.querySelector('input[type=file]').files[0]; if (f) fd.append(b.dataset.role, f); });
    const btn = wrap.querySelector('#setSave');
    btn.disabled = true; btn.textContent = 'Saving…';
    const res = await fetch(`/api/campaigns/${SLUG}/settings`, { method: 'POST', body: fd });
    const d = await res.json();
    if (!res.ok) { btn.disabled = false; btn.textContent = 'Save settings'; alert(d.error || 'Could not save'); return; }
    BLOCKS = d.blocks; META = d.meta;
    refreshLiveBlocks();
    const link = editor.Canvas.getDocument().querySelector('link[href*="/assets/style.css"]');
    if (link) link.href = link.href.replace(/([?&]v=)\d+/, '$1' + Date.now());
    editor.Modal.close();
    setState('Settings saved and published', 'ok');
  };
  editor.Modal.open({ title: 'Campaign settings', content: wrap });
  const dlg = document.querySelector('.gjs-mdl-dialog');
  if (dlg) dlg.classList.add('lp-wide');
}

function refreshLiveBlocks() {
  editor.getWrapper().find('[data-lp-block]').forEach(c => c.view && c.view.render());
}
