# Free radio speech practice

Owner-approved P07 in the [completion program](../2026-10-26/completion-program.md). This is a main product task. Ads/eSail remain background extras; P04 weak-wind fleet recovery stays open independently.

## Intended behavior

- Free practice keeps the radio visible and adds an inline speech panel in its reserved task dock. Existing scenario/exam grading remains separate.
- Actual powered, voice-capable PTT starts strict on-device English recognition. Live draft is visibly provisional; only an ended and released utterance becomes a session row. Device failure or silence is not a wrong answer.
- Keep at most eight session rows and1000characters per row. Limit a free hold to45seconds. No audio file, HTTP transcription, localStorage/AsyncStorage transcript, assessment score or lesson credit is added.
- Typing is explicitly labelled and works offline on web/native. Native speech/model/permission unavailability leaves that input usable. Web typing is not described as microphone recognition.
- Cancel, pointer cancellation, page background, unmount, reset and model change discard a pending utterance. Clear also cancels the active request and removes the session rows. Old asynchronous events cannot revive them.
- General diagnostics contain only closed lifecycle/outcome fields. Text/audio, raw errors, scenario answers and voice content never enter that journal.
- Labels use the shared seven-language boundary, with PL/RU/EN first in rendered acceptance. Sternik and exact English radio phrases are unchanged.

## Ordered gates

1. Shared recognition state tests cover actual start, interim/end/release, early release, silence, denied/unavailable, duplicate/stale events and cancellation without invented success.
2. Real component/handler tests cover powered versus off/CH70, typed input, bounded rows/text/hold, Clear/reset, native-bridge cancellation and transcript-free diagnostics.
3. Refresh all three installed packages; root/native types, unit suites, lint, build/budget, server/socket, map/dash and exact browser gate.
4. Render the real free-practice dock and preserved radio in narrow/wide layouts, PL/RU/EN, including typed fallback and actual callbacks. Synthetic bridge events test contracts only; they never certify real microphone recognition.
5. Freeze an exact native candidate and verify retained/new install, first radio entry, Back, typed fallback, unavailable/cancel and data preservation. A physical microphone/model walkthrough stays explicit until actually observed.
6. Archive/export/upload only after the release harness. Independent Apple GET must confirm the exact build, Self and notes. TestFlight68 remains delivered until that happens.

## Current state

The mounted free-practice panel now shares the existing on-device recognition
hook and the actual hardware PTT. Draft and end/release outcomes are explicit;
typing uses a separate label and grants no score. Pointer cancellation while
held discards the request. A pointerleave/blur after genuine release preserves
the final native result still arriving. Clear always cancels pending work;
power/channel changes, background and unmount cannot submit a stale draft.

The first complete web run found a stale generated catalog inventory, and the
first production budget was red at6.51MiB. Neither failure was accepted. All
seven reviewed adaptations now enter the existing catalog builder, which also
checks a generated minimal source-label map. A following production build is
within the unchanged6.5MiB limit; no language or acceptance assertion was
removed. Actual catalog tests resolve every new label in all seven languages.

The current offline package includes the panel. Manual browser observation
confirms Polish/Russian session-only typed entry, Clear and course return at
390x740; the radio remains above its independently scrolling dock. Exact cloud
acceptance now passes82first-attempt cases with no flaky, skipped or unexpected
result. Exact installed and physical-microphone acceptance remain partial or
pending. Synthetic
bridge cases explicitly test actual React lifecycle and diagnostic/privacy
contracts, not the physical microphone or OS model.

No69 upload/Apple write has occurred. Delivered68 and the frozenf3 observation
binary are unchanged. Main P04 weak-wind fleet recovery stays open; Ads/eSail
remain background extras.

## Checkpoint916 evidence

- [Source](checks/radio-free-source.json):1721web tests/169files,
  589native tests/79suites, types/lint/packages/map/dash, unchanged server and
  real sockets. Production is6814832bytes below the unchanged6815744byte cap.
  Future runtime additions require real size work; the remaining912bytes are
  not a reason to relax the cap.
- [Cloud](checks/radio-free-browser916.json): exact916a9ea,
  run40444566093/artifact12707858543,82/82with one attempt each. Production
  publication/deployment remain skipped.
- [Installed partial](checks/radio-free-native916.json): official Simulator
  build31checks,121installed files match, all four prior storage keys preserved
  before launch. Actual native Training -> radio, mounted PL panel,
  independently scrolling dock, Exit -> Training and repeat entry are observed.
  Mac automation emitted short taps rather than a real DIAL hold; its closed
  journal records power-off rejection. Keyboard forwarding did not activate
  DIAL. A manual hold request is pending. Native typing/PTT/model cancellation
  and a physical microphone are not accepted from this evidence.

