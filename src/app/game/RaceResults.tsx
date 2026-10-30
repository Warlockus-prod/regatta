'use client';

// Results screen of the solo race (/game): place and time, the judge's
// debrief, the fleet table, the mission card, the coach, the leaderboard save
// and the replay share. Presentational: GameClient owns every state and action.

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useEffect, useState, type RefObject } from 'react';
import { useI18n } from '@/lib/i18n';
import { formatRecordTime, type BestRecord } from '@/lib/best-times';
import { coachTitle, coachExplanation, coachFix, coachNextGoal } from '@/lib/fallback-coach';
import type { Mission } from '@/data/missions';
import type { RaceJudgeDebrief } from "@/lib/race-judge";
import type { PhysicalRaceProfile } from "@/lib/race-context";
import type { Difficulty } from './config';
import type { useRaceCopy } from "./race-copy";
import { PhysicalTrialNote } from "./RaceBriefing";
import { formatTime, type Boat, type Coaching, type RaceResultRow } from "./race-model";

// Loaded only where used: the judge on the results screen.
const RaceJudgeReview = dynamic(() => import("./RaceJudgeReview").then(m => m.RaceJudgeReview), { ssr: false });

export type NativeSaveStatus = "idle" | "saving" | "saved" | "error";
export interface NativeBestSaveState { status: "idle" | "saving" | "saved" | "error"; id: string; requestId: string; retryable: boolean }
export type LeaderboardSaveState = 'idle' | 'prompting' | 'saving' | 'saved' | 'error';

