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

test("the fifth native tab is Menu, the whole catalog in one tap", () => {
  const { nativeTabs, tabForPath } = require("../src/navigation/tabs") as typeof import("../src/navigation/tabs");
  expect(nativeTabs.map(t => t.id)).toEqual(["home", "learn", "practice", "race", "menu"]);
  expect(nativeTabs.map(t => t.title.en)).toEqual(["Home", "Learn", "Practice", "Race", "Menu"]);
  expect(nativeTabs[4]!.route).toBe("/menu");
  expect(tabForPath("/menu")).toBe("menu");
  expect(tabForPath("/library")).toBe("menu");
  expect(tabForPath("/anatomy")).toBe("menu");
  expect(tabForPath("/settings")).toBe("menu");
  expect(tabForPath("/bootcamp/wind-direction")).toBe("learn");
  expect(tabForPath("/kursy/radio")).toBe("learn");
  expect(tabForPath("/multiplayer/join")).toBe("race");
  expect(tabForPath("/")).toBe("home");
});
