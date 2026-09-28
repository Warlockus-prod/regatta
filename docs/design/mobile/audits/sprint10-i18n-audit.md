# Sprint 10 mobile i18n audit

Generated: 2026-09-28T08:05:02.647Z

Files scanned: 73

## Summary

| Category | Count |
| --- | --- |
| cyrillic-leak | 1 |
| non-english-leak | 2 |
| tp-arity | 0 |
| tp-no-extras | 0 |
| hardcoded-jsx | 0 |
| **TOTAL** | **3** |

## Categories

- **cyrillic-leak**: Cyrillic string literal outside `tp(...)` / `tl(...)` / `legacyPick(...)`. Always a P0 - the language switcher cannot move it.
- **non-english-leak**: PL/ES/FR/DE/IT accented string literal outside `tp(...)`. Heuristic - email / URL fragments excluded.
- **tp-arity**: `tp(...)` invocation with < 3 args (missing PL even though it is required). Always a P1.
- **tp-no-extras**: `tp(ru, en, pl)` without the `{es, fr, de, it}` overlay. P3 - those langs fall back to EN.
- **hardcoded-jsx**: 3+ word English string in a JSX text node, not wrapped in a function call. Heuristic - some false positives.

## Findings by file

### `mobile/app/spots/index.tsx` (1)

| Location | Kind | Snippet |
| --- | --- | --- |
| `mobile/app/spots/index.tsx:58` | non-english-leak | Hyères |

### `mobile/src/design-system/components/WindNowCard.tsx` (1)

| Location | Kind | Snippet |
| --- | --- | --- |
| `mobile/src/design-system/components/WindNowCard.tsx:44` | non-english-leak | Hyères |

### `mobile/src/simulator/SimWebView.tsx` (1)

| Location | Kind | Snippet |
| --- | --- | --- |
| `mobile/src/simulator/SimWebView.tsx:263` | cyrillic-leak | ) setLoading(false); }}         onHttpError={() => { setLoading(false); setFail... |
