import { beforeEach, describe, expect, it, vi } from "vitest";
import { RACE_SOUNDSCAPE, type RaceSoundscapeTargets } from "@/lib/race-soundscape";
import type { RaceSoundscape } from "@/lib/race-soundscape-audio";
import { raceWindReading, type RaceWindReading } from "@/features/race-hud/navigation-model";
import type { MultiplayerFrame } from "./presentation";

// Contract (M3-2 tail): /multiplayer feeds the solo race's soundscape with its
// own boat once per HUD frame (apparent wind, speed, in irons), live only in
// the server countdown and the race with race sound on and the socket
// connected, until our own boat finishes; our finish, the results, the lobby,
// a disconnect and a mute send nothing and switch it off, and unmounting the
// page disposes it once. The wind bed follows the HUD's apparent wind.

// A minimal hook runner: state and effects keep their slot between renders,
// effects run when their deps change, the previous cleanup first, as in React.
const hooks = vi.hoisted(() => ({ slots: [] as { deps?: unknown[]; cleanup?: void | (() => void); state?: unknown }[], index: 0 }));
vi.mock("react", async original => ({ ...await original<typeof import("react")>(),
  useState: (initial: unknown) => {
    const slot = hooks.slots[hooks.index] ??= { state: typeof initial === "function" ? (initial as () => unknown)() : initial };
    hooks.index++;
    return [slot.state, () => {}];
  },
  useEffect: (fn: () => void | (() => void), deps?: unknown[]) => {
    const slot = hooks.slots[hooks.index] ??= {};
    hooks.index++;
    if (slot.deps && deps && deps.every((d, i) => Object.is(d, slot.deps![i]))) return;
    slot.cleanup?.();
    slot.deps = deps; slot.cleanup = fn();
  } }));
const fake = vi.hoisted(() => ({ log: [] as string[], seen: [] as RaceSoundscapeTargets[], objects: new Set<unknown>() }));
vi.mock("@/lib/race-soundscape-audio", () => ({ createRaceSoundscape: (): RaceSoundscape => ({
  update: vi.fn((t: RaceSoundscapeTargets) => { fake.log.push("update"); fake.seen.push({ ...t }); fake.objects.add(t); }),
  winch: vi.fn(), thud: vi.fn(), silence: vi.fn(),
  setLive: vi.fn((live: boolean) => { fake.log.push(`live:${live}`); }),
  dispose: vi.fn(() => { fake.log.push("dispose"); }),
}) }));
import { useMultiplayerSoundscape } from "./useMultiplayerSoundscape";

beforeEach(() => { hooks.slots = []; fake.log = []; fake.seen = []; fake.objects = new Set(); });

let t = 0;
function frame({ heading = 90, speed = 5, windDir = 0, player = true, lapDone = 0, finishTime, reading = true }: { heading?: number; speed?: number; windDir?: number; player?: boolean; lapDone?: number; finishTime?: number; reading?: boolean } = {}): { frame: MultiplayerFrame; reading: RaceWindReading | null } {
  const windKnots = 12;
  const boats = [{ id: "me", color: "#888888", pos: { x: 0, y: 0 }, heading, speed, lapDone, finishTime, isPlayer: player,
    physics: { trueWindDir: windDir, trueWindSpeed: windKnots, heading, boatSpeed: speed, heel: 0, leeway: 0 } }];
  return { frame: { boats, windDir, windKnots, time: t += 0.1, guidance: null },
    reading: reading ? raceWindReading({ heading, boatSpeedKn: speed, windFrom: windDir, windKnots, leeway: 0 }) : null };
}
function Page(phase: string, f: { frame: MultiplayerFrame; reading: RaceWindReading | null } | null, { reconnecting = false, soundOn = true } = {}) {
  hooks.index = 0;
  useMultiplayerSoundscape({ phase, reconnecting, soundOn, frame: f?.frame ?? null, windReading: f?.reading ?? null });
}
const unmount = () => { for (const slot of hooks.slots) slot.cleanup?.(); hooks.slots = []; };
const updates = () => fake.log.filter(entry => entry === "update").length;

