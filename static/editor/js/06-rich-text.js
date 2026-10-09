/* ---------------- Rich text editor for the selected cell ---------------- */
const RICH_TAGS = ['td', 'th', 'div', 'p', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li'];
let richQuill = null, richTarget_ = null, richBusy = false;

function richTarget(comp) {
  if (!comp || comp.get('type') === 'wrapper') return null;
  const tag = (comp.get('tagName') || '').toLowerCase();
  if (!RICH_TAGS.includes(tag) && comp.get('type') !== 'text') return null;
  if ((comp.getAttributes() || {})['data-lp-block']) return null;
  const own = widgetOf(comp);
  if (own && own.root === comp && own.w.settings) return null; // widgets with their own settings keep their structure
  if (comp.find('table, [data-lp-block]').length) return null;
  const html = comp.getInnerHTML ? comp.getInnerHTML() : '';
  return html.replace(/<[^>]*>/g, '').trim() ? comp : null;
}

function initRichQuill() {
  if (richQuill || typeof Quill === 'undefined') return richQuill;
  const Size = Quill.import('attributors/style/size');
  Size.whitelist = ['12px', '14px', '16px', '18px', '20px', '24px', '32px'];
  Quill.register(Size, true);
  Quill.register(Quill.import('attributors/style/align'), true);
  Quill.register(Quill.import('attributors/style/color'), true);
  Quill.register(Quill.import('attributors/style/background'), true);
  richQuill = new Quill('#richTextEditor', {
    theme: 'snow',
    modules: { toolbar: [
      [{ size: ['12px', '14px', '16px', '18px', '20px', '24px', '32px'] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ color: [] }, { background: [] }],
      [{ list: 'ordered' }, { list: 'bullet' }, { align: [] }],
      ['link', 'clean'],
    ] },
  });
  richQuill.on('text-change', (delta, old, source) => {
    if (source !== 'user' || richBusy || !richTarget_) return;
    let html = richQuill.root.innerHTML;
    if (html === '<p><br></p>') html = '';
    html = html.replace(/<p>/g, '<p style="margin:0 0 10px;">').replace(/<p style="/g, '<p style="margin:0 0 10px;');
    html = html.replace(/margin:0 0 10px;margin:0 0 10px;/g, 'margin:0 0 10px;');
    richTarget_.components(html);
    markDirty();
  });
  return richQuill;
}

function renderRichText() {
  const target = editor && richTarget(editor.getSelected());
  const card = $('#richTextCard');
  card.style.display = target ? 'block' : 'none';
  if (!target) { richTarget_ = null; return; }
  if (!initRichQuill()) return;
  if (richTarget_ === target) return; // same cell: do not reset the caret while typing
  richTarget_ = target;
  richBusy = true;
  richQuill.setContents(richQuill.clipboard.convert(target.getInnerHTML()), 'silent');
  richBusy = false;
}
