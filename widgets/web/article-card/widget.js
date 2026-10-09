// Article card: picture, small label, linked title and author (the cards in "Article cards" are these).
const cardTitleLink = r => r.find('h3 a')[0];
widget({
  id: 'article-card', label: 'Article card', category: 'Media', order: 3, icon: 'card',
  tip: 'One article: picture, label, linked title and author.',
  content: () => cardHtml(imgOf('banner'), 'Article title goes here', 'By Author name'),
  match: c => c.getClasses().includes('lp-card'),
  note: 'Double-click the picture to replace it, or the title, label and author to edit them.',
  settings: [
    { label: 'Title link', type: 'text', list: 'navTargets', placeholder: '#form or https://…',
      get: r => (cardTitleLink(r) && cardTitleLink(r).getAttributes().href) || '', set: (r, v) => cardTitleLink(r) && cardTitleLink(r).addAttributes({ href: v.trim() || '#form' }) },
    { label: 'Open in a new tab', type: 'checkbox',
      get: r => !!cardTitleLink(r) && cardTitleLink(r).getAttributes().target === '_blank',
      set: (r, v) => { const a = cardTitleLink(r); if (!a) return; if (v) a.addAttributes({ target: '_blank', rel: 'noopener' }); else a.removeAttributes(['target', 'rel']); } },
  ],
});
