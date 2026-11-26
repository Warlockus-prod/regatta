import { renderToStaticMarkup } from 'react-dom/server';
import * as React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Contract (M4-2): a race debrief link /rules?rule=<id>&fromRace=... opens
// that card (and only that one), brings it into view and offers "Back to the
// race" inside it, leading to the same race; an unknown id leaves the page as
// it was (the first card open, no in-card return).

// The page reads the link in a mount effect (the server render stays the
// default). This render runs each effect once, inside the render, so its
// state updates re-render the page as a mounted client would show it.
const effects = vi.hoisted(() => ({ seen: new Set<string>() }));
vi.mock('react', async original => {
  const actual = await original<typeof import('react')>();
  return {
    ...actual,
    useEffect: (effect: () => void) => {
      const key = effect.toString();
      if (effects.seen.has(key)) return;
      effects.seen.add(key);
      effect();
    },
    // Client render: RaceReturn reads the live query, not the server default.
    useSyncExternalStore: (_subscribe: unknown, get: () => unknown) => get(),
  };
});
vi.mock('next/link', () => ({
  default: ({ href, prefetch: _p, children, ...rest }: { href: string; prefetch?: boolean; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a>,
}));
vi.mock('@/lib/i18n', () => ({ useI18n: () => ({ lang: 'en', tl: (text: Record<string, string>) => text.en, tp: (_ru: string, en: string) => en }) }));
vi.mock('@/components/ContentFooterNavLoader', () => ({ default: () => null }));
vi.mock('./CoursesSection', () => ({ default: () => null }));
import RulesPage from './page';
import { ruleFromSearch } from './rule-from-search';
import { RACE_JUDGE_PRACTICE } from '@/data/race-practice';
import { ruleScenarios } from '@/data/rules';

let scrolled: string[];
function renderAt(search: string) {
  effects.seen.clear();
  scrolled = [];
  vi.stubGlobal('window', { location: { search } });
  vi.stubGlobal('requestAnimationFrame', (cb: () => void) => { cb(); return 0; });
  vi.stubGlobal('document', { getElementById: (id: string) => ({ scrollIntoView: () => scrolled.push(id) }) });
  return renderToStaticMarkup(<RulesPage />);
}
/** The markup of one card, from its element id to the next card. */
function card(html: string, id: string): string {
  const start = html.indexOf(`id="rule-${id}"`);
  expect(start, id).toBeGreaterThan(-1);
  const next = html.indexOf('id="rule-', start + 1);
  return html.slice(start, next < 0 ? undefined : next);
}
const OPEN_STYLE = /border-color:rgba\((255, 170, 0|0, 212, 255), 0\.3\)/;
/** Whether a card is open: its own element carries the open border. */
const isOpen = (cardHtml: string) => OPEN_STYLE.test(cardHtml.slice(0, cardHtml.indexOf('>')));
const openCards = (html: string) => ruleScenarios.filter(r => isOpen(card(html, r.id))).map(r => r.id);
const returnHrefs = (html: string) => [...html.matchAll(/<a href="([^"]*)"[^>]*data-testid="race-return"/g)].map(m => m[1].replace(/&amp;/g, '&'));

beforeEach(() => vi.stubGlobal('React', React));
afterEach(() => vi.unstubAllGlobals());

describe('rule card deep link', () => {
  it('accepts every rule card the race links and nothing else', () => {
    for (const target of Object.values(RACE_JUDGE_PRACTICE).filter(t => t.kind === 'rule')) {
      expect(ruleFromSearch(`?rule=${target.id}&fromRace=medium.light`)).toBe(target.id);
    }
    for (const search of ['', '?rule=', '?rule=no-such-card', '?rule=%3Cscript%3E']) expect(ruleFromSearch(search)).toBeNull();
  });

  it('opens the linked card, scrolls to it and offers the way back to the same race inside it', () => {
    const html = renderAt('?rule=start-line&fromRace=medium.light');
    expect(scrolled).toEqual(['rule-start-line']);
    expect(openCards(html)).toEqual(['start-line']);
    // One return at the top of the page and one inside the linked card.
    expect(returnHrefs(html)).toEqual(['/game?difficulty=medium&wind=light', '/game?difficulty=medium&wind=light']);
    expect(returnHrefs(card(html, 'start-line'))).toEqual(['/game?difficulty=medium&wind=light']);
  });

  it('an unknown card or no race link leaves the page as it was', () => {
    const forged = renderAt('?rule=no-such-card&fromRace=medium.light');
    expect(scrolled).toEqual([]);
    expect(openCards(forged)).toEqual([ruleScenarios[0].id]);
    expect(returnHrefs(forged)).toEqual(['/game?difficulty=medium&wind=light']);
    const plain = renderAt('?rule=start-line');
    expect(openCards(plain)).toEqual(['start-line']);
    expect(returnHrefs(plain)).toEqual([]);
  });
});
