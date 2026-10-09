// Accordion / FAQ: questions that open and close (built on <details>, so no script is needed).
const accItem = (q, a) => `<details class="lp-acc-item"><summary>${q}</summary><div class="lp-acc-body"><p>${a}</p></div></details>`;
widget({
  id: 'accordion', label: 'Accordion / FAQ', category: 'Engagement', order: 3, icon: 'list',
  tip: 'Questions that open to show the answer. Great for FAQs.',
  content: `<div class="lp-accordion">${accItem('Who is this for?', 'Write a short, helpful answer here.').replace('<details', '<details open')}${accItem('Is it really free?', 'Write a short, helpful answer here.')}${accItem('How long does it take to read?', 'Write a short, helpful answer here.')}</div>`,
  match: c => c.getClasses().includes('lp-accordion'),
  note: 'Click a question to open it, double-click to edit. To remove one, select it and press the bin.',
  settings: [
    { label: '+ Add a question', type: 'button', run: r => r.append(accItem('New question?', 'Write the answer here.')) },
    { label: 'Open the first question when the page loads', type: 'checkbox',
      get: r => { const f = r.components().at(0); return !!f && f.getAttributes().open != null; },
      set: (r, v) => { const f = r.components().at(0); if (f) v ? f.addAttributes({ open: '' }) : f.removeAttributes('open'); } },
  ],
});
