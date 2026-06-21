/**
 * Custom analytics event catalog.
 *
 * Screen views and app-lifecycle events (Opened / Backgrounded / Installed /
 * Updated) are captured automatically by PostHog autocapture, so this list is
 * only the high-value PRODUCT events that power funnels and retention - the
 * things a screen view alone cannot tell us (did they finish the race they
 * started, did they ask the coach, etc.).
 *
 * Keep names snake_case and stable. Renaming an event splits its history in
 * PostHog, so add a new name rather than rewording an existing one.
 */
export const AnalyticsEvent = {
  RaceStarted: 'race_started',
  RaceFinished: 'race_finished',
  CoachRequested: 'coach_requested',
  AskSubmitted: 'ask_submitted',
  LessonCompleted: 'lesson_completed',
} as const;

export type AnalyticsEventName = (typeof AnalyticsEvent)[keyof typeof AnalyticsEvent];

/** Property bag accepted by `capture()`. Flat, primitive values only. */
export type AnalyticsProps = Record<string, string | number | boolean | null | undefined>;
