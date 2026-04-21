# Simulator V3 - behavioral contracts

Use this file before and during implementation. These are the testable contracts that define whether V3 is actually improving.

---

## Contract 1 - healthy default

Opening V3 in its default state must show:

- boat already moving
- no critical warning
- trim score in healthy range
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
