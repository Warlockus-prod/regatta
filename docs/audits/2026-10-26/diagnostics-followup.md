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
| D01 | Personal best persistence | Pending. Failed read must block write, failed write cannot claim a saved new record. Give PB its own finite storage target, separate from race-history ACK. Native durability is separate from synchronous web return. |
| D02 | Assessment correctness | Pending. The defined learning.command family has no production adapters. Emit actual start/check/next/complete with a closed pass/fail value, without answer/text/option/question payloads. Opening a lesson is never completion. |
| D03 | Progress writes/retry | Pending. Log actual Foundation/Sails progress completion/failure after storage or native ACK, preserving pending work and retry. An answer check and its save are separate facts. |
| D04 | Optional cloud results | Pending. Ask, legacy remote Coach, global leaderboard and feedback need safe request/retry/response classifications; no prompts, replies, contacts, URLs or raw errors. Known world Coach remains local. |
| D05 | Web SRC speech service | Pending. Distinguish service failure, silence, fallback and actual recognition without logging audio/transcripts or grading service failure as an incorrect answer. |
| D06 | Native Sternik guarded exit | Source checked below; installed acceptance pending. Actual prompt request and once-only Stay/system-dismiss cancellation are recorded, with exact blocked action behavior retained. |
| D07 | Native recovery controls | Pending. Basics fallback heading/reset must log committed control results/noops, without per-frame pointer samples or coordinates. |
| D08 | History clear and saved-record rejection | Pending. Await real serial deletion before success; distinguish missing/unsupported/corrupt/read failure without saved IDs or trajectories. Preserve unknown rows and pixel/world safety. |
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
