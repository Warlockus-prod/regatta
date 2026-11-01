import { describe, expect, it } from "vitest";
import { FEEDBACK_HIDDEN_ROUTES, feedbackHiddenOn } from "./feedback-routes";

// Contract: the floating feedback button is hidden on the race, trainer and
// shared replay surfaces (it covered the replay's event ribbon on /r/ at
// phone width) and shown on the content routes, including /rules, /radio and
// /racing, which only share the letter "r" with the replay route.
describe("feedback button routes", () => {
  it("hides on the race, trainers and the shared replay", () => {
    for (const path of ["/game", "/game?race=short", "/multiplayer", "/simulator", "/simulator-v3", "/sternik/egzamin", "/r/ABC234"]) {
      expect(feedbackHiddenOn(path), path).toBe(true);
    }
  });

  it("shows on the content routes", () => {
    for (const path of ["/", "/rules", "/radio", "/racing", "/start", "/learn/sails"]) {
      expect(feedbackHiddenOn(path), path).toBe(false);
    }
    expect(feedbackHiddenOn(null)).toBe(false);
    expect(FEEDBACK_HIDDEN_ROUTES).toContain("/r/");
  });
});
