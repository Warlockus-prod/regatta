'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type MouseEvent, type PointerEvent } from "react";
import { DIAL_KEY_SHORTCUTS, RadioDialInput, type DialNotice } from "./dialGesture";
import { recordWebDiagnostic } from "@/lib/diagnostics-web";
import type { DiagnosticInput, DiagnosticReason } from "@/lib/diagnostics";
import type { RadioEvent } from "./radioModel";

function recordGesture(notice: DialNotice) {
  // Continuous motion below a detent changes only the index, not the radio.
  if (notice.action === "rotate" && !notice.steps) return;
  try {
    const event: Extract<DiagnosticInput, { type: "radio.gesture" }> = { type: "radio.gesture", surface: "radio", control: "dial", action: notice.action, outcome: notice.outcome };
    if (notice.source) event.source = notice.source;
    if (notice.reason) event.reason = notice.reason;
    if (notice.steps !== undefined) event.steps = notice.steps;
    recordWebDiagnostic(event);
  } catch { /* logging cannot interrupt the input */ }
}

export function useRotaryDial(dispatch: (event: RadioEvent) => void, enabled: boolean, identity: string) {
  const node = useRef<HTMLButtonElement | null>(null);
  const [rotation, setRotation] = useState(0);
  const [input] = useState(() => new RadioDialInput(dispatch, delta => setRotation(previous => (previous + delta) % 360), recordGesture));
  useLayoutEffect(() => { input.setEmit(dispatch); }, [dispatch, input]);
  const release = useCallback((target: HTMLButtonElement | null, id: number | null) => {
    if (target && id !== null) try { target.releasePointerCapture(id); } catch { /* capture already ended */ }
  }, []);
  const cancel = useCallback((reason: DiagnosticReason = "cancelled") => {
    const id = input.pointerId;
    input.cancel(reason);
    release(node.current, id);
  }, [input, release]);
  const ref = useCallback((target: HTMLButtonElement | null) => {
    if (node.current !== target) {
      const id = input.pointerId;
      input.cancel(); release(node.current, id);
    }
    node.current = target;
  }, [input, release]);
  useLayoutEffect(() => { cancel(enabled ? "cancelled" : "inspect"); }, [cancel, enabled, identity]);
  useEffect(() => {
    const hidden = () => { if (document.hidden) cancel("hidden"); };
    const blur = () => cancel("blur");
    window.addEventListener("blur", blur);
    document.addEventListener("visibilitychange", hidden);
    return () => {
      window.removeEventListener("blur", blur);
      document.removeEventListener("visibilitychange", hidden);
      const id = input.pointerId;
      input.dispose(); release(node.current, id);
    };
  }, [cancel, input, release]);
  return {
    rotation,
    shortcuts: DIAL_KEY_SHORTCUTS,
    step: (dir: 1 | -1) => { if (enabled) input.step(dir); },
    handlers: {
      ref,
      onPointerDown: (event: PointerEvent<HTMLButtonElement>) => {
        if (!enabled) { recordGesture({ action: "ignored", outcome: "rejected", reason: "inspect", source: "pointer" }); return; }
        if ((event.pointerType === "mouse" && event.button !== 0) || event.isPrimary === false) { recordGesture({ action: "ignored", outcome: "rejected", reason: "secondary-pointer", source: "pointer" }); return; }
        if (!input.pointerDown(event.pointerId, { x: event.clientX, y: event.clientY }, event.currentTarget.getBoundingClientRect())) return;
        event.preventDefault();
        try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* leave cancels without capture */ }
      },
      onPointerMove: (event: PointerEvent<HTMLButtonElement>) => {
        if (enabled) input.pointerMove(event.pointerId, { x: event.clientX, y: event.clientY });
      },
      onPointerUp: (event: PointerEvent<HTMLButtonElement>) => {
        if (!enabled || input.pointerId !== event.pointerId) return;
        input.pointerUp(event.pointerId); release(event.currentTarget, event.pointerId);
      },
      onPointerCancel: (event: PointerEvent<HTMLButtonElement>) => {
        input.pointerCancel(event.pointerId); release(event.currentTarget, event.pointerId);
      },
      onLostPointerCapture: (event: PointerEvent<HTMLButtonElement>) => input.pointerCancel(event.pointerId, "lost-capture"),
      onPointerLeave: (event: PointerEvent<HTMLButtonElement>) => {
        if (input.pointerId === event.pointerId && !event.currentTarget.hasPointerCapture(event.pointerId)) input.pointerCancel(event.pointerId);
      },
      onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => {
        if (enabled && input.keyDown(event.key, event.repeat)) { event.preventDefault(); event.stopPropagation(); }
      },
      onKeyUp: (event: KeyboardEvent<HTMLButtonElement>) => {
        if (enabled && input.keyUp(event.key)) { event.preventDefault(); event.stopPropagation(); }
      },
      onClick: (event: MouseEvent<HTMLButtonElement>) => {
        if (enabled) input.click(event.detail, (event.nativeEvent as MouseEvent["nativeEvent"] & { pointerType?: string }).pointerType);
      },
    },
  };
}
