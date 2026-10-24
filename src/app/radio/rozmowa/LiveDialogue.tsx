'use client';

import { useRadioI18n } from "@/app/radio/localization/context";

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSternikPrefs, RadioVariantToggle } from "@/app/radio/prefs";
import RadioFront from '../symulator/RadioFront';
import { PanelSection, RadioWorkspace, DockPanel, SoundToggle, useRadioWorkspace } from '../symulator/RadioWorkspace';
import { useRadioAudio } from '../symulator/audio/useRadioAudio';
import { fetchStationVoice } from '../symulator/audio/stationVoice';
import { SIG_STRONG, scriptOver } from '../symulator/radioTraffic';
import {
  CHANNELS, createInitialRadio, radioProfile, radioReducer,
  type RadioEvent, type RadioModel, type RadioState,
} from '../symulator/radioModel';
import { DIALOGUES, type Dialogue } from './dialogues';
import { gradeTurn, type TurnResult } from './dialogueGrading';
import { pickReaction } from '../symulator/stationReaction';
import { SpeakButton } from '../audio/SpeakButton';
import { record as recordWeak } from '../weakSpots';
import { offlineRadio } from '../audio/localSpeech';
import { LocalTranscriptEntry, type LocalTranscriptEntryHandle, type TranscriptInputMode } from '../LocalTranscriptEntry';
import { fmt } from '../symulator/trainerText';

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
  const { rt: radioText, tl } = useRadioI18n();
  const { tp, lang } = useRadioI18n();
  const { explLang, radioRealistic } = useSternikPrefs();
  const skin = radioRealistic ? 'amber' : 'green';
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
  const [inputMode, setInputMode] = useState<TranscriptInputMode>('voice');
  const localEntry = useRef<LocalTranscriptEntryHandle>(null);
  const offline = offlineRadio();
  const [sttOff, setSttOff] = useState(false);
  const [showScript, setShowScript] = useState(true);
  const [log, setLog] = useState<LogRow[]>([]);
  const [model, setModel] = useState<RadioModel>('M330');

  const [rs, setRs] = useState<RadioState>(() => createInitialRadio('M330'));
  const rsRef = useRef<RadioState>(createInitialRadio('M330'));
  const audio = useRadioAudio(rs);
  const audioRef = useRef(audio);

  const recRef = useRef<MediaRecorder | null>(null);
  const chunks = useRef<BlobPart[]>([]);
  // PTT/getUserMedia race guards, mirroring usePushToTalk: a quick tap must never
  // leave the mic hot. wantRecording is true only while the button is held; genRef
  // hands each press a ticket so a stale recorder cannot start or grade; streamRef
  // lets the exit path release the mic; stopTimer caps a stuck press at 45s.
  const streamRef = useRef<MediaStream | null>(null);
  const wantRecording = useRef(false);
  const genRef = useRef(0);
  const aliveRef = useRef(true);
  const stopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [holdPct] = useState(0);
  /** the conversation's work screen: pinned radio, turn panel under it */
  const { stacked, compact } = useRadioWorkspace(dialogue !== null, radioRealistic);
  const dockRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    dockRef.current?.scrollTo({ top: 0 });
  }, [turnIdx]);

  const push = useCallback((text: string, kind: LogRow['kind'] = 'ui') => {
    setLog((l) => [...l.slice(-60), { t: Date.now(), text, kind }]);
  }, []);

  const dispatch = useCallback((e: RadioEvent) => {
    const prev = rsRef.current;
    const next = radioReducer(prev, e);
    rsRef.current = next;
    setRs(next);
    audioRef.current.onEvent(e, prev, next);
    if (next.deviceLog.length > prev.deviceLog.length) {
      const added = next.deviceLog.slice(prev.deviceLog.length);
      setLog((l) => [...l.slice(-60), ...added.map((d) => ({ t: d.t, text: d.text, kind: d.kind as LogRow['kind'] }))]);
    }
  }, []);

  const turn = dialogue?.turns[turnIdx] ?? null;
  const channelNow = CHANNELS[rs.channelIndex].num;

  /** the station transmits: a carrier on the CONVERSATION's channel, into your
   *  receiver. The carrier is scripted on the channel the traffic belongs on
   *  (the coast station does not chase the learner onto a wrong channel). */
  const stationSpeaks = useCallback(async (name: string, say: string, onChannel: string) => {
    if (!say) return;
    push(`📻 ${name}: ${say}`, 'rx');
    const a = audioRef.current;
    a.unlock();
    const raw = await fetchStationVoice(say);
    // No TTS means no transmission - the written reply stays, but no carrier is
    // put on the air just to let the synthetic babble wail into silence.
    if (!raw) return;
    const voiceMs = await a.speak(raw, onChannel);
    if (voiceMs <= 0) return;
    // carrier tracks the real voice, so the squelch closes when the voice stops
    scriptOver(onChannel, {
      startMs: Date.now(), durMs: Math.round(voiceMs) + 300, signal: SIG_STRONG, voice: 'male',
    });
  }, [push]);

  const start = useCallback((d: Dialogue) => {
    setDialogue(d);
    setTurnIdx(0);
    setPhase('idle');
    setChecks(null);
    setHeard(null);
    setLog([]);
    const initial = createInitialRadio(model);
    rsRef.current = initial;
    setRs(initial);
  }, [model]);

  const assessTranscript = useCallback(async (text: string, inputMode: TranscriptInputMode) => {
    if (!turn || !text.trim()) return;
    if (inputMode === 'typed' && wantRecording.current) return;
    if (!rsRef.current.power || CHANNELS[rsRef.current.channelIndex].noVoice) {
      push(tp('Включи рацию и выбери голосовой канал.', 'Switch the radio on and select a voice channel.', 'Włącz radio i wybierz kanał głosowy.'), 'bad');
      return;
    }
    setInputMode(inputMode);
    setPhase('grading');
    setHeard(text);

    const graded = gradeTurn(text, turn.must);
    setChecks(graded.checks);
    recordWeak(
      'dialogue',
      graded.checks.filter((c) => !c.ok).map((c) => ({ id: c.id, label: c.label })),
      graded.checks.filter((c) => c.ok).map((c) => ({ id: c.id })),
    );
    push(`${inputMode === 'typed' ? '⌨' : '🎙'} ${inputMode === 'typed' ? tp('Ты ввёл', 'You entered', 'Wpisałeś') : tp('Ты сказал', 'You said', 'Powiedziałeś')}: "${text}"`, 'tx');
    for (const c of graded.checks.filter((x) => !x.ok)) {
      push(`✗ ${tp('Не прозвучало', 'Missing', 'Nie padło')}: ${radioText(c.label)}`, 'bad');
    }
    push(`${tp('Оценка', 'Graded', 'Ocena')}: ${graded.score}%`, graded.passed ? 'step' : 'ui');

    // Transmitting on the wrong channel is a real failure, on EVERY turn -
    // the whole point of the marina/medico briefs is moving traffic OFF 16,
    // so pouring the berth details or the consultation onto 16 must be
    // flagged, not just the opening hail. `expectedChannel` is the channel
    // this turn belongs on (a post-switch turn carries its own `channel`).
    const expectedChannel = turn.channel ?? dialogue?.channel;
    const channelOk = !expectedChannel || channelNow === expectedChannel;
    if (!channelOk) {
      push(`⚠ ${tp('Ты передавал на канале', 'You transmitted on channel', 'Nadawałeś na kanale')} ${channelNow}, ${tp('а это должно идти на', 'but this belongs on', 'a to powinno iść na')} ${expectedChannel}`, 'bad');
    }

    if (graded.passed && channelOk) {
      setPhase('answered');
      // the station answers on the channel the traffic belongs on
      await stationSpeaks(turn.stationName, turn.stationSays, expectedChannel ?? channelNow);
    } else {
      // A station listening on the assigned channel cannot answer a
      // transmission made somewhere else. Keep the written trainer warning,
      // but do not make the station magically follow the learner.
      if (!channelOk) {
        setPhase('idle');
        return;
      }
      // Like real life: a poor / incomplete call gets a spoken RE-PROMPT
      // from the station ("what is your position, over") instead of silence,
      // so the learner hears the correction and tries the SAME turn again.
      const missed = graded.checks.filter((c) => !c.ok).map((c) => c.id);
      const distress = turn.must.some((m) => m.id === 'mayday' || m.id === 'panpan' || m.id === 'securite');
      const reaction = pickReaction(missed, { distress, unreadable: !text.trim() });
      setPhase('answered');
      await stationSpeaks(reaction.station, reaction.say, channelNow);
      setPhase('idle');
    }
  }, [channelNow, dialogue, push, stationSpeaks, tp, turn, radioText]);

  // --- recording ---------------------------------------------------------------

  const beginRecording = useCallback(async () => {
    if (!turn || phase === 'recording' || phase === 'grading') return;
    audioRef.current.unlock();
    dispatch({ type: 'ptt-down' });
    if (!rsRef.current.ptt) return;   // the reducer refused (CH 70, or radio off)
    if (offlineRadio()) { localEntry.current?.startRecording(); return; }

    // Every press takes a ticket. If the finger lifts (or the user exits) before
    // the mic finishes opening, this press is no longer current and nothing starts.
    const ticket = ++genRef.current;
    const isCurrent = () => aliveRef.current && genRef.current === ticket;
    wantRecording.current = true;

    setChecks(null);
    setHeard(null);

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch {
      if (isCurrent()) setPhase('idle');
      return;
    }

    // The whole point of the guard: by the time the mic opened, a quick tap may
    // already be released. Close the stream and bail before any recorder starts.
    if (!isCurrent() || !wantRecording.current) {
      stream.getTracks().forEach((t) => t.stop());
      if (isCurrent()) setPhase('idle');
      return;
    }

    streamRef.current = stream;
    const rec = new MediaRecorder(stream);
    recRef.current = rec;
    chunks.current = [];
    rec.ondataavailable = (e) => { if (e.data.size > 0) chunks.current.push(e.data); };
    rec.onstop = async () => {
      if (stopTimer.current) { clearTimeout(stopTimer.current); stopTimer.current = null; }
      stream.getTracks().forEach((t) => t.stop());
      if (streamRef.current === stream) streamRef.current = null;
      if (recRef.current === rec) recRef.current = null;
      if (!isCurrent()) return;   // a superseded or abandoned press: drop it silently
      const blob = new Blob(chunks.current, { type: rec.mimeType || 'audio/webm' });
      if (blob.size === 0) { setPhase('idle'); return; }
      setPhase('grading');
      try {
        const fd = new FormData();
        fd.append('audio', blob, 'turn.webm');
        const res = await fetch('/api/radio-transcribe', { method: 'POST', body: fd });
        // A 429 / 413 / 502 must NOT be graded as "you missed everything" - that
        // poisons weakSpots and tells a correct learner they were wrong. Only a
        // real transcript is ever graded.
        if (!res.ok) { if (isCurrent()) { setSttOff(true); setPhase('idle'); } return; }
        const data = (await res.json()) as { transcript?: string; fallback?: boolean };
        if (data.fallback) { if (isCurrent()) { setSttOff(true); setPhase('idle'); } return; }
        if (!isCurrent()) return;

        const text = (data.transcript ?? '').trim();
        if (!text) {
          // Silence (muted mic, headset not routed) is not a failed turn - clear
          // the heard text, count nothing against the learner, let them retry.
          setHeard('');
          setPhase('idle');
          return;
        }
        await assessTranscript(text, "voice");
      } catch {
        if (isCurrent()) setPhase('idle');
      }
    };
    // Never let the recorder run forever - VoicePtt caps a held press at 45s.
    stopTimer.current = setTimeout(() => { try { rec.stop(); } catch { /* already stopped */ } }, 45000);
    rec.start();
    setPhase('recording');
  }, [assessTranscript, dispatch, phase, turn]);

  const endRecording = useCallback(() => {
    wantRecording.current = false;
    dispatch({ type: 'ptt-up' });
    if (offlineRadio()) { localEntry.current?.stopRecording(); return; }
    try { recRef.current?.stop(); } catch { /* already stopped, or never started */ }
  }, [dispatch]);

  /** Tear down the mic completely: invalidate the ticket, stop the recorder and
   *  release the stream. Used on exit and on dialogue change so a tap in flight
   *  can never leave the microphone open behind the picker. */
  const stopRecording = useCallback(() => {
    genRef.current += 1;
    wantRecording.current = false;
    if (stopTimer.current) { clearTimeout(stopTimer.current); stopTimer.current = null; }
    try { recRef.current?.stop(); } catch { /* already stopped */ }
    recRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setPhase('idle');
  }, []);

  const exitDialogue = useCallback(() => {
    stopRecording();
    setDialogue(null);
  }, [stopRecording]);

  const nextTurn = useCallback(() => {
    if (!dialogue) return;
    if (turnIdx + 1 >= dialogue.turns.length) { setPhase('done'); return; }
    setTurnIdx(turnIdx + 1);
    setPhase('idle');
    setChecks(null);
    setHeard(null);
  }, [dialogue, turnIdx]);

  // alive tracks a real unmount, so a late transcript never touches a dead panel.
  useEffect(() => {
    aliveRef.current = true;
    return () => { aliveRef.current = false; };
  }, []);
  useEffect(() => {
    audioRef.current = audio;
  }, [audio]);
  // leaving a conversation - or the page - must never leave the mic hot.
  useEffect(() => () => { stopRecording(); }, [dialogue, stopRecording]);

  // --- the picker ---------------------------------------------------------------

  if (!dialogue) {
    return (
      <div>
        <h1 className="mb-1 text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          🎙 {radioText(tp('Живой разговор', 'Live conversation', 'Rozmowa na żywo'))}
        </h1>
        <p className="mb-5 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          {tl({
            ru: 'Говори или вводи передачу по-английски. Проверь её содержание, получи ответ станции и продолжи разговор.',
            en: 'Speak or type in English. Check your transmission, receive the station reply and continue the conversation.',
            pl: 'Nadaj głosem lub wpisz komunikat po angielsku. Sprawdź jego treść, odbierz odpowiedź stacji i kontynuuj rozmowę.',
            es: 'Habla o escribe tu transmisión en inglés. Comprueba el contenido, recibe la respuesta de la estación y continúa la conversación.',
            fr: 'Parlez ou saisissez votre message en anglais. Vérifiez son contenu, recevez la réponse de la station et poursuivez l\'échange.',
            de: 'Sprich oder tippe deine Meldung auf Englisch. Prüfe den Inhalt, empfange die Antwort der Station und setze das Gespräch fort.',
            it: 'Trasmetti a voce o scrivi il messaggio in inglese. Verifica il contenuto, ricevi la risposta della stazione e continua la conversazione.',
          })}
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
                <span className="text-2xl">{radioText(d.icon)}</span>
                <span className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>{radioText(bi(d.title))}</span>
              </div>
              <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{radioText(bi(d.brief))}</p>
              <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
                <span className="rounded-full px-2 py-1" style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
                  CH {radioText(d.channel)}
                </span>
                <span className="rounded-full px-2 py-1" style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
                  {radioText(d.turns.length)} {radioText(tp('передач', 'transmissions', 'nadań'))}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // --- the conversation ---------------------------------------------------------

  const done = phase === 'done';
  const expectedChannel = turn?.channel ?? dialogue.channel;
  const configurationWarning = !rs.power || CHANNELS[rs.channelIndex].noVoice
    ? tp('Включи рацию и выбери голосовой канал.', 'Switch the radio on and select a voice channel.', 'Włącz radio i wybierz kanał głosowy.')
    : expectedChannel && channelNow !== expectedChannel
      ? fmt(tl({
        ru: 'Выбери канал {channel} для этой передачи.', en: 'Select channel {channel} for this transmission.',
        pl: 'Wybierz kanał {channel} dla tego komunikatu.', es: 'Selecciona el canal {channel} para esta transmisión.',
        fr: 'Sélectionnez le canal {channel} pour cette transmission.', de: 'Wähle Kanal {channel} für diese Meldung.',
        it: 'Seleziona il canale {channel} per questa trasmissione.',
      }), { channel: expectedChannel })
      : null;

  // The conversation runs on the radio work screen: the radio is pinned (PTT is
  // always one thumb away), the turn, the situation and the journal scroll under it.
  return (
    <RadioWorkspace
      testId="dialogue-workspace"
      stacked={stacked}
      onExit={exitDialogue}
      exitTestId="exit-dialogue"
      exitTitle={tp('К списку разговоров', 'Back to the conversations', 'Wróć do listy rozmów')}
      status={(
        <>
          <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
            CH {radioText(dialogue.channel)}
          </span>
          <span className="text-xs font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>
            {radioText(done
              ? tp('Готово', 'Done', 'Gotowe')
              : `${tp('Передача', 'Transmission', 'Nadanie')} ${turnIdx + 1}/${dialogue.turns.length}`)}
          </span>
          {!stacked && (
            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{radioText(dialogue.icon)} {radioText(bi(dialogue.title))}</span>
          )}
        </>
      )}
      actions={<SoundToggle muted={audio.muted} onToggle={audio.toggleMute} />}
      onRadioPointerDown={audio.unlock}
      radio={(
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
          skin={skin}
          realistic={radioRealistic}
          compact={compact}
        />
      )}
      requestVersion={turnIdx}
      requestedPanel="task"
      dockRef={dockRef}
      dock={(
        <>
          <DockPanel id="task" label={tp("Задание","Task","Zadanie")}>
          {done ? (
            <div className="rounded-2xl p-4" style={{ background: 'rgba(68,255,136,0.08)', border: '1px solid rgba(68,255,136,0.25)' }}>
              <div className="text-sm font-bold" style={{ color: 'var(--success)' }}>
                ✓ {radioText(tp('Разговор завершён', 'Conversation complete', 'Rozmowa zakończona'))}
              </div>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{radioText(bi(dialogue.why))}</p>
              <button
                type="button"
                onClick={exitDialogue}
                className="mt-3 min-h-[44px] rounded-xl px-4 text-sm font-semibold"
                style={{ background: 'var(--accent-cyan)', color: 'var(--accent-ink, #04222e)' }}
              >
                {radioText(tp('К списку разговоров', 'Back to the conversations', 'Wróć do listy rozmów'))}
              </button>
            </div>
          ) : (
            <div className="rounded-2xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="min-w-0 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {stacked ? <>{radioText(dialogue.icon)} {radioText(bi(dialogue.title))}</> : `${tp('Передача', 'Transmission', 'Nadanie')} ${turnIdx + 1}/${dialogue.turns.length}`}
                </span>
                <button
                  type="button"
                  data-testid="toggle-script"
                  onClick={() => setShowScript((v) => !v)}
                  className="min-h-[44px] shrink-0 rounded-full px-2 text-[11px]"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {radioText(showScript ? tp('Скрыть текст (экзамен)', 'Hide the script (exam)', 'Ukryj tekst (egzamin)') : tp('Показать текст', 'Show the script', 'Pokaż tekst'))}
                </button>
              </div>

              <LocalTranscriptEntry key={`${dialogue.id}-${turnIdx}`} ref={localEntry} allowVoice={offline} onSubmit={assessTranscript} disabled={phase === 'answered' || phase === 'recording' || phase === 'grading' || done}
                feedback={configurationWarning && <p data-testid="dialogue-setup-warning" role="status" aria-live="polite" className="rounded-xl border p-3 text-sm" style={{ borderColor: 'var(--warning)', color: 'var(--text-primary)', background: 'var(--bg-secondary)' }}>{configurationWarning}</p>} />

              {/* what to do now comes first: the PTT state of this turn */}
              {phase === 'answered' ? (
                <button
                  type="button"
                  data-testid="next-turn"
                  onClick={nextTurn}
                  className="mb-3 min-h-[44px] w-full rounded-xl px-4 text-sm font-semibold"
                  style={{ background: 'var(--accent-cyan)', color: 'var(--accent-ink, #04222e)' }}
                >
                  {radioText(turnIdx + 1 >= dialogue.turns.length
                    ? tp('Завершить разговор', 'Finish the conversation', 'Zakończ rozmowę')
                    : tp('Дальше - твой ответ', 'Next - your reply', 'Dalej - twoja odpowiedź'))}
                </button>
              ) : (
                <div className="mb-3 text-sm font-semibold" style={{ color: phase === 'recording' ? 'var(--danger)' : 'var(--text-muted)' }}>
                  {radioText(phase === 'recording'
                    ? tp('🔴 Идёт передача - говори', '🔴 Transmitting - speak', '🔴 Nadajesz - mów')
                    : phase === 'grading'
                      ? tp('Слушаю...', 'Listening...', 'Słucham...')
                      : tp('Держи PTT на рации и говори', 'Hold PTT on the radio and speak', 'Trzymaj PTT na radiu i mów'))}
                </div>
              )}

              {/* what happened to the last thing you said - announced to a screen
                  reader, since the verdict appears seconds after the user speaks */}
              {heard !== null && (
                <div className="mb-3 rounded-xl p-3" aria-live="polite" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
                  <div className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                    {inputMode === 'typed' ? tp('Проверенный текст', 'Checked text', 'Sprawdzony tekst') : tp('Модель услышала', 'The model heard', 'Model usłyszał')}
                  </div>
                  <p data-testid="turn-heard" className="mt-0.5 text-sm" style={{ color: 'var(--text-primary)' }}>{radioText(" \"")}{heard || tp('ничего', 'nothing', 'nic')}{radioText("\" ")}</p>
                  {checks && (
                    <ul className="mt-2 space-y-1">
                      {checks.map((c) => (
                        <li key={c.id} className="flex gap-2 text-xs" style={{ color: c.ok ? 'var(--success)' : 'var(--danger)' }}>
                          <span>{radioText(c.ok ? '✓' : '✗')}</span>
                          <span>{radioText(c.label)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {showScript && turn && (
                <div className="mb-2">
                  <div className="mb-1 flex items-center gap-2">
                    <SpeakButton text={turn.youSay} label={tp('Прослушать эталон', 'Play the model', 'Posłuchaj wzorca')} size={22} />
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {radioText(tp('Как это должно звучать', 'How it should sound', 'Jak to ma brzmieć'))}
                    </span>
                  </div>
                  <pre
                    data-testid="turn-script"
                    className="overflow-x-auto whitespace-pre-wrap rounded-xl p-3 text-xs leading-relaxed"
                    style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}
                  >
                    {turn.youSay}
                  </pre>
                </div>
              )}

              {turn && (
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                  💡 {radioText(bi(turn.hint))}
                </p>
              )}

              {sttOff && (
                <p className="mt-2 text-xs" role="alert" style={{ color: 'var(--text-muted)' }}>
                  {radioText(tp(
                    'Распознавание речи сейчас недоступно - разговор можно только прочитать.',
                    'Speech recognition is unavailable right now - the conversation can only be read.',
                    'Rozpoznawanie mowy jest teraz niedostępne - rozmowę można tylko przeczytać.',
                  ))}
                </p>
              )}
            </div>
          )}

          {/* the situation */}
          </DockPanel>
          <DockPanel id="situation" label={tp("Ситуация","Situation","Sytuacja")}>
          <PanelSection
            title={radioText((
              <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                {tp('Ситуация', 'Situation', 'Sytuacja')}
              </span>
            ))}
          >
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>{radioText(bi(dialogue.brief))}</p>
            <p className="mt-2 text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              {radioText(tp(
                'Включи рацию, поставь нужный канал и держи PTT, пока говоришь. Отпустил - передача ушла.',
                'Switch the radio on, set the channel, and hold PTT while you speak. Release and the transmission goes.',
                'Włącz radio, ustaw kanał i trzymaj PTT, kiedy mówisz. Puszczasz - nadanie idzie w eter.',
              ))}
            </p>
          </PanelSection>

          </DockPanel>
          <DockPanel id="log" label={tp("Журнал","Log","Dziennik")}>
          {/* the journal */}
          <PanelSection
            title={radioText((
              <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                📋 {tp('Дневник', 'Journal', 'Dziennik')} {log.length > 0 && <span className="font-normal" style={{ color: 'var(--text-muted)' }}>({log.length})</span>}
              </span>
            ))}
          >
            {log.length === 0 ? (
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {radioText(tp('пусто - начни с включения рации', 'empty - start by switching the radio on', 'pusto - zacznij od włączenia radia'))}
              </p>
            ) : (
              <ol data-testid="dialogue-journal" className={`space-y-1 ${stacked ? '' : 'max-h-64 overflow-y-auto'}`}>
                {log.map((r, i) => {
                  const color = r.kind === 'bad' ? 'var(--danger)'
                    : r.kind === 'step' ? 'var(--success)'
                    : r.kind === 'tx' ? 'var(--warning)'
                    : r.kind === 'rx' ? 'var(--accent-cyan)'
                    : 'var(--text-secondary)';
                  return (
                    <li key={i} className="flex gap-2 text-xs leading-relaxed" style={{ color }}>
                      <span className="shrink-0 font-mono" style={{ color: 'var(--text-muted)' }}>
                        {radioText(new Date(r.t).toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit', second: '2-digit' }))}
                      </span>
                      <span>{radioText(r.text)}</span>
                    </li>
                  );
                })}
              </ol>
            )}
          </PanelSection>

          </DockPanel>
          <DockPanel id="device" label={tp("Рация","Radio","Radio")}>
          {/* rarely used: which set (switching restarts the radio) */}
          <PanelSection
            defaultOpen={false}
            title={radioText((
              <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                {tp('Рация', 'Radio', 'Radio')}
              </span>
            ))}
          >
            <RadioVariantToggle
              model={model}
              onModel={(m) => {
                const initial = createInitialRadio(m);
                setModel(m);
                rsRef.current = initial;
                setRs(initial);
              }}
            />
          </PanelSection>
          </DockPanel>
        </>
      )}
    />
  );
}
