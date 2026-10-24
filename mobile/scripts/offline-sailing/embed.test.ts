import { SAILING_ROUTES, sailingEmbed, sailingSearch } from "./embed";

test("each native sailing destination resolves to its original shared page", () => {
  for (const path of SAILING_ROUTES) {
    expect(sailingEmbed({ path, query: "lesson=trim-basics&preset=close-hauled&lang=it" }, "?screen=game"))
      .toEqual({ path, query: "lesson=trim-basics&preset=close-hauled&lang=it" });
  }
  expect(sailingEmbed(undefined, "?screen=basics&lang=pl").path).toBe("/simulator");
  expect(sailingEmbed(undefined, "?screen=anatomy&lang=de").path).toBe("/anatomy");
  expect(sailingEmbed(undefined, "?screen=trainer").path).toBe("/simulator-v3");
  expect(sailingEmbed(undefined, "?screen=game").path).toBe("/game");
  expect(sailingEmbed(undefined, "?screen=unknown").path).toBe("/simulator2");
});

test("file-origin embedding preserves all query values while enforcing local chrome", () => {
  const raw = "embed=0&offline=0&lesson=first%20tack&returnTo=%2Fstart%3Flang%3Dfr&mission=upwind&daily=2026-10-24&lang=fr";
  const params = sailingSearch(sailingEmbed({ path: "/simulator", query: raw }, "").query);
  expect(params.get("embed")).toBe("1"); expect(params.get("offline")).toBe("1");
  expect(params.get("lesson")).toBe("first tack"); expect(params.get("returnTo")).toBe("/start?lang=fr");
  expect(params.get("mission")).toBe("upwind"); expect(params.get("daily")).toBe("2026-10-24");
  expect(params.get("lang")).toBe("fr");
  expect(raw).toContain("embed=0");
});
