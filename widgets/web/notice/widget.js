// Notice bar: one bold line on a coloured band, e.g. a deadline.
widget({
  id: 'notice', label: 'Notice bar', category: 'Basic', order: 15, icon: 'notice',
  tip: 'A coloured band with one bold line, e.g. "Access expires in 30 days".',
  content: '<p class="lp-notice">Hurry: your limited-time access to this collection expires in 30 days.</p>',
  match: c => c.getClasses().includes('lp-notice'),
  note: 'Double-click the text to change it.',
  settings: [
    { label: 'Background', type: 'color', get: r => r.getEl() ? getComputedStyle(r.getEl()).backgroundColor : '', set: (r, v) => setCompStyle(r, { 'background-color': v }) },
    { label: 'Text colour', type: 'color', get: r => r.getEl() ? getComputedStyle(r.getEl()).color : '#ffffff', set: (r, v) => setCompStyle(r, { color: v }) },
  ],
});
