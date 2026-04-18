# PATTERNS

My recurring failure patterns and the checklist that blocks them.

**Read this at the start of every session.** This is the "door" the user asked me
to build - work should not pass through unless it survives these checks.

Update this file only when a NEW pattern is confirmed (at least twice). Don't
water it down by adding soft aspirations.

---

## Failure patterns (confirmed)

### P1. Ship speed beats truth
**Symptom:** I mark a feature "done" when the UI renders, not when it behaves
correctly. Simulator trim controls "worked" (sliders moved, numbers changed)
for months while `trimEff(angle, optimum)` was just distance-to-constant.
**Root cause:** "done" has no operational definition. Rendering passes as
proof of work.
**Counter-rule:** see D1.

### P2. Polish fake instead of build real
**Symptom:** when facing a hard engine problem, I drift into CSS gradients
and icon choices on top of the same broken logic. The harder the physics
problem, the more tempting color work becomes.
**Root cause:** avoidance of difficulty, disguised as productive work.
**Counter-rule:** see D2.

### P3. Break own rules silently
**Symptom:** CLAUDE.md bans em-dash. Em-dashes accumulated in 5 code files.
No commit failed. I didn't notice until the user flagged exact file:line.
**Root cause:** rules without enforcement are decoration.
**Counter-rule:** see D3.

### P4. Docs lie, I trust them, I get confused
**Symptom:** AUDIT.md claimed v5.0 while code was at v9+ with multiplayer,
replay, daily, 3D. I read the docs in early turns of a session and they
primed me with an outdated mental model.
**Root cause:** writing new docs without invalidating or replacing old ones.
**Counter-rule:** see D4.

### P5. Don't test in browser
**Symptom:** I have Playwright MCP and don't use it. I wait for the user
to find the bug. User flagged this explicitly: "ты не тестируешь все хорошо".
**Root cause:** browser testing feels "optional" when code compiles. It isn't.
**Counter-rule:** see D5.

### P6. Don't answer expert/user questions before moving on
**Symptom:** external expert asked 2 decisions (base boat, priority). I
started writing plan text without answering them clearly first. User asks
"что скажешь?" I drift into summary without closure.
**Root cause:** preferring generic planning over specific commitments.
**Counter-rule:** see D6.

---

## The door (pre-commit, pre-"done" checklist)

Do these IN ORDER before claiming any task done. Not "usually". Every time.

### D1. Before saying "done"
- [ ] What is this feature's **behavioral contract**? (one sentence, e.g.
      "over-trimming main at TWA=90° reduces boat speed by >10% within 3s")
- [ ] Is there a test (unit or browser) that would fail if the contract broke?
      If not, do not say done.
- [ ] For simulator / physics work: did I watch numbers move in expected
      directions under three different inputs? (not just "numbers changed")

### D2. Before polishing UI
- [ ] Is the underlying logic physically correct or just aesthetically
      placed? (list what physics the UI is representing)
- [ ] If I'm tempted to change colors/icons during a physics task, STOP.
      That's P2. Close the physics first.

### D3. Before every commit
- [ ] Scan for em-dash (U+2014) and en-dash (U+2013). Any shell (bash / zsh):
      ```
      git ls-files '*.ts' '*.tsx' '*.js' '*.md' '*.json' '*.css' '*.conf' \
        | xargs perl -nle 'print "$ARGV:$.: $_" if /[\x{2014}\x{2013}]/'
      ```
      Must return zero real matches. Comments about the rule itself may
      reference the chars by hex code (U+2014), never as literals.
- [ ] `npx next build` passes cleanly (no TS errors, no warnings added by
      this commit).
- [ ] `git diff --stat` - do the changed files match what I said I'd change?

### D4. Before writing/updating docs
- [ ] Is there an existing doc making a now-false claim? If yes, update or
      delete it IN THE SAME commit as the one introducing the new reality.
- [ ] Does MEMORY.md need a new entry for this decision? If the answer isn't
      obvious in 5 seconds, write the entry anyway.

### D5. Before calling UI work complete
- [ ] Did I open the app in Playwright MCP, navigate to the affected route,
      click the affected control, and verify the visible behavior matched
      intent?
- [ ] On mobile viewport (Playwright resize) too, for anything interactive?

### D6. Before a long reply
- [ ] If the user or an external expert asked numbered questions, did I
      answer them by number in the first paragraph? (not "I'll get to that
      later in the plan")

---

## Meta rule: when blocked, stop and name the block

If I'm stuck or tempted to ship partial work: write one sentence in the
conversation saying what I'm blocked on, what I tried, what I'd do next.
Do not pretend progress by changing unrelated code.

---

## Non-patterns (things that feel like patterns but aren't)

Keep this short and honest. Only add here when a suspected pattern turns
out not to be real after investigation.

(none yet)
