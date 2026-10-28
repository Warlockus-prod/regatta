import type * as Speech from "expo-speech";
import type { ExpoSpeechRecognitionModuleType } from "expo-speech-recognition/build/ExpoSpeechRecognitionModule.types";
import type { DiagnosticInput } from "../../../src/lib/diagnostics";

export type LocalRadioRecognition = ExpoSpeechRecognitionModuleType & {
  /** Added by the checked SDK54 prebuild plugin. Absent in older binaries. */
  regattaOnDeviceRecognitionAvailable?: (locale: string) => boolean;
};
type SpeechEngine = Pick<typeof Speech, "speak" | "stop" | "getAvailableVoicesAsync">;
type Detail = Record<string, string | boolean | number | undefined>;
const locales: Record<string, string> = { en: "en-GB", ru: "ru-RU", pl: "pl-PL", es: "es-ES", fr: "fr-FR", de: "de-DE", it: "it-IT" };
const idValid = (id: unknown): id is string => typeof id === "string" && /^[a-zA-Z0-9_-]{1,100}$/.test(id);
const language = (raw: unknown) => typeof raw === "string" && (locales[raw] ?? Object.values(locales).find(value => value.toLowerCase() === raw.toLowerCase()) ?? (raw === "en-US" ? raw : null));
const finite = (value: unknown, min: number, max: number): value is number => typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
const sameLanguage = (a: string, b: string) => a.replaceAll("_", "-").toLowerCase() === b.toLowerCase();

