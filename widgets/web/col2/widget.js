widget({
  id: 'col2', label: '2 Columns', category: 'Layout', order: 3,
  tip: 'A section with two equal columns.',
  content: () => row(col() + col()),
});
