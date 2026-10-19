# Week to Regatta - Privacy Policy

Last updated: 2026-10-19.

The published policy is the page https://weektoregatta.com/privacy (the
Privacy Policy URL of the App Store listing). This file is its app-side source
and must say the same thing; when one changes, change the other in the same
commit.

## TL;DR

Week to Regatta does not track you across other apps or websites, shows no ads
and has no account. Your learning progress stays on your phone. The app sends
pseudonymous product analytics (tied to a random install id, not to you), and
you can turn the app's analytics off in Settings -> Data -> Anonymous
analytics. Some features need the network by design: the course pages are
pages of weektoregatta.com, the AI coach and the Ask screen send your race log
or your question to OpenAI through our server, a voice answer you record in
the SRC radio simulator or the sternik oral exam practice goes to OpenAI
through our server to be turned into text, and live multiplayer shows your
nickname to the other players in the room. Each case is listed below.

## What we collect

Pseudonymous product analytics, via PostHog (EU servers, eu.i.posthog.com).
This is on by default and you can turn it off at any time. It covers:

- Screen views (which screens are opened), captured automatically.
- App lifecycle events, captured automatically: Application Installed,
  Application Updated, Application Opened (when the app was opened from a
  link, the event includes that link), Application Became Active (each return
  to the foreground) and Application Backgrounded.
- A small set of explicit product events: race started, race finished, AI
  coach requested, "ask" submitted, lesson completed (which course and which
  lesson), and mock exam finished (sternik or SRC radio: score, number of
  questions, passed or not).
- Properties attached to every event: the app language and version, and the
  device properties the PostHog SDK adds by itself: device type, manufacturer
  and model, iOS name and version, whether it runs in a simulator, app name,
  version and build, locale, time zone and screen size.
- A random install id and a session id that PostHog creates on the device.
  Events are linked to that id, not to your name, email or any account, which
  is why we call the data pseudonymous rather than anonymous.

PostHog receives the IP address of each request, like any server. Unless GeoIP
is switched off, PostHog can derive an approximate location (country and city)
from it. In app versions newer than 1.6.4 the app asks PostHog not to do this
(`disableGeoip`); 1.6.4 and older do not send that request. We do not use
location to identify or follow you.

The app does not collect crash reports. If iOS asks whether to share crash data
with app developers, that is Apple's own setting and Apple's data.

### Course pages inside the app

The sternik motorowodny and SRC radio courses (and some trainers) are pages of
weektoregatta.com shown inside the app. Like the website, those pages send
usage events to weektoregatta.com: which page was opened, that it was opened
inside the app, mock exam started and finished with the score, lessons and
radio tasks completed, and technical error reports when a page script fails
(the error message and the place in the code, never what you typed). These
events carry no account, no name or contact details and no advertising or
device identifier. They are tied to the website's random identifier cookie
(`regatta_sid`, kept for one year), so they are pseudonymous, like the app's
own analytics. The server stores the country, the browser User-Agent and the
device type and model read from it, and a shortened IP address (the last part
is removed before anything is saved), keeps the raw events for 180 days and
then deletes them.

This data is NOT linked to your identity. We do not collect your name, email,
contacts, advertising identifier (IDFA), or any other personal identifier. It
is never used to track you across other companies' apps or websites
(`NSPrivacyTracking` is false), and it is never sold or shared with data
brokers. We use it only as aggregate analytics to see which parts of the app
are used and where people get stuck.

### Turning it off

Settings -> Data -> Anonymous analytics is a switch. What it covers:

- Turned off, the app's own analytics (PostHog) stop immediately, on this and
  every future launch.
- In app versions newer than 1.6.4 the switch also stops the usage events of
  the course pages opened inside the app. In 1.6.4 and older, those pages keep
  sending their usage events to weektoregatta.com while the switch is off.
- It does not change the requests listed under "What we send over the
  network", because those are the features themselves.

No account, no prompt, no friction.

## What stays on your device

The following data is stored locally in iOS AsyncStorage on your iPhone
or iPad. We never see it, never receive it, never sync it. Every key the app
stores starts with `regatta.`:

- Your selected language (`regatta.lang.v1`)
- Your bootcamp progress: which lessons you completed
  (`regatta.progress.bootcamp.v1`) and the last lesson you opened
  (`regatta.progress.bootcamp.lastViewed.v1`)
- Your bootcamp quiz scores (`regatta.bootcamp-quiz.v1`)
- Your sail course progress and the last trainer checkpoint
  (`regatta.sailing.theory.v1`, `regatta.sailing.trainer-checkpoint.v1`)
- Your progress in the offline SRC radio course
  (`regatta.radio.offline.web-storage.v1`)
