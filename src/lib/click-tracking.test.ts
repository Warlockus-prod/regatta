// Contract: a click on a control becomes an anonymous ui.click description
// (route, host or short UI label) that the server accepts; typed text, contact
// addresses, query strings and opted-out areas never leave the browser.

import { describe, expect, it } from 'vitest';
import { describeClickTarget, normalizeLabel } from './click-tracking';
import { isClickTarget, pickEventFields } from './analytics-events';

const ORIGIN = 'https://weektoregatta.com';

/** Minimal element: enough of the DOM for closest(), getAttribute(), text. */
class FakeEl {
  parent: FakeEl | null = null;
  constructor(
    readonly tagName: string,
    readonly attrs: Record<string, string> = {},
    readonly text = '',
  ) {}
  get textContent(): string {
    return this.text;
  }
  getAttribute(name: string): string | null {
    return name in this.attrs ? this.attrs[name] : null;
  }
  hasAttribute(name: string): boolean {
    return name in this.attrs;
  }
  in(parent: FakeEl): this {
    this.parent = parent;
    return this;
  }
  private matchesOne(sel: string): boolean {
    const m = sel.trim().match(/^([a-z]*)((?:\[[^\]]+\])*)$/i);
    if (!m) throw new Error(`unsupported selector ${sel}`);
    if (m[1] && m[1].toUpperCase() !== this.tagName) return false;
    for (const a of m[2].matchAll(/\[([a-z-]+)(?:="([^"]*)")?\]/gi)) {
      if (!(a[1] in this.attrs)) return false;
      if (a[2] !== undefined && this.attrs[a[1]] !== a[2]) return false;
    }
    return true;
  }
  closest(selector: string): FakeEl | null {
    const parts = selector.split(',');
    for (let el: FakeEl | null = this; el; el = el.parent) {
      if (parts.some((p) => el!.matchesOne(p))) return el;
    }
    return null;
  }
}

const describeEl = (el: FakeEl) => describeClickTarget(el as unknown as Element, ORIGIN);

describe('describeClickTarget', () => {
  it('reports the route of an internal link, without query or hash', () => {
    const a = new FakeEl('A', { href: '/radio/symulator?tab=2#x' }, 'Тренажер рации');
    expect(describeEl(a)).toEqual({ kind: 'link', target: '/radio/symulator' });
    const icon = new FakeEl('SPAN').in(new FakeEl('A', { href: `${ORIGIN}/sternik/` }));
    expect(describeEl(icon)).toEqual({ kind: 'link', target: '/sternik' });
  });

  it('reports only the host of another site, never mail or phone addresses', () => {
    expect(describeEl(new FakeEl('A', { href: 'https://www.apps.apple.com/app/id6740?ct=web' })))
      .toEqual({ kind: 'external', target: 'apps.apple.com' });
    expect(describeEl(new FakeEl('A', { href: 'mailto:someone@example.com' }))).toEqual({ kind: 'external', target: 'mailto' });
    expect(describeEl(new FakeEl('A', { href: 'tel:+48123456789' }))).toEqual({ kind: 'external', target: 'tel' });
    expect(describeEl(new FakeEl('A', { href: 'javascript:void(0)' }))).toBeNull();
  });

  it('labels buttons and tabs by data-track, aria-label, title, then text', () => {
    expect(describeEl(new FakeEl('BUTTON', { 'data-track': 'race-start', 'aria-label': 'Start' }, 'Go')))
      .toEqual({ kind: 'button', target: 'race-start' });
    expect(describeEl(new FakeEl('BUTTON', { 'aria-label': 'Закрыть' }, '×'))).toEqual({ kind: 'button', target: 'Закрыть' });
    expect(describeEl(new FakeEl('DIV', { role: 'tab' }, '  Теория\n  ')) ).toEqual({ kind: 'tab', target: 'Теория' });
    expect(describeEl(new FakeEl('LI', { role: 'menuitem' }, 'Polski'))).toEqual({ kind: 'menu', target: 'Polski' });
  });

  it('ignores non-controls, form fields, editable areas and opted-out zones', () => {
    expect(describeEl(new FakeEl('P', {}, 'Just text'))).toBeNull();
    expect(describeEl(new FakeEl('INPUT', { type: 'text' }))).toBeNull();
    expect(describeEl(new FakeEl('SPAN').in(new FakeEl('BUTTON', {}, 'x').in(new FakeEl('DIV', { 'data-analytics-ignore': '' }))))).toBeNull();
    expect(describeEl(new FakeEl('BUTTON', {}, ''))).toBeNull();
  });

  it('masks numbers and markup, bounds the label, and the server accepts it', () => {
    expect(normalizeLabel('Call 48123456789 now')).toBe('Call # now');
    expect(normalizeLabel('a@b <i>')).toBe('ab i');
    const long = describeEl(new FakeEl('BUTTON', {}, 'Очень '.repeat(30)));
    expect(long?.target.length).toBeLessThanOrEqual(48);
    for (const el of [
      new FakeEl('BUTTON', {}, 'Order 2026-1234567'),
      new FakeEl('A', { href: '/game' }),
      new FakeEl('BUTTON', {}, 'Ćwiczenia: żeglowanie'),
    ]) {
      const hit = describeEl(el);
      expect(hit).not.toBeNull();
      expect(pickEventFields('ui.click', { ...hit })).toEqual(hit);
    }
  });
});

describe('ui.click server contract', () => {
  it('rejects targets that could carry personal data or markup', () => {
    for (const bad of ['', ' x', 'a@b.com', '<script>', 'call 123456', 'x'.repeat(65), 'a\nb', 42]) {
      expect(isClickTarget(bad)).toBe(false);
    }
    expect(pickEventFields('ui.click', { kind: 'hover', target: '/x' })).toEqual({ target: '/x' });
    expect(pickEventFields('ui.click', { kind: 'link', target: 'me@x.pl', msg: 'hi' })).toEqual({ kind: 'link' });
  });

  it('keeps app session fields bounded', () => {
    expect(pickEventFields('app.session', { durationSec: 300, screens: 7, client: 'app' }))
      .toEqual({ durationSec: 300, screens: 7, client: 'app' });
    expect(pickEventFields('app.session', { durationSec: -1, screens: 1.5 })).toEqual({});
    expect(pickEventFields('screen.view', { client: 'app', target: '/x' })).toEqual({ client: 'app' });
  });
});
