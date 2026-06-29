// Metro config. Expo defaults are sufficient: the simulators render via
// WebView (the native three.js path was removed, so no .glb is bundled on
// mobile). Re-add asset extensions here if a native 3D pipeline returns.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

module.exports = config;
