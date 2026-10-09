/* ---------------- Widget helpers (shared by the widget files) ---------------- */
// Web pages
const section = (inner, pad = '60px') => `<section class="lp-section" style="padding:${pad} 0;"><div class="container">${inner}</div></section>`;
const col = (w, inner = '<p>Add content to this column.</p>') =>
  `<div class="lp-col"${w ? ` style="flex:0 0 calc(${w}% - 12px);"` : ''}>${inner}</div>`;
const row = cols => section(`<div class="lp-row">${cols}</div>`, '40px');
const imgSrc = key => ((BLOCKS[key] || '').match(/<img[^>]+src="([^"]+)"/) || [])[1] || '';
const navHtml = (links = [['Overview', '#top'], ['What you get', '#articles'], ['About', '#about'], ['Get access', '#form']]) =>
  `<nav class="lp-nav">${links.map(([t, h]) => `<a href="${h}">${t}</a>`).join('')}</nav>`;
const headerNavHtml = () => {
  const logo = imgSrc('header');
  return `<header class="lp-nav-bar" id="top"><div class="container lp-nav-inner">${logo ? `<a class="lp-nav-logo" href="#top"><img src="${logo}" alt="Logo"></a>` : '<h3 style="margin:0;">Your brand</h3>'}${navHtml().replace('class="lp-nav"', 'class="lp-nav" style="justify-content:flex-end;"')}</div></header>`;
};
const PLACEHOLDER_IMG = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="640" height="360" fill="#e2e8f0"/><path d="M250 230l60-70 50 55 30-30 60 45z" fill="#94a3b8"/><circle cx="390" cy="140" r="22" fill="#94a3b8"/></svg>');
const cardHtml = (img, title, by) => `<div class="lp-card"><img src="${img || PLACEHOLDER_IMG}" alt=""><div class="lp-card-body"><p class="lp-card-label">Signature collection</p><h3><a href="#form">${title}</a></h3><p class="lp-card-by">${by}</p></div></div>`;

// The Nth image inside a live block's preview, e.g. imgOf('header', 1) is the partner logo.
const imgOf = (key, n = 0) => [...(BLOCKS[key] || '').matchAll(/<img[^>]+src="([^"]+)"/g)].map(m => m[1])[n] || '';

// Email (tables + inline styles)
const FONT = 'font-family:Arial,Helvetica,sans-serif;';
const T = inner => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>${inner}</tr></table>`;
const td = (inner, style = 'padding:12px 40px;') => `<td class="px" style="${style}${FONT}font-size:15px;line-height:24px;color:#333333;">${inner}</td>`;
const ebtn = (text = 'Download Now') => `<a href="${esc(META.lp_url || '#')}" target="_blank" style="display:inline-block;background-color:${META.primary || '#0b5cff'};color:${META.btn_text || '#ffffff'};${FONT}font-size:16px;font-weight:bold;line-height:48px;text-decoration:none;padding:0 32px;border-radius:6px;">${text}</a>`;
const ecol = (w, inner, pad) => `<td class="stack" width="${w}%" valign="top" style="width:${w}%;padding:${pad};${FONT}font-size:15px;line-height:24px;color:#333333;">${inner}</td>`;
