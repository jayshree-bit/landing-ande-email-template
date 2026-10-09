// Sponsor: "Presented by" + the partner logo (the second logo in the campaign header).
widget({
  id: 'sponsor', label: 'Sponsor', category: 'Basic', order: 12,
  icon: '<path d="M3 12h5"/><rect x="11" y="7" width="10" height="10" rx="2"/>',
  tip: '"Presented by" with the partner logo.',
  content: () => `<div class="lp-sponsor"><span class="lp-sponsor-label">Presented by</span><img src="${imgOf('header', 1) || imgOf('header') || PLACEHOLDER_IMG}" alt="Sponsor"></div>`,
  match: c => c.getClasses().includes('lp-sponsor'),
  note: 'Double-click the text to change it, or the logo to choose another picture.',
  settings: [
    { label: 'Position', type: 'select', options: [['flex-start', 'Left'], ['center', 'Centre'], ['flex-end', 'Right']],
      get: r => (r.getEl() && getComputedStyle(r.getEl()).justifyContent) || 'center', set: (r, v) => setCompStyle(r, { 'justify-content': v }) },
    { label: 'Logo height (px)', type: 'number', min: 16, max: 160,
      get: r => parseInt((r.find('img')[0].getStyle() || {}).height, 10) || '', set: (r, v) => setCompStyle(r.find('img')[0], { height: v ? v + 'px' : '' }) },
  ],
});
