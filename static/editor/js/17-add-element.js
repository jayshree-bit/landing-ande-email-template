/* ---------------- "+" add element ---------------- */
function rootContainer() {
  const w = editor.getWrapper();
  return (IS_EMAIL && w.find('.email-container')[0]) || w;
}
function isContainer(c) {
  if (!c || c.get('type') === 'text' || c.get('type') === 'lp-block' || !c.get('droppable')) return false;
  const cls = c.getClasses();
  return ['lp-col', 'lp-box', 'container', 'email-container', 'content'].some(k => cls.includes(k)) ||
    (c.get('tagName') === 'td' && !c.components().length);
}

function insertBlock(block, target) {
  const content = block.get('content');
  // A whole section always goes between sections (below the one holding the selection), never inside a column.
  if (!IS_EMAIL && typeof content === 'string' && /^\s*<(section[\s>]|header class="lp-nav-bar")/i.test(content)) {
    insertSectionHtml(content, target ? topSection(target) : null);
    return;
  }
  let parent, at;
  if (!target) { parent = rootContainer(); at = parent.components().length; }
  else if (isContainer(target)) { parent = target; at = target.components().length; }
  else { parent = target.parent(); at = parent.components().indexOf(target) + 1; }
  const added = parent.append(content, { at });
  const first = Array.isArray(added) ? added[0] : added;
  if (first) {
    editor.select(first);
    editor.Canvas.scrollTo(first, { behavior: 'smooth', block: 'center' });
    if (block.get('activate') && first.get('type') === 'image') editor.runCommand('core:open-assets', { target: first });
  }
  editor.Modal.close();
}

function openAdd(target) {
  const wrap = document.createElement('div');
  wrap.className = 'lp-modal';
  const where = !target ? 'at the end of the page' : isContainer(target) ? `inside the selected ${target.getName()}` : `after the selected ${target.getName()}`;
  wrap.innerHTML = `<p class="add-where">The new element will be added <b>${esc(where)}</b>.</p>`;
  const cats = {};
  editor.BlockManager.getAll().forEach(b => {
    const cat = b.get('category');
    const name = typeof cat === 'string' ? cat : (cat && cat.get ? cat.get('label') : 'Other');
    (cats[name] = cats[name] || []).push(b);
  });
  Object.entries(cats).forEach(([cat, blocks]) => {
    wrap.insertAdjacentHTML('beforeend', `<h4>${esc(cat)}</h4>`);
    const grid = document.createElement('div');
    grid.className = 'add-grid';
    blocks.forEach(b => {
      const t = document.createElement('button');
      t.className = 'add-tile' + (b.getId().startsWith('live-') ? ' live' : '');
      t.innerHTML = `${b.get('media') || ''}<span>${esc(b.get('label'))}</span>`;
      t.onclick = () => insertBlock(b, target);
      grid.appendChild(t);
    });
    wrap.appendChild(grid);
  });
  editor.Modal.open({ title: 'Add element', content: wrap });
}
