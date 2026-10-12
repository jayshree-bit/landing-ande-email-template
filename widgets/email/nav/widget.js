// Email menu: a row of links. On phones, mail apps that support it (Apple Mail, iOS Mail) show a ☰ button that opens the
// links; apps that remove form controls (Gmail, Outlook) simply list the links one under another. No script is needed.
const emNavLink = (text, url) => `<a href="${esc(url)}" target="_blank" style="display:inline-block;padding:6px 12px;${FONT}font-size:14px;line-height:20px;font-weight:bold;color:#0f172a;text-decoration:none;text-transform:uppercase;">${esc(text)}</a>`;
const emNavToggle = () => {
  const id = 'emnav-' + Math.random().toString(36).slice(2, 8);
  return `<input type="checkbox" id="${id}" class="em-nav-cb" style="display:none;mso-hide:all;">` +
    `<label for="${id}" class="em-nav-burger" style="display:none;mso-hide:all;${FONT}font-size:26px;line-height:30px;color:#0f172a;text-align:right;cursor:pointer;">&#9776;</label>`;
};
const emNavLinks = r => r.find('.em-nav-links')[0];
const emNavCell = r => emNavLinks(r).parent();
widget({
  page: 'email', id: 'nav', label: 'Menu', category: 'Email content', order: 7, icon: 'nav',
  tip: 'A row of menu links. On phones it becomes a ☰ button where the mail app allows it.',
  content: () => T(`<td align="center" class="em-nav" style="padding:10px 20px;${FONT}">${emNavToggle()}<div class="em-nav-links" style="text-align:center;">` +
    [['Leaders', 'https://'], ['Policy & Regulation', 'https://'], ['Community Banking', 'https://'], ['Credit Unions', 'https://']].map(([t, u]) => emNavLink(t, u)).join('') +
    '</div></td>'),
  // The menu cell, or the table right around it (what gets selected after dropping the widget).
  match: c => c.getClasses().includes('em-nav') ||
    ((c.get('tagName') || '').toLowerCase() === 'table' && c.find('.em-nav').some(td => [td.parent(), td.parent() && td.parent().parent()].some(x => x && x.parent() === c))),
  // In the editor the click on ☰ is stopped before it reaches the checkbox, so toggle it here (capture phase).
  onLoad(ed) {
    ed.Canvas.getDocument().addEventListener('click', ev => {
      const label = ev.target.closest && ev.target.closest('.em-nav-burger');
      const cb = label && label.parentNode.querySelector('.em-nav-cb');
      if (cb) cb.checked = !cb.checked;
    }, true);
  },
  note: 'Select a link to change its text and address. On phones: Apple Mail and iOS Mail show ☰; Gmail and Outlook list the links one under another.',
  settings: [
    { label: '+ Add a link', type: 'button', run: r => emNavLinks(r).append(emNavLink('New link', 'https://')) },
    { label: 'On phones', type: 'select', options: [['burger', 'Menu button ☰ (where supported)'], ['stack', 'Links one under another']],
      get: r => (r.find('.em-nav-cb').length ? 'burger' : 'stack'),
      set: (r, v) => {
        r.find('.em-nav-cb, .em-nav-burger').forEach(c => c.remove());
        if (v === 'burger') emNavCell(r).append(emNavToggle(), { at: 0 });
      } },
    { label: 'Link colour', type: 'color',
      get: r => { const a = emNavLinks(r).find('a')[0]; return (a && a.getStyle().color) || '#0f172a'; },
      set: (r, v) => { emNavLinks(r).find('a').forEach(a => a.setStyle({ ...a.getStyle(), color: v })); const b = r.find('.em-nav-burger')[0]; if (b) b.setStyle({ ...b.getStyle(), color: v }); } },
    { label: 'Position', type: 'select', options: [['center', 'Centre'], ['left', 'Left'], ['right', 'Right']],
      get: r => (emNavLinks(r).getStyle()['text-align'] || 'center'),
      set: (r, v) => emNavLinks(r).setStyle({ ...emNavLinks(r).getStyle(), 'text-align': v }) },
  ],
});
