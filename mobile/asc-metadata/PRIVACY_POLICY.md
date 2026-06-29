# Week to Regatta - Privacy Policy

Last updated: 2026-06-22.

## TL;DR

Week to Regatta does not track you across other apps or websites and never
collects data that identifies you personally. The only data that leaves your
device is anonymous, aggregate product analytics that help us improve the app -
and you can turn it off anytime in Settings -> Data -> Anonymous analytics.
Everything else you do in the app stays on your phone.

## What we collect

Anonymous product analytics, via PostHog (EU servers, eu.i.posthog.com). This
is on by default and you can opt out at any time. It covers:

- Screen views (which screens are opened), captured automatically.
- A small set of explicit product events: race started, race finished, AI
  coach requested, "ask" submitted.
- Each event is tagged with your app language and the app version.

This data is NOT linked to your identity. We do not collect your name, email,
contacts, location, advertising identifier (IDFA), or any other personal
identifier. It is never used to track you across other companies' apps or
websites (`NSPrivacyTracking` is false), and it is never sold or shared with
data brokers. We use it only as aggregate analytics to see which parts of the
app are used and where people get stuck.

### Turning it off

Settings -> Data -> Anonymous analytics is a switch. Turn it off and the app
stops sending any analytics immediately, on this and every future launch. No
account, no prompt, no friction.

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
- Your analytics choice (`regatta.analytics.v1`)
- A flag that you finished the first-launch tour
  (`regatta.firstLaunch.v1`)

You can wipe all of this anytime in Settings -> Data -> Clear all data.
That removes every key listed above.

## What we send over the network

Besides the anonymous analytics above, the app makes network requests in these
cases, all initiated by you:

1. **Gallery** loads photos and YouTube thumbnails from
   weektoregatta.com. The request includes only what your browser /
   YouTube would normally see (User-Agent, IP). No identifier of you or
   the device is attached.
2. **AI coach** (after a race, when you tap "AI coach"): sends the race log
   (boat positions, time, score) to weektoregatta.com/api/coach to generate
   post-race coaching text. The race log does not contain personal data, only
   physics samples. We do not store the request beyond what is needed to
   compute the reply.
3. **Daily challenge banner** on Home: a small GET to
   weektoregatta.com/api/daily to fetch today's optional challenge.
   No identifier of you or the device is sent.
4. **Leaderboard**: when you finish a race the score (time + course, no
   identity) may be posted to weektoregatta.com so the global board can show
   it. No personal identifier is attached.

If you are offline, all of the above are silently skipped.

## Multiplayer

Multiplayer in this version is local-only practice with simulated ghost boats.
No real network sync. No data leaves your device.

When real multiplayer launches in a future version, this section will
be updated with the data flow before that version ships.

## App Store and TestFlight

When you install or update the app via the App Store or TestFlight,
Apple receives standard iOS install events. Apple's privacy policy
applies to that data: https://www.apple.com/legal/privacy/

We do not receive any of this data from Apple.

## Children

The app has no chat, no user-generated content, no in-app purchases, and no
advertising. The only data collected is the anonymous, non-identifying product
analytics described above, which can be turned off in Settings. It is suitable
for all ages.

## Changes

If we ever start collecting more than the anonymous analytics described here -
for example anything that identifies you - we will:

1. Update this policy with the date of the change at the top.
2. Surface a prompt in the app asking you to opt in.
3. Keep the opt-out switch in Settings -> Data.

We will never link analytics to your identity or use it for cross-app tracking
without your explicit consent.

## Contact

For any privacy questions: support@gtframe.io.
