/** Readiness belongs to one solo race. An old renderer callback cannot
 * release the next race, and loading time never becomes simulation time. */
export function createRaceStartupGate() {
  let id = "", ready = false;
  return {
    reset(raceId: string) { id = raceId; ready = false; },
    rendered(raceId: string) {
      if (!raceId || raceId !== id || ready) return false;
      ready = true; return true;
    },
    active(paused: boolean, hidden: boolean) { return ready && !paused && !hidden; },
    get ready() { return ready; },
  };
}
