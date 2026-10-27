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

Plan and source inspection complete. Implementation and all new acceptance gates remain pending. Current free practice has hardware actions and a guide, but no mounted voice panel for free PTT; existing on-device recognition only serves the graded activity component.
