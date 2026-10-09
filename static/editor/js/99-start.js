init().catch(err => {
  console.error(err);
  setState('Failed to load: ' + err.message, 'err');
  const g = document.getElementById('gjs');
  if (g) g.innerHTML = '<pre style="margin:24px;padding:16px;background:#fff;border:1px solid #fca5a5;border-radius:8px;color:#b91c1c;white-space:pre-wrap;font:13px/1.5 monospace">Editor failed to load\n\n' + String(err.message || err).replace(/</g, '&lt;') + '</pre>';
});
