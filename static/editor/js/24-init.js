/* ---------------- Init ---------------- */
const SAFE_FONTS = [
  ['Arial, Helvetica, sans-serif', 'Arial'], ['Georgia, serif', 'Georgia'], ['Verdana, Geneva, sans-serif', 'Verdana'],
  ['Tahoma, Geneva, sans-serif', 'Tahoma'], ["'Trebuchet MS', Helvetica, sans-serif", 'Trebuchet MS'],
  ["'Times New Roman', Times, serif", 'Times New Roman'], ["'Courier New', Courier, monospace", 'Courier New'],
  ["'Palatino Linotype', Palatino, 'Book Antiqua', serif", 'Palatino'], ["'Lucida Sans Unicode', 'Lucida Grande', sans-serif", 'Lucida Sans'],
  ["Garamond, 'Times New Roman', serif", 'Garamond'], ["Impact, Charcoal, sans-serif", 'Impact'],
];
const FONT_OPTIONS = [
  { id: '', label: 'Default' },
  { id: "'Segoe UI', Roboto, Arial, sans-serif", label: 'System' },
  ...SAFE_FONTS.map(([id, label]) => ({ id, label })),
  ...GOOGLE_FONTS.map(f => ({ id: `'${f}', ${/Serif|Slab|Lora|Merriweather|Playfair|Alegreya|Baskerville|Crimson|Cormorant|Bitter/i.test(f) ? 'Georgia, serif' : 'Arial, sans-serif'}`, label: f + ' (web font)' })),
];

// Canvas-only CSS: show hidden-per-device elements faded instead of removing them, and email canvas basics.
const CANVAS_CSS = IS_EMAIL ? `
  body { background:#f1f5f9; padding:24px 10px; }
  .email-container { margin-left:auto !important; margin-right:auto !important; }
  [data-lp-block] { display:block; }
  img { max-width:100%; }
  @media (max-width:620px) {
    .email-container { width:100% !important; }
    .stack { display:block !important; width:100% !important; }
    .px { padding-left:20px !important; padding-right:20px !important; }
    .logo-cell { display:block !important; width:100% !important; text-align:center !important; }
    body .lp-hide-mobile { opacity:.3; outline:2px dashed #f59e0b; }
  }
  @media (min-width:621px) { body .lp-hide-desktop { opacity:.3; outline:2px dashed #f59e0b; } }
` : `
  .lp-col:empty, .content:empty, .rich:empty, .lp-box:empty, .container:empty { min-height:110px; display:flex; align-items:center; justify-content:center;
    border:2px dashed #93c5fd; border-radius:8px; background:#eff6ff; }
  .lp-col:empty::before, .content:empty::before, .rich:empty::before, .lp-box:empty::before, .container:empty::before {
    content:'+ Drag a widget here'; color:#2563eb; font:600 13px/1.3 sans-serif; pointer-events:none; }
  @media (min-width:992px) { body .lp-hide-desktop { display:revert !important; opacity:.45; outline:2px dashed #f59e0b; outline-offset:-2px; position:relative; }
    body .lp-hide-desktop:not(img):not(input):not(hr)::before { content:'Hidden on desktop'; position:absolute; top:0; left:0; z-index:5; background:#f59e0b; color:#111; font:600 11px/1 sans-serif; padding:3px 6px; border-radius:0 0 4px 0; pointer-events:none; } }
  @media (min-width:768px) and (max-width:991px) { body .lp-hide-tablet { display:revert !important; opacity:.45; outline:2px dashed #f59e0b; outline-offset:-2px; position:relative; }
    body .lp-hide-tablet:not(img):not(input):not(hr)::before { content:'Hidden on tablet'; position:absolute; top:0; left:0; z-index:5; background:#f59e0b; color:#111; font:600 11px/1 sans-serif; padding:3px 6px; border-radius:0 0 4px 0; pointer-events:none; } }
  @media (max-width:767px) { body .lp-hide-mobile { display:revert !important; opacity:.45; outline:2px dashed #f59e0b; outline-offset:-2px; position:relative; }
    body .lp-hide-mobile:not(img):not(input):not(hr)::before { content:'Hidden on mobile'; position:absolute; top:0; left:0; z-index:5; background:#f59e0b; color:#111; font:600 11px/1 sans-serif; padding:3px 6px; border-radius:0 0 4px 0; pointer-events:none; } }
`;

function setState(text, cls) { const s = $('#state'); s.textContent = text; s.title = text; s.className = cls || ''; }
function markDirty() { dirty = true; setState('Unsaved changes', 'dirty'); }

