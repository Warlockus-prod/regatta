'use client';

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import type { VoiceSpec } from './scenarios';
import MicCheck from '../MicCheck';
import { checkLabel, fmt, useTrainerI18n } from './trainerText';

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
  checks: { id: string; label: string; ok: boolean; mandatory?: boolean }[];
  score: number;
  /** false when a defining element (MAYDAY/PAN-PAN/SECURITE/RELAY/RECEIVED/CANCEL)
   *  was missing: a fail regardless of the percentage. */
  mandatoryOk?: boolean;
}

interface Props {
  kind: VoiceKind;
  /** already-rendered lines for this scenario variant. */
  lines: string[];
  /** which vessel identity the grader should expect (index into VESSEL_POOL). */
  vesselIdx: number;
  /** index into the venue's positions */
  positionIdx: number;
  pob: number;
  /** the run's venue id (venues.ts): which stations and positions to grade against */
  venue?: string;
  /** on the RU site: true shows the RU helper copy, false the Polish (language
   *  policy); every other site language gets its own copy */
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
  kind, lines, vesselIdx, positionIdx, pob, venue = 'gdansk', ru, hideScript = false,
  allowLinePractice = true, minimumScore = 70, onComplete,
}, ref) {
  const { tp: ttp, lang } = useTrainerI18n();
  // the RU site with Polish explanations keeps the Polish copy
  const t = useCallback((ruText: string, en: string, pl: string) => (lang === 'ru' && !ru ? pl : ttp(ruText, en, pl)), [lang, ru, ttp]);
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
  /** false once this panel unmounts. A recording that stops during teardown must
   *  not upload or grade: the page would run the grade against whatever scenario
   *  mounted after this one, advancing B with A's result. */
  const aliveRef = useRef(true);

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
        // Unmounted mid-grade (e.g. left scenario A, opened B): do not burn one of
        // the user's recordings on an upload, and do not call onComplete - it would
        // advance whatever scenario is active now with this aborted attempt.
        if (!aliveRef.current) return;
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || 'audio/webm' });
        if (blob.size < 4000) { setError(t('Слишком короткая запись.', 'The recording is too short.', 'Nagranie za krótkie.')); return; }
        setBusy(true);
        try {
          const fd = new FormData();
          fd.append('audio', blob, 'ptt');
          fd.append('kind', kind);
          fd.append('vessel', String(vesselIdx));
          fd.append('position', String(positionIdx));
          fd.append('pob', String(pob));
          fd.append('venue', venue);
          const res = await fetch('/api/radio-voice', { method: 'POST', body: fd });
          const data = await res.json();
          if (data.fallback) {
            setVoiceUnavailable(true);
            setError(allowLinePractice
              ? t('Голосовой режим недоступен - пройди передачу по строкам.', 'Voice mode is unavailable - go through the transmission line by line.', 'Tryb głosowy niedostępny - przejdź transmisję liniami.')
              : t('Голосовой экзамен сейчас недоступен.', 'The voice exam is unavailable right now.', 'Egzamin głosowy jest teraz niedostępny.'));
            return;
          }
          if (res.status === 429) {
            // Our own words, in the learner's language: the server text is a
            // Polish fallback for other clients and says nothing to a RU user.
            const mins = Math.max(1, Math.ceil((Number(data.retryAfterSec) || 0) / 60));
            const hours = Math.ceil(mins / 60);
            setError(mins > 90
              ? fmt(t('Лимит попыток исчерпан. Попробуй снова через {n} ч.', 'Attempt limit reached. Try again in {n} h.', 'Limit prób wyczerpany. Spróbuj ponownie za {n} godz.'), { n: hours })
              : fmt(t('Лимит попыток исчерпан. Попробуй снова через {n} мин.', 'Attempt limit reached. Try again in {n} min.', 'Limit prób wyczerpany. Spróbuj ponownie za {n} min.'), { n: mins }));
            return;
          }
          if (!res.ok) {
            setError(data.error || t('Ошибка оценки.', 'Grading failed.', 'Błąd oceny.'));
            return;
          }
          const r = data as VoiceResult;
          setResult(r);
          // A missing defining signal (MAYDAY / PAN-PAN / SECURITE ...) fails the
          // transmission outright, no matter how high the percentage: the one word
          // the whole call exists for cannot be traded for supporting details.
          const missing = r.mandatoryOk === false ? r.checks.find((c) => c.mandatory && !c.ok) : undefined;
          if (missing) {
            setError(fmt(t(
              'Пропущен обязательный элемент: {item}. Без него передача не засчитывается.',
              'A mandatory element is missing: {item}. Without it the transmission does not count.',
              'Brak elementu obowiązkowego: {item}. Bez niego transmisja nie liczy się.',
            ), { item: checkLabel(missing.label, lang) }));
          } else if (r.score >= minimumScore) {
            finish(r);
          } else {
            setError(fmt(t('Нужно минимум {n}%. Повтори передачу.', 'At least {n}% is required. Repeat the transmission.', 'Wymagane minimum {n}%. Powtórz transmisję.'), { n: minimumScore }));
          }
        } catch {
          setError(t('Сеть недоступна.', 'No connection.', 'Brak połączenia.'));
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
        ? t('Нет доступа к микрофону - пройди передачу по строкам.', 'No access to the microphone - go through the transmission line by line.', 'Brak dostępu do mikrofonu - przejdź transmisję liniami.')
        : t('Нет доступа к микрофону. Голосовой экзамен нельзя завершить.', 'No access to the microphone. The voice exam cannot be finished.', 'Brak dostępu do mikrofonu. Nie można ukończyć egzaminu głosowego.'));
    } finally {
      starting.current = false;
    }
  }, [allowLinePractice, busy, kind, lang, minimumScore, pob, positionIdx, venue, vesselIdx, t, stopRecording, finish]);

  useImperativeHandle(ref, () => ({
    startRecording: () => { void startRecording(); },
    stopRecording,
  }), [startRecording, stopRecording]);

  useEffect(() => () => {
    aliveRef.current = false;
    if (stopTimer.current) clearTimeout(stopTimer.current);
    const rec = mediaRef.current;
    if (rec && rec.state !== 'inactive') rec.stop();
  }, []);

  return (
    <div data-testid="voice-panel" className="rounded-2xl p-4" style={{ background: 'rgba(0,212,255,0.06)', border: '1px solid rgba(0,212,255,0.25)' }}>
      <div className="mb-2 text-sm font-semibold" style={{ color: 'var(--accent-cyan)' }}>
        🎙️ {t('Передача голосом - канал открыт', 'Voice transmission - the channel is open', 'Transmisja głosem - kanał otwarty')}
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
          {fmt(t(
            'Экзамен: сценарий скрыт. Удерживай физическую PTT и передай сообщение с памяти. Проходной балл {n}%.',
            'Exam: the script is hidden. Hold the PTT on the radio and send the message from memory. Pass mark {n}%.',
            'Egzamin: tekst jest ukryty. Trzymaj fizyczny PTT i nadaj komunikat z pamięci. Próg zaliczenia {n}%.',
          ), { n: minimumScore })}
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
            {t('Репетиция: следующая строка', 'Practice: next line', 'Próba: kolejna linia')} ({linesRead}/{lines.length})
          </button>
        )}
        <div data-testid="voice-record-status" aria-live="polite" className="min-h-[44px] flex-1 rounded-xl px-4 py-3 text-center text-sm font-bold" style={{ background: recording ? '#a81f14' : 'var(--bg-secondary)', color: recording ? '#fff' : 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}>
          {busy
            ? t('Оцениваю передачу...', 'Grading the transmission...', 'Oceniam transmisję...')
            : recording
              ? t('ЗАПИСЬ: говори и отпусти PTT', 'RECORDING: speak, then release PTT', 'NAGRYWANIE: mów i puść PTT')
              : voiceUnavailable
                ? t('Голосовой режим недоступен', 'Voice mode is unavailable', 'Tryb głosowy niedostępny')
                : t('Удерживай PTT на рации', 'Hold PTT on the radio', 'Trzymaj PTT na radiu')}
        </div>
      </div>

      {error && <div role="alert" className="mt-2 text-xs" style={{ color: 'var(--danger, #ff6a5a)' }}>{error}</div>}

      {/* Exam mode has no line-practice fallback, so a denied/absent mic or an
          offline grader used to strand the whole run: onComplete never fired and
          the only exit discarded everything. Let the candidate close the voice
          step with a scored-zero verdict instead. Learn mode keeps its line
          practice, so this button never shows there. */}
      {voiceUnavailable && !allowLinePractice && (
        <button
          type="button"
          data-testid="voice-exam-skip"
          onClick={() => finish({
            transcript: '',
            checks: [{
              id: 'voice-not-transmitted',
              label: t('Голосовая передача не отправлена', 'The voice transmission was not sent', 'Transmisja głosowa nie została nadana'),
              ok: false,
              mandatory: true,
            }],
            score: 0,
            mandatoryOk: false,
          })}
          className="mt-2 min-h-[44px] rounded-xl px-4 text-sm font-semibold"
          style={{ background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}
        >
          {t('Закончить без голосовой передачи', 'Finish without the voice transmission', 'Zakończ bez transmisji głosowej')}
        </button>
      )}

      {/* mic check - lets the user verify the browser hears them before/after
          a failed recording, and diagnose permission problems */}
      <button
        type="button"
        data-testid="voice-miccheck-toggle"
        onClick={() => setShowMicCheck((v) => !v)}
        className="mt-2 inline-flex min-h-[44px] items-center px-1 text-xs underline"
        style={{ color: 'var(--text-muted)' }}
      >
        {showMicCheck
          ? t('Скрыть проверку микрофона', 'Hide the microphone check', 'Ukryj sprawdzenie mikrofonu')
          : t('Проверить микрофон', 'Check the microphone', 'Sprawdź mikrofon')}
      </button>
      {showMicCheck && <div className="mt-2"><MicCheck compact /></div>}

      {result && (
        <div data-testid="voice-result" aria-live="polite" className="mt-3 rounded-xl p-3" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold" style={{ color: result.score >= 70 ? 'var(--success)' : result.score >= 40 ? 'var(--warning)' : 'var(--danger, #ff6a5a)' }}>
              {result.score}%
            </span>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{t('структура сообщения (Whisper)', 'message structure (Whisper)', 'struktura komunikatu (Whisper)')}</span>
          </div>
          <ul className="mt-2 space-y-0.5 text-xs">
            {result.checks.map((c) => (
              <li key={c.id} style={{ color: c.ok ? 'var(--success)' : 'var(--danger, #ff6a5a)' }}>
                {c.ok ? '✓' : '✗'} {checkLabel(c.label, lang)}
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
