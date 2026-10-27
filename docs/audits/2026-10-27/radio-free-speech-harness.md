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
