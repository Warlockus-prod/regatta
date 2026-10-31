import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Contract (M1-5, owner decision #3): race sound is on by default, separate
// from the trainer wheel clicks, persisted per device; a player who muted the
// old race sound stays muted; no AudioContext exists and nothing plays before
// a user gesture, and nothing plays (and no context is created) while muted.

const mocks = vi.hoisted(() => ({ record: vi.fn() }));
vi.mock("@/lib/diagnostics-web", () => ({ recordWebDiagnostic: mocks.record }));

const RACE_KEY = "regatta.race.sound.v1";
const LEGACY = "regatta.muted.v1";
const CONTROLS = "regatta.controls.v1";

type Osc = { connect: ReturnType<typeof vi.fn>; start: ReturnType<typeof vi.fn> };
class FakeContext {
  static made: FakeContext[] = [];
  static sessionAtCreate: string | undefined;
  state: "suspended" | "running" = "suspended";
  currentTime = 0; sampleRate = 8000; destination = { id: "speakers" };
  gains: { gain: { value: number }; connect: ReturnType<typeof vi.fn> }[] = [];
  oscillators: Osc[] = [];
  primes = 0;
  resume = vi.fn(async () => { this.state = "running"; });
  suspend = vi.fn(async () => { this.state = "suspended"; });
  constructor() {
    FakeContext.made.push(this);
    FakeContext.sessionAtCreate = (globalThis.window as unknown as { navigator: { audioSession: { type: string } } }).navigator.audioSession.type;
  }
  createGain() {
    const g = { gain: { value: 1, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() }, connect: vi.fn() };
    this.gains.push(g); return g;
  }
  createOscillator() {
    const o = { type: "", frequency: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() }, connect: vi.fn(), start: vi.fn(), stop: vi.fn() };
    this.oscillators.push(o); return o;
  }
  createBuffer(_c: number, n: number) { return { getChannelData: () => new Float32Array(n) }; }
  createBufferSource() { return { buffer: null, connect: vi.fn(), start: vi.fn(() => { this.primes += 1; }), stop: vi.fn() }; }
  createBiquadFilter() { return { type: "", frequency: { value: 0 }, connect: vi.fn() }; }
}

const data = new Map<string, string>();
type Host = EventTarget & { localStorage: { getItem: (k: string) => string | null; setItem: (k: string, v: string) => void }; AudioContext: typeof FakeContext; navigator: { audioSession: { type: string } } };
let host: Host;
beforeEach(() => {
  vi.resetModules(); mocks.record.mockReset(); data.clear();
  FakeContext.made = []; FakeContext.sessionAtCreate = undefined;
  host = Object.assign(new EventTarget(), {
    localStorage: { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => { data.set(k, String(v)); } },
    AudioContext: FakeContext,
    navigator: { audioSession: { type: "auto" } },
  });
  vi.stubGlobal("window", host);
});
afterEach(() => vi.unstubAllGlobals());

const load = () => import("./sounds");
const flush = () => new Promise(resolve => setTimeout(resolve, 0));
const gesture = (type = "pointerup") => host.dispatchEvent(new Event(type));