- Your pre-race checklist ticks (`regatta.checklist.v1`)
- Your simulator race history (`regatta.race-history.v1`)
- Your unit preferences - knots / m_s / Beaufort (`regatta.units.v1`)
- Your analytics choice (`regatta.analytics.v1`)
- Flags that you finished the first-launch tour or saw a hint
  (`regatta.firstLaunch.v1`, `regatta.basics.hint.v1`)
- When the app last asked you for an App Store rating and how many wins
  (finished lessons, passed mock exams, top-3 race finishes) it counted since
  then (`regatta.review.v1`)
- A cached copy of today's daily challenge (`regatta.daily.cache.v1`)

You can wipe this anytime in Settings -> Data -> Clear all data. It removes
everything listed above except your analytics choice, which stays so that an
opt-out remains in effect. It does not reset the random install id that
PostHog keeps on the device. The online course pages keep their own progress,
tour flags and the website cookie (`regatta_sid`) in the app's web storage on
this device; Clear all data does not reset those either.

## What we send over the network

Besides the analytics above, the app makes network requests in these cases,
all initiated by you:

1. **Course pages** (sternik, SRC radio, some trainers) load from
   weektoregatta.com and report the usage events described above.
2. **Ask the assistant**: the question you type and the conversation so far
   go to weektoregatta.com/api/ai-chat, which forwards them to OpenAI to write
   the reply. We do not store the text. Under its API terms, OpenAI does not
   use these requests to train its models and may keep them for up to 30 days
   to monitor abuse.
3. **AI coach** (after a race, when you tap "AI coach"): sends the race log
   (boat positions, time, score) through weektoregatta.com/api/coach to OpenAI
   to generate post-race coaching text. The race log does not contain personal
   data, only physics samples. We store one event that a review was requested
   (difficulty, position, finish time, language), not the race log.
4. **Voice answers**: in the SRC radio simulator and in the sternik oral exam
   practice (both course pages inside the app), a recording you start with the
   microphone button goes to weektoregatta.com/api/radio-voice or
   /api/radio-transcribe, which forward it to OpenAI to turn the speech into
   text. The text is then checked against the exercise checklist, on our
   server or in the page. We do not store the recording or the text. The
   microphone is used only while you record; iOS asks for your permission the
   first time.
5. **Live multiplayer**: the multiplayer screen is the live room of
   weektoregatta.com/multiplayer. Everyone in the room sees your nickname.
   When the race finishes, each result is posted to the leaderboard with your
   nickname and the website's random session id (`regatta_sid`), and the
   server keeps a usage event with a shortened IP address.
6. **Gallery**: photos load from weektoregatta.com, video thumbnails from
   YouTube (img.youtube.com), and a video opens on YouTube when you tap it.
   These requests carry only what any browser sends (User-Agent, IP address).
   No identifier of you or the device is attached.
7. **Daily challenge banner** on Home: a small GET to
   weektoregatta.com/api/daily to fetch today's optional challenge.
   No identifier of you or the device is sent.
8. **Spot weather**: when you pick a sailing spot, a GET to
   weektoregatta.com/api/weather with that spot's coordinates (never your own
   location).
9. **Leaderboard**: when you finish a solo race the score (time + course, no
   identity) may be posted to weektoregatta.com so the global board can show
   it. No personal identifier is attached.

If you are offline, all of the above are silently skipped.

## App Store and TestFlight

When you install or update the app via the App Store or TestFlight,
Apple receives standard iOS install events. Apple's privacy policy
applies to that data: https://www.apple.com/legal/privacy/

We do not receive any of this data from Apple.

## Children

The app has no in-app purchases and no advertising. It does have three
features where you type, say or show something: the Ask assistant (your
question goes to OpenAI as described above), voice answers in the SRC radio
simulator and the sternik oral exam practice (the recording goes to OpenAI to
be turned into text and is not stored) and live multiplayer (your nickname is
visible to the other players in the room). Apart from these, the only data
collected is the pseudonymous usage analytics described above (the app's own
and that of the course pages), which the analytics switch in Settings turns
off as described under "Turning it off". The other requests under "What we
send over the network" carry no personal data.

## Changes

When this policy changes, we update the date at the top and summarise the
change here. If we ever start collecting anything that identifies you, we
will also ask you to opt in inside the app, and the opt-out switch stays in
Settings -> Data.

- 2026-10-19: named OpenAI as the AI provider for the coach and the Ask
  assistant; described live multiplayer (it was described as local-only), the
  Ask screen, voice answers in the radio simulator and the oral exam practice,
  YouTube thumbnails, spot weather, the PostHog lifecycle events and device
  properties, possible IP-based location in PostHog, and exactly what the
  analytics switch and Clear all data cover; listed every storage key; called
  the course page events pseudonymous, not anonymous; removed the unused
  recent-rooms storage key.

We will never link analytics to your identity or use it for cross-app tracking
without your explicit consent.

## Contact

For any privacy questions: support@gtframe.io.
