# Sprint 10 mobile i18n audit

Generated: 2026-10-26T00:17:22.964Z

Files scanned: 92

## Summary

| Category | Count |
| --- | --- |
| cyrillic-leak | 1 |
| non-english-leak | 8 |
| tp-arity | 0 |
| tp-no-extras | 0 |
| hardcoded-jsx | 3 |
| **TOTAL** | **12** |

## Categories

- **cyrillic-leak**: Cyrillic string literal outside `tp(...)` / `tl(...)` / `legacyPick(...)`. Always a P0 - the language switcher cannot move it.
- **non-english-leak**: PL/ES/FR/DE/IT accented string literal outside `tp(...)`. Heuristic - email / URL fragments excluded.
- **tp-arity**: `tp(...)` invocation with < 3 args (missing PL even though it is required). Always a P1.
- **tp-no-extras**: `tp(ru, en, pl)` without the `{es, fr, de, it}` overlay. P3 - those langs fall back to EN.
- **hardcoded-jsx**: 3+ word English string in a JSX text node, not wrapped in a function call. Heuristic - some false positives.

## Findings by file

### `mobile/app/diagnostics.tsx` (1)

| Location | Kind | Snippet |
| --- | --- | --- |
| `mobile/app/diagnostics.tsx:33` | non-english-leak |  ×${entry.count} |

### `mobile/app/spots/index.tsx` (1)

| Location | Kind | Snippet |
| --- | --- | --- |
| `mobile/app/spots/index.tsx:58` | non-english-leak | Hyères |

### `mobile/src/course/LocalCourseWebView.tsx` (8)

| Location | Kind | Snippet |
| --- | --- | --- |
| `mobile/src/course/LocalCourseWebView.tsx:100` | non-english-leak | Wyjść z egzaminu? |
| `mobile/src/course/LocalCourseWebView.tsx:100` | non-english-leak | Niezapisane odpowiedzi egzaminu zostaną utracone. |
| `mobile/src/course/LocalCourseWebView.tsx:101` | non-english-leak | Zostań |
| `mobile/src/course/LocalCourseWebView.tsx:102` | non-english-leak | Wyjdź |
| `mobile/src/course/LocalCourseWebView.tsx:170` | non-english-leak | Wyjdź z egzaminu |
| `mobile/src/course/LocalCourseWebView.tsx:173` | hardcoded-jsx | Nie zapisano postępu na urządzeniu. Nie zamykaj kursu i ponów zapis. |
| `mobile/src/course/LocalCourseWebView.tsx:197` | hardcoded-jsx | Otwieram kurs zapisany na urządzeniu... |
| `mobile/src/course/LocalCourseWebView.tsx:198` | hardcoded-jsx | Nie udało się otworzyć wbudowanego kursu lub odczytać postępu. Ponowienie nie w... |

### `mobile/src/design-system/components/WindNowCard.tsx` (1)

| Location | Kind | Snippet |
| --- | --- | --- |
| `mobile/src/design-system/components/WindNowCard.tsx:45` | non-english-leak | Hyères |

### `mobile/src/simulator/SimWebView.tsx` (1)

| Location | Kind | Snippet |
| --- | --- | --- |
| `mobile/src/simulator/SimWebView.tsx:361` | cyrillic-leak | ) setLoading(false); }}         onHttpError={() => { recordNativeDiagnostic({ t... |

## Reader checkpoint manual classification,2026-10-26

The12 heuristic findings above are not missing or empty translations:

- Eight belong to the intentionally Polish Sternik host and exam/storage UI.
  SRC uses its separate seven-language OfflineRadioCourse host.
- Two are the real place name Hyères, shared across languages.
- One is the universal multiplication/count symbol in the journal.
- The SimWebView Cyrillic finding spans JSX callback code because the regex
  scanner loses string boundaries. Actual recovery text uses complete
  seven-language tp calls; the reported callback has no Cyrillic label.

The scanner reports0 tp arity errors and0 missing language overlays. The new
shared saved-race notice for replay and Coach adds five complete resources,
35 explicit language values in mobile/src/replay/ReplayUnavailable.tsx.
This classification is source evidence. Installed narrow-screen language
acceptance and complete official-question review remain separate.
