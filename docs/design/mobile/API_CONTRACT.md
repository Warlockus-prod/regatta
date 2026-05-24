# Mobile API contract

Status: **skeleton** (2026-05-03). The contract reflects today's web
backend at `regatta.icoffio.com/api/*` plus the `ws-server` running on
the same VPS. Per ADR-0001, mobile consumes this backend as-is; no
mobile-specific server.

For each endpoint we list:

- **Path** and HTTP method, or WS message direction.
- **Auth**: anonymous today; ADR-0006 introduces a real user model in
  Phase 3.
- **Tier** per [ADR-0004](./DECISIONS.md): T1 offline-only,
  T2 cached fallback, T3 network-only.
- **Request / response sketch**: enough shape for mobile clients to type
  the call. Definitive types live in web's route handler under
  `src/app/api/<name>/route.ts`; this file is the cross-lane summary.

When web changes a payload, both lanes update this file in the same PR.

## REST endpoints (`/api/*`)

### `/api/health` - GET

- **Auth**: none. **Tier**: T3.
- Used by deploy probes. Mobile uses it as a "do we have network?"
  ping in Phase 3 sync queue.
- **Response**: `{ ok: true, version: string }`.

### `/api/log` - POST

- **Auth**: none. Cookie session ID accepted opportunistically.
  **Tier**: T3 (fire-and-forget; mobile queues offline writes for the
  next online window per ADR-0004).
- Generic client telemetry sink. Web emits `page.view`, `page.engaged`,
  `js.uncaught`, `js.rejection`; mobile mirrors the same names plus
  `app.start`, `screen.view`, `lesson.complete`, `race.finish`.
- **Request**:
  ```ts
  {
    event: string;                    // e.g. 'screen.view'
    ts: number;                       // ms since epoch
    sessionId?: string;               // opaque
    payload?: Record<string, unknown>;
    device?: { model?: string; os?: string; appVersion?: string };
    language?: 'ru' | 'en' | 'pl' | 'es' | 'fr' | 'de' | 'it';
    utm?: { source?: string; medium?: string; campaign?: string };
  }
  ```
- **Response**: `{ ok: true }` or 4xx. Idempotent server-side.

### `/api/feedback` - POST

- **Auth**: none. **Tier**: T3.
- User submits free-text feedback from the in-app widget.
- **Request**: `{ text: string; route: string; lang: Lang; rating?: 1..5 }`.
- **Response**: `{ ok: true }`.

### `/api/coach` - POST

- **Auth**: anonymous, rate-limited 30/hr/user, 300/hr global. **Tier**: T3.
- AI coach analyzes a race log. ADR-0006 will swap session-cookie for a
  real user token.
- **Request**:
  ```ts
  {
    log: RaceLogEntry[];   // sim-stream events from the simulator
    lang: Lang;            // response locale
    missionId?: string;
  }
  ```
- **Response**: `{ ok: true; markdown: string }` or `{ ok: false; reason: 'rate-limit' | 'server' }`.

### `/api/race-result` - POST

- **Auth**: none today; future auth via ADR-0006. **Tier**: T3 (writes
  queued offline).
- Submits a finished race for the leaderboard.
- **Request**:
  ```ts
  {
    missionId: string;
    durationMs: number;
    windKn: number;
    tackCount: number;
    nickname?: string;
    replayCode?: string;   // 4-char code if user uploaded the replay
  }
  ```
- **Response**: `{ ok: true; rank?: number; total?: number }`.

### `/api/leaderboard` - GET

- **Auth**: none. **Tier**: T2 (cached).
- **Query**: `?mission=<id>&windBucket=<low|med|high>&difficulty=<easy|med|hard>&limit=<n>`.
- **Response**: `{ entries: { nickname: string; durationMs: number; ts: number; replayCode?: string }[] }`.
- Mobile uses `@tanstack/react-query` (Phase 3) with a 60-s stale time.

### `/api/replay/[code]` - GET / POST

- **Auth**: none today. **Tier**: T2 (cached after first fetch) for GET,
  T3 for POST.
- GET returns a saved replay by 4-char code. POST uploads a new replay
  and returns the generated code.
- **GET response**: `{ ok: true; replay: RaceReplay }`.
- **POST request**: `{ replay: RaceReplay; missionId: string }`.
- **POST response**: `{ ok: true; code: string }`.

### `/api/player` - GET / POST

- **Auth**: cookie session. **Tier**: T3.
- Read or write the per-device nickname and lightweight prefs. Will
  evolve into a real profile endpoint under ADR-0006.

### `/api/daily` - GET

- **Auth**: none. **Tier**: T2 (cache by date).
- Returns the day's challenge metadata: `{ ok: true; missionId: string; windKn: number; expiresAt: number }`.

### `/api/ai-chat` - POST

- **Auth**: anonymous, rate-limited. **Tier**: T3.
- General coach-like chat endpoint. Mobile defers usage to Phase 3 once
  the AI coach surface is reviewed against App Store guidelines.

### `/api/gallery` - GET (+ subroutes)

- **Auth**: none. **Tier**: T2.
- Browses media items; mobile already consumes the bundled
  `mobile/src/data/gallery.json` for v1, this route is reserved for
  cloud-served additions in Phase 3.

### `/api/og` - GET

- **Auth**: none. **Tier**: web-only (server-side OG image generator).
  Mobile does not call this endpoint.

### `/api/admin` - GET / POST

- **Auth**: basic auth (`/stats` password). **Tier**: web-only.
- Mobile does not access admin. The admin surface stays on web per
  ADR-0005.

## WebSocket protocol (`ws-server`)

Phase 4 dependency. Today web's `/multiplayer` connects to
`wss://regatta.icoffio.com/ws/`. The protocol is JSON over
`react-native`'s built-in `WebSocket`. Definitive shapes are in
`ws-server/server.js` on the VPS.

Connection lifecycle:

1. **Client → server**: `{ type: 'join'; code: string; nickname: string; missionId: string }`.
2. **Server → client**: `{ type: 'joined'; roomState: RoomSnapshot }`.
3. **Server → client (20 Hz)**: `{ type: 'tick'; peers: PeerState[]; t: number }`.
4. **Client → server (10 Hz)**: `{ type: 'controls'; helm: number; sheet: number }`.
5. **Server → client**: `{ type: 'finished'; results: FinalEntry[] }`.

Mobile WS client (Phase 4) must:

- Reconnect with exponential backoff on drop.
- Resend last `join` with the same `code` to rejoin the room.
- Buffer outbound controls during a brief disconnect; drop on stale.
- Surface a non-blocking "reconnecting..." banner per ADR-0004 Tier 3.

## Auth model (pending ADR-0006)

Today all endpoints are anonymous or cookie-session. ADR-0006 will
introduce Sign in with Apple + email magic-link, swap the cookie path
for a bearer-token in `Authorization: Bearer <jwt>`, and add `users`
plus `sessions` tables on the SQLite side. This file will gain an
"Auth" subsection per endpoint at that time.

## Versioning

Web adds new endpoints under `/api/v1/*` once ADR-0006 lands; existing
`/api/*` paths stay for legacy clients during the migration window
(target: 60 days). Mobile starts at `/api/v1` to skip the legacy phase.

## Verification

- Endpoint shape is the source of truth in `src/app/api/<name>/route.ts`.
- This file's diff stays small per release; reviewers compare against
  the route handler signature.
- Mobile clients live in `mobile/src/api/` (Phase 3, currently empty),
  one typed wrapper per endpoint. Each wrapper imports the shape from
  this file's TS appendix once that exists.
