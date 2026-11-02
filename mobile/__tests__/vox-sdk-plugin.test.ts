const { patchPodfile } = require("../plugins/with-vox-sdk");

const PODFILE = "target 'WeektoRegatta' do\n  use_expo_modules!\n  config = use_native_modules!\nend\n";

it("leaves the ad pods out of a store build and links them only for the Ads demo", () => {
  const store = patchPodfile(PODFILE, false);
  expect(store).toContain("use_expo_modules!(exclude: ['vox-ads', 'vox-prebid'])");
  expect(store).not.toContain("VOXSDK");
  expect(patchPodfile(store, false)).toBe(store);

  const demo = patchPodfile(PODFILE, true);
  expect(demo).toMatch(/^ {2}use_expo_modules!\n {2}# VOX SDK 1/m);
  expect(demo).toContain("pod 'VOXSDK', :git => 'https://github.com/Warlockus-prod/vox-sdk-ios.git'");
  expect(demo).not.toContain("exclude");
  expect(patchPodfile(demo, true)).toBe(demo);

  expect(() => patchPodfile("target 'X' do\nend\n", false)).toThrow("use_expo_modules! not found");
});
