/* ---------------- Drop rules ---------------- */
const GRID_CLASSES = ['main-grid', 'lp-row'];
const COLUMN_CLASSES = ['lp-col', 'content'];
const isSectionEl = el => el.tagName === 'SECTION' || (el.classList && ['lp-section', 'lp-hero', 'lp-nav-bar'].some(k => el.classList.contains(k)));
const isGrid = c => !!c && c.getClasses && c.getClasses().some(k => GRID_CLASSES.includes(k));
const isColumnLike = c => !!c && (c.get('type') === 'lp-block' || c.getClasses().some(k => COLUMN_CLASSES.includes(k)));
function sectionDraggable(src, target) {
  for (let x = target; x; x = x.parent()) if (isSection(x) || x.get('type') === 'lp-block') return false;
  return true;
}
function gridDroppable(src) { return isColumnLike(src); }
// Saved designs load from JSON, where the types above are not re-detected: give those components the same rules.
function applyDropRules(c) {
  if (!IS_EMAIL && c.get('type') === 'default') {
    if (isSection(c)) c.set('draggable', sectionDraggable, { silent: true });
    else if (isGrid(c)) c.set('droppable', gridDroppable, { silent: true });
  }
  c.components().forEach(applyDropRules);
}
