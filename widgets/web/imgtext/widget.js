widget({
  id: 'imgtext', label: 'Image + text', category: 'Sections', order: 2,
  tip: 'A picture next to a title, text and button.',
  content: () => row(col(45, `<img src="${imgSrc('banner')}" style="width:100%;border-radius:10px;">`) +
    col(55, '<h2>Feature title</h2><p>Explain the feature or benefit in a sentence or two.</p><a class="lp-btn" href="#form">Learn more</a>')),
});
