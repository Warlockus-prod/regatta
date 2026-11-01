// M1-4 layout slots for M4 on the solo race result screen. They mark where
// M4 puts its pieces so the screen is not built twice (the skill bars took
// their slot in M4-1: RaceSkillBars.tsx):
//   - RaceFinishWatchSlot: "Watch" (opens the replay at the main mistake);
//   - RaceFinishPractiseSlot: "Practise" (opens the matching trainer drill).
// Today they render nothing at all: no element, no space, no text.

export function RaceFinishWatchSlot(): null {
  return null;
}

export function RaceFinishPractiseSlot(): null {
  return null;
}
