// Tabs: one tab title per panel. Selecting a tab (or anything in its panel) shows that panel in the editor.
const tabParts = r => ({ tabs: r.find('.lp-tab'), panels: r.find('.lp-tab-panel') });
const showTab = (r, i) => {
  const { tabs, panels } = tabParts(r);
  tabs.forEach((t, k) => k === i ? t.addClass('active') : t.removeClass('active'));
  panels.forEach((p, k) => k === i ? p.addClass('active') : p.removeClass('active'));
};
widget({
  id: 'tabs', label: 'Tabs', category: 'Engagement', order: 4,
  icon: '<path d="M3 8h6V5h6v3h6v11H3z"/>',
  tip: 'Content split into tabs. Visitors click a tab title to switch.',
  content: `<div class="lp-tabs"><div class="lp-tab-nav">${['Overview', 'Details', 'Who it is for'].map((t, i) => `<div class="lp-tab${i ? '' : ' active'}">${t}</div>`).join('')}</div>${[1, 2, 3].map((n, i) => `<div class="lp-tab-panel${i ? '' : ' active'}"><p>Content for tab ${n}. Double-click to edit.</p></div>`).join('')}</div>`,
  match: c => c.getClasses().includes('lp-tabs'),
  note: 'Click a tab title on the page to edit that tab. Double-click a title to rename it.',
  onSelect(sel, r) {
    const { tabs, panels } = tabParts(r);
    for (let c = sel; c && c !== r; c = c.parent()) {
      let i = tabs.indexOf(c);
      if (i < 0) i = panels.indexOf(c);
      if (i >= 0) { showTab(r, i); return; }
    }
  },
  settings: [
    { label: '+ Add a tab', type: 'button', run: r => {
      const { tabs } = tabParts(r);
      r.find('.lp-tab-nav')[0].append(`<div class="lp-tab">Tab ${tabs.length + 1}</div>`);
      r.append(`<div class="lp-tab-panel"><p>Content for tab ${tabs.length + 1}. Double-click to edit.</p></div>`);
      showTab(r, tabs.length);
    } },
    { label: 'Remove the open tab', type: 'button', run: r => {
      const { tabs, panels } = tabParts(r);
      if (tabs.length < 2) return;
      const i = Math.max(0, tabs.findIndex(t => t.getClasses().includes('active')));
      tabs[i].remove(); if (panels[i]) panels[i].remove();
      editor.select(r);
      showTab(r, 0);
    } },
  ],
});
