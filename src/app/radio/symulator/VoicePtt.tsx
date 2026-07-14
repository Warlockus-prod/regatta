'use client';

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import type { VoiceSpec } from './scenarios';
import MicCheck from '../MicCheck';

type VoiceKind = VoiceSpec['kind'];

// ============================================================================
// Voice transmission panel for a scenario step. Two ways to complete it:
//  1) step-through: each "PTT" click reads the next line of the message
//     (works everywhere, no mic needed);
//  2) real voice: hold the record button, speak the whole message, release -
//     audio goes to /api/radio-voice (Whisper) and comes back graded against
//     a deterministic checklist.
// ============================================================================

export interface VoiceResult {
  transcript: string;
  checks: { id: string; label: string; ok: boolean }[];
  score: number;
}

interface Props {
  kind: VoiceKind;
  /** already-rendered lines for this scenario variant. */
  lines: string[];
  /** which vessel identity the grader should expect (index into VESSEL_POOL). */
  vesselIdx: number;
  positionIdx: number;
  pob: number;
  /** 'ru' shows RU helper copy; PL otherwise (language policy). */
  ru: boolean;
  /** exam integrity: hide the scripted lines, the user must speak from memory. */
  hideScript?: boolean;
  allowLinePractice?: boolean;
  minimumScore?: number;
  onComplete: (result: VoiceResult | null) => void;
}

export interface VoicePttHandle {
  startRecording: () => void;
  stopRecording: () => void;
}

const MAX_RECORD_MS = 45_000;

