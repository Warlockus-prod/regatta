'use client';

import { useCallback, useEffect, useRef, useState } from "react";
import { readRecognitionEvent, recognitionTransition, releaseRecognition, type RecognitionOutcome, type RecognitionPhase, type RecognitionSession } from "./localRecognitionSession";
import { recordRadioSpeech } from "./speech-diagnostics";
declare global { interface Window { __REGATTA_NATIVE_ASR__?: boolean } }
let serial = 0;
function postRecognition(id: string, action: "availability" | "start" | "stop" | "cancel"): boolean {
  try {
    if (!window.ReactNativeWebView) return false;
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: "radio-asr", id, action, lang: "en" })); return true;
  } catch { return false; }
}

/** Recognition is strictly on device. Availability never requests permission;
 * only the user's explicit start does. An unavailable model leaves typing usable. */
export function useLocalRecognition(onTranscript: (text: string) => void, enabled = true) {
  const [available, setAvailable] = useState<boolean | null>(null);
  const [phase, setPhase] = useState<RecognitionPhase>("idle");
  const [error, setError] = useState(false);
  const [draft, setDraft] = useState("");
  const [outcome, setOutcome] = useState<RecognitionOutcome | null>(null);
  const callback = useRef(onTranscript);
  const current = useRef<RecognitionSession | null>(null);
  useEffect(() => { callback.current = onTranscript; }, [onTranscript]);

  const reportOutcome = useCallback((value: RecognitionOutcome) => {
    setOutcome(value);
    recordRadioSpeech({ action: value === "cancelled" ? "cancel" : "result", input: "voice", status: value,
      outcome: value === "recognized" ? "accepted" : value === "silent" || value === "cancelled" ? "noop" : "failed" });
  }, []);
  const cancel = useCallback(() => {
    const session = current.current;
    if (!session) return;
    current.current = null; setPhase("idle"); setDraft(""); setError(false);
    reportOutcome(postRecognition(session.id, "cancel") ? "cancelled" : "error");
  }, [reportOutcome]);

  useEffect(() => {
    const probe = `radio-asr-probe-${++serial}`;
    const bridge = enabled && window.__REGATTA_NATIVE_ASR__ && window.ReactNativeWebView;
    let availabilityReplied = false;
    const listener = (event: Event) => {
      const detail = readRecognitionEvent((event as CustomEvent<unknown>).detail);
      if (!detail) return;
      if (detail.id === probe && detail.status === "availability") {
        availabilityReplied = true;
        setAvailable(Boolean(detail.available));
        recordRadioSpeech({ action: "availability", input: "voice", available: Boolean(detail.available), outcome: "accepted" });
        return;
      }
      const session = current.current;
      if (!session || detail.id !== session.id) return;
      const transition = recognitionTransition(session, detail);
      current.current = transition.session;
      if (!session.ended && (detail.status === "result" || detail.status === "end")) setDraft(detail.transcript ?? session.text);
      if (transition.phase) setPhase(transition.phase);
      if (transition.error !== undefined) setError(transition.error);
      if (transition.outcome) reportOutcome(transition.outcome);
      if (transition.transcript) callback.current(transition.transcript);
      if (transition.cancel) postRecognition(session.id, "cancel");
      if (detail.status === "started" && !session.started && !session.ended && !transition.cancel) {
        setAvailable(true); recordRadioSpeech({ action: "started", input: "voice", outcome: "accepted" });
      }
      if (detail.code === "model-unavailable" || detail.code === "permission-denied") setAvailable(false);
    };
    window.addEventListener("regatta:radio-asr", listener);
    const hidden = () => { if (document.visibilityState === "hidden") cancel(); };
    const blurred = () => { if (current.current?.started) cancel(); };
    window.addEventListener("blur", blurred);
    document.addEventListener("visibilitychange", hidden);
    const timeout = window.setTimeout(() => {
      if (availabilityReplied) return;
      setAvailable(value => value ?? false);
      if (enabled) recordRadioSpeech({ action: "availability", input: "voice", available: false,
        outcome: bridge ? "failed" : "accepted", reason: bridge ? "timeout" : "unsupported" });
    }, bridge ? 3000 : 0);
    if (bridge && !postRecognition(probe, "availability")) {
      availabilityReplied = true;
      setAvailable(false); recordRadioSpeech({ action: "availability", input: "voice", available: false, outcome: "failed", reason: "connection" });
    }
    return () => {
      clearTimeout(timeout); window.removeEventListener("regatta:radio-asr", listener);
      window.removeEventListener("blur", blurred); document.removeEventListener("visibilitychange", hidden);
      cancel();
    };
  }, [enabled, cancel, reportOutcome]);

  const start = useCallback(() => {
    if (current.current) return;
    if (!enabled || available === false || !window.__REGATTA_NATIVE_ASR__ || !window.ReactNativeWebView) { setError(true); reportOutcome("unavailable"); return; }
    const id = `radio-asr-${++serial}`;
    current.current = { id, text: "", released: false, ended: false, started: false }; setPhase("starting"); setError(false); setDraft(""); setOutcome(null);
    recordRadioSpeech({ action: "request", input: "voice", outcome: "accepted" });
    if (!postRecognition(id, "start")) { current.current = null; setPhase("idle"); setError(true); reportOutcome("error"); }
  }, [available, enabled, reportOutcome]);
  const stop = useCallback(() => {
    const session = current.current;
    if (!session || session.released) return;
    const transition = releaseRecognition(session);
    current.current = transition.session;
    if (transition.phase) setPhase(transition.phase);
    recordRadioSpeech({ action: "release", input: "voice", outcome: "accepted" });
    if (transition.outcome) reportOutcome(transition.outcome);
    if (transition.transcript) callback.current(transition.transcript);
    if (transition.session && !postRecognition(session.id, "stop")) { current.current = null; setPhase("idle"); setError(true); reportOutcome("error"); }
  }, [reportOutcome]);
  const reset = useCallback(() => { cancel(); setDraft(""); setOutcome(null); setError(false); }, [cancel]);
  return { available, phase, error, draft, outcome, start, stop, cancel, reset };
}
