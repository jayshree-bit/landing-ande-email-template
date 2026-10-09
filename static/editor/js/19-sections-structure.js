/* ---------------- Ready-made sections & structure picker ---------------- */
const SECTION_TEMPLATES = [
  { id: 'hero', label: 'Hero', icon: 'hero', html: () => `<section class="lp-section" style="padding:96px 0;background-color:#0f172a;text-align:center;"><div class="container" style="max-width:820px;"><p class="eyebrow" style="color:#93c5fd;">Free guide</p><h1 style="color:#ffffff;font-size:44px;line-height:1.15;margin:0 0 16px;">Your big headline goes here</h1><p style="color:#cbd5e1;font-size:19px;margin:0 0 26px;">One or two lines that explain the value of your offer.</p><a class="lp-btn" href="#form">Get it now</a></div></section>` },
  { id: 'features', label: 'Features', icon: 'card', html: () => section(`<h2 style="text-align:center;margin:0 0 30px;">Why choose us</h2><div class="lp-row">${['Fast set-up', 'Secure by design', 'Expert support'].map((t, i) => `<div class="lp-col"><div class="lp-box" style="text-align:center;height:100%;"><p style="font-size:30px;margin:0 0 8px;">${['⚡', '🔒', '💬'][i]}</p><h3 style="margin:0 0 8px;">${t}</h3><p>Describe this benefit in one short sentence.</p></div></div>`).join('')}</div>`) },
  { id: 'content-form', label: 'Content + form', icon: 'form', html: () => section(`<div class="main-grid" style="padding:0;"><div class="content"><h2>Why download?</h2><p>Explain what the reader gets.</p><ul><li>First benefit</li><li>Second benefit</li><li>Third benefit</li></ul></div><div data-lp-block="form"></div></div>`, '56px') },
  { id: 'cta', label: 'Call to action', icon: 'button', html: () => `<section class="lp-section" style="padding:48px 0;background-color:var(--primary);"><div class="container" style="display:flex;align-items:center;justify-content:space-between;gap:20px;flex-wrap:wrap;"><h2 style="color:#ffffff;margin:0;">Ready to get started?</h2><a class="lp-btn" href="#form" style="background-color:#ffffff;color:#0f172a;">Download now</a></div></section>` },
  { id: 'testimonial', label: 'Testimonial', icon: 'quote', html: () => section(`<div style="max-width:760px;margin:0 auto;text-align:center;"><p style="font-size:22px;line-height:1.5;font-style:italic;margin:0 0 18px;">“This guide gave our team a clear plan. We saw results within weeks.”</p><p style="font-weight:700;margin:0;">Jane Doe</p><p style="color:#64748b;margin:0;">Head of IT, Example Ltd</p></div>`, '64px') },
  { id: 'stats', label: 'Numbers', icon: 'col4', html: () => section(`<div class="lp-row" style="text-align:center;">${[['10k+', 'Readers'], ['95%', 'Would recommend'], ['24/7', 'Support'], ['50+', 'Countries']].map(([n, l]) => `<div class="lp-col"><p style="font-size:40px;font-weight:800;color:var(--primary);margin:0;">${n}</p><p style="margin:4px 0 0;color:#64748b;">${l}</p></div>`).join('')}</div>`, '48px') },
  { id: 'faq', label: 'FAQ', icon: 'list', html: () => section(`<div style="max-width:820px;margin:0 auto;"><h2 style="text-align:center;margin:0 0 24px;">Frequently asked questions</h2>${['Who is this guide for?', 'Is it really free?', 'How long does it take to read?'].map(q => `<div style="border-bottom:1px solid #e2e8f0;padding:16px 0;"><h4 style="margin:0 0 6px;font-size:17px;">${q}</h4><p style="margin:0;color:#475569;">Write a short, helpful answer here.</p></div>`).join('')}</div>`) },
  { id: 'image-text', label: 'Image + text', icon: 'imgtext', html: () => row(col(45, `<img src="${imgSrc('banner')}" style="width:100%;border-radius:10px;">`) + col(55, '<h2>Feature title</h2><p>Explain the feature or benefit in a sentence or two.</p><a class="lp-btn" href="#form">Learn more</a>')) },
];
SECTION_TEMPLATES.unshift(
  { id: 'header-menu', label: 'Header + menu', icon: 'nav', html: () => headerNavHtml() },
);
SECTION_TEMPLATES.push(
  { id: 'articles', label: 'Article cards', icon: 'card', html: () => `<section class="lp-section" id="articles" style="padding:56px 0;background-color:#f8fafc;"><div class="container"><h2 style="text-align:center;margin:0 0 28px;">This collection includes</h2><div class="lp-cards">${[1, 2, 3, 4].map(n => cardHtml(imgSrc('banner'), `Article ${n} title goes here`, 'By Author name')).join('')}</div></div></section>` },
  { id: 'notice', label: 'Notice bar', icon: 'notice', html: () => '<section class="lp-section"><p class="lp-notice">Hurry: your limited-time access to this collection expires in 30 days.</p></section>' },
  { id: 'about', label: 'About', icon: 'text', html: () => section('<div id="about" style="max-width:820px;"><h3 style="margin:0 0 10px;">About us</h3><p style="margin:0;color:#475569;">Say who you are and why readers can trust you, in two or three sentences.</p></div>', '48px') },
);
const STRUCTURES = [[100], [50, 50], [33, 33, 33], [25, 25, 25, 25], [30, 70], [70, 30], [66, 33], [33, 66], [25, 50, 25], [20, 20, 20, 20, 20]];

