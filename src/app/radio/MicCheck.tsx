'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useI18n } from '@/lib/i18n';

// ============================================================================
// MicCheck - browser microphone tester. Requests permission, then shows a
// LIVE input-level meter so the user can literally see their voice being
// picked up before using the simulator's voice grading. Handles the real
// failure modes: no permission, no device, insecure (non-HTTPS) context.
// Used on the radio guide page and inside the simulator's voice panel.
// ============================================================================

type Status = 'idle' | 'requesting' | 'live' | 'denied' | 'noDevice' | 'insecure' | 'error';

const SEGMENTS = 22;
/** RMS level above this (0..1) counts as "we heard you". */
const HEARD_THRESHOLD = 0.1;

export default function MicCheck({ compact = false }: { compact?: boolean }) {
  const { tp } = useI18n();
  const [status, setStatus] = useState<Status>('idle');
  const [level, setLevel] = useState(0);
  const [peak, setPeak] = useState(0);
  const [heard, setHeard] = useState(false);
  const [device, setDevice] = useState('');

  const streamRef = useRef<MediaStream | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);

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

  useEffect(() => () => stop(), [stop]);

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
              const color = i > SEGMENTS * 0.82 ? '#ff5566' : i > SEGMENTS * 0.6 ? '#ffd24a' : '#44ff88';
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
        </>
      ) : (
        <>
          <button
            type="button"
            data-testid="mic-start"
            onClick={start}
            disabled={status === 'requesting'}
            className="min-h-[44px] rounded-xl px-4 text-sm font-semibold transition active:scale-95 disabled:opacity-60"
            style={{ background: 'var(--accent-cyan)', color: '#04222e' }}
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
