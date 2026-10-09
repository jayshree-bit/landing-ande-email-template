widget({
  id: 'col73', label: '70 / 30', category: 'Layout', order: 7,
  tip: 'A wide column on the left, a narrow one on the right.',
  content: () => row(col(70) + col(30)),
});
