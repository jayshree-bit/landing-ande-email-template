// Logo: the campaign logo as a link. Double-click the picture to replace it.
const logoImg = r => r.find('img')[0];
widget({
  id: 'logo', label: 'Logo', category: 'Basic', order: 11,
  icon: '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M7 14l3-4 3 3 2-2 3 3"/>',
  tip: 'Your logo as a link. Double-click it to choose another picture.',
  content: () => `<a class="lp-logo" href="#top"><img src="${imgOf('header') || PLACEHOLDER_IMG}" alt="Logo"></a>`,
  match: c => c.getClasses().includes('lp-logo'),
  note: 'Double-click the logo on the page to choose another picture.',
  settings: [
    { label: 'Height (px)', type: 'number', min: 16, max: 200,
      get: r => parseInt((logoImg(r).getStyle() || {}).height, 10) || '', set: (r, v) => setCompStyle(logoImg(r), { height: v ? v + 'px' : '' }) },
    { label: 'Link', type: 'text', list: 'navTargets', placeholder: '#top or https://…',
      get: r => r.getAttributes().href || '', set: (r, v) => r.addAttributes({ href: v.trim() || '#' }) },
  ],
});
