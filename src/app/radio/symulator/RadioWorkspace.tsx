'use client';

import { useRadioI18n } from "@/app/radio/localization/context";

import { Children, Fragment, isValidElement, useEffect, useState, type ReactNode, type Ref } from 'react';
import { useTrainerI18n } from './trainerText';
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
  testId = 'radio-workspace', requestedPanel, requestVersion,
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
  testId?: string; requestedPanel?:string; requestVersion?:number;
}) {
  const { rt: radioText } = useRadioI18n();
  const { tp } = useTrainerI18n();
  const order=["task","help","situation","listen","log","device"];
  const panels = dockPanels(dock).sort((a,b)=>order.indexOf(a.id)-order.indexOf(b.id));
  const [selection, setSelection] = useState({ panel: requestedPanel ?? "task", requestedPanel, requestVersion });
  const activePanel = selection.requestedPanel === requestedPanel && selection.requestVersion === requestVersion
    ? selection.panel : requestedPanel ?? "task";
  const setActivePanel = (panel: string) => setSelection({ panel, requestedPanel, requestVersion });
  const selected = panels.some(panel=>panel.id===activePanel) ? activePanel : panels[0]?.id;
  return (
    <div className={styles.workspace} data-stacked={stacked || undefined} data-testid={testId}>
      <div className={styles.bar}>
        <div className={styles.barInner}>
          <button
            type="button"
            data-testid={exitTestId}
            onClick={onExit}
            aria-label={radioText(tp('Выйти', 'Exit', 'Wyjdź'))}
            title={radioText(exitTitle)}
            className={styles.barButton}
          >
            ✕<span className="hidden min-[400px]:inline">{radioText(tp('Выйти', 'Exit', 'Wyjdź'))}</span>
          </button>
          <div className={styles.barStatus}>{status}</div>
          {actions}
        </div>
      </div>
      <div className={styles.main}>
        <div className={styles.radio} onPointerDownCapture={onRadioPointerDown}>{radio}</div>
        <div className={styles.dockFrame}>
          {panels.length > 0 && <div className={styles.tabs} role="tablist" aria-label={tp("Панель рации", "Radio panel", "Panel radia")}>
            {panels.map(panel=><button key={panel.id} type="button" role="tab" id={`radio-tab-${panel.id}`} aria-selected={selected===panel.id} aria-controls={`radio-panel-${panel.id}`} onKeyDown={(event)=>{const keys=["ArrowLeft","ArrowRight","Home","End"];if(!keys.includes(event.key))return;event.preventDefault();const index=panels.findIndex(item=>item.id===selected);const next=event.key==="Home"?0:event.key==="End"?panels.length-1:(index+(event.key==="ArrowRight"?1:-1)+panels.length)%panels.length;setActivePanel(panels[next].id);document.getElementById(`radio-tab-${panels[next].id}`)?.focus();}} tabIndex={selected===panel.id?0:-1} onClick={()=>{setActivePanel(panel.id);if(dockRef&&typeof dockRef!=="function"&&dockRef.current)dockRef.current.scrollTop=0;}}>{radioText(panel.label)}</button>)}
          </div>}
          <div ref={dockRef} className={styles.dock} data-testid="radio-dock">
            {panels.length ? panels.map(panel=><section key={panel.id} role="tabpanel" id={`radio-panel-${panel.id}`} aria-labelledby={`radio-tab-${panel.id}`} hidden={selected!==panel.id}>{panel.content}</section>) : dock}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Inspect ("Rozbiór"): while on, a tap on the radio explains the part. */
export function InspectToggle({ on, onToggle, testId }: { on: boolean; onToggle: () => void; testId: string }) {
  const { rt: radioText } = useRadioI18n();
  const { tp } = useTrainerI18n();
  return (
    <button
      type="button"
      data-testid={testId}
      onClick={onToggle}
      aria-pressed={on}
      aria-label={tp('Изучить радио', 'Explore controls', 'Poznaj przyciski')}
      title={tp('Изучить радио', 'Explore controls', 'Poznaj przyciski')}
      className={styles.barButton}
      style={on ? { background: '#ffce4d', color: '#3a2a00', borderColor: '#ffce4d' } : undefined}
    >
      <span aria-hidden>🔍</span><span className="hidden min-[400px]:inline">{radioText(tp('Изучить радио', 'Explore controls', 'Poznaj przyciski'))}</span>
    </button>
  );
}

export function SoundToggle({ muted, onToggle }: { muted: boolean; onToggle: () => void }) {
  const { rt: radioText } = useRadioI18n();
  const { tp } = useTrainerI18n();
  return (
    <button
      type="button"
      data-testid="sound-toggle"
      onClick={onToggle}
      aria-pressed={!muted}
      aria-label={radioText(tp('Звук', 'Sound', 'Dźwięk'))}
      title={radioText(tp('Звук', 'Sound', 'Dźwięk'))}
      className={`${styles.barButton} ${styles.barIcon}`}
    >
      {radioText(muted ? '🔇' : '🔊')}
    </button>
  );
}

/** A panel card that can be folded away once read (situation, journal). */
export function PanelSection({ title, children, defaultOpen = true }: { title: ReactNode; children: ReactNode; defaultOpen?: boolean }) {
  const { rt: radioText } = useRadioI18n();
  return (
    <details
      open={defaultOpen}
      className={`${styles.collapsible} rounded-2xl px-4 pb-3 pt-1`}
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
    >
      <summary>{radioText(title)}</summary>
      {radioText(children)}
    </details>
  );
}


export function DockPanel({children}:{id:string;label:string;children:ReactNode}) { return <>{children}</>; }
function dockPanels(node:ReactNode): {id:string;label:string;content:ReactNode}[] {
 return Children.toArray(node).flatMap(child=>{
  if(!isValidElement(child))return [];
  if(child.type===Fragment)return dockPanels((child.props as {children?:ReactNode}).children);
  if(child.type===DockPanel){const p=child.props as {id:string;label:string;children:ReactNode};return [{id:p.id,label:p.label,content:p.children}];}
  return [];
 });
}
