import { sailingNativeDestination } from "../src/navigation/sailing-entry";

test("installed lesson and tier links reach their actual native destinations", () => {
  expect(sailingNativeDestination("/simulator")).toBe("/simulator-v1");
  expect(sailingNativeDestination("/simulator-v3?lesson=mainsheet&study=mainsheet")).toBe("/simulator-v3?lesson=mainsheet&study=mainsheet");
  expect(sailingNativeDestination("/learn/sails/mainsheet")).toBe("/learn/sails/mainsheet");
  expect(sailingNativeDestination("/practice")).toBe("/simulators");
});

test.each([null, {}, "https://example.com/", "//example.com/", "/unknown", "/learn/sails/not-a-lesson", "/\\example.com"])("an unknown or external destination is ignored: %s", href => {
  expect(sailingNativeDestination(href)).toBeNull();
});
