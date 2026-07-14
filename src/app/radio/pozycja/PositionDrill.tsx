'use client';

import { useCallback, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { useSternikPrefs } from '../../sternik/prefs';
import { fetchStationVoice } from '../symulator/audio/stationVoice';
import { playVoice, stopVoice } from '../plainVoice';
import { usePushToTalk } from '../usePushToTalk';
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

export default function PositionDrill() {
  const { tp, lang } = useI18n();
  const { explLang } = useSternikPrefs();
  const showRu = lang === 'ru' && explLang !== 'pl';

  const [idx, setIdx] = useState(0);
  const [heard, setHeard] = useState<string | null>(null);
  const [checks, setChecks] = useState<PosCheck[] | null>(null);
  const [score, setScore] = useState(0);
  const [graded, setGraded] = useState(false);
  const [sttOff, setSttOff] = useState(false);
  const [voiceOff, setVoiceOff] = useState(false);   // TTS failed - not the same as grading failing
  const [reveal, setReveal] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [cleared, setCleared] = useState<string[]>([]);

  const item: PosItem = POSITIONS[idx];

  const grade = useCallback(async (blob: Blob, isCurrent: () => boolean) => {
    setHeard(null);
    setChecks(null);
    setGraded(false);
    try {
      const fd = new FormData();
      fd.append('audio', blob, 'position.webm');
      const res = await fetch('/api/radio-transcribe', { method: 'POST', body: fd });
      // A 429 / 413 / 502 must NOT be graded as "you missed everything" - that
      // writes phantom failures into weakSpots and tells a correct learner they
      // were wrong. Only a real transcript is ever graded.
      if (!res.ok) { if (isCurrent()) setSttOff(true); return; }
      const data = (await res.json()) as { transcript?: string; fallback?: boolean };
      if (data.fallback) { if (isCurrent()) setSttOff(true); return; }
      if (!isCurrent()) return;

      const text = (data.transcript ?? '').trim();
      if (!text) {
        // Silence (muted mic, headset not routed) is not eight wrong answers.
        setHeard('');
        return;
      }
      setHeard(text);
      const result = gradePosition(text, item.must);
      setChecks(result.checks);
      setScore(result.score);
      setGraded(true);

      recordWeak(
        'position',
        result.checks.filter((c) => c.status !== 'ok').map((c) => ({ id: `${item.id}:${c.id}`, label: c.label })),
        result.checks.filter((c) => c.status === 'ok').map((c) => ({ id: `${item.id}:${c.id}` })),
      );
      if (result.passed) setCleared((c) => (c.includes(item.id) ? c : [...c, item.id]));
    } catch {
      /* network gone mid-request: leave the panel as it was, say nothing false */
    }
  }, [item]);

  const { phase, handlers, cancel } = usePushToTalk({ onAudio: grade });
  const recording = phase === 'recording';
  const working = phase === 'working';

  const reset = useCallback(() => {
    cancel();
    setHeard(null);
    setChecks(null);
    setScore(0);
    setGraded(false);
    setReveal(false);
  }, [cancel]);

  const go = useCallback((n: number) => {
    stopVoice();
    setIdx(((n % POSITIONS.length) + POSITIONS.length) % POSITIONS.length);
    reset();
  }, [reset]);

  /** the model reading, spoken. WebAudio, not <audio blob:> - prod CSP forbids the latter. */
  const playModel = useCallback(async () => {
    if (playing) return;
    setPlaying(true);
    try {
      const raw = await fetchStationVoice(item.say);
      // TTS being down does not mean GRADING is down. Saying so would wrongly
      // discourage the learner from recording, which still works.
      if (!raw) { setVoiceOff(true); return; }
      setVoiceOff(false);
      await playVoice(raw);
    } catch {
      setVoiceOff(true);   // the written model is still on screen
    } finally {
      setPlaying(false);
    }
  }, [item.say, playing]);

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

      {/* the five rules, always in view: they are the whole syllabus. Polish is the
          content (the exam is Polish); Russian is added as commentary when enabled. */}
      <ol className="mb-5 space-y-1 rounded-2xl p-4 text-xs leading-relaxed"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
        {POS_RULES_PL.map((r, i) => (
          <li key={i} className="flex gap-2">
            <span className="shrink-0 font-mono" style={{ color: 'var(--accent-cyan)' }}>{i + 1}.</span>
            <span>
              {r}
              {showRu && <span className="block" style={{ color: 'var(--text-muted)' }}>{POS_RULES_RU[i]}</span>}
            </span>
          </li>
        ))}
      </ol>

      {/* which of the eight are behind you */}
      <div className="mb-4 flex flex-wrap gap-1.5" role="list">
        {POSITIONS.map((p, i) => {
          const done = cleared.includes(p.id);
          const label = tp(
            `Позиция ${i + 1}${done ? ', пройдена' : ''}`,
            `Position ${i + 1}${done ? ', done' : ''}`,
            `Pozycja ${i + 1}${done ? ', zaliczona' : ''}`,
          );
          return (
            <button
              key={p.id}
              type="button"
              role="listitem"
              data-testid={`pos-${p.id}`}
              onClick={() => go(i)}
              aria-current={i === idx ? 'true' : undefined}
              aria-label={label}
              title={label}
              className="min-h-[36px] min-w-[36px] rounded-lg px-2 text-xs font-semibold"
              style={i === idx
                ? { background: 'var(--accent-cyan)', color: 'var(--accent-ink, #04222e)' }
                : done
                  ? { background: 'rgba(68,255,136,0.12)', color: 'var(--success)', border: '1px solid rgba(68,255,136,0.3)' }
                  : { background: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}
            >
              <span aria-hidden="true">{done && i !== idx ? '✓' : i + 1}</span>
            </button>
          );
        })}
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
            ⚠ {item.trapPl}
            {showRu && <span className="mt-1 block" style={{ color: 'var(--text-muted)' }}>{item.trapRu}</span>}
          </p>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              data-testid="pos-ptt"
              {...handlers}
              aria-label={tp(
                'Держать и говорить: зажми, продиктуй позицию, отпусти. Работает с клавиши пробел или Enter.',
                'Hold to talk: press and hold, dictate the position, release. Works with Space or Enter.',
                'Trzymaj i mow: przytrzymaj, podyktuj pozycje, pusc. Dziala tez klawiszem spacja lub Enter.',
              )}
              className="min-h-[52px] flex-1 touch-none rounded-xl px-4 text-sm font-bold"
              style={recording
                ? { background: 'var(--danger)', color: '#fff' }
                : { background: 'var(--accent-cyan)', color: 'var(--accent-ink, #04222e)' }}
            >
              {recording
                ? tp('🔴 Говори...', '🔴 Speak...', '🔴 Mow...')
                : working
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
        <div className="rounded-2xl p-4" aria-live="polite" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
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
          ) : heard === '' ? (
            <p data-testid="pos-silence" className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              {tp(
                'Я ничего не услышала. Проверь, что микрофон не выключен, и продиктуй ещё раз - это не засчитано как ошибка.',
                'I heard nothing. Check the mic is not muted and dictate again - this was not counted against you.',
                'Nic nie uslyszalem. Sprawdz, czy mikrofon nie jest wyciszony, i podyktuj jeszcze raz - to nie zostalo policzone jako blad.',
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

              {graded && (
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
                'Распознавание речи сейчас недоступно (нет сети или лимит). Позиции и правила читаются офлайн, а проверка произношения требует модели: подделывать её было бы враньём.',
                'Speech recognition is unavailable right now (no network, or a rate limit). The positions and rules read fine offline; grading your speech needs a model, and faking it would be a lie.',
                'Rozpoznawanie mowy jest teraz niedostepne (brak sieci albo limit). Pozycje i zasady czytaja sie offline, ocena wymowy wymaga modelu, a udawanie jej byloby klamstwem.',
              )}
            </p>
          )}
          {voiceOff && !sttOff && (
            <p className="mt-3 text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              {tp(
                'Озвучку эталона сейчас не получить, но текст выше на месте, и записать свой ответ по-прежнему можно.',
                'The spoken model is unavailable right now, but the text above is there, and you can still record your own answer.',
                'Nagrania wzorca teraz nie ma, ale tekst powyzej jest, a swoja odpowiedz nadal mozesz nagrac.',
              )}
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
