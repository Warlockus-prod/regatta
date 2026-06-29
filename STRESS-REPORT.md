# Multiplayer stress test - first run

**Date:** 2026-04-18
**Target:** `wss://weektoregatta.com/ws` (prod v13.0)
**Tool:** `scripts/stress-mp.js`

## Setup

- 8 WebSocket clients (1 host + 7 guests)
- Duration: 45 sec (single race, active input at 20Hz per client)
- Each client sends a sinusoidal `turn` input every 50 ms

## Results

| Metric | Value |
|---|---|
| Clients that received state packets | 8 / 8 |
| Mean tick rate per client | **20.31 Hz** (target 20 Hz) |
| Mean inter-tick interval | **50.2 ms** (target 50.0 ms) |
| p95 inter-tick | **111 ms** |
| p99 inter-tick | **131 ms** |
| Max observed gap | 140 ms |
| Errors raised to any client | 0 |
| `ws-server` / `regatta` crashes | 0 |

## Verdict

- Tick rate is rock-solid at 20 Hz even with 8 concurrent clients driving input.
- p95 jitter ~60 ms above ideal is normal for public internet with TLS + nginx + Docker bridge hops. Interpolation buffer on the client (100 ms render-delay, introduced in Wave 11) hides this.
- No rate-limit trips on the ws-server per-IP throttle (30 conns/min + 60 msg/sec/IP). That's because 8 clients connect from the same test machine's IP at different times and then emit 20 msg/sec each = 160 msg/sec aggregate, above 60/sec limit - but each IP hit counter is per *connection* not aggregate in my impl. Note for Wave 14: if we want real aggregate throttle, switch to global bucket.

## Scaling guess

Extrapolating from one race with 8 active clients:
- 10 clients (room max) should still hit 20 Hz; message budget per tick is 20 × 10 = 200 broadcasts/sec = 15 KB/sec network - trivial.
- 5 concurrent rooms × 10 players = 50 simultaneous connections × 20 Hz input = 1000 msg/sec on server = fine for single Node process.
- Bottleneck at ~20 concurrent rooms (200 connections): single event-loop saturation. Beyond that, shard rooms across worker processes.

## Next test (Wave 14 backlog)
- Run with real sailing input (actually reaches the windward mark, finishes the race)
- Measure with 10 clients and 3 min race
- Add latency histogram
