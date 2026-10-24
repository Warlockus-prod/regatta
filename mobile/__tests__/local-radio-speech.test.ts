import { createLocalRadioSpeech, radioSpeechEventScript } from "../src/radio/local-speech";
import type { ExpoSpeechRecognitionModuleType } from "expo-speech-recognition/build/ExpoSpeechRecognitionModule.types";

const flush = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
function setup() {
  const handlers: Record<string, (value?: unknown) => void> = {};
  const speech = {
    speak: jest.fn(), stop: jest.fn().mockResolvedValue(undefined),
    getAvailableVoicesAsync: jest.fn().mockResolvedValue([{ language: "en-GB", identifier: "local-english", name: "English", quality: "Default" }]),
  };
  const recognition = {
    addListener: jest.fn((name: string, callback: (value: unknown) => void) => { handlers[name] = callback; return { remove: jest.fn() }; }),
    isRecognitionAvailable: jest.fn(() => true), supportsOnDeviceRecognition: jest.fn(() => true),
    getSupportedLocales: jest.fn().mockResolvedValue({ locales: ["en-GB"], installedLocales: ["en-GB"] }),
    getMicrophonePermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
    requestMicrophonePermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
    start: jest.fn(), stop: jest.fn(), abort: jest.fn(),
  };
  const send = jest.fn();
  const bridge = createLocalRadioSpeech({ speech, recognition: recognition as unknown as ExpoSpeechRecognitionModuleType, platform: "ios", send });
  return { speech, recognition, send, bridge, handlers };
}
beforeEach(() => jest.useFakeTimers());
afterEach(() => { jest.clearAllTimers(); jest.useRealTimers(); });

it("speaks an installed matching voice with receiver volume and emits actual lifecycle events", async () => {
  const { bridge, speech, send } = setup();
  bridge.handle(JSON.stringify({ type: "radio-speech", id: "voice-1", text: "MAYDAY", lang: "en", volume: .3, rate: .8 }));
  await flush();
  expect(speech.speak).toHaveBeenCalledWith("MAYDAY", expect.objectContaining({ voice: "local-english", volume: .3, rate: .8 }));
  expect(send).not.toHaveBeenCalledWith("regatta:radio-speech", expect.objectContaining({ status: "started" }));
  speech.speak.mock.calls[0][1].onStart();
  expect(send).toHaveBeenCalledWith("regatta:radio-speech", expect.objectContaining({ id: "voice-1", status: "started" }));
  bridge.handle(JSON.stringify({ type: "radio-speech", action: "cancel", id: "voice-1" }));
  speech.speak.mock.calls[0][1].onDone();
  expect(send).toHaveBeenLastCalledWith("regatta:radio-speech", { id: "voice-1", status: "error", code: "cancelled" });
  bridge.dispose();
});

it("does not fall back to another language or start muted speech and rejects oversized commands", async () => {
  const { bridge, speech, send } = setup();
  bridge.handle(JSON.stringify({ type: "radio-speech", id: "muted", text: "MAYDAY", lang: "en", volume: 0 }));
  bridge.handle(JSON.stringify({ type: "radio-speech", id: "wrong-language", text: "Bonjour", lang: "fr" }));
  await flush();
  expect(speech.speak).not.toHaveBeenCalled();
  expect(send).toHaveBeenCalledWith("regatta:radio-speech", expect.objectContaining({ id: "wrong-language", code: "voice-unavailable" }));
  bridge.handle(JSON.stringify({ type: "radio-speech", id: "too-long", text: "a".repeat(6001), lang: "en" }));
  expect(send).toHaveBeenLastCalledWith("regatta:radio-speech", expect.objectContaining({ code: "invalid-request" }));
  bridge.dispose();
});

it("checks local recognition without prompting and refuses missing on-device models", async () => {
  const { bridge, recognition, send } = setup();
  recognition.supportsOnDeviceRecognition.mockReturnValue(false);
  bridge.handle(JSON.stringify({ type: "radio-asr", id: "availability-1", action: "availability", lang: "en" }));
  await flush();
  expect(send).toHaveBeenCalledWith("regatta:radio-asr", expect.objectContaining({ available: false, code: "model-unavailable" }));
  bridge.handle(JSON.stringify({ type: "radio-asr", id: "asr-1", action: "start", lang: "en" }));
  await flush();
  expect(recognition.requestMicrophonePermissionsAsync).not.toHaveBeenCalled();
  expect(recognition.start).not.toHaveBeenCalled();
  bridge.dispose();
});

