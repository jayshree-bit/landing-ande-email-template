widget({ page: 'email', id: 'notice', label: 'Notice bar', category: 'Email sections', order: 3, icon: 'notice',
  tip: 'A coloured band with one bold line, e.g. a deadline.',
  content: () => T(`<td align="center" style="padding:22px 24px;background-color:${META.primary || '#1969a0'};${FONT}font-size:16px;line-height:22px;font-weight:bold;color:#ffffff;">Hurry - claim your complimentary access today.</td>`) });
