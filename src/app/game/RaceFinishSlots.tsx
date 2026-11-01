// M1-4 layout slots for M4 on the solo race result screen. They mark where
// M4 puts its pieces so the screen is not built twice (the skill bars took
// their slot in M4-1: RaceSkillBars.tsx):
//   - RaceFinishWatchSlot (M4-3): "Watch the mistake" opens the replay 5 s
//     before the main mistake; nothing when the mistake is no single moment
//     (src/lib/race-replay-teaching.ts coachMistakeMoment) or there is no replay.
//   - RaceFinishPractiseSlot (M4-2): "Practise" opens the practice of the
//     main mistake (src/data/race-practice.ts); nothing without one.

import type { RacePracticeTarget } from "@/data/race-practice";
import type { RaceReturn } from "@/lib/race-return";
import { RacePracticeLink } from "./RacePracticeLink";
import { WatchMomentButton } from "./WatchMomentButton";

export function RaceFinishWatchSlot({ moment = null, onWatch }: { moment?: number | null; onWatch?: (at: number) => void }) {
  if (moment === null || !onWatch) return null;
  return <WatchMomentButton at={moment} onWatch={onWatch} variant="action" />;
}

export function RaceFinishPractiseSlot({ target, ret, native }: { target: RacePracticeTarget | null; ret: RaceReturn | null; native: boolean }) {
  if (!target) return null;
  return <div className="basis-full"><RacePracticeLink target={target} ret={ret} native={native} variant="action" /></div>;
}
