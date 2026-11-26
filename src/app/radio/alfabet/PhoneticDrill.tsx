'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRadioI18n } from '@/app/radio/localization/context';
import {
  NUMBER_EXAMPLES, PHONETIC_ALPHABET, SPELL_TARGETS, SPOKEN_FIGURES,
  figureSpeech, spellingOf, type NumberContext,
} from '@/data/radio/phonetic-alphabet';
import { PHONETIC_COPY, fillCopy, type PhoneticCopyKey } from '@/data/radio/phonetic-copy';
import {
  ROUND_SIZE, gradeSpelling, isCorrect, loadPhoneticProgress, makeQuestion, makeRound,
  recordPhoneticRound, roundScore, seededRandom, starsFor,
  type DrillQuestion, type PhoneticProgress, type QuestionKind, type SpellResult,
} from '@/lib/radio-phonetic';
import { SpeakButton } from '../audio/SpeakButton';
import { offlineRadio } from '../audio/localSpeech';
import { LocalTranscriptEntry, type TranscriptInputMode } from '../LocalTranscriptEntry';
import { usePushToTalk } from '../usePushToTalk';
import { record as recordWeak } from '../weakSpots';
import { radioRuntimeSearch } from '../runtimeSearch';
import { RADIO_FREE_HREF } from '../navigation';
import { THEORY_ORDER } from '../teoria/courseMap';

// ============================================================================
// /radio/alfabet - the spelling alphabet and the spoken figures: learn the
// table, recognise the words, spell a name, then a scored round with stars.
// Code words and figures stay English (the standard); the copy around them
// follows the course language. Data: src/data/radio/phonetic-alphabet.ts,
// grading: src/lib/radio-phonetic.ts.
// ============================================================================

type Tab = 'learn' | 'recognise' | 'spell' | 'round';
const TABS: readonly { id: Tab; label: PhoneticCopyKey }[] = [
  { id: 'learn', label: 'tabLearn' },
  { id: 'recognise', label: 'tabRecognise' },
  { id: 'spell', label: 'tabSpell' },
  { id: 'round', label: 'tabRound' },
];
const CONTEXT_LABEL: Record<NumberContext, PhoneticCopyKey> = {
  channel: 'ctxChannel', time: 'ctxTime', course: 'ctxCourse', draught: 'ctxDraught', mmsi: 'ctxMmsi',
};

const card = { background: 'var(--bg-card)', borderWidth: 1, borderStyle: 'solid', borderColor: 'var(--border-subtle)' } as const;
const primary = { background: 'var(--accent-cyan)', color: 'var(--accent-ink, #04222e)' } as const;
const secondary = { background: 'var(--bg-secondary)', color: 'var(--text-primary)', borderWidth: 1, borderStyle: 'solid', borderColor: 'var(--border-subtle)' } as const;

function useCopy() {
  const { tl } = useRadioI18n();
  return useCallback((key: PhoneticCopyKey, ...values: (string | number)[]) => fillCopy(tl(PHONETIC_COPY[key]), ...values), [tl]);
}

/** The pronunciation guide with the stressed syllables bold and underlined. */
function Guide({ syllables, stress }: { syllables: readonly string[]; stress: readonly number[] }) {
  return (
    <span lang="en" className="font-mono text-xs tracking-wide" style={{ color: 'var(--text-secondary)' }}>
      {syllables.map((s, i) => (
        <span key={i}>
          {i > 0 && <span aria-hidden>{'-'}</span>}
          {stress.includes(i) ? <strong className="underline underline-offset-2" style={{ color: 'var(--text-primary)' }}>{s}</strong> : s}
        </span>
      ))}
    </span>
  );
}

