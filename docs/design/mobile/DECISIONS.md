# Mobile app decisions log (ADRs)

Status: empty - populate as choices get made.

Each entry: short context + decision + consequences. Newest on top.

---

## ADR-TEMPLATE

### ADR-NNNN: Title

**Date:** YYYY-MM-DD
**Status:** proposed / accepted / superseded

**Context.** One paragraph: what decision are we making and why now.

**Decision.** What we picked.

**Alternatives considered.** Bullet list of other options and why we didn't pick them.

**Consequences.** What changes for web, for mobile, for data/API sharing.

---

## Open questions parked for later ADRs

- **Stack** (RN / Capacitor / Flutter / native) - depends on how much
  code we want to share with web. High overlap (physics, content, i18n)
  favors React Native. Low overlap favors Capacitor (thin wrapper around
  the existing web app) or separate native codebases.
- **Repo layout** - monorepo in this repo (`mobile/`) or a separate repo.
  Monorepo makes shared-package extraction easier. Separate repo makes
  CI lighter.
- **Offline strategy** - content is mostly static (bootcamp, rules,
  anatomy). Physics runs locally. The AI coach needs network; multiplayer
  needs network. Everything else can be offline-first.
- **Auth / accounts** - none on web today, no login required. Mobile
  inherits this for v1?
- **Feature scope v1** - parity with web? or a focused subset (e.g. just
  the simulator + onboard reference, no race/multiplayer)?
