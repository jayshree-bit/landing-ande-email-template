const featureImage = () => `<img src="${imgSrc('email-banner')}" width="200" alt="" style="display:block;width:100%;height:auto;border-radius:6px;">`;
const featureCopy = '<h3 style="margin:0 0 8px;font-size:18px;color:#0f172a;">Feature title</h3><p style="margin:0;">Explain the benefit in a sentence or two.</p>';

widget({ page: 'email', id: 'imgtext', label: 'Image left, text right', category: 'Email layout', order: 4,
  content: () => T(ecol(40, featureImage(), '16px 12px 16px 40px') + ecol(60, featureCopy, '16px 40px 16px 12px')) });
widget({ page: 'email', id: 'textimg', label: 'Text left, image right', category: 'Email layout', order: 5,
  content: () => T(ecol(60, featureCopy, '16px 12px 16px 40px') + ecol(40, featureImage(), '16px 40px 16px 12px')) });
widget({ page: 'email', id: 'imgtext-stacked', label: 'Image above, text below', category: 'Email layout', order: 6,
  content: () => T(`<td style="padding:16px 40px 0;">${featureImage()}</td>`) + T(td(featureCopy, 'padding:12px 40px 16px;')) });
