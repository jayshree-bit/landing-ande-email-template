(function () {
  var cfg = window.LP_CONFIG || {};
  var form = document.getElementById('lead-form');
  if (!form) return;
  var btn = form.querySelector('button[type="submit"]');
  var errorBox = form.querySelector('.form-error');

  // Copy UTM parameters from the page URL into the hidden fields.
  var params = new URLSearchParams(location.search);
  ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'].forEach(function (k) {
    var el = form.elements[k];
    if (el && params.get(k)) el.value = params.get(k);
  });

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  var PHONE_RE = /^[+()\d\s.-]{7,20}$/;

  function setError(input, msg) {
    var field = input.closest('.field');
    if (!field) return;
    field.classList.toggle('invalid', !!msg);
    var small = field.querySelector('.error-msg');
    if (small) small.textContent = msg || '';
  }

  function validate(input) {
    var v = (input.value || '').trim();
    if (input.type === 'checkbox') {
      setError(input, input.required && !input.checked ? 'This field is required.' : '');
      return !(input.required && !input.checked);
    }
    if (input.type === 'radio') {
      var picked = form.querySelector('input[name="' + input.name + '"]:checked');
      setError(input, input.required && !picked ? 'Please choose an option.' : '');
      return !(input.required && !picked);
    }
    var msg = '';
    if (input.required && !v) msg = 'This field is required.';
    else if (v && input.type === 'email' && !EMAIL_RE.test(v)) msg = 'Please enter a valid email address.';
    else if (v && input.type === 'tel' && !PHONE_RE.test(v)) msg = 'Please enter a valid phone number.';
    setError(input, msg);
    return !msg;
  }

  var inputs = form.querySelectorAll('.field input, .field select, .field textarea, .consent input[type="checkbox"]');
  inputs.forEach(function (el) {
    el.addEventListener('blur', function () { validate(el); });
    el.addEventListener('change', function () { validate(el); });
  });

  function goToThankYou(data) {
    var params = new URLSearchParams(location.search);
    params.set('submitted', '1');
    if (data) {
      Object.keys(data).forEach(function (key) {
        params.set(String(key), String(data[key]));
      });
    }
    location.href = (cfg.thankYouUrl || 'thank-you.html') + '?' + params.toString();
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    errorBox.hidden = true;
    var ok = true, first = null;
    inputs.forEach(function (el) {
      if (!validate(el)) { ok = false; first = first || el; }
    });
    if (!ok) { first.focus(); return; }
    if (form.elements.website_hp && form.elements.website_hp.value) return; // bot

    var data = {};
    new FormData(form).forEach(function (value, key) {
      if (key === 'website_hp') return;
      data[key] = data[key] ? data[key] + ', ' + value : value;
    });
    form.querySelectorAll('[data-field-id]').forEach(function (el) {
      var fieldId = el.getAttribute('data-field-id');
      if (el.type === 'radio') {
        if (el.checked) data[fieldId] = el.value;
        else if (!Object.prototype.hasOwnProperty.call(data, fieldId)) data[fieldId] = '';
      } else if (el.type === 'checkbox') {
        data[fieldId] = el.checked ? el.value : '';
      } else {
        data[fieldId] = el.value;
      }
    });
    data.page_url = location.href.split('?')[0];

    if (!cfg.formAction) { goToThankYou(data); return; }

    btn.disabled = true;
    btn.textContent = 'Submitting...';
    fetch(cfg.formAction, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
      .then(function (r) { return r.json().catch(function () { return { ok: r.ok }; }); })
      .then(function (res) {
        if (res && res.ok) return goToThankYou(data);
        throw new Error((res && res.error) || 'Submission failed.');
      })
      .catch(function (err) {
        errorBox.textContent = err.message && err.message !== 'Failed to fetch'
          ? err.message : 'Something went wrong. Please try again.';
        errorBox.hidden = false;
        btn.disabled = false;
        btn.textContent = cfg.submitText || 'Submit';
      });
  });
})();