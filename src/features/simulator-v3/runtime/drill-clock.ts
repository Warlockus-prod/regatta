export interface DrillClock { time: number; heldFor: number }
/** Legacy drills sample telemetry. Never credit paused/background wall time,
 * or assume an unobserved long gap met the condition throughout. */
export function advanceDrillClock(previous: DrillClock, simTime: number, condition: boolean): DrillClock {
  if (!Number.isFinite(simTime) || simTime < previous.time) return { time: 0, heldFor: 0 };
  const elapsed = simTime - previous.time;
  if (elapsed === 0) return previous;
  return { time: simTime, heldFor: condition ? (elapsed <= 0.25 ? previous.heldFor + elapsed : 0) : 0 };
}
