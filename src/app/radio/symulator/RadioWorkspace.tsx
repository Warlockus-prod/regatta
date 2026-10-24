'use client';

import { useEffect, useState, type ReactNode, type Ref } from 'react';
import { useI18n } from '@/lib/i18n';
import styles from './RadioWorkspace.module.css';

// ============================================================================
// The radio work screen shared by the simulator, the controls lessons and the
// live conversation (owner, 2026-10-24: "the radio stays on screen like the 3D
// boat, the tasks slide out below"). The radio is pinned; the panel under it
// (beside it on a desktop) scrolls on its own; nothing is drawn over the radio.
// Layout rules: RadioWorkspace.module.css.
// ============================================================================

/**
 * stacked: bar, radio, then the scrolling panel. Phones and tablets; and the
 * wide realistic faceplate everywhere, since it is short and wide (beside the
 * panel it would leave the panel a narrow strip).
 * compact: the shorter faceplate. The vertical trainer faceplate uses it when
 * stacked and on desktops too short for the full one; the realistic one only
 * on phones, where its wide layout does not fit.
 * While `active`, the page behind the fixed work screen does not scroll.
 */
export function useRadioWorkspace(active: boolean, realistic: boolean) {
  const [stacked, setStacked] = useState(false);
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const queries = ['(max-width: 767px)', '(max-width: 1023px)', '(max-height: 860px)'].map((q) => window.matchMedia(q));
    const [phone, tablet, short] = queries;
    const update = () => {
      setStacked(realistic || tablet.matches);
      setCompact(realistic ? phone.matches : tablet.matches || short.matches);
    };
    update();
    queries.forEach((q) => q.addEventListener('change', update));
    return () => queries.forEach((q) => q.removeEventListener('change', update));
  }, [realistic]);
  useEffect(() => {
    if (!active) return undefined;
    const root = document.documentElement;
    root.setAttribute('data-radio-workspace', '');
    // In the iOS app (offline bundle or ?embed=1) the native screen hides its
    // header while the work screen is open, so the task panel gets that height.
    tellNativeApp(true);
    return () => {
      root.removeAttribute('data-radio-workspace');
      tellNativeApp(false);
    };
  }, [active]);
  return { stacked, compact };
}

function tellNativeApp(open: boolean) {
  const native = (window as Window & { ReactNativeWebView?: { postMessage: (value: string) => void } }).ReactNativeWebView;
  native?.postMessage(JSON.stringify({ type: 'radio-workspace', open }));
}

export function RadioWorkspace({
  stacked, onExit, exitTestId, exitTitle, status, actions, radio, onRadioPointerDown, dock, dockRef,
  testId = 'radio-workspace',
}: {
  stacked: boolean;
  onExit: () => void;
  exitTestId: string;
  /** where the exit button leads, for its tooltip */
  exitTitle: string;
  /** mode, timer, title: the left part of the bar */
  status: ReactNode;
  /** bar buttons on the right (Inspect, Sound) */
  actions?: ReactNode;
  radio: ReactNode;
  /** browsers start audio only from a gesture: the first touch of the radio */
  onRadioPointerDown?: () => void;
  dock: ReactNode;
  dockRef?: Ref<HTMLDivElement>;
  testId?: string;
}) {
  const { tp } = useI18n();
  return (
    <div className={styles.workspace} data-stacked={stacked || undefined} data-testid={testId}>
      <div className={styles.bar}>
        <div className={styles.barInner}>
          <button
            type="button"
            data-testid={exitTestId}
            onClick={onExit}
            aria-label={tp('Выйти', 'Exit', 'Wyjdź')}
            title={exitTitle}
            className={styles.barButton}
          >
            ✕<span className="hidden min-[400px]:inline">{tp('Выйти', 'Exit', 'Wyjdź')}</span>
          </button>
          <div className={styles.barStatus}>{status}</div>
          {actions}
        </div>
      </div>
      <div className={styles.main}>
        <div className={styles.radio} onPointerDownCapture={onRadioPointerDown}>{radio}</div>
        <div ref={dockRef} className={styles.dock} data-testid="radio-dock">{dock}</div>
      </div>
    </div>
  );
}

/** Inspect ("Rozbiór"): while on, a tap on the radio explains the part. */
export function InspectToggle({ on, onToggle, testId }: { on: boolean; onToggle: () => void; testId: string }) {
  const { tp } = useI18n();
  return (
    <button
      type="button"
      data-testid={testId}
      onClick={onToggle}
      aria-pressed={on}
      className={styles.barButton}
      style={on ? { background: '#ffce4d', color: '#3a2a00', borderColor: '#ffce4d' } : undefined}
    >
      🔍 {tp('Разбор', 'Inspect', 'Rozbiór')}
    </button>
  );
}

export function SoundToggle({ muted, onToggle }: { muted: boolean; onToggle: () => void }) {
  const { tp } = useI18n();
  return (
    <button
      type="button"
      data-testid="sound-toggle"
      onClick={onToggle}
      aria-pressed={!muted}
      aria-label={tp('Звук', 'Sound', 'Dźwięk')}
      title={tp('Звук', 'Sound', 'Dźwięk')}
      className={`${styles.barButton} ${styles.barIcon}`}
    >
      {muted ? '🔇' : '🔊'}
    </button>
  );
}

/** A panel card that can be folded away once read (situation, journal). */
export function PanelSection({ title, children, defaultOpen = true }: { title: ReactNode; children: ReactNode; defaultOpen?: boolean }) {
  return (
    <details
      open={defaultOpen}
      className={`${styles.collapsible} rounded-2xl px-4 pb-3 pt-1`}
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
    >
      <summary>{title}</summary>
      {children}
    </details>
  );
}
