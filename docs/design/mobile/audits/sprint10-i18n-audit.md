# Sprint 10 mobile i18n audit

Generated: 2026-05-13T14:19:09.756Z

Files scanned: 47

## Summary

| Category | Count |
| --- | --- |
| cyrillic-leak | 0 |
| non-english-leak | 0 |
| tp-arity | 0 |
| tp-no-extras | 0 |
| hardcoded-jsx | 0 |
| **TOTAL** | **0** |

## Categories

- **cyrillic-leak**: Cyrillic string literal outside `tp(...)` / `tl(...)` / `legacyPick(...)`. Always a P0 - the language switcher cannot move it.
- **non-english-leak**: PL/ES/FR/DE/IT accented string literal outside `tp(...)`. Heuristic - email / URL fragments excluded.
- **tp-arity**: `tp(...)` invocation with < 3 args (missing PL even though it is required). Always a P1.
- **tp-no-extras**: `tp(ru, en, pl)` without the `{es, fr, de, it}` overlay. P3 - those langs fall back to EN.
- **hardcoded-jsx**: 3+ word English string in a JSX text node, not wrapped in a function call. Heuristic - some false positives.

## Findings

_No findings._
