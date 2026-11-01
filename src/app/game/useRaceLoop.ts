'use client';

// The solo race loop (/game): the fixed-step simulation effect and the clock
// resynchronisation effect, moved out of GameClient unchanged. GameClient owns
// every ref and state and calls this hook at the place the effects stood, so
// the effect order, the dependency lists and the refs' semantics are the same.

import { useEffect, type Dispatch, type RefObject, type SetStateAction } from 'react';
import { playTack, playMarkRound, playFinish, playNoGo, readRaceSound } from '@/lib/sounds';
import { raceHaptic } from '@/lib/race-haptics';
import { analyseRaceLocally, analyseRaceLocallyWithFocus } from '@/lib/fallback-coach';
import { evaluateMission, type Mission, type RaceMetrics } from '@/data/missions';
import type { useI18n } from '@/lib/i18n';
import { tryUpdateBestRecord, type BestRecord } from '@/lib/best-times';
import { clearRaceSetup } from '@/lib/race-resume';
import {
  stepBoat, resolveCollisions, updateLap, raceAutopilotTurn, MIN_BOAT_SEPARATION,
  WIND_DIRECTION_BASE as WIND_DIRECTION,
  calcTWA,
  angleDiff,
  WORLD,
  type RaceBoat,
} from '@/lib/race-physics';
import { classifyManoeuvre, createManoeuvreState, inNoGoZone, pressedAgainstEdge, NO_GO } from '@/lib/race-manoeuvres';
import { coachLuffing, createSilentTargets, mapRaceSoundscape, type RaceSoundscapeInput } from '@/lib/race-soundscape';
import type { RaceSoundscape } from '@/lib/race-soundscape-audio';
import { raceTrimCoach } from '@/lib/race-trim-coach';
import type { Controls } from "@/lib/sailing-physics/types";
import { raceRanks } from '@/features/race-3d/pose';
import type { StandingRow } from '@/features/race-hud/RaceHud';
import type { FeedbackTone } from '@/features/race-hud/feedback';
import { TURN_COST, contactCue, createContactCueState, playerTouching, watchTurn } from '@/features/race-hud/race-cues';
import { createFirstRaceHintState, nextFirstRaceHint, type FirstRaceHint } from '@/features/race-hud/first-race-hints';
import type { FirstRaceHintsRecord } from '@/features/race-hud/useFirstRaceHints';
import type { RaceEvent } from '@/features/race-hud/events';
import { planRaceGuidance, type RaceGuidance, type RaceGuidanceState } from "@/lib/race-guidance";
import { evaluateRaceRules, type RaceRuleEvent, type RaceRulesState } from "@/lib/race-rules";
import { playerRecallChange } from "@/lib/race-start-signals";
import type { RaceJudgeDebrief } from "@/lib/race-judge";
import { isStartJostle } from "@/lib/race-start-jostle";
import { isNativeRace, postNativeRace, type NativeRaceSnapshot } from "@/lib/race-native";
import { createFixedClock } from "@/features/sailing-lab/runtime/fixed-clock";
import { bindClockLifecycle } from "@/features/sailing-lab/runtime/clock-lifecycle";
import type { createRaceStartupGate } from "@/lib/race-startup";
import { createPendingRaceSaves, resolveFinishedFleet } from "@/lib/race-completion";
import { recordDiagnostic } from "@/lib/diagnostics-controls";
import { trackRaceEnd, trackRaceMark, trackRaceTack } from "@/lib/funnel";
import { createRaceNavigationSnapshot, raceWindReading, type RaceNavigationSnapshot, type RaceWindReading } from "@/features/race-hud/navigation-model";
import { NATIVE_BEST_PENDING_LIMIT, type createPendingNativeBestCommands } from "@/lib/race-best-command";
import { LEGACY_RACE_CONTEXT, physicalRaceContext, type PhysicalRaceProfile } from "@/lib/race-context";
import { physicalCourseDefinition } from "@/lib/race-courses";
import type { PhysicalBotState } from "@/lib/race-physical-bot";
import { physicalTrialSteering } from "@/lib/race-trial";
import { ghostClassKey, ghostPose, makeGhostTrack, readGhostStore, rememberGhost, writeGhostStore, type GhostTrack } from "@/lib/race-ghost";
import { ghostMarkSplit, raceGhostSplits, splitTone, type GhostSplit } from "@/lib/race-ghost-splits";
import { awardRaceMedal, raceUsesHints, readMedalStore, writeMedalStore, type MedalAward } from "@/lib/race-medals";
import { readRaceHomeStore, recordRaceEnd, writeRaceHomeStore } from "@/lib/race-next-step";
import type { Difficulty } from './config';
import type { RacePrefs } from './race-prefs';
import { MISSED_MARK_NOTICE, type useRaceCopy } from './race-copy';
import { createMissedMarkState, detectMissedMark } from "@/lib/race-missed-mark";
import { createGroundSpeedWindow, displayedBoatSpeed, recordGroundStep } from "@/lib/race-ground-speed";
import { pickLocalized } from "@/lib/languages";
import type { NativeBestSaveState, NativeSaveStatus } from './RaceResults';
import { finishHoldActive, scheduleFinishedScreen } from './race-finish-hold';
import { raceOrientation, raceSummaryDiagnostics, withJudgeIncidents, type RaceSetupRecord, type RaceTally } from './race-diagnostic-summary';
import {
  localStore, raceLogTally, recordSample, soloRaceWind, sortRaceResults,
  type Boat, type Coaching, type Course, type GameState, type LogEvent, type LogSample, type RaceResultRow, type Vec2,
} from './race-model';

