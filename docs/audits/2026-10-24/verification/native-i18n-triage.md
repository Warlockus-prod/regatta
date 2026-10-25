# Native i18n findings: release triage

Reviewed the report generated at 2026-10-24T17:12:37.620Z:
`docs/design/mobile/audits/sprint10-i18n-audit.md`, 14 findings across 88 files.
All 14 are classified below. None establishes a missing translation in the
current seven-language native interface.

| # | Report location | Text or context | Classification |
| --- | --- | --- | --- |
| 1 | `mobile/app/spots/index.tsx:58` | Hyères | Proper French venue name; accent heuristic false positive. |
| 2 | `mobile/src/course/LocalCourseWebView.tsx:77` | Wyjść z egzaminu? | Expected Polish Sternik exit confirmation. |
| 3 | `mobile/src/course/LocalCourseWebView.tsx:77` | Niezapisane odpowiedzi egzaminu zostaną utracone. | Expected Polish Sternik exit explanation. |
| 4 | `mobile/src/course/LocalCourseWebView.tsx:78` | Zostań | Expected Polish Sternik confirmation action. |
| 5 | `mobile/src/course/LocalCourseWebView.tsx:79` | Wyjdź | Expected Polish Sternik confirmation action. |
| 6 | `mobile/src/course/LocalCourseWebView.tsx:100` | Wyjść z egzaminu? | Expected Polish Sternik exit confirmation before opening SRC. |
| 7 | `mobile/src/course/LocalCourseWebView.tsx:100` | Niezapisane odpowiedzi egzaminu zostaną utracone. | Expected Polish Sternik exit explanation. |
| 8 | `mobile/src/course/LocalCourseWebView.tsx:101` | Zostań | Expected Polish Sternik confirmation action. |
| 9 | `mobile/src/course/LocalCourseWebView.tsx:102` | Wyjdź | Expected Polish Sternik confirmation action. |
| 10 | `mobile/src/course/LocalCourseWebView.tsx:133` | Nie zapisano postępu na urządzeniu... | Expected Polish Sternik save-error instruction. |
| 11 | `mobile/src/course/LocalCourseWebView.tsx:156` | Otwieram kurs zapisany na urządzeniu... | Expected Polish Sternik loading status. |
| 12 | `mobile/src/course/LocalCourseWebView.tsx:157` | Nie udało się otworzyć wbudowanego kursu... | Expected Polish Sternik recovery instruction. |
| 13 | `mobile/src/design-system/components/WindNowCard.tsx:45` | Hyères | The same proper venue name; accent heuristic false positive. |
| 14 | `mobile/src/simulator/SimWebView.tsx:332` | Code beginning at the closing quote of boat3d | Regex string-scanner false positive; this line has no Cyrillic literal. |

The 11 Polish findings are real visible text, accepted under the owner's
explicit Polish-only Sternik policy in `AGENTS.md`. The only production caller
of `LocalCourseWebView` is `mobile/src/course/OfflineSternikCourse.tsx`, which
loads the Polish Sternik package and forces its Polish route. This exception
applies to that current caller; it is not an unrestricted exception for future
seven-language courses using the generic host.

The two Hyères findings are intentional names, not untranslated instructions.
Removing the accent would damage the name. For SimWebView, TypeScript AST
inspection finds eight Cyrillic literals at lines 188, 195, 202, 350, 355, 360,
378 and 393;
all are the first argument of `tp(...)`. The regex scanner instead captures code
across mismatched quotes and includes later translated strings in its finding.
The report's blanket "Always a P0" description does not apply to this false
positive. No runtime source was changed to suppress the scanner.

Triage totals: 11 expected Polish-course strings, two proper-name heuristic
false positives, one lexer false positive, zero actual missing translations
among these findings. The scanner separately reports zero `tp-arity` and zero
`tp-no-extras` findings. It scans native TSX, not the SRC web catalogs: the new
SRC setup/channel instruction was separately checked in all seven local
catalogs with its `{channel}` placeholder intact. Broader SRC evidence and
voice/typed assessment limits are in `docs/radio-i18n.md`; this triage does not
claim a full manual reading of every native or course string.
