import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SternikBank } from '@/data/sternik-core';

// ============================================================================
// Contract: a screen that needs the bank shows a loading state, then either
// the screen (with the bank) or an error with a working Retry button.
// ============================================================================

const h = vi.hoisted(() => ({ bank: null as SternikBank | null }));
vi.mock('@/lib/i18n', () => ({ useI18n: () => ({ lang: 'en', tl: (v: { en: string }) => v.en }) }));
vi.mock('./bank', () => ({ peekSternikBank: () => h.bank, loadSternikBank: () => new Promise(() => {}) }));
import SternikBankGate, { SternikBankStatus } from './SternikBankGate';

afterEach(() => { h.bank = null; });

type El = React.ReactElement<{ children?: React.ReactNode; onClick?: () => void; 'data-testid'?: string }>;
function find(node: React.ReactNode, testId: string): El | null {
  if (!React.isValidElement(node)) return Array.isArray(node) ? node.map((n) => find(n, testId)).find(Boolean) ?? null : null;
  const el = node as El;
  if (el.props['data-testid'] === testId) return el;
  return find(el.props.children, testId);
}

describe('the sternik bank gate', () => {
  it('shows a loading status, not the screen, while the bank is on its way', () => {
    const html = renderToStaticMarkup(<SternikBankGate>{() => <p>SCREEN</p>}</SternikBankGate>);
    expect(html).toContain('role="status"');
    expect(html).toContain('Loading the question bank...');
    expect(html).not.toContain('SCREEN');
  });

  it('renders the screen with the bank once it is there', () => {
    h.bank = { version: 'v', questions: [], byId: {}, examPool: [], baseCounts: { all: 7, materialy: 3, internet: 4 }, examBaseCounts: { all: 0, materialy: 0, internet: 0 } };
    const html = renderToStaticMarkup(<SternikBankGate>{(bank) => <p>SCREEN {bank.baseCounts.all}</p>}</SternikBankGate>);
    expect(html).toBe('<p>SCREEN 7</p>');
  });

  it('quiet blocks stay empty while loading', () => {
    expect(renderToStaticMarkup(<SternikBankGate quiet>{() => <p>SCREEN</p>}</SternikBankGate>)).toBe('');
  });

  it('an error is announced and its Retry button calls retry', () => {
    const onRetry = vi.fn();
    const html = renderToStaticMarkup(<SternikBankStatus status="error" onRetry={onRetry} />);
    expect(html).toContain('role="alert"');
    expect(html).toContain('Could not load the questions.');
    expect(html).toContain('Try again');
    const button = find(SternikBankStatus({ status: 'error', onRetry }), 'sternik-bank-retry');
    expect(button).not.toBeNull();
    button!.props.onClick!();
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
