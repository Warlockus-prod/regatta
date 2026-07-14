'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { useSternikPrefs } from '../prefs';
import { gradeTurn, type TurnResult } from '../../radio/rozmowa/dialogueGrading';
import { record as recordWeak } from '../../radio/weakSpots';
import { ORAL_PROMPTS, type OralPrompt } from './oralPrompts';

// ============================================================================
// The oral part of the sternik exam.
//
// The written bank teaches recognition: four options, one of them right. But an
// examiner asks you to EXPLAIN, and so does anyone who ever hands you a boat. A
// person can hold a 90% score on the mock exam and still not be able to say, out
// loud, who gives way at a crossing - because they have never once had to.
//
// So: the question, then silence, then your voice. It is transcribed and the
// answer is checked element by element, and only then do you get to see the
// model answer. Reading the model first is how you learn to recognise it, not to
// produce it, and recognition is the thing you already have.
// ============================================================================

type Phase = 'idle' | 'recording' | 'grading' | 'graded';

const TOPICS: OralPrompt['topic'][] = ['prawo drogi', 'znaki', 'bezpieczenstwo', 'przepisy', 'manewrowanie', 'locja'];

const TOPIC_LABEL: Record<OralPrompt['topic'], { ru: string; pl: string }> = {
  'prawo drogi': { ru: 'Право дороги', pl: 'Prawo drogi' },
  znaki: { ru: 'Знаки', pl: 'Znaki' },
  bezpieczenstwo: { ru: 'Безопасность', pl: 'Bezpieczenstwo' },
  przepisy: { ru: 'Правила', pl: 'Przepisy' },
  manewrowanie: { ru: 'Маневрирование', pl: 'Manewrowanie' },
  locja: { ru: 'Лоция', pl: 'Locja' },
};

