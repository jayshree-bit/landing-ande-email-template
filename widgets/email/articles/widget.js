// Two article cards side by side (stack on phones), like the Signature Collection email.
const eCard = (img, title) => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #d8d8d8;background-color:#ffffff;">` +
  `<tr><td style="padding:0;"><img src="${img}" width="270" alt="" style="display:block;width:100%;height:auto;border:0;"></td></tr>` +
  `<tr><td style="padding:10px 10px 0;${FONT}font-size:11px;line-height:14px;font-weight:bold;color:#555555;letter-spacing:1px;">SIGNATURE COLLECTION</td></tr>` +
  `<tr><td style="padding:6px 10px 4px;"><a href="${esc(META.lp_url || '#')}" target="_blank" style="${FONT}font-size:15px;line-height:21px;font-weight:bold;color:#000000;text-decoration:none;">${title}</a></td></tr>` +
  `<tr><td style="padding:0 10px 12px;${FONT}font-size:12px;line-height:17px;color:#555555;">By Author name</td></tr></table>`;
widget({ page: 'email', id: 'articles', label: 'Article cards', category: 'Email sections', order: 1, icon: 'card',
  tip: 'Two article cards side by side. They stack on phones.',
  content: () => T(ecol(50, eCard(imgSrc('email-banner'), 'First article title'), '8px 6px 8px 20px') + ecol(50, eCard(imgSrc('email-banner'), 'Second article title'), '8px 20px 8px 6px')) });