function Learn() {
  const c = useCopy();
  return (
    <div className="space-y-6">
      <section aria-labelledby="phonetic-letters">
        <h2 id="phonetic-letters" className="mb-1 text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{c('lettersTitle')}</h2>
        <p className="mb-3 text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>{c('stressNote')}</p>
        <ul className="grid grid-cols-1 gap-2 min-[400px]:grid-cols-2 lg:grid-cols-3" data-testid="phonetic-table">
          {PHONETIC_ALPHABET.map((l) => (
            <li key={l.letter} data-testid={`phonetic-${l.letter}`} className="flex min-h-[56px] items-center gap-3 rounded-xl px-3 py-2" style={card}>
              <span className="w-7 shrink-0 text-center text-xl font-bold" style={{ color: 'var(--accent-cyan)' }}>{l.letter}</span>
              <span className="min-w-0 flex-1">
                <span lang="en" className="block text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>{l.word}</span>
                <Guide syllables={l.syllables} stress={l.stress} />
              </span>
              <SpeakButton text={l.word} label={c('listen')} size={22} />
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="phonetic-figures">
        <h2 id="phonetic-figures" className="mb-1 text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{c('figuresTitle')}</h2>
        <p className="mb-3 text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>{c('figuresNote')}</p>
        <ul className="grid grid-cols-1 gap-2 min-[400px]:grid-cols-2 lg:grid-cols-3" data-testid="figure-table">
          {SPOKEN_FIGURES.map((f) => (
            <li key={f.symbol} data-testid={`figure-${f.symbol === '.' ? 'decimal' : f.symbol}`} className="flex min-h-[56px] items-center gap-3 rounded-xl px-3 py-2" style={card}>
              <span className="w-7 shrink-0 text-center text-xl font-bold" style={{ color: 'var(--accent-cyan)' }}>
                {f.symbol}
              </span>
              <span className="min-w-0 flex-1">
                <span lang="en" className="block text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>{f.word}</span>
                <Guide syllables={f.syllables} stress={f.stress} />
                {f.symbol !== '.' && (
                  <span className="block text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    {c('colCode')}{': '}<span lang="en">{f.codeWord.toUpperCase()}</span>
                  </span>
                )}
              </span>
              <SpeakButton text={figureSpeech(f)} label={c('listen')} size={22} />
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="phonetic-numbers">
        <h2 id="phonetic-numbers" className="mb-3 text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{c('examplesTitle')}</h2>
        <ul className="overflow-hidden rounded-2xl" style={card}>
          {NUMBER_EXAMPLES.map((n, i) => (
            <li key={n.id} className="flex min-h-[56px] flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2" style={i > 0 ? { borderTop: '1px solid var(--border-subtle)' } : undefined}>
              <span className="w-24 shrink-0">
                <span className="block font-mono text-base font-bold" style={{ color: 'var(--accent-cyan)' }}>{n.written}</span>
                <span className="block text-[11px]" style={{ color: 'var(--text-muted)' }}>{c(CONTEXT_LABEL[n.context])}</span>
              </span>
              <span lang="en" className="min-w-0 flex-1 font-mono text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{n.spoken}</span>
              <SpeakButton text={n.spoken} label={c('listen')} size={22} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Options({ q, picked, onPick, testid }: { q: DrillQuestion; picked: string | null; onPick: (value: string) => void; testid: string }) {
  return (
    <div className="mt-4 grid grid-cols-2 gap-2" role="group">
      {q.options.map((o) => {
        const chosen = picked === o;
        const right = picked !== null && o === q.answer;
        const style = right
          ? { background: 'rgba(68,255,136,0.14)', color: 'var(--success)', borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(68,255,136,0.4)' }
          : chosen
            ? { background: 'rgba(255,85,85,0.12)', color: 'var(--danger)', borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(255,85,85,0.4)' }
            : secondary;
        return (
          <button key={o} type="button" lang="en" data-testid={`${testid}-option`} data-value={o} disabled={picked !== null}
            onClick={() => onPick(o)} aria-pressed={chosen}
            className="min-h-[52px] rounded-xl px-3 font-mono text-base font-bold disabled:cursor-default" style={style}>
            {o}
          </button>
        );
      })}
    </div>
  );
}

function Prompt({ q, hidden, onReveal }: { q: DrillQuestion; hidden: boolean; onReveal: () => void }) {
  const c = useCopy();
  const ask = q.kind === 'word-to-letter' ? c('askLetter') : q.kind === 'letter-to-word' ? c('askWord') : c('askFigure');
  return (
    <>
      <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{ask}</div>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        {hidden ? (
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{c('hiddenWord')}</span>
        ) : (
          <span lang="en" data-testid="drill-prompt" className="font-mono text-3xl font-bold" style={{ color: 'var(--accent-cyan)' }}>{q.prompt}</span>
        )}
        {q.speak && <SpeakButton text={q.speak} label={c('listen')} size={26} />}
        {hidden && (
          <button type="button" onClick={onReveal} className="min-h-[44px] rounded-xl px-3 text-sm font-semibold" style={secondary}>{c('showWord')}</button>
        )}
      </div>
    </>
  );
}

function missLabel(q: DrillQuestion): { id: string; label: string } {
  if (q.kind === 'figure-to-say') return { id: q.id, label: `${q.prompt} = ${q.answer}` };
  const l = PHONETIC_ALPHABET.find((x) => x.letter === q.answer || x.word === q.answer)!;
  return { id: `letter-${l.letter}`, label: `${l.letter} = ${l.word.toUpperCase()}` };
}

function Recognise() {
  const c = useCopy();
  const [kind, setKind] = useState<QuestionKind>('word-to-letter');
  const [byEar, setByEar] = useState(false);
  const [revealed, setRevealed] = useState(false);
  // A fixed first seed keeps the server render and the first client render equal.
  const [q, setQ] = useState<DrillQuestion>(() => makeQuestion('word-to-letter', seededRandom(1)));
  const [picked, setPicked] = useState<string | null>(null);
  const [streak, setStreak] = useState(0);

  const next = useCallback((k: QuestionKind = kind) => {
    setQ((prev) => {
      const rnd = seededRandom(Date.now() & 0x7fffffff);
      let fresh = makeQuestion(k, rnd);
      for (let i = 0; fresh.id === prev.id && i < 10; i++) fresh = makeQuestion(k, rnd);
      return fresh;
    });
    setPicked(null);
    setRevealed(false);
  }, [kind]);

  const pick = (value: string) => {
    setPicked(value);
    const ok = isCorrect(q, value);
    setStreak((s) => (ok ? s + 1 : 0));
    const spot = missLabel(q);
    recordWeak('phonetic', ok ? [] : [spot], ok ? [{ id: spot.id }] : []);
  };

  const modes: readonly [QuestionKind, PhoneticCopyKey][] = [
    ['word-to-letter', 'modeWordToLetter'], ['letter-to-word', 'modeLetterToWord'], ['figure-to-say', 'modeFigures'],
  ];
  const hidden = byEar && kind === 'word-to-letter' && !revealed && picked === null;

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label={c('modes')}>
        {modes.map(([id, label]) => (
          <button key={id} type="button" data-testid={`mode-${id}`} aria-pressed={kind === id}
            onClick={() => { setKind(id); next(id); }}
            className="min-h-[44px] rounded-xl px-3 text-sm font-semibold" style={kind === id ? primary : secondary}>
            {c(label)}
          </button>
        ))}
        {kind === 'word-to-letter' && (
          <label className="flex min-h-[44px] items-center gap-2 rounded-xl px-3 text-sm" style={secondary}>
            <input type="checkbox" data-testid="by-ear" checked={byEar} onChange={(e) => setByEar(e.target.checked)} className="h-5 w-5" />
            {c('listenOnly')}
          </label>
        )}
      </div>
      <div className="rounded-2xl p-4" style={card} aria-live="polite">
        <Prompt q={q} hidden={hidden} onReveal={() => setRevealed(true)} />
        <Options q={q} picked={picked} onPick={pick} testid="recognise" />
        {picked !== null && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <p data-testid="recognise-feedback" className="text-sm font-semibold" style={{ color: isCorrect(q, picked) ? 'var(--success)' : 'var(--danger)' }}>
              {isCorrect(q, picked) ? c('correct') : c('wrongAnswer', q.kind === 'word-to-letter' ? `${q.answer} = ${q.prompt.toUpperCase()}` : q.answer)}
            </p>
            <button type="button" data-testid="recognise-next" onClick={() => next()} className="min-h-[44px] rounded-xl px-4 text-sm font-bold" style={primary}>{c('next')}</button>
          </div>
        )}
        {streak > 1 && <p className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>{c('streak', streak)}</p>}
      </div>
    </div>
  );
}

function SpellChecks({ result }: { result: SpellResult }) {
  const c = useCopy();
  return (
    <div data-testid="spell-result" className="mt-3">
      <p className="mb-2 text-sm font-bold" style={{ color: result.passed ? 'var(--success)' : 'var(--warning)' }}>
        {result.passed ? c('spelledOk') : `${result.score}%`}
      </p>
      <ul className="space-y-1">
        {result.checks.map((ch, i) => {
          const color = ch.status === 'ok' ? 'var(--success)' : ch.status === 'variant' ? 'var(--warning)' : 'var(--danger)';
          const text = ch.status === 'ok' ? c('charOk', ch.char)
            : ch.status === 'variant' ? c('charVariant', ch.char, ch.expected)
              : ch.status === 'missing' ? c('charMissing', ch.char, ch.expected)
                : c('charWrong', ch.char, ch.expected, ch.heard ?? '');
          return (
            <li key={i} data-status={ch.status} className="flex gap-2 text-xs leading-relaxed" style={{ color }}>
              <span aria-hidden className="shrink-0">{ch.status === 'ok' ? '✓' : ch.status === 'variant' ? '⚠' : '✗'}</span>
              <span>{text}</span>
            </li>
          );
        })}
      </ul>
      {result.extra.length > 0 && <p className="mt-1 text-xs" style={{ color: 'var(--danger)' }}>{c('extraWords', result.extra.join(' '))}</p>}
    </div>
  );
}

function Spell() {
  const c = useCopy();
  const offline = offlineRadio();
  const [idx, setIdx] = useState(0);
  const [result, setResult] = useState<SpellResult | null>(null);
  const [heard, setHeard] = useState<{ text: string; mode: TranscriptInputMode } | null>(null);
  const [silence, setSilence] = useState(false);
  const [sttOff, setSttOff] = useState(false);
  const [model, setModel] = useState(false);
  const target = SPELL_TARGETS[idx];
  const modelText = spellingOf(target.text);

  const check = useCallback((text: string, mode: TranscriptInputMode) => {
    if (!text.trim()) return;
    const graded = gradeSpelling(target.text, text, { allowNumerals: mode === 'voice' });
    setHeard({ text, mode });
    setSilence(false);
    setResult(graded);
    const missed = graded.checks.filter((ch) => ch.status === 'wrong' || ch.status === 'missing');
    recordWeak('phonetic',
      missed.map((ch) => ({ id: `char-${ch.char}`, label: `${ch.char} = ${ch.expected}` })),
      graded.checks.filter((ch) => ch.status === 'ok').map((ch) => ({ id: `char-${ch.char}` })));
  }, [target.text]);

  const onAudio = useCallback(async (blob: Blob, isCurrent: () => boolean) => {
    if (offlineRadio()) return;
    try {
      const fd = new FormData();
      fd.append('audio', blob, 'spelling.webm');
      const res = await fetch('/api/radio-transcribe', { method: 'POST', body: fd });
      // A failed request is not a wrong spelling: say so and grade nothing.
      if (!res.ok) { if (isCurrent()) setSttOff(true); return; }
      const data = (await res.json()) as { transcript?: string; fallback?: boolean };
      if (!isCurrent()) return;
      if (data.fallback) { setSttOff(true); return; }
      const text = (data.transcript ?? '').trim();
      if (!text) { setSilence(true); return; }
      check(text, 'voice');
    } catch { /* network gone mid-request: nothing is graded */ }
  }, [check]);
  const { phase, handlers, cancel } = usePushToTalk({ onAudio });

  const go = (n: number) => {
    cancel();
    setIdx(((n % SPELL_TARGETS.length) + SPELL_TARGETS.length) % SPELL_TARGETS.length);
    setResult(null); setHeard(null); setSilence(false); setModel(false);
  };

  return (
    <div className="rounded-2xl p-4" style={card}>
      <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
        {c('spellAsk')}{': '}{c(target.kind === 'ship' ? 'kindShip' : 'kindCallsign')}
      </div>
      <div lang="en" data-testid="spell-target" className="my-3 font-mono text-3xl font-bold tracking-widest" style={{ color: 'var(--accent-cyan)' }}>{target.text}</div>
      <p className="mb-3 text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{c('spellHow')}</p>

      {!offline && (
        <button type="button" data-testid="spell-ptt" {...handlers} aria-label={c('pttLabel')}
          className="min-h-[52px] w-full touch-none rounded-xl px-4 text-sm font-bold"
          style={phase === 'recording' ? { background: 'var(--danger)', color: '#fff' } : primary}>
          {phase === 'recording' ? c('speaking') : phase === 'working' ? c('transcribing') : c('holdToSpeak')}
        </button>
      )}
      <LocalTranscriptEntry key={target.id} allowVoice={offline} onSubmit={check} disabled={phase !== 'idle'} />

      {silence && <p data-testid="spell-silence" className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>{c('silence')}</p>}
      {sttOff && <p className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>{c('sttOff')}</p>}
      {heard && (
        <p className="mt-3 rounded-xl p-2.5 font-mono text-xs" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
          <span className="font-sans font-semibold" style={{ color: 'var(--text-muted)' }}>{c(heard.mode === 'typed' ? 'typedLabel' : 'heardLabel')}{': '}</span>
          <span lang="en">{heard.text}</span>
        </p>
      )}
      {result && <SpellChecks result={result} />}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" data-testid="spell-model" onClick={() => setModel((v) => !v)} className="min-h-[44px] rounded-xl px-3 text-sm font-semibold" style={secondary}>
          {c(model ? 'hideModel' : 'showModel')}
        </button>
        <SpeakButton text={modelText} label={c('listen')} size={22} />
        <button type="button" data-testid="spell-next" onClick={() => go(idx + 1)} className="ml-auto min-h-[44px] rounded-xl px-4 text-sm font-bold" style={primary}>{c('nextName')}</button>
      </div>
      {model && <p lang="en" data-testid="spell-model-text" className="mt-2 rounded-xl p-2.5 font-mono text-xs leading-relaxed" style={secondary}>{modelText}</p>}
    </div>
  );
}

function Stars({ n }: { n: number }) {
  const c = useCopy();
  return (
    <span role="img" aria-label={c('starsLabel', n)} data-testid="round-stars" data-stars={n} className="text-2xl tracking-widest" style={{ color: 'var(--warning)' }}>
      {[0, 1, 2].map((i) => (i < n ? '★' : '☆')).join('')}
    </span>
  );
}

function Round({ returnLink }: { returnLink: ReactNode }) {
  const c = useCopy();
  const [questions, setQuestions] = useState<DrillQuestion[] | null>(null);
  const [answers, setAnswers] = useState<(string | null)[]>([]);
  const [i, setI] = useState(0);
  const [done, setDone] = useState<{ score: number; progress: PhoneticProgress } | null>(null);
  const [progress, setProgress] = useState<PhoneticProgress | null>(null);

  useEffect(() => {
    // localStorage after mount: the server render and first client render agree.
    const frame = window.requestAnimationFrame(() => setProgress(loadPhoneticProgress()));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const start = () => {
    setQuestions(makeRound(Date.now() & 0x7fffffff));
    setAnswers(Array(ROUND_SIZE).fill(null));
    setI(0);
    setDone(null);
  };

  if (!questions || done) {
    return (
      <div className="rounded-2xl p-4" style={card}>
        {done ? (
          <div data-testid="round-done">
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{c('roundDone')}</h2>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <Stars n={starsFor(done.score)} />
              <span data-testid="round-score" className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
                {c('roundScore', Math.round((done.score / 100) * ROUND_SIZE), ROUND_SIZE, done.score)}
              </span>
            </div>
            <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>{c('best', done.progress.best)}</p>
            {questions && questions.some((q, k) => !isCorrect(q, answers[k] ?? '')) && (
              <div className="mt-3">
                <div className="mb-1 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{c('reviewMisses')}</div>
                <ul className="space-y-1">
                  {questions.map((q, k) => isCorrect(q, answers[k] ?? '') ? null : (
                    <li key={q.id} lang="en" className="font-mono text-xs" style={{ color: 'var(--danger)' }}>{missLabel(q).label}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{c('roundIntro')}</p>
            {progress && progress.rounds > 0 && (
              <div className="mt-2 flex items-center gap-3"><Stars n={progress.stars} /><span className="text-xs" style={{ color: 'var(--text-muted)' }}>{c('best', progress.best)}</span></div>
            )}
          </>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" data-testid="round-start" onClick={start} className="min-h-[48px] rounded-xl px-5 text-sm font-bold" style={primary}>
            {c(done ? 'retryRound' : 'startRound')}
          </button>
          {done && returnLink}
        </div>
      </div>
    );
  }

  const q = questions[i];
  const picked = answers[i];
  const answer = (value: string) => {
    const nextAnswers = [...answers];
    nextAnswers[i] = value;
    setAnswers(nextAnswers);
    const spot = missLabel(q);
    const ok = isCorrect(q, value);
    recordWeak('phonetic', ok ? [] : [spot], ok ? [{ id: spot.id }] : []);
  };
  const advance = () => {
    if (i + 1 < questions.length) { setI(i + 1); return; }
    const score = roundScore(questions, answers);
    const saved = recordPhoneticRound(score);
    setProgress(saved);
    setDone({ score, progress: saved });
  };

  return (
    <div className="rounded-2xl p-4" style={card} aria-live="polite" data-testid="round-question">
      <div className="mb-2 text-xs" style={{ color: 'var(--text-muted)' }}>{c('questionOf', i + 1, questions.length)}</div>
      <Prompt q={q} hidden={false} onReveal={() => undefined} />
      <Options q={q} picked={picked} onPick={answer} testid="round" />
      {picked !== null && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold" style={{ color: isCorrect(q, picked) ? 'var(--success)' : 'var(--danger)' }}>
            {isCorrect(q, picked) ? c('correct') : c('wrongAnswer', q.answer)}
          </p>
          <button type="button" data-testid="round-next" onClick={advance} className="min-h-[44px] rounded-xl px-4 text-sm font-bold" style={primary}>{c('next')}</button>
        </div>
      )}
    </div>
  );
}

export default function PhoneticDrill() {
  const c = useCopy();
  const [tab, setTab] = useState<Tab>('learn');
  const [from, setFrom] = useState<string | null>(null);

  useEffect(() => {
    // ?from=<theory chapter> comes from the chapter link; read after mount.
    const frame = window.requestAnimationFrame(() => {
      const value = new URLSearchParams(radioRuntimeSearch()).get('from');
      setFrom(value && (THEORY_ORDER as readonly string[]).includes(value) ? value : null);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const returnLink = useMemo(() => (
    <Link href={from ? `/radio/teoria#${from}` : RADIO_FREE_HREF} data-testid="phonetic-return"
      className="flex min-h-[48px] items-center rounded-xl px-5 text-sm font-semibold" style={secondary}>
      {c(from ? 'backToChapter' : 'backToPractice')}
    </Link>
  ), [c, from]);

  return (
    <div id="radio-phonetic">
      <h1 className="mb-1 text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
        <span aria-hidden>{'🔤 '}</span>{c('drillTitle')}
      </h1>
      <p className="mb-4 max-w-3xl text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{c('intro')}</p>

      <div role="tablist" aria-label={c('drillTitle')} className="mb-4 grid grid-cols-2 gap-1.5 sm:flex sm:flex-wrap">
        {TABS.map((t) => (
          <button key={t.id} type="button" role="tab" data-testid={`tab-${t.id}`} aria-selected={tab === t.id}
            onClick={() => setTab(t.id)} className="min-h-[44px] rounded-xl px-4 text-sm font-semibold" style={tab === t.id ? primary : secondary}>
            {c(t.label)}
          </button>
        ))}
      </div>

      <div role="tabpanel">
        {tab === 'learn' && <Learn />}
        {tab === 'recognise' && <Recognise />}
        {tab === 'spell' && <Spell />}
        {tab === 'round' && <Round returnLink={returnLink} />}
      </div>

      {tab !== 'round' && <div className="mt-6 flex">{returnLink}</div>}
    </div>
  );
}

