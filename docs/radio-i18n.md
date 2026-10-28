# SRC languages and local practice

The SRC course follows the selected app or website language: Russian, English,
Polish, Spanish, French, German and Italian. The sternik course keeps its separate
Polish content policy. Radio preferences no longer use sternik's language scope.
Existing question, chapter, lesson and scenario IDs and saved progress keys stay
stable.

## Content and messages

- Canonical educational data remains in `src/data/src-radio.ts` and the radio
  course data files. The 324 question records and their study key are unchanged.
- `src/app/radio/localization/context.tsx` provides explicit `rt`, `tp` and `tl`
  text reads. It does not rewrite React children, reducer state, user input or
  speech transcripts.
- `public/radio-locales/{ru,en,pl,es,fr,de,it}.json` holds the complete local message
  catalogs. `aliases.json` connects existing source strings with stable resource
  IDs. These resources are fetched and cached separately from website JavaScript.
- The radio layout loads the first catalog on the server. Switching languages
  waits for the selected local catalog and offers retry on failure.
- The native radio builder embeds all seven catalogs and aliases in
  `mobile/assets/radio-offline.html`, together with the local Source Sans font.
  Its course text does not require runtime network requests.

Run `node src/app/radio/localization/build-catalog.mjs --stats` for a read-only
inventory and missing-key counts. Run it without arguments after changing source
copy, adapt missing resources in every locale, then run it again and use `--check`
to verify that enumeration and aliases are current. The generator makes no API
calls. `sources.json` is the enumeration used by coverage tests. Technical styles,
grade-matching patterns and literal radio speech are excluded from translation.

Translation keys are a hash of normalized source text. Numeric dynamic values use
`{0}` placeholders; named UI variables retain their original names. Protocol
examples use protected `{radioTerm0}` placeholders. Keep every placeholder intact.
Resource generation prunes retired keys, but does not change educational IDs.

## Guide extraction correction, 2026-10-25

Actual production UI revealed eight Polish section titles and three table cells
still visible in Russian. The old inventory omitted JSX `pl`/`ru` attributes and
filtered visible cells containing equals signs as if they were code. A zero
missing-key count covered the enumerated catalog, not all rendered copy.

The generator now includes paired language attributes and literal visible Table
headers/rows. Fifteen resources were added to all7 catalogs:8headings,3control
explanations and4verbatim equipment inscriptions. There are3761resources and7497
aliases, with no old resource/translation/alias changes or removals. Narrow
backward compatibility preserves the existing troubleshooting and cheat-sheet
aliases. `src/app/radio/obsluga/guideTranslations.test.ts` checks the actual9guide
headings,3previously omitted cells and4literal labels through runtime `rt` and
the real generator. This is bounded coverage, not a full manual review of every
question, lesson and language. The status toolbar also has dedicated compact
rows; guided and inline Back labels describe their existing destinations.

## Text that stays literal

The learning interface and explanations are adapted to the selected language.
These are deliberate exceptions:

- Standard English on-air transmissions, prowords, NATO spelling words, call
  signs, vessel and station names, MMSIs and spoken position tokens stay exact.
- The physical ICOM display and button inscriptions follow the actual equipment.
  Application controls, descriptions and accessible labels are localized.
- English exercises `src-1-115` through `src-1-174` retain every English answer
  choice, including deliberate grammar errors. The three cloze stems retain
  their English structure and adapt only the hint in parentheses.
- `englishExercises.ts` protects English quotations inside the explanations of
  those 60 items. `examText.ts` owns their explicit presentation rules.
- `OriginalPolish` exposes the exact Polish UKE question and answer wording as an
  optional reference. Explanations and the study answer key are app-authored, not
  an official UKE answer key.

Do not translate NORTH/SOUTH/EAST/WEST, DEGREES/MINUTES/DECIMAL or English number
examples into the interface language inside a spoken-position exercise. The
localized description explains how to pronounce the preserved English words.
The source bank can contain historical punctuation; do not silently repair exact
English answer choices during adaptation.

## Local speech and assessment

`src/app/radio/voiceGrading.ts` is the pure shared transmission checker. The API's
old `voiceGrading.ts` path re-exports it for compatibility. Native and local typed
practice use the same scenario, dialogue and position rules as online practice.
Typed assessment is labelled separately from recognized speech. Reading the
rehearsal script never creates a fabricated microphone score.
The website also offers typed scenario, dialogue and position checking while
keeping its existing cloud microphone path. Typed entry does not start native
recognition or request microphone permission. Microphone setup displays typed
text separately and never treats it as a successful microphone test.

