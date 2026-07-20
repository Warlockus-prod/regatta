# Sprint 10 mobile i18n audit

Generated: 2026-07-20T10:12:09.223Z

Files scanned: 62

## Summary

| Category | Count |
| --- | --- |
| cyrillic-leak | 1 |
| non-english-leak | 0 |
| tp-arity | 0 |
| tp-no-extras | 3 |
| hardcoded-jsx | 3 |
| **TOTAL** | **7** |

## Categories

- **cyrillic-leak**: Cyrillic string literal outside `tp(...)` / `tl(...)` / `legacyPick(...)`. Always a P0 - the language switcher cannot move it.
- **non-english-leak**: PL/ES/FR/DE/IT accented string literal outside `tp(...)`. Heuristic - email / URL fragments excluded.
- **tp-arity**: `tp(...)` invocation with < 3 args (missing PL even though it is required). Always a P1.
- **tp-no-extras**: `tp(ru, en, pl)` without the `{es, fr, de, it}` overlay. P3 - those langs fall back to EN.
- **hardcoded-jsx**: 3+ word English string in a JSX text node, not wrapped in a function call. Heuristic - some false positives.

## Findings by file

### `mobile/app/courses/index.tsx` (2)

| Location | Kind | Snippet |
| --- | --- | --- |
| `mobile/app/courses/index.tsx:247` | hardcoded-jsx | Two sails, not one |
| `mobile/app/courses/index.tsx:363` | hardcoded-jsx | What else is there? |

### `mobile/app/replay/[id].tsx` (1)

| Location | Kind | Snippet |
| --- | --- | --- |
| `mobile/app/replay/[id].tsx:156` | hardcoded-jsx | ,   replay: ReadonlyArray |

### `mobile/app/rules/index.tsx` (3)

| Location | Kind | Snippet |
| --- | --- | --- |
| `mobile/app/rules/index.tsx:165` | cyrillic-leak | ВФПС РФ (рус.) |
| `mobile/app/rules/index.tsx:255` | tp-no-extras | tp(                   'Теория, тренажёр вопросов и пробный экзамен - на польском |
| `mobile/app/rules/index.tsx:275` | tp-no-extras | tp(                   'Свидетельство SRC, симулятор ICOM с голосом, 26 заданий U |

### `mobile/app/simulator-basics/index.tsx` (1)

| Location | Kind | Snippet |
| --- | --- | --- |
| `mobile/app/simulator-basics/index.tsx:185` | tp-no-extras | tp('Сброс (90°)', 'Reset (90°)', 'Reset (90°)') |