export default function OralTrainer() {
  const { tp, lang } = useI18n();
  const { explLang } = useSternikPrefs();
  const showRu = lang === 'ru' && explLang !== 'pl';

  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>('idle');
  const [heard, setHeard] = useState<string | null>(null);
  const [checks, setChecks] = useState<TurnResult[] | null>(null);
  const [score, setScore] = useState(0);
  const [passed, setPassed] = useState(false);
  const [showModel, setShowModel] = useState(false);
  const [sttOff, setSttOff] = useState(false);
  const [cleared, setCleared] = useState<string[]>([]);

  const recRef = useRef<MediaRecorder | null>(null);
  const chunks = useRef<BlobPart[]>([]);

  const p = ORAL_PROMPTS[idx];

  const reset = useCallback(() => {
    setPhase('idle');
    setHeard(null);
    setChecks(null);
    setScore(0);
    setPassed(false);
    setShowModel(false);
  }, []);

  const go = useCallback((n: number) => {
    setIdx(((n % ORAL_PROMPTS.length) + ORAL_PROMPTS.length) % ORAL_PROMPTS.length);
    reset();
  }, [reset]);

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
          fd.append('audio', blob, 'answer.webm');
          const res = await fetch('/api/radio-transcribe', { method: 'POST', body: fd });
          const data = (await res.json()) as { transcript?: string; fallback?: boolean };
          if (data.fallback) { setSttOff(true); setPhase('idle'); return; }

          const text = (data.transcript ?? '').trim();
          setHeard(text);
          const graded = gradeTurn(text, p.must);
          setChecks(graded.checks);
          setScore(graded.score);
          setPassed(graded.passed);
          setPhase('graded');
          setShowModel(true);   // the model answer is the point of the debrief

          recordWeak(
            'oral',
            graded.checks.filter((c) => !c.ok).map((c) => ({ id: `${p.id}:${c.id}`, label: c.label })),
            graded.checks.filter((c) => c.ok).map((c) => ({ id: `${p.id}:${c.id}` })),
          );
          if (graded.passed) setCleared((c) => (c.includes(p.id) ? c : [...c, p.id]));
        } catch {
          setPhase('idle');
        }
      };
      rec.start();
      setPhase('recording');
    } catch {
      setPhase('idle');
    }
  }, [p, phase]);

  useEffect(() => () => { try { recRef.current?.stop(); } catch { /* noop */ } }, []);

  return (
    <main>
      <h1 className="mb-1 text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
        🎓 {tp('Устный ответ', 'Answering out loud', 'Odpowiedz ustna')}
      </h1>
      <p className="mb-5 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
        {tp(
          'Тесты учат узнавать правильный вариант из четырёх. Экзаменатор просит объяснить, и море тоже: никто на лодке не даёт тебе четыре варианта на выбор. Здесь ты отвечаешь голосом, ответ распознаётся и проверяется по пунктам, и только потом ты видишь эталон.',
          'A multiple-choice bank teaches you to recognise the right answer out of four. The examiner asks you to explain, and so does the sea: nobody on a boat hands you four options. Here you answer out loud, your words are transcribed and checked point by point, and only then do you see the model answer.',
          'Testy ucza rozpoznawac dobra odpowiedz z czterech. Egzaminator prosi o wyjasnienie, i morze tez: nikt na lodzi nie daje ci czterech wariantow. Tutaj odpowiadasz glosem, mowa jest rozpoznawana i sprawdzana punkt po punkcie, a wzorcowa odpowiedz widzisz dopiero potem.',
        )}
      </p>

      {/* the twelve */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        {ORAL_PROMPTS.map((q, i) => (
          <button
            key={q.id}
            type="button"
            data-testid={`oral-${q.id}`}
            onClick={() => go(i)}
            className="min-h-[36px] min-w-[36px] rounded-lg px-2 text-xs font-semibold"
            style={i === idx
              ? { background: 'var(--accent-cyan)', color: 'var(--accent-ink, #04222e)' }
              : cleared.includes(q.id)
                ? { background: 'rgba(68,255,136,0.12)', color: 'var(--success)', border: '1px solid rgba(68,255,136,0.3)' }
                : { background: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}
          >
            {cleared.includes(q.id) && i !== idx ? '✓' : i + 1}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* the question */}
        <div className="rounded-2xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
          <div className="mb-2 flex items-center gap-2">
            <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                  style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
              {showRu ? TOPIC_LABEL[p.topic].ru : TOPIC_LABEL[p.topic].pl}
            </span>
            <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
              {idx + 1} / {ORAL_PROMPTS.length}
            </span>
          </div>

          <p data-testid="oral-question" className="mb-1 text-base font-semibold leading-relaxed" style={{ color: 'var(--text-primary)' }}>
            {p.questionPl}
          </p>
          {showRu && (
            <p className="mb-3 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {p.questionRu}
            </p>
          )}

          <button
            type="button"
            data-testid="oral-ptt"
            onPointerDown={() => void startRecording()}
            onPointerUp={stopRecording}
            onPointerLeave={stopRecording}
            className="mt-3 min-h-[52px] w-full rounded-xl px-4 text-sm font-bold"
            style={phase === 'recording'
              ? { background: 'var(--danger)', color: '#fff' }
              : { background: 'var(--accent-cyan)', color: 'var(--accent-ink, #04222e)' }}
          >
            {phase === 'recording'
              ? tp('🔴 Говори...', '🔴 Speak...', '🔴 Mow...')
              : phase === 'grading'
                ? tp('Слушаю...', 'Listening...', 'Slucham...')
                : tp('🎙 Держи и отвечай', '🎙 Hold and answer', '🎙 Trzymaj i odpowiadaj')}
          </button>

          <p className="mt-2 text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            {tp(
              'Отвечай по-польски - экзамен принимают на польском. Одного пропущенного пункта достаточно для зачёта, двух - уже нет.',
              'Answer in Polish - the exam is held in Polish. One missing element still passes; two do not.',
              'Odpowiadaj po polsku - egzamin jest po polsku. Jeden brakujacy punkt jeszcze przechodzi, dwa juz nie.',
            )}
          </p>

          {!showModel && phase !== 'graded' && (
            <button
              type="button"
              data-testid="oral-give-up"
              onClick={() => setShowModel(true)}
              className="mt-2 min-h-[36px] text-xs"
              style={{ color: 'var(--text-muted)' }}
            >
              {tp('Сдаться и посмотреть эталон', 'Give up and see the model answer', 'Poddaj sie i zobacz wzor')}
            </button>
          )}

          <p className="mt-3 rounded-xl p-2.5 text-xs leading-relaxed"
             style={{ background: 'rgba(255,206,77,0.06)', color: 'var(--text-secondary)' }}>
            ⚠ {showRu ? p.whyRu : p.whyPl}
          </p>
        </div>

        {/* the verdict + model */}
        <div className="rounded-2xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              {tp('Что ты сказал', 'What you said', 'Co powiedziales')}
            </span>
            {checks && (
              <span data-testid="oral-score" className="text-sm font-bold"
                    style={{ color: passed ? 'var(--success)' : 'var(--danger)' }}>
                {score}%
              </span>
            )}
          </div>

          {heard === null ? (
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              {tp(
                'Пока пусто. Держи кнопку и отвечай своими словами - зубрить формулировку не нужно, нужно назвать все пункты.',
                'Nothing yet. Hold the button and answer in your own words - you do not have to recite the model, you have to cover every element.',
                'Na razie pusto. Trzymaj przycisk i odpowiadaj wlasnymi slowami - nie musisz recytowac wzoru, musisz wymienic wszystkie punkty.',
              )}
            </p>
          ) : (
            <>
              <p data-testid="oral-heard" className="mb-3 rounded-xl p-2.5 text-xs leading-relaxed"
                 style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                &quot;{heard || tp('ничего', 'nothing', 'nic')}&quot;
              </p>
              <ul data-testid="oral-checks" className="space-y-1.5">
                {(checks ?? []).map((c) => (
                  <li key={c.id} className="flex gap-2 text-xs leading-relaxed"
                      style={{ color: c.ok ? 'var(--success)' : 'var(--danger)' }}>
                    <span className="shrink-0">{c.ok ? '✓' : '✗'}</span>
                    <span>{c.label}</span>
                  </li>
                ))}
              </ul>
            </>
          )}

          {showModel && (
            <div className="mt-4 rounded-xl p-3" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--accent-cyan)' }}>
                {tp('Как надо было', 'How it should have gone', 'Jak to mialo brzmiec')}
              </div>
              <p data-testid="oral-model" className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                {p.modelPl}
              </p>
              {showRu && (
                <p className="mt-2 text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                  {p.modelRu}
                </p>
              )}
            </div>
          )}

          {(phase === 'graded' || showModel) && (
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                data-testid="oral-retry"
                onClick={reset}
                className="min-h-[44px] flex-1 rounded-xl px-3 text-sm font-semibold"
                style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}
              >
                {tp('Ещё раз', 'Again', 'Jeszcze raz')}
              </button>
              <button
                type="button"
                data-testid="oral-next"
                onClick={() => go(idx + 1)}
                className="min-h-[44px] flex-1 rounded-xl px-3 text-sm font-semibold"
                style={{ background: 'var(--accent-cyan)', color: 'var(--accent-ink, #04222e)' }}
              >
                {tp('Следующий вопрос', 'Next question', 'Nastepne pytanie')}
              </button>
            </div>
          )}

          {sttOff && (
            <p className="mt-3 text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              {tp(
                'Распознавание речи сейчас недоступно. Вопросы и эталонные ответы читаются офлайн, а проверка голоса - нет.',
                'Speech recognition is unavailable right now. The questions and model answers read fine offline; grading your voice does not.',
                'Rozpoznawanie mowy jest teraz niedostepne. Pytania i wzorcowe odpowiedzi czytaja sie offline, ocena glosu nie.',
              )}
            </p>
          )}
        </div>
      </div>

      {/* jump by topic */}
      <div className="mt-6">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
          {tp('Темы', 'Topics', 'Tematy')}
        </div>
        <div className="flex flex-wrap gap-2">
          {TOPICS.map((t) => {
            const first = ORAL_PROMPTS.findIndex((q) => q.topic === t);
            const n = ORAL_PROMPTS.filter((q) => q.topic === t).length;
            return (
              <button
                key={t}
                type="button"
                onClick={() => go(first)}
                className="min-h-[36px] rounded-full px-3 text-xs"
                style={{ background: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}
              >
                {showRu ? TOPIC_LABEL[t].ru : TOPIC_LABEL[t].pl} · {n}
              </button>
            );
          })}
        </div>
      </div>
    </main>
  );
}