The deterministic checkers assess the text of a transmission: required message
elements and, where specified, numeric position format. A typed score does not
assess pronunciation, timing or the microphone. A score from recognized speech
checks the returned transcript; it is not a separate acoustic pronunciation
assessment.

`audio/localSpeech.ts` and `audio/useLocalRecognition.ts` use the native bridge
specified in `mobile/src/radio/README.md`. English on-air synthesis and recognition
are independent of the interface language. Recognition requires an installed
English system model and explicit microphone permission. Capability is not a
successful microphone check: only a started recording and a real returned
transcript establish that the voice path worked. When unavailable, structured
text practice and the complete course remain usable locally.

Free practice additionally uses the explicit seven-language copy in
`src/data/radio/free-speech-copy.ts`. The existing catalog builder registers
all seven values and generates `src/data/radio/free-speech-labels.ts` for the
explicit source-text reads through `rt`. The complete matrix stays outside
web route chunks; native bundles the same catalogs. Builder check detects any
stale labels/catalogs instead of depending on literal scanner guesses.
`FreeSpeechPractice.tsx` keeps recognized English transmission text in the
mounted session only, separately labels typed input and does not assess a
procedure or pronunciation. Its draft, permission/model/silence/error status,
eight-row limit and Clear labels are all adapted; Sternik stays Polish. The
P07 source/browser/native evidence is recorded in
`docs/audits/2026-10-27/radio-free-speech-harness.md`.

Recognition results are delivered only after the user's release and the native
end event. Cancellation, navigation and errors do not grade a partial or stale
transcript. The receiver cancels local station speech when power, PTT, mute,
squelch or the tuned channel closes the receiving path. System synthesis duration
is estimated; decoded audio clips retain exact timing.
Station replies retain their transmission channel. Opening SQL on another
channel cannot make that station audible; decoded clips follow retuning through
a separate per-station channel gate.

These native bridges require a newly built binary. An older TestFlight binary
does not acquire the native speech modules from an HTML or JavaScript update.

## Verification scope, 2026-10-24

The final enumeration contains 3727 resources per language and 7345 aliases,
with zero missing keys in RU, EN, PL, ES, FR, DE and IT. Coverage tests check all
enumerated entries, placeholders, MMSIs, exact English exercise choices and
protected position words. The full radio and shared API grading run passed
247 tests; the last instruction-only delta passed the 47 translation/dialogue
tests and catalog generation checks.

Independent editorial review covered the 60 nautical English question stems in
all seven languages, protected explanations and cloze structures, position
readouts, and eight safety paragraphs concerning voice, CH70 and DSC. Four
ambiguous nautical meanings received explicit reviewed wording. This is a
defined review sample, not a claim that every localized paragraph was read
manually.

Actual browser checks at 390x844 covered the home, theory and question-bank
entry in all seven languages: localized headings and no horizontal overflow.
The captures are `docs/audits/2026-10-24/verification/radio-locale-home.json` and
`docs/audits/2026-10-24/verification/radio-locale-content.json`. They precede the
final English question-bank heading wording adjustment. Additional checks
covered the German simulator, the MENU layout at 320x568, English typed position
scoring at 100%, and a typed dialogue advancing on its assigned channel 12.
Screenshots in the same directory preserve the observed layouts.

Native ASR/TTS bridge unit and source checks are separate from a real microphone
test. Browser typed practice does not prove that a handset has an installed
English recognition model or that its microphone recording succeeded. Verify
that path in the newly built binary without treating capability as readiness.

## Browser offline verification recipe

Use a production build on HTTPS or localhost. The service worker is not enabled
by the development server. Start a production server in one terminal:

```sh
npm run build
npx next start -p 3310
```

Then run the existing checks in a second terminal:

```sh
BASE_URL=http://localhost:3310 npx playwright test e2e/offline.spec.ts --project=chromium --workers=1
```

Playwright creates a fresh context. When reproducing manually in a reused
browser, unregister the previous worker and clear this origin's Cache Storage
before the first online visit. Set the `regatta_lang` cookie and
`regatta.lang.v1` storage value to `pl`, plus the onboarding flags, before opening
`/radio`. Wait for the active worker's `/__precached` marker to equal `pl`, and
verify all eight radio catalog/alias JSON files are cached before disconnecting.
Use full page navigation after going offline; a prefetched client transition
alone is weaker evidence. The spec also checks an uncached probe fails.
Website HTML documents are cached for the selected locale. Before testing full
offline navigation in another language, let that language's online precache
finish too. The native HTML includes all seven languages from installation.

