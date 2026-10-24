import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchStationVoice } from "../symulator/audio/stationVoice";
import { isLocalSpeech, playLocalSpeech, stopLocalSpeech } from "./localSpeech";

afterEach(() => { stopLocalSpeech(); vi.unstubAllGlobals(); });

function nativeBridge() {
  const events = new EventTarget();
  const messages: { type: string; id?: string; action?: string; text?: string; lang?: string; volume?: number }[] = [];
  const postMessage = vi.fn((message: string) => messages.push(JSON.parse(message)));
  vi.stubGlobal("window", {
    __REGATTA_NATIVE_SPEECH__: true, __REGATTA_OFFLINE_BUNDLE__: true,
    ReactNativeWebView: { postMessage },
    addEventListener: events.addEventListener.bind(events), removeEventListener: events.removeEventListener.bind(events),
    setTimeout, speechSynthesis: { cancel: vi.fn() },
  });
  vi.stubGlobal("navigator", { onLine: false });
  return { messages, emit: (id: string, status: string) => events.dispatchEvent(new CustomEvent("regatta:radio-speech", { detail: { id, status } })) };
}

describe("local radio speech", () => {
  it("does not request any server or remote clip for an offline station line", async () => {
    nativeBridge(); const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    const voice = await fetchStationVoice("RADIO CHECK, OVER");
    expect(voice && isLocalSpeech(voice)).toBe(true);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("uses English for on-air speech, clamps gain, and waits for actual native completion", async () => {
    const bridge = nativeBridge();
    const playing = playLocalSpeech("RADIO CHECK, OVER", 2);
    const request = bridge.messages.find(message => message.text)!;
    expect(request).toMatchObject({ lang: "en", volume: 1 });
    bridge.emit(request.id!, "started");
    bridge.emit("unrelated", "done");
    bridge.emit(request.id!, "done");
    expect(await playing).toBe(true);
  });
  it("cancels the previous line without reporting a successful playback", async () => {
    const bridge = nativeBridge();
    const first = playLocalSpeech("MAYDAY");
    const old = bridge.messages.find(message => message.text)!.id!;
    const second = playLocalSpeech("OUT");
    expect(await first).toBe(false);
    expect(bridge.messages).toContainEqual({ type: "radio-speech", action: "cancel", id: old });
    const latest = bridge.messages.filter(message => message.text).at(-1)!;
    bridge.emit(latest.id!, "done"); expect(await second).toBe(true);
  });
  it("does not emit muted speech or claim an unavailable local voice played", async () => {
    const bridge = nativeBridge();
    expect(await playLocalSpeech("OVER", 0)).toBe(false);
    expect(bridge.messages).toEqual([]);
    const failed = playLocalSpeech("OVER"); const request = bridge.messages.find(message => message.text)!;
    bridge.emit(request.id!, "error"); expect(await failed).toBe(false);
  });
});