type PhysicalFleetModule = typeof import("@/lib/race-physical-fleet");
const nativeLogEvent = (e: LogEvent): e is LogEvent & { type: NativeRaceSnapshot["events"][number]["type"] } => e.type !== 'gybe';
type I18n = ReturnType<typeof useI18n>;
type SetState<T> = Dispatch<SetStateAction<T>>;

/** The live race refs the loop reads and writes; all owned by GameClient. */
export interface RaceLoopRefs {
  boatsRef: RefObject<Boat[]>;
  courseRef: RefObject<Course>;
  physicalRef: RefObject<PhysicalRaceProfile | null>;
  physicalNavRef: RefObject<ReadonlyMap<string, PhysicalBotState> | undefined>;
  fleetRef: RefObject<PhysicalFleetModule | null>;
  keysRef: RefObject<Set<string>>;
  rudderRef: RefObject<number>;
  autopilotOnRef: RefObject<boolean>;
  autopilotHeadingRef: RefObject<number>;
  racePrefsRef: RefObject<RacePrefs>;
  trimRef: RefObject<Controls>;
  windDirRef: RefObject<number>;
  windGustRef: RefObject<number>;
  windStrengthRef: RefObject<number>;
  raceClockRef: RefObject<number>;
  hudRefreshRef: RefObject<number>;
  ruleStateRef: RefObject<RaceRulesState>;
  ruleEventsRef: RefObject<RaceRuleEvent[]>;
  startedAtRef: RefObject<number | undefined>;
  copyRef: RefObject<ReturnType<typeof useRaceCopy>>;
  ghostTrackRef: RefObject<GhostTrack | null>;
  ghostBoatsRef: RefObject<RaceBoat[]>;
  markTimesRef: RefObject<Map<string, number>>;
  logSamplesRef: RefObject<LogSample[]>;
  logEventsRef: RefObject<LogEvent[]>;
  lastSampleTimeRef: RefObject<number>;
  wasInNoGoRef: RefObject<boolean>;
  lastTackSignRef: RefObject<number>;
  speedLogRef: RefObject<{ t: number; speed: number }[]>;
  turnRef: RefObject<{ kind: 'tack' | 'gybe'; t: number; before: number; min: number } | null>;
  standingsKeyRef: RefObject<string>;
  shownRankRef: RefObject<number>;
  pendingRankRef: RefObject<{ rank: number; since: number } | null>;
  raceIdRef: RefObject<string>;
  pendingNativeSaves: RefObject<ReturnType<typeof createPendingRaceSaves>>;
  pendingNativeBests: RefObject<ReturnType<typeof createPendingNativeBestCommands>>;
  guidanceStateRef: RefObject<RaceGuidanceState | null>;
  rafRef: RefObject<number | null>;
  simulationClockRef: RefObject<ReturnType<typeof createFixedClock> | null>;
  startupGate: RefObject<ReturnType<typeof createRaceStartupGate>>;
  pausedRef: RefObject<boolean>;
  langRef: RefObject<I18n["lang"]>;
  /** How this race was entered (diagnostics race.summary only). */
  raceSetupRef: RefObject<RaceSetupRecord>;
  /** Missed-mark notices and contact frames of this race (diagnostics only). */
  raceTallyRef: RefObject<RaceTally>;
  /** M4-5: route or trim hints were on at some moment of this race (no gold then). Reset by GameClient per race. */
  raceHintsRef?: RefObject<boolean>;
  /** M4-7: the first race hints this device has shown (useFirstRaceHints). */
  firstHintsRef?: RefObject<FirstRaceHintsRecord>;
}

/** The state setters the loop publishes to; all owned by GameClient. */
export interface RaceLoopSetters {
  setAutopilotOn: SetState<boolean>;
  setPenalty: SetState<number>;
  setStandings: SetState<StandingRow[]>;
  setResults: SetState<RaceResultRow[]>;
  setJudgeDebrief: SetState<RaceJudgeDebrief | null>;
  setGameState: SetState<GameState>;
  setBestRecord: SetState<BestRecord | null>;
  setIsNewRecord: SetState<boolean>;
  setMissionResult: SetState<{ passed: boolean; reasons: string[]; mission: Mission } | null>;
  setCoaching: SetState<Coaching | null>;
  setCoachingSource: SetState<"local" | "ai">;
  setCoachingLoading: SetState<boolean>;
  setCoachingError: SetState<string | null>;
  setNativeSave: SetState<NativeSaveStatus>;
  setNativeBestSave: SetState<NativeBestSaveState>;
  setPlayerTWA: SetState<number>;
  setPlayerSpeed: SetState<number>;
  setWindReading: SetState<RaceWindReading | null>;
  setNavigation: SetState<RaceNavigationSnapshot | null>;
  setRouteGuidance: SetState<RaceGuidance | null>;
  setElapsed: SetState<number>;
  /** M4-4: the splits against your best race, set at the race end (empty without a ghost). */
  setGhostSplits?: SetState<GhostSplit[]>;
  /** M4-5: the course medal this race earned or kept; null for the physical trial or a did-not-finish. */
  setMedalAward?: SetState<MedalAward | null>;
}