| Current route or action | Stable selector or expected label |
| --- | --- |
| SRC question-bank start, `/radio/test` | `data-testid="start-training"`; there is no SRC "Quick 20" button |
| Sternik quick session, `/sternik/test` | Polish "Szybkie 20" |
| Simulator scenario | `start-fire-mayday`, followed by `exit-scenario` |
| Free practice | `start-free-practice` |
| New theory chapter check | "Sprawdź zrozumienie"; an already completed chapter instead says "Sprawdzenie zaliczone" |
| Typed position | `local-transcript-input`, `local-transcript-check`, then `pos-score` |
| Typed dialogue | `dialogue-radio-check`; power on, set channel 12, submit, then `next-turn` |

The same spec separately serves the generated native radio HTML with a mock
unavailable speech model and confirms local typed grading makes no API,
catalog or audio requests. That verifies the bundled browser content, not an
installed native speech engine. Its web typed test keeps the existing cloud
PTT path and verifies typing never requests microphone capture or STT grading.

## Terminology

| Meaning | RU | EN | PL | ES | FR | DE | IT |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Equipment | рация | radio | radio | radio | radio | Funkgerät | radio |
| Squelch | шумоподавитель | squelch | blokada szumów | silenciador | silencieux | Rauschsperre | squelch |
| Call sign | позывной | call sign | znak wywoławczy | distintivo de llamada | indicatif d'appel | Rufzeichen | nominativo |
| Distress | бедствие | distress | niebezpieczeństwo | socorro | détresse | Seenot | soccorso |
| Urgency | срочность | urgency | pilność | urgencia | urgence | Dringlichkeit | urgenza |
| Safety | безопасность | safety | bezpieczeństwo | seguridad | sécurité | Sicherheit | sicurezza |

MAYDAY, PAN-PAN, SECURITE, OVER, OUT, DSC, MMSI, VHF, SRC and UKE retain their
protocol spelling or institutional abbreviation. Descriptions around them are
adapted. Polish legal and UKE context stays Polish in substance in every locale;
translation must not invent a different country's examination procedure.

## 2026-10-25 navigation and adaptation correction

The installed host and website now share the bounded route/exit copy in `src/lib/radio-navigation.ts`; the web compatibility entry is `src/app/radio/navigation.ts`. New practice navigation uses explicit free practice, guided learning, course and scenario actions. Exit prompts and native labels are supplied in all seven languages. English operating protocols and the source question options remain literal. Native leaderboard copy separately explains why offline races do not appear globally.

The resource catalog is rebuilt from current sources; its count can decrease when obsolete aliases or shared route copy move out of the radio extraction tree. Counts alone do not establish translation or installed UI acceptance. Fresh source/package and device evidence is recorded in `docs/audits/2026-10-25/corrections.md`.

## 2026-10-25 actual UI corrections

Theory section labels passed as component props were not in the original lookup catalog. The12 shared Learn/Exam labels now live in `src/app/radio/teoria/sectionLabels.ts` with explicit seven-language copy and84 catalog-backed checks in `src/app/radio/teoria/sectionLabels.test.ts`. Current catalog:3746 resources,7475aliases, missing0 inall7. CUA switched the installed94a299b1fcf4 package through all7 languages: all nine Learn headings and the comprehension heading follow the selected language with no horizontal overflow. This is not a full visual audit of all324questions. Official English phrases and expandable Polish originals retain their roles.

The course-home weak-spots list is scoped to SRC before applying the six-item limit; its Reset clears the same scope. Shared saved Sternik oral records are preserved. Source contract and persistence are covered by `src/app/radio/weakSpots.test.ts`.


Native startup62: `mobile/src/course/OfflineRadioCourse.tsx` owns seven-language startup/recovery and support-code labels; `mobile/src/radio/startup-diagnostics.ts` owns language-neutral bounded codes. `mobile/src/persistence/radio-storage.ts` accepts the exact retired lang.v1 preference from48/49 without allowing it to override the injected app language. The eight localized beta notes in `mobile/releases/1.7.0.json` distinguish this hotfix from the following physical-course work. New native translation calls have all seven values; manual rendering of every error code in every language is not claimed.
