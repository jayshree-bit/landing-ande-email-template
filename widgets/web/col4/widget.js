widget({
  id: 'col4', label: '4 Columns', category: 'Layout', order: 5,
  tip: 'A section with four equal columns.',
  content: () => row(col() + col() + col() + col()),
});
