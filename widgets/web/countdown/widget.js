// Countdown to a date and time; the published page counts down live (runtime.js).
const pad2 = n => String(n).padStart(2, '0');
const localIso = d => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
const cdParts = end => {
  const s = Math.max(0, Math.floor((new Date(end).getTime() - Date.now()) / 1000)) || 0;
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
};
const cdHtml = end => {
  const p = cdParts(end);
  return `<div class="lp-countdown" data-lp-countdown="${end}">${[['d', 'Days'], ['h', 'Hours'], ['m', 'Minutes'], ['s', 'Seconds']]
    .map(([k, l]) => `<div class="lp-cd-unit"><b data-u="${k}">${pad2(p[k])}</b><span>${l}</span></div>`).join('')}</div>`;
};
widget({
  id: 'countdown', label: 'Countdown', category: 'Engagement', order: 1,
  icon: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M9 2h6"/>',
  tip: 'Days, hours, minutes and seconds left until a date. It counts down live on the published page.',
  content: () => cdHtml(localIso(new Date(Date.now() + 7 * 864e5))),
  match: c => c.getClasses().includes('lp-countdown'),
  note: 'The numbers count down live on the published page.',
  settings: [
    { label: 'Ends on', type: 'datetime-local',
      get: r => r.getAttributes()['data-lp-countdown'] || '',
      set: (r, v) => {
        if (!v) return;
        r.addAttributes({ 'data-lp-countdown': v });
        const p = cdParts(v);
        Object.keys(p).forEach(k => { const b = r.find(`[data-u="${k}"]`)[0]; if (b) b.components(pad2(p[k])); });
      } },
    { label: 'Box colour', type: 'color',
      get: r => { const x = editor.Css.getRule(`#${r.getId()} .lp-cd-unit`); return (x && x.getStyle()['background-color']) || '#0f172a'; },
      set: (r, v) => { r.addAttributes({ id: r.getId() }); editor.Css.setRule(`#${r.getId()} .lp-cd-unit`, { 'background-color': v }); } },
  ],
});
