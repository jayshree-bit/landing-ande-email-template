/* ---------------- Live blocks: edit their content without leaving the editor ---------------- */
const LIVE_EDIT = {
  header: ['brand', 'This block shows the <b>company and partner logos</b>.', 'Change logos & colours'],
  'email-header': ['brand', 'This block shows the <b>company and partner logos</b>.', 'Change logos'],
  banner: ['brand', 'This block shows the <b>campaign banner image</b>.', 'Change the banner'],
  'banner-slim': ['brand', 'This block shows the <b>campaign banner image</b>.', 'Change the banner'],
  'email-banner': ['brand', 'This block shows the <b>campaign banner image</b>.', 'Change the banner'],
  download: ['brand', 'This block is the <b>PDF download button</b>.', 'Change the PDF / button text'],
  footer: ['company', 'This block shows your <b>company details</b>.', 'Edit footer details'],
  'email-footer': ['company', 'This block shows your <b>company details and the unsubscribe link</b>.', 'Edit footer & unsubscribe'],
  'email-content': ['email', 'This block shows the <b>email text</b>.', 'Edit email text'],
  'email-cta': ['email', 'This block is the <b>email button</b>.', 'Edit button text & link'],
  'email-signoff': ['email', 'This block shows the <b>sign-off</b>.', 'Edit sign-off'],
  form: ['form', 'This is the <b>lead form</b>. Leads go to this portal and the PDF downloads after submitting.', 'Edit form fields & texts'],
};
function editLiveBlock(key) {
  const conf = LIVE_EDIT[key];
  if (!conf) return;
  if (conf[0] === 'form') openFormEditor();
  else openSettings(conf[0]);
}
function renderLiveCard() {
  const sel = editor && editor.getSelected();
  const key = sel && sel.getAttributes()['data-lp-block'];
  const conf = key && LIVE_EDIT[key];
  $('#liveCard').style.display = conf ? 'block' : 'none';
  if (!conf) return;
  $('#liveText').innerHTML = conf[1] + ' It updates everywhere when you change it.';
  $('#liveEdit').textContent = conf[2];
  $('#liveEdit').onclick = () => editLiveBlock(key);
}
