# Local SRC speech

`useLocalRadioSpeech` scopes the system speech engines to the bundled SRC WebView. It cancels speech and recognition when the activity loses focus, the app backgrounds or the WebView leaves local mode. No startup permission prompt, HTTP call or audio file is owned by this bridge.

## Messages

- TTS: `{type:"radio-speech",id,text,lang,volume?,rate?}`. Language is one of the seven app languages or its supported locale. Radio messages request English independently of the interface language.
- Stop TTS: `{type:"radio-speech",action:"cancel",id?}`. Omitting id cancels the current utterance.
- ASR: `{type:"radio-asr",id,action:"availability"|"start"|"stop"|"cancel",lang}`.
- Native dispatches `regatta:radio-speech` with `id,status:started|done|error,code?` and `regatta:radio-asr` with `id,status:availability|started|result|end|error,available?,locale?,transcript?,isFinal?,code?`.

The startup flags are `__REGATTA_NATIVE_SPEECH__` and `__REGATTA_NATIVE_ASR__`. IDs, languages, text length, message size, rate and volume are bounded. Only the local WebView forwards this channel. The bridge returns transcripts, never a made-up passing grade.

## Offline behavior and permissions

TTS selects an available voice of the requested language. An absent voice returns `voice-unavailable`; written model phrases remain usable. Muting cancels playback. Native volume is applied by the version-checked prebuild patch below.

ASR always passes `requiresOnDeviceRecognition:true` and `recordingOptions.persist:false`. Availability checks never request permissions. Only a user-started recognition command can request microphone permission. There is no server or automatic model download fallback. A missing model, denied permission or native error returns a code for the localized typed-answer fallback.

iOS lists supported locales without proving that a language model is downloaded. Therefore availability means device capability; only the native `started` event signals recording. A later model error remains a local failure. Releasing PTT while permission hydration is pending cannot start recording afterwards. Cancelled transcripts cannot grade another activity.

## SDK54 constraints

- `expo-speech`14.0.8 accepts JS volume but its upstream native code omits it. `plugins/with-local-radio-speech.js` adds the Swift utterance and Android TTS volume assignments. Android voice enumeration excludes voices requiring a network connection.
- `expo-speech-recognition`3.1.3, the upstream SDK54 package, conditionally assigns the on-device request flag. The plugin makes that assignment unconditional, so unsupported local recognition fails instead of falling back to a server.
- Every patch validates the exact package version and source anchors before writing; repeated prebuilds are idempotent. Review and update these assertions when upgrading either package. Fresh native prebuild and a new binary are mandatory.
- Permission descriptions use the existing seven `mobile/locales/*.json` files. The microphone purpose describes SRC practice only. Installed Sternik oral practice checks typed answers and does not request a microphone.

Primary references: [Expo Speech](https://docs.expo.dev/versions/latest/sdk/speech/), [speech recognition package](https://github.com/jamsch/expo-speech-recognition). Actual SDK54 signatures and native behavior were also checked in the installed14.0.8/3.1.3 sources.

Run `npm run typecheck` and the `local-radio-speech`, `local-radio-speech-plugin`, `app-config`, `webview-analytics-consent` Jest suites before rebuilding. A simulator without a speech model must expose the typed fallback; do not claim that a mock test verifies a physical microphone or voice pack.
