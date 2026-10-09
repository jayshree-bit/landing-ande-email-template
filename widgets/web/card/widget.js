widget({
  id: 'card', label: 'Feature cards', category: 'Sections', order: 3,
  tip: 'Three boxes side by side for features or benefits.',
  content: () => row([1, 2, 3].map(n => col(0, `<div class="lp-box" style="height:100%;"><h3>Feature ${n}</h3><p>Short description of this feature.</p></div>`)).join('')),
});
