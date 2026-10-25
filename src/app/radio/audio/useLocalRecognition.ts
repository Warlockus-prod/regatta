'use client';

import { useCallback, useEffect, useRef, useState } from "react";
import { recognitionTransition, releaseRecognition, type RecognitionEvent, type RecognitionPhase, type RecognitionSession } from "./localRecognitionSession";
declare global { interface Window { __REGATTA_NATIVE_ASR__?: boolean } }
let serial = 0;

/** Recognition is strictly on device. Availability never requests permission;
 * only the user's explicit start does. An unavailable model leaves typing usable. */
export function useLocalRecognition(onTranscript: (text: string) => void, enabled = true) {
  const [available, setAvailable] = useState<boolean | null>(null);
  const [phase, setPhase] = useState<RecognitionPhase>("idle");
  const [error, setError] = useState(false);
  const callback = useRef(onTranscript);
  const current = useRef<RecognitionSession | null>(null);
  useEffect(() => { callback.current = onTranscript; }, [onTranscript]);

  useEffect(() => {
    const probe = `radio-asr-probe-${++serial}`;
    const bridge = enabled && window.__REGATTA_NATIVE_ASR__ && window.ReactNativeWebView;
    const listener = (event: Event) => {
      const detail = (event as CustomEvent<RecognitionEvent>).detail;
      if (!detail) return;
      if (detail.id === probe && detail.status === "availability") { setAvailable(Boolean(detail.available)); return; }
      const session = current.current;
      if (!session || detail.id !== session.id) return;
      const transition = recognitionTransition(session, detail);
      current.current = transition.session;
      if (transition.phase) setPhase(transition.phase);
      if (transition.error !== undefined) setError(transition.error);
      if (transition.transcript) callback.current(transition.transcript);
      if (transition.cancel) window.ReactNativeWebView?.postMessage(JSON.stringify({ type: "radio-asr", id: session.id, action: "cancel", lang: "en" }));
      if (detail.status === "started" && !transition.cancel) setAvailable(true);
      if (detail.code === "model-unavailable" || detail.code === "permission-denied") setAvailable(false);
    };
    window.addEventListener("regatta:radio-asr", listener);
    const timeout = window.setTimeout(() => setAvailable(value => value ?? false), bridge ? 3000 : 0);
    if (bridge) window.ReactNativeWebView!.postMessage(JSON.stringify({ type: "radio-asr", id: probe, action: "availability", lang: "en" }));
    return () => {
      clearTimeout(timeout); window.removeEventListener("regatta:radio-asr", listener);
      if (current.current) window.ReactNativeWebView?.postMessage(JSON.stringify({ type: "radio-asr", id: current.current.id, action: "cancel", lang: "en" }));
      current.current = null;
    };
  }, [enabled]);

  const start = useCallback(() => {
    if (current.current) return;
    if (!enabled || available === false || !window.__REGATTA_NATIVE_ASR__ || !window.ReactNativeWebView) { setError(true); return; }
    const id = `radio-asr-${++serial}`;
    current.current = { id, text: "", released: false, ended: false, started: false }; setPhase("starting"); setError(false);
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: "radio-asr", id, action: "start", lang: "en" }));
  }, [available, enabled]);
  const stop = useCallback(() => {
    const session = current.current;
    if (!session || session.released) return;
    const transition = releaseRecognition(session);
    current.current = transition.session;
    if (transition.phase) setPhase(transition.phase);
    if (transition.transcript) callback.current(transition.transcript);
    if (transition.session) window.ReactNativeWebView?.postMessage(JSON.stringify({ type: "radio-asr", id: session.id, action: "stop", lang: "en" }));
  }, []);
  return { available, phase, error, start, stop };
}
