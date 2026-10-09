// Counter: a big number that counts up when it scrolls into view (runtime.js).
const fmtCount = (n, pre, suf) => `${pre || ''}${Number(n || 0).toLocaleString('en-US')}${suf || ''}`;
const counterNum = r => r.find('.lp-counter-num')[0];
const setCounter = (r, key, v) => {
  const num = counterNum(r);
  num.addAttributes({ [key]: v });
  const a = num.getAttributes();
  num.components(esc(fmtCount(a['data-lp-counter'], a['data-prefix'], a['data-suffix'])));
};
widget({
  id: 'counter', label: 'Counter', category: 'Engagement', order: 2,
  icon: '<path d="M4 18V8l-2 2M9 8h4v4H9v6h4M16 8h4l-2 5a3 3 0 11-2 3"/>',
  tip: 'A big number that counts up when visitors scroll to it, e.g. "10,000+ readers".',
  content: '<div class="lp-counter"><p class="lp-counter-num" data-lp-counter="10000" data-prefix="" data-suffix="+">10,000+</p><p class="lp-counter-label">Readers</p></div>',
  match: c => c.getClasses().includes('lp-counter'),
  note: 'Set the number here. Double-click the label under it to change that text.',
  settings: [
    { label: 'Number', type: 'number', min: 0, get: r => counterNum(r).getAttributes()['data-lp-counter'] || 0, set: (r, v) => setCounter(r, 'data-lp-counter', v || 0) },
    { label: 'Before the number', type: 'text', placeholder: 'e.g. $', get: r => counterNum(r).getAttributes()['data-prefix'] || '', set: (r, v) => setCounter(r, 'data-prefix', v) },
    { label: 'After the number', type: 'text', placeholder: 'e.g. + or %', get: r => counterNum(r).getAttributes()['data-suffix'] || '', set: (r, v) => setCounter(r, 'data-suffix', v) },
  ],
});
