# Mandatory pre-release gate - Week to Regatta (iOS)

**RULE: no App Store submission (a build sent to review) happens until every
gate below passes.** This gate is the fix for our recurring failures:
metadata-rejections, "build number must increase", and the pile-up of empty
"Prepare for Submission" entries in App Store Connect. Run it in the **main
`mobile/` checkout** (Apple toolchain + ASC API key live there), not a web
worktree.

ASCII only (repo pre-commit hook blocks em/en-dash).

Constants (see RELEASE_ENGINEERING.md): bundle `com.icoffio.regatta`, ASC app id
`6768134329`, Apple team `547PA2PLLB`, ASC API key `.p8` in
`~/.appstoreconnect/private_keys/` (`AuthKey_QBF5228DP3.p8`), EAS build with
`autoIncrement` + `appVersionSource: remote`.

The four tools we standardized on (added globally in Claude):
1. **Fastlane `deliver` + `precheck`** - validates every required ASC field
   before upload. This is the fix for the whole class of metadata errors.
2. **XcodeBuildMCP** - build / archive / run-in-simulator from Claude Code
   without raw `xcodebuild`; used for the mandatory visual verify.
3. **Codemagic** - `cancel_previous_submissions` clears the accumulated empty
   submissions; auto build numbering.
4. **LocaleLint** - CI check that `.xcstrings` translations are complete.

---

## The gate (run in order; all must be green)

### G0 - Content sync + version
```sh
cd mobile
npm run sync-content            # web src/data -> mobile/src/data/*.json (gallery, rules, ...)
npm run sync-content:check      # must exit 0 (twins not stale)
```
Bump `app.json` `expo.version` (only for a store-visible version change) and let
EAS auto-increment `buildNumber` (`autoIncrement` + `appVersionSource: remote`).
Never reuse a build number.

### G1 - LocaleLint (translations complete)   [one-time setup below]
Catch missing / placeholder localizations before Apple does.
- Native string catalogs: run **LocaleLint** on any `.xcstrings` (app name,
  `InfoPlist` localizations). Managed Expo has none committed today - they
  appear after `expo prebuild`; lint them then.
- JS i18n (where our actual UI strings live): `node scripts/i18n-audit.mjs`
  must be clean across all 7 langs. This is the equivalent gate for the RN app
  today.
- **Gate:** zero missing / empty translations.

### G2 - XcodeBuildMCP: build + SIMULATOR verify   [one-time setup below]
Never submit a build no one has looked at.
- Use the XcodeBuildMCP tools (build -> boot simulator -> install -> launch).
- Walk every screen in **light / dark / auto**; confirm the gallery (2026 album
  + de-dated 2025) and any release-specific feature render; no redbox.
- Capture screenshots for the record.
- **Gate:** builds, launches, visual pass in both themes.
- Note: the store binary itself is produced by `eas build --profile production`;
  XcodeBuildMCP is the local build/verify path so we never ship an unseen build.

### G3 - Codemagic: clear stuck submissions + build numbering   [one-time setup below]
- Run Codemagic's `cancel_previous_submissions` to clear accumulated empty /
  pending ASC submissions (the pile-up that blocks a new one).
- Confirm nothing dangling: `node scripts/asc-state.mjs` should not show a stray
  "Prepare for Submission" / empty pending version.
- **Gate:** ASC has no blocking pending submission; build number strictly
  increases.

### G4 - Fastlane precheck: validate ALL metadata BEFORE submit   [THE key fix]
```sh
cd mobile
fastlane precheck               # reads fastlane/Precheckfile; uses the ASC API key
```
Precheck validates name, subtitle, description, keywords, support + marketing
URLs (resolve + not broken), privacy URL, screenshots present for each required
device, age rating, export compliance, and placeholder / prohibited text.
- **Gate:** precheck exits with **zero errors**. If red -> fix metadata
  (`node scripts/asc-metadata.mjs`, or in ASC) and re-run. **Do NOT submit on a
  red precheck.**

### G5 - Submit
```sh
cd mobile
# either the fastlane path:
fastlane deliver --submit_for_review
# or our existing pipeline:
#   npx eas-cli submit --platform ios --profile production
#   node scripts/asc-submit.mjs
node scripts/asc-state.mjs       # confirm it entered WAITING_FOR_REVIEW / IN_REVIEW
```

---

## One-time setup (do once; after that the gate is just "run it")

### Fastlane (deliver + precheck)   [SETUP NEEDED - no fastlane/ yet]
```sh
cd mobile
gem install fastlane -N          # or brew install fastlane
fastlane init                    # choose "manual"; creates fastlane/
```
`fastlane/Appfile`:
```ruby
app_identifier("com.icoffio.regatta")
team_id("547PA2PLLB")
```
Auth via the existing ASC API key (non-interactive) - reuse the key id / issuer
from `scripts/asc-metadata.mjs` env:
```ruby
# fastlane/Fastfile
default_platform(:ios)
platform :ios do
  desc "Validate all ASC metadata (mandatory gate G4)"
  lane :gate do
    app_store_connect_api_key(
      key_id: ENV["ASC_KEY_ID"],
      issuer_id: ENV["ASC_ISSUER_ID"],
      key_filepath: File.expand_path("~/.appstoreconnect/private_keys/AuthKey_QBF5228DP3.p8"),
    )
    precheck
  end
end
```
`fastlane/Precheckfile` - make Apple-reject reasons hard errors, not warnings:
```ruby
negative_apple_sentiment(level: :error)
placeholder_text(level: :error)
other_platforms(level: :error)
future_functionality(level: :error)
test_words(level: :error)
curse_words(level: :error)
free_stuff_in_iap(level: :error)
```

### XcodeBuildMCP   [SETUP NEEDED]
```sh
claude mcp add XcodeBuildMCP -- npx -y xcodebuildmcp@latest
```
Then Claude Code drives build/archive/simulator via its tools (no raw
`xcodebuild`). Needs `expo prebuild` to have generated `ios/` in the mobile
checkout.

### Codemagic   [SETUP NEEDED - no codemagic.yaml yet]
Add `mobile/codemagic.yaml` with an iOS workflow that (a) runs
`cancel_previous_submissions` against ASC before submitting, and (b) uses
Codemagic auto build numbering. Wire the ASC API key + Apple team as Codemagic
env / integration. (Alternative if we stay laptop-first: keep using
`scripts/asc-*.mjs` + `asc-state.mjs` and do the cancel step manually - but the
gate still requires "no dangling pending submission".)

### LocaleLint   [SETUP NEEDED - applies once we have .xcstrings]
Add LocaleLint to CI to lint `.xcstrings`. Today the RN app's strings are JS
(`src/i18n`), so `scripts/i18n-audit.mjs` is the active check; adopt LocaleLint
when native String Catalogs exist (post-prebuild: app name / InfoPlist).

---

## Why this gate exists (the error classes it kills)
- Metadata rejection (missing field, placeholder, broken URL) -> **G4 precheck**.
- "Build number must increase" -> **G0 + G3** (autoIncrement + Codemagic).
- Pile-up of empty pending submissions -> **G3 cancel_previous_submissions**.
- Shipping a visually broken build -> **G2 simulator verify**.
- Missing translations -> **G1 LocaleLint / i18n-audit**.

See also: `RELEASE_ENGINEERING.md` (EAS/OTA + Apple notes),
`LIGHT_THEME_AND_RELEASE_SPEC.md` (next release contents),
`../../../CLAUDE.md` (the rule is enforced there for the Mobile lane).