function topSection(c) {
  const root = rootContainer();
  for (let x = c; x && x !== root && x.get('type') !== 'wrapper'; x = x.parent()) {
    if (x.parent() === root || (x.parent() && x.parent().get('type') === 'wrapper')) return x;
  }
  return null;
}
let hoverSection = null;
function drawSectionPlus() {
  const btn = $('#secPlus');
  const frame = editor && editor.Canvas.getFrameEl();
  const el = hoverSection && hoverSection.getEl && hoverSection.getEl();
  if (!el || !frame || !el.isConnected || spDrag || editor.Commands.isActive('core:preview')) { btn.style.display = 'none'; return; }
  const fr = frame.getBoundingClientRect(), r = el.getBoundingClientRect();
  const y = fr.top + r.bottom, x = fr.left + r.left + r.width / 2;
  if (y < fr.top + 10 || y > fr.bottom - 10) { btn.style.display = 'none'; return; }
  Object.assign(btn.style, { display: 'block', left: x - 15 + 'px', top: y - 15 + 'px' });
}

function insertSectionHtml(html, after) {
  const root = rootContainer();
  // With no target, add at the end of the page, but above the footer.
  const last = root.components().at(root.components().length - 1);
  const footerLast = last && ['footer', 'email-footer'].includes(last.getAttributes()['data-lp-block']);
  const at = after && after.parent() ? after.parent().components().indexOf(after) + 1 : root.components().length - (footerLast ? 1 : 0);
  const parent = after && after.parent() ? after.parent() : root;
  const added = parent.append(html, { at });
  const first = Array.isArray(added) ? added[0] : added;
  if (first) { editor.select(first); editor.Canvas.scrollTo(first, { behavior: 'smooth', block: 'center' }); }
  editor.Modal.close();
}

function openStructure(after) {
  if (IS_EMAIL) { editor.select(null); openAdd(null); return; } // email rows come from the Email layout widgets
  const wrap = document.createElement('div');
  wrap.className = 'lp-modal';
  wrap.innerHTML = `<div class="struct-tabs"><button type="button" class="active" data-t="s">Select your structure</button><button type="button" data-t="r">Ready-made sections</button></div>
    <div data-p="s"><div class="struct-grid">${STRUCTURES.map((cols, i) => `<button type="button" class="struct-tile" data-i="${i}"><div class="struct-cols">${cols.map(w => `<span style="flex:${w}"></span>`).join('')}</div>${cols.length === 1 ? 'One column' : cols.join(' / ')}</button>`).join('')}</div></div>
    <div data-p="r" style="display:none"><div class="sec-grid">${SECTION_TEMPLATES.map(t => `<button type="button" class="add-tile" data-sec="${t.id}">${I[t.icon] || I.section}<span>${esc(t.label)}</span></button>`).join('')}</div></div>
    <p class="muted" style="margin-top:14px">${after ? 'The new section is added below the one you hovered.' : 'The new section is added at the end of the page.'}</p>`;
  wrap.querySelectorAll('.struct-tabs button').forEach(b => b.onclick = () => {
    wrap.querySelectorAll('.struct-tabs button').forEach(x => x.classList.toggle('active', x === b));
    wrap.querySelectorAll('[data-p]').forEach(p => { p.style.display = p.dataset.p === b.dataset.t ? '' : 'none'; });
  });
  wrap.querySelectorAll('.struct-tile').forEach(b => b.onclick = () => {
    const cols = STRUCTURES[+b.dataset.i];
    const equal = cols.every(w => w === cols[0]);
    insertSectionHtml(row(cols.map(w => col(equal ? 0 : w)).join('')), after);
  });
  wrap.querySelectorAll('[data-sec]').forEach(b => b.onclick = () => insertSectionHtml(SECTION_TEMPLATES.find(t => t.id === b.dataset.sec).html(), after));
  editor.Modal.open({ title: 'Add a section', content: wrap });
}
