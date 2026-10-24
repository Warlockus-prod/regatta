# Sternik local course

`node mobile/scripts/build-sternik-offline.mjs` builds only `mobile/assets/sternik-offline.html` and its source manifest. `--check` verifies both byte-for-byte; `--validate` compiles without writing. The budget is 6 MiB. The current package is about 2.45 MiB.

The package imports the original five `/sternik` pages and `src/data/sternik.ts`. No question bank or theory is copied. The builder replaces Next navigation/dynamic adapters, analytics and root-relative cloud-photo URLs for a local WebView. Eight JPGs and fonts are embedded. CSP disallows all HTTP connections. Shared website pages and their online oral trainer remain unchanged.

Polish is always the exam/interface language. Offline oral practice uses the shared `ORAL_PROMPTS` and factual `gradeTurn` rubric, with typed text and a visible limitation. It does not request a microphone or call transcription. Requests to the optional AI tutor show an unavailable notice. The existing theory, personal error analysis and model answers remain local.

The native host loads the packaged HTML with base URL `https://weektoregatta.com/sternik`, which preserves the old course origin for local progress migration without fetching the page. Before scripts run it restores localStorage and injects:

```js
window.__REGATTA_EMBED__ = { path: "/sternik", query: "lang=pl&embed=1" };
window.__REGATTA_APP_LANG__ = "pl";
window.__REGATTA_STERNIK_OFFLINE__ = true;
```

Routes: `/sternik`, `/sternik/teoria`, `/sternik/test`, `/sternik/egzamin`, `/sternik/ustny`. Search parameters and theory anchors stay local. The host may dispatch `regatta:sternik-navigate` with `{href}` for exactly those destinations. The SRC cross-course link emits `sternik-open-radio`; the host opens its bundled `/kursy/radio` route.

Messages to the host:

- `sternik-offline-ready` after mount, followed by the initial progress snapshot.
- `sternik-offline-progress` with `{entries}`, a complete replacement snapshot. Missing keys represent deletions.
- Original `exam-dirty` with `{dirty:boolean}` and `exam-finished` with the shared exam result fields.
- `sternik-offline-error` for an uncaught root error.

The five durable keys are `sternik.progress.v1`, `sternik.explLang.v1` (forced `pl`), `sternik.examBase.v1`, `sternik.explHint.v1`, `sternik.radio.weak.v1`. Progress has a 256 KiB value cap, other values 64 KiB, the total snapshot 384 KiB and the message 512 KiB. The local migration marker `sternik.offline.native-owned.v1` is deliberately excluded.

Known course writes/deletions flush immediately. A 1.5 second check and pagehide flush cover locked Storage prototypes. The native host persists serially and dispatches `regatta:sternik-storage-saved` after durable success or `regatta:sternik-storage-error` with `{code:"storage-unavailable"}` on failure. The latter shows a retry button that resends the current snapshot.

Native Back and in-course routing guard an active exam. Confirming an in-course departure clears dirty state before the SRC jump so the native shell does not ask twice. Current exam answers remain session state, matching the website; the departure confirmation says they will be lost.

Checks: `cd mobile && npm test -- --runInBand scripts/offline-sternik`. They cover routing boundaries, byte caps, immediate persistence/deletion, exam guard, factual oral grading, source hashes, packaged media and CSP. Runtime QA still needs a fresh native airplane-mode launch, all five routes, exam exit/cancel, typed IALA correctness, persistence after restart and upgrade/clear-all origin behavior.
