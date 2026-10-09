widget({
  id: 'contentform', label: 'Content + form', category: 'Sections', order: 4, icon: 'form',
  tip: 'Text on the left and the sign-up form on the right.',
  content: () => section(`<div class="main-grid" style="padding:0;"><div class="content"><h2>Why download?</h2><p>Explain what the reader gets.</p></div><div data-lp-block="form"></div></div>`, '48px'),
});
