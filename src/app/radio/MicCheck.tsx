'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useI18n } from '@/lib/i18n';

// ============================================================================
// MicCheck - browser microphone tester.
//
// A bouncing level meter proves the microphone is WIRED UP. It does not prove
// the model can UNDERSTAND you through it - and those are different failures. A
// learner with a lively meter and an unusable microphone (too far, too much
// gain, a fan behind them) found that out only when their MAYDAY scored zero and
// they had no idea why.
//
// So the check now has a second half: say a line, and it shows you back exactly
// what the model heard. If the words on screen are your words, the voice trainer
// will work. If they are not, you know before it matters.
//
// Handles the real failure modes: no permission, no device, insecure (non-HTTPS)
// context, and no API key (falls back to the meter alone).
// ============================================================================

type Status = 'idle' | 'requesting' | 'live' | 'denied' | 'noDevice' | 'insecure' | 'error';

const SEGMENTS = 22;
/** RMS level above this (0..1) counts as "we heard you". */
const HEARD_THRESHOLD = 0.1;
/** long enough for a radio check, short enough that nobody waits */
const SAY_MS = 6000;

/** the line we ask for - it is also the first thing they will say for real */
const SAY_LINE = 'MARINA GDYNIA, THIS IS WIND DANCER, RADIO CHECK, OVER';

