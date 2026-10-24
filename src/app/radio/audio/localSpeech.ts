'use client';

interface NativeSpeechEvent { id: string; status: "started" | "done" | "error"; code?: string }
export interface LocalSpeech { kind: "local-speech"; text: string; durationMs: number }
export type VoiceAudio = ArrayBuffer | LocalSpeech;

declare global {
  interface Window {
    __REGATTA_NATIVE_SPEECH__?: boolean;
    __REGATTA_OFFLINE_BUNDLE__?: boolean;
    ReactNativeWebView?: { postMessage: (value: string) => void };
  }
}

let active: { id: string; finish: (played: boolean) => void } | null = null;
let serial = 0;
export const offlineRadio = () => typeof window !== "undefined" && (window.__REGATTA_OFFLINE_BUNDLE__ === true || navigator.onLine === false);
export const isLocalSpeech = (audio: VoiceAudio): audio is LocalSpeech => !(audio instanceof ArrayBuffer);
export const localSpeech = (text: string): LocalSpeech => ({ kind: "local-speech", text, durationMs: Math.max(1500, text.trim().split(/\s+/).length * 600 + 1000) });

export function stopLocalSpeech(): void {
  const previous = active;
  active = null;
  if (typeof window !== "undefined") {
    if (window.__REGATTA_NATIVE_SPEECH__) window.ReactNativeWebView?.postMessage(JSON.stringify({ type: "radio-speech", action: "cancel", id: previous?.id }));
    window.speechSynthesis?.cancel();
  }
  previous?.finish(false);
}

/** Native synthesis and browser voices must be installed locally. On-air speech
 * always uses English, independently of the learning interface language. */
export async function playLocalSpeech(text: string, volume = 1): Promise<boolean> {
  if (typeof window === "undefined" || !text.trim() || volume <= 0) return false;
  stopLocalSpeech();
  const id = `radio-speech-${++serial}`;
  if (window.__REGATTA_NATIVE_SPEECH__ && window.ReactNativeWebView) {
    return new Promise<boolean>(resolve => {
      const finish = (played: boolean) => {
        clearTimeout(timeout); window.removeEventListener("regatta:radio-speech", listener);
        if (active?.id === id) active = null;
        resolve(played);
      };
      const listener = (event: Event) => {
        const detail = (event as CustomEvent<NativeSpeechEvent>).detail;
        if (detail?.id !== id) return;
        if (detail.status === "done") finish(true);
        if (detail.status === "error") finish(false);
      };
      const timeout = window.setTimeout(() => finish(false), 120_000);
      active = { id, finish };
      window.addEventListener("regatta:radio-speech", listener);
      window.ReactNativeWebView!.postMessage(JSON.stringify({ type: "radio-speech", id, text, lang: "en", volume: Math.min(1, volume), rate: 0.9 }));
    });
  }
  if (!window.speechSynthesis || typeof SpeechSynthesisUtterance === "undefined") return false;
  const voice = window.speechSynthesis.getVoices().find(voice => voice.localService && /^en(?:-|$)/i.test(voice.lang));
  if (!voice) return false;
  return new Promise<boolean>(resolve => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = voice; utterance.lang = voice.lang; utterance.rate = 0.9; utterance.volume = Math.min(1, volume);
    const finish = (played: boolean) => { if (active?.id === id) active = null; resolve(played); };
    active = { id, finish };
    utterance.onend = () => finish(true); utterance.onerror = () => finish(false);
    window.speechSynthesis.speak(utterance);
  });
}
