'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { useSternikPrefs } from '../../sternik/prefs';
import { fetchStationVoice } from '../symulator/audio/stationVoice';
import { record as recordWeak } from '../weakSpots';
import {
  POSITIONS, POS_RULES_PL, POS_RULES_RU, gradePosition,
  type PosCheck, type PosItem,
} from './drillData';

// ============================================================================
// Say the position out loud. Eight of them, each a different way to get it wrong.
//
// A position is the one thing on a radio that CANNOT be approximate. Everything
// else in a distress call can be recovered by asking again; a position that came
// through as 54 instead of FIVE FOUR sends the lifeboat to the wrong sea.
// ============================================================================

type Phase = 'idle' | 'recording' | 'grading' | 'graded';

export default function PositionDrill() {
  const { tp, lang } = useI18n();
  const { explLang } = useSternikPrefs();
  const showRu = lang === 'ru' && explLang !== 'pl';

  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>('idle');
  const [heard, setHeard] = useState<string | null>(null);
  const [checks, setChecks] = useState<PosCheck[] | null>(null);
  const [score, setScore] = useState(0);
  const [sttOff, setSttOff] = useState(false);
  const [reveal, setReveal] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [cleared, setCleared] = useState<string[]>([]);

  const recRef = useRef<MediaRecorder | null>(null);
  const chunks = useRef<BlobPart[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const item: PosItem = POSITIONS[idx];

  const reset = useCallback(() => {
    setPhase('idle');
    setHeard(null);
    setChecks(null);
    setScore(0);
    setReveal(false);
  }, []);

  const go = useCallback((n: number) => {
    setIdx(((n % POSITIONS.length) + POSITIONS.length) % POSITIONS.length);
    reset();
  }, [reset]);

  /** the model reading, spoken. Plain playback: there is no receiver in this drill. */
  const playModel = useCallback(async () => {
    if (playing) return;
    setPlaying(true);
    try {
      const raw = await fetchStationVoice(item.say);
      if (!raw) { setSttOff(true); return; }
      const url = URL.createObjectURL(new Blob([raw], { type: 'audio/mpeg' }));
      const a = new Audio(url);
      audioRef.current = a;
      a.onended = () => URL.revokeObjectURL(url);
      await a.play();
    } catch {
      /* no voice, no drama - the written model is on screen */
    } finally {
      setPlaying(false);
    }
  }, [item.say, playing]);

  const stopRecording = useCallback(() => {
    try { recRef.current?.stop(); } catch { /* already stopped */ }
  }, []);

  const startRecording = useCallback(async () => {
    if (phase === 'recording' || phase === 'grading') return;
    setHeard(null);
    setChecks(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      const rec = new MediaRecorder(stream);
      recRef.current = rec;
      chunks.current = [];
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunks.current.push(e.data); };
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks.current, { type: rec.mimeType || 'audio/webm' });
        if (blob.size === 0) { setPhase('idle'); return; }
        setPhase('grading');
        try {
          const fd = new FormData();
          fd.append('audio', blob, 'position.webm');
          const res = await fetch('/api/radio-transcribe', { method: 'POST', body: fd });
          const data = (await res.json()) as { transcript?: string; fallback?: boolean };
          if (data.fallback) { setSttOff(true); setPhase('idle'); return; }

          const text = (data.transcript ?? '').trim();
          setHeard(text);
          const graded = gradePosition(text, item.must);
          setChecks(graded.checks);
          setScore(graded.score);
          setPhase('graded');

          recordWeak(
            'position',
            graded.checks.filter((c) => c.status !== 'ok').map((c) => ({ id: `${item.id}:${c.id}`, label: c.label })),
            graded.checks.filter((c) => c.status === 'ok').map((c) => ({ id: `${item.id}:${c.id}` })),
          );
          if (graded.passed) setCleared((c) => (c.includes(item.id) ? c : [...c, item.id]));
        } catch {
          setPhase('idle');
        }
      };
      rec.start();
      setPhase('recording');
    } catch {
      setPhase('idle');
    }
  }, [item, phase]);

  useEffect(() => () => { try { recRef.current?.stop(); } catch { /* noop */ } }, []);

  const rules = showRu ? POS_RULES_RU : POS_RULES_PL;

  return (
    <main>
      <h1 className="mb-1 text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
        🧭 {tp('Диктовка позиции', 'Dictating a position', 'Dyktowanie pozycji')}
      </h1>
      <p className="mb-4 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
        {tp(
          'Позиция - единственное в радиообмене, что нельзя сказать приблизительно. Всё остальное можно переспросить, а позиция, услышанная как 54 вместо FIVE FOUR, отправляет спасателей не в то море. Восемь позиций, каждая ломается по-своему.',
          'A position is the one thing on a radio that cannot be approximate. Everything else can be asked again; a position heard as 54 instead of FIVE FOUR sends the lifeboat to the wrong sea. Eight of them, each breaking in a different way.',
          'Pozycja to jedyna rzecz w lacznosci, ktorej nie wolno podac z grubsza. O wszystko inne mozna dopytac, a pozycja uslyszana jako 54 zamiast FIVE FOUR wysyla ratownikow na inne morze. Osiem pozycji, kazda psuje sie inaczej.',
        )}
      </p>

      {/* the five rules, always in view: they are the whole syllabus */}
      <ol className="mb-5 space-y-1 rounded-2xl p-4 text-xs leading-relaxed"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
        {rules.map((r, i) => (
          <li key={i} className="flex gap-2">
            <span className="shrink-0 font-mono" style={{ color: 'var(--accent-cyan)' }}>{i + 1}.</span>
            <span>{r}</span>
          </li>
        ))}
      </ol>

      {/* which of the eight are behind you */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        {POSITIONS.map((p, i) => (
          <button
            key={p.id}
            type="button"
            data-testid={`pos-${p.id}`}
            onClick={() => go(i)}
            className="min-h-[36px] min-w-[36px] rounded-lg px-2 text-xs font-semibold"
            style={i === idx
              ? { background: 'var(--accent-cyan)', color: 'var(--accent-ink, #04222e)' }
              : cleared.includes(p.id)
                ? { background: 'rgba(68,255,136,0.12)', color: 'var(--success)', border: '1px solid rgba(68,255,136,0.3)' }
                : { background: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}
          >
            {cleared.includes(p.id) && i !== idx ? '✓' : i + 1}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* the position to read */}
        <div className="rounded-2xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
            {tp('Продиктуй эту позицию', 'Dictate this position', 'Podyktuj te pozycje')}
          </div>
          <div data-testid="pos-coords" className="my-3 font-mono text-2xl font-bold leading-snug" style={{ color: 'var(--accent-cyan)' }}>
            {item.lat}<br />{item.lon}
          </div>

          <p className="mb-3 rounded-xl p-2.5 text-xs leading-relaxed"
             style={{ background: 'rgba(255,206,77,0.06)', color: 'var(--text-secondary)' }}>
            ⚠ {showRu ? item.trapRu : item.trapPl}
          </p>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              data-testid="pos-ptt"
              onPointerDown={() => void startRecording()}
              onPointerUp={stopRecording}
              onPointerLeave={stopRecording}
              className="min-h-[52px] flex-1 rounded-xl px-4 text-sm font-bold"
              style={phase === 'recording'
                ? { background: 'var(--danger)', color: '#fff' }
                : { background: 'var(--accent-cyan)', color: 'var(--accent-ink, #04222e)' }}
            >
              {phase === 'recording'
                ? tp('🔴 Говори...', '🔴 Speak...', '🔴 Mow...')
                : phase === 'grading'
                  ? tp('Слушаю...', 'Listening...', 'Slucham...')
                  : tp('🎙 Держи и говори', '🎙 Hold and speak', '🎙 Trzymaj i mow')}
            </button>
            <button
              type="button"
              data-testid="pos-play-model"
              onClick={() => void playModel()}
              className="min-h-[52px] rounded-xl px-4 text-sm font-semibold"
              style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}
            >
              {playing ? '🔊…' : tp('🔊 Как надо', '🔊 How it should sound', '🔊 Jak ma brzmiec')}
            </button>
          </div>

          <button
            type="button"
            data-testid="pos-reveal"
            onClick={() => setReveal((v) => !v)}
            className="mt-2 min-h-[36px] text-xs"
            style={{ color: 'var(--text-muted)' }}
          >
            {reveal
              ? tp('Скрыть текст', 'Hide the text', 'Ukryj tekst')
              : tp('Показать текст (на экзамене его нет)', 'Show the text (the exam has none)', 'Pokaz tekst (na egzaminie go nie ma)')}
          </button>

          {reveal && (
            <pre data-testid="pos-say" className="mt-2 overflow-x-auto whitespace-pre-wrap rounded-xl p-3 font-mono text-xs leading-relaxed"
                 style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}>
              {item.say}
            </pre>
          )}
        </div>

        {/* what was heard */}
        <div className="rounded-2xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              {tp('Что услышала модель', 'What the model heard', 'Co uslyszal model')}
            </span>
            {checks && (
              <span data-testid="pos-score" className="text-sm font-bold"
                    style={{ color: score === 100 ? 'var(--success)' : 'var(--warning)' }}>
                {score}%
              </span>
            )}
          </div>

          {heard === null ? (
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              {tp(
                'Держи кнопку и читай позицию вслух по-английски. Ничего не отправляется никуда, кроме распознавания.',
                'Hold the button and read the position aloud in English. Nothing is sent anywhere except to be transcribed.',
                'Trzymaj przycisk i przeczytaj pozycje na glos po angielsku. Nic nie idzie nigdzie poza rozpoznaniem mowy.',
              )}
            </p>
          ) : (
            <>
              <p data-testid="pos-heard" className="mb-3 rounded-xl p-2.5 font-mono text-xs leading-relaxed"
                 style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                &quot;{heard || tp('ничего', 'nothing', 'nic')}&quot;
              </p>

              <ul data-testid="pos-checks" className="space-y-1.5">
                {(checks ?? []).map((c) => (
                  <li key={c.id} className="flex gap-2 text-xs leading-relaxed"
                      style={{ color: c.status === 'ok' ? 'var(--success)' : c.status === 'warn' ? 'var(--warning)' : 'var(--danger)' }}>
                    <span className="shrink-0">{c.status === 'ok' ? '✓' : c.status === 'warn' ? '⚠' : '✗'}</span>
                    <span>
                      {c.label}
                      {c.status === 'warn' && (
                        <span className="block" style={{ color: 'var(--text-muted)' }}>
                          {tp(
                            `услышано как "${c.heardAs}" - не могу отличить, слитно ли ты произнёс число или это распознавание склеило цифры. Скажи каждую цифру отдельно.`,
                            `heard as "${c.heardAs}" - I cannot tell whether you said the number as a whole or the transcriber merged the digits. Say each digit separately.`,
                            `uslyszane jako "${c.heardAs}" - nie umiem rozroznic, czy powiedziales liczbe lacznie, czy to rozpoznawanie skleilo cyfry. Powiedz kazda cyfre osobno.`,
                          )}
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>

              {phase === 'graded' && (
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    data-testid="pos-retry"
                    onClick={reset}
                    className="min-h-[44px] flex-1 rounded-xl px-3 text-sm font-semibold"
                    style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}
                  >
                    {tp('Ещё раз', 'Again', 'Jeszcze raz')}
                  </button>
                  <button
                    type="button"
                    data-testid="pos-next"
                    onClick={() => go(idx + 1)}
                    className="min-h-[44px] flex-1 rounded-xl px-3 text-sm font-semibold"
                    style={{ background: 'var(--accent-cyan)', color: 'var(--accent-ink, #04222e)' }}
                  >
                    {tp('Следующая', 'Next one', 'Nastepna')}
                  </button>
                </div>
              )}
            </>
          )}

          {sttOff && (
            <p className="mt-3 text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              {tp(
                'Голос сейчас недоступен (нет сети или ключа). Позиции и правила читаются офлайн, а проверка произношения - нет: подделывать её было бы враньём.',
                'Voice is unavailable right now (no network, or no key). The positions and the rules read fine offline; grading your speech does not, and faking it would be a lie.',
                'Glos jest teraz niedostepny (brak sieci albo klucza). Pozycje i zasady czytaja sie offline, ocena wymowy nie - a udawanie jej byloby klamstwem.',
              )}
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
