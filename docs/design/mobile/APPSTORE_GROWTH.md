# App Store: positioning, growth, monetization

For "Week to Regatta" (iOS, Expo / React Native, Apple app id 6768134329).
Goal: make it promotable and revenue-generating. This is the decision-ready
plan; the build/submit steps are in the ship-expo-ios-appstore skill.

---

## 1. Positioning

- Category: Education (primary), Sports (secondary).
- One-liner: "Learn to sail in a week - lessons, a real-physics simulator, and
  races, in 7 languages."
- Who it is for: complete beginners learning to sail, charter/course prep,
  sailing students, and sailors refreshing theory. Not a hardcore race sim and
  not a chartplotter - it is the friendly on-ramp.
- Why it wins: structured 8-lesson bootcamp + a REAL VPP-physics simulator
  (native V1, on-device) + a new 3D sloop view + races + a 51-term glossary, in
  7 languages (RU/EN/PL/ES/FR/DE/IT). Few competitors combine "learn" + "real
  physics sim" + multilingual + free entry.
- Offline scope (be accurate - do not claim "all offline"): the bootcamp,
  glossary, rules, checklist and the native V1 simulator work fully offline.
  The 3D simulator (V2) and the V3 trim trainer are embedded web views and
  need an internet connection; they show a graceful "needs internet, try the
  offline V1 trainer" fallback when offline. Until the 3D sim is bundled as a
  local asset, V1 is the true offline hero.

Lead store assets with the NATIVE experience (V1 physics sim + bootcamp). The
3D simulator is a highlight, not the headline - and do not market it until the
app's 3D screen actually loads the V2 sim (today it loads an anatomy stand-in).

---

## 2. ASO (App Store Optimization)

- Name (30): "Week to Regatta: Learn to Sail".
- Subtitle (30): "Lessons, 3D sim and races".
- Keywords (100, comma, no spaces, no repeats of name/subtitle):
  `sail,sailing,yacht,boat,skipper,regatta,nautical,knots,wind,trim,helm,course,crew,marina,RYA,beginner`
- Screenshots (6.7" + 6.5" + iPad): 1) 3D sloop hero with the wind dial,
  2) bootcamp lesson, 3) simulator "Sailing" mode with telemetry + coach,
  4) points of sail / wind rose, 5) race with marks, 6) "7 languages" + glossary.
  Bold one-line caption on each, localized.
- App preview video (15-30s): orbit the 3D boat, trim the sails (they move),
  the boat heels and sails; cut to a lesson and a race finish.
- Localize ALL metadata in the 7 languages (we already localize the app name;
  extend to subtitle/keywords/screenshots/description).
- Promo text (170, updatable without review): announce the 3D simulator.

---

## 3. Monetization

Freemium with a Pro unlock. Sailing-course and charter-prep users pay.

- FREE: full bootcamp (8 lessons), glossary, points of sail, the simulator in
  Free-trim mode, live wind, 1 daily challenge.
- PRO (paid): Sailing mode with real physics + races vs AI + advanced drills,
  the full 3D simulator quality, all venues + weather, the post-race AI coach,
  unlimited daily challenges, offline packs.
- Model: auto-renewing subscription with a lifetime alternative.
  - Monthly ~ 4.99, Annual ~ 24.99 (best value badge), Lifetime ~ 39.99.
  - 7-day free trial on the annual to lift conversion.
- Paywall placement: when opening Sailing mode / a race, and after lesson 4
  ("unlock the simulator to practice what you learned"). Soft, value-first.
- Tech: RevenueCat (`react-native-purchases`, Expo config plugin) over StoreKit
  2 - fastest correct path for trials, restore, and analytics. Do NOT hand-roll
  receipts.
- B2B upside (later): per-seat licensing for sailing schools / clubs; a
  "course pack" code. High-margin, low-volume.

---

## 4. Growth loops

- Daily challenge (exists) -> retention; add a streak + push reminder.
- Shareable race-result card (rendered image: boat, time, course, rank) ->
  organic reach; one-tap share to Stories/Messages.
- Referral: "invite a crewmate", both get a Pro week.
- Global leaderboard (web has it; app currently local-only) -> wire the app to
  `/api/leaderboard` for real competition.
- Web -> app funnel: the website (free, SEO) now has the App Store download
  banner; add it to lesson/race pages too.
- Partnerships: sailing schools, clubs, charter companies (QR in the welcome
  pack), RYA/ASA course adjuncts.

---

## 5. Measure and iterate

- We already have custom SQLite analytics + GA4. Instrument the funnel:
  install -> bootcamp start -> lesson complete -> sim open -> paywall view ->
  trial start -> subscribe -> renew. Add cohort retention (D1/D7/D30).
- A/B: paywall copy/price, trial vs no-trial, screenshot order (App Store
  product page optimization / custom product pages).
- North-star: weekly active learners who reach a sailing milestone; secondary:
  trial-to-paid conversion and D30 retention.

---

## 6. Sequenced roadmap to "promote and earn"

1. Ship the 3D simulator (V2) into the app (see CROSS_PLATFORM_PLAN Phase 1) -
   the hero feature worth paying for.
2. ASO pass: name/subtitle/keywords/screenshots/preview, localized 7 languages.
3. Paywall + IAP via RevenueCat; Free vs Pro split above.
4. Growth loops: share cards, referral, streak + push, real leaderboard.
5. Turn on the funnel analytics + first A/B on the paywall.
6. Soft launch price test in 1-2 locales, then roll out; start school outreach.

Acceptance for "promotable + earning": the 3D sim is live in the app, a working
paywall converts trials to subscriptions, the funnel is measured end to end, and
at least one growth loop (share card or referral) is live.
