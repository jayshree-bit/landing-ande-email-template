widget({
  id: 'image', label: 'Image', category: 'Basic', order: 4,
  tip: 'A picture. Pick or upload one after dropping it.',
  content: { type: 'image', style: { 'max-width': '100%', height: 'auto' } },
  block: { activate: true, select: true },
});
