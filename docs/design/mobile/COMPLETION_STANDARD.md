# Completion Standard - drive every task to done (code + design)

Purpose: stop work from ending half-finished or landing on the wrong branch /
build. This is the "definition of done" + the control contract for every prompt,
every subagent, and every release. If a step cannot meet this, it is NOT done.

## 0. Orient before touching anything
- **Branch:** web lives on `main`, mobile lives on `app`. `main` has a DEAD mobile
  scaffold; `app` web is PRE-OpenAI. Confirm `git branch --show-current` matches
  the layer you are changing. (Web AI routes = `main`; mobile screens = `app`.)
- **Code != build.** A mobile code change is invisible until a new build is
  archived, uploaded, AND attached to a TestFlight group (see section 3).

## 1. Code: Definition of Done (every change)
1. `npx tsc --noEmit` clean.
2. `npm run lint` clean; `npm test` green (mobile) / physics + playwright (web).
3. No em-dash (U+2014) / en-dash (U+2013) anywhere (scan before commit).
4. i18n: all user-facing strings via `tp()`/`tl()` with ALL 7 langs (ru/en/pl/es/
   fr/de/it); no hardcoded EN/PL; no Cyrillic leak inside non-RU strings.
5. Design tokens only - no hardcoded hex/rgba/sizes; use `tokens.ts`. Touch
   targets >= 44pt with labels/roles.
6. Diagrams/visuals derive geometry + color from CANONICAL data (e.g. the
   courses wheel from `pointsOfSail`), never hardcoded - this is how the polar
   bug and the sector-color bug happened.
7. Committed AND pushed (`origin/app` for mobile, `origin/main` for web). Nothing
   is "safe" until it is on the remote.

## 2. Design: Definition of Done (every UI change)
1. **Web is canonical.** Mobile mirrors the web's content + visual intent. If
   mobile shows less or different, it is a bug unless explicitly documented.
2. **Verified VISUALLY on the iOS Simulator** (screenshot), not just by reading
   code. A visual change is done only when seen rendered.
3. Matches the dark-ocean design system (tokens, spacing, the existing component
   look). No card-in-card-in-card; readable type; no clipped labels.

## 3. Ship: Definition of Done (mobile release)
1. Bump `mobile/app.json` `version` + `ios.buildNumber` (+ android `versionCode`).
   A released `version` closes its TestFlight train - always bump it.
2. Archive -> export -> `altool --upload-app`; wait for `processingState=VALID`.
3. **ATTACH the build to the "Self" TestFlight group** (`scripts/asc-attach-build.mjs`).
   This is the step that was silently missing - builds 14-19 uploaded but were
   never attached, so the phone stayed on 0.13.0. A build is NOT shipped until it
   is attached and visible to a tester.
4. Verify: the build appears in the group AND the version increments on-device.
5. Record it in `docs/design/mobile/BUILDS.md` (build N = commit SHA + what changed).

## 4. Subagent / workflow control
- Every subagent task states: GOAL, SCOPE (exact files), CONSTRAINTS (this DoD),
  and OUTPUT (a structured schema). No vague tasks.
- Subagents read CODE - they CANNOT see the UI. Every UI/parity audit by
  subagents MUST be paired with a visual pass on the simulator.
- Findings are adversarially verified, deduped, prioritized, and written to a
  human-readable artifact (e.g. `audits/VISUAL_AUDIT_*.md`) with status boxes.
- Keep concurrency modest (<=5 agents) to avoid server rate limits.

## 5. Prompt template (use for each task / subagent)
```
GOAL:        <one sentence outcome>
SCOPE:       <exact files / screens; what is in and out of scope>
CONSTRAINTS: meet COMPLETION_STANDARD sections 1-2 (code + design)
VERIFY:      <how done is proven - tsc/build/test + a sim screenshot>
DONE WHEN:   <explicit, checkable criteria>
OUTPUT:      <structured result / artifact path>
```

## 6. Anti-half-done rules (the standing directive)
- Drive the goal to completion. Do NOT stop mid-goal to ask "continue?".
- Stop ONLY for a genuine blocker: a secret/server action that is the owner's to
  perform, an irreversible public action (App Store submit), or a fact that
  cannot be obtained without the owner.
- Track every planned item to closure (audit doc checkboxes + this standard).
  Nothing counts as done until: verified + committed + pushed + (mobile) in a
  distributed build.
- At the end of a cycle: re-check the whole plan/audit for anything missed; the
  mobile binary in TestFlight must match the committed `app` branch.
