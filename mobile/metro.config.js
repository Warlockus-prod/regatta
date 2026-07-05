// Metro config.
//
// The native trainer consumes the GOLDEN sailing-physics engine directly from
// the web tree via the '@regatta/physics' alias (single source of truth; the
// old mobile fork silently diverged - see docs/design/SIMULATORS.md and
// docs/design/mobile/DECISIONS.md ADR-0009). The engine is pure TS (no React,
// no DOM), so Metro just needs to watch and resolve that folder.
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

const PHYSICS_DIR = path.resolve(__dirname, '../src/lib/sailing-physics');

config.watchFolders = [...(config.watchFolders ?? []), PHYSICS_DIR];
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules ?? {}),
  '@regatta/physics': PHYSICS_DIR,
};

module.exports = config;
