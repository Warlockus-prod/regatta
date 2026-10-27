'use client';

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { FREE_SPEECH_LABELS as copy } from "@/data/radio/free-speech-labels";
import { useRadioI18n } from "./localization/context";
import { useLocalRecognition } from "./audio/useLocalRecognition";
import { appendFreeTransmission, FREE_SPEECH_HOLD_MS, FREE_SPEECH_MAX_CHARACTERS, FREE_SPEECH_MAX_ROWS, type FreeTransmission } from "./audio/freeSpeechSession";
import { recordRadioSpeech } from "./audio/speech-diagnostics";

export interface FreeSpeechHandle {
  startRecording: () => void;
  stopRecording: () => void;
  cancelRecording: () => void;
}

/** Free PTT keeps private text in this mounted component only. It never
 * grades a procedure, changes course progress or sends a transcription. */
export const FreeSpeechPractice = forwardRef<FreeSpeechHandle, {
  power: boolean;
  voiceChannel: boolean;
  onReleasePtt: () => void;
}>(function FreeSpeechPractice({ power, voiceChannel, onReleasePtt }, ref) {
  // These generated source labels resolve through the existing seven catalogs.
  const { rt: tl } = useRadioI18n();
  const [rows, setRows] = useState<readonly FreeTransmission[]>([]);
  const [text, setText] = useState("");
  const serial = useRef(0);
  const deadline = useRef<ReturnType<typeof setTimeout> | null>(null);
  const held = useRef(false);
  const releasePtt = useRef(onReleasePtt);
  useEffect(() => { releasePtt.current = onReleasePtt; }, [onReleasePtt]);
  const addVoice = useCallback((value: string) => {
    const id = ++serial.current;
    setRows(old => appendFreeTransmission(old, value, "voice", id));
  }, []);
  const recognition = useLocalRecognition(addVoice, power && voiceChannel);
  const { start: startRecognition, stop: stopRecognition, cancel: cancelRecognition, phase } = recognition;
  const clearDeadline = useCallback(() => {
    if (deadline.current !== null) clearTimeout(deadline.current);
    deadline.current = null; held.current = false;
  }, []);
  const stop = useCallback(() => { clearDeadline(); stopRecognition(); }, [clearDeadline, stopRecognition]);
  const cancel = useCallback(() => {
    // A pointerleave/blur after a genuine release must not discard the native
    // final result still arriving. Only an actually held PTT can be cancelled.
    if (!held.current) return;
    clearDeadline(); cancelRecognition();
  }, [clearDeadline, cancelRecognition]);
  useImperativeHandle(ref, () => ({
    startRecording: () => {
      if (!power || !voiceChannel || held.current) return;
      held.current = true;
      deadline.current = setTimeout(() => { stop(); releasePtt.current(); }, FREE_SPEECH_HOLD_MS);
      startRecognition();
    },
    stopRecording: stop,
    cancelRecording: cancel,
  }), [power, voiceChannel, startRecognition, stop, cancel]);
  useEffect(() => () => { clearDeadline(); }, [clearDeadline]);
  useEffect(() => {
    if ((!power || !voiceChannel) && held.current) { cancel(); releasePtt.current(); }
  }, [power, voiceChannel, cancel]);
  useEffect(() => {
    const background = () => { if (document.visibilityState === "hidden" && held.current) { cancel(); releasePtt.current(); } };
    const blurred = () => { if (phase === "recording" && held.current) { cancel(); releasePtt.current(); } };
    document.addEventListener("visibilitychange", background); window.addEventListener("blur", blurred);
    return () => { document.removeEventListener("visibilitychange", background); window.removeEventListener("blur", blurred); };
  }, [phase, cancel]);

  const busy = recognition.phase !== "idle";
  const status = !power ? "powerOff" : !voiceChannel ? "txInhibit"
    : phase !== "idle" ? phase : recognition.outcome
      ?? (recognition.available === false ? "unavailable" : "ready");
  const preview = busy ? recognition.draft : rows[0]?.text;
  const addTyped = () => {
    if (busy || !text.trim()) return;
    const id = ++serial.current;
    setRows(old => appendFreeTransmission(old, text, "typed", id)); setText("");
    recordRadioSpeech({ action: "result", input: "typed", status: "entered", outcome: "accepted" });
  };
  const clear = () => {
    const changed = rows.length > 0 || text.length > 0 || recognition.draft.length > 0 || busy;
    clearDeadline(); recognition.reset(); releasePtt.current(); setRows([]); setText("");
    recordRadioSpeech({ action: "clear", input: "typed", outcome: changed ? "accepted" : "noop", ...(changed ? {} : { reason: "unchanged" }) });
  };

  return <section data-testid="free-speech-practice" className="space-y-3 border-b pb-4" style={{ borderColor: "var(--border-subtle)" }}>
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h2 className="text-lg font-semibold">{tl(copy.title)}</h2>
      <button type="button" data-testid="free-speech-clear" className="min-h-[44px] rounded-lg border px-3 text-sm" style={{ borderColor: "var(--border-subtle)", color: "var(--text-secondary)" }} onClick={clear}>{tl(copy.clear)}</button>
    </div>
    <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{tl(copy.instruction)}</p>
    <p role="status" aria-live="polite" data-testid="free-speech-status" className="font-semibold">{tl(copy[status])}</p>
    <div className="rounded-lg border p-3" style={{ borderColor: "var(--border-subtle)", background: "var(--bg-primary)" }}>
      <p className="mb-1 text-sm" style={{ color: "var(--text-secondary)" }}>{tl(busy ? copy.draft : copy.latest)}{!busy && rows[0] && <><span aria-hidden="true"> · </span>{tl(rows[0].input === "voice" ? copy.recognized : copy.entered)}</>}</p>
      <p data-testid="free-speech-preview" lang={preview ? "en" : undefined} className="whitespace-pre-wrap break-words text-base leading-6">{preview ? Array.from(preview).slice(0, FREE_SPEECH_MAX_CHARACTERS).join("") : tl(copy.empty)}</p>
    </div>
    <label className="block text-sm font-semibold">{tl(copy.typedLabel)}
      <textarea data-testid="free-speech-input" lang="en" rows={2} maxLength={FREE_SPEECH_MAX_CHARACTERS} disabled={busy} value={text} onChange={event => setText(event.target.value)}
        className="mt-2 min-h-[72px] w-full rounded-lg border p-3 text-base font-normal leading-6 disabled:opacity-50" style={{ borderColor: "var(--border-subtle)", background: "var(--bg-primary)", color: "var(--text-primary)" }} />
    </label>
    <button type="button" data-testid="free-speech-submit" onClick={addTyped} disabled={busy || !text.trim()} className="min-h-[44px] rounded-lg border px-3 font-semibold disabled:opacity-40" style={{ borderColor: "var(--border-subtle)", color: "var(--accent-cyan)" }}>{tl(copy.submit)}</button>
    <details>
      <summary className="min-h-[44px] cursor-pointer py-3 font-semibold" data-testid="free-speech-history">{tl(copy.history)} ({rows.length}/{FREE_SPEECH_MAX_ROWS})</summary>
      <ol className="divide-y" style={{ borderColor: "var(--border-subtle)" }}>{rows.map(row => <li key={row.id} className="py-3">
        <p className="mb-1 text-sm" style={{ color: "var(--text-secondary)" }}>{tl(row.input === "voice" ? copy.recognized : copy.entered)}</p>
        <p lang="en" className="whitespace-pre-wrap break-words text-base leading-6">{row.text}</p>
      </li>)}</ol>
    </details>
    <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{tl(copy.privacy)}</p>
  </section>;
});
