// Icon list: bullet points with a coloured tick, arrow, dot or star.
const IL_STYLES = [['lp-il-check', 'Tick ✓'], ['lp-il-arrow', 'Arrow →'], ['lp-il-dot', 'Dot •'], ['lp-il-star', 'Star ★']];
widget({
  id: 'icon-list', label: 'Icon list', category: 'Basic', order: 13,
  icon: '<circle cx="5" cy="7" r="2"/><circle cx="5" cy="17" r="2"/><path d="M10 7h10M10 17h10"/>',
  tip: 'Bullet points with coloured icons. Double-click a line to edit it.',
  content: '<ul class="lp-icon-list lp-il-check"><li>First benefit of your offer</li><li>Second benefit of your offer</li><li>Third benefit of your offer</li></ul>',
  match: c => c.getClasses().includes('lp-icon-list'),
  note: 'Double-click a line to edit it. Press Enter at the end of a line for a new point.',
  settings: [
    { label: 'Icon', type: 'select', options: IL_STYLES,
      get: r => (IL_STYLES.find(([k]) => r.getClasses().includes(k)) || IL_STYLES[0])[0],
      set: (r, v) => { IL_STYLES.forEach(([k]) => r.removeClass(k)); r.addClass(v); } },
    { label: 'Icon colour', type: 'color',
      get: r => { const x = editor.Css.getRule(`#${r.getId()} li::before`); return (x && x.getStyle().color) || META.primary || '#0b5cff'; },
      set: (r, v) => { r.addAttributes({ id: r.getId() }); editor.Css.setRule(`#${r.getId()} li::before`, { color: v }); } },
  ],
});
