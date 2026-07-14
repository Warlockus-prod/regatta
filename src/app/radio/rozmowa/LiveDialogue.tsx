'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { useSternikPrefs } from '../../sternik/prefs';
import RadioFront from '../symulator/RadioFront';
import { useRadioAudio } from '../symulator/audio/useRadioAudio';
import { fetchStationVoice } from '../symulator/audio/stationVoice';
import { SIG_STRONG, scriptOver } from '../symulator/radioTraffic';
import {
  CHANNELS, createInitialRadio, radioProfile, radioReducer,
  type RadioEvent, type RadioModel, type RadioState,
} from '../symulator/radioModel';
import { DIALOGUES, type Dialogue } from './dialogues';
import { gradeTurn, type TurnResult } from './dialogueGrading';
import { record as recordWeak } from '../weakSpots';

// ============================================================================
// A live radio conversation. You hold PTT and speak; the audio is transcribed;
// the turn is graded against what it had to contain; the station answers OUT
// LOUD through the receiver, on your channel, through your squelch. Then you
// answer back.
//
// This is the half of the exam a text trainer cannot touch. A monologue you type
// is not a radio conversation - on the water you have to CATCH what comes back
// (a berth number, a working channel, a question you did not expect) and answer
// it, under stress, in a language that is not yours.
// ============================================================================

type Phase = 'idle' | 'recording' | 'grading' | 'answered' | 'done';

interface LogRow { t: number; text: string; kind: 'tx' | 'rx' | 'bad' | 'step' | 'ui' }

