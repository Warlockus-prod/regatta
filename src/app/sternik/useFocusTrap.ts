'use client';

import { useEffect, useRef } from 'react';

// ============================================================================
// Focus trap for modal overlays (pause, confirm). While active: moves focus
// into the dialog, keeps Tab/Shift+Tab cycling inside it, and Escape triggers
// onEscape. Restores focus to the previously focused element on close.
// ============================================================================

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

export function useFocusTrap<T extends HTMLElement>(
  active: boolean,
  onEscape?: () => void,
) {
  const ref = useRef<T | null>(null);
  const restoreRef = useRef<HTMLElement | null>(null);
  // Keep the latest onEscape in a ref so inline arrow callbacks (new identity
  // every render) do not re-run the trap effect. A ticking countdown re-renders
  // the dialog once per second; without this the effect would remount and yank
  // focus back to the first control every tick.
  const onEscapeRef = useRef(onEscape);
  onEscapeRef.current = onEscape;

  useEffect(() => {
    if (!active) return;
    const node = ref.current;
    if (!node) return;

    restoreRef.current = document.activeElement as HTMLElement | null;
    const focusables = () => Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null);
    // focus the first focusable (or the container)
    const first = focusables()[0];
    (first ?? node).focus?.();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onEscapeRef.current) {
        e.preventDefault();
        onEscapeRef.current();
        return;
      }
      if (e.key !== 'Tab') return;
      const list = focusables();
      if (list.length === 0) { e.preventDefault(); return; }
      const firstEl = list[0];
      const lastEl = list[list.length - 1];
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      restoreRef.current?.focus?.();
    };
  }, [active]);

  return ref;
}
