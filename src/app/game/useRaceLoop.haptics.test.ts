import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRaceRulesState } from "@/lib/race-rules";
import { createRaceStartupGate } from "@/lib/race-startup";
import { createPendingRaceSaves } from "@/lib/race-completion";
import { createPendingNativeBestCommands } from "@/lib/race-best-command";
import { legacyRaceSpawns } from "@/lib/race-spawn";
import { MIN_BOAT_SEPARATION, raceTrim } from "@/lib/race-physics";
import type { RaceSoundscape } from "@/lib/race-soundscape-audio";
import type { Controls } from "@/lib/sailing-physics/types";
import { finishHoldStore } from "./race-finish-hold";
import { makeCourse, type Boat } from "./race-model";
import type { RaceLoopInput } from "./useRaceLoop";

// Contract (M3-4, decision #4): in the actual solo race loop a contact, the
// player's own mark rounding and the player's finish each ask for one race
// haptic; steering by rudder, by keys, a tack and the sheets never do.
const effects = vi.hoisted(() => ({ cleanups: [] as (void | (() => void))[], haptic: vi.fn() }));
vi.mock("react", async original => ({ ...await original<typeof import("react")>(), useEffect: (fn: () => void | (() => void)) => { effects.cleanups.push(fn()); } }));
vi.mock("@/lib/diagnostics-web", () => ({ recordWebDiagnostic: vi.fn() }));
vi.mock("@/lib/sounds", () => ({ playTack: vi.fn(), playMarkRound: vi.fn(), playFinish: vi.fn(), playNoGo: vi.fn(), readRaceSound: () => true }));
vi.mock("@/lib/race-haptics", () => ({ raceHaptic: effects.haptic }));
vi.mock("@/lib/funnel", () => ({ trackRaceEnd: vi.fn(), trackRaceMark: vi.fn(), trackRaceTack: vi.fn() }));
vi.mock("@/lib/race-resume", () => ({ clearRaceSetup: vi.fn() }));
import { useRaceLoop } from "./useRaceLoop";
import { playTack } from "@/lib/sounds";

let frame: ((now: number) => void) | null = null;
beforeEach(() => {
  effects.cleanups = []; effects.haptic.mockReset(); vi.mocked(playTack).mockClear(); frame = null;
  vi.stubGlobal("document", { hidden: false, addEventListener: () => {}, removeEventListener: () => {} });
  vi.stubGlobal("performance", { now: () => 0 });
  vi.stubGlobal("requestAnimationFrame", (callback: (now: number) => void) => { frame = callback; return 1; });
  vi.stubGlobal("cancelAnimationFrame", () => {});
});
afterEach(() => { for (const cleanup of effects.cleanups) cleanup?.(); vi.unstubAllGlobals(); finishHoldStore.set(null); });

const ref = <T,>(current: T) => ({ current });
interface Opts { heading?: number; mode?: "simple" | "pro"; trim?: Partial<Controls>; paused?: boolean; overlap?: boolean; frames?: number; frameMs?: number;
  place?: (player: Boat, course: ReturnType<typeof makeCourse>) => void; rudder?: number; keys?: string[]; onFrame?: (i: number, refs: RaceLoopInput["refs"]) => void }
function sail({ heading = 85, mode = "simple", trim = {}, paused = false, overlap = false, frames = 30, frameMs = 100, place, rudder = 0, keys = [], onFrame }: Opts = {}) {
  const course = makeCourse(), spawns = legacyRaceSpawns(course, 2);
  const boats: Boat[] = spawns.map((spawn, i) => ({ id: i ? `ai${i - 1}` : "player", name: i ? `AI ${i}` : "You", color: "#888888",
    pos: { ...spawn.pos }, heading: i ? spawn.heading : heading, speed: i ? 0 : 5, isPlayer: i === 0, lapDone: 0, speedMul: 1, started: true }));
  if (overlap) boats[1].pos = { x: boats[0].pos.x + 1, y: boats[0].pos.y };
  place?.(boats[0], course);
  const gate = createRaceStartupGate(); gate.reset("race-1"); gate.rendered("race-1");
  const set = new Proxy({}, { get: (target: Record<string, unknown>, key: string) => (target[key] ??= vi.fn()) }) as unknown as RaceLoopInput["set"];
  const refs = {
    boatsRef: ref(boats), courseRef: ref(course), physicalRef: ref(null), physicalNavRef: ref(undefined), fleetRef: ref(null), keysRef: ref(new Set<string>(keys)),
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
  } as unknown as RaceLoopInput["refs"];
  const soundscape = { update: vi.fn(), winch: vi.fn(), thud: vi.fn(), setLive: vi.fn(), silence: vi.fn(), dispose: vi.fn() } satisfies RaceSoundscape;
  const showContact = vi.fn();
  useRaceLoop({ gameState: "racing", difficulty: "easy", windStrength: "medium", selectedMission: null, lang: "en", tp: (_ru, en) => en, paused, sceneReady: true,
    showEvent: vi.fn(), showNotice: vi.fn(), showContact, requestNativeBest: vi.fn(), soundscape, refs, set });
  for (let i = 1, now = frameMs; frame && i <= frames; i++, now += frameMs) { onFrame?.(i, refs); const step = frame; frame = null; step(now); }
  return { soundscape, showContact, player: boats[0] };
}

const events = () => effects.haptic.mock.calls.map(([event]) => event);

describe("race haptics in the solo race loop", () => {
  it("asks for one contact haptic per contact frame", () => {
    const { showContact } = sail({ overlap: true, frames: 3 });
    expect(showContact).toHaveBeenCalled();
    expect(events()).toEqual(showContact.mock.calls.map(() => "contact"));
  });

  it("asks for a mark haptic when the player rounds the windward mark", () => {
    sail({ heading: 180, frames: 30, place: (player, course) => {
      const m = course.marks[0], inner = m.radius + MIN_BOAT_SEPARATION / 2;
      player.roundPhase = 2; player.pos = { x: m.pos.x - inner - 30, y: m.pos.y - 4 };
    } });
    expect(events()).toEqual(["mark"]);
  });

  it("asks for a finish haptic when the player crosses the finish line", () => {
    sail({ heading: 180, frames: 30, place: (player, course) => {
      const a = course.finishLine.a, b = course.finishLine.b;
      player.lapDone = 1; player.pos = { x: (a.x + b.x) / 2, y: a.y - 4 };
    } });
    expect(events()).toEqual(["finish"]);
  });

  it("never vibrates for steering, keys, a tack or the sheets", () => {
    const { player } = sail({ heading: 40, rudder: -1, frames: 60, onFrame: (i, refs) => {
      if (i === 20) { refs.rudderRef.current = 0; refs.keysRef.current.add("arrowright"); }
      if (i === 40) { refs.keysRef.current.clear(); refs.trimRef.current = raceTrim({ mainHoisted: true, mainSheet: 0.2, jibSheet: 0.9 }); }
    } });
    expect(player.heading).not.toBe(40);
    expect(playTack).toHaveBeenCalled();
    expect(effects.haptic).not.toHaveBeenCalled();
  });

  it("asks for nothing while paused", () => {
    sail({ overlap: true, paused: true, frames: 5 });
    expect(effects.haptic).not.toHaveBeenCalled();
  });
});
