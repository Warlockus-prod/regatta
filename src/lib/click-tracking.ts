/**
 * Where people click: turns a click into an anonymous `ui.click` description.
 *
 * Only controls count: links, buttons, tabs, menu items and anything marked
 * with `data-track`. The target is never what the user typed:
 * - an internal link reports its route (`/radio/symulator`), no query string;
 * - a link to another site reports the host name only (`apps.apple.com`);
 *   mailto: and tel: links report just `mailto` / `tel`, never the address;
 * - a button or tab reports `data-track`, else `aria-label`, else `title`,
 *   else its visible text, squeezed to one line and cut to 48 characters.
 * Controls inside form fields, editable areas or `[data-analytics-ignore]`
 * are skipped, and the server checks the target again (isClickTarget).
 */

import { CLICK_TARGET_MAX, isClickTarget, type ClickKind } from './analytics-events';

export interface ClickDescription {
  kind: ClickKind;
  target: string;
}

const CONTROL_SELECTOR = [
  'a[href]',
  'button',
  'summary',
  '[role="button"]',
  '[role="tab"]',
  '[role="menuitem"]',
  '[role="link"]',
  '[role="switch"]',
  '[role="option"]',
  '[data-track]',
].join(',');

const SKIP_SELECTOR = 'input, textarea, select, [contenteditable=""], [contenteditable="true"], [data-analytics-ignore]';

const LABEL_MAX = 48;

/** One-line, bounded label with digit runs (ids, numbers) masked. */
export function normalizeLabel(raw: string | null | undefined): string {
  if (!raw) return '';
  let s = raw.replace(/\s+/g, ' ').trim();
  // Masks long digit runs so a phone or order number never forms a target.
  s = s.replace(/\d{4,}/g, '#');
  s = s.replace(/[<>"`@\\]/g, '');
  if (s.length > LABEL_MAX) s = s.slice(0, LABEL_MAX).trimEnd();
  return s;
}

/** Route of an internal link without query or hash, bounded. */
function routeOf(url: URL): string {
  const path = url.pathname.replace(/\/{2,}/g, '/');
  const trimmed = path.length > 1 ? path.replace(/\/$/, '') : path;
  return trimmed.slice(0, CLICK_TARGET_MAX);
}

function kindOf(el: Element): ClickKind {
  const role = el.getAttribute('role');
  if (role === 'tab') return 'tab';
  if (role === 'menuitem' || role === 'option') return 'menu';
  return 'button';
}

/**
 * Describe the control a click landed on, or null when it is not a control,
 * sits in a form field or opted out. `origin` is the page's own origin, so
 * links to it count as internal.
 */
export function describeClickTarget(start: Element | null, origin: string): ClickDescription | null {
  if (!start || typeof start.closest !== 'function') return null;
  if (start.closest(SKIP_SELECTOR)) return null;
  const el = start.closest(CONTROL_SELECTOR);
  if (!el) return null;

  const explicit = normalizeLabel(el.getAttribute('data-track'));

  if (el.tagName === 'A' && el.hasAttribute('href')) {
    const href = el.getAttribute('href') ?? '';
    if (/^mailto:/i.test(href)) return { kind: 'external', target: 'mailto' };
    if (/^tel:/i.test(href)) return { kind: 'external', target: 'tel' };
    let url: URL;
    try {
      url = new URL(href, origin);
    } catch {
      return null;
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    if (url.origin === origin) {
      const target = explicit || routeOf(url);
      return isClickTarget(target) ? { kind: 'link', target } : null;
    }
    const host = url.hostname.replace(/^www\./, '').slice(0, CLICK_TARGET_MAX);
    return isClickTarget(host) ? { kind: 'external', target: host } : null;
  }

  const label = explicit
    || normalizeLabel(el.getAttribute('aria-label'))
    || normalizeLabel(el.getAttribute('title'))
    || normalizeLabel(el.textContent);
  if (!label || !isClickTarget(label)) return null;
  return { kind: kindOf(el), target: label };
}
