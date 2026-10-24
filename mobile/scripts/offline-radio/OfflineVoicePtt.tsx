'use client';
import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from "react";
import { useRadioI18n } from "@/app/radio/localization/context";
import { LocalTranscriptEntry, type LocalTranscriptEntryHandle, type TranscriptInputMode } from "@/app/radio/LocalTranscriptEntry";
import { gradeVoiceTransmission, type VoiceKind } from "@/app/radio/voiceGrading";
import { VESSEL_POOL } from "@/app/radio/symulator/radioModel";
import { venueById } from "@/app/radio/symulator/venues";
import { checkLabel } from "@/app/radio/symulator/trainerText";

export interface VoiceResult {
  transcript: string;
  checks: { id: string; label: string; ok: boolean; mandatory?: boolean }[];
  score: number;
  mandatoryOk?: boolean;
  inputMode?: TranscriptInputMode;
}
interface Props {
  kind: VoiceKind; lines: string[]; vesselIdx: number; positionIdx: number; pob: number; venue?: string;
  ru: boolean; hideScript?: boolean; allowLinePractice?: boolean; minimumScore?: number;
  onComplete: (result: VoiceResult | null) => void;
}
export interface VoicePttHandle { startRecording: () => void; stopRecording: () => void }

const OfflineVoicePtt = forwardRef<VoicePttHandle, Props>(function OfflineVoicePtt({
  kind, lines, vesselIdx, positionIdx, pob, venue = "gdansk", hideScript = false, allowLinePractice = true, minimumScore = 70, onComplete,
}, ref) {
  const { rt, tp, lang } = useRadioI18n();
  const [linesRead, setLinesRead] = useState(0);
  const [result, setResult] = useState<VoiceResult | null>(null);
  const done = useRef(false);
  const entry = useRef<LocalTranscriptEntryHandle>(null);
  useImperativeHandle(ref, () => ({ startRecording: () => entry.current?.startRecording(), stopRecording: () => entry.current?.stopRecording() }), []);
  const finish = useCallback((result: VoiceResult | null) => { if (!done.current) { done.current = true; onComplete(result); } }, [onComplete]);
  const check = useCallback((transcript: string, inputMode: TranscriptInputMode) => {
    const place = venueById(venue);
    const graded = { ...gradeVoiceTransmission({ kind, transcript, vessel: VESSEL_POOL[vesselIdx] ?? VESSEL_POOL[0], positionSpoken: place.positions[positionIdx % place.positions.length].spoken, pob, venue: place }), inputMode };
    setResult(graded);
    if (graded.mandatoryOk && graded.score >= minimumScore) finish(graded);
  }, [kind, minimumScore, pob, positionIdx, venue, vesselIdx, finish]);
  const nextLine = () => {
    const next = Math.min(lines.length, linesRead + 1); setLinesRead(next);
    if (next === lines.length) window.setTimeout(() => finish(null), 250);
  };
  return (
    <div data-testid="voice-panel" className="rounded-2xl border p-4" style={{ background: "rgba(0,212,255,0.06)", borderColor: "rgba(0,212,255,0.25)" }}>
      <h3 className="mb-2 text-sm font-semibold" style={{ color: "var(--accent-cyan)" }}>{tp("Передача: локальная проверка", "Transmission: local check", "Komunikat: lokalne sprawdzanie")}</h3>
      {!hideScript && <ol className="mb-3 space-y-1 font-mono text-xs leading-relaxed">{lines.map((line, index) => <li key={index} lang="en" style={{ color: index < linesRead ? "var(--success)" : "var(--text-secondary)" }}>{index < linesRead ? "✓ " : "· "}{line}</li>)}</ol>}
      <LocalTranscriptEntry ref={entry} onSubmit={check} />
      {result && <div className="mt-3 text-sm" data-testid="local-voice-result">
        <p className="font-semibold">{result.inputMode === "typed" ? tp("Проверка текста", "Text check", "Sprawdzenie tekstu") : tp("Локальное распознавание речи", "On-device speech recognition", "Lokalne rozpoznawanie mowy")}: {result.score}%</p>
        <ul className="mt-2 space-y-1">{result.checks.map(check => <li key={check.id} style={{ color: check.ok ? "var(--success)" : "var(--danger)" }}>{check.ok ? "✓ " : "✕ "}{checkLabel(check.label, lang, rt)}</li>)}</ul>
        {(!result.mandatoryOk || result.score < minimumScore) && <p className="mt-2">{tp("Исправь пропуски и проверь ещё раз.", "Correct the missing elements and check again.", "Uzupełnij brakujące elementy i sprawdź ponownie.")}</p>}
      </div>}
      {allowLinePractice && !hideScript && <button type="button" data-testid="voice-line" onClick={nextLine} disabled={linesRead >= lines.length} className="mt-3 min-h-[44px] rounded-xl border px-4 text-sm font-semibold disabled:opacity-40" style={{ borderColor: "var(--border-subtle)", color: "var(--text-secondary)" }}>{tp("Репетиция: следующая строка", "Rehearsal: next line", "Próba: kolejna linia")} ({linesRead}/{lines.length})</button>}
    </div>
  );
});
export default OfflineVoicePtt;
