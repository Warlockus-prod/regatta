# Sprint 2 - Dev-3 status note

Lane: Settings hardening + first-launch language nudge.
Sprint: v0.3.0.

## Files changed

- `mobile/app/settings.tsx` (extended)
  - Added "Privacy" section under "About" with three rows:
    1. "Privacy policy" -> opens `<PrivacyModal>` (in-file component).
    2. "Support" -> `mailto:support@icoffio.com?subject=Week to Regatta v<version> feedback` via `Linking.openURL`, with the same `canOpenURL` + `Alert` safety net used in `app/gallery/index.tsx`.
    3. "Telemetry: off" -> static label + 1-line localized note. Not interactive (no underlying telemetry to ship a toggle for).
  - Existing language picker, About card, and version line are unchanged: settings.test.tsx assertions still pass.

- `mobile/app/_layout.tsx` (one-line wrap)
  - Imported `FirstLaunchGate` and wrapped it around `<Stack />` inside the existing `<SplashGate>`. Provider stack is otherwise untouched (ErrorBoundary > GestureHandlerRootView > SafeAreaProvider > I18nProvider > SplashGate > FirstLaunchGate > Stack).

- `mobile/src/onboarding/first-launch-language.tsx` (new)
  - `<FirstLaunchGate>` component + inline `<LanguagePickerModal>`.
  - Reuses Card / Text / Button / tokens from the design system; no new primitives.

- `mobile/src/persistence/firstLaunch.ts` (new)
  - `useFirstLaunch()` hook backed by AsyncStorage key `regatta.firstLaunch.v1`.
  - Mirrors the shape of `mobile/src/persistence/bootcamp.ts` so QA can rely on the same testing pattern.

## Privacy modal copy decisions

- Keep it short (5 paragraphs + contact line) so the user can scroll the whole thing on an iPhone SE.
- Tone: declarative. No marketing fluff. No legalese either - this is App Store-credible, not a 6-page TOS.
- Five claims, in order:
  1. Intro: app respects privacy, no tracking, no PII collection.
  2. No external analytics; telemetry is off in this build.
  3. Local-only persistence (AsyncStorage); user can clear via system app settings.
  4. Gallery loads images/video from weektoregatta.com; server does not receive identifiers.
  5. Web version has its own privacy section; mobile uses the same baseline.
- Contact line: `Privacy questions: support@icoffio.com.`
- ASCII typography only. Polish/ES/FR/DE/IT have no diacritics or curly quotes per project rules.
- Modal is a translucent slide-up sheet (Modal animationType="slide"), tap "Close" or system back to dismiss.

## First-launch nudge logic

```
            +-----------------------------+
            |   App start (cold launch)   |
            +-------------+---------------+
                          |
                          v
            +-----------------------------+
            | I18nProvider hydrates       |
            | useFirstLaunch hydrates     |
            +-------------+---------------+
                          |
                  both ready?
                          | yes
                          v
              +---------------------+
              | flag === 'done' ?   |
              +-----+----------+----+
                    | yes      | no
                    v          v
            render only      detect device locale
            (no nudge)       via detectDeviceLang()
                                    |
                            isLang(deviceLang) ?
                                +---+---+
                              yes |   | no
                                  v   v
                       setLang +    show <Modal>
                       markDone     7-language picker
                                    + Continue button
                                            |
                                  user taps language
                                            |
                                  user taps Continue
                                            |
                                            v
                                    markDone, dismiss
```

Day-2+ launches: `flag === 'done'` short-circuits the entire dance. No re-prompts.

## Persistence schema

- AsyncStorage key: `regatta.firstLaunch.v1`
- Value: `'done'` (string) once the user is past the gate. Absent otherwise.
- `v1` suffix lets us re-prompt later if onboarding redesign warrants (e.g. v2 = re-ask after we add real telemetry toggle).

Other keys we read (do not own):
- `regatta.lang.v1` - owned by `mobile/src/i18n/context.tsx`. We only call `setLang()` which writes through to it.

## Verification

- `npx tsc --noEmit` clean for files I own. (Two pre-existing errors in `app/index.tsx` are Dev-1's in-progress work, not mine.)
- `npm test -- --silent` -> 20/20 suites, 103/103 tests green. `settings.test.tsx` still passes (Polski, About card, persistence assertions all intact).
- The Settings test does NOT mock `Linking` or `Modal` - both are React Native primitives that render fine in the test renderer. The Privacy and Support rows render but never get pressed in the existing test assertions, so no behavioral test changes were required.

## Follow-ups for QA

1. Smoke the first-launch nudge on a clean install (delete app, reinstall) on:
   - JP iPhone (locale `ja-JP`) -> picker should appear.
   - EN iPhone -> no picker, lang resolves silently to `en`.
   - RU iPhone -> no picker, lang stays `ru`.
2. Re-launch after picking a language: picker MUST NOT reappear. (Flag is `'done'`.)
3. Tap "Privacy policy" -> modal opens, scroll works, Close button dismisses, system back also dismisses.
4. Tap "Support" on a device with mail set up -> mail composer opens with subject `Week to Regatta v0.3.0 feedback`.
5. Tap "Support" on a device WITHOUT a mail account -> `Alert` shows the localized fallback (`Write to support@icoffio.com manually and mention version 0.3.0.`).
6. Switch language in Settings while the Privacy modal is open is not a path users hit (modal sits over Settings). Not a bug, but worth noting.
7. Telemetry row: confirm it is NOT pressable. Currently a plain `<Card>` with no `onPress`, so the design-system Card renders as a `<View>`.

## Out of scope (intentionally)

- A real telemetry toggle. v1 ships with telemetry hard-off; no opt-in plumbing exists. Adding the toggle would require server endpoints + opt-in copy + a privacy review pass. Phase 5 work.
- An external "Open privacy on web" link. The modal is self-contained; if QA wants a deeplink to the web privacy page, that is a one-line `Linking.openURL('https://weektoregatta.com/privacy')` add and can land in v0.3.1.
- Re-prompt mechanism (`v2` of the flag). Not needed in this sprint.
- Tests for the new components - QA lane owns tests per CLAUDE.md.
