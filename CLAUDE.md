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
