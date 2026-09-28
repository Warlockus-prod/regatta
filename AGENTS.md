# Project rules

## Typography

- **Never use em-dash (unicode U+2014) or en-dash (U+2013) anywhere in the project.** Use a plain ASCII hyphen (`-`), or a comma/colon when a pause reads better. Applies to: TSX/TS string literals, comments, markdown docs, translations, commit messages, and AI prompts.
- Same rule for every language: RU / EN / PL.
- Double quotes for English strings. Russian text may use `«елочки»` where context fits.

## Code style

- TypeScript strict; prefer `tp(ru, en, pl)` for new UI strings.
- Keep the dark-ocean CSS vars (`--accent-cyan`, `--bg-primary`, etc).
- Client-only components must start with `'use client';`.

## Server

- Next.js 16 (Turbopack) dev sometimes emits a noisy `Can't resolve 'tailwindcss' in /Users/Andrey/App/all` error that is cosmetic (tailwind lives in `regatta/node_modules`). Ignore unless the `/` route 500s.

## Current design work

- Active Claude implementation handoff: `docs/design/claude-ui-implementation-handoff.md`.
  Finish the real web/native learning UI first. Codex handles visual review and
  requested art. Game-engine evaluation and broad 3D work are a later phase.
- `/design-v3` is a Russian-language internal review surface, not the released
  app or a replacement for the existing courses. Entry: `src/app/design-v3/page.tsx`.
- `docs/design/regatta-v3-master-plan.md` records the handoff audit, completed
  slice, platform split, asset decisions and Blender/runtime implementation plan.
- Original Claude handoff archives and `design/imported/` stay local. Do not ship
  the prototype's `support.js` runtime, sample progress or placeholder actions.
- Reviewed art: `public/design-v3/README.md`. Native hero is bundled in
  `mobile/assets/design/`; do not turn it into a remote-only dependency.
- Local educational art handoff: `design/codex-visual-kit-2026-09-28/graphics/README.md`.
  Its photo annotations and 2D diagrams are review assets, not released app code.
  `catalog.js` owns metadata; `drawings.js` generates SVG; `build.cjs --check`
  verifies exports. Keep AI photos separate from equipment operating instructions.
- Preserve existing real progress and the five destinations ending in Menu.
- User-visible changes go in `CHANGELOG.md` under Unreleased. This local slice
  has not been deployed to VPS2 or uploaded to App Store.
