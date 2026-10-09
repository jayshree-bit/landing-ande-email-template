widget({
  id: 'hero', label: 'Hero banner', category: 'Sections', order: 1,
  tip: 'A big banner with a headline, a line of text and a button.',
  content: () => `<section class="lp-hero" style="padding:110px 0;background-image:linear-gradient(90deg,rgba(0,0,0,.6),rgba(0,0,0,.1)),url('${imgSrc('banner')}');background-color:#0f172a;">` +
    `<div class="container"><p class="eyebrow" style="color:#fff;">Solution Brief</p><h1 style="color:#fff;max-width:640px;margin:0 0 14px;">Your big headline here</h1>` +
    `<p style="color:#e2e8f0;max-width:560px;font-size:18px;">A supporting line that explains the value.</p><a class="lp-btn" href="#form">Get it now</a></div></section>`,
});
