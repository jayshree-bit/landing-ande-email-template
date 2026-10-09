// Unlock form: a heading plus the campaign form in a compact style (like "Enter your email to unlock").
const unlockForm = r => r.find('[data-lp-block="form"]')[0];
widget({
  id: 'unlock-form', label: 'Unlock form', category: 'Engagement', order: 6, icon: 'form',
  tip: 'A heading with the sign-up form in a compact style, e.g. "Enter your email to unlock". Use one form per page.',
  content: '<div class="lp-unlock"><h3 class="lp-unlock-title">Enter your email address to unlock this Signature Collection</h3><div data-lp-block="form" class="lp-form-compact"></div></div>',
  match: c => c.getClasses().includes('lp-unlock'),
  note: 'The fields, button text and consent come from the campaign form. For an email-only form, open the form editor and keep just the email field.',
  settings: [
    { label: 'Edit the form fields and button', type: 'button', run: () => openFormEditor() },
    { label: 'Compact style (no box, no form title)', type: 'checkbox',
      get: r => !!unlockForm(r) && unlockForm(r).getClasses().includes('lp-form-compact'),
      set: (r, v) => { const f = unlockForm(r); if (f) v ? f.addClass('lp-form-compact') : f.removeClass('lp-form-compact'); } },
  ],
});
