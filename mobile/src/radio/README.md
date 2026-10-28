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

The iOS probe checks each matching requested-language locale, preferring the
exact dialect. It never substitutes the phone's default-language capability.
`regattaOnDeviceRecognitionAvailable(locale)` is added by the checked prebuild
plugin and creates a recognizer for that supported locale, checking both
availability and local support. An older binary without this method stays on
typed fallback. Android keeps its capability and installed-locale checks.
This change requires a new native binary, not just regenerated WebView HTML.

## SDK54 constraints

Free practice uses the same ASR adapter through `FreeSpeechPractice.tsx`, with
provisional text and final rows only after both native end and actual PTT
release. Its separate session limit is8rows of1000characters and a45second
hold. Clear/navigation/background/reset cancel pending work; a late result
cannot restore cleared text. Text and audio are not persisted or sent over the
network. The canonical local journal receives only closed `radio.speech`
lifecycle/outcome fields. Typing remains available without a model or permission
and grants no assessment or lesson credit.

- `expo-speech`14.0.8 accepts JS volume but its upstream native code omits it. `plugins/with-local-radio-speech.js` adds the Swift utterance and Android TTS volume assignments. Android voice enumeration excludes voices requiring a network connection.
- `expo-speech-recognition`3.1.3, the upstream SDK54 package, conditionally assigns the on-device request flag. The plugin makes that assignment unconditional, so unsupported local recognition fails instead of falling back to a server.
- Its iOS no-argument availability/local-support functions use the phone's default language. The plugin adds a selected-locale probe without changing those upstream functions. Both recognition source anchors are validated before either file is written.
- Every patch validates the exact package version and source anchors before writing; repeated prebuilds are idempotent. Review and update these assertions when upgrading either package. Fresh native prebuild and a new binary are mandatory.
- Permission descriptions use the existing seven `mobile/locales/*.json` files. The microphone purpose describes SRC practice only. Installed Sternik oral practice checks typed answers and does not request a microphone.

Primary references: [Expo Speech](https://docs.expo.dev/versions/latest/sdk/speech/), [speech recognition package](https://github.com/jamsch/expo-speech-recognition). Actual SDK54 signatures and native behavior were also checked in the installed14.0.8/3.1.3 sources.

Apple distinguishes the [default-language initializer](https://developer.apple.com/documentation/speech/sfspeechrecognizer/init%28%29)
from the [selected-locale initializer](https://developer.apple.com/documentation/speech/sfspeechrecognizer/init%28locale%3A%29).
An initialized recognizer alone does not establish recording or successful
on-device recognition.

## TestFlight support journal

The native adapter independently records availability, received start/release,
actual permission request, engine start, end and classified errors with
`source:native`. Intermediate recognition samples, words, audio and request
IDs are excluded. Native end/recognized means the engine returned text; the
WebView's later release/result establishes session submission separately.
Logger failure cannot prevent recognition. Capability failures remain a coarse
model/service bucket, not proof of a downloaded model's absence.

After a short test, open Menu -> Settings -> Diagnostics -> Copy journal and paste the
copy for support. The copy is a versioned `regatta-diagnostics` envelope with
app version/build/platform and the unchanged canonical journal in `journal`.
Copy includes all journal events even when the screen filters failures. It
does not send anything automatically. The200entry/64KiB/48h persistence bounds
and dropped counter remain; copy before a long later test evicts the event.

Run `npm run typecheck` and the `local-radio-speech`, `local-radio-speech-plugin`, `app-config`, `webview-analytics-consent` Jest suites before rebuilding. A simulator without a speech model must expose the typed fallback; do not claim that a mock test verifies a physical microphone or voice pack.

App context identifies the exporting build. Historical journal sessions may
come from earlier builds; do not assign the exporting version to every row.
