// Adds VOX SDK 1 (Hybrid Adtech, iOS) to the generated Podfile.
//
// VOXSDK is not published on CocoaPods trunk, so the local `VoxAds` pod
// (modules/vox-ads) cannot resolve it by name alone. We pin the git source to
// a commit so `expo prebuild` always produces the same build. The repository
// is private: `pod install` uses this Mac's git credentials (gh keychain).
// VOX_SDK_IOS_PATH=/path/to/vox-sdk-ios points the pod at a local checkout
// instead, for testing SDK changes before they are pushed. Never ship that.
const { withPodfile } = require('expo/config-plugins');

const VOX_SDK_GIT = 'https://github.com/Warlockus-prod/vox-sdk-ios.git';
// Branch feat/app-identity, 1.3.0: sdkInfo.applicationId on every request (2026-11-06).
const VOX_SDK_COMMIT = '42cd227541cb1c99b8bad3a0c5ed5748bec915ba';
const MARKER = '# VOX SDK 1 (plugins/with-vox-sdk.js)';

// The ad pods are linked only for a build with the Ads section
// (EXPO_PUBLIC_ADS_DEMO=1, src/config/ads-demo.ts; App Store builds from 1.7.1
// on). Without it the local ad modules are excluded from autolinking, so the
// binary carries neither VOXSDK nor PrebidMobile. VOX SDK 2 (vox-prebid,
// PrebidMobile) needs the Prebid Server on this Mac, so it is linked only with
// VOX_PREBID=1 for local tests and never ships.
const AD_MODULES = ['vox-ads', 'vox-prebid'];
const PREBID_MODULES = ['vox-prebid'];
const EXCLUDE_MARKER = '# Ads demo off (plugins/with-vox-sdk.js)';

function patchPodfile(podfile, adsDemo, prebid = false) {
  if (podfile.includes(MARKER) || podfile.includes(EXCLUDE_MARKER)) return podfile;
  const anchor = /^(\s*)use_expo_modules!.*$/m;
  if (!anchor.test(podfile)) {
    throw new Error('with-vox-sdk: use_expo_modules! not found in Podfile');
  }
  if (!adsDemo) {
    const list = AD_MODULES.map((name) => `'${name}'`).join(', ');
    return podfile.replace(
      anchor,
      (line, indent) => `${indent}${EXCLUDE_MARKER}\n${indent}use_expo_modules!(exclude: [${list}])`,
    );
  }
  const local = process.env.VOX_SDK_IOS_PATH;
  const source = local ? `:path => '${local}'` : `:git => '${VOX_SDK_GIT}', :commit => '${VOX_SDK_COMMIT}'`;
  const exclude = PREBID_MODULES.map((name) => `'${name}'`).join(', ');
  return podfile.replace(
    anchor,
    (line, indent) => `${prebid ? line : `${indent}use_expo_modules!(exclude: [${exclude}])`}\n${indent}${MARKER}\n${indent}pod 'VOXSDK', ${source}`,
  );
}

module.exports = function withVoxSdk(config) {
  return withPodfile(config, (cfg) => {
    cfg.modResults.contents = patchPodfile(cfg.modResults.contents, process.env.EXPO_PUBLIC_ADS_DEMO === '1', process.env.VOX_PREBID === '1');
    return cfg;
  });
};
module.exports.patchPodfile = patchPodfile;
