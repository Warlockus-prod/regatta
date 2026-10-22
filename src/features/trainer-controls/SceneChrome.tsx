'use client';

import { useEffect, useRef, type ReactNode } from "react";
import styles from "./TrainerControls.module.css";

// Owner rule (2026-10-21): on a phone nothing is drawn over the boat. Status
// and view buttons sit in a bar ABOVE the scene, readouts UNDER it, and the
// view choices slide out from the side only when asked for, then slide back.

/** The strip above the scene: a short status on the left, buttons on the right. */
export function SceneBar(props: { status?: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <div className={`${styles.sceneBar} ${props.className ?? ""}`} data-testid="scene-bar">
      <div className={styles.sceneStatus}>{props.status}</div>
      {props.actions && <div className={styles.sceneBarActions}>{props.actions}</div>}
    </div>
  );
}

const ViewIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
    <rect x="3" y="6" width="13" height="12" rx="2" />
    <path d="M16 10.5l5-3v9l-5-3" />
  </svg>
);

/** Opens the side drawer with views and camera. */
export function ViewButton(props: { label: string; current?: string; open: boolean; controls: string; onToggle: () => void; iconOnly?: boolean }) {
  return (
    <button
      type="button"
      className={props.iconOnly ? `${styles.barButton} ${styles.barIconSquare}` : styles.barButton}
      title={props.label}
      aria-expanded={props.open}
      aria-controls={props.controls}
      aria-label={props.current ? `${props.label}: ${props.current}` : props.label}
      onClick={props.onToggle}
      data-testid="scene-view-button"
    >
      <ViewIcon />
      {!props.iconOnly && <span>{props.label}</span>}
    </button>
  );
}

/** Small round button in the scene bar (the "?" tour). */
export function BarIconButton(props: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" className={`${styles.barButton} ${styles.barIcon}`} aria-label={props.label} title={props.label} onClick={props.onClick}>
      {props.children}
    </button>
  );
}

/**
 * Drawer that slides in from the right edge of the scene. Lives inside the
 * scene box (position: relative). Closed, it takes no room and covers nothing.
 */
export function SceneDrawer(props: { id: string; open: boolean; title: string; closeLabel: string; onClose: () => void; children: ReactNode }) {
  const { id, open, title, closeLabel, onClose, children } = props;
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    panelRef.current?.querySelector<HTMLElement>("button")?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  return (
    <>
      {open && <button type="button" className={styles.drawerBackdrop} aria-label={closeLabel} tabIndex={-1} onClick={onClose} />}
      <div
        ref={panelRef}
        id={id}
        role="region"
        aria-label={title}
        className={styles.drawer}
        data-open={open}
        inert={!open}
        data-testid="scene-drawer"
      >
        <p className={styles.drawerTitle}>{title}</p>
        {children}
      </div>
    </>
  );
}

/** A group of choices in the drawer, divided from the next one by a rule. */
export function DrawerGroup(props: { children: ReactNode }) {
  return <div className={styles.drawerGroup}>{props.children}</div>;
}

/** One choice in the drawer (a view, a camera, a toggle). */
export function DrawerItem(props: { pressed?: boolean; onClick: () => void; children: ReactNode; label?: string }) {
  return (
    <button type="button" className={styles.drawerItem} aria-pressed={props.pressed} aria-label={props.label} onClick={props.onClick}>
      {props.children}
    </button>
  );
}
