const { patchPodfile } = require("../plugins/with-vox-sdk");

const PODFILE = "target 'WeektoRegatta' do\n  use_expo_modules!\n  config = use_native_modules!\nend\n";

it("leaves the ad pods out without the Ads section and links VOX SDK 1 only with it", () => {
  const store = patchPodfile(PODFILE, false);
  expect(store).toContain("use_expo_modules!(exclude: ['vox-ads', 'vox-prebid'])");
  expect(store).not.toContain("VOXSDK");
  expect(patchPodfile(store, false)).toBe(store);

  // App Store build with the Ads section (1.7.1 on): VOX SDK 1, never PrebidMobile.
  const ads = patchPodfile(PODFILE, true);
  expect(ads).toMatch(/^ {2}use_expo_modules!\(exclude: \['vox-prebid'\]\)\n {2}# VOX SDK 1/m);
  expect(ads).toContain("pod 'VOXSDK', :git => 'https://github.com/Warlockus-prod/vox-sdk-ios.git'");
  expect(ads).not.toContain("'vox-ads'");
  expect(patchPodfile(ads, true)).toBe(ads);

  // Local test of VOX SDK 2 (VOX_PREBID=1): both ad modules linked.
  const prebid = patchPodfile(PODFILE, true, true);
  expect(prebid).toMatch(/^ {2}use_expo_modules!\n {2}# VOX SDK 1/m);
  expect(prebid).not.toContain("exclude");

  expect(() => patchPodfile("target 'X' do\nend\n", false)).toThrow("use_expo_modules! not found");
});
