widget({
  id: 'col3', label: '3 Columns', category: 'Layout', order: 4,
  tip: 'A section with three equal columns.',
  content: () => row(col() + col() + col()),
});