export interface RaceLoopInput {
  gameState: GameState;
  difficulty: Difficulty;
  windStrength: 'light' | 'medium' | 'heavy';
  selectedMission: Mission | null;
  /** M4-6: the daily race day of this race, or null; a finished daily race counts as done for the race menu. */
  dailyDay?: string | null;
  lang: I18n["lang"];
  tp: I18n["tp"];
  paused: boolean;
  sceneReady: boolean;
  showEvent: (event: RaceEvent, tone: FeedbackTone) => void;
  /** M1-3 feedback bus: a rule notice or the missed-mark notice; it no longer hides the race events. */
  showNotice: (text: string, source: "rule" | "missed-mark", tone: FeedbackTone) => void;
  /** M1-3: the player's hull touched another boat (the red frame round the scene). */
  showContact: () => void;
  requestNativeBest: (raceId: string, action?: "request" | "retry") => void;
  /** M3-2 race soundscape (ADR-0019); fed at the HUD cadence, at most ten times per second. */
  soundscape?: RaceSoundscape;
  /** M4-7: a first race hint is due (solo race only, not the physical trial). */
  showHint?: (hint: FirstRaceHint) => void;
  /** M3-3: the race detected the player's premature start (true) or the player cleared it (false); the page shows flag X and sounds the recall. */
  onStartRecall?: (over: boolean) => void;
  refs: RaceLoopRefs;
  set: RaceLoopSetters;
}