export default function MicCheck({
  compact = false, onTranscript,
}: {
  compact?: boolean;
  /** the guide/simulator uses this to put the words in the Dziennik */
  onTranscript?: (text: string) => void;
}) {
  const { tp } = useI18n();
  const [status, setStatus] = useState<Status>('idle');
  const [level, setLevel] = useState(0);
  const [peak, setPeak] = useState(0);
  const [heard, setHeard] = useState(false);
  const [device, setDevice] = useState('');

  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [sttOff, setSttOff] = useState(false);
  const [sttError, setSttError] = useState<string | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const stopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stop = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    void ctxRef.current?.close().catch(() => {});
    ctxRef.current = null;
    setLevel(0);
    setPeak(0);
  }, []);

  const start = useCallback(async () => {
    setHeard(false);
    setStatus('requesting');
    if (typeof window === 'undefined') return;
    if (!window.isSecureContext) { setStatus('insecure'); return; }
    const md = navigator.mediaDevices;
    if (!md?.getUserMedia) { setStatus('noDevice'); return; }
    try {
      const stream = await md.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      streamRef.current = stream;
      setDevice(stream.getAudioTracks()[0]?.label ?? '');

      type AudioWindow = Window & { webkitAudioContext?: typeof AudioContext };
      const Ctor = window.AudioContext ?? (window as AudioWindow).webkitAudioContext;
      if (!Ctor) { setStatus('error'); return; }
      const ctx = new Ctor();
      ctxRef.current = ctx;
      void ctx.resume?.();
      const srcNode = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      srcNode.connect(analyser);
      const buf = new Uint8Array(analyser.fftSize);

      setStatus('live');
      let peakHold = 0;
      const loop = () => {
        analyser.getByteTimeDomainData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) { const v = (buf[i] - 128) / 128; sum += v * v; }
        const rms = Math.sqrt(sum / buf.length);
        const lvl = Math.min(1, rms * 3.2); // scale a speaking voice toward full-ish
        setLevel(lvl);
        peakHold = Math.max(peakHold * 0.92, lvl);
        setPeak(peakHold);
        if (lvl > HEARD_THRESHOLD) setHeard(true);
        rafRef.current = requestAnimationFrame(loop);
      };
      rafRef.current = requestAnimationFrame(loop);
    } catch (err) {
      const name = err instanceof DOMException ? err.name : '';
      if (name === 'NotAllowedError' || name === 'SecurityError' || name === 'PermissionDeniedError') setStatus('denied');
      else if (name === 'NotFoundError' || name === 'OverconstrainedError' || name === 'DevicesNotFoundError') setStatus('noDevice');
      else setStatus('error');
    }
  }, []);

  /**
   * Record a few seconds and show what the model heard. This is the half of the
   * check that actually matters: the meter says "sound is arriving", this says
   * "the words are arriving".
   */
  const sayIt = useCallback(() => {
    const stream = streamRef.current;
    if (!stream || recording || busy) return;
    setTranscript(null);
    setSttError(null);

    let rec: MediaRecorder;
    try {
      rec = new MediaRecorder(stream);
    } catch {
      setSttError(tp('Браузер не умеет записывать звук.', 'This browser cannot record audio.', 'Ta przegladarka nie potrafi nagrywac dzwieku.'));
      return;
    }
    recRef.current = rec;
    chunksRef.current = [];

    rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    rec.onstop = async () => {
      setRecording(false);
      const blob = new Blob(chunksRef.current, { type: rec.mimeType || 'audio/webm' });
      if (blob.size === 0) return;
      setBusy(true);
      try {
        const fd = new FormData();
        fd.append('audio', blob, 'check.webm');
        const res = await fetch('/api/radio-transcribe', { method: 'POST', body: fd });
        const data = (await res.json()) as { transcript?: string; fallback?: boolean; error?: string };
        if (data.fallback) { setSttOff(true); return; }
        if (!res.ok || data.error) {
          setSttError(data.error ?? tp('Не удалось распознать речь.', 'Could not transcribe.', 'Nie udalo sie rozpoznac mowy.'));
          return;
        }
        const text = (data.transcript ?? '').trim();
        setTranscript(text);
        if (text) onTranscript?.(text);
      } catch {
        setSttError(tp('Нет связи с сервером распознавания.', 'The transcription service is unreachable.', 'Brak polaczenia z serwerem rozpoznawania.'));
      } finally {
        setBusy(false);
      }
    };

    rec.start();
    setRecording(true);
    stopTimer.current = setTimeout(() => {
      try { rec.stop(); } catch { /* already stopped */ }
    }, SAY_MS);
  }, [busy, onTranscript, recording, tp]);

  const stopSaying = useCallback(() => {
    if (stopTimer.current) clearTimeout(stopTimer.current);
    stopTimer.current = null;
    try { recRef.current?.stop(); } catch { /* already stopped */ }
  }, []);

  useEffect(() => () => { stopSaying(); stop(); }, [stop, stopSaying]);

  const lit = Math.round(level * SEGMENTS);
  const peakSeg = Math.round(peak * SEGMENTS);

  const help: Record<Exclude<Status, 'idle' | 'requesting' | 'live'>, string> = {
    denied: tp(
      'Доступ к микрофону запрещён. Нажми на значок замка (или камеры) слева в адресной строке, разреши микрофон и обнови страницу.',
      'Microphone blocked. Click the lock (or camera) icon in the address bar, allow the microphone and reload.',
      'Dostep do mikrofonu zablokowany. Kliknij ikone klodki (lub kamery) w pasku adresu, zezwol na mikrofon i odswiez strone.',
    ),
    noDevice: tp(
      'Микрофон не найден. Подключи микрофон или гарнитуру и попробуй снова.',
      'No microphone found. Connect a mic or headset and try again.',
      'Nie znaleziono mikrofonu. Podlacz mikrofon lub sluchawki i sprobuj ponownie.',
    ),
    insecure: tp(
      'Микрофон работает только по HTTPS. На weektoregatta.com всё в порядке; по локальному http браузер не даст доступ.',
      'The microphone only works over HTTPS. It is fine on weektoregatta.com; a plain http page is blocked by the browser.',
      'Mikrofon dziala tylko przez HTTPS. Na weektoregatta.com jest OK; zwykla strona http jest blokowana przez przegladarke.',
    ),
    error: tp('Не удалось получить доступ к микрофону.', 'Could not access the microphone.', 'Nie udalo sie uzyskac dostepu do mikrofonu.'),
  };

  return (
    <div data-testid="mic-check" className="rounded-2xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
      {!compact && (
        <div className="mb-2 text-sm font-semibold" style={{ color: 'var(--accent-cyan)' }}>
          🎤 {tp('Проверка микрофона', 'Microphone check', 'Sprawdzenie mikrofonu')}
        </div>
      )}

      {status === 'live' ? (
        <>
          {/* live level meter */}
          <div className="flex items-center gap-[3px]" aria-label="input level" data-testid="mic-meter">
            {Array.from({ length: SEGMENTS }, (_, i) => {
              const on = i < lit;
              const isPeak = i === peakSeg - 1 && peakSeg > lit;
              const color = i > SEGMENTS * 0.82 ? 'var(--danger)' : i > SEGMENTS * 0.6 ? 'var(--warning)' : 'var(--success)';
              return (
                <span
                  key={i}
                  className="h-6 flex-1 rounded-sm"
                  style={{
                    background: on ? color : isPeak ? color : 'var(--bg-secondary)',
                    opacity: on ? 1 : isPeak ? 0.5 : 0.4,
                    transition: 'opacity 40ms linear',
                  }}
                />
              );
            })}
          </div>
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="text-sm" style={{ color: heard ? 'var(--success)' : 'var(--text-secondary)' }}>
              {heard
                ? tp('Отлично, слышу твой голос! Микрофон работает.', 'Great - I can hear your voice! The mic works.', 'Swietnie - slysze Twoj glos! Mikrofon dziala.')
                : tp('Скажи что-нибудь - полоска должна двигаться.', 'Say something - the bar should move.', 'Powiedz cos - pasek powinien sie ruszac.')}
            </span>
            <button
              type="button"
              data-testid="mic-stop"
              onClick={stop}
              className="min-h-[36px] shrink-0 rounded-lg px-3 text-xs"
              style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}
            >
              {tp('Стоп', 'Stop', 'Stop')}
            </button>
          </div>
          {device && <div className="mt-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>{tp('Устройство', 'Device', 'Urzadzenie')}: {device}</div>}

          {/* Half two: does the MODEL understand you? A moving bar and an
              unusable microphone look identical until a MAYDAY scores zero. */}
          <div className="mt-3 rounded-xl p-3" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
            <div className="mb-1 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              {tp('Теперь проверим, понимает ли тебя модель', 'Now check that the model understands you', 'Teraz sprawdzmy, czy model cie rozumie')}
            </div>
            <pre className="mb-2 overflow-x-auto rounded-lg p-2 text-xs" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}>
{SAY_LINE}
            </pre>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                data-testid="mic-say"
                onClick={recording ? stopSaying : sayIt}
                disabled={busy}
                className="min-h-[40px] rounded-lg px-3 text-sm font-semibold disabled:opacity-50"
                style={recording
                  ? { background: 'var(--danger)', color: '#fff' }
                  : { background: 'var(--accent-cyan)', color: 'var(--accent-ink, #04222e)' }}
              >
                {busy
                  ? tp('Слушаю...', 'Listening...', 'Slucham...')
                  : recording
                    ? tp('⏹ Стоп', '⏹ Stop', '⏹ Stop')
                    : tp('🔴 Сказать это', '🔴 Say it', '🔴 Powiedz to')}
              </button>
              {recording && (
                <span className="text-xs" style={{ color: 'var(--hl-amber, #ffce4d)' }}>
                  {tp('Говори... запись до 6 секунд', 'Speak... recording for up to 6 seconds', 'Mow... nagrywam do 6 sekund')}
                </span>
              )}
            </div>

            {sttOff && (
              <p className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                {tp(
                  'Распознавание речи сейчас недоступно. Микрофон при этом проверен - полоска двигается.',
                  'Speech recognition is unavailable right now. The microphone itself is fine - the bar moves.',
                  'Rozpoznawanie mowy jest teraz niedostepne. Sam mikrofon jest sprawny - pasek sie rusza.',
                )}
              </p>
            )}
            {sttError && (
              <p className="mt-2 text-xs" style={{ color: 'var(--danger)' }}>{sttError}</p>
            )}

            {transcript !== null && (
              <div data-testid="mic-transcript" className="mt-2">
                <div className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                  {tp('Модель услышала', 'The model heard', 'Model uslyszal')}
                </div>
                {transcript ? (
                  <p className="mt-0.5 text-sm font-medium" style={{ color: 'var(--success)' }}>
                    &quot;{transcript}&quot;
                  </p>
                ) : (
                  <p className="mt-0.5 text-sm" style={{ color: 'var(--danger)' }}>
                    {tp(
                      'Ничего. Говори громче и ближе к микрофону, убери фоновый шум.',
                      'Nothing. Speak louder and closer to the mic, and kill the background noise.',
                      'Nic. Mow glosniej i blizej mikrofonu, wycisz halas w tle.',
                    )}
                  </p>
                )}
                <p className="mt-1 text-[11px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                  {tp(
                    'Если это твои слова - голосовой тренажёр будет работать. Если нет - на экзаменационной передаче будет то же самое, только там это будет стоить баллов.',
                    'If those are your words, the voice trainer will work. If they are not, the same thing will happen to your exam transmission - only there it costs points.',
                    'Jesli to twoje slowa - trening glosowy zadziala. Jesli nie - to samo stanie sie z nadaniem egzaminacyjnym, tylko tam bedzie to kosztowac punkty.',
                  )}
                </p>
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          <button
            type="button"
            data-testid="mic-start"
            onClick={start}
            disabled={status === 'requesting'}
            className="min-h-[44px] rounded-xl px-4 text-sm font-semibold transition active:scale-95 disabled:opacity-60"
            style={{ background: 'var(--accent-cyan)', color: 'var(--accent-ink, #04222e)' }}
          >
            {status === 'requesting'
              ? tp('Запрашиваю доступ...', 'Requesting access...', 'Prosze o dostep...')
              : tp('🎤 Проверить микрофон', '🎤 Test the microphone', '🎤 Sprawdz mikrofon')}
          </button>
          {status !== 'idle' && status !== 'requesting' && (
            <div className="mt-2 text-sm" style={{ color: 'var(--danger, #ff6a5a)' }}>
              {help[status]}
            </div>
          )}
          {!compact && status === 'idle' && (
            <p className="mt-2 text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              {tp(
                'Браузер спросит разрешение на микрофон - нажми «Разрешить». Затем скажи «раз-два» и увидишь, как двигается индикатор. Это нужно для голосовой оценки MAYDAY в симуляторе.',
                'The browser will ask for microphone permission - click "Allow". Then say "one-two" and watch the meter move. This is what the simulator uses to grade your voice MAYDAY.',
                'Przegladarka poprosi o dostep do mikrofonu - kliknij "Zezwol". Powiedz "raz-dwa" i zobacz, jak rusza sie wskaznik. Tego uzywa symulator do oceny MAYDAY glosem.',
              )}
            </p>
          )}
        </>
      )}
    </div>
  );
}
