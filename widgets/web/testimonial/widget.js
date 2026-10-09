const AVATAR = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><rect width="96" height="96" fill="#cbd5e1"/><circle cx="48" cy="38" r="17" fill="#f8fafc"/><path d="M14 92c4-20 18-30 34-30s30 10 34 30z" fill="#f8fafc"/></svg>');
widget({
  id: 'testimonial', label: 'Testimonial', category: 'Engagement', order: 5, icon: 'quote',
  tip: 'A customer quote with stars, photo, name and job title.',
  content: () => `<div class="lp-testimonial"><div class="lp-stars">★★★★★</div><p class="lp-t-quote">“This guide gave our team a clear plan. We saw results within weeks.”</p><div class="lp-t-person"><img src="${AVATAR}" alt=""><div><p class="lp-t-name">Jane Doe</p><p class="lp-t-role">Head of IT, Example Ltd</p></div></div></div>`,
  match: c => c.getClasses().includes('lp-testimonial'),
  note: 'Double-click the quote, name or job title to edit them, and the photo to replace it.',
  settings: [
    { label: 'Stars', type: 'select', options: [['5', '★★★★★'], ['4', '★★★★'], ['3', '★★★'], ['0', 'No stars']],
      get: r => { const s = r.find('.lp-stars')[0], el = s && s.getEl(); return el && el.style.display !== 'none' ? String(el.textContent.trim().length) : '0'; },
      set: (r, v) => {
        let s = r.find('.lp-stars')[0];
        if (!s) s = r.append('<div class="lp-stars"></div>', { at: 0 })[0];
        s.components('★'.repeat(+v));
        s.setStyle(+v ? {} : { display: 'none' });
      } },
  ],
});