it("always starts local-only recognition without audio persistence and ignores late cancelled results", async () => {
  const { bridge, recognition, handlers, send } = setup();
  bridge.handle(JSON.stringify({ type: "radio-asr", id: "asr-1", action: "start", lang: "fr" }));
  await flush();
  expect(recognition.start).not.toHaveBeenCalled();
  bridge.handle(JSON.stringify({ type: "radio-asr", id: "asr-2", action: "start", lang: "en-US" }));
  await flush();
  expect(recognition.start).toHaveBeenCalledWith(expect.objectContaining({ requiresOnDeviceRecognition: true, recordingOptions: { persist: false }, lang: "en-GB" }));
  handlers.start();
  handlers.result({ results: [{ transcript: "MAYDAY WIND DANCER" }], isFinal: false });
  expect(send).toHaveBeenLastCalledWith("regatta:radio-asr", expect.objectContaining({ transcript: "MAYDAY WIND DANCER", isFinal: false }));
  bridge.handle(JSON.stringify({ type: "radio-asr", id: "asr-2", action: "cancel" }));
  const calls = send.mock.calls.length;
  handlers.result({ results: [{ transcript: "late other answer" }], isFinal: true });
  expect(send).toHaveBeenCalledTimes(calls);
  expect(recognition.abort).toHaveBeenCalledTimes(1);
  handlers.end(); bridge.dispose();
});

it("cannot open the microphone after a short press was released during permission hydration", async () => {
  const { bridge, recognition } = setup();
  let resolve!: (value: { granted: boolean; canAskAgain: boolean }) => void;
  recognition.getMicrophonePermissionsAsync.mockReturnValueOnce(new Promise(done => { resolve = done; }));
  bridge.handle(JSON.stringify({ type: "radio-asr", id: "short-press", action: "start", lang: "en" }));
  await flush();
  bridge.handle(JSON.stringify({ type: "radio-asr", id: "short-press", action: "stop" }));
  resolve({ granted: false, canAskAgain: true }); await flush();
  expect(recognition.requestMicrophonePermissionsAsync).not.toHaveBeenCalled();
  expect(recognition.start).not.toHaveBeenCalled();
  bridge.dispose();
});

it("waits for the cancelled native session to end before accepting the next activity's speech", async () => {
  const { bridge, recognition, handlers, send } = setup();
  bridge.handle(JSON.stringify({ type: "radio-asr", id: "first", action: "start", lang: "en" }));
  await flush(); handlers.start();
  bridge.handle(JSON.stringify({ type: "radio-asr", id: "first", action: "cancel" }));
  bridge.handle(JSON.stringify({ type: "radio-asr", id: "second", action: "start", lang: "en" }));
  await flush();
  expect(recognition.start).toHaveBeenCalledTimes(1);
  handlers.result({ results: [{ transcript: "late first phrase" }], isFinal: true });
  expect(send).not.toHaveBeenCalledWith("regatta:radio-asr", expect.objectContaining({ id: "second", transcript: "late first phrase" }));
  handlers.end(); await flush();
  expect(recognition.start).toHaveBeenCalledTimes(2);
  handlers.start(); handlers.result({ results: [{ transcript: "second phrase" }], isFinal: true });
  expect(send).toHaveBeenLastCalledWith("regatta:radio-asr", expect.objectContaining({ id: "second", transcript: "second phrase" }));
  handlers.end(); bridge.dispose();
});

it("serializes bridge events without executable interpolation", () => {
  const script = radioSpeechEventScript("regatta:radio-asr", { id: "safe", transcript: '\"; throw new Error("injected"); //' });
  const dispatchEvent = jest.fn();
  const Event = function(this: { type: string; detail: object }, type: string, options: { detail: object }) { this.type = type; this.detail = options.detail; };
  new Function("window", "CustomEvent", script)({ dispatchEvent }, Event);
  expect(dispatchEvent).toHaveBeenCalledWith(expect.objectContaining({ detail: { id: "safe", transcript: '\"; throw new Error("injected"); //' } }));
});
