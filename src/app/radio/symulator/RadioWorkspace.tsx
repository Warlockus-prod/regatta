'use client';

import DiagnosticPanel from "@/components/diagnostics/DiagnosticPanelLoader";
import { diagnosticTitle, diagnosticText } from "@/lib/diagnostic-title";
import { useI18n } from "@/lib/i18n";
import { recordWebDiagnostic } from "@/lib/diagnostics-web";
import { flushDiagnosticBridge, initializeDiagnosticBridge } from "@/lib/diagnostics-bridge";
import { useRadioI18n } from "@/app/radio/localization/context";
import { postRadioMessage } from "../navigation";

import { Children, Fragment, isValidElement, useEffect, useState, useSyncExternalStore, type ReactNode, type Ref } from 'react';
import { useTrainerI18n } from './trainerText';
import styles from './RadioWorkspace.module.css';
const noSubscribe = () => () => {};

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
    initializeDiagnosticBridge();
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
  testId = 'radio-workspace', requestedPanel, requestVersion, onPanelChange,
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
  /** the learner picked a dock tab; returns the requestedPanel the parent will
   *  pass after reacting (Help turns taps on the radio into explanations), so
   *  that reaction does not override the learner's own choice */
  onPanelChange?: (panel: string) => string | void;
}) {
  const { rt: radioText, tl } = useRadioI18n();
  const { tp } = useTrainerI18n();
  const native = useSyncExternalStore(noSubscribe, () => typeof window !== 'undefined' && Boolean((window as Window & { ReactNativeWebView?: unknown }).ReactNativeWebView), () => false);
  const { lang } = useI18n();
  const order=["task","help","situation","listen","log","device"];
  const panels = [...dockPanels(dock).sort((a,b)=>order.indexOf(a.id)-order.indexOf(b.id)), { id: "diagnostics", label: diagnosticText(diagnosticTitle, lang), content: null }];
  const [selection, setSelection] = useState({ panel: requestedPanel ?? "task", requestedPanel, requestVersion });
  const activePanel = selection.requestedPanel === requestedPanel && selection.requestVersion === requestVersion
    ? selection.panel : requestedPanel ?? "task";
  const setActivePanel = (panel: string) => setSelection({ panel, requestedPanel: onPanelChange?.(panel) ?? requestedPanel, requestVersion });
  const selected = panels.some(panel=>panel.id===activePanel) ? activePanel : panels[0]?.id;
  return (
    <div className={styles.workspace} data-stacked={stacked || undefined} data-testid={testId}>
      <div className={styles.bar} data-testid="radio-workspace-bar">
        <div className={styles.barInner}>
          <button
            type="button"
            data-testid={exitTestId}
            onClick={onExit}
            aria-label={radioText(exitTitle)}
            title={radioText(exitTitle)}
            className={styles.barButton}
          >
            <span aria-hidden="true">‹</span><span className={styles.barLabel}>{tl({ ru: "Назад", en: "Back", pl: "Wstecz", es: "Atrás", fr: "Retour", de: "Zurück", it: "Indietro" })}</span>
          </button>
          <div className={styles.barStatus} data-testid="radio-workspace-status">{status}</div>
          <div className={styles.barActions}>
            {actions}
            {native && <button type="button" className={styles.barButton} data-testid="radio-exit-app" onClick={() => { recordWebDiagnostic({ type: "navigation", surface: "radio", action: "request", outcome: "accepted", to: "practice" }); flushDiagnosticBridge(); postRadioMessage({ type: "radio-exit" }); }}
              aria-label={tl({ ru: "Выйти из SRC в приложение", en: "Leave SRC for the app", pl: "Wyjdź z SRC do aplikacji", es: "Salir de SRC a la aplicación", fr: "Quitter SRC pour revenir à l'app", de: "SRC verlassen und zur App", it: "Esci da SRC e torna all'app" })}>
              {tl({ ru: "Выйти", en: "Exit", pl: "Wyjdź", es: "Salir", fr: "Quitter", de: "Zur App", it: "Esci" })}
            </button>}
          </div>
        </div>
      </div>
      <div className={styles.main}>
        <div className={styles.radio} onPointerDownCapture={onRadioPointerDown}>{radio}</div>
        <div className={styles.dockFrame}>
          {panels.length > 0 && <div className={styles.tabs} role="tablist" aria-label={tp("Панель рации", "Radio panel", "Panel radia")}>
            {panels.map(panel=><button key={panel.id} type="button" role="tab" id={`radio-tab-${panel.id}`} aria-selected={selected===panel.id} aria-controls={`radio-panel-${panel.id}`} onKeyDown={(event)=>{const keys=["ArrowLeft","ArrowRight","Home","End"];if(!keys.includes(event.key))return;event.preventDefault();const index=panels.findIndex(item=>item.id===selected);const next=event.key==="Home"?0:event.key==="End"?panels.length-1:(index+(event.key==="ArrowRight"?1:-1)+panels.length)%panels.length;setActivePanel(panels[next].id);document.getElementById(`radio-tab-${panels[next].id}`)?.focus();}} tabIndex={selected===panel.id?0:-1} onClick={()=>{setActivePanel(panel.id);if(dockRef&&typeof dockRef!=="function"&&dockRef.current)dockRef.current.scrollTop=0;}}>{radioText(panel.label)}</button>)}
          </div>}
          <div ref={dockRef} className={styles.dock} data-testid="radio-dock">
            {panels.length ? panels.map(panel=><section key={panel.id} role="tabpanel" id={`radio-panel-${panel.id}`} aria-labelledby={`radio-tab-${panel.id}`} hidden={selected!==panel.id}>{panel.id === "diagnostics" ? <DiagnosticPanel active={selected === panel.id} /> : panel.content}</section>) : dock}
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
      style={on ? { background: 'var(--accent-cyan)', color: 'var(--accent-ink)', borderColor: 'var(--accent-cyan)' } : undefined}
    >
      <span aria-hidden>🔍</span><span className={styles.barLabel}>{radioText(tp('Изучить радио', 'Explore controls', 'Poznaj przyciski'))}</span>
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
