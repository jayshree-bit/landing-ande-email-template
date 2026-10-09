/* ---------------- Widgets ----------------
 * Every widget is a folder under widgets/web/ (pages) or widgets/email/ (the email). Its widget.js calls widget({...});
 * the server adds every widget.js to the editor automatically, so a new widget never needs changes here.
 *
 *   widget({
 *     id: 'countdown',            // unique per page type
 *     label: 'Countdown',         // name under the icon
 *     category: 'Engagement',     // panel group (see CATEGORY_ORDER)
 *     order: 10,                  // position inside the group
 *     icon: '<path …/>',          // SVG drawing (24×24), or the name of an icon in I
 *     tip: 'What it does.',       // shown on hover
 *     page: 'web',                // 'web' (landing + thank-you) or 'email'
 *     content: () => '<div …>',   // HTML dropped on the page (a function, so it can use the campaign's logos)
 *     match: c => …,              // optional: is this component (one of) mine? enables `settings`
 *     settings: [ … ],            // optional: fields in the Layout tab, see 03b-widget-settings.js
 *     onSelect(c) {},             // optional: runs when the user selects something inside it
 *     canvasCss: '…',             // optional: CSS used only inside the editor canvas
 *     types(ed) {},               // optional: register GrapesJS component types (ed.DomComponents.addType)
 *   });
 *
 * Published look and behaviour go next to widget.js: style.css is added to the page stylesheet and runtime.js to the
 * page script when the campaign is built.
 */
const WIDGETS = [];
function widget(def) { WIDGETS.push(def); }
const CATEGORY_ORDER = ['Layout', 'Basic', 'Media', 'Engagement', 'Sections', 'Ready-made sections',
  'Email content', 'Email layout', 'Email sections', 'Campaign (live)'];
const pageWidgets = () => WIDGETS.filter(w => (w.page || 'web') === (IS_EMAIL ? 'email' : 'web'));

function addBlocks(bm) {
  const rank = c => { const i = CATEGORY_ORDER.indexOf(c); return i < 0 ? CATEGORY_ORDER.length - 1.5 : i; };
  const list = pageWidgets().map((w, i) => ({ w, i }))
    .sort((a, b) => rank(a.w.category) - rank(b.w.category) || (a.w.order ?? 100) - (b.w.order ?? 100) || a.i - b.i)
    .map(x => x.w);
  if (!IS_EMAIL) SECTION_TEMPLATES.forEach((t, i) => list.push({ id: 'sec-' + t.id, label: t.label, category: 'Ready-made sections',
    icon: t.icon, content: t.html, tip: 'A ready-made section. Drop it between other sections, then edit the text.' }));
  list.forEach(w => {
    const media = I[w.icon] || (w.icon && w.icon.startsWith('<') ? icon(w.icon) : I[w.id]) || I.section;
    bm.add(w.id, { label: w.label, category: w.category, media, content: typeof w.content === 'function' ? w.content() : w.content,
      ...(w.block || {}), attributes: { ...((w.block && w.block.attributes) || {}), ...(w.tip ? { title: w.tip } : {}) } });
  });
  const live = IS_EMAIL
    ? ['email-header', 'email-banner', 'email-content', 'email-cta', 'email-cta-signature', 'email-signoff', 'email-footer', 'email-footer-signature']
    : ['header', 'banner', 'banner-slim', 'download', 'footer'];
  const iconFor = { 'banner-slim': 'banner', 'email-header': 'header', 'email-banner': 'banner', 'email-content': 'text',
    'email-cta': 'button', 'email-cta-signature': 'button', 'email-signoff': 'text', 'email-footer': 'footer', 'email-footer-signature': 'footer' };
  live.forEach(key => bm.add(`live-${key}`, { label: LIVE_LABELS[key], category: 'Campaign (live)', media: I[iconFor[key] || key] || I.section,
    content: `<div data-lp-block="${key}"></div>`, attributes: { class: 'gjs-block live' } }));
}

// The widget (and its outer element) that owns a component, for widgets that declare `match`.
function widgetOf(comp) {
  const mine = pageWidgets().filter(w => w.match);
  for (let c = comp; c && c.get('type') !== 'wrapper'; c = c.parent()) {
    const w = mine.find(x => x.match(c));
    if (w) return { w, root: c };
  }
  return null;
}
