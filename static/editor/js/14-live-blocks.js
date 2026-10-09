/* ---------------- Live campaign blocks, visibility, sticky form ---------------- */
function lpPlugin(ed) {
  pageWidgets().forEach(w => w.types && w.types(ed)); // component types a widget defines for itself
  ed.DomComponents.addType('lp-block', {
    isComponent: el => el.nodeType === 1 && el.hasAttribute && el.hasAttribute('data-lp-block'),
    model: {
      defaults: { droppable: false, editable: false, traits: [], name: 'Live block' },
      init() {
        const key = this.getAttributes()['data-lp-block'];
        this.set('name', '⚡ ' + (LIVE_LABELS[key] || key));
        this.components().reset(); // previews are drawn by the view, never stored
      },
    },
    view: {
      onRender() {
        const key = this.model.getAttributes()['data-lp-block'];
        let html = BLOCKS[key];
        const attrs = this.model.getAttributes();
        if (html && IS_EMAIL && CTA_KEYS.includes(key) && ['data-cta-text', 'data-cta-url', 'data-cta-font'].some(k => attrs[k] != null)) {
          const c = ctaSettings(this.model);
          html = applyCtaToHtml(html, c.text, c.url, c.font);
        }
        if (isEmptyBlock(html)) html = '';
        this.el.innerHTML = html
          ? `<div style="pointer-events:none">${html}</div>`
          : `<div style="pointer-events:none;padding:16px;border:2px dashed #f5b942;background:#fffbeb;color:#92400e;text-align:center;font:13px sans-serif;border-radius:6px">${LIVE_LABELS[key] || key} is empty. <b>Double-click here</b> to add it.</div>`;
        this.el.ondblclick = e => { e.stopPropagation(); editLiveBlock(key); };
      },
    },
  });

  // Drop rules (like Elementor): sections only go between other sections, and a column grid only takes columns,
  // so a dropped section can never land inside "Content + form" and push the form onto a new row.
  if (!IS_EMAIL) {
    ed.DomComponents.addType('lp-section', {
      isComponent: el => el.nodeType === 1 && isSectionEl(el),
      model: { defaults: { draggable: sectionDraggable } },
    });
    ed.DomComponents.addType('lp-grid', {
      isComponent: el => el.nodeType === 1 && el.classList && GRID_CLASSES.some(k => el.classList.contains(k)),
      model: { defaults: { droppable: gridDroppable } },
    });
  }

  // Checkbox trait that toggles a CSS class (used for hide-on-device and the sticky form switch).
  // Shape dividers: drawn inside a section, never selected on their own (managed from the Style tab).
  ed.DomComponents.addType('lp-shape', {
    isComponent: el => el.nodeType === 1 && el.classList && el.classList.contains('lp-shape'),
    model: { defaults: { selectable: false, hoverable: false, highlightable: false, layerable: false, draggable: false,
      droppable: false, copyable: false, badgable: false, propagate: ['selectable', 'hoverable', 'highlightable', 'layerable', 'draggable', 'droppable', 'badgable'] } },
  });

  ed.TraitManager.addType('lp-class-toggle', {
    createInput() {
      const el = document.createElement('input');
      el.type = 'checkbox';
      el.style.width = 'auto';
      return el;
    },
    onEvent({ elInput, component, trait }) {
      const cls = trait.get('cls');
      elInput.checked ? component.addClass(cls) : component.removeClass(cls);
    },
    onUpdate({ elInput, component, trait }) {
      elInput.checked = component.getClasses().includes(trait.get('cls'));
    },
  });
}

const VISIBILITY = IS_EMAIL
  ? [['lp-hide-desktop', 'Hide on desktop'], ['lp-hide-mobile', 'Hide on mobile']]
  : [['lp-hide-desktop', 'Hide on desktop'], ['lp-hide-tablet', 'Hide on tablet'], ['lp-hide-mobile', 'Hide on mobile']];
