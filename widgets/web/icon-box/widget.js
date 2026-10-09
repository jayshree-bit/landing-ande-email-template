widget({
  id: 'icon-box', label: 'Icon box', category: 'Media', order: 2,
  icon: '<circle cx="12" cy="7" r="4"/><path d="M5 15h14M7 19h10"/>',
  tip: 'An icon in a circle with a title and text. Good for features and benefits.',
  content: '<div class="lp-icon-box"><div class="lp-icon-circle">⚡</div><h3>Feature title</h3><p>Describe this benefit in one short sentence.</p></div>',
  match: c => c.getClasses().includes('lp-icon-box'),
  settings: [
    { label: 'Icon (paste any emoji)', type: 'text', placeholder: '⚡ 🔒 💬 📈 ✅',
      get: r => (r.find('.lp-icon-circle')[0].getEl() || {}).textContent || '', set: (r, v) => r.find('.lp-icon-circle')[0].components(esc(v || '⚡')) },
    { label: 'Circle colour', type: 'color',
      get: r => { const el = r.find('.lp-icon-circle')[0].getEl(); return el ? getComputedStyle(el).backgroundColor : ''; },
      set: (r, v) => setCompStyle(r.find('.lp-icon-circle')[0], { 'background-color': v }) },
    { label: 'Text alignment', type: 'select', options: [['center', 'Centre'], ['left', 'Left']],
      get: r => (r.getEl() && getComputedStyle(r.getEl()).textAlign) || 'center', set: (r, v) => setCompStyle(r, { 'text-align': v }) },
  ],
});
