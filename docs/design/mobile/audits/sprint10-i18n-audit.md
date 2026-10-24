# Sprint 10 mobile i18n audit

Generated: 2026-10-24T17:12:37.620Z

Files scanned: 88

## Summary

| Category | Count |
| --- | --- |
| cyrillic-leak | 1 |
| non-english-leak | 10 |
| tp-arity | 0 |
| tp-no-extras | 0 |
| hardcoded-jsx | 3 |
| **TOTAL** | **14** |

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

### `mobile/src/course/LocalCourseWebView.tsx` (11)

| Location | Kind | Snippet |
| --- | --- | --- |
| `mobile/src/course/LocalCourseWebView.tsx:77` | non-english-leak | Wyjść z egzaminu? |
| `mobile/src/course/LocalCourseWebView.tsx:77` | non-english-leak | Niezapisane odpowiedzi egzaminu zostaną utracone. |
| `mobile/src/course/LocalCourseWebView.tsx:78` | non-english-leak | Zostań |
| `mobile/src/course/LocalCourseWebView.tsx:79` | non-english-leak | Wyjdź |
| `mobile/src/course/LocalCourseWebView.tsx:100` | non-english-leak | Wyjść z egzaminu? |
| `mobile/src/course/LocalCourseWebView.tsx:100` | non-english-leak | Niezapisane odpowiedzi egzaminu zostaną utracone. |
| `mobile/src/course/LocalCourseWebView.tsx:101` | non-english-leak | Zostań |
| `mobile/src/course/LocalCourseWebView.tsx:102` | non-english-leak | Wyjdź |
| `mobile/src/course/LocalCourseWebView.tsx:133` | hardcoded-jsx | Nie zapisano postępu na urządzeniu. Nie zamykaj kursu i ponów zapis. |
| `mobile/src/course/LocalCourseWebView.tsx:156` | hardcoded-jsx | Otwieram kurs zapisany na urządzeniu... |
| `mobile/src/course/LocalCourseWebView.tsx:157` | hardcoded-jsx | Nie udało się otworzyć wbudowanego kursu lub odczytać postępu. Ponowienie nie w... |

### `mobile/src/design-system/components/WindNowCard.tsx` (1)

| Location | Kind | Snippet |
| --- | --- | --- |
| `mobile/src/design-system/components/WindNowCard.tsx:45` | non-english-leak | Hyères |

### `mobile/src/simulator/SimWebView.tsx` (1)

| Location | Kind | Snippet |
| --- | --- | --- |
| `mobile/src/simulator/SimWebView.tsx:332` | cyrillic-leak | ) setLoading(false); }}         onHttpError={() => { setLoading(false); setFail... |
