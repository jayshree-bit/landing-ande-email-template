// Sticky AI board (bottom-right of the editor). Tab 1: whole campaign (landing + email) from one prompt.
// Tab 2: one section / edit the selected element. Backend: ai_assistant.py (Ollama).
// Loads before 99-start.js, so the GrapesJS instance is looked up lazily.
(function () {
  var m = location.pathname.match(/\/editor\/([^/]+)(?:\/([^/]+))?/);
  if (!m) return;
  var slug = decodeURIComponent(m[1]), page = m[2] || 'landing';
  var api = '/api/campaigns/' + encodeURIComponent(slug) + '/ai/';

  function getEditor() {
    if (window.editor && window.editor.addComponents) return window.editor;
    var l = window.grapesjs && window.grapesjs.editors;
    return l && l.length ? l[0] : null;
  }

  var css = document.createElement('style');
  css.textContent =
    '#ai-fab{position:fixed;right:20px;bottom:20px;z-index:99999;background:linear-gradient(135deg,#7c3aed,#2563eb);color:#fff;border:0;border-radius:999px;padding:12px 20px;font:600 14px system-ui;cursor:pointer;box-shadow:0 6px 20px rgba(0,0,0,.28)}' +
    '#ai-panel{position:fixed;right:20px;bottom:72px;width:370px;max-width:calc(100vw - 30px);max-height:calc(100vh - 100px);overflow:auto;z-index:99999;background:#fff;border:1px solid #e2e8f0;border-radius:14px;box-shadow:0 14px 44px rgba(0,0,0,.28);font:13px system-ui;color:#0f172a;display:none}' +
    '#ai-panel.open{display:block}#ai-panel header{padding:12px 14px;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;font-weight:700;position:sticky;top:0;background:#fff}' +
    '#ai-panel .tabs{display:flex;border-bottom:1px solid #e2e8f0}#ai-panel .tabs button{flex:1;border:0;background:none;padding:9px;font:600 12px system-ui;cursor:pointer;color:#64748b;border-bottom:2px solid transparent}' +
    '#ai-panel .tabs button.on{color:#2563eb;border-color:#2563eb}' +
    '#ai-panel .b{padding:12px 14px;display:flex;flex-direction:column;gap:10px}#ai-panel .pane{display:none;flex-direction:column;gap:10px}#ai-panel .pane.on{display:flex}' +
    '#ai-panel textarea{width:100%;min-height:96px;box-sizing:border-box;border:1px solid #cbd5e1;border-radius:8px;padding:8px;font:13px system-ui;resize:vertical}' +
    '#ai-panel select{width:100%;padding:6px;border:1px solid #cbd5e1;border-radius:8px}#ai-panel .row{display:flex;gap:8px}' +
    '#ai-panel .seg{display:flex;gap:6px}#ai-panel .seg label{flex:1;text-align:center;border:1px solid #cbd5e1;border-radius:8px;padding:6px 4px;cursor:pointer;font-size:12px}' +
    '#ai-panel .seg input{display:none}#ai-panel .seg label:has(input:checked){border-color:#2563eb;background:#eff6ff;font-weight:700;color:#2563eb}' +
    '#ai-panel .chips{display:flex;flex-wrap:wrap;gap:6px}#ai-panel .chips button{border:1px solid #cbd5e1;background:#f8fafc;border-radius:999px;padding:3px 10px;font-size:11px;cursor:pointer}' +
    '#ai-panel .go{background:#2563eb;color:#fff;border:0;border-radius:8px;padding:10px;font-weight:700;cursor:pointer}#ai-panel .go:disabled{opacity:.6;cursor:wait}' +
    '#ai-panel .ghost{background:none;border:1px solid #cbd5e1;border-radius:8px;padding:6px;cursor:pointer;font-size:12px}' +
    '#ai-msg{font-size:12px;min-height:16px;color:#475569;line-height:1.4}#ai-msg.err{color:#dc2626}#ai-msg a{color:#2563eb;font-weight:600}';
  document.head.appendChild(css);

  var fab = document.createElement('button'); fab.id = 'ai-fab'; fab.textContent = '✨ AI Assistant';
  var panel = document.createElement('div'); panel.id = 'ai-panel';
  var sectionChips = page === 'email'
    ? ['Hero with headline and button', 'Three key takeaways', 'Author / speaker card', 'Highlight box with a stat']
    : ['Hero with headline, subtext and CTA', 'Three benefits', 'Stats row', 'Customer testimonial', 'FAQ', 'Closing call-to-action'];
  var other = page === 'email' ? 'landing' : 'email';
  panel.innerHTML =
    '<header><span>✨ AI Assistant</span><span id="ai-x" style="cursor:pointer">✕</span></header>' +
    '<div class="tabs"><button data-t="camp" class="on">Landing + Email</button><button data-t="sec">Section</button></div><div class="b">' +
    '<div class="pane on" id="p-camp">' +
      '<textarea id="ai-prompt" placeholder="Describe the campaign, e.g. eBook on generative AI in banking for bank CIOs: use cases, risks and a 5-step roadmap. Sponsored by TCS."></textarea>' +
      '<div class="row"><select id="ai-style"><option value="modern">Modern</option><option value="corporate">Corporate</option><option value="bold">Bold dark</option><option value="minimal">Minimal</option></select></div>' +
      '<div class="seg"><label><input type="checkbox" id="ai-lp" checked><span>Landing page</span></label><label><input type="checkbox" id="ai-em" checked><span>Email</span></label></div>' +
      '<button class="go" id="ai-go-camp">Create &amp; refresh</button>' +
      '<button class="ghost" id="ai-restore" title="Put back the design this page had before the last AI run">↩ Restore previous design of this page</button>' +
    '</div>' +
    '<div class="pane" id="p-sec">' +
      '<div class="seg"><label><input type="radio" name="aim" value="section" checked><span>New section</span></label><label><input type="radio" name="aim" value="edit"><span>Change selected</span></label></div>' +
      '<textarea id="ai-sprompt" placeholder="e.g. Add a testimonials section with 3 bank CIO quotes"></textarea>' +
      '<div class="chips">' + sectionChips.map(function (c) { return '<button type="button">' + c + '</button>'; }).join('') + '</div>' +
      '<button class="go" id="ai-go-sec">Generate</button>' +
    '</div>' +
    '<select id="ai-model"><option>loading models…</option></select><div id="ai-msg"></div></div>';
  document.body.appendChild(fab); document.body.appendChild(panel);

  var $ = function (id) { return document.getElementById(id); };
  var msg = function (t, err) { $('ai-msg').innerHTML = t; $('ai-msg').className = err ? 'err' : ''; };

  fab.onclick = function () { panel.classList.toggle('open'); if (panel.classList.contains('open')) loadModels(); };
  $('ai-x').onclick = function () { panel.classList.remove('open'); };
  panel.querySelectorAll('.tabs button').forEach(function (b) {
    b.onclick = function () {
      panel.querySelectorAll('.tabs button').forEach(function (x) { x.classList.toggle('on', x === b); });
      $('p-camp').classList.toggle('on', b.dataset.t === 'camp'); $('p-sec').classList.toggle('on', b.dataset.t === 'sec');
      msg('');
    };
  });
  panel.querySelectorAll('.chips button').forEach(function (b) {
    b.onclick = function () { $('ai-sprompt').value = b.textContent; $('ai-sprompt').focus(); };
  });

  var loaded = false;
  function loadModels() {
    if (loaded) return;
    fetch('/api/ai/models').then(function (r) { return r.json(); }).then(function (d) {
      if (d.error) { msg(d.error, true); $('ai-model').innerHTML = '<option value="">default model</option>'; return; }
      loaded = true;
      $('ai-model').innerHTML = d.models.map(function (n) { return '<option' + (n === d.default ? ' selected' : '') + '>' + n + '</option>'; }).join('');
    }).catch(function () { msg('Cannot reach the server', true); });
  }
  function post(url, body) {
    return fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.error || 'Failed'); return j; }); });
  }

  // ---- Tab 1: whole campaign, then refresh
  $('ai-go-camp').onclick = function () {
    var prompt = $('ai-prompt').value.trim();
    var pages = [];
    if ($('ai-lp').checked) pages.push('landing');
    if ($('ai-em').checked) pages.push('email');
    if (!prompt) return msg('Describe the campaign first', true);
    if (!pages.length) return msg('Tick Landing page and/or Email', true);
    if (!confirm('This replaces the current ' + pages.join(' and ') + ' design with an AI one. Unsaved changes in this editor will be lost (the previous design can be restored). Continue?')) return;
    var btn = $('ai-go-camp'); btn.disabled = true;
    var model = $('ai-model').value, style = $('ai-style').value, i = 0;
    (function next() {
      if (i >= pages.length) {
        msg('Done. Refreshing…');
        return pages.indexOf(page) >= 0 ? location.reload() : (btn.disabled = false,
          msg('Created. Open the <a href="/editor/' + encodeURIComponent(slug) + '/' + pages[0] + '">' + pages[0] + ' editor</a>.'));
      }
      var p = pages[i++];
      msg('Creating the ' + p + ' (' + i + '/' + pages.length + ')… local models can take 1–3 minutes.');
      post(api + 'campaign', { prompt: prompt, page: p, model: model, style: style }).then(next)
        .catch(function (e) { msg(e.message, true); btn.disabled = false; });
    })();
  };
  $('ai-restore').onclick = function () {
    if (!confirm('Restore this page to the design it had before the last AI run?')) return;
    post(api + 'restore', { page: page }).then(function () { location.reload(); }).catch(function (e) { msg(e.message, true); });
  };

  // ---- Tab 2: one section / edit selected
  $('ai-go-sec').onclick = function () {
    var ed = getEditor();
    if (!ed) return msg('Editor is not ready yet', true);
    var prompt = $('ai-sprompt').value.trim();
    if (!prompt) return msg('Write what you want first', true);
    var mode = panel.querySelector('input[name=aim]:checked').value, sel = ed.getSelected();
    if (mode === 'edit' && !sel) return msg('Click an element on the canvas first', true);
    var btn = $('ai-go-sec'); btn.disabled = true; msg('Generating… 20–90 seconds on a local model');
    post(api + 'generate', { prompt: prompt, page: page, mode: mode, model: $('ai-model').value,
                             selected_html: mode === 'edit' ? sel.toHTML() : '' })
      .then(function (res) {
        var added;
        if (mode === 'edit') { var parent = sel.parent(), at = sel.index(); sel.remove(); added = parent.append(res.html, { at: at }); }
        else if (sel && sel.parent() && sel.parent() !== ed.getWrapper()) {
          var top = sel; while (top.parent() && top.parent() !== ed.getWrapper()) top = top.parent();
          added = ed.getWrapper().append(res.html, { at: top.index() + 1 });
        } else added = ed.addComponents(res.html);
        var first = added && (added[0] || added);
        if (first && first.getEl) { ed.select(first); var el = first.getEl(); if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
        msg('Done. Ctrl+Z to undo, then Save &amp; Publish.');
      })
      .catch(function (e) { msg(e.message, true); })
      .then(function () { btn.disabled = false; });
  };
})();