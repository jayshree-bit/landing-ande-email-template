/* ---------------- Help ---------------- */
function openHelp() {
  const wrap = document.createElement('div');
  wrap.className = 'lp-modal';
  wrap.innerHTML = `
    <ol class="help-steps">
      <li><b>Add things</b>: drag a widget from <b>Widgets</b> onto the page, or click <b>+ Add</b> / the <b>+</b> on any selected element.</li>
      <li><b>Select</b>: click anything on the page. The path at the top of the left panel (e.g. Section › Column › Heading) lets you jump to its parent.</li>
      <li><b>Edit text</b>: double-click it and type.</li>
      <li><b>Style</b>: the <b>Style</b> tab sets spacing, fonts, colours, background, borders, and where it shows (desktop / tablet / mobile).</li>
      <li><b>Mobile</b>: switch to the phone view at the top; styles you set there apply to phones only.</li>
      <li><b>Link, animation, hover</b>: the <b>Advanced</b> tab makes any element clickable and adds entrance animations and hover effects.</li>
      <li><b>Menu</b>: drag <b>Nav menu</b> (Basic) or <b>Header + menu</b> (Ready-made sections) onto the page, click it, and edit the links in the <b>Layout</b> tab. Use <b>#form</b> to jump to the form.</li>
      <li><b>Move</b>: drag the ✥ handle in the element's toolbar, or reorder in <b>Layers</b>.</li>
      <li><b>Publish</b>: click <b>Save &amp; Publish</b>. Dashed "live" widgets (logos, banner, form, footer) always use the campaign builder's details.</li>
    </ol>
    <h4>Keyboard shortcuts</h4>
    <div class="keys">
      <span><kbd>Ctrl</kbd> + <kbd>S</kbd></span><span>Save &amp; Publish</span>
      <span><kbd>Ctrl</kbd> + <kbd>Z</kbd></span><span>Undo</span>
      <span><kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>Z</kbd></span><span>Redo</span>
      <span><kbd>Ctrl</kbd> + <kbd>C</kbd> / <kbd>V</kbd></span><span>Copy / paste the selected element</span>
      <span><kbd>Delete</kbd></span><span>Delete the selected element</span>
    </div>
    <div class="modal-actions"><button type="button" class="primary" id="helpOk">Got it</button></div>`;
  wrap.querySelector('#helpOk').onclick = () => editor.Modal.close();
  editor.Modal.open({ title: 'How to use the editor', content: wrap });
  try { localStorage.setItem('lp-editor-help-seen', '1'); } catch (e) {}
}

// A live block with nothing visible (e.g. a header before any logo is uploaded) shows the "double-click to add" hint.
function isEmptyBlock(html) {
  if (!html) return true;
  const tmp = document.createElement('div');
  tmp.innerHTML = html.replace(/<script[\s\S]*?<\/script>/gi, '');
  return !tmp.textContent.trim() && !tmp.querySelector('img, svg, input, select, textarea, button, a[href]');
}