export function RaceResults({
  copy, trialProfile, judgeDebrief, boatsRef, nativeRace, nativeSave, retryNativeSave, nativeBestSave, sceneRaceId, requestNativeBest,
  results, isNewRecord, bestRecord, missionResult, coachingSource, coaching, coachingLoading, coachingError,
  saveState, setSaveState, saveError, saveResult, nicknameInput, setNicknameInput, replayCode, nickname,
  difficulty, windStrength, selectedMission, replayDisabled, onMenu, onReplay, onAgain,
}: {
  copy: ReturnType<typeof useRaceCopy>;
  trialProfile: PhysicalRaceProfile | null;
  judgeDebrief: RaceJudgeDebrief | null;
  boatsRef: RefObject<Boat[]>;
  nativeRace: boolean;
  nativeSave: NativeSaveStatus;
  retryNativeSave: () => void;
  nativeBestSave: NativeBestSaveState;
  sceneRaceId: string;
  requestNativeBest: (raceId: string, action?: "request" | "retry") => void;
  results: RaceResultRow[];
  isNewRecord: boolean;
  bestRecord: BestRecord | null;
  missionResult: { passed: boolean; reasons: string[]; mission: Mission } | null;
  coachingSource: "local" | "ai";
  coaching: Coaching | null;
  coachingLoading: boolean;
  coachingError: string | null;
  saveState: LeaderboardSaveState;
  setSaveState: (state: LeaderboardSaveState) => void;
  saveError: string | null;
  saveResult: (withNickname?: string) => void;
  nicknameInput: string;
  setNicknameInput: (value: string) => void;
  replayCode: string | null;
  nickname: string | null;
  difficulty: Difficulty;
  windStrength: 'light' | 'medium' | 'heavy';
  selectedMission: Mission | null;
  replayDisabled: boolean;
  onMenu: () => void;
  onReplay: () => void;
  onAgain: () => void;
}) {
  const { tp } = useI18n();
  const playerFinished = results.find((r) => r.isPlayer);
  const playerRank = results.findIndex((r) => r.isPlayer) + 1;
  return (
        <div className="h-full overflow-y-auto overscroll-contain bg-[var(--bg-primary)] px-4 py-6 sm:px-6" data-testid="race-results">
          <div className="mx-auto w-full max-w-2xl [&_button]:min-h-11">
            <PhysicalTrialNote profile={trialProfile} />
            {judgeDebrief && <div className="mb-5" data-testid="race-judge-review"><RaceJudgeReview debrief={judgeDebrief}
              boatName={id => boatsRef.current.find(b => b.id === id)?.name ?? id} /></div>}
            {nativeRace && nativeSave !== "idle" && <div className="mb-4 text-sm" role="status">{nativeSave === "saved" ? copy.saved : nativeSave === "error" ? copy.saveError : copy.saving}{nativeSave === "error" && <button type="button" className="ml-2 underline" onClick={retryNativeSave}>{copy.retry}</button>}</div>}
            {nativeRace && nativeBestSave.id === sceneRaceId && nativeBestSave.status !== "idle" && <div className="mb-4 text-sm" role="status" data-testid="native-personal-best-status">
              {nativeBestSave.status === "saved" ? copy.personalBestChecked : nativeBestSave.status === "error" ? copy.personalBestError : copy.personalBestSaving}
              {nativeBestSave.status === "error" && nativeBestSave.retryable && <button type="button" className="ml-2 underline" aria-label={copy.retryPersonalBest} onClick={() => requestNativeBest(nativeBestSave.id, "retry")}>{copy.retry}</button>}
            </div>}
            <div className="text-center mb-5">
              <div className="text-sm text-[var(--text-muted)] mb-2">{tp('РЕЗУЛЬТАТ', 'RESULT', 'WYNIK', { es: 'RESULTADO', fr: 'RÉSULTAT', de: 'ERGEBNIS', it: 'RISULTATO' })}</div>
              {playerFinished?.time !== undefined && playerFinished.time !== Infinity ? (
                <>
                  <div className="text-5xl font-bold mb-2" style={{
                    color: playerRank === 1 ? 'var(--warning)' : playerRank <= 3 ? 'var(--success)' : 'var(--text-primary)',
                  }}>
                    {playerRank}
                    <span className="text-2xl text-[var(--text-muted)]"> {tp('из', 'of', 'z', { es: 'de', fr: 'sur', de: 'von', it: 'su' })} {results.length}</span>
                  </div>
                  <div className="text-xl font-mono text-[var(--text-secondary)]">{formatTime(playerFinished.time)}</div>
                  {/* New-personal-best banner. Only shows after the player
                      finished AND beat their previous time on this
                      difficulty + wind bucket. Native waits for its own
                      durable PB ACK; web uses checked synchronous storage. */}
                  {isNewRecord && (
                    <div
                      className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-bold"
                      style={{
                        background: 'linear-gradient(90deg, rgba(255,170,0,0.18), rgba(255,80,40,0.22))',
                        border: '1px solid rgba(255, 170, 0, 0.55)',
                        color: 'var(--warning)',
                      }}
                    >
                      🏆 {tp('Новый рекорд!', 'New record!', 'Nowy rekord!',
                        { es: '¡Nuevo récord!', fr: 'Nouveau record !', de: 'Neuer Rekord!', it: 'Nuovo record!' })}
                    </div>
                  )}
                  {!isNewRecord && bestRecord && (
                    <div className="mt-2 text-xs text-[var(--text-muted)]">
                      {tp('Твой рекорд:', 'Your best:', 'Twój rekord:',
                        { es: 'Tu récord:', fr: 'Ton record :', de: 'Dein Rekord:', it: 'Il tuo record:' })}{' '}
                      <span className="font-mono">{formatRecordTime(bestRecord.timeSec)}</span>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="text-3xl font-bold mb-2" style={{ color: 'var(--danger)' }}>{tp('Не финишировал', 'Did not finish', 'Nie ukończono', { es: 'No has terminado', fr: 'Course non terminée', de: 'Nicht im Ziel', it: 'Regata non conclusa' })}</div>
                  <div className="text-sm text-[var(--text-secondary)]">{tp('Время вышло', 'Time\'s up', 'Czas minął', { es: 'Se acabó el tiempo', fr: 'Temps écoulé', de: 'Zeit abgelaufen', it: 'Tempo scaduto' })}</div>
                </>
              )}
            </div>

            {/* Compact leaderboard - collapsed by default, only winner + you shown on mobile */}
            <details className="mb-5 border-y border-[var(--border-subtle)]">
              <summary className="min-h-11 cursor-pointer py-3 text-xs font-semibold tracking-wider text-[var(--text-muted)] flex items-center justify-between">
                <span>{tp('РЕЗУЛЬТАТЫ ГОНКИ', 'RACE RESULTS', 'WYNIKI WYŚCIGU', { es: 'RESULTADOS DE LA REGATA', fr: 'RÉSULTATS DE LA COURSE', de: 'ERGEBNISSE', it: 'RISULTATI DELLA REGATA' })} ({results.length})</span>
                <span className="text-[var(--accent-cyan)]">▾</span>
              </summary>
              <div className="mt-3 space-y-1">
                {results.map((r, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between py-1.5 px-2 rounded"
                    style={{
                      background: r.isPlayer ? 'rgba(0, 212, 255, 0.1)' : 'transparent',
                      border: r.isPlayer ? '1px solid rgba(0, 212, 255, 0.3)' : '1px solid transparent',
                    }}
                  >
                    <div className="flex items-center gap-2">
                      {/* A boat that did not finish gets no place and no medal. */}
                      <span className="text-xs font-mono w-5" style={{ color: i === 0 && r.time !== Infinity ? 'var(--warning)' : 'var(--text-muted)' }}>
                        {r.time === Infinity ? '-' : i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}
                      </span>
                      <div className="w-2 h-2 rounded-full" style={{ background: r.color }} />
                      <span className={`text-xs ${r.isPlayer ? 'font-semibold' : ''}`}>{r.isPlayer ? tp('Ты', 'You', 'Ty', { es: 'Tú', fr: 'Toi', de: 'Du', it: 'Tu' }) : r.name}</span>
                    </div>
                    <span className="text-xs font-mono text-[var(--text-secondary)]">
                      {r.time === Infinity ? 'DNF' : formatTime(r.time)}
                    </span>
                  </div>
                ))}
              </div>
            </details>

            {/* Mission result card */}
            {missionResult && (
              <div className="mb-4 p-3 rounded-lg" style={{
                background: missionResult.passed ? 'rgba(68, 255, 136, 0.08)' : 'rgba(255, 170, 0, 0.08)',
                border: `1px solid ${missionResult.passed ? 'rgba(68, 255, 136, 0.35)' : 'rgba(255, 170, 0, 0.35)'}`,
              }}>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-lg">{missionResult.mission.emoji}</span>
                  <div className="text-sm font-semibold flex-1" style={{ color: missionResult.passed ? 'var(--success)' : 'var(--warning)' }}>
                    {missionResult.passed
                      ? tp('✓ Миссия пройдена', '✓ Mission passed', '✓ Misja zaliczona', { es: '✓ Misión cumplida', fr: '✓ Mission réussie', de: '✓ Mission geschafft', it: '✓ Missione compiuta' })
                      : tp('⚠ Миссия провалена', '⚠ Mission failed', '⚠ Misja niezaliczona', { es: '⚠ Misión fallida', fr: '⚠ Mission ratée', de: '⚠ Mission gescheitert', it: '⚠ Missione fallita' })
                    }: {tp(missionResult.mission.titleRu, missionResult.mission.titleEn, missionResult.mission.titlePl, { es: missionResult.mission.titleEs, fr: missionResult.mission.titleFr, de: missionResult.mission.titleDe, it: missionResult.mission.titleIt })}
                  </div>
                </div>
                <ul className="text-xs text-[var(--text-secondary)] space-y-0.5 list-disc list-inside">
                  {missionResult.reasons.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* AI Coach */}
            <section className="mb-5 border-t border-[var(--border-subtle)] py-5">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">🧭</span>
                <div className="text-sm font-semibold text-[var(--text-primary)]">{coachingSource === "local" ? copy.debrief : tp('AI-тренер', 'AI coach', 'Trener AI',
                  { es: 'Entrenador IA', fr: 'Coach IA', de: 'KI-Trainer', it: 'Coach IA' })}</div>
              </div>
              {/* Apple Review 2025 + EU AI Act: explicit AI-content disclosure. */}
              {coachingSource === "ai" && <div className="text-[10px] text-[var(--text-muted)] mb-3 leading-relaxed">
                {tp(
                  'Разбор сгенерирован языковой моделью OpenAI по твоему логу гонки. Может ошибаться. Подробности в ',
                  'Generated by an OpenAI language model from your race log. Can be wrong. Details in our ',
                  'Wygenerowane przez model językowy OpenAI na podstawie zapisu twojego wyścigu. Może się mylić. Szczegóły w ',
                  {
                    es: 'Generado por un modelo de lenguaje de OpenAI a partir del registro de tu regata. Puede equivocarse. Más detalles en la ',
                    fr: 'Généré par un modèle de langage d\'OpenAI à partir du journal de ta course. Peut se tromper. Détails dans la ',
                    de: 'Erstellt von einem Sprachmodell von OpenAI anhand deines Rennprotokolls. Kann sich irren. Details in der ',
                    it: 'Generato da un modello linguistico di OpenAI a partire dal log della tua regata. Può sbagliare. Dettagli nell\'',
                  },
                )}
                <a href="/privacy" target="_blank" rel="noopener" className="underline hover:text-[var(--accent-cyan)]">{tp('политике конфиденциальности', 'privacy policy', 'polityce prywatności',
                  { es: 'política de privacidad', fr: 'politique de confidentialité', de: 'Datenschutzerklärung', it: 'informativa sulla privacy' })}</a>.
              </div>}
              {coachingLoading && <AnalyzingProgress />}
              {coachingError && !coaching && (
                <div className="text-xs text-[var(--text-muted)] italic">{coachingError}</div>
              )}
              {coaching && (
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="text-xs uppercase tracking-wider text-[var(--text-muted)]">{tp('Оценка', 'Score', 'Ocena', { es: 'Puntuación', fr: 'Note', de: 'Bewertung', it: 'Punteggio' })}</div>
                      <div className="text-lg font-bold" style={{
                        color: coaching.score >= 75 ? 'var(--success)' : coaching.score >= 50 ? 'var(--warning)' : 'var(--danger)',
                      }}>
                        {coaching.score}/100
                      </div>
                    </div>
                    <p className="text-sm text-[var(--text-primary)] leading-relaxed">{coaching.overall}</p>
                  </div>

                  {coaching.mistakes.length > 0 && (
                    <div>
                      <div className="text-xs uppercase tracking-wider text-[var(--text-muted)] mb-2">{tp('Ошибки', 'Mistakes', 'Błędy', { es: 'Errores', fr: 'Erreurs', de: 'Fehler', it: 'Errori' })}</div>
                      <div className="space-y-2">
                        {coaching.mistakes.map((m, i) => (
                          <div key={i} className="text-xs p-2 rounded" style={{ background: 'var(--bg-secondary)' }}>
                            <div className="flex items-start gap-2 mb-1">
                              <span className="text-[10px] px-1.5 py-0.5 rounded" style={{
                                background: m.severity === 'major' ? 'rgba(255, 68, 68, 0.2)' : 'rgba(255, 170, 0, 0.2)',
                                color: m.severity === 'major' ? 'var(--danger)' : 'var(--warning)',
                              }}>
                                {formatTime(m.timeStart)}-{formatTime(m.timeEnd)}
                              </span>
                              <div className="font-semibold text-[var(--text-primary)]">{coachTitle(m)}</div>
                            </div>
                            <p className="text-[var(--text-secondary)] leading-relaxed mb-1">{coachExplanation(m)}</p>
                            <p className="text-[var(--success)] leading-relaxed">💡 {coachFix(m)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {coaching.strengths.length > 0 && (
                    <div>
                      <div className="text-xs uppercase tracking-wider text-[var(--text-muted)] mb-1">{tp('Сильные стороны', 'Strengths', 'Mocne strony', { es: 'Puntos fuertes', fr: 'Points forts', de: 'Stärken', it: 'Punti di forza' })}</div>
                      <ul className="text-xs text-[var(--text-secondary)] space-y-0.5">
                        {coaching.strengths.map((s, i) => (
                          <li key={i} className="flex items-start gap-1">
                            <span className="text-[var(--success)]">✓</span>
                            <span>{s}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="pt-2 border-t border-[var(--border-subtle)]">
                    <div className="text-xs uppercase tracking-wider text-[var(--text-muted)] mb-1">{tp('Цель на следующую гонку', 'Goal for next race', 'Cel na następny wyścig', { es: 'Objetivo para la próxima regata', fr: 'Objectif pour la prochaine course', de: 'Ziel für das nächste Rennen', it: 'Obiettivo per la prossima regata' })}</div>
                    <p className="text-xs text-[var(--text-secondary)]">{coachNextGoal(coaching)}</p>
                  </div>
                </div>
              )}
            </section>

            {/* Nickname prompt: first finish without a stored nickname. The
                nickname is stored server-side per session via POST /api/player
                (same flow /multiplayer uses), API validates 2-20 chars.
                Non-blocking: "skip" dismisses without saving. */}
            {!nativeRace && saveState === 'prompting' && (
              <div className="mb-4 p-3 rounded-lg" style={{ background: 'rgba(0, 212, 255, 0.06)', border: '1px solid rgba(0, 212, 255, 0.3)' }}>
                <div className="text-sm font-semibold mb-1" style={{ color: 'var(--accent-cyan)' }}>
                  {tp('Сохранить результат в лидерборд?', 'Save your result to the leaderboard?', 'Zapisać wynik w rankingu?',
                    { es: '¿Guardar tu resultado en la clasificación?', fr: 'Enregistrer ton résultat au classement ?', de: 'Ergebnis in die Bestenliste eintragen?', it: 'Salvare il risultato in classifica?' })}
                </div>
                <div className="text-xs text-[var(--text-muted)] mb-2">
                  {tp('Введи ник (2-20 символов) - он будет виден в общем рейтинге.', 'Enter a nickname (2-20 chars) - it will show on the public leaderboard.', 'Podaj nick (2-20 znaków) - będzie widoczny w publicznym rankingu.',
                    { es: 'Escribe un apodo (2-20 caracteres) - aparecerá en la clasificación pública.', fr: 'Entre un pseudo (2-20 caractères) - il sera visible dans le classement public.', de: 'Gib einen Nickname ein (2-20 Zeichen) - er erscheint in der öffentlichen Bestenliste.', it: 'Inserisci un nickname (2-20 caratteri) - sarà visibile nella classifica pubblica.' })}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={nicknameInput}
                    onChange={(e) => setNicknameInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && nicknameInput.trim().length >= 2) saveResult(nicknameInput); }}
                    maxLength={20}
                    className="min-h-11 flex-1 min-w-0 px-3 py-2 rounded text-sm"
                    style={{ background: 'var(--bg-secondary)', border: '1px solid rgba(0,212,255,0.2)', color: 'var(--text-primary)' }}
                    placeholder={tp('Введи ник', 'Enter nickname', 'Podaj nick',
                      { es: 'Escribe un apodo', fr: 'Entre un pseudo', de: 'Nickname eingeben', it: 'Inserisci un nickname' })}
                  />
                  <button
                    onClick={() => saveResult(nicknameInput)}
                    disabled={nicknameInput.trim().length < 2}
                    className="px-4 py-2 rounded text-sm font-semibold disabled:opacity-40"
                    style={{ background: 'var(--accent-cyan)', color: 'var(--accent-ink)' }}
                  >
                    {tp('Сохранить', 'Save', 'Zapisz',
                      { es: 'Guardar', fr: 'Enregistrer', de: 'Speichern', it: 'Salva' })}
                  </button>
                </div>
                {saveError && (
                  <div className="text-xs mt-2" style={{ color: 'var(--danger)' }}>{saveError}</div>
                )}
                <button
                  onClick={() => setSaveState('idle')}
                  className="mt-2 text-xs text-[var(--text-muted)] underline hover:text-[var(--text-secondary)] transition"
                >
                  {tp('Пропустить', 'Skip', 'Pomiń',
                    { es: 'Omitir', fr: 'Passer', de: 'Überspringen', it: 'Salta' })}
                </button>
              </div>
            )}

            {/* Save status feedback (auto-save with stored nickname or after the prompt) */}
            {!nativeRace && saveState === 'saving' && (
              <div className="mb-4 text-xs text-[var(--text-muted)]">
                {tp('Сохраняю результат...', 'Saving result...', 'Zapisywanie wyniku...',
                  { es: 'Guardando el resultado...', fr: 'Enregistrement du résultat...', de: 'Ergebnis wird gespeichert...', it: 'Salvataggio del risultato...' })}
              </div>
            )}
            {!nativeRace && saveState === 'saved' && (
              <div className="mb-4 text-xs" style={{ color: 'var(--success)' }}>
                ✓ {tp('Результат сохранён в лидерборд', 'Result saved to the leaderboard', 'Wynik zapisany w rankingu',
                  { es: 'Resultado guardado en la clasificación', fr: 'Résultat enregistré au classement', de: 'Ergebnis in der Bestenliste gespeichert', it: 'Risultato salvato in classifica' })}
              </div>
            )}
            {!nativeRace && saveState === 'error' && saveError && (
              <div className="mb-4 text-xs flex items-center gap-2 flex-wrap" style={{ color: 'var(--danger)' }}>
                <span>{saveError}</span>
                <button onClick={() => saveResult(nicknameInput || undefined)} className="underline">
                  {tp('Повторить', 'Retry', 'Ponów',
                    { es: 'Reintentar', fr: 'Réessayer', de: 'Erneut versuchen', it: 'Riprova' })}
                </button>
              </div>
            )}

            {/* Share replay: replay uploads on every finish; show the code +
                share link once the prompt is out of the way (saved or skipped). */}
            {replayCode && saveState !== 'prompting' && (
              <ShareBlock
                code={replayCode}
                nickname={nickname}
                difficulty={difficulty}
                windStrength={windStrength}
                finishTime={playerFinished && playerFinished.time !== Infinity ? playerFinished.time : undefined}
                rank={playerRank > 0 ? playerRank : undefined}
                total={results.length || undefined}
                missionTitle={selectedMission ? tp(selectedMission.titleRu, selectedMission.titleEn, selectedMission.titlePl, { es: selectedMission.titleEs, fr: selectedMission.titleFr, de: selectedMission.titleDe, it: selectedMission.titleIt }) : undefined}
              />
            )}

            <div className="flex gap-2 flex-wrap">
              <button
                onClick={onMenu}
                className="flex-1 min-w-[100px] py-2 rounded-lg border border-[rgba(0,212,255,0.3)] text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent-cyan)] transition"
              >
                {tp('Меню', 'Menu', 'Menu', { es: 'Menú', fr: 'Menu', de: 'Menü', it: 'Menu' })}
              </button>
              <button
                onClick={onReplay}
                disabled={replayDisabled}
                className="flex-1 min-w-[100px] py-2 rounded-lg border border-[rgba(0,212,255,0.3)] text-sm text-[var(--accent-cyan)] hover:bg-[rgba(0,212,255,0.08)] transition disabled:opacity-40"
              >
                ▶ {tp('Replay гонки', 'Race replay', 'Powtórka wyścigu', { es: 'Repetición', fr: 'Revoir la course', de: 'Replay ansehen', it: 'Replay della regata' })}
              </button>
              <Link
                href={nativeRace ? "/history" : "/leaderboard"}
                className="inline-flex min-h-11 flex-1 min-w-[100px] items-center justify-center py-2 rounded-lg border border-[rgba(0,212,255,0.3)] text-sm text-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent-cyan)] transition"
              >
                🏆 {nativeRace ? copy.history : tp('Лидерборд', 'Leaderboard', 'Ranking',
                  { es: 'Clasificación', fr: 'Classement', de: 'Bestenliste', it: 'Classifica' })}
              </Link>
              <button
                onClick={onAgain}
                className="flex-1 min-w-[100px] py-2 rounded-lg font-semibold text-sm"
                style={{
                  background: 'var(--accent-cyan)',
                  color: 'var(--accent-ink)',
                }}
              >
                {tp('Ещё раз', 'Again', 'Jeszcze raz', { es: 'Otra vez', fr: 'Rejouer', de: 'Noch mal', it: 'Di nuovo' })}
              </button>
            </div>
          </div>
        </div>
  );
}

function ShareBlock({
  code, nickname, difficulty, windStrength, finishTime, rank, total, missionTitle,
}: {
  code: string; nickname: string | null;
  difficulty: Difficulty; windStrength: 'light' | 'medium' | 'heavy';
  finishTime?: number; rank?: number; total?: number;
  missionTitle?: string;
}) {
  const { tp, lang } = useI18n();
  const [copied, setCopied] = useState(false);
  const url = typeof window !== 'undefined' ? `${window.location.origin}/r/${code}` : '';
  const timePart = finishTime ? `${formatTime(finishTime)}${rank && total ? ` (${rank}/${total})` : ''}` : '';
  const shareText = finishTime
    ? tp(
        `Прошёл регату за ${timePart} на weektoregatta.com - смотри replay`,
        `Finished the race in ${timePart} at weektoregatta.com - check the replay`,
        `Wyścig ukończony w ${timePart} na weektoregatta.com - zobacz powtórkę`,
        {
          es: `Terminé la regata en ${timePart} en weektoregatta.com - mira la repetición`,
          fr: `Course terminée en ${timePart} sur weektoregatta.com - regarde le replay`,
          de: `Rennen auf weektoregatta.com in ${timePart} beendet - schau dir das Replay an`,
          it: `Regata conclusa in ${timePart} su weektoregatta.com - guarda il replay`,
        },
      )
    : tp('Мой replay на weektoregatta.com', 'My replay at weektoregatta.com', 'Moja powtórka na weektoregatta.com',
        { es: 'Mi repetición en weektoregatta.com', fr: 'Mon replay sur weektoregatta.com', de: 'Mein Replay auf weektoregatta.com', it: 'Il mio replay su weektoregatta.com' });

  const onShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Regatta replay', text: shareText, url });
        return;
      } catch { /* fallback to copy */ }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { /* ignore */ }
  };

  const ogUrl = finishTime
    ? `/api/og/result?nick=${encodeURIComponent(nickname ?? 'Player')}&time=${encodeURIComponent(formatTime(finishTime))}&place=${rank ?? ''}&of=${total ?? ''}&code=${code}&difficulty=${difficulty}&wind=${windStrength}&mission=${encodeURIComponent(missionTitle ?? '')}&lang=${lang}`
    : null;

  return (
    <div className="mb-4 p-3 rounded-lg"
         style={{ background: 'rgba(0, 212, 255, 0.06)', border: '1px solid rgba(0, 212, 255, 0.3)' }}>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
            {tp('ПОДЕЛИТЬСЯ REPLAY', 'SHARE REPLAY', 'UDOSTĘPNIJ POWTÓRKĘ',
              { es: 'COMPARTIR REPETICIÓN', fr: 'PARTAGER LE REPLAY', de: 'REPLAY TEILEN', it: 'CONDIVIDI IL REPLAY' })}
          </div>
          <div className="text-sm font-mono font-semibold text-[var(--accent-cyan)] mt-0.5">
            {code}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onShare}
            className="px-3 py-1.5 rounded text-xs font-semibold"
            style={{ background: 'var(--accent-cyan)', color: 'var(--accent-ink)' }}
          >
            {copied
              ? tp('✓ Скопировано', '✓ Copied', '✓ Skopiowano',
                  { es: '✓ Copiado', fr: '✓ Copié', de: '✓ Kopiert', it: '✓ Copiato' })
              : tp('🔗 Поделиться', '🔗 Share', '🔗 Udostępnij',
                  { es: '🔗 Compartir', fr: '🔗 Partager', de: '🔗 Teilen', it: '🔗 Condividi' })}
          </button>
          <Link
            href={`/r/${code}`}
            className="px-3 py-1.5 rounded text-xs font-semibold border"
            style={{ borderColor: 'rgba(0, 212, 255, 0.3)', color: 'var(--accent-cyan)' }}
          >
            {tp('Открыть', 'Open', 'Otwórz',
              { es: 'Abrir', fr: 'Ouvrir', de: 'Öffnen', it: 'Apri' })}
          </Link>
        </div>
      </div>
      {ogUrl && (
        // Prefetch the OG image so it's ready when a social crawler fetches it
        // eslint-disable-next-line @next/next/no-img-element
        <img src={ogUrl} alt="" style={{ display: 'none' }} aria-hidden="true" />
      )}
    </div>
  );
}

// M0-11: every step names something the coach really computes from the race
// log (fallback-coach measureRaceLog: close-hauled speed, no-go time, tack
// losses); laylines and a track-to-course match are not computed.
function AnalyzingProgress() {
  const { tp } = useI18n();
  const stages = [
    { icon: '📍', label: tp('Проверяю скорость в бейдевинде', 'Checking close-hauled speed', 'Sprawdzam prędkość na bajdewindzie', { es: 'Comprobando la velocidad en ceñida', fr: 'Je vérifie la vitesse au près', de: 'Prüfe die Fahrt hoch am Wind', it: 'Controllo la velocità di bolina' }) },
    { icon: '🌬', label: tp('Считаю время в мёртвой зоне', 'Counting time in the no-go zone', 'Liczę czas w kącie martwym', { es: 'Calculando el tiempo en la zona muerta', fr: 'Je compte le temps passé dans la zone morte', de: 'Zähle die Zeit im toten Winkel', it: 'Conto il tempo nell\'angolo morto' }) },
    { icon: '↺', label: tp('Считаю, сколько стоили повороты', 'Measuring what the tacks cost', 'Liczę, ile kosztowały zwroty', { es: 'Calculando lo que costaron las viradas', fr: 'Je calcule ce que t\'ont coûté les virements', de: 'Berechne, was die Wenden gekostet haben', it: 'Calcolo quanto sono costate le virate' }) },
    { icon: '🧭', label: tp('Формулирую советы', 'Drafting advice', 'Formułuję rady', { es: 'Redactando consejos', fr: 'Je rédige les conseils', de: 'Formuliere Tipps', it: 'Preparo i consigli' }) },
  ];
  const [stage, setStage] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setStage((s) => (s + 1 < stages.length ? s + 1 : s)), 900);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-1">
        <span className="inline-block w-2.5 h-2.5 rounded-full pulse-gentle" style={{ background: 'var(--accent-cyan)' }} />
        <span className="text-sm text-[var(--text-secondary)]">{tp('AI разбирает твою гонку...', 'AI is reviewing your race...', 'AI analizuje twój wyścig...', { es: 'La IA está analizando tu regata...', fr: 'L\'IA analyse ta course...', de: 'Die KI analysiert dein Rennen...', it: 'L\'IA sta analizzando la tua regata...' })}</span>
      </div>
      <ul className="space-y-1.5 text-xs">
        {stages.map((s, i) => {
          const active = i === stage;
          const done = i < stage;
          return (
            <li
              key={s.label}
              className="flex items-center gap-2 transition-opacity"
              style={{ opacity: active ? 1 : done ? 0.7 : 0.35 }}
            >
              <span className="w-4 inline-flex justify-center">
                {done ? '✓' : active ? <span className="pulse-gentle">{s.icon}</span> : s.icon}
              </span>
              <span className={active ? 'text-[var(--accent-cyan)] font-medium' : 'text-[var(--text-secondary)]'}>
                {s.label}
              </span>
            </li>
          );
        })}
      </ul>
      <div className="mt-2 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(0,212,255,0.12)' }}>
        <div
          className="h-full transition-all duration-700"
          style={{
            width: `${((stage + 1) / stages.length) * 100}%`,
            background: 'linear-gradient(90deg, var(--accent-cyan), var(--accent-teal))',
          }}
        />
      </div>
    </div>
  );
}