function showNotice() {
  const n = $('#notice');
  document.body.classList.add('has-notice');
  n.style.display = 'flex';
  const what = IS_EMAIL ? 'email' : 'page';
  if (enabled) {
    n.className = 'live';
    n.innerHTML = `This visual design is live on the published ${what}.<button id="useStd">Use the standard template instead</button>`;
    $('#useStd').onclick = () => setMode(false);
  } else {
    n.className = '';
    n.innerHTML = `This ${what} currently uses the standard template. <b>Save &amp; Publish</b> switches it to this visual design.<button id="pickTpl">Choose a ready-made design</button>`;
    $('#pickTpl').onclick = openTemplates;
  }
}

async function setMode(on) {
  const r = await fetch(`/api/campaigns/${SLUG}/visual/${PAGE}/mode`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled: on }) });
  const d = await r.json();
  if (!r.ok) { alert(d.error || 'Failed'); return; }
  enabled = d.enabled; showNotice();
}

function updateDevNote() {
  const dev = String(editor.getDevice() || 'desktop').toLowerCase();
  const note = $('#devnote');
  note.style.display = editor.getSelected() ? 'block' : 'none';
  note.className = dev === 'mobile' ? 'mobile' : '';
  note.innerHTML = dev === 'desktop' ? 'Styling for <b>all screens</b>. Switch to Tablet or Mobile at the top to set styles for smaller screens only.'
    : dev === 'tablet' ? 'Styling for <b>tablet and smaller</b> (up to 991px). Desktop is not affected.'
    : `Styling for <b>mobile only</b> (up to ${MOBILE_MAX}px). Desktop and tablet are not affected.`;
}

