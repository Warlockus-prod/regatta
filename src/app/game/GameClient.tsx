'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { playStartSignal, readRaceSound, subscribeRaceSound, writeRaceSound } from '@/lib/sounds';
import { useStartSignals } from '@/features/race-hud/useStartSignals';
import { SOLO_COUNTDOWN_FROM } from '@/lib/race-start-signals';
import { missions, type Mission } from '@/data/missions';
import { useI18n } from '@/lib/i18n';
import {
  getBestRecord,
  formatRecordTime,
  type BestRecord,
} from '@/lib/best-times';
import { saveRaceSetup, loadRaceSetup, clearRaceSetup, type SavedRaceSetup } from '@/lib/race-resume';
// Shared sailing engine; the WebSocket server imports a generated bundle.
import { WIND_DIRECTION_BASE as WIND_DIRECTION } from '@/lib/race-physics';
import { useVenue } from '@/features/venues/useVenue';
import { GameMenu } from './GameMenu';
import { DIFFICULTY_CONFIG, type Difficulty } from './config';
import { useRaceSceneFlags, useRaceView } from '@/features/race-3d/useRaceView';
import type { RaceSceneStats } from '@/features/race-scene/RaceScene';
import { type StandingRow } from '@/features/race-hud/RaceHud';
import { raceEventSource, type FeedbackPost, type FeedbackTone } from '@/features/race-hud/feedback';
import { hintLogKind, loggedRouteAction, loggedTrimKey } from '@/features/race-hud/hint-log';
import { useRaceHintLog } from '@/features/race-hud/RaceHintLog';
import { useRaceFeedback } from '@/features/race-hud/useRaceFeedback';
import { useFirstRaceHints } from '@/features/race-hud/useFirstRaceHints';
import { hasSeenRaceIntro, markRaceIntroSeen, raceIntroDue, raceIntroEndRecordsSeen, raceIntroRequested, stepAfterRaceIntro, type RaceIntroEnd, type RaceIntroOpen } from '@/features/race-hud/race-intro';
import { polarFor, targetSpeed } from '@/features/race-hud/target';
import { measureRaceSkills, raceSkillBars } from '@/lib/race-skill-metrics';
import { eventText, type RaceEvent } from '@/features/race-hud/events';
import { isEmbed } from '@/lib/theme';
import type { RaceBoat } from "@/lib/race-physics";
import type { Controls } from "@/lib/sailing-physics/types";
import { raceStartTrim } from "./race-start-trim";
import { raceTrim } from "@/lib/race-physics";
import type { RaceGuidance } from "@/lib/race-guidance";
import { createRaceRulesState, type RaceRuleEvent } from "@/lib/race-rules";
import type { RaceJudgeDebrief } from "@/lib/race-judge";

// Loaded only where used: the physical engine only for a `?race=` trial (the
// judge loads in RaceResults). Neither belongs in every /game visit.
type PhysicalFleetModule = typeof import("@/lib/race-physical-fleet");
import { isNativeRace, navigateNativeRace, readRaceSearch, readNativeRaceReplay, postNativeRace, postNativeRaceStarted, postNativePersonalBest } from "@/lib/race-native";
import { RaceCockpit } from "./RaceCockpit";
import { useRacePrefs } from "./race-prefs";
import { RaceSoundToggle } from "@/features/race-hud/RaceSoundToggle";
import { useRaceHaptics } from "@/features/race-hud/RaceHapticsToggle";
import { createFixedClock } from "@/features/sailing-lab/runtime/fixed-clock";
import { createRaceStartupGate } from "@/lib/race-startup";
import { linkedRaceSetup, planRaceResume, raceSetupWindMultiplier } from "@/lib/race-setup";
import { raceReturnFor } from "@/lib/race-return";
import { raceTrimCoach } from "@/lib/race-trim-coach";
import type { CoachKey } from "@/features/sailing-lab/runtime/trim-coach";
import { createRaceSoundscape } from "@/lib/race-soundscape-audio";
import { useSailCoachLabels } from "@/features/simulator-3d/useSailCoachLabels";
import { useRaceCopy } from "./race-copy";
import { RaceReplay } from "./RaceReplay";
import { useRaceSoundscapeLifecycle } from "./useRaceSoundscape";
import { createPendingRaceSaves } from "@/lib/race-completion";
import { recordDiagnostic, recordControlChange, recordPreferenceChange } from "@/lib/diagnostics-controls";
import { trackRaceCountdown, trackRaceReplay } from "@/lib/funnel";
import { initializeDiagnosticBridge } from "@/lib/diagnostics-bridge";
import { createRaceNavigationSnapshot, raceWindReading, type RaceNavigationSnapshot, type RaceWindReading } from "@/features/race-hud/navigation-model";
import { createPendingNativeBestCommands, nativeBestFailure } from "@/lib/race-best-command";
import { LEGACY_RACE_CONTEXT, type PhysicalRaceProfile } from "@/lib/race-context";
import { physicalFleetSpawns } from "@/lib/race-courses";
import { legacyRaceSpawns, raceBotSpeedMul, type RaceSpawn } from "@/lib/race-spawn";
import type { PhysicalBotState } from "@/lib/race-physical-bot";
import { readPhysicalTrial } from "@/lib/race-trial";
import { ghostClassKey, ghostPose, readGhostStore, type GhostTrack } from "@/lib/race-ghost";
import type { MedalAward } from "@/lib/race-medals";
import type { GhostSplit } from "@/lib/race-ghost-splits";
import { AI_COLORS, AI_NAMES, PLAYER_COLOR, localStore, makeCourse, planRouteGuidance, raceLogTally, recordSample, formatTime,
  type Boat, type Coaching, type Course, type GameState, type LogEvent, type LogSample, type RaceResultRow, type RouteGuidanceState } from "./race-model";
import { useRaceLoop } from "./useRaceLoop";
import { RaceFinishHoldPlate } from "./RaceFinishPlate";
import { finishHoldActive } from "./race-finish-hold";
import { claimGameLayer } from "@/components/game-layer";
import { isRacePauseKey, raceUsesGameLayer, TEXT_ENTRY_SELECTOR } from "./race-layer";
import { RaceBriefing } from "./RaceBriefing";
import { briefingCourseId, hasSeenBriefing, hubHandsOffSetup, markBriefingSeen, phaseStartsNewRace, raceEntryStep, type RaceEntryTrigger } from "./race-setup-flow";
import { RaceResults, type LeaderboardSaveState, type NativeBestSaveState, type NativeSaveStatus } from "./RaceResults";
import type { RaceSetupRecord, RaceSetupSource, RaceTally } from "./race-diagnostic-summary";

// three.js loads only when someone opens the race in 3D.
const RaceScene = dynamic(() => import('@/features/race-scene/RaceScene').then((m) => m.RaceScene), { ssr: false });
// F5: the race intro loads only when it opens (once per device, or "How to race").
const RaceIntro = dynamic(() => import('@/features/race-hud/RaceIntro').then((m) => m.RaceIntro), { ssr: false });

const noSubscribe = () => () => {};

/** M4-3: how the replay opens (openReplay in GamePage). */
interface ReplayOpen { at: number | null; autoplay: boolean }
const REPLAY_PAUSED_AT_START: ReplayOpen = { at: null, autoplay: false };

// ============================================================================
// GAME COMPONENT
// ============================================================================

