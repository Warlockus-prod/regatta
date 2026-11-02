# Simulator V3 - behavioral contracts

Use this file before and during implementation. These are the testable contracts that define whether V3 is actually improving.

---

## Contract 1 - healthy default

Opening V3 in its default state must show:

- boat already moving
- no critical warning
- trim score in healthy range (100%: the default sheets are the solver's, Contract 8)
- both sails visibly working

Failure signs:

- stalled default
- red badges on load
- dead-looking scene

---

## Contract 2 - live overtrim response

When the user overtrims the main on a healthy beam-reach state:

- drive should visibly reduce over a short live transition
- speed should fall after that
- feedback should name main overtrim or stall

Failure signs:

- instant jump to final value
- numbers change but scene reads the same
- feedback talks about a different problem

---

## Contract 3 - live reef recovery

In a heavy-air scenario:

- taking reef should lower heel over time
- forward motion should remain
- commentary should shift from overload to recovery

Failure signs:

- heel stays flat
- reef makes the boat look dead instantly
- top and rear views disagree

---

## Contract 4 - single runtime state

Top and rear view must always represent the same simulation snapshot.

Failure signs:

- different heel story between views
- different sail state between views
- toggling view causes recompute artifacts

---

## Contract 5 - deterministic reset

Reset must restore:

- wind
- boat state
- control targets
- active scenario or drill
- derived diagnostics

Failure signs:

- reset outcome drifts across attempts
- default state quality changes after several cycles

---

## Contract 6 - primary feedback stays singular

At any moment, commentary should present one dominant message.

Failure signs:

- competing messages in different parts of the UI
- vague text not tied to metrics
- multiple equally urgent problems shown at once

---

## Contract 7 - mobile remains teachable

On mobile, the user must be able to:

- read the scene
- operate primary controls
- understand the current problem

without losing context through scrolling or visual overlap.

Failure signs:

- pods cover the boat
- main controls are pushed off-screen
- commentary becomes unreadable

---

## Contract 8 - one sheet solver

(Package 13 stage D, ADR-0022.) The auto-trim switch, "Best", the course
presets, "Best VMG" and the ghost of the best trim read one solver,
`src/lib/helm-trim.ts`: the race crew's `trimForDrive` on the boat's own
apparent wind. The trim score's 100% is that solver at rest on the course
(`restingTrim`), so the free default (TWA 90, 12 kn, sheets 36 / 43 deg) opens
at 100%.

- with the auto-trim on, the sheets move to the solver's answer at winch speed
  and land where "Best" puts them (6 / 12 / 20 kn on the cruiser,
  `runtime/auto-trim.test.ts`)
- touching a sheet or twist turns the auto-trim off; a change the solver made
  does not
- "Best VMG" sails the best VMG angle of `src/lib/helm-angles.ts` on the
  race's cruiser polar, upwind when the boat sails 90 deg or higher, downwind
  below, on the tack it is on; upwind never inside the 42 deg no-go cone the
  Trainer draws (in 12 kn and more the polar's 40 deg becomes 42)

Failure signs:

- "Best" and the auto-trim settle on different sheets
- the trim score reads 100% on a setting the solver beats
- a preset or "Best VMG" keeps a table of angles of its own

---

## Contract 9 - "Show me" is never the learner's pass

In a drill (also the lesson drill `?drill=hold-trim`), "Show me" turns the
auto-trim on so the learner sees the right setting. The attempt ends as
"shown": it never passes, however long the condition then holds. "Best", a
course preset or the auto-trim during an attempt do the same. Only a new
attempt ("Now you"), sailed by the learner, can pass.

Failure signs:

- "DONE" after "Show me" without a new attempt
- the hold counter fills while the boat is trimmed for the learner