async function init() {
  const res0 = await fetch(`/api/campaigns/${SLUG}/visual/${PAGE}`);
  if (!res0.ok) {
    const txt = (await res0.text()).slice(0, 600);
    throw new Error(`Server returned ${res0.status} for /visual/${PAGE}. Check the Flask terminal for the traceback.\n${txt}`);
  }
  const data = await res0.json();
  // A saved design with no components (e.g. an empty save) would show a blank canvas: fall back to the seed layout.
  const projectHasContent = !!data.project && JSON.stringify(data.project.pages || []).includes('"components"');
  if (data.project && !projectHasContent && data.seed == null) data.seed = '';
  if (!projectHasContent) data.project = null;
  BLOCKS = data.blocks || {};
  META = data.meta || {};
  const fontOptions = '<option value="">Default (Arial)</option>' + GOOGLE_FONTS.map(font => `<option value="${esc(font)}">${esc(font)}</option>`).join('');
  $('#ctaFontInput').innerHTML = fontOptions;
  $('#buttonFontInput').innerHTML = fontOptions;
  FORM = data.form || {};
  CUSTOM = data.custom || {};
  BASE_CSS = data.base_css || '';
  enabled = data.enabled;
  const fonts = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Poppins:wght@400;600;700&family=Roboto:wght@400;700&family=Open+Sans:wght@400;700&family=Montserrat:wght@400;700&family=Lato:wght@400;700&display=swap';
  const devices = IS_EMAIL
    ? [{ id: 'desktop', name: 'Desktop', width: '' }, { id: 'tablet', name: 'Tablet', width: '680px', widthMedia: '' }, { id: 'mobile', name: 'Mobile', width: '375px', widthMedia: '620px' }]
    : [{ id: 'desktop', name: 'Desktop', width: '' }, { id: 'tablet', name: 'Tablet', width: '768px', widthMedia: '991px' }, { id: 'mobile', name: 'Mobile', width: '375px', widthMedia: '767px' }];

  editor = grapesjs.init({
    container: '#gjs',
    height: '100%',
    width: 'auto',
    storageManager: false,
    panels: { defaults: [] },
    projectData: data.project || { pages: [{ component: data.seed || '' }] },
    canvas: { styles: IS_EMAIL ? [`https://fonts.googleapis.com/css2?${GOOGLE_FONTS.map(f => 'family=' + encodeURIComponent(f).replace(/%20/g, '+') + ':wght@400;700').join('&')}&display=swap`] : [`/c/${SLUG}/landing-page/assets/style.css?v=${Date.now()}`, fonts] },
    canvasCss: CANVAS_CSS + pageWidgets().map(w => w.canvasCss || '').join(' '),
    plugins: [lpPlugin],
    blockManager: { appendTo: '#blocks' },
    layerManager: { appendTo: '#layers' },
    traitManager: { appendTo: '#traits' },
    selectorManager: { componentFirst: true },
    colorPicker: { appendTo: 'body' },
    deviceManager: { devices },
    assetManager: { upload: `/api/campaigns/${SLUG}/media`, uploadName: 'files', multiUpload: true, autoAdd: true },
    styleManager: {
      appendTo: '#styles',
      sectors: [
        { name: 'Typography', open: true, properties: [
          { extend: 'font-family', options: FONT_OPTIONS }, 'font-size', 'font-weight', 'color', 'line-height', 'letter-spacing',
          'text-transform', 'text-decoration', 'font-style', 'text-shadow'] },
        { name: 'Background', open: true, properties: ['background-color', 'background'] },
        { name: 'Border & shadow', open: false, properties: ['border', 'border-radius', 'box-shadow'] },
        { name: 'Spacing (exact values)', open: false, properties: ['margin', 'padding'] },
        { name: 'Size (exact values)', open: false, properties: ['width', 'min-width', 'max-width', 'height', 'min-height', 'max-height', 'overflow'] },
        { name: 'Position', open: false, properties: ['position', 'top', 'right', 'bottom', 'left', 'z-index', 'float', 'vertical-align', 'align-self', 'order', 'flex-basis'] },
        { name: 'Effects', open: false, properties: ['opacity', 'transform', 'transition', 'cursor'] },
      ],
    },
  });

  // Load the campaign content explicitly after GrapesJS is initialized.
  // This is important for the Email editor because projectData can be empty
  // when the backend returns a seed HTML layout instead of saved project JSON.
  if (!data.project && data.seed) {
    editor.setComponents(data.seed);
  }

  editor.Commands.add('lp:add', { run(ed) { openAdd(ed.getSelected()); } });
  addBlocks(editor.BlockManager);
  setupNav();
  fetch(`/api/campaigns/${SLUG}/media`).then(r => r.json()).then(d => editor.AssetManager.add(d.data || []));

  editor.on('load', () => {
    editor.runCommand('core:component-outline');
    applyCustomCss();
    nameTree(editor.getWrapper());
    applyDropRules(editor.getWrapper());
    editor.clearDirtyCount();
    dirty = false;
    let seen = false;
    try { seen = !!localStorage.getItem('lp-editor-help-seen'); } catch (e) {}
    if (!seen) setTimeout(openHelp, 400);
    setState(data.project ? 'Saved design loaded' : BASE_CSS ? 'Ready-made design loaded' : 'Starting layout from the campaign builder', 'ok');
    $('#open').href = PAGE_URL;
    renderEmailBackground();
    renderEmailWidth();
  });
  editor.on('update', () => { if (editor.getDirtyCount()) markDirty(); });
  editor.on('component:dblclick', c => {
    const cta = ctaTarget(c);
    if (cta) { editor.select(cta); setTimeout(() => { const t = $('#ctaTextInput'); showPane('layout'); t.focus(); t.select(); }, 80); return; }
    const t = liveTarget(c); if (t && t === c) convertLive(t);
  });

  // Elementor-style: selecting an element opens its Style panel.
  editor.on('component:toggled', () => {
    const sel = editor.getSelected();
    $('#style-empty').style.display = sel ? 'none' : '';
    $('#traits-empty').style.display = sel ? 'none' : '';
    $('#formActions').style.display = sel && sel.getAttributes()['data-lp-block'] === 'form' ? 'flex' : 'none';
    renderVisibility();
    renderSpacing();
    renderShape();
    renderLiveCard();
    renderAdvanced();
    renderCrumbs();
    renderTextAlign();
    renderCtaText();
    renderLiveEdit();
    renderRichText();
    renderNav();
    renderWidgetSettings();
    runWidgetSelect(sel);
    renderCard();
    renderButtonSettings();
    if (sel) enhanceSelected(sel);
    showPane(sel && sel.get('type') !== 'wrapper' ? ((currentPane === 'blocks' || ctaTarget(sel) || richTarget(sel) || navTarget(sel) || (widgetOf(sel) && widgetOf(sel).w.settings) || (liveTarget(sel) === sel)) ? 'layout' : currentPane) : 'blocks');
    updateDevNote();
    if (sel && ctaTarget(sel)) {
      setTimeout(() => { const t = $('#ctaTextInput'); t.focus(); t.select(); }, 60);
    }
  });
  editor.on('change:device', () => { updateDevNote(); setTimeout(renderSpacing, 400); });
  editor.on('component:styleUpdate', c => { convertCellMargin(c); renderTextAlign(); if (!spDrag) { renderSpacing(); renderLayout(); } });
  setupSpacing();
  setupLayout();
  setupShapes();
  editor.on('component:hover', c => { hoverSection = topSection(c); });
  editor.on('load', () => editor.Canvas.getDocument().addEventListener('mouseleave', () => { hoverSection = null; }));
  requestAnimationFrame(overlayLoop);
  editor.on('component:add', c => { nameTree(c); applyDropRules(c); });
  editor.on('component:update:attributes', () => renderAdvanced());
  new MutationObserver(() => enhanceColorFields($('#styles'))).observe($('#styles'), { childList: true, subtree: true });
  enhanceColorFields($('#styles'));
  setupAdvanced();
  editor.Keymaps.add('lp:save', '⌘+s, ctrl+s', () => save(), { prevent: true });
  showNotice();
}
