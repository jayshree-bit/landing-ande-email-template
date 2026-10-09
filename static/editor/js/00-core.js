const PAGE_URL = `/c/${SLUG}/` + (IS_EMAIL ? 'email-template/email.html' : `landing-page/${PAGE === 'landing' ? 'index.html' : 'thank-you.html'}`);
const MOBILE_MAX = IS_EMAIL ? 620 : 767;
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
let editor, BLOCKS = {}, META = {}, FORM = {}, CUSTOM = {}, dirty = false, saving = false, enabled = false;
let BASE_CSS = '', TEMPLATE_ID = '', previousDesign = null;

const LIVE_LABELS = {
  header: 'Site header (logos)', banner: 'Banner', 'banner-slim': 'Banner strip', footer: 'Footer',
  form: 'Lead form', download: 'PDF download button',
  'email-header': 'Email header (logos)', 'email-banner': 'Email banner', 'email-content': 'Email text from builder',
  'email-cta': 'Email CTA button', 'email-cta-signature': 'Email CTA button', 'email-signoff': 'Sign-off', 'email-footer': 'Email footer + unsubscribe',
  'email-footer-signature': 'Publisher footer',
};
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
