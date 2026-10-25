'use client';

import { forwardRef, useCallback, useImperativeHandle, useState, type ReactNode } from "react";
import { useRadioI18n } from "./localization/context";
import { useLocalRecognition } from "./audio/useLocalRecognition";
import { offlineRadio } from "./audio/localSpeech";

export interface LocalTranscriptEntryHandle { startRecording: () => void; stopRecording: () => void }
export type TranscriptInputMode = "typed" | "voice";

/** A real local transcript is graded by the same deterministic rules as online.
 * Typing is always available and is labelled separately from voice recognition. */
export const LocalTranscriptEntry = forwardRef<LocalTranscriptEntryHandle, {
  onSubmit: (text: string, mode: TranscriptInputMode) => void | Promise<void>;
  disabled?: boolean;
  allowVoice?: boolean;
  feedback?: ReactNode;
}>(function LocalTranscriptEntry({ onSubmit, disabled = false, allowVoice = offlineRadio(), feedback }, ref) {
  const { tp } = useRadioI18n();
  const [text, setText] = useState("");
  const receive = useCallback((transcript: string) => { setText(transcript); if (!disabled) void onSubmit(transcript, "voice"); }, [disabled, onSubmit]);
  const recognition = useLocalRecognition(receive, allowVoice);
  const { start, stop } = recognition;
  useImperativeHandle(ref, () => ({ startRecording: () => { if (!disabled) start(); }, stopRecording: stop }), [disabled, start, stop]);
  const recording = recognition.phase === "recording" || recognition.phase === "starting";

  return (
    <div className="mt-3 space-y-3" data-testid="local-transcript-entry">
      {allowVoice && <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }} role="status">
        {recognition.error || recognition.available === false
          ? tp("Локальное распознавание английской речи недоступно. Введи передачу текстом: проверка работает без интернета.", "On-device English recognition is unavailable. Type the transmission: checking works offline.", "Lokalne rozpoznawanie angielskiej mowy jest niedostępne. Wpisz komunikat: sprawdzanie działa bez internetu.")
          : tp("Речь распознаётся на устройстве после разрешения микрофона. Можно также ввести передачу текстом; это отдельная проверка содержания.", "Speech is recognized on device after microphone permission. You can also type the transmission for a separate content check.", "Mowa jest rozpoznawana na urządzeniu po zgodzie na mikrofon. Możesz też wpisać komunikat, aby osobno sprawdzić jego treść.")}
      </p>}
      {allowVoice && <button type="button" data-testid="local-voice-ptt" disabled={disabled || recognition.available === false}
        onPointerDown={event => { event.preventDefault(); recognition.start(); }} onPointerUp={recognition.stop} onPointerCancel={recognition.stop} onPointerLeave={recognition.stop}
        onKeyDown={event => { if ((event.key === " " || event.key === "Enter") && !event.repeat) { event.preventDefault(); recognition.start(); } }}
        onKeyUp={event => { if (event.key === " " || event.key === "Enter") { event.preventDefault(); recognition.stop(); } }}
        className="min-h-[48px] w-full rounded-xl px-4 font-semibold disabled:opacity-40"
        style={{ background: recording ? "var(--danger)" : "var(--accent-cyan)", color: recording ? "#fff" : "var(--accent-ink)" }}>
        {recording ? tp("Говори по-английски...", "Speak in English...", "Mów po angielsku...") : recognition.phase === "working" ? tp("Распознаю на устройстве...", "Recognizing on device...", "Rozpoznaję na urządzeniu...") : tp("Держать и говорить", "Hold to speak", "Przytrzymaj i mów")}
      </button>}
      <label className="block text-sm font-semibold">
        {tp("Текст передачи по-английски", "Transmission text in English", "Treść komunikatu po angielsku")}
        <textarea data-testid="local-transcript-input" lang="en" value={text} maxLength={4000} disabled={disabled || recognition.phase !== "idle"} onChange={event => setText(event.target.value)} rows={4}
          className="mt-2 min-h-[96px] w-full rounded-xl border p-3 font-mono text-sm font-normal"
          style={{ borderColor: "var(--border-subtle)", background: "var(--bg-primary)", color: "var(--text-primary)" }} />
      </label>
      {feedback}
      <button type="button" data-testid="local-transcript-check" disabled={disabled || !text.trim() || recognition.phase !== "idle"} onClick={() => void onSubmit(text.trim(), "typed")}
        className="min-h-[44px] rounded-xl border px-4 font-semibold disabled:opacity-40" style={{ borderColor: "var(--border-subtle)", color: "var(--accent-cyan)" }}>
        {tp("Проверить текст без интернета", "Check text offline", "Sprawdź tekst bez internetu")}
      </button>
    </div>
  );
});