The source rollback before P07 is2eee0ac. Runtime source916a9ea and its
frozen121-file Simulator package are preserved independently of later work.

## Following reset correction

The following source uses a monotonic practice generation, incremented on
every scenario start/reset. It replaces the free panel's `Date.now()` identity
and returns the independently scrolling dock to its top, even when the reset
retains the same step and mode. Wall-clock time continues to measure elapsed
exercise time only.

The actual PTT browser journey now fixes Date without pausing timers. It first
retains a recognized transmission, then releases another pending utterance,
clicks the real Reset exercise settings button and emits the old native end.
The expected state is empty history/preview, powered-off radio and dock top;
the real DIAL hold then powers the new session for the remaining checks.

Exact89ced94 [source proof](checks/radio-reset-source.json) passes1760web
cases in171files with two workers,589native cases in79suites, root/native
types/lint,9release tools, all three packages/content twins, catalog, generated
server, real sockets and production build. The unchanged6815744byte cap holds
at6814872bytes. The initial overlapping local run had three test timeouts and
one worker RPC timeout; it is retained and not accepted. No assertion or test
timeout was relaxed, and contention as the sole cause is not proven.

Manual actual English typing/reset returns to0/8, empty preview and dock top
at390x740. Temporary browser sizing is restored.

Exact [cloud89](checks/radio-reset-browser89.json), run40450421511 and downloaded
artifact12710204023, has81first-attempt cases and one flaky case. All four
free-speech journeys, including fixed-Date Reset/stale result, pass first
attempt. The controls-lesson667px case sampled a null LCD bounding box after
its dock appeared,493ms into the case; retry passed. No out-of-bounds result
was observed. Missing explicit faceplate readiness is a test-contract gap;
the report alone does not establish the transient null's exact cause.

Readiness child36cb83b retries all original geometry assertions within the
existing10s assertion budget and unchanged30s case. Coordinates,1px bounds,
scrolling and required controls are preserved. Exact [cloud36 proof](checks/radio-readiness-browser36.json)
records82first-attempt cases, zero flaky/skipped/unexpected, from downloaded
and digest-checked artifact12711311268/run40452106933. Publication/deployment
remain skipped. This completes that source/browser gate; native typing/PTT
and microphone still require actual acceptance. The earlier81+1flaky report
stays historical.

Exact [installed89](checks/radio-reset-native89.json) passes31package checks
and121installed-file hashes on retained26.5. All16prior storage keys remain
byte-identical before launch. Native Home -> Training -> actual PL radio
panel -> Exit -> native Training is observed. Its WebKit accessibility subtree
is unavailable through the Mac tool. Native typed reset, DIAL/PTT/model and
physical microphone are not accepted. Fresh27 retains frozen916 unchanged and
its manual hold request. The frozen89 package is preserved separately.

This correction is not included in frozen916 or its82case proof. Its lack of
physical microphone acceptance and the pending manual native hold remain
explicit. TestFlight68 is still the delivered binary.

## Human power-on follow-up on frozen916

The owner confirmed a real DIAL hold on fresh27. Actual UI shows powered CH16
and the localized unavailable English-recognition state. All121installed files
still match frozen916. The bounded canonical journal records two closed
availability outcomes; [powered916 proof](checks/radio-powered-native916.json)
contains no speech content. The availability boolean does not distinguish a
missing model from Simulator capability, so that cause remains unknown.

Mac coordinate actions now fail even after rebinding/AX Raise while screenshots
and native AX remain readable. No PTT click was delivered by those attempts.
A separate manual PTT/typing request is pending. This does not certify actual
microphone recognition, following89reset, native095 or delivery69.


## Following installed916 typed practice and unavailable PTT

The [following native proof](checks/radio-typed-native916.json) rehashes all121
installed files to exact frozen916 after the owner's earlier DIAL power-on.
PL typing, actual Add, cleared input/updated preview, actual Clear and native
Exit to Training are observed. Canonical events record typed entered/accepted,
clear/accepted and PTT unavailable/failed, without transmission words.

The same six storage keys remain before/after typed Add and Clear; only the
diagnostic key's hash changes in each interval. Raw journals/storage and
screenshots remain private. The screen capture hashes are in the proof.

Compact Device Hub restored coordinate actions. Keyboard focus made the field
visible; final window is full Hub, portrait/Fit and Capture Keyboard OFF. The
pending human text-entry request is superseded by these actual observations.
This does not prove a real PTT hold/microphone/model result, installed source89
monotonic reset or full69acceptance. No Apple writes occurred.
