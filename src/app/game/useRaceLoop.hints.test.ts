import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRaceRulesState } from "@/lib/race-rules";
import { createRaceStartupGate } from "@/lib/race-startup";
import { createPendingRaceSaves } from "@/lib/race-completion";
import { createPendingNativeBestCommands } from "@/lib/race-best-command";
import { legacyRaceSpawns } from "@/lib/race-spawn";
import { raceTrim } from "@/lib/race-physics";
import type { RaceSoundscape } from "@/lib/race-soundscape-audio";
import type { Controls } from "@/lib/sailing-physics/types";
import { HINT_TIMING } from "@/features/race-hud/first-race-hints";
import type { FirstRaceHintsRecord } from "@/features/race-hud/useFirstRaceHints";
import { finishHoldStore } from "./race-finish-hold";
import { makeCourse, type Boat } from "./race-model";
import type { RaceLoopInput } from "./useRaceLoop";

// Contract (M4-7): in the actual solo race loop a player stalled head to wind
// for HINT_TIMING.noGoSec gets the no-go hint once, not again in the same race, not when the device
// has seen it, not in the physical trial; "Show hints again" (a new revision)
// makes it due again in the running race.
const effects = vi.hoisted(() => ({ cleanups: [] as (void | (() => void))[] }));
vi.mock("react", async original => ({ ...await original<typeof import("react")>(), useEffect: (fn: () => void | (() => void)) => { effects.cleanups.push(fn()); } }));
vi.mock("@/lib/diagnostics-web", () => ({ recordWebDiagnostic: vi.fn() }));
vi.mock("@/lib/sounds", () => ({ playTack: vi.fn(), playMarkRound: vi.fn(), playFinish: vi.fn(), playNoGo: vi.fn(), readRaceSound: () => true }));
vi.mock("@/lib/race-haptics", () => ({ raceHaptic: vi.fn() }));
vi.mock("@/lib/funnel", () => ({ trackRaceEnd: vi.fn(), trackRaceMark: vi.fn(), trackRaceTack: vi.fn() }));
vi.mock("@/lib/race-resume", () => ({ clearRaceSetup: vi.fn() }));
import { useRaceLoop } from "./useRaceLoop";

let frame: ((now: number) => void) | null = null;
beforeEach(() => {
  effects.cleanups = []; frame = null;
  vi.stubGlobal("document", { hidden: false, addEventListener: () => {}, removeEventListener: () => {} });
  vi.stubGlobal("performance", { now: () => 0 });
  vi.stubGlobal("requestAnimationFrame", (callback: (now: number) => void) => { frame = callback; return 1; });
  vi.stubGlobal("cancelAnimationFrame", () => {});
});
afterEach(() => { for (const cleanup of effects.cleanups) cleanup?.(); vi.unstubAllGlobals(); finishHoldStore.set(null); });

const ref = <T,>(current: T) => ({ current });
interface Opts { hints?: FirstRaceHintsRecord; physical?: boolean; heading?: number; mode?: "simple" | "pro"; trim?: Partial<Controls>; paused?: boolean; overlap?: boolean; frames?: number; frameMs?: number;
  place?: (player: Boat, course: ReturnType<typeof makeCourse>) => void; rudder?: number; keys?: string[]; onFrame?: (i: number, refs: RaceLoopInput["refs"]) => void }
