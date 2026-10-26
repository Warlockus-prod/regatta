# Remaining action and outcome diagnostics

Source audit and ordered follow-up,2026-10-26, after radio cancellationda3a5b2.
The bounded journal already covers significant controls, startup/navigation,
radio hardware and actual race-history/checkpoint acknowledgements. The request
for all meaningful actions/outcomes is not complete. Physics frames, private
answers, transmissions, microphone content, locations and raw storage remain
outside this journal. Its200-entry/64KiB/48h limits and lack of automatic upload
are unchanged.

| ID | Scope | Current state and remaining behavior |
| --- | --- | --- |
| D01 | Personal best persistence | Web source checked: failed read blocks write, failed write cannot claim a saved new record; bounded personal-best target records actual read/write outcomes. Native PB durability remains pending and separate from history ACK or synchronous web return. |
| D02 | Assessment correctness | Pending. The defined learning.command family has no production adapters. Emit actual start/check/next/complete with a closed pass/fail value, without answer/text/option/question payloads. Opening a lesson is never completion. |
| D03 | Progress writes/retry | Pending. Log actual Foundation/Sails progress completion/failure after storage or native ACK, preserving pending work and retry. An answer check and its save are separate facts. |
| D04 | Optional cloud results | Pending. Ask, legacy remote Coach, global leaderboard and feedback need safe request/retry/response classifications; no prompts, replies, contacts, URLs or raw errors. Known world Coach remains local. |
| D05 | Web SRC speech service | Pending. Distinguish service failure, silence, fallback and actual recognition without logging audio/transcripts or grading service failure as an incorrect answer. |
| D06 | Native Sternik guarded exit | Source checked below; installed65 request/Stay/Exit on26.5 passed, with exactly one cancelled/noop after Stay. Duplicate/stale/system-dismiss branches retain source tests; the complete installed guard catalog remains open. |
| D07 | Native recovery controls | Pending. Basics fallback heading/reset must log committed control results/noops, without per-frame pointer samples or coordinates. |
| D08 | History clear and saved-record rejection | Native source checked for actual history read and awaited serial clear, including failure and no resurrection. Empty65 RU/PL History/Personal screens and Back passed; nonempty registered/unknown presentation, real clear/failure and every entry adapter remain pending. No saved IDs or trajectories enter diagnostics. |
| D09 | External course link handoff | Pending. Log resolved/rejected system handoff, never claim remote page load or include URL/recipient/phone/title. |

## D06 source checkpoint

LocalCourseWebView is currently the native Polish Sternik host. A real dirty-exam
prompt emits navigation/request accepted with fixed sternik/motor/native tags.
Each prompt owns a settled flag: Stay plus system onDismiss produces one
cancelled/noop event. A stale prior dismiss cannot settle a new prompt, and
confirmed Exit prevents a later dismiss from inventing cancellation. Duplicate
prompt suppression does not invent a departure.

The original blocked navigation action is dispatched unchanged. No action object,
exam answer or Polish prompt text enters the journal. Recorder failure cannot
block the guard. Existing clean exit, WebView behavior and exam copy are retained.

Real-handler focused tests11/1file pass, native types/scoped lint/diff checks
pass and independent source review finds no blocker. The combined native suite
passes525tests/73suites. This is source/component evidence, not an installed
TestFlight walkthrough or completion of D01-D09. APP64 remains frozen at ef180df.

Build65b0 installed26.5 now verifies the actual dirty-exam prompt request,
Stay returning to the still-running exam and one native cancelled/noop, then a
second request and Exit returning Menu. The journal contains fixed motor tags
and no answers. `checks/native65-delivery.json` owns the fresh scope. This
does not promote the other diagnostic rows or every system-dismiss branch.
