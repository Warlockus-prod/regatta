# Week to Regatta - Privacy Policy

Last updated: 2026-05-13.

## TL;DR

Week to Regatta does not track you, does not collect personal data, and
does not share data with anyone. Everything you do in the app stays on
your phone.

## What we collect

Nothing. The app has no analytics SDK, no advertising identifier
(IDFA), no third-party trackers, no crash reporters, no telemetry of
any kind in v1.

## What stays on your device

The following data is stored locally in iOS AsyncStorage on your iPhone
or iPad. We never see it, never receive it, never sync it:

- Your selected language (`regatta.lang.v1`)
- Your bootcamp progress: which lessons you completed, last lesson you
  opened (`regatta.progress.bootcamp.v1`)
- Your bootcamp quiz scores (`regatta.bootcamp-quiz.v1`)
- Your pre-race checklist ticks (`regatta.checklist.v1`)
- Your simulator race history (`regatta.race-history.v1`)
- Your multiplayer recent rooms (`regatta.multiplayer.recent-rooms.v1`)
- Your unit preferences - knots / m_s / Beaufort (`regatta.units.v1`)
- A flag that you finished the first-launch tour
  (`regatta.firstLaunch.v1`)

You can wipe all of this anytime in Settings -> Data -> Clear all data.
That removes every key listed above.

## What we send over the network

The app makes network requests in three cases, all initiated by you:

1. **Gallery** loads photos and YouTube thumbnails from
   regatta.icoffio.com. The request includes only what your browser /
   YouTube would normally see (User-Agent, IP). No identifier of you or
   the device is attached.
2. **AI coach** (Settings -> Data -> when you tap "AI coach" after a
   race): sends the race log (boat positions, time, score) to
   regatta.icoffio.com/api/coach to generate post-race coaching text.
   The race log does not contain personal data, only physics samples.
   We do not store the request beyond what is needed to compute the
   reply.
3. **Daily challenge banner** on Home: a small GET to
   regatta.icoffio.com/api/daily to fetch today's optional challenge.
   No identifier of you or the device is sent.

If you are offline, all of the above are silently skipped.

## Multiplayer

Multiplayer in v1 is local-only practice with simulated ghost boats.
No real network sync. No data leaves your device.

When real multiplayer launches in a future version, this section will
be updated with the data flow before that version ships.

## App Store and TestFlight

When you install or update the app via the App Store or TestFlight,
Apple receives standard iOS install events. Apple's privacy policy
applies to that data: https://www.apple.com/legal/privacy/

We do not receive any of this data from Apple.

## Children

The app has no chat, no user-generated content, no in-app purchases,
no advertising, and no data collection. It is suitable for all ages.

## Changes

If we ever start collecting data, we will:

1. Update this policy with the date of the change at the top.
2. Surface a prompt in the app asking you to opt in.
3. Add a toggle in Settings -> Data so you can opt out.

We will never enable data collection without your explicit consent.

## Contact

For any privacy questions: support@icoffio.com.