export default function GamePage() {
  useEffect(() => { initializeDiagnosticBridge(); }, []);
  const { tp, tl, lang } = useI18n();
  // Scenery around the race area (src/data/venues): drawn by the canvas loop, so kept in refs.
  const { venue } = useVenue();
  const langRef = useRef(lang);
  useEffect(() => { langRef.current = lang; }, [lang]);
  // The shared 3D scene reads the same live race refs as the controls.
  const { camera: raceCamera, setCamera: setRaceCamera } = useRaceView();
  const [cameraRevision, setCameraRevision] = useState(0);
  const sceneFlags = useRaceSceneFlags();
  // The next renderer's frame rate, written straight into its readout (no re-render).
  const statsRef = useRef<HTMLDivElement | null>(null);
  const showSceneStats = useCallback((s: RaceSceneStats) => {
    if (statsRef.current) statsRef.current.textContent = `${s.backend} · ${s.fps} fps · ${s.dpr}x`;
  }, []);
  // Inside the app (?embed=1) the site nav is hidden, so the race takes the whole height.
  const embed = useSyncExternalStore(noSubscribe, () => isNativeRace() || isEmbed(), () => false);
  const race3dLabels = useMemo(() => ({
    metres: lang === 'ru' ? 'м' : 'm',
    loading: tl({ ru: 'Загружаем яхту', en: 'Loading the yacht', pl: 'Ładujemy jacht', es: 'Cargando el velero', fr: 'Chargement du voilier', de: 'Yacht wird geladen', it: 'Caricamento della barca' }),
    scene: tl({ ru: '3D-вид гонки', en: '3D race view', pl: 'Widok 3D wyścigu', es: 'Vista 3D de la regata', fr: 'Vue 3D de la course', de: '3D-Rennansicht', it: 'Vista 3D della regata' }),
    error: tl({ ru: '3D не загрузилось. Повтори загрузку.', en: "3D did not load. Retry loading.", pl: '3D się nie wczytało. Ponów ładowanie.', es: 'El 3D no se cargó. Reintenta la carga.', fr: "La 3D ne s'est pas chargée. Relance le chargement.", de: '3D wurde nicht geladen. Erneut laden.', it: 'Il 3D non si è caricato. Riprova il caricamento.' }),
    retry: tl({ ru: 'Повторить', en: 'Try again', pl: 'Spróbuj ponownie', es: 'Reintentar', fr: 'Réessayer', de: 'Erneut versuchen', it: 'Riprova' }),
  }), [tl, lang]);
  const nativeRace = useSyncExternalStore(noSubscribe, isNativeRace, () => false);
  const { prefs: racePrefs, update: writeRacePrefs } = useRacePrefs();
  // M1-5 race sound (on by default, separate from the helm click sound): its
  // switch sits in the status row and in the pause sheet (M1-2). Same store as
  // useRaceSound() in race-prefs.ts, read here directly so the race-prefs mocks
  // of the GameClient tests stay valid.
  const raceSoundOn = useSyncExternalStore(subscribeRaceSound, readRaceSound, () => true);
  const setRaceSoundOn = useCallback((on: boolean) => writeRaceSound(on, "race"), []);
  // M3-4: vibration on race events, its switch beside race sound where the device can vibrate.
  const raceHaptics = useRaceHaptics("race");
  const [lockedMode, setLockedMode] = useState<"simple" | "pro" | null>(null);
  const playingPrefs = lockedMode === null ? racePrefs : { ...racePrefs, mode: lockedMode };
  const copy = useRaceCopy();
  const trimLabels = useSailCoachLabels();
  const copyRef = useRef(copy); copyRef.current = copy;
  const racePrefsRef = useRef(playingPrefs); racePrefsRef.current = playingPrefs;
  const [rudder, setRudderState] = useState(0);
  const rudderRef = useRef(0);
  const [trim, setTrimState] = useState<Controls>(() => raceTrim({ mainHoisted: true }));
  const trimRef = useRef(trim);
  // M3-2 race soundscape on the shared race AudioContext (ADR-0019); it never creates one.
  const [soundscape] = useState(() => createRaceSoundscape());
  // `byPlayer` is false when the race adopts the crew's trim (switch to Pro): no winch then.
  const applyTrim = useCallback((patch: Partial<Controls>, byPlayer: boolean) => {
    const previous = trimRef.current, next = raceTrim(patch, previous);
    trimRef.current = next; setTrimState(next);
    // A sheet the player moved: the winch ratchet (silent unless the soundscape is live).
    const hauled = Math.abs(next.mainSheet - previous.mainSheet) + Math.abs(next.jibSheet - previous.jibSheet);
    if (byPlayer && hauled > 0) soundscape.winch(hauled);
    for (const [key, control] of [["mainSheet", "mainsheet"], ["jibSheet", "jibsheet"], ["mainTwist", "main-twist"], ["jibTwist", "jib-twist"], ["reef", "reef"], ["jibFurl", "jib-furl"]] as const) if (key in patch) recordControlChange("race", control, next[key], previous[key]);
    if ("mainHoisted" in patch) recordControlChange("race", "main-hoisted", next.mainHoisted !== false, previous.mainHoisted !== false);
  }, [soundscape]);
  const setTrim = useCallback((patch: Partial<Controls>) => applyTrim(patch, true), [applyTrim]);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  const raceClockRef = useRef(0);
  const hudRefreshRef = useRef(0);
  const ruleStateRef = useRef(createRaceRulesState());
  const [penalty, setPenalty] = useState(0);
  const raceIdRef = useRef("");
  const [nativeSave, setNativeSave] = useState<NativeSaveStatus>("idle");
  const pendingNativeSaves = useRef(createPendingRaceSaves());
  const pendingNativeBests = useRef(createPendingNativeBestCommands());
  const [nativeBestSave, setNativeBestSave] = useState<NativeBestSaveState>({ status: "idle", id: "", requestId: "", retryable: false });
  const nativeReplayHydrated = useRef(false);
  const [gameState, setGameState] = useState<GameState>('menu');
  const gameStateRef = useRef(gameState); gameStateRef.current = gameState;
  // F5: the race intro, by itself before the first race ("first") or on request.
  const [intro, setIntro] = useState<RaceIntroOpen>("closed");
  const introRef = useRef(intro); introRef.current = intro;
  // Diagnostics only (race.summary, race.lifecycle restart): how this race was
  // entered and its per-race counts. Never read by the race itself.
  const raceSetupRef = useRef<RaceSetupRecord>({ source: "lobby", briefingShown: false, race: "free" });
  const raceTallyRef = useRef<RaceTally>({ missedMarkNotices: 0, contacts: 0 });
  const setupRootRef = useRef<HTMLDivElement>(null);
  const startupGate = useRef(createRaceStartupGate());
  const simulationClockRef = useRef<ReturnType<typeof createFixedClock> | null>(null);
  const [sceneRaceId, setSceneRaceId] = useState("");
  const [sceneReady, setSceneReady] = useState(false);
  const onSceneReady = useCallback(() => {
    if (startupGate.current.rendered(sceneRaceId)) {
      setSceneReady(true);
      recordDiagnostic({ type: "race.lifecycle", surface: "race", outcome: "accepted", action: "scene-ready" });
    }
  }, [sceneRaceId]);
  // Daily challenge mode: read ?daily=YYYY-MM-DD&difficulty=...&wind=...
  const [dailyDay, setDailyDay] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [countdown, setCountdown] = useState(SOLO_COUNTDOWN_FROM);
  // M3-3: flag X while the race's own early-start detection holds the player over the line.
  // Shown only while Rules are on: with Rules off the race emits no start-clear, so X would stick.
  const [recall, setRecall] = useState(false);
  const onStartRecall = useCallback((over: boolean) => { setRecall(over); if (over) playStartSignal("recall"); }, []);
  const [elapsed, setElapsed] = useState(0);
  const [results, setResults] = useState<RaceResultRow[]>([]);
  // Personal-best record for the current difficulty + wind bucket. Updated
  // when the player finishes; surfaces as a "NEW RECORD" banner in the
  // finish modal and a "Your best: 1:27" badge in the briefing.
  const [bestRecord, setBestRecord] = useState<BestRecord | null>(null);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const acceptNativeBestReply = useCallback((raw: unknown) => {
    const reply = pendingNativeBests.current.settle(raw);
    if (!reply) return;
    recordDiagnostic({ type: "race.save", surface: "race", target: "personal-best", action: reply.status === "failed" ? "error" : "ack",
      outcome: reply.status === "failed" ? "failed" : "accepted", ...(reply.status === "failed" ? { reason: reply.reason } : {}) });
    if (reply.id !== raceIdRef.current) return;
    setNativeBestSave({ status: reply.status === "failed" ? "error" : "saved", id: reply.id, requestId: reply.requestId, retryable: reply.status === "failed" });
    if (reply.status !== "failed") { setBestRecord(reply.currentBest); setIsNewRecord(reply.newRecord); }
    else setIsNewRecord(false);
  }, []);
  const requestNativeBest = useCallback((raceId: string, action: "request" | "retry" = "request") => {
    const command = pendingNativeBests.current.request(raceId);
    if (!command) return;
    if (raceId === raceIdRef.current) setNativeBestSave({ status: "saving", id: raceId, requestId: command.requestId, retryable: false });
    const sent = postNativePersonalBest(command);
    recordDiagnostic({ type: "race.save", surface: "race", target: "personal-best", action, outcome: sent ? "accepted" : "failed",
      ...(sent ? {} : { reason: "storage-unavailable" }) });
    if (!sent) acceptNativeBestReply(nativeBestFailure(command, "storage-unavailable"));
  }, [acceptNativeBestReply]);
  useEffect(() => {
    const result = (event: Event) => acceptNativeBestReply((event as CustomEvent<unknown>).detail);
    window.addEventListener("regatta:personal-best-result", result);
    return () => window.removeEventListener("regatta:personal-best-result", result);
  }, [acceptNativeBestReply]);
  useEffect(() => {
    if (nativeBestSave.status !== "saving") return;
    const timer = window.setTimeout(() => {
      const command = pendingNativeBests.current.waiting(nativeBestSave.id);
      if (command?.requestId === nativeBestSave.requestId) acceptNativeBestReply(nativeBestFailure(command, "timeout"));
    }, 15_000);
    return () => window.clearTimeout(timer);
  }, [nativeBestSave, acceptNativeBestReply]);
  const [playerTWA, setPlayerTWA] = useState(0);
  const [playerSpeed, setPlayerSpeed] = useState(0);
  const [windReading, setWindReading] = useState<RaceWindReading | null>(null);
  const [navigation, setNavigation] = useState<RaceNavigationSnapshot | null>(null);

  const boatsRef = useRef<Boat[]>([]);
  const courseRef = useRef<Course>(makeCourse());
  // Opt-in physical trial (ADR-0014, `?race=short|medium|long`): the player's
  // boat is the trainer's boat in metres. Nothing from it is recorded.
  const physicalRef = useRef<PhysicalRaceProfile | null>(null);
  const physicalNavRef = useRef<ReadonlyMap<string, PhysicalBotState> | undefined>(undefined);
  const [physicalTrial, setPhysicalTrial] = useState<PhysicalRaceProfile | null>(null);
  // Personal ghost (P09): your best finished race of the same class, drawn
  // from its own ref, outside the fleet, ranks, collisions and rules.
  const ghostTrackRef = useRef<GhostTrack | null>(null);
  // Training judge (stage 3): every boat's rule events of this race, so the
  // debrief knows who had right of way; bounded like the other race logs.
  const ruleEventsRef = useRef<RaceRuleEvent[]>([]);
  const startedAtRef = useRef<number | undefined>(undefined);
  const [judgeDebrief, setJudgeDebrief] = useState<RaceJudgeDebrief | null>(null);
  const ghostBoatsRef = useRef<RaceBoat[]>([]);
  const [ghostTime, setGhostTime] = useState<number | null>(null);
  // M4-4: splits against that ghost at the mark and the finish, for the results.
  const [ghostSplits, setGhostSplits] = useState<GhostSplit[]>([]);
  // M4-5: the course medal of this race (race-medals.ts) and whether route or
  // trim hints were on at any moment of the countdown or the race, paused
  // included (set by the loop, reset per race in initRace).
  const [medalAward, setMedalAward] = useState<MedalAward | null>(null);
  const raceHintsRef = useRef(false);
  const fleetRef = useRef<PhysicalFleetModule | null>(null);
  useEffect(() => {
    const profile = readPhysicalTrial(window.location.search);
    if (!profile) return;
    let live = true;
    // The trial opens only once its engine is here; until then the race is legacy.
    void import("@/lib/race-physical-fleet").then(fleet => {
      if (!live) return;
      fleetRef.current = fleet;
      physicalRef.current = profile;
      courseRef.current = makeCourse(profile);
      setPhysicalTrial(profile);
    });
    return () => { live = false; };
  }, []);
  const guidanceStateRef = useRef<RouteGuidanceState | null>(null);
  const [routeGuidance, setRouteGuidance] = useState<RaceGuidance | null>(null);
  const keysRef = useRef<Set<string>>(new Set());
  const rafRef = useRef<number | null>(null);

  // Race log for AI coaching
  const logSamplesRef = useRef<LogSample[]>([]);
  // F3: the big map draws the player's track from the race log, read when it renders.
  const [readTrack] = useState(() => () => logSamplesRef.current);
  const logEventsRef = useRef<LogEvent[]>([]);
  const lastSampleTimeRef = useRef<number>(0);
  const wasInNoGoRef = useRef<boolean>(false);
  const lastTackSignRef = useRef<number>(0);

  // HUD (src/features/race-hud): standings, and short race events with the
  // numbers the race measured (a tack's cost, the split at the mark, overtakes).
  const [standings, setStandings] = useState<StandingRow[]>([]);
  const standingsKeyRef = useRef('');
  const markTimesRef = useRef<Map<string, number>>(new Map());
  const speedLogRef = useRef<{ t: number; speed: number }[]>([]);
  const turnRef = useRef<{ kind: 'tack' | 'gybe'; t: number; before: number; min: number } | null>(null);
  const shownRankRef = useRef(0);
  const pendingRankRef = useRef<{ rank: number; since: number } | null>(null);
  // M1-3 feedback bus: race events, rule notices and the contact frame share
  // one queue with priorities, so a rule notice no longer hides an event.
  const { feedback, post: postToBus, contact: showContact, clear: clearFeedback } = useRaceFeedback();
  // F4 hint log: every message given to the bus is also kept, with the race
  // time, in the race's hint log (hint-log.ts), which the player can open and read.
  const { entries: hintLog, add: addHint, clear: clearHintLog } = useRaceHintLog();
  const postFeedback = useCallback((message: FeedbackPost) => {
    postToBus(message);
    addHint(hintLogKind(message.source), message.text, message.tone, raceClockRef.current);
  }, [postToBus, addHint]);
  const showEvent = useCallback((event: RaceEvent, tone: FeedbackTone) => {
    postFeedback({ source: raceEventSource(event.kind), text: eventText(langRef.current, event), tone });
  }, [postFeedback]);
  const showNotice = useCallback((text: string, source: "rule" | "missed-mark", tone: FeedbackTone) => {
    postFeedback({ source, text, tone });
  }, [postFeedback]);
  // M4-7: first race hints in the moment, once per device, on the same bus.
  const { hintsRef: firstHintsRef, showHint, reload: reloadFirstHints, showAgain: showHintsAgain } = useFirstRaceHints(postFeedback, feedback.visible, langRef, paused);

  // AI coaching state
  const [coachingSource, setCoachingSource] = useState<"local" | "ai">("local");
  const [coaching, setCoaching] = useState<Coaching | null>(null);
  const [coachingLoading, setCoachingLoading] = useState(false);
  const [coachingError, setCoachingError] = useState<string | null>(null);

  // Mission pass/fail state (set on finish)
  const [missionResult, setMissionResult] = useState<{ passed: boolean; reasons: string[]; mission: Mission } | null>(null);

  // Leaderboard save state (logic defined further down after deps are declared)
  const [nickname, setNickname] = useState<string | null>(null);
  const [nicknameInput, setNicknameInput] = useState('');
  const [saveState, setSaveState] = useState<LeaderboardSaveState>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);
  const saveAttemptedRef = useRef(false);

  // M4-3: how the replay opens. From the results it plays on open, from a
  // judge item or a coach mistake at that moment (5 s before it); the native
  // history replay opens paused at the start (the initial value).
  const [replayOpen, setReplayOpen] = useState<ReplayOpen>(REPLAY_PAUSED_AT_START);
  const openReplay = (at: number | null) => {
    trackRaceReplay('result', raceIdRef.current);
    setReplayOpen({ at, autoplay: true });
    setGameState('replay');
  };

  // Shareable replay code
  const [replayCode, setReplayCode] = useState<string | null>(null);
  const replayAttemptedRef = useRef(false);

  // Load nickname on mount
  useEffect(() => {
    if (isNativeRace()) return;
    fetch('/api/player').then((r) => r.json()).then((d) => {
      if (d?.nickname) setNickname(d.nickname);
    }).catch(() => {});
  }, []);

  // Daily mode: read URL params and lock difficulty/wind
  // M1-1: inside the app the Race hub already chose the whole setup and hands
  // it over in the query, so the race starts without asking again (briefing on
  // a first visit, otherwise the countdown). Exit then returns to the hub.
  const [hubHandoff, setHubHandoff] = useState(false);
  const [handedOff, setHandedOff] = useState(false);
  const handedSetupRef = useRef(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const setup = linkedRaceSetup(readRaceSearch());
    if (!setup) return;
    setDifficulty(setup.difficulty);
    setWindStrength(setup.windStrength);
    setSelectedMission(missions.find(m => m.id === setup.missionId) ?? null);
    setDailyDay(setup.dailyDay);
    if (hubHandsOffSetup({ native: isNativeRace(), linkedSetup: true, replay: Boolean(readNativeRaceReplay()), trial: Boolean(readPhysicalTrial(window.location.search)) })) {
      handedSetupRef.current = true;
      setHubHandoff(true); setHandedOff(true);
    }
  }, []);
  // F5: the app's Race hub ("How to race") and a shared /game?intro=1 open
  // the race page only to read the intro, over the lobby.
  useEffect(() => {
    const search = readRaceSearch();
    if (raceIntroRequested(search, { trial: readPhysicalTrial(search.toString()) !== null, linkedSetup: linkedRaceSetup(search) !== null })) setIntro("hub");
  }, []);

  // Autopilot: holds a target heading; any input turns it off
  const [autopilotOn, setAutopilotOn] = useState(false);
  const [targetHeading, setTargetHeading] = useState(0);
  const autopilotHeadingRef = useRef<number>(0);
  // Mirror autopilot state into a ref. The rAF game-loop effect closes over its
  // deps at setup ([gameState, difficulty]) and is intentionally NOT restarted
  // on toggle, so reading `autopilotOn` directly inside it was a stale closure -
  // the button engaged/disengaged nothing. The loop reads autopilotOnRef.current.
  const autopilotOnRef = useRef(false);
  useEffect(() => { autopilotOnRef.current = autopilotOn; }, [autopilotOn]);

  // M1-5: the race's Sound switch is the race sound (default on), not the wheel clicks.
  const muted = !raceSoundOn;

  // Existing wind multiplier: 0.65 (light), 1.0 (medium), 1.3 (heavy).
  const [windStrength, setWindStrength] = useState<'light' | 'medium' | 'heavy'>('medium');
  const windStrengthMul = raceSetupWindMultiplier(windStrength);
  const windStrengthRef = useRef(windStrengthMul);
  useEffect(() => { windStrengthRef.current = windStrengthMul; }, [windStrengthMul]);

  // Mission selection: null = free race
  const [selectedMission, setSelectedMission] = useState<Mission | null>(null);

  // Resume offer: when the user reloaded mid-race we drop them on the
  // menu but show a "you were about to race" banner that takes them
  // back to the briefing with their original setup. The lib only stores
  // INTENT (difficulty / wind / mission), not the live race state, so
  // an interrupted race restarts from the briefing screen rather than
  // resuming mid-position. That's a deliberate trade: we lose the
  // physics state but we never crash on schema skew.
  const [resumeOffer, setResumeOffer] = useState<ReturnType<typeof loadRaceSetup>>(null);
  const setupContextRef = useRef<SavedRaceSetup["raceContext"]>(undefined);
  useEffect(() => {
    const saved = loadRaceSetup();
    if (saved && (saved.phase === 'briefing' || saved.phase === 'countdown' || saved.phase === 'racing')) {
      setResumeOffer(planRaceResume(saved, readRaceSearch(), racePrefsRef.current.mode));
    }
  }, []);

  // Wind shifts (live direction + gust multiplier)
  const windDirRef = useRef<number>(WIND_DIRECTION);
  const windGustRef = useRef<number>(1.0);

  // When a mission is picked, auto-apply its difficulty + wind
  const pickMission = useCallback((m: Mission | null) => {
    setSelectedMission(m);
    if (m) {
      setDifficulty(m.difficulty);
      setWindStrength(m.windStrength);
    }
  }, []);

  // Save finished race result to leaderboard (depends on all the state above)
  const saveResult = useCallback((withNickname?: string) => {
    if (physicalRef.current) return; // A physical trial is never recorded.
    const player = boatsRef.current.find((b) => b.isPlayer);
    if (!player || player.lapDone !== 2 || player.finishTime == null) {
      recordDiagnostic({ type: "race.save", surface: "race", outcome: "rejected", action: "request", target: "leaderboard", reason: "not-ready" });
      setSaveState('error');
      setSaveError(tp('Не финишировал', 'Did not finish', 'Nie ukończono',
        { es: 'No has terminado', fr: 'Course non terminée', de: 'Nicht im Ziel', it: 'Regata non conclusa' }));
      return;
    }
    const finishTime = player.finishTime;
    const completedRaceId = raceIdRef.current;
    const completedPenalty = ruleStateRef.current.penalties.player ?? 0;
    const effectiveNick = (withNickname ?? nickname ?? '').trim();
    if (!effectiveNick) {
      recordDiagnostic({ type: "race.save", surface: "race", outcome: "noop", action: "request", target: "leaderboard", reason: "not-ready" });
      setSaveState('prompting');
      return;
    }
    const { tacks, noGoEntries, topSpeed } = raceLogTally(logEventsRef.current, logSamplesRef.current);
    const playerRank = results.findIndex((r) => r.isPlayer) + 1;
    // A free race on the standard course is a classified Simple or Pro result,
    // so the leaderboard keeps the two modes apart (M1-7). Missions and the
    // daily race stay unclassified, as the API requires.
    const classified = !selectedMission && dailyDay === null
      ? { raceContext: LEGACY_RACE_CONTEXT, mode: lockedMode ?? racePrefsRef.current.mode, course: courseRef.current,
        rawFinishTimeSec: finishTime, penaltySeconds: completedPenalty }
      : {};

    setSaveState('saving');
    setSaveError(null);
    recordDiagnostic({ type: "race.save", surface: "race", outcome: "accepted", action: "request", target: "leaderboard" });

    const doSave = async () => {
      try {
        if (!nickname || nickname !== effectiveNick) {
          const r = await fetch('/api/player', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nickname: effectiveNick }),
          });
          const d = await r.json();
          if (!r.ok) throw new Error(d.error || tp('Не удалось сохранить ник', 'Failed to save nickname', 'Nie udało się zapisać nicku', { es: 'No se pudo guardar el apodo', fr: 'Impossible d\'enregistrer le pseudo', de: 'Nickname konnte nicht gespeichert werden', it: 'Impossibile salvare il nickname' }));
          if (raceIdRef.current === completedRaceId) setNickname(d.nickname);
        }
        const res = await fetch('/api/race-result', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            difficulty,
            windStrength,
            missionId: selectedMission?.id ?? null,
            finishTimeSec: finishTime + completedPenalty,
            position: playerRank || null,
            totalBoats: results.length || null,
            tacks,
            noGoEntries,
            topSpeed: Math.round(topSpeed * 10) / 10,
            score: coaching?.score ?? null,
            nicknameFallback: effectiveNick,
            ...classified,
          }),
        });
        const d = await res.json();
        if (!res.ok) throw new Error(d.error || tp('Не удалось сохранить результат', 'Failed to save result', 'Nie udało się zapisać wyniku', { es: 'No se pudo guardar el resultado', fr: 'Impossible d\'enregistrer le résultat', de: 'Ergebnis konnte nicht gespeichert werden', it: 'Impossibile salvare il risultato' }));
        recordDiagnostic({ type: "race.save", surface: "race", outcome: "accepted", action: "ack", target: "leaderboard" });
        if (raceIdRef.current === completedRaceId) setSaveState('saved');
      } catch (err) {
        recordDiagnostic({ type: "race.save", surface: "race", outcome: "failed", action: "error", target: "leaderboard", reason: "connection" });
        if (raceIdRef.current !== completedRaceId) return;
        setSaveState('error');
        setSaveError(err instanceof Error ? err.message : tp('Ошибка сети', 'Network error', 'Błąd sieci', { es: 'Error de red', fr: 'Erreur réseau', de: 'Netzwerkfehler', it: 'Errore di rete' }));
      }
    };
    void doSave();
  }, [nickname, results, difficulty, windStrength, selectedMission, coaching, tp, dailyDay, lockedMode]);

  // Auto-save when finished (once). With a stored nickname this saves
  // silently; without one saveResult() flips saveState to 'prompting' and
  // the finish overlay shows a skippable nickname prompt.
  // The race is over from the finish tick, also during the 2.5 s finish hold
  // (M1-4), so leaving in the hold does not lose the save or the replay upload.
  const raceOver = gameState === 'finished' || (gameState === 'racing' && results.length > 0);
  useEffect(() => {
    if (!raceOver || isNativeRace() || physicalRef.current) return;
    if (saveAttemptedRef.current) return;
    const player = boatsRef.current.find((b) => b.isPlayer);
    if (!player || player.lapDone !== 2) return;
    saveAttemptedRef.current = true;
    saveResult();
  }, [raceOver, saveResult]);

  // Reset save state on new race ("Again" goes straight to the countdown)
  useEffect(() => {
    if (phaseStartsNewRace(gameState)) {
      saveAttemptedRef.current = false;
      replayAttemptedRef.current = false;
      setSaveState('idle');
      setSaveError(null);
      setReplayCode(null);
    }
  }, [gameState]);

  // Auto-save replay on finish (fire and forget)
  useEffect(() => {
    if (!raceOver || isNativeRace() || physicalRef.current) return;
    if (replayAttemptedRef.current) return;
    const player = boatsRef.current.find((b) => b.isPlayer);
    if (!player || player.lapDone !== 2) return;
    if (logSamplesRef.current.length < 5) return;
    replayAttemptedRef.current = true;
    const completedRaceId = raceIdRef.current;
    recordDiagnostic({ type: "race.save", surface: "race", outcome: "accepted", action: "request", target: "share" });
    fetch('/api/replay', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        difficulty,
        windStrength,
        missionId: selectedMission?.id ?? null,
        finishTimeSec: player.finishTime,
        mode: racePrefsRef.current.mode,
        penaltySeconds: ruleStateRef.current.penalties.player ?? 0,
        samples: logSamplesRef.current,
        events: logEventsRef.current,
        course: courseRef.current,
        nicknameFallback: nickname ?? 'Player',
      }),
    })
      .then((r) => r.ok ? r.json() : Promise.reject(new Error('HTTP ' + r.status)))
      .then((d) => { recordDiagnostic({ type: "race.save", surface: "race", outcome: d?.code ? "accepted" : "failed", action: d?.code ? "ack" : "error", target: "share", ...(d?.code ? {} : { reason: "invalid-message" }) }); if (raceIdRef.current === completedRaceId && d?.code) setReplayCode(d.code); })
      .catch(() => { recordDiagnostic({ type: "race.save", surface: "race", outcome: "failed", action: "error", target: "share", reason: "connection" }); });
  }, [raceOver, difficulty, windStrength, selectedMission, nickname]);

  // -----------------------------------------------------------------------
  // Initialize boats for a new race
  // -----------------------------------------------------------------------
  const initRace = useCallback((diff: Difficulty) => {
    recordDiagnostic({ type: "race.lifecycle", surface: "race", outcome: "accepted", action: "init" });
    reloadFirstHints();
    setLockedMode(null);
    keysRef.current.clear();
    const cfg = DIFFICULTY_CONFIG[diff];
    const course = courseRef.current;
    const boats: Boat[] = [];
    // Both races start in the fair echelon, everybody on one heading: the
    // legacy race in race units (M0-2, race-spawn.ts), the metric fleet in
    // metres (M5, physicalFleetSpawns, max 5 boats).
    const spawns: RaceSpawn[] = physicalRef.current ? physicalFleetSpawns(1 + cfg.opponents) : legacyRaceSpawns(course, cfg.opponents);
    physicalNavRef.current = undefined;
    ghostTrackRef.current = null; ghostBoatsRef.current = []; setGhostTime(null); setGhostSplits([]);
    ruleEventsRef.current = []; startedAtRef.current = undefined; setJudgeDebrief(null);
    raceTallyRef.current = { missedMarkNotices: 0, contacts: 0 };
    raceHintsRef.current = false; setMedalAward(null);

    // Player in the middle
    boats.push({
      id: 'player',
      name: copyRef.current.you,
      color: PLAYER_COLOR,
      pos: { ...spawns[0].pos },
      heading: spawns[0].heading,
      speed: 0,
      isPlayer: true,
      lapDone: 0,
      speedMul: 1,
    });

    for (let i = 0; i < cfg.opponents; i++) {
      boats.push({
        id: `ai${i}`,
        name: AI_NAMES[i] || `AI ${i + 1}`,
        color: AI_COLORS[i] || '#888888',
        pos: { ...spawns[i + 1].pos },
        heading: spawns[i + 1].heading,
        speed: 0,
        isPlayer: false,
        lapDone: 0,
        speedMul: raceBotSpeedMul(cfg.aiSpeedMul), // difficulty, a little spread between bots (Math.random)
      });
    }

    // Pro sheets the player has not touched yet: close-hauled trim that gets the boat going (race-start-trim.ts).
    const startingTrim = raceStartTrim(windStrengthRef.current, boats[0].heading);
    trimRef.current = startingTrim; setTrimState(startingTrim);
    boatsRef.current = boats;
    setWindReading(raceWindReading({ heading: boats[0].heading, boatSpeedKn: boats[0].speed, windFrom: WIND_DIRECTION, windKnots: 12 * windStrengthRef.current }));
    setNavigation(createRaceNavigationSnapshot({ course, boats, windFrom: WIND_DIRECTION }));
    // M5 step 6: the route hint planner of the race's model (race-model.ts).
    const metric = physicalRef.current;
    const initialGuidance = planRouteGuidance(boats[0], course, WIND_DIRECTION, null,
      metric ? { profile: metric, plan: fleetRef.current?.planPhysicalRaceGuidance } : null);
    guidanceStateRef.current = initialGuidance.state; setRouteGuidance(initialGuidance.guidance);
    raceIdRef.current = `race_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    startupGate.current.reset(raceIdRef.current);
    setSceneRaceId(raceIdRef.current); setSceneReady(false);
    ruleStateRef.current = createRaceRulesState();
    raceClockRef.current = 0; pausedRef.current = false; setPaused(false);
    rudderRef.current = 0; setRudderState(0);
    clearFeedback(); clearHintLog(); setPenalty(0); setRecall(false); setNativeSave("idle");
    setNativeBestSave({ status: "idle", id: "", requestId: "", retryable: false });
    setResults([]);
    setElapsed(0);
    setPlayerSpeed(0); // a restart must not show the last race's speed
    setCoaching(null); setCoachingSource("local");
    setCoachingError(null);
    logSamplesRef.current = [];
    logEventsRef.current = [];
    markTimesRef.current = new Map();
    speedLogRef.current = [];
    turnRef.current = null;
    shownRankRef.current = 0;
    pendingRankRef.current = null;
    standingsKeyRef.current = '';
    lastSampleTimeRef.current = 0;
    wasInNoGoRef.current = false;
    lastTackSignRef.current = 0;
  }, [clearFeedback, clearHintLog, reloadFirstHints]);

  // -----------------------------------------------------------------------
  // Start race flow
  // -----------------------------------------------------------------------
  const prepareRace = useCallback(() => {
    setupContextRef.current = undefined;
    windStrengthRef.current = raceSetupWindMultiplier(windStrength);
    initRace(difficulty);
    // Look up the user's best for this (difficulty, wind) bucket so the
    // briefing can show a "Your best: 1:27" badge - small motivator without
    // being competitive about it.
    setBestRecord(getBestRecord(difficulty, windStrength, racePrefs.mode));
    setIsNewRecord(false); // reset from any previous race
    // Persist the user's INTENT to localStorage so we can offer to resume
    // after a reload. We refresh on every phase transition so the saved
    // ts stays close to "now".
    if (!physicalRef.current) saveRaceSetup({
      difficulty,
      windStrength,
      missionId: selectedMission?.id ?? null,
      mode: racePrefs.mode,
      dailyDay,
      phase: 'briefing',
    }, { replaceUnsupported: true });
    setResumeOffer(null);
  }, [difficulty, windStrength, selectedMission, initRace, racePrefs.mode, dailyDay]);

  const openBriefing = useCallback(() => {
    prepareRace();
    setGameState('briefing');
    recordDiagnostic({ type: "race.lifecycle", surface: "race", outcome: "accepted", action: "briefing", mode: racePrefs.mode });
  }, [prepareRace, racePrefs.mode]);

  const beginCountdown = useCallback(() => {
    if (!physicalRef.current) saveRaceSetup({
      difficulty,
      windStrength,
      missionId: selectedMission?.id ?? null,
      mode: racePrefs.mode,
      dailyDay,
      raceContext: setupContextRef.current,
      phase: 'countdown',
    });
    setLockedMode(racePrefs.mode);
    raceSetupRef.current = { ...raceSetupRef.current,
      race: physicalRef.current ? "trial" : selectedMission ? "mission" : dailyDay !== null ? "daily" : "free" };
    // M4-4: in the iOS app too; its race bridge injects the native ghost row
    // into this page's localStorage before it loads (race-web-storage.ts).
    const ghost = physicalRef.current ? null : readGhostStore(localStore())[ghostClassKey({
      raceContext: LEGACY_RACE_CONTEXT, mode: racePrefs.mode, difficulty, windStrength, missionId: selectedMission?.id ?? null })] ?? null;
    ghostTrackRef.current = ghost;
    ghostBoatsRef.current = ghost ? [{ id: "ghost", name: "", color: "#9aa7b4", ...ghostPose(ghost, 0) }] : [];
    setGhostTime(ghost?.finishTimeSec ?? null);
    setCountdown(SOLO_COUNTDOWN_FROM);
    setGameState('countdown');
    recordDiagnostic({ type: "race.lifecycle", surface: "race", outcome: "accepted", action: "countdown", mode: racePrefs.mode });
    // M0-12 first-race funnel; the metric trial is not a counted race.
    if (!physicalRef.current) trackRaceCountdown(raceIdRef.current, { mode: racePrefs.mode, difficulty, wind: windStrength,
      missionId: selectedMission?.id ?? null, daily: dailyDay !== null });
  }, [difficulty, windStrength, selectedMission, racePrefs.mode, dailyDay]);

  // M1-1: one entry for every start request. The lobby's start opens the
  // briefing only the first time on this course; "i" always opens it;
  // "Again" and "Restart" keep the same setup and go straight to the countdown.
  const startRace = useCallback((trigger: RaceEntryTrigger) => {
    const step = raceEntryStep(trigger, hasSeenBriefing(briefingCourseId(physicalRef.current)));
    const source: RaceSetupSource = trigger === "start" ? handedSetupRef.current ? "hub" : "lobby" : trigger;
    if (trigger === "again" || trigger === "restart") recordDiagnostic({ type: "race.lifecycle", surface: "race", outcome: "accepted", action: "restart",
      setupSource: source, phase: gameStateRef.current, mode: racePrefsRef.current.mode });
    // F5: before the first race on this device the intro comes first, over the
    // lobby, with the race already set up; endIntro takes the next step.
    // The trial is read from the link too: its engine may still be loading.
    const trial = physicalRef.current !== null || readPhysicalTrial(readRaceSearch().toString()) !== null;
    if (raceIntroDue({ trigger, trial, seen: hasSeenRaceIntro() })) {
      raceSetupRef.current = { ...raceSetupRef.current, source, briefingShown: false };
      prepareRace();
      setIntro("first");
      return;
    }
    raceSetupRef.current = { ...raceSetupRef.current, source, briefingShown: step === "briefing" };
    if (step === "briefing") { openBriefing(); return; }
    prepareRace();
    beginCountdown();
  }, [openBriefing, prepareRace, beginCountdown]);
  const startFromBriefing = useCallback(() => {
    markBriefingSeen(briefingCourseId(physicalRef.current));
    beginCountdown();
  }, [beginCountdown]);
  // F5: the intro ends. Before the first race, Start race goes to the countdown
  // (its cards cover the classic course briefing, which then counts as seen)
  // and Skip to the lobby start's own step; both record the intro as seen.
  // Opened on request it only closes (Got it on the last card records it as
  // seen): a race it paused stays paused, and the app's Race hub that opened
  // it gets the screen back.
  const endIntro = useCallback((end: RaceIntroEnd) => {
    const opened = introRef.current;
    setIntro("closed");
    if (raceIntroEndRecordsSeen(opened, end)) markRaceIntroSeen();
    if (opened === "hub") navigateNativeRace("/race");
    if (opened !== "first") return;
    const course = briefingCourseId(physicalRef.current);
    if (stepAfterRaceIntro(end === "start" ? "start" : "skip", hasSeenBriefing(course)) === "briefing") {
      raceSetupRef.current = { ...raceSetupRef.current, briefingShown: true };
      setGameState('briefing');
      recordDiagnostic({ type: "race.lifecycle", surface: "race", outcome: "accepted", action: "briefing", mode: racePrefsRef.current.mode });
      return;
    }
    if (end === "start") markBriefingSeen(course);
    beginCountdown();
  }, [beginCountdown]);
  useEffect(() => {
    if (!hubHandoff || gameState !== "menu") return;
    setHubHandoff(false);
    startRace("start");
  }, [hubHandoff, gameState, startRace]);

  // Countdown
  useEffect(() => {
    if (gameState !== 'countdown' || paused || !sceneReady) return;
    if (countdown === 0) {
      if (!physicalRef.current) postNativeRaceStarted({ id: raceIdRef.current, mode: racePrefsRef.current.mode, difficulty, windStrength, missionId: selectedMission?.id ?? null });
      logEventsRef.current.push({ type: "start", t: 0 });
      const player = boatsRef.current.find(b => b.isPlayer);
      if (player) logSamplesRef.current.push(recordSample(player, 0, windDirRef.current));
      // Mark the saved setup as "racing" so a reload knows the user
      // was actively in a race, not just on the briefing page.
      if (!physicalRef.current) saveRaceSetup({
        difficulty,
        windStrength,
        missionId: selectedMission?.id ?? null,
        mode: racePrefsRef.current.mode,
        dailyDay,
        raceContext: setupContextRef.current,
        phase: 'racing',
      });
      setGameState('racing');
      recordDiagnostic({ type: "race.lifecycle", surface: "race", outcome: "accepted", action: "start", mode: racePrefsRef.current.mode });
      return;
    }
    const id = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [gameState, countdown, difficulty, windStrength, selectedMission, paused, sceneReady, dailyDay]);
  // M3-3 start signals over this countdown (its length is unchanged): the horn
  // on the first second, a short signal on each later one, the gun at zero.
  // The count waits for the first frame like the number does; a pause holds it.
  useStartSignals(gameState === "countdown" && sceneReady && !paused ? countdown : gameState === "racing" ? 0 : null, sceneRaceId);

  // -----------------------------------------------------------------------
  // Keyboard input
  // -----------------------------------------------------------------------
  // The Menu button, Continue, Esc and P all toggle the same pause; the pause
  // sheet is open exactly while the race is paused (M1-2).
  // The cockpit passes its click event; only the keyboard handler says "keyboard".
  const togglePause = useCallback((how?: unknown) => { pausedRef.current = !pausedRef.current; setPaused(pausedRef.current); keysRef.current.clear(); recordDiagnostic({ type: "race.lifecycle", surface: "race", outcome: "accepted", action: pausedRef.current ? "pause" : "resume", source: how === "keyboard" ? "keyboard" : "pointer", phase: gameStateRef.current }); }, []);
  // F5 "How to race" from the race settings: the race pauses under the intro
  // (the clock never runs while the player reads) and stays paused after it.
  const showIntroInRace = useCallback(() => {
    if (!pausedRef.current) togglePause();
    setIntro("race");
  }, [togglePause]);
  // The intro of the race settings belongs to that race: gone with it.
  useEffect(() => {
    if (intro === "race" && gameState !== "countdown" && gameState !== "racing") setIntro("closed");
  }, [intro, gameState]);
  useEffect(() => {
    if (gameState !== "racing" && gameState !== "countdown") return;
    const onDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      // F5: no key reaches the race under the open intro (it catches them first; this is the second guard).
      if (introRef.current !== "closed") return;
      // M1-2: Esc and P pause and resume on a desktop keyboard, also from a slider.
      if (isRacePauseKey(e, Boolean(target?.closest?.(TEXT_ENTRY_SELECTOR)))) {
        e.preventDefault();
        togglePause("keyboard");
        return;
      }
      if (target?.closest("input,textarea,select,[contenteditable=true],[role=slider]") || e.metaKey || e.ctrlKey || e.altKey) return;
      // M1-4: during the finish hold the boat is no longer raced.
      if (finishHoldActive(raceIdRef.current)) return;
      const key = e.key.toLowerCase();
      const sheet = key === "q" || key === "a" ? "mainSheet" : key === "w" || key === "s" ? "jibSheet" : null;
      if (sheet && racePrefsRef.current.mode === "pro") {
        e.preventDefault();
        setTrim({ [sheet]: trimRef.current[sheet] + (key === "q" || key === "w" ? .05 : -.05) });
        return;
      }
      const previousTurn = Number(keysRef.current.has("arrowright")) - Number(keysRef.current.has("arrowleft"));
      const repeated = keysRef.current.has(key);
      keysRef.current.add(key);
      if (!repeated && (key === "arrowleft" || key === "arrowright")) recordControlChange("race", "rudder", Number(keysRef.current.has("arrowright")) - Number(keysRef.current.has("arrowleft")), previousTurn);
      if (["arrowleft", "arrowright", "arrowup", "arrowdown", " "].includes(key)) e.preventDefault();
    };
    const onUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase(), previous = Number(keysRef.current.has("arrowright")) - Number(keysRef.current.has("arrowleft"));
      if (keysRef.current.delete(key) && (key === "arrowleft" || key === "arrowright")) recordControlChange("race", "rudder", Number(keysRef.current.has("arrowright")) - Number(keysRef.current.has("arrowleft")) || rudderRef.current, previous);
    };
    const clear = () => keysRef.current.clear();
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    window.addEventListener("blur", clear);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
      window.removeEventListener("blur", clear);
      clear();
    };
  }, [gameState, setTrim, togglePause]);

  // -----------------------------------------------------------------------
  // Game loop (useRaceLoop) - also runs during countdown so boats can sail
  // freely before the race starts. Then the clock resynchronisation effect.
  // -----------------------------------------------------------------------
  // The soundscape plays only while the boat is raced: silent on pause, at the
  // end of the finish hold (results), in the replay, when muted and on unmount.
  useRaceSoundscapeLifecycle(soundscape, gameState, paused, raceSoundOn);
  useRaceLoop({ gameState, difficulty, windStrength, selectedMission, dailyDay, lang, tp, paused, sceneReady, showEvent, showNotice, showContact, requestNativeBest, soundscape, onStartRecall, showHint,
    refs: { boatsRef, courseRef, physicalRef, physicalNavRef, fleetRef, keysRef, rudderRef, autopilotOnRef, autopilotHeadingRef,
      racePrefsRef, trimRef, windDirRef, windGustRef, windStrengthRef, raceClockRef, hudRefreshRef, ruleStateRef, ruleEventsRef,
      startedAtRef, copyRef, ghostTrackRef, ghostBoatsRef, markTimesRef, logSamplesRef, logEventsRef, lastSampleTimeRef,
      wasInNoGoRef, lastTackSignRef, speedLogRef, turnRef, standingsKeyRef, shownRankRef, pendingRankRef, raceIdRef,
      pendingNativeSaves, pendingNativeBests, guidanceStateRef, rafRef, simulationClockRef, startupGate, pausedRef, langRef, raceSetupRef, raceTallyRef, raceHintsRef, firstHintsRef },
    set: { setAutopilotOn, setPenalty, setStandings, setResults, setJudgeDebrief, setGameState, setBestRecord,
      setIsNewRecord, setMissionResult, setCoaching, setCoachingSource, setCoachingLoading, setCoachingError, setNativeSave,
      setNativeBestSave, setPlayerTWA, setPlayerSpeed, setWindReading, setNavigation, setRouteGuidance, setElapsed, setGhostSplits, setMedalAward } });

  // -----------------------------------------------------------------------
  // Reset
  // -----------------------------------------------------------------------
  const backToMenu = useCallback(() => {
    recordDiagnostic({ type: "race.lifecycle", surface: "race", outcome: "accepted", action: "exit", phase: gameStateRef.current });
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    // A setup handed over by the app's Race hub returns there, not to a second menu.
    if (handedSetupRef.current && navigateNativeRace("/race")) return;
    setLockedMode(null);
    setGameState('menu');
  }, []);

  const hudPlayer = boatsRef.current.find((b) => b.isPlayer);
  const setRudder = useCallback((value: number) => {
    const next = Math.max(-1, Math.min(1, value));
    const previous = rudderRef.current;
    rudderRef.current = next; setRudderState(next);
    autopilotOnRef.current = false; setAutopilotOn(false);
    recordControlChange("race", "rudder", next, previous);
  }, []);
  const setCourse = useCallback((degrees: number) => {
    const next = ((degrees % 360) + 360) % 360;
    const previous = autopilotOnRef.current ? autopilotHeadingRef.current : undefined;
    autopilotHeadingRef.current = next;
    setTargetHeading(next);
    rudderRef.current = 0; setRudderState(0);
    autopilotOnRef.current = true; setAutopilotOn(true);
    recordControlChange("race", "course", next, previous);
  }, []);
  const courseDelta = useCallback((degrees: number) => {
    const player = boatsRef.current.find(b => b.isPlayer);
    if (player) setCourse((autopilotOnRef.current ? autopilotHeadingRef.current : player.heading) + degrees);
  }, [setCourse]);
  // The results screen is on (after the finish hold, or back from the replay).
  useEffect(() => {
    if (gameState === "finished") recordDiagnostic({ type: "race.lifecycle", surface: "race", outcome: "accepted", action: "results", mode: racePrefsRef.current.mode });
  }, [gameState]);
  // The pause sheet's Exit asked "Leave the race?" or the player chose Stay.
  const exitPrompt = useCallback((step: "ask" | "stay") => {
    recordDiagnostic({ type: "race.lifecycle", surface: "race", outcome: step === "ask" ? "accepted" : "noop", action: step === "ask" ? "exit-ask" : "exit-stay", phase: gameStateRef.current });
  }, []);
  useEffect(() => {
    const hide = () => { if (document.hidden && !pausedRef.current && (gameState === "racing" || gameState === "countdown")) { pausedRef.current = true; setPaused(true); keysRef.current.clear(); recordDiagnostic({ type: "race.lifecycle", surface: "race", outcome: "accepted", action: "pause", reason: "hidden", source: "system" }); } };
    document.addEventListener("visibilitychange", hide);
    return () => document.removeEventListener("visibilitychange", hide);
  }, [gameState]);
  useEffect(() => {
    if (nativeReplayHydrated.current) return;
    const race = readNativeRaceReplay();
    if (!race) return;
    nativeReplayHydrated.current = true;
    courseRef.current = race.course; logSamplesRef.current = race.samples; logEventsRef.current = race.events;
    setDifficulty(race.difficulty); setWindStrength(race.windStrength); setCoaching(race.coaching ?? null);
    setElapsed(race.finishTimeSec); setGameState("replay"); trackRaceReplay("saved");
  }, []);
  const retryNativeSave = useCallback(() => {
    for (const race of pendingNativeSaves.current.values()) {
      const sent = postNativeRace(race);
      recordDiagnostic({ type: "race.save", surface: "race", outcome: sent ? "accepted" : "failed", action: "retry", target: "local", ...(sent ? {} : { reason: "storage-unavailable" }) });
      if (race.id === raceIdRef.current) setNativeSave(sent ? "saving" : "error");
    }
  }, []);
  useEffect(() => {
    const saved = (event: Event) => {
      const id = (event as CustomEvent<{ id?: unknown }>).detail?.id;
      if (typeof id !== "string" || !pendingNativeSaves.current.acknowledge(id)) return;
      recordDiagnostic({ type: "race.save", surface: "race", outcome: "accepted", action: "ack", target: "local" });
      if (id === raceIdRef.current) setNativeSave("saved");
    };
    const error = (event: Event) => {
      const id = (event as CustomEvent<{ id?: unknown }>).detail?.id;
      if ((typeof id === "string" && pendingNativeSaves.current.get(id)) || (id === undefined && pendingNativeSaves.current.get(raceIdRef.current))) recordDiagnostic({ type: "race.save", surface: "race", outcome: "failed", action: "error", target: "local", reason: "storage-write" });
      if ((id === undefined || id === raceIdRef.current) && pendingNativeSaves.current.get(raceIdRef.current)) setNativeSave("error");
    };
    window.addEventListener("regatta:race-history-saved", saved); window.addEventListener("regatta:race-history-error", error);
    return () => { window.removeEventListener("regatta:race-history-saved", saved); window.removeEventListener("regatta:race-history-error", error); };
  }, []);
  useEffect(() => {
    if (!nativeRace) return;
    const timer = window.setInterval(retryNativeSave, 5000);
    return () => window.clearInterval(timer);
  }, [nativeRace, retryNativeSave]);
  const updateRacePrefs = useCallback((patch: Partial<typeof racePrefs>) => {
    if (patch.mode === "pro" && racePrefsRef.current.mode !== "pro") {
      const player = boatsRef.current.find(b => b.isPlayer);
      if (player?.trim) applyTrim(player.trim, false);
    }
    writeRacePrefs(patch);
    for (const [key, preference] of [["guidance", "guidance"], ["trimHints", "trim-hints"], ["rules", "rules"], ["penalties", "penalties"]] as const) if (patch[key] !== undefined) recordPreferenceChange("race", preference, patch[key]!, racePrefsRef.current[key]);
  }, [writeRacePrefs, applyTrim]);
  const trimCoach = hudPlayer && playingPrefs.mode === "pro" && playingPrefs.trimHints ? raceTrimCoach(hudPlayer) : null;
  // F6: the same advice colours the "Wind on the sails" ribbons; none without it (Simple, trim hints off).
  const sailFlowCoachRef = useRef<CoachKey | null>(null);
  useEffect(() => { sailFlowCoachRef.current = trimCoach; }, [trimCoach]);
  useEffect(() => {
    if (gameState === "briefing") setBestRecord(getBestRecord(difficulty, windStrength, racePrefs.mode));
  }, [gameState, difficulty, windStrength, racePrefs.mode]);
  const guidance = racePrefs.guidance ? routeGuidance : null;
  // F4 hint log: the route coach line when it asks for a manoeuvre, and the
  // Pro trim hint when it changes to advice that asks for a change, while the
  // race runs (hint-log.ts loggedRouteAction, loggedTrimKey).
  const loggedRoute = loggedRouteAction(gameState === "racing", racePrefs.guidance, routeGuidance?.action);
  useEffect(() => { if (loggedRoute) addHint("route", copyRef.current.actions[loggedRoute], "info", raceClockRef.current); }, [loggedRoute, addHint]);
  const trimLabelsRef = useRef(trimLabels); trimLabelsRef.current = trimLabels;
  const loggedTrim = loggedTrimKey(gameState === "racing", playingPrefs, trimCoach);
  useEffect(() => { if (loggedTrim) addHint("trim", trimLabelsRef.current[loggedTrim], "info", raceClockRef.current); }, [loggedTrim, addHint]);
  // M1-3: speed against the polar target at this wind angle (the race's own
  // force model, solved once per wind strength). Not for the physical trial,
  // whose wind is its own.
  const racePolar = useMemo(() => (gameState === "racing" || gameState === "countdown") && !physicalTrial ? polarFor(12 * windStrengthMul) : null,
    [gameState, physicalTrial, windStrengthMul]);
  const raceTarget = racePolar ? targetSpeed(racePolar, playerTWA) : null;
  // M4-1 skill bars on the result screen, from this race's log against the
  // same polar target. None for the physical trial (no target, never ranked).
  const skillBars = useMemo(() => {
    if (gameState !== "finished" || physicalTrial) return null;
    const polar = polarFor(12 * windStrengthMul), course = courseRef.current;
    return raceSkillBars(measureRaceSkills({ samples: logSamplesRef.current, events: logEventsRef.current,
      course: { windwardMark: course.marks[0].pos, startLine: course.startLine }, targetKn: (twa) => targetSpeed(polar, twa),
      startedAt: startedAtRef.current ?? null }));
  }, [gameState, physicalTrial, results, windStrengthMul]);
  // M4-5: the medal course of the setup (class, level, wind); none for the physical trial.
  const medalCourse = useMemo(() => physicalTrial ? null : { raceContext: LEGACY_RACE_CONTEXT, difficulty, windStrength },
    [physicalTrial, difficulty, windStrength]);

  // M1-2 game layer (owner decision C1): countdown, race and replay hide the
  // site header and take the whole viewport. Menu, briefing and results stay
  // pages below the header. The native app has no site header either way.
  const gameLayer = raceUsesGameLayer(gameState);
  useEffect(() => {
    if (!gameLayer) return;
    return claimGameLayer();
  }, [gameLayer]);
  // Setup phases own one internal scroll area below the site header. Reset on
  // phase entry, never on a physics/HUD update.
  const viewportStyle = { height: embed || gameLayer ? '100dvh' : 'calc(100dvh - var(--site-nav-h, 56px))' };
  useEffect(() => {
    const root = setupRootRef.current;
    if (!root) return;
    root.scrollTop = 0;
    const content = root.querySelector<HTMLElement>('[data-race-scroll]');
    if (content) content.scrollTop = 0;
    window.scrollTo(0, 0);
    root.querySelector<HTMLElement>('h1')?.focus({ preventScroll: true });
  }, [gameState]);

  // =====================================================================
  // MENU SCREEN
  // =====================================================================
  if (gameState === 'menu' && hubHandoff) {
    // One frame while the handed-over setup starts: no second menu flashes up.
    return <div ref={setupRootRef} data-race-phase="menu" aria-busy="true" style={viewportStyle} />;
  }
  if (gameState === 'menu') {
    return (
      <div ref={setupRootRef} data-race-phase="menu" className="overflow-y-auto" style={viewportStyle}>
        {nativeRace && <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-4">
          <Link href="/" className="inline-flex items-center min-h-11 py-2 text-sm text-[var(--accent-cyan)]">
            {readRaceSearch().has("fromLesson") ? tl({ ru: "Вернуться к уроку", en: "Back to lesson", pl: "Wróć do lekcji", es: "Volver a la lección", fr: "Retour à la leçon", de: "Zurück zur Lektion", it: "Torna alla lezione" }) : tl({ ru: "Вернуться к гонкам", en: "Back to races", pl: "Wróć do regat", es: "Volver a regatas", fr: "Retour aux courses", de: "Zurück zu den Rennen", it: "Torna alle regate" })}
          </Link>
        </div>}
        {/* Resume banner: shown when we detect a saved setup from a
            recent (≤30 min) interrupted race. Clicking "Resume" loads
            those settings + opens the briefing; "Dismiss" clears the
            saved record. The banner is intentionally a soft offer, not
            a blocking modal - users mid-tab-tetris can ignore it. */}
        {resumeOffer && (
          <ResumeOffer
            saved={resumeOffer}
            tp={tp}
            onResume={() => {
              const mode = resumeOffer.mode ?? racePrefsRef.current.mode;
              writeRacePrefs({ mode });
              windStrengthRef.current = raceSetupWindMultiplier(resumeOffer.windStrength);
              setDifficulty(resumeOffer.difficulty);
              setWindStrength(resumeOffer.windStrength);
              setDailyDay(resumeOffer.dailyDay ?? null);
              setupContextRef.current = resumeOffer.raceContext;
              if (resumeOffer.missionId) {
                const m = missions.find((x) => x.id === resumeOffer.missionId);
                setSelectedMission(m ?? null);
              } else {
                setSelectedMission(null);
              }
              setResumeOffer(null);
              raceSetupRef.current = { ...raceSetupRef.current, source: "resume", briefingShown: true };
              initRace(resumeOffer.difficulty);
              setBestRecord(getBestRecord(resumeOffer.difficulty, resumeOffer.windStrength, mode));
              setIsNewRecord(false);
              saveRaceSetup({ difficulty: resumeOffer.difficulty, windStrength: resumeOffer.windStrength, missionId: resumeOffer.missionId,
                mode, dailyDay: resumeOffer.dailyDay, raceContext: resumeOffer.raceContext, phase: "briefing" });
              setGameState("briefing");
              recordDiagnostic({ type: "race.lifecycle", surface: "race", outcome: "accepted", action: "briefing", mode });
            }}
            onDismiss={() => {
              clearRaceSetup();
              setResumeOffer(null);
            }}
          />
        )}
        <GameMenu
          difficulty={difficulty}
          setDifficulty={setDifficulty}
          windStrength={windStrength}
          setWindStrength={setWindStrength}
          selectedMission={selectedMission}
          pickMission={pickMission}
          onStart={() => startRace("start")}
          onShowBriefing={() => startRace("info")}
          dailyDay={dailyDay}
          racePrefs={racePrefs} updateRacePrefs={updateRacePrefs}
          native={nativeRace} medalCourse={medalCourse}
          onShowIntro={() => setIntro("lobby")}
        />
        {(intro === "first" || intro === "lobby" || intro === "hub") && <RaceIntro open={intro} pro={racePrefs.mode === "pro"} onEnd={endIntro} />}
      </div>
    );
  }

  // =====================================================================
  // BRIEFING SCREEN - explains the race before countdown
  // =====================================================================
  const chooseTrialCourse = (profile: PhysicalRaceProfile) => {
    if (profile === physicalRef.current) return;
    physicalRef.current = profile;
    courseRef.current = makeCourse(profile);
    setPhysicalTrial(profile);
    const url = new URL(window.location.href);
    url.searchParams.set("race", profile);
    window.history.replaceState(window.history.state, "", url);
    initRace(difficulty);
  };

  if (gameState === 'briefing') {
    return (
      <div ref={setupRootRef} data-race-phase="briefing" className="page-enter flex flex-col" style={viewportStyle}>
        <RaceBriefing onBack={backToMenu} bestRecord={bestRecord} difficulty={difficulty} windStrength={windStrength}
          mode={racePrefs.mode} trialProfile={physicalTrial} onChooseTrialCourse={chooseTrialCourse}
          onStart={startFromBriefing} reopenNote={!handedOff} />
      </div>
    );
  }

  // =====================================================================
  // RACING / COUNTDOWN / FINISHED SCREENS (Canvas)
  // =====================================================================
  return (
    <div className="relative w-full" style={viewportStyle}>
      {(gameState === "countdown" || gameState === "racing") && (
        <RaceCockpit prefs={playingPrefs} updatePrefs={updateRacePrefs} rudder={rudder} setRudder={setRudder} courseDelta={courseDelta} setCourse={setCourse} targetHeading={targetHeading}
          trim={trim} setTrim={setTrim} heading={hudPlayer?.heading ?? 0} speed={playerSpeed} twa={playerTWA}
          windReading={windReading} navigation={navigation}
          time={formatTime(elapsed)} rank={standings.findIndex(r => r.isPlayer) + 1} rows={standings}
          trimAdvice={trimCoach ? trimLabels[trimCoach] : undefined} guidance={guidance}
          feedback={{ toasts: feedback.visible, contact: feedback.contact }} targetSpeed={raceTarget} hintLog={hintLog}
          camera={raceCamera} setCamera={camera => { setRaceCamera(camera); recordControlChange("race", "camera", camera, raceCamera); }} onResetCamera={() => { setCameraRevision(value => value + 1); recordControlChange("race", "camera", raceCamera); }} paused={paused} onPause={togglePause} onExit={backToMenu} onExitPrompt={exitPrompt}
          onRestart={() => startRace("restart")} onShowHintsAgain={showHintsAgain} onShowIntro={showIntroInRace} track={readTrack} raceId={sceneRaceId} fullscreenOffer={!embed}
          raceSoundToggle={placement => <RaceSoundToggle on={raceSoundOn} onChange={setRaceSoundOn} showLabel={placement === "pause"} />}
          haptics={raceHaptics.available ? { on: raceHaptics.on, setOn: raceHaptics.setOn } : undefined}
          autopilot={autopilotOn} onAutopilot={() => {
            autopilotHeadingRef.current = hudPlayer?.heading ?? 0;
            setTargetHeading(autopilotHeadingRef.current);
            rudderRef.current = 0; setRudderState(0);
            autopilotOnRef.current = !autopilotOnRef.current; setAutopilotOn(autopilotOnRef.current);
            recordControlChange("race", "course-assist", autopilotOnRef.current, !autopilotOnRef.current);
          }} muted={muted} onSound={() => setRaceSoundOn(!raceSoundOn)} penalty={penalty}
          // The count waits for the first frame (startup gate), so it only shows over a ready scene.
          countdown={gameState === "countdown" && sceneReady ? countdown : undefined} recall={gameState === "racing" && playingPrefs.rules && recall}>
          <RaceScene key={sceneRaceId} raceProfile={physicalTrial} racing={gameState === "racing" && !paused} started={gameState === "racing"} contactId={feedback.contact?.id} onReady={onSceneReady} boatsRef={boatsRef} courseRef={courseRef} windDirRef={windDirRef} venue={venue} camera={raceCamera} cameraRevision={cameraRevision} labels={race3dLabels}
            ghostRef={ghostBoatsRef} ghostLabel={ghostTime === null ? undefined : `${tl({ ru: "Твой лучший", en: "Your best", pl: "Twój najlepszy", es: "Tu mejor", fr: "Ton meilleur", de: "Deine Bestzeit", it: "Il tuo migliore" })} ${formatRecordTime(ghostTime)}`}
            showWind={playingPrefs.windDisplay === "arrows" || playingPrefs.windDisplay === "both"}
            guidance={guidance} softLight={playingPrefs.softLight} sailFlow={playingPrefs.sailFlow === true} sailFlowCoachRef={sailFlowCoachRef} sailFlowOwnTrim={playingPrefs.mode === "pro"} onStats={sceneFlags.fps ? showSceneStats : undefined} />
          <RaceFinishHoldPlate raceId={sceneRaceId} />
          {sceneFlags.fps && <div ref={statsRef} className="absolute bottom-1 left-1 text-xs text-white" data-testid="scene-stats" />}
        </RaceCockpit>
      )}
      {(gameState === "countdown" || gameState === "racing") && intro === "race" && <RaceIntro open={intro} pro={playingPrefs.mode === "pro"} onEnd={endIntro} />}

      {/* Results occupy the full page after the racing cockpit unmounts. */}
      {gameState === 'finished' && (
        <RaceResults copy={copy} trialProfile={physicalTrial} judgeDebrief={judgeDebrief} boatsRef={boatsRef} playerLapDone={hudPlayer?.lapDone} skillBars={skillBars} ghostSplits={ghostSplits}
          medal={medalCourse && { award: medalAward, course: medalCourse, mode: lockedMode ?? racePrefs.mode, hintsUsed: raceHintsRef.current }}
          nativeRace={nativeRace} nativeSave={nativeSave} retryNativeSave={retryNativeSave} nativeBestSave={nativeBestSave}
          sceneRaceId={sceneRaceId} requestNativeBest={requestNativeBest} results={results} isNewRecord={isNewRecord}
          bestRecord={bestRecord} missionResult={missionResult} coachingSource={coachingSource} coaching={coaching}
          coachingLoading={coachingLoading} coachingError={coachingError} saveState={saveState} setSaveState={setSaveState}
          saveError={saveError} saveResult={saveResult} nicknameInput={nicknameInput} setNicknameInput={setNicknameInput}
          replayCode={replayCode} nickname={nickname} difficulty={difficulty} windStrength={windStrength}
          selectedMission={selectedMission} replayDisabled={logSamplesRef.current.length < 5}
          onMenu={backToMenu} onReplay={() => openReplay(null)} onWatch={logSamplesRef.current.length < 5 ? undefined : openReplay} onAgain={() => startRace("again")}
          // M4-2: a physical trial is never a return target: its links would lead
          // to an ordinary, recorded race (PHYSICAL_RACE_EMISSION_ENABLED).
          practiceReturn={physicalTrial ? null : raceReturnFor({ difficulty, windStrength, missionId: selectedMission?.id, dailyDay, fromLesson: readRaceSearch().get("fromLesson") })} />
      )}

      {gameState === "replay" && <RaceReplay samples={logSamplesRef.current} course={courseRef.current}
        autoplay={replayOpen.autoplay} startAt={replayOpen.at} events={logEventsRef.current} judgeItems={judgeDebrief?.items} onClose={() => {
        if (!nativeReplayHydrated.current) setGameState("finished");
        else if (!navigateNativeRace("/history")) backToMenu();
      }} />}
    </div>
  );
}

// ============================================================================
// Resume offer banner shown above the menu when a recent interrupted race
// was found in localStorage. Reuses tp() for i18n; takes the saved setup
// + a callback for the user's choice (resume / dismiss).
// ============================================================================

function ResumeOffer({
  saved,
  tp,
  onResume,
  onDismiss,
}: {
  saved: { difficulty: 'easy' | 'medium' | 'hard'; windStrength: 'light' | 'medium' | 'heavy'; phase: string; ts: number };
  tp: (ru: string, en: string, pl: string, extras?: { es?: string; fr?: string; de?: string; it?: string }) => string;
  onResume: () => void;
  onDismiss: () => void;
}) {
  // Read the clock once, at mount: "saved 3 min ago" is fixed for this offer.
  const [now] = useState(() => Date.now());
  const minutesAgo = Math.max(1, Math.round((now - saved.ts) / 60000));
  const diff = DIFFICULTY_CONFIG[saved.difficulty];
  const level = tp(diff.label, diff.labelEn, diff.labelPl, { es: diff.labelEs, fr: diff.labelFr, de: diff.labelDe, it: diff.labelIt });
  const wind = saved.windStrength === 'light'
    ? tp('слабый ветер', 'light wind', 'słaby wiatr', { es: 'viento flojo', fr: 'vent faible', de: 'schwacher Wind', it: 'vento leggero' })
    : saved.windStrength === 'heavy'
      ? tp('сильный ветер', 'strong wind', 'silny wiatr', { es: 'viento fuerte', fr: 'vent fort', de: 'starker Wind', it: 'vento forte' })
      : tp('средний ветер', 'medium wind', 'średni wiatr', { es: 'viento medio', fr: 'vent moyen', de: 'mittlerer Wind', it: 'vento medio' });
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 mt-4">
      <div
        className="rounded-xl p-4 sm:p-5 flex flex-wrap items-center gap-3"
        style={{
          background: 'rgba(255, 170, 0, 0.08)',
          border: '1px solid rgba(255, 170, 0, 0.35)',
        }}
      >
        <span className="text-xl">⏸️</span>
        <div className="flex-1 min-w-[200px]">
          <div className="text-sm font-semibold mb-0.5" style={{ color: 'var(--warning)' }}>
            {tp(
              'Повторить гонку с прежними настройками?',
              'Restart the race with your previous settings?',
              'Powtórzyć wyścig z poprzednimi ustawieniami?',
              {
                es: '¿Reiniciar con los ajustes anteriores?',
                fr: 'Recommencer avec les réglages précédents ?',
                de: 'Rennen mit den bisherigen Einstellungen neu starten?',
                it: 'Ricominciare con le impostazioni precedenti?',
              },
            )}
          </div>
          <div className="text-xs text-[var(--text-muted)]">
            {tp(
              `${level} · ${wind} · ${minutesAgo} мин назад`,
              `${level} · ${wind} · ${minutesAgo} min ago`,
              `${level} · ${wind} · ${minutesAgo} min temu`,
              {
                es: `${level} · ${wind} · hace ${minutesAgo} min`,
                fr: `${level} · ${wind} · il y a ${minutesAgo} min`,
                de: `${level} · ${wind} · vor ${minutesAgo} Min.`,
                it: `${level} · ${wind} · ${minutesAgo} min fa`,
              },
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onResume}
            className="min-h-11 text-xs px-4 py-1.5 rounded-md font-semibold transition"
            style={{
              background: 'var(--accent-cyan)',
              color: 'var(--accent-ink)',
            }}
          >
            {tp('Продолжить', 'Resume', 'Wznów',
              { es: 'Continuar', fr: 'Reprendre', de: 'Fortsetzen', it: 'Riprendere' })}
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="min-h-11 text-xs px-4 py-1.5 rounded-md transition border"
            style={{
              borderColor: 'rgba(139, 167, 184, 0.3)',
              color: 'var(--text-secondary)',
            }}
          >
            {tp('Закрыть', 'Dismiss', 'Zamknij',
              { es: 'Descartar', fr: 'Ignorer', de: 'Verwerfen', it: 'Ignora' })}
          </button>
        </div>
      </div>
    </div>
  );
}
