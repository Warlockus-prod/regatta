import { showsMainNavigation } from "../src/navigation/visibility";
import { sectionForPath } from "../../src/lib/product/catalog";

test("an activity releases screen space and returning to its hub restores navigation", () => {
  expect(showsMainNavigation("/simulators")).toBe(true);
  expect(showsMainNavigation("/simulator2")).toBe(false);
  expect(showsMainNavigation("/game")).toBe(false);
  expect(showsMainNavigation("/multiplayer/race/ABC123")).toBe(false);
  expect(showsMainNavigation("/multiplayer/join")).toBe(true);
  expect(showsMainNavigation("/library")).toBe(true);
});

test("deep links keep the correct top-level destination selected", () => {
  expect(sectionForPath("/bootcamp/wind-direction", "native")).toBe("learn");
  expect(sectionForPath("/kursy/radio", "native")).toBe("learn");
  expect(sectionForPath("/anatomy", "native")).toBe("library");
  expect(sectionForPath("/multiplayer/join", "native")).toBe("race");
});
