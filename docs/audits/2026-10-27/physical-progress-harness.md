# P04: ordered physical progress checkpoint

## Scope

The primary completion program remains P00-P12. Ads and eSail are background tasks, as the owner clarified on 27 October. This checkpoint adds a pure physical progression boundary. It does not activate a race, change a force/heading constant, integrate a fleet or ship a binary.

`src/lib/race-physical-progress.ts` derives start, three ordered rounding gates and finish from the canonical physical course descriptor. All three profiles retain their registered geometry, 8.1-26 m rounding interval and 100 m start/finish. The exported immutable gate description can later serve visible guidance without a second set of coordinates.

The caller supplies the immutable propelled segment returned by `stepPhysicalBoat`, before collision separation. Only this segment can award progress. Display-position recovery, collision pushes, countdown, wrong direction, a line extension, inner shortcuts, far bypasses and skipped rounding stages cannot award the corresponding gate. Unknown/mismatched context and inconsistent progress return null before mutation. A completed boat retains its first finish time.

## Evidence and limits

- 18 direct cases cover all three profiles, ordered stages, countdown, actual-versus-display position, line direction/extensions, invalid geometry and 11 inconsistent progress states. These are unit contracts, not full fleet acceptance.
- 41 existing physical motion and9generated-server drift cases pass alongside those 18 cases. The frozen legacy trajectory suite and complete root suite follow the normal source gate; they are not replaced by this targeted run.
- Live physical emission remains OFF. Native PB/classes, recorder bounds, visible guidance, hardware contact, actual course selection and installed acceptance remain mandatory before activation.

## Completed source gate

[Source proof](checks/physical-progress-source.json) records the input hashes and scope. All 1658 root tests in 162 files pass with one worker, including the 12 frozen legacy trajectories. Root types, changed-source lint, production build, the unchanged 6.5 MiB static budget, all three offline packages, content twins, generated server, real WebSocket lifecycle, map and typography pass. No native runtime file or installed package changes in this checkpoint.

The first concurrent root run had nine existing-test timeouts and two worker RPC timeouts. It is retained as failed evidence. The later whole run uses one worker with the same assertions and test timeouts; resource contention is consistent with the observations, but is not proven as the sole cause. This does not transform the failed fleet research below into accepted integration.

## Fleet research did not pass

A separate draft exercised the real 30 Hz force/motion integration with five boats, actual windAt(seed 3), normal and shifting wind multipliers 0.65/1/1.3, ordinary and early starts, and the existing 480/1200/2400 s profile limits. Single short boats and medium/long normal fleets passed in one baseline, but short fleets were inconsistent. A later short-recovery variant passed normal/strong/early short cases and failed the weak-wind short fleet. A following closing-speed-yield variant again failed normal/weak/strong short cases. None is accepted or integrated.

The draft exposed two concrete legacy-planner assumptions: low-speed tack changes are suppressed below 2 kn; and unconditional following-yield can ease sails even without closing speed. Those observations do not prove that either isolated correction solves the full fleet. Tight tacking, missed gates, collision damping and recovery still interact. Do not report a solved turning/traffic model from one passing route or silently change the deadline, gates, fleet size or force fixtures to obtain green.

The eight exact research files, base commit and SHA256manifest are preserved outside Git in the task's private evidence directory `physical-fleet-research-2026-10-27`. Failed logs remain beside it. Unused avoidance/contact implementations have been removed from the candidate after hash verification. Current live planner/motion source is restored byte-for-byte to the frozen 69 baseline, keeping this accepted checkpoint independent of the failed experiments. This cleanup does not remove saved user races or other worktrees.

Further isolated27October trials remain unaccepted. Closing-speed-aware following yielded5/5normal and5/5strong short finishes but2/5weak; a static ID-priority trial worsened those journeys and is rejected. Preserving steerage while easing still yields only2/5weak; holding an escape until hull clearance yields3/5weak. No case deadline, fleet size, gate or force constant changed. The original eight-file manifest is unchanged, and all later proposals/logs remain private. These interacting counterexamples support the explicit metric path/recovery redesign below, not another unverified parameter change in the live planner. Independent main radio work can proceed while this engine gate remains open.

## Next ordered engine gate

1. Design an explicit metric bot path/recovery contract from the same ordered gates and shared helm law. Treat traffic avoidance as bot input, separate from teaching adjudication.
2. Keep the failing full-fleet cases and original course limits. Add path/event observations to distinguish late progress from repeated gate misses or contact stalls.
3. Accept every profile/condition/early-start journey before integrating hardware contacts, judge/guidance/recorder and new result emission.
4. Re-run legacy numerical/server, complete source/browser and exact installed gates, then freeze a separate release checkpoint. TestFlight 68 remains the independently delivered baseline; 69 is a separate prepared candidate until its delivery gates actually finish.

## Exact cloud follow-up

[Cloud proof](checks/physical-progress-browser.json): safe non-main run40433627140 on6fcf passes all78browser cases with one attempt each and no flaky/skipped/unexpected outcomes. Artifact12703334346 matches SHA25642f2e3bf189f190b93c1289580f94139f84fc45583702db92ce44dbe22dacc4f. Publication, deployment and production jobs were skipped. This accepts that source checkpoint and prior browser bundle. The later scene-stage probe and fresh native69 startup are separate gates.
