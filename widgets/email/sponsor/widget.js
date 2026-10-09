// Your logo on the left and the partner logo on the right.
widget({ page: 'email', id: 'sponsor', label: 'Logo + sponsor', category: 'Email sections', order: 2, icon: 'header',
  tip: 'Your logo on the left and the partner logo on the right.',
  content: () => T(`<td width="60%" valign="middle" style="width:60%;padding:16px 8px 16px 20px;"><img src="${imgOf('email-header') || imgSrc('email-banner')}" width="220" alt="Logo" style="display:block;width:100%;max-width:220px;height:auto;border:0;"></td>` +
    `<td width="40%" valign="middle" align="right" style="width:40%;padding:16px 20px 16px 8px;${FONT}font-size:11px;color:#777777;">Presented by<br><img src="${imgOf('email-header', 1) || imgOf('email-header')}" width="130" alt="Sponsor" style="display:inline-block;width:100%;max-width:130px;height:auto;border:0;margin-top:4px;"></td>`) });