describe("multiplayer soundscape", () => {
  it("plays wind and water for our own boat in the race, one update per HUD frame, live before the first one", () => {
    Page("countdown", frame());
    Page("racing", frame());
    const f = frame();
    Page("racing", f); Page("racing", f);
    expect(fake.log.slice(0, 2)).toEqual(["live:true", "update"]);
    expect(updates()).toBe(3);
    const last = fake.seen.at(-1)!;
    expect(last.silent).toBe(false);
    expect(last.windGain).toBeGreaterThan(0.05);
    expect(last.waterGain).toBeGreaterThan(0.05);
    expect(last.slapRateHz).toBeGreaterThan(0);
    expect(last.flogGain).toBe(0);
    // One target object for the whole page.
    expect(fake.objects.size).toBe(1);
  });

  it("flogs the sails head to wind, not on a reach", () => {
    Page("racing", frame({ heading: 10, speed: 1 }));
    expect(fake.seen.at(-1)!.flogGain).toBeGreaterThan(0);
    Page("racing", frame({ heading: 100 }));
    expect(fake.seen.at(-1)!.flogGain).toBe(0);
  });

  it("more speed is never quieter water", () => {
    Page("racing", frame({ speed: 2 }));
    const slow = fake.seen.at(-1)!.waterGain;
    Page("racing", frame({ speed: 6 }));
    expect(fake.seen.at(-1)!.waterGain).toBeGreaterThan(slow);
  });

  it("follows the HUD's apparent wind: louder and brighter close-hauled than running in the same true wind", () => {
    Page("racing", frame({ heading: 45, speed: 5 }));
    const upwind = fake.seen.at(-1)!;
    Page("racing", frame({ heading: 170, speed: 5 }));
    const running = fake.seen.at(-1)!;
    expect(upwind.windGain).toBeGreaterThan(running.windGain + 0.02);
    expect(upwind.windFilterHz).toBeGreaterThan(running.windFilterHz + 50);
  });

  it("falls back to the true wind when the HUD has no wind reading yet", () => {
    Page("racing", frame({ heading: 45, reading: false }));
    const W = RACE_SOUNDSCAPE.wind;
    expect(fake.seen.at(-1)!.windGain).toBeCloseTo(W.base + W.perKn * 12, 6);
  });

  it("goes silent when our own boat finishes, while the room still races", () => {
    Page("racing", frame());
    expect(fake.log.slice(-2)).toEqual(["live:true", "update"]);
    // The server freezes a finished boat at its last speed and heading.
    Page("racing", frame({ lapDone: 2, finishTime: 412.3 }));
    Page("racing", frame({ lapDone: 2, finishTime: 412.3, heading: 10 }));
    expect(fake.log.slice(-1)).toEqual(["live:false"]);
    expect(updates()).toBe(1);
    // A finish time alone (the snapshot ahead of the lap count) is a finish too.
    hooks.slots = []; fake.log = [];
    Page("racing", frame({ finishTime: 400 }));
    expect(fake.log).toEqual(["live:false"]);
  });

  it("is silent on the results, in the lobby and the menu", () => {
    Page("racing", frame());
    const before = updates();
    for (const phase of ["finished", "lobby", "menu", "error"]) {
      Page(phase, frame());
      expect(fake.log.filter(e => e.startsWith("live")).at(-1), phase).toBe("live:false");
    }
    expect(updates()).toBe(before);
  });

  it("goes silent while the socket reconnects and comes back with the connection", () => {
    Page("racing", frame());
    Page("racing", frame(), { reconnecting: true });
    Page("racing", frame(), { reconnecting: true });
    expect(fake.log.slice(-1)).toEqual(["live:false"]);
    expect(updates()).toBe(1);
    Page("racing", frame());
    expect(fake.log.slice(-2)).toEqual(["live:true", "update"]);
  });

  it("goes silent when race sound is off", () => {
    Page("racing", frame());
    Page("racing", frame(), { soundOn: false });
    Page("racing", frame(), { soundOn: false });
    expect(fake.log.slice(-1)).toEqual(["live:false"]);
    expect(updates()).toBe(1);
  });

  it("sends nothing without a frame or without our boat in it", () => {
    Page("countdown", null);
    Page("countdown", frame({ player: false }));
    expect(updates()).toBe(0);
  });

  it("disposes the beds once when the page unmounts", () => {
    Page("racing", frame()); Page("finished", frame()); Page("racing", frame());
    expect(fake.log).not.toContain("dispose");
    unmount();
    expect(fake.log.filter(e => e === "dispose")).toHaveLength(1);
  });
});
