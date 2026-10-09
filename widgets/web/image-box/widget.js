widget({
  id: 'image-box', label: 'Image box', category: 'Media', order: 1,
  icon: '<rect x="3" y="3" width="18" height="10" rx="1"/><path d="M3 17h18M3 21h12"/>',
  tip: 'A picture with a title, text and a link underneath.',
  content: () => `<div class="lp-image-box"><img src="${imgOf('banner') || PLACEHOLDER_IMG}" alt=""><h3>Image box title</h3><p>Describe this item in a sentence or two.</p><a href="#form">Learn more →</a></div>`,
  match: c => c.getClasses().includes('lp-image-box'),
  note: 'Double-click the picture to replace it, or any text to edit it.',
  settings: [
    { label: 'Text alignment', type: 'select', options: [['left', 'Left'], ['center', 'Centre']],
      get: r => (r.getEl() && getComputedStyle(r.getEl()).textAlign) || 'left', set: (r, v) => setCompStyle(r, { 'text-align': v }) },
  ],
});
