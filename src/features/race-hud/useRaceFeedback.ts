'use client';

// React wiring of the race feedback bus (feedback.ts): the state, a timer to
// the next change (a toast runs out, a queued one goes stale, the contact
// frame ends) and the three entry points the race loop calls. Time is the
// page's monotonic clock in seconds, so a toast keeps its few seconds on
// screen whatever the race clock does.

import { useCallback, useEffect, useState } from "react";
import { createFeedbackState, nextFeedbackChange, postContact, postFeedback, prefersReducedMotion, tickFeedback, type FeedbackPost } from "./feedback";

const nowSec = () => performance.now() / 1000;

export function useRaceFeedback() {
  const [feedback, setFeedback] = useState(createFeedbackState);
  const post = useCallback((message: FeedbackPost) => setFeedback(s => postFeedback(s, message, nowSec())), []);
  const contact = useCallback(() => setFeedback(s => postContact(s, nowSec(), prefersReducedMotion())), []);
  const clear = useCallback(() => setFeedback(createFeedbackState()), []);
  useEffect(() => {
    const next = nextFeedbackChange(feedback);
    if (next === null) return;
    const id = window.setTimeout(() => setFeedback(s => tickFeedback(s, nowSec())), Math.max(0, (next - nowSec()) * 1000) + 16);
    return () => window.clearTimeout(id);
  }, [feedback]);
  return { feedback, post, contact, clear };
}
