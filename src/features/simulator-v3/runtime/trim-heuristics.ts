import { type getBoatParams } from '@/lib/sailing-physics';
import { clamp, type OptimalTrim, type ReefLevel } from '../ui/shared';

// ---------------------------------------------------------------------------
// Optimal trim heuristic - same shape as V1/V2 to keep the delta clean.
// ---------------------------------------------------------------------------

export function recommendedTrim(
  awaAbs: number,
  windSpeed: number,
  reefLevel: ReefLevel,
  params: ReturnType<typeof getBoatParams>,
): OptimalTrim {
  let mainAngle = awaAbs - 14;
  let jibAngle = awaAbs - 12;

  if (awaAbs < 38) {
    mainAngle -= 2;
    jibAngle -= 2;
  } else if (awaAbs > 120) {
    mainAngle += 4;
    jibAngle += 3;
  }
  if (awaAbs > 155) {
    mainAngle = params.mainMaxOff - 2;
    jibAngle = params.jibMaxOff;
  }
  if (windSpeed >= 18) {
    mainAngle += 2;
    jibAngle += 1;
  }

  const reefBias = reefLevel === 2 ? 6 : reefLevel === 1 ? 3 : 0;
  const mainTwistPct = clamp(windSpeed >= 18 ? 34 : windSpeed <= 8 ? 10 : 20, 0, 100);
  const jibTwistPct = clamp(windSpeed >= 18 ? 26 : windSpeed <= 8 ? 8 : 16, 0, 100);

  return {
    mainAngle: clamp(mainAngle + reefBias, 0, params.mainMaxOff),
    jibAngle: clamp(jibAngle + reefBias * 0.5, params.jibMinOff, params.jibMaxOff),
    mainTwistPct,
    jibTwistPct,
  };
}
