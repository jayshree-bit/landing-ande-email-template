widget({
  id: 'gallery', label: 'Gallery', category: 'Media', order: 4,
  icon: '<rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/>',
  tip: 'A grid of pictures. Double-click a picture to replace it.',
  content: () => `<div class="lp-gallery">${Array.from({ length: 6 }, () => `<img src="${PLACEHOLDER_IMG}" alt="">`).join('')}</div>`,
  match: c => c.getClasses().includes('lp-gallery'),
  note: 'Double-click a picture to replace it. Select a picture and press the bin to remove it.',
  settings: [
    { label: 'Columns', type: 'select', options: [['2', '2'], ['3', '3'], ['4', '4']],
      get: r => r.getEl() ? String(getComputedStyle(r.getEl()).gridTemplateColumns.split(' ').length) : '3',
      set: (r, v) => setCompStyle(r, { 'grid-template-columns': `repeat(${v}, minmax(0, 1fr))` }) },
    { label: 'Space between (px)', type: 'number', min: 0, max: 60,
      get: r => r.getEl() ? parseInt(getComputedStyle(r.getEl()).columnGap, 10) : 12, set: (r, v) => setCompStyle(r, { gap: v === '' ? '' : v + 'px' }) },
    { label: '+ Add a picture', type: 'button', run: r => r.append(`<img src="${PLACEHOLDER_IMG}" alt="">`) },
  ],
});
