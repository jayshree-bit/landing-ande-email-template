// Google map for an address. The map is not clickable inside the editor, so it can be selected.
// GrapesJS turns the Google Maps iframe into its built-in 'map' component, which rebuilds the URL from address + zoom.
const mapSrc = (address, zoom) => `https://maps.google.com/maps?q=${encodeURIComponent(address)}&z=${zoom}&output=embed`;
const mapFrame = r => r.components().at(0);
const setMap = (r, address, zoom) => {
  r.addAttributes({ 'data-address': address, 'data-zoom': zoom });
  mapFrame(r).set({ address, zoom: String(zoom) });
};
widget({
  id: 'map', label: 'Google map', category: 'Media', order: 5,
  icon: '<path d="M12 21s-6-5.5-6-11a6 6 0 0112 0c0 5.5-6 11-6 11z"/><circle cx="12" cy="10" r="2"/>',
  tip: 'A Google map of an address.',
  content: () => `<div class="lp-map" data-address="London, UK" data-zoom="14"><iframe src="${mapSrc('London, UK', 14)}" loading="lazy" title="Map" allowfullscreen></iframe></div>`,
  match: c => c.getClasses().includes('lp-map'),
  settings: [
    { label: 'Address', type: 'text', placeholder: 'Street, city, country',
      get: r => r.getAttributes()['data-address'] || '', set: (r, v) => setMap(r, v || 'London, UK', r.getAttributes()['data-zoom'] || 14) },
    { label: 'Zoom', type: 'select', options: [['10', 'City'], ['14', 'Area'], ['17', 'Street']],
      get: r => r.getAttributes()['data-zoom'] || '14', set: (r, v) => setMap(r, r.getAttributes()['data-address'] || 'London, UK', v) },
    { label: 'Height (px)', type: 'number', min: 150, max: 900,
      get: r => (mapFrame(r).getEl() && mapFrame(r).getEl().offsetHeight) || 360, set: (r, v) => setCompStyle(mapFrame(r), { height: v ? v + 'px' : '' }) },
  ],
  canvasCss: '.lp-map iframe { pointer-events: none; }',
});
