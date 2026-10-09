// Social icons: one round button per network. Leave a link empty to hide that network.
const SOCIAL = {
  linkedin: ['LinkedIn', 'M4.98 3.5C4.98 4.88 3.87 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5zM.5 8h4V24h-4V8zm7.5 0h3.8v2.2h.05c.53-1 1.84-2.2 3.8-2.2 4.05 0 4.8 2.67 4.8 6.13V24h-4v-7.1c0-1.7-.03-3.88-2.36-3.88-2.37 0-2.73 1.85-2.73 3.76V24H8V8z'],
  x: ['X (Twitter)', 'M18.24 2.25h3.31l-7.23 8.26 8.5 11.24h-6.66l-5.21-6.82-5.97 6.82H1.67l7.73-8.84L1.25 2.25h6.83l4.71 6.23zm-1.16 17.52h1.83L7.08 4.13H5.12z'],
  facebook: ['Facebook', 'M24 12.07C24 5.41 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.04V9.41c0-3.02 1.8-4.7 4.54-4.7 1.31 0 2.68.24 2.68.24v2.97h-1.5c-1.5 0-1.96.93-1.96 1.89v2.26h3.32l-.53 3.5h-2.8V24C19.62 23.1 24 18.1 24 12.07'],
  youtube: ['YouTube', 'M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8zM9.6 15.6V8.4l6.2 3.6z'],
  instagram: ['Instagram', 'M12 2.2c3.2 0 3.6 0 4.8.1 3.3.1 4.8 1.7 4.9 4.9.1 1.3.1 1.6.1 4.8s0 3.6-.1 4.8c-.1 3.2-1.7 4.8-4.9 4.9-1.3.1-1.6.1-4.8.1s-3.6 0-4.8-.1c-3.3-.1-4.8-1.7-4.9-4.9C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.8C2.4 3.9 3.9 2.4 7.2 2.3 8.4 2.2 8.8 2.2 12 2.2zM12 0C8.7 0 8.3 0 7.1.1 2.7.3.3 2.7.1 7.1 0 8.3 0 8.7 0 12s0 3.7.1 4.9c.2 4.4 2.6 6.8 7 7 1.2.1 1.6.1 4.9.1s3.7 0 4.9-.1c4.4-.2 6.8-2.6 7-7 .1-1.2.1-1.6.1-4.9s0-3.7-.1-4.9c-.2-4.4-2.6-6.8-7-7C15.7 0 15.3 0 12 0zm0 5.8a6.2 6.2 0 1 0 0 12.4 6.2 6.2 0 0 0 0-12.4zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.4-11.8a1.4 1.4 0 1 0 0 2.9 1.4 1.4 0 0 0 0-2.9z'],
};
const socialLink = (net, url) => `<a href="${esc(url)}" data-net="${net}" target="_blank" rel="noopener" aria-label="${SOCIAL[net][0]}"><svg viewBox="0 0 24 24"><path d="${SOCIAL[net][1]}"/></svg></a>`;
const socialOf = (r, net) => r.components().find(c => c.getAttributes()['data-net'] === net);
widget({
  id: 'social', label: 'Social icons', category: 'Basic', order: 14,
  icon: '<circle cx="6" cy="12" r="3"/><circle cx="18" cy="6" r="3"/><circle cx="18" cy="18" r="3"/><path d="M8.6 10.7l6.8-3.4M8.6 13.3l6.8 3.4"/>',
  tip: 'Round links to your social pages. Add the web addresses in the Layout tab.',
  content: () => `<div class="lp-social">${['linkedin', 'x', 'facebook'].map(n => socialLink(n, `https://www.${n === 'x' ? 'x' : n}.com/`)).join('')}</div>`,
  match: c => c.getClasses().includes('lp-social'),
  note: 'Paste the address of each page. Leave a box empty to hide that icon.',
  settings: [
    ...Object.keys(SOCIAL).map(net => ({
      label: SOCIAL[net][0], type: 'url', placeholder: 'https://…',
      get: r => { const a = socialOf(r, net); return a ? a.getAttributes().href : ''; },
      set: (r, v) => {
        const a = socialOf(r, net);
        if (!v.trim()) { if (a) a.remove(); return; }
        if (a) a.addAttributes({ href: v.trim() });
        else {
          const order = Object.keys(SOCIAL), at = r.components().filter(c => order.indexOf(c.getAttributes()['data-net']) < order.indexOf(net)).length;
          r.append(socialLink(net, v.trim()), { at });
        }
      },
    })),
    { label: 'Icon colour', type: 'color',
      get: r => { const x = editor.Css.getRule(`#${r.getId()} a`); return (x && x.getStyle()['background-color']) || META.primary || '#0b5cff'; },
      set: (r, v) => { r.addAttributes({ id: r.getId() }); editor.Css.setRule(`#${r.getId()} a`, { 'background-color': v }); } },
    { label: 'Position', type: 'select', options: [['flex-start', 'Left'], ['center', 'Centre'], ['flex-end', 'Right']],
      get: r => (r.getEl() && getComputedStyle(r.getEl()).justifyContent) || 'flex-start', set: (r, v) => setCompStyle(r, { 'justify-content': v }) },
  ],
});
