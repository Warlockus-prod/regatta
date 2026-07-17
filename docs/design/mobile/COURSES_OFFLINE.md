# The PL licence courses in the mobile app: online, offline, and what it would take

Status: **shipped as a WebView** (app 1.5.0, build 28). This document says exactly
what works, what needs a network, and what it would cost to change that - so the
next decision is made with numbers rather than vibes.

> **Correction (2026-07-17, see DECISIONS.md ADR-0010).** The "after phase 1 =
> offline" rows in section 5 are NOT yet true and are probably wrong as written.
> Offline here assumes the web service worker (public/sw.js) runs inside the app
> WebView, but `app.json` declares no `WKAppBoundDomains` /
> `limitsNavigationsToAppBoundDomains`, so WKWebView almost certainly never
> registers the service worker (it works only in mobile Safari). Treat offline as
> UNVERIFIED until a Phase 1 on-device measurement (load online, kill network,
> reopen) confirms it. Default lean is online-only with the honest Retry UI.
> Do not re-assert "offline works" in product copy until measured.

Related: [ARCHITECTURE.md](ARCHITECTURE.md), [API_CONTRACT.md](API_CONTRACT.md),
[../sternik-radio.md](../sternik-radio.md), [DECISIONS.md](DECISIONS.md).

---

## 1. What is in the app today

Two entries under **Kursy (patenty PL)** in the app's Rules tab:

| entry | route | what it opens |
| --- | --- | --- |
| `Sternik motorowodny` | `mobile/app/kursy/motorowodny.tsx` | `weektoregatta.com/sternik?lang=pl&embed=1` |
| `Radio SRC` | `mobile/app/kursy/radio.tsx` | `weektoregatta.com/radio?lang=pl&embed=1` |

Both render through `mobile/src/course/SectionWebView.tsx`:

- keeps the section's own subnav and allows in-section navigation, so the whole
  course (theory, simulator, 26 tasks, cheat sheet, certificate) is reachable;
- passes `?embed=1`, which the site uses to hide the global nav, the footer and
  the feedback bubble - and, since 2026-07-14, to **pin the dark theme** (the app
  is dark-only, so an OS light preference must not light up a page inside a dark
  shell);
- `mediaCapturePermissionGrantType="grant"` plus `NSMicrophoneUsageDescription`,
  so the voice trainer's microphone works inside the WebView;
- external links open in the system browser, never inside the course;
- on a load failure it shows an honest message: *the course needs an internet
  connection*.

**Consequence, and it is the important one:** every web change reaches the app
**the moment the site deploys**. No rebuild, no App Store review. Everything
shipped in the last few days - per-button inspect, the sound engine, the two-way
voice, the journal, the printable cheat sheet - was live in TestFlight build 28
without touching the app at all.

---

## 2. Online vs offline, honestly

### Needs a network today: everything

The WebView loads the course from the network on every open. There is no
offline cache, so with no signal the app shows the failure message and nothing
else.

### What could never work offline, at any price

| feature | why |
| --- | --- |
| **Voice grading** (`/api/radio-voice`) | the transcription runs on OpenAI's servers (`gpt-4o-transcribe`). No on-device model is close enough for MMSI digits and call signs, and shipping one would add hundreds of MB. |
| **Spoken station replies** (`/api/radio-tts`) | same: `gpt-4o-mini-tts` is a network call. **But** the replies come from a fixed script pool, so they could be **pre-generated and bundled** - see phase 2. |
| **The AI chat** (`/api/ai-chat`, `/api/sternik-chat`) | it is a model call. |
| **The leaderboard, multiplayer, live weather** | server state by definition. |

### What could work offline, and easily

Everything else, because it already runs entirely in the browser:

- the **148-question sternik bank**, the theory, the mock exam;
- the **radio theory**, the 26 UKE tasks, the cheat sheet and the certificate;
- **the whole ICOM simulator**: `radioModel.ts` is a pure reducer, the 15
  scenarios are static data, the sound engine synthesizes every sound in
  WebAudio (no audio files at all), and the inspect entries are static text;
- progress, which already lives in `localStorage` on the device.

The step-through PTT mode (press to read the next line of the message) is the
existing, deliberate fallback for exactly this case: it grades nothing, but it
teaches the message structure with no network.

---

## 3. How to make it work offline - three phases, increasing cost

### Phase 1: cache what is already static (small, high value)

Add a **service worker** to the web app that precaches the course routes and
their JS/CSS on first visit, and serves them from cache when offline. The WebView
picks it up for free - it is a browser.

- work: a `next-pwa`-style service worker, an offline route allowlist, a cache
  version tied to the deploy;
- gets you: theory, question bank, mock exam, the full simulator with sound,
  the cheat sheet - **all of it**, offline, with zero app changes;
- does not get you: voice grading, spoken replies, the AI chat;
- risk: cache invalidation. A stale course is worse than no course, so the
  service worker must be network-first for HTML and cache-first only for
  fingerprinted assets.

**This is the one worth doing.** It is the cheapest change with by far the
biggest offline win, and it needs no App Store submission.

### Phase 2: bundle the station voices (small, nice)

The coast station's lines are a **fixed pool** (`stationReply.ts`,
`LISTEN_LINES`). Pre-generate them once with `gpt-4o-mini-tts`, commit the mp3s,
and serve them as static assets. Then the spoken replies work offline too, and
the TTS route becomes a fallback for anything not in the pool.

- work: a build script + ~20 small mp3s;
- cost: one-off cents;
- watch: the bundle-size budget (currently 5.37 of 5.5 MB) - audio would need to
  live outside the JS bundle, as static files.

### Phase 3: native the courses (large, and probably wrong)

Port the courses to React Native so they work offline without a browser at all.

- work: **weeks**. The simulator alone is a state machine, a WebAudio engine, an
  LCD renderer and 27 inspect entries; RN has no WebAudio (it would need
  `react-native-audio-api` or a rewrite), and the whole thing would then exist
  **twice**, in two languages, drifting apart with every fix;
- the content (`src/data/*`, `radioModel.ts`) is already shareable and should be
  extracted to `packages/content/*` first if this is ever done (see
  [DECISIONS.md](DECISIONS.md));
- **recommendation: do not.** The WebView is not a compromise here, it is the
  right architecture: one implementation, one source of truth, and every fix
  ships to web and app simultaneously without a review queue.

---

## 4. What "works offline" should mean in the UI

Whatever we cache, the app must be **honest about the degraded state** rather
than failing mysteriously:

- an offline banner inside the course: *theory and the simulator work offline;
  voice grading needs a connection*;
- the voice panel should switch itself to step-through mode when offline and say
  so, instead of failing a recording after the user has already spoken;
- the certificate and the cheat sheet print from cache, so they must be in the
  precache list - those are exactly what you want on a boat with no signal.

---

## 5. Summary

| | today | after phase 1 | after phase 2 |
| --- | --- | --- | --- |
| theory, 148 questions, mock exam | online | **offline** | offline |
| radio theory, 26 tasks, cheat sheet, certificate | online | **offline** | offline |
| ICOM simulator + sound | online | **offline** | offline |
| station replies, spoken | online | online | **offline** |
| voice grading | online | online | online (unavoidable) |
| AI chat | online | online | online (unavoidable) |
| app rebuild needed | - | **no** | **no** |
