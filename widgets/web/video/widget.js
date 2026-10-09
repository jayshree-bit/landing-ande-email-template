widget({
  id: 'video', label: 'Video', category: 'Basic', order: 5,
  tip: 'A YouTube video.',
  content: { type: 'video', provider: 'yt', videoId: '', style: { width: '100%', height: '360px' } },
  block: { select: true },
});
