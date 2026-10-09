widget({ page: 'email', id: 'social', label: 'Social links', category: 'Email sections', order: 4, icon: 'link',
  tip: 'A centred row of text links to your social pages. Select a link to change its address.',
  content: () => T(td(['LinkedIn', 'X', 'Facebook'].map(n => `<a href="https://www.${n === 'X' ? 'x' : n.toLowerCase()}.com/" target="_blank" style="color:${META.primary || '#0b5cff'};text-decoration:none;font-weight:bold;">${n}</a>`).join(' &nbsp;·&nbsp; '), 'padding:16px 40px;text-align:center;')) });
