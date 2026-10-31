import { renderToStaticMarkup } from "react-dom/server";
import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ComponentProps } from "react";
import type { MPMessage } from "@/lib/mp-client";
import type { MultiplayerMenu } from "./MultiplayerLobby";

// Contract (M3-4): the actual multiplayer page vibrates for the player's own
// mark rounding and finish from the server 'state' events, and for the start
// gun of the server countdown; another boat's events, and any event before
// the server told us our id, never vibrate. M3-3: the same server events of
// our own boat play the solo race sounds (mark, no-go entry, finish).
const capture = vi.hoisted(() => ({ menu: null as ComponentProps<typeof MultiplayerMenu> | null, handler: null as ((msg: MPMessage) => void) | null, haptics: [] as string[], startSignals: [] as unknown[], sounds: [] as string[] }));
vi.mock("next/dynamic", () => ({ default: () => () => null }));
vi.mock("@/lib/i18n", () => ({ useI18n: () => ({ lang: "en", tl: (text: Record<string, string>) => text.en, tp: (_ru: string, en: string) => en }) }));
vi.mock("@/lib/diagnostics-web", () => ({ recordWebDiagnostic: vi.fn() }));
vi.mock("@/lib/diagnostics-bridge", () => ({ initializeDiagnosticBridge: vi.fn() }));
vi.mock("@/features/venues/useVenue", () => ({ useVenue: () => ({ venue: null }) }));
vi.mock("../game/race-prefs", () => ({ useRacePrefs: () => ({ prefs: { windDisplay: "compass", miniMap: true }, update: vi.fn() }) }));
vi.mock("@/lib/race-submission", () => ({ sanitizeNickname: () => "Sailor" }));
vi.mock("./lobby", async original => ({ ...(await original<typeof import("./lobby")>()), createTapAction: () => "create" }));
vi.mock("./MultiplayerLobby", () => ({ MultiplayerMenu: (props: ComponentProps<typeof MultiplayerMenu>) => { capture.menu = props; return null; }, MultiplayerRoom: () => null }));
vi.mock("@/lib/mp-client", async original => {
  const actual = await original<typeof import("@/lib/mp-client")>();
  class FakeClient {
    isOpen = false;
    on(handler: (msg: MPMessage) => void) { capture.handler = handler; }
    onClose() {}
    async connect() { this.isOpen = true; }
    send() {}
    close() {}
    rememberForResume() {}
  }
  return { ...actual, MPClient: FakeClient, getWsUrl: () => "ws://test" };
});
vi.mock("@/lib/sounds", async original => ({
  ...(await original<typeof import("@/lib/sounds")>()),
  playStartSignal: vi.fn(),
  playMarkRound: vi.fn(() => { capture.sounds.push("mark"); }),
  playFinish: vi.fn(() => { capture.sounds.push("finish"); }),
  playNoGo: vi.fn(() => { capture.sounds.push("no-go"); }),
}));
vi.mock("@/lib/race-haptics", async original => ({
  ...(await original<typeof import("@/lib/race-haptics")>()),
  raceHaptic: vi.fn((event: string) => { capture.haptics.push(event); }),
  raceStartHaptic: vi.fn((signal: unknown) => { capture.startSignals.push(signal); }),
}));
import MultiplayerClient from "./MultiplayerClient";

beforeEach(() => { capture.menu = null; capture.handler = null; capture.haptics = []; capture.startSignals = []; capture.sounds = []; vi.stubGlobal("React", React); });
afterEach(() => { vi.unstubAllGlobals(); });

const state = (events: { id: string; type: string }[]): MPMessage => ({ type: "state", t: 1, wind: { dir: 0, gust: 0 }, boats: [], events: events.map(e => ({ ...e, t: 1 })) });

async function connected() {
  renderToStaticMarkup(<MultiplayerClient />);
  capture.menu!.onCreate();
  await vi.waitFor(() => expect(capture.handler).not.toBeNull());
  return capture.handler!;
}

describe("multiplayer page haptics", () => {
  it("vibrates the player's own mark and finish only, never before the server assigned our id", async () => {
    const send = await connected();
    send(state([{ id: "me", type: "mark" }, { id: "me", type: "finish" }]));
    expect(capture.haptics).toEqual([]);
    send({ type: "joined", code: "ABCD", id: "me", isHost: true });
    send(state([{ id: "me", type: "mark" }, { id: "other", type: "finish" }, { id: "other", type: "mark" }, { id: "me", type: "nogo" }, { id: "me", type: "finish" }]));
    expect(capture.haptics).toEqual(["mark", "finish"]);
  });

  it("plays the solo race sounds for the player's own mark, no-go entry and finish (M3-3)", async () => {
    const send = await connected();
    send(state([{ id: "me", type: "mark" }]));
    expect(capture.sounds).toEqual([]);
    send({ type: "joined", code: "ABCD", id: "me", isHost: true });
    send(state([{ id: "other", type: "mark" }, { id: "me", type: "mark" }, { id: "other", type: "no-go-entered" }, { id: "me", type: "no-go-entered" }, { id: "me", type: "finish" }]));
    expect(capture.sounds).toEqual(["mark", "no-go", "finish"]);
  });

  it("hands every start signal of the server countdown to the start haptic", async () => {
    const send = await connected();
    send({ type: "phase", phase: "countdown", seed: 1 });
    for (const remain of [5, 4, 3, 2, 1]) send({ type: "countdown", remain });
    send({ type: "countdown", remain: 0 });
    send({ type: "phase", phase: "racing" });
    expect(capture.startSignals).toContain("start");
  });
});