describe("race sound preference", () => {
  it("is on by default for a new player", async () => {
    const s = await load();
    expect(s.readRaceSound()).toBe(true);
    expect(data.has(RACE_KEY)).toBe(false);
  });

  it("keeps an older explicit race mute muted until the player chooses again", async () => {
    data.set(LEGACY, "1");
    const s = await load();
    expect(s.readRaceSound()).toBe(false);
    s.writeRaceSound(true);
    expect(s.readRaceSound()).toBe(true);
    expect(data.get(RACE_KEY)).toBe("on");
    expect(data.get(LEGACY)).toBe("1");
  });

  it("treats an old unmuted race and a shared sound that is on as sound on", async () => {
    data.set(LEGACY, "0");
    expect((await load()).readRaceSound()).toBe(true);
    vi.resetModules();
    data.set(LEGACY, "1"); data.set(CONTROLS, JSON.stringify({ version: 1, mode: "wheels", sound: true }));
    expect((await load()).readRaceSound()).toBe(true);
  });

  it("is separate from the trainer wheel clicks in both directions", async () => {
    const s = await load();
    const controls = await import("@/features/trainer-controls/prefs");
    s.writeRaceSound(false);
    expect(controls.readControlPrefs().sound).toBe(false);
    expect(data.has(CONTROLS)).toBe(false);
    controls.writeControlPrefs({ ...controls.DEFAULT_CONTROL_PREFS, sound: true });
    expect(s.readRaceSound()).toBe(false);
    s.writeRaceSound(true);
    controls.writeControlPrefs({ ...controls.DEFAULT_CONTROL_PREFS, sound: false });
    expect(s.readRaceSound()).toBe(true);
  });

  it("persists across a reload, notifies subscribers and records the choice", async () => {
    const s = await load();
    const seen = vi.fn();
    const stop = s.subscribeRaceSound(seen);
    s.writeRaceSound(false);
    expect(data.get(RACE_KEY)).toBe("off");
    expect(seen).toHaveBeenCalledTimes(1);
    expect(mocks.record).toHaveBeenCalledWith({ type: "control.preferences", surface: "race", preference: "sound", value: false, previous: true, outcome: "accepted" });
    stop();
    vi.resetModules();
    expect((await load()).readRaceSound()).toBe(false);
  });

  it("keeps the choice in memory when storage refuses the write", async () => {
    const s = await load();
    host.localStorage.setItem = () => { throw new Error("quota"); };
    s.writeRaceSound(false);
    expect(s.readRaceSound()).toBe(false);
  });

  it("mutes even when storage refuses to replace an older saved 'on' (full quota)", async () => {
    data.set(RACE_KEY, "on");
    const s = await load();
    gesture(); await flush();
    const c = FakeContext.made[0];
    host.localStorage.setItem = () => { throw new Error("quota"); };
    s.writeRaceSound(false);
    expect(s.readRaceSound()).toBe(false);
    s.playBeep();
    expect(c.oscillators).toHaveLength(0);
  });

  it("is listed for the iOS app's race storage bridge so the app remembers it", () => {
    const file = readFileSync(join(process.cwd(), "mobile/src/persistence/race-web-storage.ts"), "utf8");
    expect(file).toContain(`"${RACE_KEY}"`);
  });
});