function sail({ hints = { seen: new Set(), revision: 0 }, physical = false, heading = 85, mode = "simple", trim = {}, paused = false, overlap = false, frames = 30, frameMs = 100, place, rudder = 0, keys = [], onFrame }: Opts = {}) {
  const course = makeCourse(), spawns = legacyRaceSpawns(course, 2);
  const boats: Boat[] = spawns.map((spawn, i) => ({ id: i ? `ai${i - 1}` : "player", name: i ? `AI ${i}` : "You", color: "#888888",
    pos: { ...spawn.pos }, heading: i ? spawn.heading : heading, speed: i ? 0 : 5, isPlayer: i === 0, lapDone: 0, speedMul: 1, started: true }));
  if (overlap) boats[1].pos = { x: boats[0].pos.x + 1, y: boats[0].pos.y };
  place?.(boats[0], course);
  const gate = createRaceStartupGate(); gate.reset("race-1"); gate.rendered("race-1");
  const set = new Proxy({}, { get: (target: Record<string, unknown>, key: string) => (target[key] ??= vi.fn()) }) as unknown as RaceLoopInput["set"];
  const refs = {
    boatsRef: ref(boats), courseRef: ref(course), physicalRef: ref(physical ? "short" : null), physicalNavRef: ref(undefined), fleetRef: ref(null), keysRef: ref(new Set<string>(keys)),
    rudderRef: ref(rudder), autopilotOnRef: ref(false), autopilotHeadingRef: ref(0),
    racePrefsRef: ref({ mode, guidance: false, trimHints: false, rules: false, penalties: false, windDisplay: "compass", miniMap: false }),
    trimRef: ref(raceTrim({ mainHoisted: true, ...trim })), windDirRef: ref(355), windGustRef: ref(1), windStrengthRef: ref(1), raceClockRef: ref(10), hudRefreshRef: ref(0),
    ruleStateRef: ref(createRaceRulesState()), ruleEventsRef: ref([]), startedAtRef: ref(0), copyRef: ref({ ruleMessage: () => "" }),
    ghostTrackRef: ref(null), ghostBoatsRef: ref([]), markTimesRef: ref(new Map()), logSamplesRef: ref([]),
    logEventsRef: ref([]), lastSampleTimeRef: ref(0), wasInNoGoRef: ref(false),
    lastTackSignRef: ref(0), speedLogRef: ref([]), turnRef: ref(null), standingsKeyRef: ref(""), shownRankRef: ref(0), pendingRankRef: ref(null),
    raceIdRef: ref("race-1"), pendingNativeSaves: ref(createPendingRaceSaves()), pendingNativeBests: ref(createPendingNativeBestCommands()),
    guidanceStateRef: ref(null), rafRef: ref(null), simulationClockRef: ref(null), startupGate: ref(gate), pausedRef: ref(paused), langRef: ref("en"),
    raceSetupRef: ref({ source: "hub", briefingShown: true, race: "free" }), raceTallyRef: ref({ missedMarkNotices: 0, contacts: 0 }),
    firstHintsRef: ref(hints),
  } as unknown as RaceLoopInput["refs"];
  const soundscape = { update: vi.fn(), winch: vi.fn(), thud: vi.fn(), setLive: vi.fn(), silence: vi.fn(), dispose: vi.fn() } satisfies RaceSoundscape;
  const showContact = vi.fn(), showHint = vi.fn();
  useRaceLoop({ showHint, gameState: "racing", difficulty: "easy", windStrength: "medium", selectedMission: null, lang: "en", tp: (_ru, en) => en, paused, sceneReady: true,
    showEvent: vi.fn(), showNotice: vi.fn(), showContact, requestNativeBest: vi.fn(), soundscape, refs, set });
  for (let i = 1, now = frameMs; frame && i <= frames; i++, now += frameMs) { onFrame?.(i, refs); const step = frame; frame = null; step(now); }
  return { showHint, refs, player: boats[0] };
}


// Head to wind and stopped: the no-go zone (the solo race wind swings a few degrees round north).
const stalled = (player: Boat) => { player.heading = 0; player.speed = 0; player.pos = { x: 400, y: 900 }; };
const hints = (showHint: ReturnType<typeof vi.fn>) => showHint.mock.calls.map(([hint]) => hint.id);

describe("first race hints in the solo race loop", () => {
  it("shows the no-go hint once in a race", () => {
    const { showHint } = sail({ place: stalled, frames: 300 });
    expect(hints(showHint)).toEqual(["no-go"]);
  });

  it("shows nothing the device has seen, and nothing in the physical trial", () => {
    expect(hints(sail({ place: stalled, frames: 100, hints: { seen: new Set(["no-go"]), revision: 0 } }).showHint)).not.toContain("no-go");
    effects.cleanups.forEach(cleanup => cleanup?.()); effects.cleanups = [];
    expect(sail({ place: stalled, frames: 100, physical: true }).showHint).not.toHaveBeenCalled();
  });

  it("shows it again in the running race after Show hints again", () => {
    // Due once the boat has been stalled noGoSec, at 10 frames a second.
    const dueFrames = Math.ceil(HINT_TIMING.noGoSec * 10) + 5, againAt = dueFrames + Math.ceil(HINT_TIMING.gapSec * 10);
    const { showHint } = sail({ place: stalled, frames: againAt + dueFrames + 10, onFrame: (i, refs) => {
      // The page recorded it as seen once on screen; then the player asks for the hints again.
      if (i === dueFrames) refs.firstHintsRef!.current.seen.add("no-go");
      if (i === againAt) refs.firstHintsRef!.current = { seen: new Set(), revision: 1 };
    } });
    expect(hints(showHint)).toEqual(["no-go", "no-go"]);
  });

  // F4: "First race hints" off in the race Settings: none is shown; on again, they come back.
  it("shows no first race hint while the player has them switched off, and again once on", () => {
    const off = (i: number, refs: RaceLoopInput["refs"]) => { if (i === 1) Object.assign(refs.racePrefsRef.current, { firstRaceHints: false }); };
    expect(sail({ place: stalled, frames: 300, onFrame: off }).showHint).not.toHaveBeenCalled();
    effects.cleanups.forEach(cleanup => cleanup?.()); effects.cleanups = [];
    const dueFrames = Math.ceil(HINT_TIMING.noGoSec * 10) + 5;
    const toggled = sail({ place: stalled, frames: 3 * dueFrames, onFrame: (i, refs) => {
      if (i === 1) Object.assign(refs.racePrefsRef.current, { firstRaceHints: false });
      if (i === 2 * dueFrames) Object.assign(refs.racePrefsRef.current, { firstRaceHints: true });
    } });
    expect(hints(toggled.showHint)).toEqual(["no-go"]);
  });
});
