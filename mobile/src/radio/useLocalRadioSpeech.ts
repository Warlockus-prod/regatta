import { useCallback, useEffect, useRef } from "react";
import { AppState, Platform } from "react-native";
import { requireOptionalNativeModule } from "expo-modules-core";
import { useFocusEffect } from "expo-router";
import * as Speech from "expo-speech";
import { createLocalRadioSpeech, radioSpeechEventScript, type LocalRadioRecognition } from "./local-speech";

const recognition = requireOptionalNativeModule<LocalRadioRecognition>("ExpoSpeechRecognition");
export const LOCAL_RADIO_SPEECH_SCRIPT = `window.__REGATTA_NATIVE_SPEECH__=true;window.__REGATTA_NATIVE_ASR__=${Boolean(recognition)};true;`;

/** The native module is scoped to the local SRC page and never owns network calls. */
export function useLocalRadioSpeech(inject: (script: string) => void, enabled: boolean) {
  const injectRef = useRef(inject);
  injectRef.current = inject;
  const bridge = useRef<ReturnType<typeof createLocalRadioSpeech> | null>(null);
  useFocusEffect(useCallback(() => () => { bridge.current?.cancel(); }, []));
  useEffect(() => {
    if (!enabled) return undefined;
    const current = createLocalRadioSpeech({ speech: Speech, recognition, platform: Platform.OS,
      send: (event, detail) => injectRef.current(radioSpeechEventScript(event, detail)),
    });
    bridge.current = current;
    const subscription = AppState.addEventListener("change", state => { if (state !== "active") current.cancel(); });
    return () => { subscription.remove(); current.dispose(); bridge.current = null; };
  }, [enabled]);
  return (message: string) => enabled && Boolean(bridge.current?.handle(message));
}
