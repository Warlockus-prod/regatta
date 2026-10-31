import { renderToStaticMarkup } from "react-dom/server";
import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ComponentProps } from "react";
import type { MPMessage } from "@/lib/mp-client";
import type { MultiplayerMenu } from "./MultiplayerLobby";

// Contract (M3-3): the actual multiplayer page routes every server message to
// the shared start signals, so the server's countdown plays the same horn,
// short signals and gun as the solo race through the same playStartSignal.
const capture = vi.hoisted(() => ({ menu: null as ComponentProps<typeof MultiplayerMenu> | null, handler: null as ((msg: MPMessage) => void) | null, played: [] as string[] }));
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
vi.mock("@/lib/sounds", async original => ({ ...(await original<typeof import("@/lib/sounds")>()), playStartSignal: vi.fn((signal: string) => { capture.played.push(signal); }) }));
import MultiplayerClient from "./MultiplayerClient";
import { playStartSignal } from "@/lib/sounds";

beforeEach(() => { capture.menu = null; capture.handler = null; capture.played = []; vi.stubGlobal("React", React); });
afterEach(() => { vi.unstubAllGlobals(); });

describe("multiplayer page start signals", () => {
  it("plays the server countdown through the shared start signal", async () => {
    renderToStaticMarkup(<MultiplayerClient />);
    capture.menu!.onCreate();
    await vi.waitFor(() => expect(capture.handler).not.toBeNull());
    const send = capture.handler!;
    send({ type: "phase", phase: "countdown", seed: 1 });
    for (const remain of [5, 4.5, 4, 3, 2, 1, 0.5]) send({ type: "countdown", remain });
    send({ type: "countdown", remain: 0 });
    send({ type: "phase", phase: "racing" });
    expect(capture.played).toEqual(["warning", "tick", "tick", "tick", "tick", "start"]);
    expect(playStartSignal).toHaveBeenCalledTimes(6);
  });
});