/** Only bounded local activity messages reach system speech. No HTTP or audio files. */
export function createLocalRadioSpeech({ speech, recognition, platform, send, record }: {
  speech: SpeechEngine;
  recognition: LocalRadioRecognition | null;
  platform: "ios" | "android" | string;
  send: (event: "regatta:radio-speech" | "regatta:radio-asr", detail: Detail) => void;
  record?: (event: DiagnosticInput) => unknown;
}) {
  let disposed = false;
  let generation = 0;
  let spoken: { id: string; ticket: number; timeout?: ReturnType<typeof setTimeout> } | null = null;
  let listening: { id: string; ticket: number; started: boolean; requested: boolean; transcript: string; segments: string[]; timeout?: ReturnType<typeof setTimeout> } | null = null;
  let closing: Promise<void> | null = null;
  let finishClosing: (() => void) | null = null;
  let abortTimedOut = false;
  const postSpeech = (id: string, status: string, code?: string) => { if (!disposed) send("regatta:radio-speech", { id, status, code }); };
  const logAsr = (event: Omit<Extract<DiagnosticInput, { type: "radio.speech" }>, "type" | "surface" | "input" | "source">) => {
    try { record?.({ type: "radio.speech", surface: "radio", input: "voice", source: "native", ...event }); }
    catch { /* Diagnostics cannot control recording or expose native errors. */ }
  };
  const postAsr = (id: string, status: string, extra: Detail = {}) => {
    if (disposed) return;
    if (status === "availability") logAsr({ action: "availability", available: extra.available === true, outcome: "accepted",
      ...(extra.available === true ? {} : { reason: !recognition || platform === "ios" && !recognition.regattaOnDeviceRecognitionAvailable ? "unsupported" : "model-unavailable" }) });
    else if (status === "started") logAsr({ action: "started", outcome: "accepted" });
    else if (status === "end") logAsr({ action: "result", status: typeof extra.transcript === "string" && extra.transcript.trim() ? "recognized" : "silent",
      outcome: typeof extra.transcript === "string" && extra.transcript.trim() ? "accepted" : "noop" });
    else if (status === "error") {
      const code = extra.code;
      logAsr({ action: code === "cancelled" ? "cancel" : "result", outcome: code === "cancelled" || code === "no-speech" ? "noop" : "failed",
        status: code === "cancelled" ? "cancelled" : code === "no-speech" ? "silent" : code === "permission-denied" ? "denied" : code === "model-unavailable" ? "unavailable" : "error",
        reason: code === "permission-denied" ? "permission" : code === "model-unavailable" ? "model-unavailable" : code === "speech-timeout" ? "timeout" : code === "cancelled" ? "cancelled" : "unknown" });
    }
    send("regatta:radio-asr", { id, status, ...extra });
  };
  function stopSpeech(code = "cancelled") {
    const old = spoken; spoken = null;
    if (old) { clearTimeout(old.timeout); postSpeech(old.id, "error", code); }
    try { void speech.stop().catch(() => undefined); } catch { /* Native teardown can outlive the screen. */ }
  }
  function cancelAsr(code = "cancelled") {
    const old = listening; listening = null; generation += 1;
    if (old) { clearTimeout(old.timeout); postAsr(old.id, "error", { code }); }
    if (old?.requested && recognition) {
      closing = new Promise(resolve => {
        const timeout = setTimeout(() => { abortTimedOut = true; finishClosing = null; closing = null; resolve(); }, 2000);
        finishClosing = () => { clearTimeout(timeout); abortTimedOut = false; finishClosing = null; closing = null; resolve(); };
      });
      try { recognition.abort(); } catch { finishClosing?.(); }
    }
  }
  async function availability(lang: string) {
    if (abortTimedOut || !recognition) return null;
    // The SDK's iOS no-argument checks create a recognizer for the phone's
    // default locale. They cannot decide whether requested English works.
    if (platform === "ios" ? typeof recognition.regattaOnDeviceRecognitionAvailable !== "function"
      : !recognition.isRecognitionAvailable() || !recognition.supportsOnDeviceRecognition()) return null;
    const supported = await recognition.getSupportedLocales({});
    // iOS reports supported, not downloaded locales. Only a native start event
    // confirms readiness; a missing model must fail locally, never use a server.
    const candidates = platform === "android" ? supported.installedLocales : supported.locales;
    const matching = [...candidates.filter(value => sameLanguage(value, lang)),
      ...candidates.filter(value => !sameLanguage(value, lang) && value.split(/[-_]/)[0].toLowerCase() === lang.split("-")[0].toLowerCase())];
    for (const value of matching) {
      const locale = value.replaceAll("_", "-");
      if (platform !== "ios" || recognition.regattaOnDeviceRecognitionAvailable!(locale) === true) return locale;
    }
    return null;
  }
  function stopAsr() {
    const current = listening;
    if (!current) return;
    if (!current.started) { cancelAsr(); return; }
    clearTimeout(current.timeout);
    current.timeout = setTimeout(() => { if (listening === current) cancelAsr("speech-timeout"); }, 8000);
    recognition?.stop();
  }
  const listeners = recognition ? [
    recognition.addListener("start", () => {
      if (!listening?.requested || disposed) { try { recognition.abort(); } catch { /* Already stopped. */ } return; }
      clearTimeout(listening.timeout);
      listening.timeout = setTimeout(stopAsr, 90000);
      listening.started = true; postAsr(listening.id, "started");
    }),
    recognition.addListener("result", event => {
      const current = listening;
      const phrase = event.results[0]?.transcript?.slice(0, 8000);
      if (!current?.requested || disposed || !phrase) return;
      if (platform === "android") {
        current.transcript = [...current.segments, phrase].join(" ").slice(0, 8000);
        if (event.isFinal) current.segments.push(phrase);
      } else current.transcript = phrase;
      postAsr(current.id, "result", { transcript: current.transcript, isFinal: event.isFinal });
    }),
    recognition.addListener("error", event => {
      if (!listening?.requested || disposed) return;
      const code = ["language-not-supported", "service-not-allowed", "network"].includes(event.error) ? "model-unavailable" : event.error === "not-allowed" ? "permission-denied" : event.error;
      cancelAsr(code);
    }),
    recognition.addListener("end", () => {
      if (finishClosing) { finishClosing(); return; }
      if (abortTimedOut) { abortTimedOut = false; return; }
      const old = listening; listening = null;
      if (!old || disposed) return;
      clearTimeout(old.timeout); postAsr(old.id, "end", { transcript: old.transcript });
    }),
  ] : [];

  async function play(id: string, text: string, lang: string, volume: number, rate: number) {
    stopSpeech();
    if (volume === 0) { postSpeech(id, "done"); return; }
    if (listening) { postSpeech(id, "error", "microphone-active"); return; }
    const ticket = ++generation;
    spoken = { id, ticket };
    try {
      const voices = await speech.getAvailableVoicesAsync();
      if (disposed || spoken?.ticket !== ticket) return;
      const voice = voices.find(voice => sameLanguage(voice.language, lang))
        ?? voices.find(voice => voice.language.split(/[-_]/)[0] === lang.split("-")[0]);
      if (!voice) { stopSpeech("voice-unavailable"); return; }
      const finish = (status: "done" | "error", code?: string) => {
        if (spoken?.ticket !== ticket || disposed) return;
        clearTimeout(spoken.timeout); spoken = null; postSpeech(id, status, code);
      };
      spoken.timeout = setTimeout(() => stopSpeech("voice-unavailable"), 5000);
      speech.speak(text, {
        language: voice.language, voice: voice.identifier, volume, rate, useApplicationAudioSession: false,
        onStart: () => {
          if (spoken?.ticket !== ticket) return;
          clearTimeout(spoken.timeout); spoken.timeout = setTimeout(() => stopSpeech("speech-timeout"), 120000);
          postSpeech(id, "started");
        },
        onDone: () => finish("done"), onStopped: () => finish("error", "cancelled"), onError: () => finish("error", "voice-unavailable"),
      });
    } catch { if (spoken?.ticket === ticket) stopSpeech("voice-unavailable"); }
  }
  async function start(id: string, lang: string) {
    cancelAsr(); stopSpeech();
    const ticket = ++generation;
    listening = { id, ticket, started: false, requested: false, transcript: "", segments: [] };
    try {
      if (closing) await closing;
      if (disposed || listening?.ticket !== ticket) return;
      const locale = await availability(lang);
      if (disposed || listening?.ticket !== ticket) return;
      if (!locale || !recognition) { cancelAsr("model-unavailable"); return; }
      const current = await recognition.getMicrophonePermissionsAsync();
      if (disposed || listening?.ticket !== ticket) return;
      if (!current.granted && current.canAskAgain) logAsr({ action: "request", outcome: "accepted", reason: "permission" });
      const permission = current.granted ? current : current.canAskAgain ? await recognition.requestMicrophonePermissionsAsync() : current;
      if (disposed || listening?.ticket !== ticket) return;
      if (!permission.granted) { cancelAsr("permission-denied"); return; }
      listening.timeout = setTimeout(() => { if (listening?.ticket === ticket) cancelAsr("model-unavailable"); }, 10000);
      listening.requested = true;
      recognition.start({ lang: locale, requiresOnDeviceRecognition: true, interimResults: true, continuous: true, maxAlternatives: 1, addsPunctuation: false, recordingOptions: { persist: false } });
    } catch { if (listening?.ticket === ticket) cancelAsr("model-unavailable"); }
  }

  function handle(message: string): boolean {
    if (disposed || message.length > 16000) return false;
    let data: Record<string, unknown>;
    try { const parsed: unknown = JSON.parse(message); if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return false; data = parsed as Record<string, unknown>; } catch { return false; }
    if (data.type !== "radio-speech" && data.type !== "radio-asr") return false;
    if (data.type === "radio-speech" && (data.action === "cancel" || data.action === "stop")) {
      if (data.id === undefined || (idValid(data.id) && data.id === spoken?.id)) stopSpeech();
      return true;
    }
    if (!idValid(data.id)) return true;
    const id = data.id;
    if (data.type === "radio-speech") {
      const lang = language(data.lang);
      if (!lang || typeof data.text !== "string" || !data.text.trim() || data.text.length > 6000 || (data.volume !== undefined && !finite(data.volume, 0, 1)) || (data.rate !== undefined && !finite(data.rate, .1, 2))) { postSpeech(id, "error", "invalid-request"); return true; }
      void play(id, data.text, lang, data.volume as number | undefined ?? 1, data.rate as number | undefined ?? .9);
    } else if (data.action === "cancel") {
      if (id === listening?.id) cancelAsr();
    } else if (data.action === "stop") {
      if (id === listening?.id) {
        logAsr({ action: "release", outcome: "accepted" });
        stopAsr();
      }
    } else {
      const lang = language(data.lang);
      if (!lang || !["availability", "start"].includes(String(data.action))) { postAsr(id, "error", { code: "invalid-request" }); return true; }
      if (data.action === "start") { logAsr({ action: "request", outcome: "accepted" }); void start(id, lang); }
      else void availability(lang).then(locale => postAsr(id, "availability", { available: Boolean(locale), locale: locale ?? undefined, code: locale ? "on-device-supported" : "model-unavailable" })).catch(() => postAsr(id, "availability", { available: false, code: "model-unavailable" }));
    }
    return true;
  }
  return {
    handle,
    cancel: () => { stopSpeech(); cancelAsr(); },
    dispose: () => { stopSpeech(); cancelAsr(); finishClosing?.(); disposed = true; listeners.forEach(listener => listener.remove()); },
  };
}

export function radioSpeechEventScript(event: string, detail: Detail): string {
  return `window.dispatchEvent(new CustomEvent(${JSON.stringify(event)},{detail:${JSON.stringify(detail)}}));true;`;
}