export function useRaceLoop({ gameState, difficulty, windStrength, selectedMission, dailyDay = null, lang, tp, paused, sceneReady, showEvent, showNotice, showContact, requestNativeBest, soundscape, onStartRecall, showHint, refs, set }: RaceLoopInput) {
  const {
    boatsRef, courseRef, physicalRef, physicalNavRef, fleetRef, keysRef, rudderRef, autopilotOnRef, autopilotHeadingRef,
    racePrefsRef, trimRef, windDirRef, windGustRef, windStrengthRef, raceClockRef, hudRefreshRef, ruleStateRef, ruleEventsRef,
    startedAtRef, copyRef, ghostTrackRef, ghostBoatsRef, markTimesRef, logSamplesRef, logEventsRef, lastSampleTimeRef,
    wasInNoGoRef, lastTackSignRef, speedLogRef, turnRef, standingsKeyRef, shownRankRef, pendingRankRef, raceIdRef,
    pendingNativeSaves, pendingNativeBests, guidanceStateRef, rafRef, simulationClockRef, startupGate, pausedRef, langRef,
    raceSetupRef, raceTallyRef,
  } = refs;
  const {
    setAutopilotOn, setPenalty, setStandings, setResults, setJudgeDebrief, setGameState, setBestRecord,
    setIsNewRecord, setMissionResult, setCoaching, setCoachingSource, setCoachingLoading, setCoachingError, setNativeSave,
    setNativeBestSave, setPlayerTWA, setPlayerSpeed, setWindReading, setNavigation, setRouteGuidance, setElapsed,
  } = set;

  // -----------------------------------------------------------------------
  // Game loop - also runs during countdown so boats can sail freely before
  // the race starts. Mark rounding, finish detection, race log and timer
  // are all suppressed during countdown.
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (gameState !== 'racing' && gameState !== 'countdown') return;
    const isRacing = gameState === 'racing';
    const clock = createFixedClock();
    simulationClockRef.current = clock;
    const unbindClock = bindClockLifecycle(clock, { target: document, now: () => performance.now(),
      active: () => startupGate.current.active(pausedRef.current, document.hidden) });
    let ended = false;
    // M0-5: per-race memory for the missed-mark notice and the HUD speed at the world edge.
    let missedMark = createMissedMarkState();
    let groundSpeed = createGroundSpeedWindow();
    // M1-3: per-race memory of the contact frame (edge, cooldown, start jostle).
    let contact = createContactCueState();
    // M4-7: per-race memory of the first race hints; "Show hints again" bumps the revision.
    let firstHints = createFirstRaceHintState();
    let firstHintsRevision = refs.firstHintsRef?.current.revision;
    // M0-4: tacks and gybes are told apart, and wobbles and flips at the edge
    // are not logged. The committed side survives an effect restart via
    // lastTackSignRef, which GameClient resets for each race.
    let manoeuvres = createManoeuvreState(Math.sign(lastTackSignRef.current) as -1 | 0 | 1);
    // M3-2: one input and one target object per race loop, reused every HUD tick.
    const soundIn: RaceSoundscapeInput = { apparentWindKn: 0, boatSpeedKn: 0, heelDeg: 0, luffing: false, inIrons: false, mode: "simple", paused: false, muted: false };
    const soundOut = createSilentTargets();
    const step = (now: number) => {
      const refreshHud = now - hudRefreshRef.current >= 100;
      // M4-5: route or trim hints on at any moment of the countdown or the
      // race take gold off it, paused frames included: the route hint and the
      // settings switches stay on screen while the clock is stopped.
      if (!ended && refs.raceHintsRef && raceUsesHints(racePrefsRef.current)) refs.raceHintsRef.current = true;
      const advanced = clock.advance(now, startupGate.current.active(pausedRef.current, document.hidden), (dt) => {
      if (ended) return;
      // A loop restarted during this race's finish hold (M1-4) must not move the boats or the clock.
      if (isRacing && finishHoldActive(raceIdRef.current)) { ended = true; return; }
      if (isRacing) raceClockRef.current += dt;

      const course = courseRef.current;
      let boats = boatsRef.current;

      // --- Wind shifts: slow sinusoidal direction drift + short gusts ---
      const wind = soloRaceWind(raceClockRef.current);
      windDirRef.current = wind.dir;
      windGustRef.current = wind.gust;

      // Capture previous positions BEFORE movement - used later for line-cross detection
      const prevPositions = new Map<string, Vec2>();

      const physical = physicalRef.current;
      let physicalEvents: ReadonlyMap<string, string | null> | null = null;
      if (physical) {
        for (const boat of boats) prevPositions.set(boat.id, { ...boat.pos });
        const player = boats.find(b => b.isPlayer);
        const held = keysRef.current.has("arrowright") || keysRef.current.has("arrowleft")
          ? Number(keysRef.current.has("arrowright")) - Number(keysRef.current.has("arrowleft")) : rudderRef.current;
        if (held && autopilotOnRef.current) { setAutopilotOn(false); autopilotOnRef.current = false; }
        const steering = physicalTrialSteering(held, autopilotOnRef.current, autopilotHeadingRef.current);
        const stepped = player && fleetRef.current ? fleetRef.current.stepPhysicalRaceFleet({ context: physicalRaceContext(physical), course, dt,
          raceTime: raceClockRef.current, racing: isRacing, windDir: windDirRef.current, gust: windGustRef.current,
          windStrengthMul: windStrengthRef.current, navigation: physicalNavRef.current,
          entries: boats.map(boat => ({ boat, speedMul: boat.speedMul,
            input: boat.isPlayer ? { steering, autoTrim: racePrefsRef.current.mode !== "pro", trim: trimRef.current } : "bot" as const })) }) : null;
        if (stepped) {
          boats = stepped.boats as Boat[]; boatsRef.current = boats;
          physicalNavRef.current = stepped.navigation;
          physicalEvents = new Map(stepped.progress.map(p => [p.boatId, p.event]));
        } else recordDiagnostic({ type: "race.lifecycle", surface: "race", outcome: "failed", action: "start", reason: "invalid-input" });
      }
      for (const boat of physical ? [] : boats) {
        prevPositions.set(boat.id, { ...boat.pos });
        if (boat.lapDone === 2) continue;

        let turnInput = 0;
        if (boat.isPlayer) {
          const right = keysRef.current.has("arrowright");
          const left = keysRef.current.has("arrowleft");
          turnInput = right || left ? Number(right) - Number(left) : rudderRef.current;
          if (turnInput && autopilotOnRef.current) { setAutopilotOn(false); autopilotOnRef.current = false; }
          if (!turnInput && autopilotOnRef.current) turnInput = Math.max(-1, Math.min(1, angleDiff(boat.heading, autopilotHeadingRef.current) / 12));
        } else turnInput = raceAutopilotTurn(boat, course, windDirRef.current);
        stepBoat(boat, dt, windDirRef.current, windGustRef.current,
          boat.isPlayer ? { turn: turnInput, autoTrim: racePrefsRef.current.mode !== "pro", trim: trimRef.current } : { turn: turnInput },
          { windStrengthMul: windStrengthRef.current, speedMul: boat.speedMul, steering: boat.isPlayer ? "responsive" : "legacy" });
      }

      const checked = evaluateRaceRules(ruleStateRef.current, { boats, course, windDir: windDirRef.current, time: raceClockRef.current,
        racing: isRacing, enabled: racePrefsRef.current.rules, penalties: racePrefsRef.current.penalties, previousPositions: Object.fromEntries(prevPositions) });
      ruleStateRef.current = checked.state;
      if (checked.events.length && ruleEventsRef.current.length < 600) ruleEventsRef.current.push(...checked.events.slice(0, 600 - ruleEventsRef.current.length));
      const recall = playerRecallChange(checked.events);
      if (recall !== null) onStartRecall?.(recall);
      const startedPlayer = boats.find(b => b.isPlayer);
      if (isRacing && startedAtRef.current === undefined && startedPlayer?.started) startedAtRef.current = raceClockRef.current;
      // M0-3: penalty-free crowding right after the signal is not a lesson; the debrief groups it.
      const playerEvents = checked.events.filter(e => e.boatId === "player" && !isStartJostle(e));
      if (playerEvents.length) {
        const important = playerEvents.find(e => e.penaltySeconds || e.kind === "early-start" || e.kind === "give-way") ?? playerEvents[0];
        showNotice(copyRef.current.ruleMessage(important), "rule", important.penaltySeconds ? "danger" : "info");
        setPenalty(checked.state.penalties.player ?? 0);
      }
      if (!physical) {
        // M1-3: a contact begins while the hulls still overlap, before they are pushed apart.
        const cue = contactCue(contact, { touching: playerTouching(boats, MIN_BOAT_SEPARATION), t: raceClockRef.current, racing: isRacing });
        contact = cue.state;
        if (cue.cue) { showContact(); soundscape?.thud(); raceHaptic('contact'); raceTallyRef.current.contacts++; }
        resolveCollisions(boats, dt);
      }
      const ghost = ghostTrackRef.current, ghostBoat = ghostBoatsRef.current[0];
      if (ghost && ghostBoat) Object.assign(ghostBoat, ghostPose(ghost, isRacing ? raceClockRef.current : 0));

      // Re-process course progression after collision adjustments
      for (const boat of boats) {
        const prevPos = prevPositions.get(boat.id) ?? { ...boat.pos };

        // M0-5: the HUD speed follows the path really covered (stepBoat clamps at the world edge).
        if (boat.isPlayer && !physical) groundSpeed = recordGroundStep(groundSpeed, prevPos, boat.pos, boat.speed, dt);
        // Mark / finish detection only counts once the race is officially on.
        if (!isRacing) continue;
        // M0-5: back across the finish line before rounding the windward mark: say why it did not count.
        if (boat.isPlayer && !physical) {
          const missed = detectMissedMark(missedMark, { prevPos, pos: boat.pos, lapDone: boat.lapDone, started: boat.started, course, time: raceClockRef.current });
          missedMark = missed.state;
          if (missed.missed) { showNotice(pickLocalized(langRef.current, MISSED_MARK_NOTICE), "missed-mark", "danger"); raceTallyRef.current.missedMarkNotices++; }
        }

        // The physical fleet already graded its actual travel this tick.
        const event = physical ? (physicalEvents?.get(boat.id) === "mark" || physicalEvents?.get(boat.id) === "finish" ? physicalEvents.get(boat.id) : null)
          : updateLap(boat, prevPos, course, raceClockRef.current);
        if (event === "mark") {
          const t = raceClockRef.current;
          markTimesRef.current.set(boat.id, t);
          if (boat.isPlayer) {
            const times = [...markTimesRef.current.values()];
            const place = times.filter((x) => x <= t).length;
            showEvent({ kind: 'mark', place, gapSec: t - Math.min(...times) }, place === 1 ? 'success' : 'info');
            // M4-4: the split against your best race of this class, when it sails beside you.
            const split = ghostMarkSplit(ghostTrackRef.current, 0, t);
            if (split) showEvent({ kind: 'split', deltaSec: split.deltaSec, verdict: split.verdict }, splitTone(split.verdict));
          }
        }
        if (boat.isPlayer && event === "mark") {
          logEventsRef.current.push({ type: "mark-rounded", t: raceClockRef.current, note: "windward-port" });
          if (!physical) trackRaceMark(raceIdRef.current, raceClockRef.current);
          playMarkRound();
          raceHaptic('mark');
        } else if (boat.isPlayer && event === "finish") {
          logEventsRef.current.push({ type: "finish", t: boat.finishTime! });
          logSamplesRef.current.push(recordSample(boat, boat.finishTime!, windDirRef.current));
          playFinish();
          raceHaptic('finish');
        }
      }

      // A completed player's final sample is already fixed. Resolve only the
      // remaining fleet now, so Menu/backgrounding cannot discard this finish
      // while bots sail on, and penalty-adjusted places stay true. Bots sail to
      // their own finish or the race time limit (M0-6).
      if (isRacing && !physical && boats.some(boat => boat.isPlayer && boat.lapDone === 2)) {
        const resolved = resolveFinishedFleet({ boats, course, time: raceClockRef.current,
          windStrengthMul: windStrengthRef.current, rules: ruleStateRef.current,
          rulesEnabled: racePrefsRef.current.rules, penaltiesEnabled: racePrefsRef.current.penalties });
        boats = resolved.boats; boatsRef.current = boats;
        ruleStateRef.current = resolved.rules;
      }

      // --- Race log recording (player only, race-time only) ---
      const playerBoat = boats.find((b) => b.isPlayer);
      if (isRacing && playerBoat && playerBoat.lapDone < 2) {
        const t = raceClockRef.current;
        if (t - lastSampleTimeRef.current >= 0.5) {
          logSamplesRef.current.push(recordSample(playerBoat, t, windDirRef.current));
          lastSampleTimeRef.current = t;
        }
        // No-go zone event (the coach measures the zone with the same predicate)
        const pTWA = calcTWA(playerBoat.heading, windDirRef.current);
        const inNoGo = inNoGoZone(pTWA, playerBoat.speed);
        if (inNoGo && !wasInNoGoRef.current) {
          logEventsRef.current.push({ type: 'no-go-entered', t });
          playNoGo();
        }
        wasInNoGoRef.current = inNoGo;
        const speedLog = speedLogRef.current;
        speedLog.push({ t, speed: playerBoat.speed });
        while (speedLog.length && speedLog[0].t < t - 3) speedLog.shift();
        // Tack or gybe: the boat settled on the other side after a crossing
        // with way on. The physical trial has its own water bounds: no pin check.
        const pinned = !physical && pressedAgainstEdge(playerBoat.pos, playerBoat.heading,
          { minX: 20, maxX: WORLD.width - 20, minY: 20, maxY: WORLD.height - 20 });
        const classified = classifyManoeuvre(manoeuvres, { twa: pTWA, speedKn: playerBoat.speed, pinned });
        manoeuvres = classified.state;
        lastTackSignRef.current = manoeuvres.side;
        if (classified.manoeuvre) {
          const kind = classified.manoeuvre;
          logEventsRef.current.push({ type: kind, t, note: manoeuvres.side > 0 ? 'to-port-tack' : 'to-starboard-tack' });
          // First-race funnel: the first real tack or gybe.
          if (!physical) trackRaceTack(raceIdRef.current, t);
          playTack();
          // Its cost: the best speed of the last 3 s against the slowest
          // after it. The boat settles up to a second after it crossed the
          // wind, so that second counts towards the slowest too. M1-3: the
          // cost is told as soon as the slowest is behind the boat (it picks
          // up again), at most 4 s later (race-cues.ts watchTurn).
          turnRef.current = { kind, t, before: Math.max(...speedLog.map((s) => s.speed)),
            min: Math.min(...speedLog.filter((s) => s.t >= t - 1).map((s) => s.speed)) };
        }
        if (turnRef.current) {
          const watched = watchTurn(turnRef.current, t, playerBoat.speed);
          turnRef.current = watched.turn;
          if (watched.cost) showEvent(watched.cost, watched.cost.lossKn > TURN_COST.bigLossKn ? 'danger' : 'info');
        }
        // M4-7: a first race hint at the moment it matters (first-race-hints.ts).
        const hintsRecord = refs.firstHintsRef?.current;
        if (!physical && showHint && hintsRecord) {
          if (hintsRecord.revision !== firstHintsRevision) { firstHints = createFirstRaceHintState(); firstHintsRevision = hintsRecord.revision; }
          const due = nextFirstRaceHint(firstHints, { t, racing: true, tacked: classified.manoeuvre === 'tack', twa: pTWA,
            windDir: windDirRef.current, boats, course }, hintsRecord.seen);
          firstHints = due.state;
          if (due.hint) showHint(due.hint);
        }
      }

      // Update UI state
      const player = boats.find((b) => b.isPlayer)!;
      // Live race time read from the clock each frame. Do NOT use the `elapsed`
      // state here or in the finish checks below: this loop effect closes over
      // `elapsed` at mount (deps are [gameState, difficulty]) and setElapsed does
      // not retrigger it, so the captured value would stay frozen at 0 and the
      // 5-minute timeout / post-finish race-end paths would never fire (a stuck
      // AI in the no-go zone could hang the race forever).
      const elapsedSec = isRacing ? raceClockRef.current : 0;

      // Calculate position (rank): the same count the 3D name tags show.
      const ranks = raceRanks(boats, course);
      const rank = ranks.get('player') ?? boats.length;
      const ordered = [...boats].sort((a, b) => (ranks.get(a.id) ?? 0) - (ranks.get(b.id) ?? 0));
      const standingsKey = ordered.map((b) => b.id).join();
      if (standingsKey !== standingsKeyRef.current) {
        standingsKeyRef.current = standingsKey;
        setStandings(ordered.map((b) => ({ id: b.id, name: b.name, color: b.color, isPlayer: b.isPlayer })));
      }
      // Overtakes: a place held for a second, not a flicker between two close boats.
      if (isRacing && elapsedSec > 3 && player.lapDone < 2) {
        if (shownRankRef.current === 0) shownRankRef.current = rank;
        if (rank === shownRankRef.current) pendingRankRef.current = null;
        else if (pendingRankRef.current?.rank !== rank) pendingRankRef.current = { rank, since: elapsedSec };
        else if (elapsedSec - pendingRankRef.current.since >= 1) {
          showEvent({ kind: rank < shownRankRef.current ? 'gained' : 'lost', place: rank }, rank < shownRankRef.current ? 'success' : 'danger');
          shownRankRef.current = rank;
          pendingRankRef.current = null;
        }
      }


      // Check race end: all boats finished OR player finished - only when racing
      const allFinished = boats.every((b) => b.lapDone === 2);
      const playerFinished = player.lapDone === 2;
      // 5 minutes max; a physical course has its own registered time limit.
      const tooLong = elapsedSec > (physical ? physicalCourseDefinition(physical).maxRaceSeconds : 300);

      if (isRacing && (allFinished || playerFinished || tooLong)) {
        // A loop restarted during this race's finish hold must not end it twice.
        if (finishHoldActive(raceIdRef.current)) { ended = true; return; }
        const sorted = sortRaceResults(boats, ruleStateRef.current.penalties);
        ended = true;
        setResults(sorted);
        // Diagnostics only (race.summary debrief): the incidents the judge debrief lists.
        let judgedIncidents: Promise<number> | null = null;
        if (racePrefsRef.current.rules) {
          const events = ruleEventsRef.current, completedRaceId = raceIdRef.current;
          const options = { startedAt: startedAtRef.current, markRoundedAt: markTimesRef.current.get("player"), finishedAt: player.finishTime };
          const judgeModule = import("@/lib/race-judge");
          void judgeModule.then(judge => {
            if (raceIdRef.current === completedRaceId) setJudgeDebrief(judge.buildRaceJudgeDebrief(events, options));
          });
          judgedIncidents = judgeModule.then(judge => judge.buildRaceJudgeDebrief(events, options).items.filter(item => !item.jostle).length);
        }
        // M1-4: a finish holds the scene with the place plate before the
        // results replace it; a timeout shows them at once. Everything below
        // (records, coach, native save, analytics) still runs in this tick.
        const endedRaceId = raceIdRef.current;
        scheduleFinishedScreen({ playerFinished, place: sorted.findIndex((r) => r.isPlayer) + 1, total: sorted.length,
          raceId: endedRaceId, isCurrentRace: () => raceIdRef.current === endedRaceId, setGameState });
        recordDiagnostic({ type: "race.lifecycle", surface: "race", outcome: "accepted", action: playerFinished ? "finish" : "timeout", mode: racePrefsRef.current.mode, elapsedSeconds: Math.min(7200, elapsedSec) });
        const finishHoldShown = finishHoldActive(endedRaceId);
        if (finishHoldShown) recordDiagnostic({ type: "race.lifecycle", surface: "race", outcome: "accepted", action: "finish-hold", mode: racePrefsRef.current.mode });
        if (!physical) trackRaceEnd(raceIdRef.current, { finished: player.finishTime != null, position: sorted.findIndex((r) => r.isPlayer) + 1,
          totalBoats: sorted.length, durationSec: elapsedSec, tacks: logEventsRef.current.filter((e) => e.type === 'tack').length });
        // Race ended cleanly - drop the resume offer so the next reload
        // starts from a fresh menu.
        clearRaceSetup();

        // Save / compare against personal-best for this (difficulty, wind)
        // bucket. Only counts ACTUAL finishers - the 5-minute timeout above
        // sets player.finishTime to undefined which the lib filters out.
        // A physical trial is never recorded (PHYSICAL_RACE_EMISSION_ENABLED).
        // M4-4: the splits against the ghost this race sailed with, before the
        // ghost row below may take this race as the new best.
        set.setGhostSplits?.(physical ? [] : raceGhostSplits(ghostTrackRef.current, {
          marks: markTimesRef.current.has("player") ? [markTimesRef.current.get("player")!] : [],
          finishSec: player.finishTime == null ? null : player.finishTime + (ruleStateRef.current.penalties.player ?? 0) }));
        if (player.finishTime != null && !physical) {
          // The ghost row is written in the iOS app too: its race bridge
          // (mobile/src/persistence/race-web-storage.ts) carries it to native
          // storage and injects it again before the next race page loads.
          const track = makeGhostTrack(ghostClassKey({ raceContext: LEGACY_RACE_CONTEXT, mode: racePrefsRef.current.mode,
            difficulty, windStrength, missionId: selectedMission?.id ?? null }),
            player.finishTime + (ruleStateRef.current.penalties.player ?? 0), logSamplesRef.current,
            logEventsRef.current.filter(e => e.type === "mark-rounded").map(e => e.t));
          const store = localStore();
          const remembered = track ? rememberGhost(readGhostStore(store), track) : null;
          if (remembered?.replaced) writeGhostStore(store, remembered.store);
        }
        // M4-5: the course medal, on the web and in the app (its race bridge
        // carries the row). Never for the physical trial: it has no medal course.
        if (!physical) {
          const store = localStore();
          const awarded = awardRaceMedal(readMedalStore(store), { raceContext: LEGACY_RACE_CONTEXT, difficulty, windStrength },
            player.finishTime == null ? null : player.finishTime + (ruleStateRef.current.penalties.player ?? 0),
            refs.raceHintsRef?.current ?? true);
          const saved = awarded ? writeMedalStore(store, awarded.store) : false;
          set.setMedalAward?.(awarded ? { ...awarded.award, saved } : null);
        } else set.setMedalAward?.(null);
        if (player.finishTime != null && !isNativeRace() && !physical) {
          const rec = tryUpdateBestRecord(difficulty, windStrength, player.finishTime + (ruleStateRef.current.penalties.player ?? 0), racePrefsRef.current.mode);
          setBestRecord(rec.currentBest);
          setIsNewRecord(rec.isNewRecord);
        }

        // --- Evaluate selected mission ---
        if (selectedMission && !physical) {
          const { tacks, noGoEntries, topSpeed } = raceLogTally(logEventsRef.current, logSamplesRef.current);
          const metrics: RaceMetrics = {
            finishTimeSec: player.finishTime == null ? null : player.finishTime + (ruleStateRef.current.penalties.player ?? 0),
            tackCount: tacks,
            noGoEntries,
            topSpeed,
          };
          const r = evaluateMission(selectedMission, metrics, lang);
          setMissionResult(r);
        } else {
          setMissionResult(null);
        }

        // --- Request AI coaching ---
        const playerRank = sorted.findIndex((r) => r.isPlayer) + 1;
        const payload = {
          difficulty,
          courseInfo: {
            windDirection: WIND_DIRECTION,
            windwardMark: course.marks[0].pos,
            startY: course.startLine.a.y,
          },
          finishTime: player.finishTime ?? null,
          position: playerRank,
          totalBoats: sorted.length,
          samples: logSamplesRef.current,
          events: logEventsRef.current,
          lang,
        };
        const { coaching: localCoaching, mainMistake } = analyseRaceLocallyWithFocus(payload, langRef.current);
        setCoaching(localCoaching);
        // M4-6: the race menu's next step (src/lib/race-next-step.ts): this
        // race's day, its main mistake as the next goal, a finished daily
        // race. Web and app alike (the app's race bridge carries the row);
        // never the physical trial.
        if (!physical) {
          const store = localStore();
          writeRaceHomeStore(store, recordRaceEnd(readRaceHomeStore(store),
            { now: new Date(), goal: mainMistake, dailyDay, finished: player.finishTime != null }));
        }
        // Diagnostics only (race.summary): a failure here never touches the race end.
        try {
          const [resultRow, debriefRow] = raceSummaryDiagnostics({ mode: racePrefsRef.current.mode, difficulty, wind: windStrength, setup: raceSetupRef.current,
            finished: player.finishTime != null, place: playerRank, total: sorted.length,
            botsFinished: boats.filter((b) => !b.isPlayer && b.lapDone === 2).length, raceSeconds: elapsedSec,
            penaltySeconds: ruleStateRef.current.penalties.player ?? 0, finishHoldShown, soundOn: readRaceSound(), orientation: raceOrientation(),
            events: logEventsRef.current, samples: logSamplesRef.current, ruleEvents: ruleEventsRef.current,
            tally: physical ? null : raceTallyRef.current, coachScore: localCoaching.score, mainMistake });
          recordDiagnostic(resultRow);
          // With rules on, the debrief waits for the judge (loaded after the finish)
          // so judgeIncidents is the count the results screen lists, not a recount.
          if (!judgedIncidents) recordDiagnostic(debriefRow);
          else void judgedIncidents.then(n => withJudgeIncidents(debriefRow, n), () => debriefRow)
            .then(row => { try { recordDiagnostic(row); } catch { /* optional journal */ } });
        } catch { /* The journal is optional; the race result is not. */ }
        // Post within the finish tick, before a result/menu render can replace
        // the active refs. Keep the immutable payload until its own durable ack.
        if (isNativeRace() && !physical && player.finishTime !== undefined && logSamplesRef.current.length >= 2) {
          const snapshot: NativeRaceSnapshot = { schema: 1, id: raceIdRef.current, mode: racePrefsRef.current.mode,
            difficulty, windStrength, missionId: selectedMission?.id ?? null,
            finishTimeSec: player.finishTime, position: playerRank, totalBoats: sorted.length,
            // The native validator (race-native.ts, also inside installed app
            // builds) knows no 'gybe' event yet; the coaching above has them.
            course, samples: logSamplesRef.current, events: logEventsRef.current.filter(nativeLogEvent), coaching: localCoaching,
            penaltySeconds: ruleStateRef.current.penalties.player ?? 0 };
          pendingNativeSaves.current.add(snapshot);
          const sent = postNativeRace(pendingNativeSaves.current.get(snapshot.id)!);
          setNativeSave(sent ? "saving" : "error");
          recordDiagnostic({ type: "race.save", surface: "race", outcome: sent ? "accepted" : "failed", action: "request", target: "local", ...(sent ? {} : { reason: "storage-unavailable" }) });
          // This live engine is legacy. This explicit PB authority does not
          // backfill the separate historical snapshot's absent provenance.
          const queued = pendingNativeBests.current.add({ schema: 1, id: snapshot.id,
            comparison: { raceContext: LEGACY_RACE_CONTEXT, mode: racePrefsRef.current.mode, difficulty, windStrength },
            rawFinishTimeSec: player.finishTime, penaltySeconds: snapshot.penaltySeconds ?? 0,
            finishTimeSec: player.finishTime + (snapshot.penaltySeconds ?? 0), course: snapshot.course });
          if (queued) requestNativeBest(snapshot.id);
          else if (!pendingNativeBests.current.has(snapshot.id)) {
            setNativeBestSave({ status: "error", id: snapshot.id, requestId: "", retryable: false });
            recordDiagnostic({ type: "race.save", surface: "race", target: "personal-best", action: "error", outcome: "failed",
              reason: pendingNativeBests.current.size() >= NATIVE_BEST_PENDING_LIMIT ? "limit" : "invalid-input" });
          }
        }
        setCoachingLoading(!isNativeRace());
        const completedRaceId = raceIdRef.current;
        if (!isNativeRace()) fetch('/api/coach', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
          .then((r) => r.json())
          .then((data) => {
            if (raceIdRef.current !== completedRaceId) return;
            if (data.coaching) {
              setCoaching(data.coaching); setCoachingSource(data.fallback ? "local" : "ai");
            } else {
              // Fall back to local rule-based analysis so the user still gets feedback
              const local = analyseRaceLocally(payload, lang);
              setCoaching(local);
              if (data.fallback) setCoachingError(null);
              else setCoachingError(tp('AI недоступен - показан локальный анализ', 'AI unavailable - showing local analysis', 'AI niedostępne - pokazuję analizę lokalną', { es: 'IA no disponible - se muestra el análisis local', fr: 'IA indisponible - analyse locale affichée', de: 'KI nicht verfügbar - lokale Analyse wird angezeigt', it: 'IA non disponibile - viene mostrata l\'analisi locale' }));
            }
          })
          .catch(() => {
            if (raceIdRef.current !== completedRaceId) return;
            // Network error - use local analysis
            const local = analyseRaceLocally(payload, lang);
            setCoaching(local);
            setCoachingError(tp('AI недоступен - показан локальный анализ', 'AI unavailable - showing local analysis', 'AI niedostępne - pokazuję analizę lokalną', { es: 'IA no disponible - se muestra el análisis local', fr: 'IA indisponible - analyse locale affichée', de: 'KI nicht verfügbar - lokale Analyse wird angezeigt', it: 'IA non disponibile - viene mostrata l\'analisi locale' }));
          })
          .finally(() => { if (raceIdRef.current === completedRaceId) setCoachingLoading(false); });

        return;
      }

      });
      // Publish after the entire fixed-step batch. On a slow renderer, the
      // first tick can be half a second behind the final state of this frame.
      if (advanced && refreshHud) {
        const player = boatsRef.current.find(boat => boat.isPlayer);
        if (player) {
          hudRefreshRef.current = now;
          const twa = calcTWA(player.heading, windDirRef.current);
          setPlayerTWA(twa); setPlayerSpeed(physicalRef.current ? player.speed : displayedBoatSpeed(groundSpeed, player.speed));
          const reading = raceWindReading({ heading: player.heading, boatSpeedKn: player.speed, windFrom: windDirRef.current,
            windKnots: player.physics?.trueWindSpeed, leeway: player.physics?.leeway });
          setWindReading(reading);
          if (soundscape) {
            // Sails flog in the no-go zone in both modes; a luff counts only in Pro, where the player holds the sheets.
            const mode = racePrefsRef.current.mode;
            soundIn.apparentWindKn = reading?.apparentKnots ?? player.physics?.trueWindSpeed ?? 0;
            soundIn.boatSpeedKn = player.speed; soundIn.heelDeg = player.physics?.heel ?? 0;
            soundIn.inIrons = Math.abs(twa) < NO_GO.angleDeg;
            soundIn.luffing = mode === "pro" && !soundIn.inIrons && coachLuffing(raceTrimCoach(player));
            soundIn.mode = mode; soundIn.paused = pausedRef.current || document.hidden;
            soundIn.muted = !readRaceSound();
            soundscape.update(mapRaceSoundscape(soundIn, soundOut));
          }
          setNavigation(createRaceNavigationSnapshot({ course: courseRef.current, boats: boatsRef.current, windFrom: windDirRef.current }));
          const advisory = planRaceGuidance(player, courseRef.current, windDirRef.current, guidanceStateRef.current);
          guidanceStateRef.current = advisory.state; setRouteGuidance(advisory.guidance);
        }
        if (isRacing) setElapsed(raceClockRef.current);
      }
      if (!ended) rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      unbindClock();
      if (simulationClockRef.current === clock) simulationClockRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState, difficulty, requestNativeBest]);
  useEffect(() => {
    simulationClockRef.current?.synchronize(performance.now(), startupGate.current.active(pausedRef.current, document.hidden));
    // The refs are GameClient's stable useRef objects; the dependencies are the original ones.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState, paused, sceneReady]);
}
