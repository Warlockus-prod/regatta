# Live Weather - design

Cross-lane design doc (Shared + V2/V3 + Mobile). Anchor for both chats.
Status: **Phase 1 SHIPPED** (web + mobile) 2026-05-25; Phases 2-4 proposed.

Phase 1 done: `src/lib/weather/` (WeatherProvider + OpenMeteoProvider),
`/api/weather` (live in prod, validated/rate-limited/cached, 503 fallback),
web `WindNowCard` on the home "Live wind" section, and a mobile `WindNowCard`
(preset spots, no geolocation) consuming `/api/weather`. Synthetic wind
unchanged. Next: Phase 2 (live-spot mode in a chosen simulator).

## Guiding principle (non-negotiable)

The existing **synthetic / standard wind stays the default and unchanged.**
Steady / Shift / Gust are deterministic - they are what drills, missions,
repeatable lessons and offline play need. **Live Weather is an opt-in
ADDITIONAL mode layered on top**, never a replacement. If live data is
unavailable (offline, API error, rate limit), the simulator silently falls
back to the standard synthetic wind. No existing wind behavior changes.

Concretely:
- Default wind source = synthetic (today's engine). Untouched.
- Live = a new selectable wind source. Opt-in per session.
- Removing the network must leave the simulator working exactly as today.

## Why this (vs copying Navionics / C-MAP)

Navionics / C-MAP strength is licensed cartography (charts, bathymetry).
That is a separate paid/licensed track. The high-leverage, low-cost win for
an education app is **real weather feeding the physics we already have** (the
VPP engine). It turns a decorative wind field into a live, teaching one.

## Data sources

| Need | Source | Cost / terms | Phase |
|---|---|---|---|
| Wind + waves forecast | Open-Meteo (Weather + Marine APIs; models ECMWF/GFS/ICON) | Free non-commercial, no key, CC-BY-4.0 attribution. Commercial = paid tier or self-host (open-source). | 1 |
| US tides / currents / water level | NOAA CO-OPS web services | Free, US coverage | 3 |
| Nautical chart layer | OpenSeaMap overlay (free, ODbL/CC-BY-SA) or NOAA ENC (US, "not for navigation") | Free | 4 (MVP) |
| Premium charts | Garmin Navionics Web API / mobile SDK | Request token; partner/commercial | 4 (later) |

Open-Meteo variables used: `wind_speed_10m`, `wind_direction_10m`,
`wind_gusts_10m` (weather); `wave_height`, `wave_direction`, `wave_period`,
swell, ocean current (marine).

## Architecture (lane-coherent - this is the part that prevents drift)

- **Providers + endpoints live in web/shared only.** New module
  `src/lib/weather/` with a `WeatherProvider` interface and concrete
  `OpenMeteoProvider` (phase 1), `NoaaCoopsProvider` (phase 3). Exposed via
  `/api/weather` and `/api/marine`.
- **Mobile consumes the web API, no separate backend** (per CLAUDE.md mobile
  rule). Mobile must NOT add its own weather provider - it calls
  `/api/weather`. One implementation, two clients.
- **Currents in the VPP -> shared `src/lib/sailing-physics/*`**, additive and
  behind a flag. A zero current vector must reproduce today's output exactly
  (so the 16 physics tests stay green until we deliberately add new ones).
  This is the only change that touches the shared engine; coordinate it per
  CLAUDE.md "shared files - ASK or LEAVE ALONE".
- **Live-mode UI is per client** (web V2/V3, mobile). **V1 `/simulator` is not
  touched** (protected in CLAUDE.md).

## API contract (for the mobile lane to code against)

```
GET /api/weather?lat={lat}&lon={lon}
-> 200 {
     provider: "open-meteo",
     ts: <iso8601>,                // forecast time used
     wind: { speedKn, dirDeg, gustKn },
     wave?: { heightM, dirDeg, periodS },
     attribution: "Weather data by Open-Meteo.com (CC BY 4.0)"
   }
   400 bad lat/lon | 429 rate limited | 503 provider down (client falls back)
```
- Server-side cache per coarse cell (~10-30 min TTL) to stay inside free
  limits and keep it fast.
- Rate-limit per session/IP like the other write/AI endpoints.
- Always return an `attribution` string; clients must display it.

## Phases (safe -> risky)

1. **Read-only weather.** `WeatherProvider` + `OpenMeteoProvider` +
   `/api/weather` + a small "wind / wave now" widget (home or a spots page).
   No physics, no lane conflict, no keys. Default sim unchanged. ~1 day.
2. **Live-spot mode in ONE simulator** (V2 / V3 / mobile - to be chosen):
   user picks a spot, forecast becomes an alternative wind source feeding the
   existing VPP; synthetic stays the default; a clear in-UI toggle.
3. **Currents / tides as physics** (shared engine, flagged, new tests) +
   NOAA CO-OPS for US. Boat gets speed-through-water vs SOG/COG over ground;
   current sets the boat, VMG and compass course vs track diverge.
4. **Charts track.** OpenSeaMap / NOAA ENC MVP with a "not for navigation"
   label; Garmin Navionics SDK as a later premium/commercial option.

## Hard constraints

- **"For training, not for navigation"** disclaimer on all marine/weather
  data and any chart. Mandatory (legal + safety).
- **Open-Meteo license:** free tier is non-commercial. With App Store /
  monetization, budget the paid tier or self-host. Always show CC-BY
  attribution.
- **Offline / failure path:** any live failure -> fall back to synthetic wind,
  never block or crash.
- **Typography:** project no-dash rule applies to all new strings (7 langs).

## Open decisions (need a call before phase 2)

1. Which simulator gets Live mode first: V2, V3, or mobile?
2. Spot selection UX: device geolocation, a preset spot list, or map pick?
3. Commercial license path for Open-Meteo (paid tier vs self-host) once the
   app is monetized.

## Lane ownership summary

- Phase 1 + 2 endpoints/providers: Shared lane (`src/lib/weather`, `/api/*`).
- Phase 3 physics: Shared lane edits `src/lib/sailing-physics` with V2/V3
  sign-off (they consume it); additive + flagged.
- Live UI: V2 lane and/or V3 lane and/or Mobile lane, each in its own surface.
- Mobile: consumes `/api/weather`; documents the contract in
  `docs/design/mobile/API_CONTRACT.md`; no duplicate provider.
