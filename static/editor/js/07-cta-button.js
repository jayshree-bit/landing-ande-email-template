/* ---------------- Email CTA + button settings ---------------- */
function renderCtaText() {
  const sel = editor && editor.getSelected();
  const target = ctaTarget(sel);
  const card = $('#ctaTextCard');
  card.style.display = target ? 'block' : 'none';
  if (!target) return;
  const c = ctaSettings(target);
  if (document.activeElement !== $('#ctaTextInput')) $('#ctaTextInput').value = c.text;
  if (document.activeElement !== $('#ctaLinkInput')) $('#ctaLinkInput').value = c.url;
  if (document.activeElement !== $('#ctaFontInput')) $('#ctaFontInput').value = c.font;
  loadCtaGoogleFont(c.font);
}

function buttonTarget(comp) {
  if (!comp) return null;
  const isButton = link => {
    const style = { ...link.getAttributes(), ...link.getStyle() };
    return (link.get('tagName') || '').toLowerCase() === 'a' &&
      (link.getClasses().includes('lp-btn') || style.display === 'inline-block' || link.getAttributes().role === 'button');
  };
  for (let target = comp; target && target.get('type') !== 'wrapper'; target = target.parent()) {
    if (isButton(target)) return target;
  }
  const buttons = comp.find('a').filter(isButton);
  return buttons.length === 1 ? buttons[0] : null;
}

function renderButtonSettings() {
  const target = buttonTarget(editor && editor.getSelected());
  const card = $('#buttonSettingsCard');
  card.style.display = target ? 'block' : 'none';
  if (!target) return;
  if (document.activeElement !== $('#buttonTextInput')) {
    $('#buttonTextInput').value = target.getEl()?.textContent.trim() || '';
  }
  if (document.activeElement !== $('#buttonLinkInput')) {
    $('#buttonLinkInput').value = target.getAttributes().href || '';
  }
  if (document.activeElement !== $('#buttonFontInput')) {
    $('#buttonFontInput').value = fontFromStack(target.getStyle()['font-family'] || '');
  }
}

function updateButtonText(target, text) {
  const textNode = target.components().models.find(component => component.get('type') === 'textnode');
  if (textNode) textNode.set('content', text);
  else target.components().reset([{ type: 'textnode', content: text }]);
  if (target.view) target.view.render();
}

function ctaFontStack(font) {
  return GOOGLE_FONTS.includes(font) ? `'${font}',Arial,Helvetica,sans-serif` : 'Arial,Helvetica,sans-serif';
}

function fontFromStack(stack) {
  return GOOGLE_FONTS.find(font => String(stack || '').includes(font)) || '';
}

function loadCtaGoogleFont(font) {
  if (!editor) return;
  const doc = editor.Canvas.getDocument();
  if (!doc) return;
  const id = 'lp-cta-google-font';
  let link = doc.getElementById(id);
  if (!GOOGLE_FONTS.includes(font)) { if (link) link.remove(); return; }
  if (!link) { link = doc.createElement('link'); link.id = id; link.rel = 'stylesheet'; doc.head.appendChild(link); }
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(font).replace(/%20/g, '+')}:wght@400;700&display=swap`;
}

const CTA_KEYS = ['email-cta', 'email-cta-signature', 'email-footer-signature'];

// The CTA button a selection refers to: the button block itself, or the cell/row around exactly one button.
function ctaTarget(comp) {
  if (!IS_EMAIL || !comp) return null;
  const isCta = c => c && CTA_KEYS.includes((c.getAttributes() || {})['data-lp-block']);
  if (isCta(comp)) return comp;
  const inside = comp.find('[data-lp-block]').filter(isCta);
  if (inside.length === 1) return inside[0];
  return null;
}

// Each CTA button keeps its own text / link / font on its placeholder (data-cta-*), so two buttons can differ.
function ctaSettings(comp) {
  const a = (comp && comp.getAttributes()) || {};
  return {
    text: a['data-cta-text'] != null ? a['data-cta-text'] : (META.cta_text || 'Download Now'),
    url: a['data-cta-url'] != null ? a['data-cta-url'] : (META.cta_url || META.lp_url || ''),
    font: a['data-cta-font'] != null ? a['data-cta-font'] : (META.cta_font || ''),
  };
}

function applyCtaToHtml(source, text, url, font) {
  return source.replace(/(<a\b[^>]*>)[\s\S]*?(<\/a>)/i, (m, open, close) => `${open}${esc(text)}${close}`)
    .replace(/(<a\b[^>]*\bhref=")[^"]*("[^>]*>)/i, (m, a, b) => `${a}${esc(url || META.lp_url || '#')}${b}`)
    .replace(/font-family:[^;"']*(?:'[^']*'[^;"']*)?/gi, `font-family:${ctaFontStack(font)}`);
}

function updateCtaPreview(comp) {
  if (comp && comp.view) comp.view.render();
}