export default function LiveDialogue() {
  const { tp, lang } = useI18n();
  const { explLang } = useSternikPrefs();
  const showRu = lang === 'ru' && explLang !== 'pl';
  const showPl = explLang !== 'ru' || lang !== 'ru';
  const bi = useCallback((b: { pl: string; ru: string }) => {
    if (showPl && showRu) return `${b.pl} · ${b.ru}`;
    return showRu ? b.ru : b.pl;
  }, [showPl, showRu]);

  const [dialogue, setDialogue] = useState<Dialogue | null>(null);
  const [turnIdx, setTurnIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>('idle');
  const [checks, setChecks] = useState<TurnResult[] | null>(null);
  const [heard, setHeard] = useState<string | null>(null);
  const [sttOff, setSttOff] = useState(false);
  const [showScript, setShowScript] = useState(true);
  const [log, setLog] = useState<LogRow[]>([]);
  const [model, setModel] = useState<RadioModel>('M330');

  const rsRef = useRef<RadioState>(createInitialRadio('M330'));
  const [, force] = useState(0);
  const rs = rsRef.current;
  const audio = useRadioAudio(rs);
  const audioRef = useRef(audio);
  audioRef.current = audio;

  const recRef = useRef<MediaRecorder | null>(null);
  const chunks = useRef<BlobPart[]>([]);
  const [holdPct] = useState(0);

  const push = useCallback((text: string, kind: LogRow['kind'] = 'ui') => {
    setLog((l) => [...l.slice(-60), { t: Date.now(), text, kind }]);
  }, []);

  const dispatch = useCallback((e: RadioEvent) => {
    const prev = rsRef.current;
    const next = radioReducer(prev, e);
    rsRef.current = next;
    audioRef.current.onEvent(e, prev, next);
    if (next.deviceLog.length > prev.deviceLog.length) {
      const added = next.deviceLog.slice(prev.deviceLog.length);
      setLog((l) => [...l.slice(-60), ...added.map((d) => ({ t: d.t, text: d.text, kind: d.kind as LogRow['kind'] }))]);
    }
    force((n) => n + 1);
  }, []);

  const turn = dialogue?.turns[turnIdx] ?? null;
  const channelNow = CHANNELS[rs.channelIndex].num;

  /** the station transmits: a carrier on your channel, into your receiver */
  const stationSpeaks = useCallback(async (name: string, say: string) => {
    if (!say) return;
    push(`📻 ${name}: ${say}`, 'rx');
    const a = audioRef.current;
    a.unlock();
    const raw = await fetchStationVoice(say);
    const s = rsRef.current;
    scriptOver(CHANNELS[s.channelIndex].num, {
      startMs: Date.now(), durMs: 16_000, signal: SIG_STRONG, voice: 'male',
    });
    if (raw) await a.speak(raw);
  }, [push]);

  const start = useCallback((d: Dialogue) => {
    setDialogue(d);
    setTurnIdx(0);
    setPhase('idle');
    setChecks(null);
    setHeard(null);
    setLog([]);
    rsRef.current = createInitialRadio(model);
    // a radio you have to switch on yourself, like every other surface here
    force((n) => n + 1);
  }, [model]);

  // --- recording ---------------------------------------------------------------

  const beginRecording = useCallback(async () => {
    if (!turn || phase === 'recording' || phase === 'grading') return;
    audioRef.current.unlock();
    dispatch({ type: 'ptt-down' });
    if (!rsRef.current.ptt) return;   // the reducer refused (CH 70, or radio off)

    setChecks(null);
    setHeard(null);
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
          fd.append('audio', blob, 'turn.webm');
          const res = await fetch('/api/radio-transcribe', { method: 'POST', body: fd });
          const data = (await res.json()) as { transcript?: string; fallback?: boolean };
          if (data.fallback) { setSttOff(true); setPhase('idle'); return; }
          const text = (data.transcript ?? '').trim();
          setHeard(text);

          const graded = gradeTurn(text, turn.must);
          setChecks(graded.checks);
          recordWeak(
            'dialogue',
            graded.checks.filter((c) => !c.ok).map((c) => ({ id: c.id, label: c.label })),
            graded.checks.filter((c) => c.ok).map((c) => ({ id: c.id })),
          );
          push(`🎙 ${tp('Ты сказал', 'You said', 'Powiedziales')}: "${text}"`, 'tx');
          for (const c of graded.checks.filter((x) => !x.ok)) {
            push(`✗ ${tp('Не прозвучало', 'Missing', 'Nie padlo')}: ${c.label}`, 'bad');
          }
          push(`${tp('Оценка', 'Graded', 'Ocena')}: ${graded.score}%`, graded.passed ? 'step' : 'ui');

          // transmitting on the wrong channel is a real failure, so say so
          if (channelNow !== dialogue?.channel && turnIdx === 0) {
            push(`⚠ ${tp('Ты передавал на канале', 'You transmitted on channel', 'Nadawales na kanale')} ${channelNow}, ${tp('а разговор идёт на', 'but this conversation is on', 'a ta rozmowa jest na')} ${dialogue?.channel}`, 'bad');
          }

          if (graded.passed) {
            setPhase('answered');
            await stationSpeaks(turn.stationName, turn.stationSays);
          } else {
            setPhase('idle');
          }
        } catch {
          setPhase('idle');
        }
      };
      rec.start();
      setPhase('recording');
    } catch {
      setPhase('idle');
    }
  }, [channelNow, dialogue, dispatch, phase, push, stationSpeaks, tp, turn, turnIdx]);

  const endRecording = useCallback(() => {
    dispatch({ type: 'ptt-up' });
    try { recRef.current?.stop(); } catch { /* already stopped */ }
  }, [dispatch]);

  const nextTurn = useCallback(() => {
    if (!dialogue) return;
    if (turnIdx + 1 >= dialogue.turns.length) { setPhase('done'); return; }
    setTurnIdx(turnIdx + 1);
    setPhase('idle');
    setChecks(null);
    setHeard(null);
  }, [dialogue, turnIdx]);

  useEffect(() => () => { try { recRef.current?.stop(); } catch { /* noop */ } }, []);

  // --- the picker ---------------------------------------------------------------

  if (!dialogue) {
    return (
      <main>
        <h1 className="mb-1 text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          🎙 {tp('Живой разговор', 'Live conversation', 'Rozmowa na zywo')}
        </h1>
        <p className="mb-5 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          {tp(
            'Ты говоришь в микрофон - речь распознаётся и проверяется, а станция отвечает голосом. И ты отвечаешь ей. Это и есть радиосвязь: важно не только что ты передал, но и что ты УСЛЫШАЛ в ответ.',
            'You speak into the mic - your words are transcribed and checked - and the station answers out loud. Then you answer back. That is what a radio is: not only what you transmit, but what you CATCH coming back.',
            'Mowisz do mikrofonu - mowa jest rozpoznawana i sprawdzana, a stacja odpowiada glosem. I ty jej odpowiadasz. Na tym polega lacznosc: liczy sie nie tylko to, co nadales, ale i to, co USLYSZALES w odpowiedzi.',
          )}
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          {DIALOGUES.map((d) => (
            <button
              key={d.id}
              type="button"
              data-testid={`dialogue-${d.id}`}
              onClick={() => start(d)}
              className="rounded-2xl p-4 text-left transition"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
            >
              <div className="flex items-center gap-2">
                <span className="text-2xl">{d.icon}</span>
                <span className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>{bi(d.title)}</span>
              </div>
              <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{bi(d.brief)}</p>
              <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
                <span className="rounded-full px-2 py-1" style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
                  CH {d.channel}
                </span>
                <span className="rounded-full px-2 py-1" style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
                  {d.turns.length} {tp('передач', 'transmissions', 'nadan')}
                </span>
              </div>
            </button>
          ))}
        </div>
      </main>
    );
  }

  // --- the conversation ---------------------------------------------------------

  const done = phase === 'done';

  return (
    <main>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="rounded-full px-3 py-1 text-sm font-semibold" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}>
          {dialogue.icon} {bi(dialogue.title)}
        </span>
        <span className="rounded-full px-3 py-1 text-xs" style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
          CH {dialogue.channel}
        </span>
        <button
          type="button"
          data-testid="exit-dialogue"
          onClick={() => setDialogue(null)}
          className="ml-auto min-h-[40px] rounded-lg px-3 text-xs"
          style={{ background: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}
        >
          ✕ {tp('Выйти', 'Exit', 'Wyjdz')}
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,460px)_1fr]">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              data-testid="sound-toggle"
              onClick={audio.toggleMute}
              className="min-h-[40px] rounded-xl px-3 text-sm font-semibold"
              style={{ background: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}
            >
              {audio.muted ? '🔇' : '🔊'} {tp('Звук', 'Sound', 'Dzwiek')}
            </button>
            <span className="inline-flex overflow-hidden rounded-full" style={{ border: '1px solid var(--border-subtle)' }}>
              {(['M330', 'M323'] as RadioModel[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => { setModel(m); rsRef.current = createInitialRadio(m); force((n) => n + 1); }}
                  className="min-h-[40px] px-3 text-xs font-semibold"
                  style={model === m
                    ? { background: 'var(--accent-cyan)', color: 'var(--accent-ink, #04222e)' }
                    : { background: 'var(--bg-card)', color: 'var(--text-secondary)' }}
                >
                  IC-{m}
                </button>
              ))}
            </span>
          </div>

          <div onPointerDownCapture={audio.unlock}>
            <RadioFront
              s={rs}
              dispatch={dispatch}
              model={model}
              holdPct={holdPct}
              onDistressDown={() => dispatch({ type: 'distress-down' })}
              onDistressUp={() => dispatch({ type: 'distress-up' })}
              onPttDown={() => void beginRecording()}
              onPttUp={endRecording}
              clock="12:00"
              nextTxSec={radioProfile(model).retxSeconds}
              busy={audio.busy}
            />
          </div>

          <p className="mt-2 text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            {tp(
              'Включи рацию, поставь нужный канал и держи PTT, пока говоришь. Отпустил - передача ушла.',
              'Switch the radio on, set the channel, and hold PTT while you speak. Release and the transmission goes.',
              'Wlacz radio, ustaw kanal i trzymaj PTT, kiedy mowisz. Puszczasz - nadanie idzie w eter.',
            )}
          </p>
        </div>

        <div className="min-w-0">
          {/* the situation */}
          <div className="mb-3 rounded-2xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
            <div className="mb-1 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              {tp('Ситуация', 'Situation', 'Sytuacja')}
            </div>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>{bi(dialogue.brief)}</p>
          </div>

          {done ? (
            <div className="rounded-2xl p-4" style={{ background: 'rgba(68,255,136,0.08)', border: '1px solid rgba(68,255,136,0.25)' }}>
              <div className="text-sm font-bold" style={{ color: 'var(--success)' }}>
                ✓ {tp('Разговор завершён', 'Conversation complete', 'Rozmowa zakonczona')}
              </div>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{bi(dialogue.why)}</p>
              <button
                type="button"
                onClick={() => setDialogue(null)}
                className="mt-3 min-h-[44px] rounded-xl px-4 text-sm font-semibold"
                style={{ background: 'var(--accent-cyan)', color: 'var(--accent-ink, #04222e)' }}
              >
                {tp('К списку разговоров', 'Back to the conversations', 'Wroc do listy rozmow')}
              </button>
            </div>
          ) : (
            <div className="rounded-2xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                  {tp('Передача', 'Transmission', 'Nadanie')} {turnIdx + 1}/{dialogue.turns.length}
                </span>
                <button
                  type="button"
                  data-testid="toggle-script"
                  onClick={() => setShowScript((v) => !v)}
                  className="min-h-[32px] rounded-full px-2 text-[11px]"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {showScript ? tp('Скрыть текст (экзамен)', 'Hide the script (exam)', 'Ukryj tekst (egzamin)') : tp('Показать текст', 'Show the script', 'Pokaz tekst')}
                </button>
              </div>

              {showScript && turn && (
                <pre
                  data-testid="turn-script"
                  className="mb-2 overflow-x-auto whitespace-pre-wrap rounded-xl p-3 text-xs leading-relaxed"
                  style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}
                >
                  {turn.youSay}
                </pre>
              )}

              {turn && (
                <p className="mb-3 text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                  💡 {bi(turn.hint)}
                </p>
              )}

              {/* what happened to the last thing you said */}
              {heard !== null && (
                <div className="mb-3 rounded-xl p-3" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
                  <div className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                    {tp('Модель услышала', 'The model heard', 'Model uslyszal')}
                  </div>
                  <p data-testid="turn-heard" className="mt-0.5 text-sm" style={{ color: 'var(--text-primary)' }}>
                    &quot;{heard || tp('ничего', 'nothing', 'nic')}&quot;
                  </p>
                  {checks && (
                    <ul className="mt-2 space-y-1">
                      {checks.map((c) => (
                        <li key={c.id} className="flex gap-2 text-xs" style={{ color: c.ok ? 'var(--success)' : 'var(--danger)' }}>
                          <span>{c.ok ? '✓' : '✗'}</span>
                          <span>{c.label}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {phase === 'answered' ? (
                <button
                  type="button"
                  data-testid="next-turn"
                  onClick={nextTurn}
                  className="min-h-[44px] w-full rounded-xl px-4 text-sm font-semibold"
                  style={{ background: 'var(--accent-cyan)', color: 'var(--accent-ink, #04222e)' }}
                >
                  {turnIdx + 1 >= dialogue.turns.length
                    ? tp('Завершить разговор', 'Finish the conversation', 'Zakoncz rozmowe')
                    : tp('Дальше - твой ответ', 'Next - your reply', 'Dalej - twoja odpowiedz')}
                </button>
              ) : (
                <div className="text-sm font-semibold" style={{ color: phase === 'recording' ? 'var(--danger)' : 'var(--text-muted)' }}>
                  {phase === 'recording'
                    ? tp('🔴 Идёт передача - говори', '🔴 Transmitting - speak', '🔴 Nadajesz - mow')
                    : phase === 'grading'
                      ? tp('Слушаю...', 'Listening...', 'Slucham...')
                      : tp('Держи PTT на рации и говори', 'Hold PTT on the radio and speak', 'Trzymaj PTT na radiu i mow')}
                </div>
              )}

              {sttOff && (
                <p className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                  {tp(
                    'Распознавание речи сейчас недоступно - разговор можно только прочитать.',
                    'Speech recognition is unavailable right now - the conversation can only be read.',
                    'Rozpoznawanie mowy jest teraz niedostepne - rozmowe mozna tylko przeczytac.',
                  )}
                </p>
              )}
            </div>
          )}

          {/* the journal */}
          <div className="mt-3 rounded-2xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
            <div className="mb-2 text-sm font-semibold" style={{ color: 'var(--accent-cyan)' }}>
              📋 {tp('Дневник', 'Journal', 'Dziennik')}
            </div>
            {log.length === 0 ? (
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {tp('пусто - начни с включения рации', 'empty - start by switching the radio on', 'pusto - zacznij od wlaczenia radia')}
              </p>
            ) : (
              <ol data-testid="dialogue-journal" className="max-h-64 space-y-1 overflow-y-auto">
                {log.map((r, i) => {
                  const color = r.kind === 'bad' ? 'var(--danger)'
                    : r.kind === 'step' ? 'var(--success)'
                    : r.kind === 'tx' ? 'var(--warning)'
                    : r.kind === 'rx' ? 'var(--accent-cyan)'
                    : 'var(--text-secondary)';
                  return (
                    <li key={i} className="flex gap-2 text-xs leading-relaxed" style={{ color }}>
                      <span className="shrink-0 font-mono" style={{ color: 'var(--text-muted)' }}>
                        {new Date(r.t).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                      <span>{r.text}</span>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
