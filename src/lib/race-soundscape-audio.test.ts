import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSilentTargets, mapRaceSoundscape, type RaceSoundscapeInput } from "./race-soundscape";

// Contract (M3-2, ADR-0019): the race soundscape plays on the one race
// AudioContext of sounds.ts, through its master; a muted player never gets a
// context; the beds are built once and an update creates no audio node; it
// applies at most about ten updates per second; pause / end / mute / hidden
// page fade it out at once and unmount stops it.

vi.mock("@/lib/diagnostics-web", () => ({ recordWebDiagnostic: vi.fn() }));

type Call = [string, ...number[]];
class Param {
  value: number; calls: Call[] = [];
  constructor(v = 0) { this.value = v; }
  setTargetAtTime(v: number, t: number, k: number) { this.calls.push(["target", v, t, k]); return this; }
  setValueAtTime(v: number, t: number) { this.calls.push(["value", v, t]); return this; }
  exponentialRampToValueAtTime(v: number, t: number) { this.calls.push(["ramp", v, t]); return this; }
  cancelScheduledValues(t: number) { this.calls.push(["cancel", t]); return this; }
  targets() { return this.calls.filter(c => c[0] === "target"); }
}
class Node {
  connected: unknown[] = []; disconnected = 0; started = 0; stopped = 0;
  connect(to: unknown) { this.connected.push(to); return to; }
  disconnect() { this.disconnected++; }
  start() { this.started++; }
  stop() { this.stopped++; }
}
class Gain extends Node { gain: Param; constructor(v = 1) { super(); this.gain = new Param(v); } }
class Filter extends Node { type = ""; frequency = new Param(350); Q = new Param(1); }
class Source extends Node { buffer: unknown = null; loop = false; }
class Osc extends Node { type = ""; frequency = new Param(440); }
class FakeContext {
  static made: FakeContext[] = [];
  state: "suspended" | "running" = "suspended";
  currentTime = 0; sampleRate = 8000; destination = { id: "speakers" };
  gains: Gain[] = []; filters: Filter[] = []; sources: Source[] = []; oscillators: Osc[] = []; buffers = 0;
  resume = vi.fn(async () => { this.state = "running"; });
  suspend = vi.fn(async () => { this.state = "suspended"; });
  constructor() { FakeContext.made.push(this); }
  createGain() { const g = new Gain(); this.gains.push(g); return g; }
  createBiquadFilter() { const f = new Filter(); this.filters.push(f); return f; }
  createBufferSource() { const s = new Source(); this.sources.push(s); return s; }
  createOscillator() { const o = new Osc(); this.oscillators.push(o); return o; }
  createBuffer(_c: number, n: number) { this.buffers++; return { getChannelData: () => new Float32Array(n) }; }
  nodeCount() { return this.gains.length + this.filters.length + this.sources.length + this.oscillators.length + this.buffers; }
}

