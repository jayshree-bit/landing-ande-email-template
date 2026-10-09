widget({
  id: 'col37', label: '30 / 70', category: 'Layout', order: 6,
  tip: 'A narrow column on the left, a wide one on the right.',
  content: () => row(col(30) + col(70)),
});
