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
// Branch fix/in-app-ads-2026-10-30: viewport, full-screen layout, VAST XML, no-fill and lifetime fixes.
const VOX_SDK_COMMIT = 'fc523af9fe88ddbf811653a34842f50dee5ff88b';
const MARKER = '# VOX SDK 1 (plugins/with-vox-sdk.js)';

module.exports = function withVoxSdk(config) {
  return withPodfile(config, (cfg) => {
    const podfile = cfg.modResults.contents;
    if (podfile.includes(MARKER)) return cfg;
    const anchor = /^(\s*)use_expo_modules!.*$/m;
    if (!anchor.test(podfile)) {
      throw new Error('with-vox-sdk: use_expo_modules! not found in Podfile');
    }
    const local = process.env.VOX_SDK_IOS_PATH;
    const source = local ? `:path => '${local}'` : `:git => '${VOX_SDK_GIT}', :commit => '${VOX_SDK_COMMIT}'`;
    cfg.modResults.contents = podfile.replace(
      anchor,
      (line, indent) => `${line}\n${indent}${MARKER}\n${indent}pod 'VOXSDK', ${source}`,
    );
    return cfg;
  });
};