const data = new Map<string, string>();
type Host = EventTarget & { localStorage: Storage; AudioContext: typeof FakeContext; navigator: { audioSession: { type: string } } };
let host: Host;
let doc: EventTarget & { hidden: boolean };
beforeEach(() => {
  vi.resetModules(); data.clear(); FakeContext.made = [];
  host = Object.assign(new EventTarget(), {
    localStorage: { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => { data.set(k, String(v)); } } as unknown as Storage,
    AudioContext: FakeContext,
    navigator: { audioSession: { type: "auto" } },
  });
  vi.stubGlobal("window", host);
  doc = Object.assign(new EventTarget(), { hidden: false });
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

const flush = () => new Promise(resolve => setTimeout(resolve, 0));
const gesture = () => host.dispatchEvent(new Event("pointerup"));
const input = (patch: Partial<RaceSoundscapeInput> = {}): RaceSoundscapeInput => ({ apparentWindKn: 16, boatSpeedKn: 6, heelDeg: 15, luffing: false, inIrons: false, mode: "simple", paused: false, muted: false, ...patch });
async function setup(opts: { muted?: boolean } = {}) {
  if (opts.muted) data.set("regatta.race.sound.v1", "off");
  const sounds = await import("./sounds");
  const { createRaceSoundscape } = await import("./race-soundscape-audio");
  // The throttle's page clock follows the fake audio clock here; the quantised-clock case below separates them.
  const scape = createRaceSoundscape({ doc: doc as unknown as Document, clock: () => FakeContext.made[0]?.currentTime ?? 0 });
  return { sounds, scape };
}
async function unlocked() {
  const s = await setup();
  gesture(); await flush();
  const c = FakeContext.made[0];
  return { ...s, c, master: c.gains[0] };
}
/** The six bed gains, in build order: wind, water, slap, flog, click, thud. */
const beds = (c: FakeContext) => c.gains.slice(2, 8);
const lastTarget = (p: Param) => p.targets().at(-1)?.[1];

describe("race soundscape: the shared context only", () => {
  it("creates no context and builds nothing for a muted player, through gestures, updates, winch and contact", async () => {
    const { scape } = await setup({ muted: true });
    gesture(); host.dispatchEvent(new Event("keydown"));
    scape.setLive(true);
    for (let i = 0; i < 5; i++) scape.update(mapRaceSoundscape(input({ inIrons: true })));
    scape.winch(0.2); scape.thud();
    expect(FakeContext.made).toHaveLength(0);
  });

  it("does nothing before the first gesture (no context exists yet)", async () => {
    const { scape } = await setup();
    scape.update(mapRaceSoundscape(input()));
    expect(FakeContext.made).toHaveLength(0);
  });

  it("builds the beds once on the shared context and feeds the race master, never the speakers", async () => {
    const { scape, c, master } = await unlocked();
    const before = c.nodeCount();
    scape.update(mapRaceSoundscape(input()));
    expect(FakeContext.made).toHaveLength(1);
    const bus = c.gains[1];
    expect(bus.connected).toEqual([master]);
    expect(bus.gain.value).toBeGreaterThan(0);
    expect(bus.gain.value).toBeLessThanOrEqual(1);
    for (const g of beds(c)) expect(g.connected).toEqual([bus]);
    // One looping noise source (after the unlock prime) feeds five filters; one sine for the thud.
    const noise = c.sources.at(-1)!;
    expect(noise.loop).toBe(true);
    expect(noise.connected).toHaveLength(5);
    expect(c.filters).toHaveLength(5);
    expect(c.oscillators).toHaveLength(1);
    const built = c.nodeCount();
    expect(built - before).toBe(15);
    // Fifty more updates, winches and contacts across five seconds: not one new node.
    for (let i = 0; i < 50; i++) {
      c.currentTime += 0.1;
      scape.update(mapRaceSoundscape(input({ boatSpeedKn: i % 8, inIrons: i % 2 === 0 })));
      if (i % 5 === 0) { scape.winch(0.1); scape.thud(); }
    }
    expect(c.nodeCount()).toBe(built);
  });

  it("glides the beds to the mapping's targets with setTargetAtTime", async () => {
    const { scape, c } = await unlocked();
    const t = mapRaceSoundscape(input());
    scape.update(t);
    const [wind, water] = beds(c);
    expect(lastTarget(wind.gain)).toBeCloseTo(t.windGain, 6);
    expect(lastTarget(water.gain)).toBeCloseTo(t.waterGain, 6);
    expect(lastTarget(c.filters[0].frequency)).toBeCloseTo(t.windFilterHz, 6);
    expect(lastTarget(c.filters[1].frequency)).toBeCloseTo(t.waterFilterHz, 6);
  });

  it("applies at most about ten updates per second", async () => {
    const { scape, c } = await unlocked();
    const wind = () => beds(c)[0].gain.targets().length;
    scape.update(mapRaceSoundscape(input()));
    expect(wind()).toBe(1);
    // A 60 Hz caller for one second gives at most ten or eleven applied updates.
    for (let i = 1; i <= 60; i++) { c.currentTime = i / 60; scape.update(mapRaceSoundscape(input({ apparentWindKn: 10 + i / 10 }))); }
    expect(wind()).toBeGreaterThanOrEqual(9);
    expect(wind()).toBeLessThanOrEqual(11);
  });

  it("schedules flogging pulses in irons and none when the sails fill", async () => {
    const { scape, c } = await unlocked();
    scape.update(mapRaceSoundscape(input({ apparentWindKn: 14, boatSpeedKn: 0.3, inIrons: true })));
    const flog0 = beds(c)[3];
    // 6.5 pulses per second over the 0.2 s lookahead.
    const peaks = flog0.gain.targets().filter(call => call[1] > 0);
    expect(peaks.length).toBeGreaterThanOrEqual(1);
    expect(peaks.length).toBeLessThanOrEqual(2);
    const count = flog0.gain.targets().length;
    c.currentTime = 0.2;
    scape.update(mapRaceSoundscape(input({ apparentWindKn: 14, boatSpeedKn: 5 })));
    expect(flog0.gain.targets().length).toBe(count);
  });

  it("plays a winch ratchet and a contact thud only while it sounds", async () => {
    const { scape, c } = await unlocked();
    scape.winch(0.2); scape.thud();
    expect(c.gains).toHaveLength(1); // nothing built yet: silent before the first live update
    scape.update(mapRaceSoundscape(input()));
    const click = beds(c)[4], thud = beds(c)[5];
    scape.winch(0.1);
    expect(click.gain.targets().filter(call => call[1] > 0)).toHaveLength(4);
    // One ratchet at a time.
    scape.winch(0.1);
    expect(click.gain.targets().filter(call => call[1] > 0)).toHaveLength(4);
    scape.thud();
    expect(thud.gain.targets().filter(call => call[1] > 0)).toHaveLength(1);
    scape.setLive(false);
    const clicks = click.gain.targets().length, thuds = thud.gain.targets().length;
    c.currentTime = 1;
    scape.winch(0.3); scape.thud();
    expect(click.gain.targets().length).toBe(clicks);
    expect(thud.gain.targets().length).toBe(thuds);
  });
});

describe("race soundscape lifecycle", () => {
  const fadedOut = (c: FakeContext) => beds(c).every(g => g.gain.calls.at(-1)?.[0] === "target" && g.gain.calls.at(-1)?.[1] === 0
    && g.gain.calls.some(call => call[0] === "cancel"));

  it("goes silent at once on setLive(false) (pause, finish hold end, results) and ignores updates until live again", async () => {
    const { scape, c } = await unlocked();
    scape.update(mapRaceSoundscape(input({ inIrons: true })));
    scape.setLive(false);
    expect(fadedOut(c)).toBe(true);
    const calls = beds(c).map(g => g.gain.calls.length);
    c.currentTime = 1;
    scape.update(mapRaceSoundscape(input({ inIrons: true })));
    expect(beds(c).map(g => g.gain.calls.length)).toEqual(calls);
    scape.setLive(true);
    scape.update(mapRaceSoundscape(input()));
    expect(lastTarget(beds(c)[0].gain)).toBeGreaterThan(0);
  });

  it("goes silent on a paused or muted target without waiting for the throttle", async () => {
    const { scape, c } = await unlocked();
    scape.update(mapRaceSoundscape(input()));
    c.currentTime = 0.01;
    scape.update(mapRaceSoundscape(input({ paused: true })));
    expect(fadedOut(c)).toBe(true);
    expect(mapRaceSoundscape(input({ muted: true })).silent).toBe(true);
    // A repeated silence schedules nothing more.
    const calls = beds(c).map(g => g.gain.calls.length);
    scape.update(createSilentTargets());
    scape.silence();
    expect(beds(c).map(g => g.gain.calls.length)).toEqual(calls);
  });

  it("goes silent when race sound is switched off, with the shared context suspended", async () => {
    const { scape, c, sounds } = await unlocked();
    scape.update(mapRaceSoundscape(input()));
    sounds.writeRaceSound(false);
    expect(c.suspend).toHaveBeenCalledTimes(1);
    await flush();
    c.currentTime = 1;
    scape.update(mapRaceSoundscape(input()));
    expect(fadedOut(c)).toBe(true);
  });

  it("goes silent when the page is hidden, and stays silent while hidden", async () => {
    const { scape, c } = await unlocked();
    scape.update(mapRaceSoundscape(input()));
    doc.hidden = true;
    doc.dispatchEvent(new Event("visibilitychange"));
    expect(fadedOut(c)).toBe(true);
    c.currentTime = 1;
    const calls = beds(c).map(g => g.gain.calls.length);
    scape.update(mapRaceSoundscape(input()));
    expect(beds(c).map(g => g.gain.calls.length)).toEqual(calls);
  });

  it("stops and disconnects everything on dispose (unmount) and builds again on the next live update", async () => {
    const { scape, c } = await unlocked();
    scape.update(mapRaceSoundscape(input()));
    const noise = c.sources.at(-1)!, osc = c.oscillators[0], bus = c.gains[1];
    scape.dispose();
    expect(fadedOut(c)).toBe(true);
    expect(noise.stopped).toBe(1);
    expect(osc.stopped).toBe(1);
    expect(noise.disconnected + osc.disconnected + bus.disconnected).toBe(3);
    // No longer listening to the page.
    doc.hidden = true; doc.dispatchEvent(new Event("visibilitychange")); doc.hidden = false;
    c.currentTime = 1;
    scape.update(mapRaceSoundscape(input()));
    expect(c.oscillators).toHaveLength(2);
    expect(FakeContext.made).toHaveLength(1);
  });

  it("stops the beds once a silence has lasted, and builds them again (same noise buffer) on the next live update", async () => {
    const { scape, c } = await unlocked();
    const { RELEASE_MS } = await import("./race-soundscape-audio");
    vi.useFakeTimers();
    scape.update(mapRaceSoundscape(input()));
    const noise = c.sources.at(-1)!, osc = c.oscillators[0];
    scape.setLive(false);
    vi.advanceTimersByTime(RELEASE_MS - 1);
    expect(noise.stopped).toBe(0);
    vi.advanceTimersByTime(1);
    expect(noise.stopped).toBe(1);
    expect(osc.stopped).toBe(1);
    // Live again: rebuilt, without a second noise buffer.
    const buffers = c.buffers;
    scape.setLive(true);
    c.currentTime = 1;
    scape.update(mapRaceSoundscape(input()));
    expect(c.oscillators).toHaveLength(2);
    expect(c.buffers).toBe(buffers);
    expect(c.sources.at(-1)!.buffer).toBe(noise.buffer);
  });

  it("keeps the beds when the race resumes before the release, and stops them after a hidden page", async () => {
    const { scape, c } = await unlocked();
    const { RELEASE_MS } = await import("./race-soundscape-audio");
    vi.useFakeTimers();
    scape.update(mapRaceSoundscape(input()));
    const noise = c.sources.at(-1)!;
    scape.setLive(false);
    vi.advanceTimersByTime(RELEASE_MS / 2);
    scape.setLive(true);
    c.currentTime = 0.5;
    scape.update(mapRaceSoundscape(input()));
    vi.advanceTimersByTime(RELEASE_MS * 2);
    expect(noise.stopped).toBe(0);
    expect(c.oscillators).toHaveLength(1);
    doc.hidden = true;
    doc.dispatchEvent(new Event("visibilitychange"));
    vi.advanceTimersByTime(RELEASE_MS);
    expect(noise.stopped).toBe(1);
  });
});

describe("race soundscape cadence on a real audio clock", () => {
  it("applies every 100 ms HUD tick and keeps the flogging rhythm when the audio clock moves in buffer steps", async () => {
    const { mapRaceSoundscape: map } = await import("./race-soundscape");
    await import("./sounds");
    gesture(); await flush();
    const c = FakeContext.made[0];
    let page = 0;
    const { createRaceSoundscape } = await import("./race-soundscape-audio");
    const scape = createRaceSoundscape({ doc: doc as unknown as Document, clock: () => page });
    // A hardware buffer of 1024 frames at 48 kHz, read with a random lag of up to one buffer.
    const quantum = 1024 / 48000;
    let seed = 7;
    const lag = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const irons = map(input({ apparentWindKn: 14, boatSpeedKn: 0.3, inIrons: true }));
    for (let i = 0; i < 100; i++) {
      page = i * 0.1;
      c.currentTime = Math.max(0, Math.floor(page / quantum - lag()) * quantum);
      scape.update(irons);
    }
    const [wind, , , flog] = beds(c);
    expect(wind.gain.targets().length).toBeGreaterThanOrEqual(99);
    // About ten seconds of flogging at the mapped rate: no stutter from rhythm resets.
    const peaks = flog.gain.targets().filter(call => call[1] > 0).length;
    const expected = irons.flogRateHz * 10;
    expect(peaks).toBeGreaterThanOrEqual(expected * 0.95);
    expect(peaks).toBeLessThanOrEqual(expected * 1.1);
  });
});