describe("race audio playback", () => {
  it("creates no audio context and plays nothing before the first gesture", async () => {
    const s = await load();
    s.playBeep(); s.playStart(); s.playTack(); s.playFinish();
    expect(FakeContext.made).toHaveLength(0);
  });

  it("unlocks on the first gesture at a moderate master volume with the ambient session", async () => {
    const s = await load();
    gesture();
    expect(FakeContext.made).toHaveLength(1);
    const c = FakeContext.made[0];
    expect(FakeContext.sessionAtCreate).toBe("ambient");
    expect(c.resume).toHaveBeenCalledTimes(1);
    expect(c.primes).toBe(1);
    await flush();
    s.playBeep();
    expect(c.oscillators).toHaveLength(1);
    const master = c.gains[0];
    expect(master.gain.value).toBe(s.RACE_SOUND_VOLUME);
    expect(s.RACE_SOUND_VOLUME).toBeGreaterThan(0);
    expect(s.RACE_SOUND_VOLUME).toBeLessThanOrEqual(0.6);
    expect(master.connect).toHaveBeenCalledWith(c.destination);
    // The note's own gain feeds the master, never the speakers directly.
    expect(c.gains[1].connect).toHaveBeenCalledWith(master);
    gesture("keydown");
    expect(FakeContext.made).toHaveLength(1);
  });

  it("resumes and primes again on the next gesture when the first one did not unlock audio (touch pointerdown)", async () => {
    const s = await load();
    gesture("pointerdown");
    const c = FakeContext.made[0];
    // WebKit on a touch screen refuses audio on pointerdown: the context stays suspended.
    expect(c.primes).toBe(1);
    c.state = "suspended";
    gesture("touchend");
    expect(FakeContext.made).toHaveLength(1);
    expect(c.resume).toHaveBeenCalledTimes(2);
    expect(c.primes).toBe(2);
    await flush();
    s.playBeep();
    expect(c.oscillators).toHaveLength(1);
  });

  it("never creates a context or plays for a muted player, even after gestures", async () => {
    data.set(LEGACY, "1");
    const s = await load();
    gesture(); gesture("click");
    s.playBeep();
    expect(FakeContext.made).toHaveLength(0);
  });

  it("stops at once when muted and resumes inside the click that turns it back on", async () => {
    const s = await load();
    gesture(); await flush();
    const c = FakeContext.made[0];
    s.writeRaceSound(false);
    expect(c.suspend).toHaveBeenCalledTimes(1);
    await flush();
    s.playMarkRound(); s.playNoGo();
    expect(c.oscillators).toHaveLength(0);
    c.resume.mockClear();
    s.writeRaceSound(true);
    expect(c.resume).toHaveBeenCalledTimes(1);
    await flush();
    s.playBeep();
    expect(c.oscillators).toHaveLength(1);
  });

  it("plays nothing once the stored choice is off, even while the context still runs (mute saved by another tab)", async () => {
    const s = await load();
    gesture(); await flush();
    const c = FakeContext.made[0];
    expect(c.state).toBe("running");
    data.set(RACE_KEY, "off");
    s.playBeep(); s.playTack();
    expect(c.oscillators).toHaveLength(0);
  });

  it("creates the context in the click that turns sound on for a previously muted player", async () => {
    data.set(LEGACY, "1");
    const s = await load();
    s.writeRaceSound(true);
    expect(FakeContext.made).toHaveLength(1);
    expect(FakeContext.made[0].resume).toHaveBeenCalledTimes(1);
  });
});

// Contract (M3-3): the start signals are procedural on the one race context:
// the horn when the countdown begins is a held two-voice tone, the short
// signal one voice, the gun a noise crack with a low thump, the recall one
// horn; none of them plays or creates a context while race sound is off.
describe("start signals", () => {
  const unlocked = async () => { const s = await load(); gesture(); await flush(); const c = FakeContext.made[0]; c.primes = 0; return { s, c }; };
  it("sounds a two-voice horn for the warning, one voice for a short signal and one horn for a recall", async () => {
    const { s, c } = await unlocked();
    s.playStartSignal("warning");
    expect(c.oscillators).toHaveLength(2);
    expect(c.primes).toBe(0);
    s.playStartSignal("tick");
    expect(c.oscillators).toHaveLength(3);
    s.playStartSignal("recall");
    expect(c.oscillators).toHaveLength(5);
    expect(c.primes).toBe(0);
  });

  it("fires the gun as a noise burst plus a low thump", async () => {
    const { s, c } = await unlocked();
    s.playStartSignal("start");
    expect(c.primes).toBe(1);
    expect(c.oscillators).toHaveLength(1);
  });

  it("plays no start signal and creates no context for a muted player", async () => {
    data.set(RACE_KEY, "off");
    const s = await load();
    gesture();
    for (const signal of ["warning", "tick", "start", "recall"] as const) s.playStartSignal(signal);
    expect(FakeContext.made).toHaveLength(0);
  });

  it("goes silent at once when muted mid-countdown", async () => {
    const { s, c } = await unlocked();
    s.playStartSignal("warning");
    s.writeRaceSound(false);
    for (const signal of ["tick", "start", "recall"] as const) s.playStartSignal(signal);
    expect(c.oscillators).toHaveLength(2);
    expect(c.primes).toBe(0);
    expect(c.suspend).toHaveBeenCalled();
  });
});