const VoicePtt = forwardRef<VoicePttHandle, Props>(function VoicePtt({
  kind, lines, vesselIdx, positionIdx, pob, ru, hideScript = false,
  allowLinePractice = true, minimumScore = 70, onComplete,
}, ref) {
  const [linesRead, setLinesRead] = useState(0);
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<VoiceResult | null>(null);
  const [voiceUnavailable, setVoiceUnavailable] = useState(false);
  const [showMicCheck, setShowMicCheck] = useState(false);

  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const stopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const doneRef = useRef(false);
  /** true while the PTT is physically held - getUserMedia resolves async and
   *  must not start a recording whose button was already released. */
  const wantRecording = useRef(false);
  const starting = useRef(false);

  const finish = useCallback((r: VoiceResult | null) => {
    if (doneRef.current) return;
    doneRef.current = true;
    onComplete(r);
  }, [onComplete]);

  // --- step-through mode -----------------------------------------------------
  const readNext = useCallback(() => {
    setLinesRead((n) => {
      const next = Math.min(lines.length, n + 1);
      if (next === lines.length) setTimeout(() => finish(null), 400);
      return next;
    });
  }, [lines.length, finish]);

  // --- real voice mode ---------------------------------------------------------
  const stopRecording = useCallback(() => {
    wantRecording.current = false;
    if (stopTimer.current) clearTimeout(stopTimer.current);
    const rec = mediaRef.current;
    if (rec && rec.state !== 'inactive') rec.stop();
    setRecording(false);
  }, []);

  const startRecording = useCallback(async () => {
    // Reentrancy + release-before-grant guards (permission prompt race).
    if (busy || starting.current || mediaRef.current?.state === 'recording') return;
    starting.current = true;
    wantRecording.current = true;
    if (stopTimer.current) clearTimeout(stopTimer.current);
    setError(null);
    setResult(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!wantRecording.current) {
        // The button was released while the permission prompt was up - do not
        // start a phantom recording; free the mic immediately.
        stream.getTracks().forEach((t) => t.stop());
        starting.current = false;
        return;
      }
      const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : '';
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      rec.ondataavailable = (ev) => { if (ev.data.size > 0) chunksRef.current.push(ev.data); };
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || 'audio/webm' });
        if (blob.size < 4000) { setError(ru ? 'Слишком короткая запись.' : 'Nagranie za krotkie.'); return; }
        setBusy(true);
        try {
          const fd = new FormData();
          fd.append('audio', blob, 'ptt');
          fd.append('kind', kind);
          fd.append('vessel', String(vesselIdx));
          fd.append('position', String(positionIdx));
          fd.append('pob', String(pob));
          const res = await fetch('/api/radio-voice', { method: 'POST', body: fd });
          const data = await res.json();
          if (data.fallback) {
            setVoiceUnavailable(true);
            setError(allowLinePractice
              ? (ru ? 'Голосовой режим недоступен - пройди передачу по строкам.' : 'Tryb glosowy niedostepny - przejdz transmisje liniami.')
              : (ru ? 'Голосовой экзамен сейчас недоступен.' : 'Egzamin glosowy jest teraz niedostepny.'));
            return;
          }
          if (!res.ok) {
            setError(data.error || (ru ? 'Ошибка оценки.' : 'Blad oceny.'));
            return;
          }
          const r = data as VoiceResult;
          setResult(r);
          if (r.score >= minimumScore) finish(r);
          else setError(ru ? `Нужно минимум ${minimumScore}%. Повтори передачу.` : `Wymagane minimum ${minimumScore}%. Powtorz transmisje.`);
        } catch {
          setError(ru ? 'Сеть недоступна.' : 'Brak polaczenia.');
        } finally {
          setBusy(false);
        }
      };
      mediaRef.current = rec;
      rec.start();
      if (!wantRecording.current) { rec.stop(); starting.current = false; return; }
      setRecording(true);
      stopTimer.current = setTimeout(stopRecording, MAX_RECORD_MS);
    } catch {
      setVoiceUnavailable(true);
      setError(allowLinePractice
        ? (ru ? 'Нет доступа к микрофону - пройди передачу по строкам.' : 'Brak dostepu do mikrofonu - przejdz transmisje liniami.')
        : (ru ? 'Нет доступа к микрофону. Голосовой экзамен нельзя завершить.' : 'Brak dostepu do mikrofonu. Nie mozna ukonczyc egzaminu glosowego.'));
    } finally {
      starting.current = false;
    }
  }, [allowLinePractice, busy, kind, minimumScore, pob, positionIdx, vesselIdx, ru, stopRecording, finish]);

  useImperativeHandle(ref, () => ({
    startRecording: () => { void startRecording(); },
    stopRecording,
  }), [startRecording, stopRecording]);

  useEffect(() => () => {
    if (stopTimer.current) clearTimeout(stopTimer.current);
    const rec = mediaRef.current;
    if (rec && rec.state !== 'inactive') rec.stop();
  }, []);

  return (
    <div data-testid="voice-panel" className="rounded-2xl p-4" style={{ background: 'rgba(0,212,255,0.06)', border: '1px solid rgba(0,212,255,0.25)' }}>
      <div className="mb-2 text-sm font-semibold" style={{ color: 'var(--accent-cyan)' }}>
        🎙️ {ru ? 'Передача голосом - канал открыт' : 'Transmisja glosem - kanal otwarty'}
      </div>

      {!hideScript ? (
        <ol className="mb-3 space-y-0.5 font-mono text-xs leading-relaxed">
          {lines.map((line, i) => (
            <li key={i} style={{ color: i < linesRead ? 'var(--success)' : 'var(--text-secondary)', opacity: i < linesRead ? 1 : 0.85 }}>
              {i < linesRead ? '✓ ' : '· '}{line}
            </li>
          ))}
        </ol>
      ) : (
        <p className="mb-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
          {ru ? `Экзамен: сценарий скрыт. Удерживай физическую PTT и передай сообщение с памяти. Проходной балл ${minimumScore}%.` : `Egzamin: tekst jest ukryty. Trzymaj fizyczny PTT i nadaj komunikat z pamieci. Prog zaliczenia ${minimumScore}%.`}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {allowLinePractice && (
          <button
            type="button"
            data-testid="voice-line"
            onClick={readNext}
            disabled={linesRead >= lines.length}
            className="min-h-[44px] rounded-xl px-4 text-sm font-semibold transition active:scale-95 disabled:opacity-40"
            style={{ background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}
          >
            {ru ? 'Репетиция: следующая строка' : 'Proba: kolejna linia'} ({linesRead}/{lines.length})
          </button>
        )}
        <div data-testid="voice-record-status" className="min-h-[44px] flex-1 rounded-xl px-4 py-3 text-center text-sm font-bold" style={{ background: recording ? '#a81f14' : 'var(--bg-secondary)', color: recording ? '#fff' : 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}>
          {busy ? (ru ? 'Оцениваю передачу...' : 'Oceniam transmisje...') : recording ? (ru ? 'ЗАПИСЬ: говори и отпусти PTT' : 'NAGRYWANIE: mow i pusc PTT') : voiceUnavailable ? (ru ? 'Голосовой режим недоступен' : 'Tryb glosowy niedostepny') : (ru ? 'Удерживай PTT на рации' : 'Trzymaj PTT na radiu')}
        </div>
      </div>

      {error && <div className="mt-2 text-xs" style={{ color: 'var(--danger, #ff6a5a)' }}>{error}</div>}

      {/* mic check - lets the user verify the browser hears them before/after
          a failed recording, and diagnose permission problems */}
      <button
        type="button"
        data-testid="voice-miccheck-toggle"
        onClick={() => setShowMicCheck((v) => !v)}
        className="mt-2 text-xs underline"
        style={{ color: 'var(--text-muted)' }}
      >
        {ru ? (showMicCheck ? 'Скрыть проверку микрофона' : 'Проверить микрофон') : (showMicCheck ? 'Ukryj sprawdzenie mikrofonu' : 'Sprawdz mikrofon')}
      </button>
      {showMicCheck && <div className="mt-2"><MicCheck compact /></div>}

      {result && (
        <div data-testid="voice-result" className="mt-3 rounded-xl p-3" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold" style={{ color: result.score >= 70 ? 'var(--success)' : result.score >= 40 ? 'var(--warning)' : 'var(--danger, #ff6a5a)' }}>
              {result.score}%
            </span>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{ru ? 'структура сообщения (Whisper)' : 'struktura komunikatu (Whisper)'}</span>
          </div>
          <ul className="mt-2 space-y-0.5 text-xs">
            {result.checks.map((c) => (
              <li key={c.id} style={{ color: c.ok ? 'var(--success)' : 'var(--danger, #ff6a5a)' }}>
                {c.ok ? '✓' : '✗'} {c.label}
              </li>
            ))}
          </ul>
          <div className="mt-2 text-xs italic" style={{ color: 'var(--text-muted)' }}>
            &quot;{result.transcript.slice(0, 300)}&quot;
          </div>
        </div>
      )}
    </div>
  );
});

export default VoicePtt;
