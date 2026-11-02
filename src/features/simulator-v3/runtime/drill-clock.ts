export interface DrillClock { time: number; heldFor: number }
/** Legacy drills sample telemetry. Never credit paused/background wall time,
 * or assume an unobserved long gap met the condition throughout. */
export function advanceDrillClock(previous: DrillClock, simTime: number, condition: boolean): DrillClock {
  if (!Number.isFinite(simTime) || simTime < previous.time) return { time: 0, heldFor: 0 };
  const elapsed = simTime - previous.time;
  if (elapsed === 0) return previous;
  return { time: simTime, heldFor: condition ? (elapsed <= 0.25 ? previous.heldFor + elapsed : 0) : 0 };
}

/** How an attempt ended. "shown": the boat was trimmed for the learner ("Show
 * me", "Best", a course preset or the auto-trim), so the attempt is not the
 * learner's and can never pass (package 13 stage D). */
export type DrillOutcome = 'pending' | 'win' | 'fail' | 'shown';
export interface DrillAttempt extends DrillClock { outcome: DrillOutcome }

export const newDrillAttempt = (time = 0): DrillAttempt => ({ time, heldFor: 0, outcome: 'pending' });

/** One telemetry sample of an attempt. Only a pending attempt moves; a shown
 * one stays shown however long the condition holds. */
export function advanceDrillAttempt(attempt: DrillAttempt, simTime: number, condition: boolean,
  limits: { holdDuration: number; timeLimit: number }): DrillAttempt {
  if (attempt.outcome !== 'pending') return attempt;
  const clock = advanceDrillClock(attempt, simTime, condition);
  const outcome = clock.heldFor >= limits.holdDuration ? 'win' : clock.time >= limits.timeLimit ? 'fail' : 'pending';
  return { ...clock, outcome };
}

/** The boat was trimmed for the learner during the attempt: it ends as shown,
 * the hold is dropped and only a new attempt the learner sails can pass. A
 * won attempt was the learner's own and stays won. */
export function showDrill(attempt: DrillAttempt): DrillAttempt {
  return attempt.outcome === 'win' ? attempt : { ...attempt, heldFor: 0, outcome: 'shown' };
}
