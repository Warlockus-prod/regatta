// Package 32 (owner on build 81: "the picture is crooked"): a picture, diagram
// or scene must not run off the side of the screen. Two halves, so the rule can
// be tested without a browser: collectVisuals runs inside the page and only
// measures; offscreenFinding judges one measured box.
// Used by scripts/check-ui-sizes.mjs; test: src/lib/ui-offscreen.test.ts.

/** Smaller boxes are icons, not pictures. */
export const MIN_VISUAL_PX = 72;
const TOLERANCE_PX = 2;

/**
 * The finding text for one visual, or null when it is fine.
 * `box` is what is actually painted (already cut by every clipping ancestor);
 * `scrolls` says an ancestor scrolls sideways on purpose (a gallery strip, a
 * wide diagram in its own scroller).
 */
export function offscreenFinding(box, viewportWidth) {
  const width = box.right - box.left, height = box.bottom - box.top;
  if (width < MIN_VISUAL_PX || height < MIN_VISUAL_PX || box.scrolls) return null;
  const pastRight = box.right - viewportWidth, pastLeft = -box.left;
  if (pastRight <= TOLERANCE_PX && pastLeft <= TOLERANCE_PX) return null;
  const side = pastRight > TOLERANCE_PX ? `${Math.round(pastRight)}px past the right edge` : `${Math.round(pastLeft)}px past the left edge`;
  return `${box.kind} ${Math.round(width)}x${Math.round(height)}px, ${side} of a ${viewportWidth}px screen`;
}

/** Runs inside the page (self-contained, no imports): every picture, diagram and scene as painted. */
export function collectVisuals() {
  const out = [];
  const describe = (el) => {
    const id = el.getAttribute("data-testid");
    if (id) return `[data-testid=${id}]`;
    const cls = typeof el.className === "string" && el.className ? `.${el.className.trim().split(/\s+/)[0]}` : "";
    return `${el.tagName.toLowerCase()}${cls}`;
  };
  for (const el of document.querySelectorAll("img, canvas, video, svg")) {
    const kind = el.tagName.toLowerCase();
    if (kind === "svg" && el.closest("button, a, [role=button], label")) continue;
    const style = getComputedStyle(el);
    if (style.visibility === "hidden" || style.display === "none" || Number(style.opacity) === 0) continue;
    const r = el.getBoundingClientRect();
    const box = { left: r.left, right: r.right, top: r.top, bottom: r.bottom };
    let scrolls = false;
    for (let a = el.parentElement; a; a = a.parentElement) {
      const s = getComputedStyle(a);
      if (s.overflowX === "visible") continue;
      if ((s.overflowX === "auto" || s.overflowX === "scroll") && a.scrollWidth > a.clientWidth + 1) scrolls = true;
      // A clipping ancestor decides what is painted: a covered picture cut by its own frame is not off the screen.
      const ar = a.getBoundingClientRect();
      const l = ar.left + a.clientLeft;
      box.left = Math.max(box.left, l);
      box.right = Math.min(box.right, l + a.clientWidth);
    }
    if (box.right <= box.left) continue;
    out.push({ kind, ...box, scrolls, selector: describe(el), text: el.getAttribute("alt") || el.getAttribute("aria-label") || "" });
  }
  return out;
}
